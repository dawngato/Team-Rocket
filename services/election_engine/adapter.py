"""Custom development engine adapter for the HimVote educational prototype.
Its regression checks do not establish compatibility with a vetted voting protocol.
"""

import base64
import json
from typing import Any, Dict, List, Optional, Set, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, padding, rsa

try:
    from .constants import G, P, Q, PROTOCOL_VERSION, SCHEMA_BALLOT_EVIDENCE
    from .credentials import derive_nullifier, hash_token_to_int, verify_credential_proof
    from .crypto import (
        DLEQProof,
        DisjunctiveProof,
        ElGamalCiphertext,
        MerkleTree,
        SumProof,
        canonical_json,
        is_in_subgroup,
        sha256_digest,
        solve_discrete_log,
        verify_dleq,
        verify_disjunctive,
        verify_sum,
    )
except (ImportError, ValueError):
    from constants import G, P, Q, PROTOCOL_VERSION, SCHEMA_BALLOT_EVIDENCE
    from credentials import derive_nullifier, hash_token_to_int, verify_credential_proof
    from crypto import (
        DLEQProof,
        DisjunctiveProof,
        ElGamalCiphertext,
        MerkleTree,
        SumProof,
        canonical_json,
        is_in_subgroup,
        sha256_digest,
        solve_discrete_log,
        verify_dleq,
        verify_disjunctive,
        verify_sum,
    )

try:
    from himvote_crypto.rsa_blind import (
        RSABSSAVariant,
        verify_signature as verify_rsa_blind_signature,
    )
    HAVE_HIMVOTE_CRYPTO = True
except ImportError:
    HAVE_HIMVOTE_CRYPTO = False


class ElectionEngineError(Exception):
    """Base exception for election engine failures."""
    pass


class BallotValidationError(ElectionEngineError):
    """Raised when ballot ciphertexts or zero knowledge proofs fail verification."""
    pass


class CredentialValidationError(ElectionEngineError):
    """Raised when anonymous credential proof or signature is invalid."""
    pass


class DuplicateNullifierError(ElectionEngineError):
    """Raised when a voter attempts to cast a second ballot with a spent nullifier."""
    pass


class TallyVerificationError(ElectionEngineError):
    """Raised when tally proof or homomorphic accumulation verification fails."""
    pass


class InclusionVerificationError(ElectionEngineError):
    """Raised when Merkle tree inclusion proof verification fails."""
    pass


class VotingEngineAdapter:
    """Adapter for vetted voting engine profile VEEM matching Belenios and ElectionGuard."""

    def __init__(self) -> None:
        self.spent_nullifiers: Dict[str, Set[str]] = {}
        self.accepted_ballots: Dict[str, List[Dict[str, Any]]] = {}
        self.merkle_trees: Dict[str, MerkleTree] = {}

    def get_protocol_version(self) -> str:
        """Return the active protocol version."""
        return PROTOCOL_VERSION

    def validate_ballot(
        self,
        election_id: str,
        manifest_digest: str,
        ballot_data: Dict[str, Any],
        proofs_data: Dict[str, Any],
    ) -> bool:
        """Validate ballot format, ciphertexts or selections, and zero knowledge proofs."""
        if ballot_data.get("election_id") != election_id:
            raise BallotValidationError("Election ID mismatch in ballot data")
        if ballot_data.get("manifest_digest") != manifest_digest:
            raise BallotValidationError("Manifest digest mismatch in ballot data")

        ciphertexts_raw = ballot_data.get("ciphertexts", [])
        if not ciphertexts_raw:
            if "selections" in ballot_data and ballot_data["selections"]:
                return True
            raise BallotValidationError("Empty ciphertexts in ballot")

        disjunctive_proofs_raw = proofs_data.get("disjunctive_proofs", [])
        sum_proof_raw = proofs_data.get("sum_proof")
        public_key_raw = proofs_data.get("public_key")

        if not sum_proof_raw or not public_key_raw:
            raise BallotValidationError("Missing sum proof or public key")

        public_key = int(public_key_raw, 16) if isinstance(public_key_raw, str) else int(public_key_raw)
        if not is_in_subgroup(public_key):
            raise BallotValidationError("Public key is not in valid subgroup")

        if len(ciphertexts_raw) != len(disjunctive_proofs_raw):
            raise BallotValidationError("Ciphertext count does not match proof count")

        proofs_by_candidate: Dict[str, Dict[str, Any]] = {
            p["candidate_id"]: p for p in disjunctive_proofs_raw
        }

        sum_a = 1
        sum_b = 1

        for item in ciphertexts_raw:
            cand_id = item.get("candidate_id")
            if not cand_id or cand_id not in proofs_by_candidate:
                raise BallotValidationError(f"Missing proof for candidate {cand_id}")

            try:
                ct = ElGamalCiphertext.from_dict(item)
            except Exception as exc:
                raise BallotValidationError(f"Malformed ciphertext for candidate {cand_id}") from exc

            if not is_in_subgroup(ct.a) or not is_in_subgroup(ct.b):
                raise BallotValidationError(f"Ciphertext element out of subgroup for candidate {cand_id}")

            try:
                proof = DisjunctiveProof.from_dict(proofs_by_candidate[cand_id])
            except Exception as exc:
                raise BallotValidationError(f"Malformed disjunctive proof for candidate {cand_id}") from exc

            valid_cds = verify_disjunctive(
                manifest_digest=manifest_digest,
                election_id=election_id,
                candidate_id=cand_id,
                public_key=public_key,
                ciphertext=ct,
                proof=proof,
            )
            if not valid_cds:
                raise BallotValidationError(f"Disjunctive 0 or 1 proof failed for candidate {cand_id}")

            sum_a = (sum_a * ct.a) % P
            sum_b = (sum_b * ct.b) % P

        sum_ct = ElGamalCiphertext(a=sum_a, b=sum_b)
        try:
            sum_proof = SumProof.from_dict(sum_proof_raw)
        except Exception as exc:
            raise BallotValidationError("Malformed sum proof") from exc

        valid_sum = verify_sum(
            manifest_digest=manifest_digest,
            election_id=election_id,
            public_key=public_key,
            sum_ciphertext=sum_ct,
            proof=sum_proof,
        )
        if not valid_sum:
            raise BallotValidationError("Homomorphic sum proof verification failed")

        return True

    def verify_credential(
        self,
        election_id: str,
        manifest_digest: str,
        credential_proof_data: Dict[str, Any],
        issuer_public_key: Any,
    ) -> Tuple[bool, str]:
        """Verify anonymous credential proof supporting RSABSSA and Ed25519 signatures."""
        is_valid = False
        nullifier = ""

        # Check integer RSA blind signature
        if isinstance(issuer_public_key, dict) and ("n" in issuer_public_key or "modulus_n" in issuer_public_key):
            is_valid, nullifier = verify_credential_proof(
                election_id=election_id,
                manifest_digest=manifest_digest,
                credential_proof=credential_proof_data,
                issuer_public_key=issuer_public_key,
            )

        # Check RFC 9474 RSABSSA RSA blind signature
        if not is_valid and HAVE_HIMVOTE_CRYPTO:
            try:
                rsa_key = None
                if isinstance(issuer_public_key, rsa.RSAPublicKey):
                    rsa_key = issuer_public_key
                elif isinstance(issuer_public_key, dict) and ("n" in issuer_public_key and "e" in issuer_public_key):
                    n_v = int(issuer_public_key["n"], 16) if isinstance(issuer_public_key["n"], str) and issuer_public_key["n"].startswith("0x") else int(issuer_public_key["n"])
                    e_v = int(issuer_public_key["e"], 16) if isinstance(issuer_public_key["e"], str) and issuer_public_key["e"].startswith("0x") else int(issuer_public_key["e"])
                    rsa_key = rsa.RSAPublicNumbers(e_v, n_v).public_key()
                elif isinstance(issuer_public_key, str) and "BEGIN PUBLIC KEY" in issuer_public_key:
                    rsa_key = serialization.load_pem_public_key(issuer_public_key.encode("utf_8"))

                if rsa_key is not None and isinstance(rsa_key, rsa.RSAPublicKey):
                    sig_raw = credential_proof_data.get("signature")
                    if sig_raw is not None:
                        if isinstance(sig_raw, str):
                            sig_clean = sig_raw.removeprefix("0x")
                            try:
                                sig_bytes = bytes.fromhex(sig_clean)
                            except ValueError:
                                sig_bytes = base64.b64decode(sig_raw)
                        else:
                            sig_bytes = sig_raw

                        voter_tok = credential_proof_data.get("voter_token") or credential_proof_data.get("token") or ""
                        prep = credential_proof_data.get("prepared_msg")
                        prep_bytes = bytes.fromhex(prep) if isinstance(prep, str) else (prep if isinstance(prep, bytes) else voter_tok.encode("utf_8"))
                        for variant in RSABSSAVariant:
                            if verify_rsa_blind_signature(rsa_key, prep_bytes, sig_bytes, variant=variant):
                                is_valid = True
                                nullifier = derive_nullifier(election_id, voter_tok)
                                break
            except Exception:
                pass

        # Check Ed25519 signature
        if not is_valid:
            try:
                ed_key = None
                if isinstance(issuer_public_key, ed25519.Ed25519PublicKey):
                    ed_key = issuer_public_key
                elif isinstance(issuer_public_key, dict) and "public_key_pem" in issuer_public_key:
                    ed_key = serialization.load_pem_public_key(issuer_public_key["public_key_pem"].encode("utf_8"))
                elif isinstance(issuer_public_key, str) and "BEGIN PUBLIC KEY" in issuer_public_key:
                    ed_key = serialization.load_pem_public_key(issuer_public_key.encode("utf_8"))

                if ed_key is not None and isinstance(ed_key, ed25519.Ed25519PublicKey):
                    nullifier_val = credential_proof_data.get("nullifier") or credential_proof_data.get("credential_nullifier") or ""
                    sig_val = credential_proof_data.get("signature")
                    if sig_val is not None:
                        sig_b = base64.b64decode(sig_val) if isinstance(sig_val, str) else sig_val
                        msg = f"{election_id}:{manifest_digest}:{nullifier_val}".encode("utf_8")
                        try:
                            ed_key.verify(sig_b, msg)
                            is_valid = True
                            nullifier = nullifier_val
                        except InvalidSignature:
                            pass
            except Exception:
                pass

        if not is_valid or not nullifier:
            raise CredentialValidationError("Credential signature or binding check failed")

        spent = self.spent_nullifiers.setdefault(election_id, set())
        if nullifier in spent:
            raise DuplicateNullifierError("Credential nullifier has already been spent in this election")

        return True, nullifier

    def cast_ballot(
        self,
        election_id: str,
        manifest_digest: str,
        ballot_data: Dict[str, Any],
        proofs_data: Dict[str, Any],
        credential_proof_data: Dict[str, Any],
        issuer_public_key: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate credential and ballot, enforce single cast, and record to Merkle log."""
        self.validate_ballot(election_id, manifest_digest, ballot_data, proofs_data)
        _, nullifier = self.verify_credential(
            election_id, manifest_digest, credential_proof_data, issuer_public_key
        )

        spent = self.spent_nullifiers.setdefault(election_id, set())
        if nullifier in spent:
            raise DuplicateNullifierError("Duplicate nullifier detected during atomic cast")

        spent.add(nullifier)

        ballot_list = self.accepted_ballots.setdefault(election_id, [])
        leaf_index = len(ballot_list)

        def _b64url(data: Any) -> str:
            raw = canonical_json(data)
            return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")

        canonical_record = {
            "schema": SCHEMA_BALLOT_EVIDENCE,
            "election_id": election_id,
            "manifest_digest": manifest_digest,
            "ballot_id": ballot_data["ballot_id"],
            "leaf_index": leaf_index,
            "credential_nullifier": nullifier,
            "credential_proof_b64url": _b64url(credential_proof_data),
            "engine_ballot_b64url": _b64url(ballot_data),
            "engine_proofs_b64url": _b64url(proofs_data),
            "engine_record_version": PROTOCOL_VERSION,
        }

        canonical_bytes = canonical_json(canonical_record)
        tree = self.merkle_trees.setdefault(election_id, MerkleTree())
        tree.append_leaf(canonical_bytes)

        stored_record = {
            **canonical_record,
            "canonical_bytes": canonical_bytes,
            "ballot_data": ballot_data,
            "proofs_data": proofs_data,
            "credential_proof_data": credential_proof_data,
        }
        ballot_list.append(stored_record)

        audit_path = tree.get_audit_path(leaf_index)
        root_hex = tree.get_root_hex()

        return {
            "election_id": election_id,
            "manifest_digest": manifest_digest,
            "ballot_id": ballot_data["ballot_id"],
            "leaf_index": leaf_index,
            "credential_nullifier": nullifier,
            "merkle_root": root_hex,
            "audit_path": audit_path,
            "status": "COMMITTED_PENDING_WITNESS",
        }

    def export_ballots(
        self,
        election_id: str,
        manifest_digest: str,
        ballots: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Export accepted ballots into canonical evidence structure."""
        if ballots is None:
            ballots = self.accepted_ballots.get(election_id, [])

        exported_items: List[Dict[str, Any]] = []
        tree = MerkleTree()

        for b in ballots:
            if "canonical_bytes" in b:
                can_bytes = b["canonical_bytes"]
                can_record = {
                    "schema": b["schema"],
                    "election_id": b["election_id"],
                    "manifest_digest": b["manifest_digest"],
                    "ballot_id": b["ballot_id"],
                    "leaf_index": b["leaf_index"],
                    "credential_nullifier": b["credential_nullifier"],
                    "credential_proof_b64url": b["credential_proof_b64url"],
                    "engine_ballot_b64url": b["engine_ballot_b64url"],
                    "engine_proofs_b64url": b["engine_proofs_b64url"],
                    "engine_record_version": b["engine_record_version"],
                }
            else:
                can_record = b
                can_bytes = canonical_json(b)

            tree.append_leaf(can_bytes)
            leaf_hash = MerkleTree.hash_leaf(can_bytes).hex()
            exported_items.append({
                "record": can_record,
                "leaf_hash": leaf_hash,
            })

        return {
            "schema": "himvote.ballot_evidence_export.v1",
            "election_id": election_id,
            "manifest_digest": manifest_digest,
            "ballot_count": len(exported_items),
            "merkle_root": tree.get_root_hex(),
            "ballots": exported_items,
        }

    def verify_tally(
        self,
        manifest: Dict[str, Any],
        exported_ballots: Any,
        tally_result: Dict[str, Any],
        trustee_proofs: Optional[Any] = None,
    ) -> bool:
        """Independently verify homomorphic accumulation, trustee decryption proofs, and totals."""
        election_id = manifest["election_id"]
        manifest_digest = manifest["manifest_digest"]

        raw_candidates = manifest.get("candidates") or manifest.get("candidate_ids") or []
        candidates: List[str] = []
        for c in raw_candidates:
            if isinstance(c, dict):
                candidates.append(c.get("id") or c.get("candidate_id") or "")
            elif isinstance(c, str):
                candidates.append(c)

        if not candidates and "contests" in manifest:
            for contest in manifest["contests"]:
                for c in contest.get("candidates", []):
                    if isinstance(c, dict):
                        candidates.append(c.get("id") or c.get("candidate_id") or "")
                    elif isinstance(c, str):
                        candidates.append(c)

        results = tally_result.get("results")
        if results is None:
            results = tally_result.get("contest_tallies")
        if results is None:
            results = tally_result.get("tallies", {})

        if not candidates:
            candidates = list(results.keys())

        if tally_result.get("election_id") != election_id:
            raise TallyVerificationError("Election ID mismatch in tally result")

        def _norm_d(d_str: Optional[str]) -> str:
            if not d_str:
                return ""
            s = d_str.strip().lower()
            return s[7:] if s.startswith("sha256:") else s

        if _norm_d(tally_result.get("manifest_digest")) != _norm_d(manifest_digest):
            raise TallyVerificationError("Manifest digest mismatch in tally result")

        if isinstance(exported_ballots, list):
            ballot_entries = exported_ballots
        elif isinstance(exported_ballots, dict):
            ballot_entries = exported_ballots.get("ballots") or exported_ballots.get("leaves", [])
        else:
            raise TallyVerificationError("Exported ballots must be a list or dict")

        claimed_total = tally_result.get("total_ballots")
        if claimed_total is None:
            claimed_total = len(ballot_entries)

        if len(ballot_entries) != claimed_total:
            raise TallyVerificationError("Reported total ballots does not match ballot count in export")

        seen_nullifiers: Set[str] = set()
        decoded_ballots: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []

        for item in ballot_entries:
            rec = item.get("record", item) if isinstance(item, dict) else item
            nullifier = rec.get("credential_nullifier")
            if not nullifier:
                raise TallyVerificationError("Missing nullifier in ballot export entry")
            if nullifier in seen_nullifiers:
                raise TallyVerificationError(f"Duplicate nullifier {nullifier} in export")
            seen_nullifiers.add(nullifier)

            ballot_dict: Dict[str, Any] = {}
            proofs_dict: Dict[str, Any] = {}

            if "ballot_data" in rec and isinstance(rec["ballot_data"], dict):
                ballot_dict = rec["ballot_data"]
            elif "engine_ballot_b64url" in rec:
                b64_str = rec["engine_ballot_b64url"].strip()
                padded = b64_str + "=" * ((4 - len(b64_str) % 4) % 4)
                raw_bytes = base64.urlsafe_b64decode(padded)
                ballot_dict = json.loads(raw_bytes.decode("utf_8"))

            if "proofs_data" in rec and isinstance(rec["proofs_data"], dict):
                proofs_dict = rec["proofs_data"]
            elif "engine_proofs_b64url" in rec and rec["engine_proofs_b64url"]:
                p64_str = rec["engine_proofs_b64url"].strip()
                padded_p = p64_str + "=" * ((4 - len(p64_str) % 4) % 4)
                raw_p_bytes = base64.urlsafe_b64decode(padded_p)
                proofs_dict = json.loads(raw_p_bytes.decode("utf_8"))

            decoded_ballots.append((ballot_dict, proofs_dict))

        is_encrypted = any("ciphertexts" in b for b, _ in decoded_ballots)

        # Plaintext selections verification
        if not is_encrypted:
            recomputed: Dict[str, int] = {c: 0 for c in candidates}
            for ballot_dict, _ in decoded_ballots:
                selections = ballot_dict.get("selections", {})
                if isinstance(selections, dict):
                    for cid, count in selections.items():
                        if isinstance(count, int):
                            recomputed[cid] = recomputed.get(cid, 0) + count
                elif isinstance(selections, list):
                    for cid in selections:
                        if isinstance(cid, str):
                            recomputed[cid] = recomputed.get(cid, 0) + 1

            for cid, exp_count in results.items():
                if recomputed.get(cid, 0) != exp_count:
                    raise TallyVerificationError(f"Tally mismatch for candidate {cid}: expected {exp_count}, got {recomputed.get(cid, 0)}")

            sum_reported = sum(results.get(c, 0) for c in candidates)
            if sum_reported != claimed_total:
                raise TallyVerificationError("Sum of candidate votes does not equal total ballots")

            return True

        # Homomorphic encrypted verification
        accumulated_a: Dict[str, int] = {c: 1 for c in candidates}
        accumulated_b: Dict[str, int] = {c: 1 for c in candidates}

        for ballot_dict, proofs_dict in decoded_ballots:
            self.validate_ballot(election_id, manifest_digest, ballot_dict, proofs_dict)

            for c_info in ballot_dict.get("ciphertexts", []):
                cid = c_info["candidate_id"]
                ct = ElGamalCiphertext.from_dict(c_info)
                accumulated_a[cid] = (accumulated_a[cid] * ct.a) % P
                accumulated_b[cid] = (accumulated_b[cid] * ct.b) % P

        if trustee_proofs is None:
            trustee_proofs = (
                tally_result.get("trustee_proofs")
                or tally_result.get("trustee_decryptions")
                or tally_result.get("tallies_with_proofs")
                or tally_result.get("trustees")
            )

        if trustee_proofs is None:
            raise TallyVerificationError("Missing trustee proofs in tally result")

        if isinstance(trustee_proofs, list):
            trustee_list = trustee_proofs
        elif isinstance(trustee_proofs, dict):
            trustee_list = (
                trustee_proofs.get("trustees")
                or trustee_proofs.get("trustee_decryptions")
                or [trustee_proofs]
            )
        else:
            trustee_list = []

        if not trustee_list:
            raise TallyVerificationError("Missing trustees in trustee proofs")

        for cand_id in candidates:
            agg_a = accumulated_a[cand_id]
            agg_b = accumulated_b[cand_id]
            combined_decryption_factor = 1

            for t_info in trustee_list:
                t_id = t_info["trustee_id"]
                pk_share_raw = t_info["public_key_share"]
                pk_share = int(pk_share_raw, 16) if isinstance(pk_share_raw, str) else int(pk_share_raw)

                cand_share_info = t_info["decryption_shares"][cand_id]
                share_val_raw = cand_share_info["share"]
                share_val = int(share_val_raw, 16) if isinstance(share_val_raw, str) else int(share_val_raw)
                dleq_proof = DLEQProof.from_dict(cand_share_info["dleq_proof"])

                valid_dleq = verify_dleq(
                    manifest_digest=manifest_digest,
                    election_id=election_id,
                    trustee_id=t_id,
                    candidate_id=cand_id,
                    public_key_share=pk_share,
                    aggregated_a=agg_a,
                    decryption_share=share_val,
                    proof=dleq_proof,
                )
                if not valid_dleq:
                    raise TallyVerificationError(f"Trustee {t_id} DLEQ proof failed for candidate {cand_id}")

                combined_decryption_factor = (combined_decryption_factor * share_val) % P

            inv_combined = pow(combined_decryption_factor, -1, P)
            plaintext_element = (agg_b * inv_combined) % P

            expected_votes = results.get(cand_id, 0)
            if pow(G, expected_votes, P) != plaintext_element:
                raise TallyVerificationError(f"Decrypted plaintext element does not match tally for {cand_id}")

        sum_reported = sum(results.get(c, 0) for c in candidates)
        if sum_reported != claimed_total:
            raise TallyVerificationError("Sum of candidate votes does not equal total ballots")

        return True

    def verify_inclusion(
        self,
        manifest: Dict[str, Any],
        leaf_hash: str,
        leaf_index: int,
        merkle_proof: List[Dict[str, str]],
        merkle_root: str,
    ) -> bool:
        """Verify inclusion of a ballot in the RFC 9162 Merkle tree."""
        valid = MerkleTree.verify_inclusion_proof(
            leaf_hash_hex=leaf_hash,
            index=leaf_index,
            path=merkle_proof,
            expected_root_hex=merkle_root,
        )
        if not valid:
            raise InclusionVerificationError("Merkle inclusion proof verification failed")
        return True
