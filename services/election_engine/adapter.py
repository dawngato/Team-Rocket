"""Vetted voting engine adapter implementation for HimVote.
Fulfills Section 6.4 and Gate E1 specification for Profile VEEM.
"""

import base64
from typing import Any, Dict, List, Optional, Set, Tuple

from .constants import G, P, Q, PROTOCOL_VERSION, SCHEMA_BALLOT_EVIDENCE
from .credentials import verify_credential_proof
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
        """Validate encrypted ballot format, ciphertexts, and zero knowledge proofs."""
        if ballot_data.get("election_id") != election_id:
            raise BallotValidationError("Election ID mismatch in ballot data")
        if ballot_data.get("manifest_digest") != manifest_digest:
            raise BallotValidationError("Manifest digest mismatch in ballot data")

        ciphertexts_raw = ballot_data.get("ciphertexts", [])
        if not ciphertexts_raw:
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
        issuer_public_key: Dict[str, Any],
    ) -> Tuple[bool, str]:
        """Verify anonymous credential proof and derive nullifier."""
        is_valid, nullifier = verify_credential_proof(
            election_id=election_id,
            manifest_digest=manifest_digest,
            credential_proof=credential_proof_data,
            issuer_public_key=issuer_public_key,
        )
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
        exported_ballots: Dict[str, Any],
        tally_result: Dict[str, Any],
        trustee_proofs: Dict[str, Any],
    ) -> bool:
        """Independently verify homomorphic accumulation, trustee decryption proofs, and totals."""
        election_id = manifest["election_id"]
        manifest_digest = manifest["manifest_digest"]
        candidates = manifest["candidates"]
        joint_pk_raw = manifest["joint_public_key"]
        joint_pk = int(joint_pk_raw, 16) if isinstance(joint_pk_raw, str) else int(joint_pk_raw)

        if tally_result.get("election_id") != election_id:
            raise TallyVerificationError("Election ID mismatch in tally result")
        if tally_result.get("manifest_digest") != manifest_digest:
            raise TallyVerificationError("Manifest digest mismatch in tally result")

        ballot_entries = exported_ballots.get("ballots", [])
        claimed_total = tally_result.get("total_ballots", 0)
        if len(ballot_entries) != claimed_total:
            raise TallyVerificationError("Reported total ballots does not match ballot count in export")

        results = tally_result.get("results", {})
        sum_reported = sum(results.get(c, 0) for c in candidates)
        if sum_reported != claimed_total:
            raise TallyVerificationError("Sum of candidate votes does not equal total ballots")

        seen_nullifiers: Set[str] = set()
        accumulated_a: Dict[str, int] = {c: 1 for c in candidates}
        accumulated_b: Dict[str, int] = {c: 1 for c in candidates}

        for item in ballot_entries:
            rec = item["record"]
            nullifier = rec["credential_nullifier"]
            if nullifier in seen_nullifiers:
                raise TallyVerificationError(f"Duplicate nullifier {nullifier} in export")
            seen_nullifiers.add(nullifier)

            # Decode ballot and proofs
            ballot_json_bytes = base64.urlsafe_b64decode(rec["engine_ballot_b64url"] + "==")
            proofs_json_bytes = base64.urlsafe_b64decode(rec["engine_proofs_b64url"] + "==")

            import json
            ballot_dict = json.loads(ballot_json_bytes.decode("utf_8"))
            proofs_dict = json.loads(proofs_json_bytes.decode("utf_8"))

            self.validate_ballot(election_id, manifest_digest, ballot_dict, proofs_dict)

            for c_info in ballot_dict["ciphertexts"]:
                cid = c_info["candidate_id"]
                ct = ElGamalCiphertext.from_dict(c_info)
                accumulated_a[cid] = (accumulated_a[cid] * ct.a) % P
                accumulated_b[cid] = (accumulated_b[cid] * ct.b) % P

        # Verify trustee decryption shares
        trustee_list = trustee_proofs.get("trustees", [])
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
