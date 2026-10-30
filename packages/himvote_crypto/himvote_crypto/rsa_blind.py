"""RFC 9474 RSA Blind Signatures with Appendix (RSABSSA).

Implements the four core operations defined in RFC 9474:
* Client blinding: Prepare and Blind
* Server blind signing: BlindSign
* Client unblinding: Finalize
* Public verification: Verify

Supported named variants:
* RSABSSA_SHA384_PSS_RANDOMIZED (Recommended)
* RSABSSA_SHA384_PSSZERO_RANDOMIZED
* RSABSSA_SHA384_PSS_DETERMINISTIC
* RSABSSA_SHA384_PSSZERO_DETERMINISTIC
"""

import enum
import hashlib
import math
import secrets
from dataclasses import dataclass
from typing import Optional, Tuple, Union

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.rsa import (
    RSAPrivateKey,
    RSAPublicKey,
    RSAPublicNumbers,
)

from himvote_crypto.exceptions import (
    BlindingError,
    InvalidSignatureError,
    RSABlindError,
)


class RSABSSAVariant(enum.Enum):
    """Named RSABSSA variants per RFC 9474 Section 5."""

    RSABSSA_SHA384_PSS_RANDOMIZED = "RSABSSA_SHA384_PSS_RANDOMIZED"
    RSABSSA_SHA384_PSSZERO_RANDOMIZED = "RSABSSA_SHA384_PSSZERO_RANDOMIZED"
    RSABSSA_SHA384_PSS_DETERMINISTIC = "RSABSSA_SHA384_PSS_DETERMINISTIC"
    RSABSSA_SHA384_PSSZERO_DETERMINISTIC = "RSABSSA_SHA384_PSSZERO_DETERMINISTIC"


@dataclass(frozen=True)
class BlindingSecret:
    """Secret blinding state preserved by client between Blind and Finalize."""

    inv: int
    r: int
    variant: RSABSSAVariant
    modulus_n: int


def _mgf1_sha384(mgf_seed: bytes, mask_len: int) -> bytes:
    """Mask Generation Function MGF1 using SHA384 per RFC 8017 Appendix B.2.1."""
    h_len = hashlib.sha384().digest_size
    t = bytearray()
    counter = 0
    while len(t) < mask_len:
        c = counter.to_bytes(4, "big")
        t.extend(hashlib.sha384(mgf_seed + c).digest())
        counter += 1
    return bytes(t[:mask_len])


def _emsa_pss_encode(
    msg: bytes,
    em_bits: int,
    salt: bytes,
) -> bytes:
    """EMSA_PSS_ENCODE per RFC 8017 Section 9.1.1 with SHA384 and MGF1."""
    hash_func = hashlib.sha384
    h_len = hash_func().digest_size
    s_len = len(salt)
    em_len = math.ceil(em_bits / 8)

    if em_len < h_len + s_len + 2:
        raise RSABlindError("Encoding error: emLen too short for hash and salt")

    m_hash = hash_func(msg).digest()
    m_prime = b"\x00" * 8 + m_hash + salt
    h = hash_func(m_prime).digest()

    ps_len = em_len - s_len - h_len - 2
    ps = b"\x00" * ps_len
    db = ps + b"\x01" + salt
    db_mask = _mgf1_sha384(h, em_len - h_len - 1)
    masked_db = bytes(a ^ b for a, b in zip(db, db_mask))

    zero_bits = 8 * em_len - em_bits
    if zero_bits > 0:
        first_byte = masked_db[0] & (0xFF >> zero_bits)
        masked_db = bytes([first_byte]) + masked_db[1:]

    return masked_db + h + b"\xbc"


def _get_pub_numbers(
    pk: Union[RSAPublicKey, RSAPublicNumbers, Tuple[int, int]],
) -> Tuple[int, int, RSAPublicKey]:
    """Extract modulus n, exponent e, and RSAPublicKey object."""
    if isinstance(pk, RSAPublicKey):
        pn = pk.public_numbers()
        return pn.n, pn.e, pk
    if isinstance(pk, RSAPublicNumbers):
        return pk.n, pk.e, pk.public_key()
    if isinstance(pk, tuple) and len(pk) == 2:
        n, e = pk
        pub_key = RSAPublicNumbers(e, n).public_key()
        return n, e, pub_key
    raise TypeError(f"Unsupported public key type: {type(pk).__name__}")


def prepare_msg(
    msg: bytes,
    variant: RSABSSAVariant,
    *,
    custom_prefix: Optional[bytes] = None,
) -> Tuple[bytes, Optional[bytes]]:
    """Prepare message per RFC 9474 Section 4.1.

    Randomized variants prepend a 32 byte random prefix.
    Deterministic variants return the message as is.
    """
    if variant in (
        RSABSSAVariant.RSABSSA_SHA384_PSS_RANDOMIZED,
        RSABSSAVariant.RSABSSA_SHA384_PSSZERO_RANDOMIZED,
    ):
        prefix = custom_prefix if custom_prefix is not None else secrets.token_bytes(32)
        if len(prefix) != 32:
            raise RSABlindError("Message randomizer prefix must be exactly 32 bytes")
        return prefix + msg, prefix
    return msg, None


def client_blind(
    pk: Union[RSAPublicKey, RSAPublicNumbers, Tuple[int, int]],
    msg: bytes,
    *,
    variant: RSABSSAVariant = RSABSSAVariant.RSABSSA_SHA384_PSS_RANDOMIZED,
    custom_salt: Optional[bytes] = None,
    custom_prefix: Optional[bytes] = None,
    custom_r: Optional[int] = None,
) -> Tuple[bytes, BlindingSecret, bytes]:
    """Client blinding function Blind per RFC 9474 Section 4.2.

    Parameters:
        pk: Server RSA public key.
        msg: Application private input message.
        variant: Named RSABSSA variant.
        custom_salt: Optional pre set salt for test vectors.
        custom_prefix: Optional pre set randomizer prefix for test vectors.
        custom_r: Optional pre set blinding factor for test vectors.

    Returns:
        Tuple of (blinded_msg, BlindingSecret, prepared_msg).
    """
    n, e, _ = _get_pub_numbers(pk)
    modulus_len = (n.bit_length() + 7) // 8

    prepared, _ = prepare_msg(msg, variant, custom_prefix=custom_prefix)

    # Determine salt length
    if variant in (
        RSABSSAVariant.RSABSSA_SHA384_PSS_RANDOMIZED,
        RSABSSAVariant.RSABSSA_SHA384_PSS_DETERMINISTIC,
    ):
        salt_len = 48
    else:
        salt_len = 0

    if custom_salt is not None:
        if len(custom_salt) != salt_len:
            raise RSABlindError(
                f"Salt length mismatch: expected {salt_len}, got {len(custom_salt)}"
            )
        salt = custom_salt
    else:
        salt = secrets.token_bytes(salt_len) if salt_len > 0 else b""

    # Encode message representative
    encoded_msg = _emsa_pss_encode(prepared, n.bit_length() - 1, salt)
    m = int.from_bytes(encoded_msg, "big")

    if math.gcd(m, n) != 1:
        raise RSABlindError("Invalid input: encoded message is not coprime with n")

    # Sample blinding factor r coprime with n
    if custom_r is not None:
        r = custom_r
        if not (1 < r < n) or math.gcd(r, n) != 1:
            raise BlindingError("Invalid pre set blinding factor r")
        inv = pow(r, -1, n)
    else:
        for _ in range(128):
            r = secrets.randbelow(n - 2) + 2
            if math.gcd(r, n) == 1:
                try:
                    inv = pow(r, -1, n)
                    break
                except ValueError:
                    continue
        else:
            raise BlindingError("Failed to find valid blinding factor r coprime to n")

    # Compute x = RSAVP1(pk, r) = pow(r, e, n)
    x = pow(r, e, n)
    z = (m * x) % n
    blinded_msg = z.to_bytes(modulus_len, "big")

    secret = BlindingSecret(
        inv=inv,
        r=r,
        variant=variant,
        modulus_n=n,
    )

    return blinded_msg, secret, prepared


def server_blind_sign(
    sk: RSAPrivateKey,
    blinded_msg: bytes,
) -> bytes:
    """Server blind signing function BlindSign per RFC 9474 Section 4.3.

    Parameters:
        sk: Server RSA private key.
        blinded_msg: Encoded and blinded message from client.

    Returns:
        Blind signature bytes.
    """
    pn = sk.private_numbers()
    n = pn.public_numbers.n
    e = pn.public_numbers.e
    d = pn.d
    modulus_len = (n.bit_length() + 7) // 8

    if len(blinded_msg) != modulus_len:
        raise RSABlindError(
            f"Unexpected input size: expected {modulus_len}, got {len(blinded_msg)}"
        )

    m = int.from_bytes(blinded_msg, "big")
    if not (0 <= m < n):
        raise RSABlindError("Message representative out of range")

    # Compute s = RSASP1(sk, m)
    s = pow(m, d, n)

    # Self check: verify m == pow(s, e, n)
    if pow(s, e, n) != m:
        raise RSABlindError("Signing failure during blind sign self test")

    return s.to_bytes(modulus_len, "big")


def client_finalize(
    pk: Union[RSAPublicKey, RSAPublicNumbers, Tuple[int, int]],
    prepared_msg_val: bytes,
    blind_sig: bytes,
    secret: BlindingSecret,
) -> bytes:
    """Client unblinding function Finalize per RFC 9474 Section 4.4.

    Removes the blinding factor and verifies the signature using RSA_PSS.

    Parameters:
        pk: Server RSA public key.
        prepared_msg_val: The prepared message that was blinded.
        blind_sig: Blind signature returned by server.
        secret: BlindingSecret created during Blind.

    Returns:
        Standard valid RSA_PSS signature over prepared_msg_val.
    """
    n, _, pub_obj = _get_pub_numbers(pk)
    modulus_len = (n.bit_length() + 7) // 8

    if len(blind_sig) != modulus_len:
        raise RSABlindError(
            f"Unexpected blind signature length: expected {modulus_len}, got {len(blind_sig)}"
        )

    z = int.from_bytes(blind_sig, "big")
    s = (z * secret.inv) % n
    sig = s.to_bytes(modulus_len, "big")

    # Verify signature
    is_valid = verify_signature(
        pub_obj,
        prepared_msg_val,
        sig,
        variant=secret.variant,
    )
    if not is_valid:
        raise InvalidSignatureError("Unblinded signature failed verification")

    return sig


def verify_signature(
    pk: Union[RSAPublicKey, RSAPublicNumbers, Tuple[int, int]],
    prepared_msg_val: bytes,
    sig: bytes,
    *,
    variant: RSABSSAVariant = RSABSSAVariant.RSABSSA_SHA384_PSS_RANDOMIZED,
) -> bool:
    """Verify an unblinded RSA signature against a prepared message.

    Parameters:
        pk: Server RSA public key.
        prepared_msg_val: Prepared message bytes.
        sig: Signature bytes.
        variant: RSABSSA variant used during signing.

    Returns:
        True if valid, False otherwise.
    """
    _, _, pub_obj = _get_pub_numbers(pk)

    salt_len = (
        48
        if variant
        in (
            RSABSSAVariant.RSABSSA_SHA384_PSS_RANDOMIZED,
            RSABSSAVariant.RSABSSA_SHA384_PSS_DETERMINISTIC,
        )
        else 0
    )

    try:
        pub_obj.verify(
            sig,
            prepared_msg_val,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA384()),
                salt_length=salt_len,
            ),
            hashes.SHA384(),
        )
        return True
    except (InvalidSignature, ValueError):
        return False


def generate_rsa_keypair(key_size: int = 2048) -> Tuple[RSAPrivateKey, RSAPublicKey]:
    """Generate an RSA key pair suitable for RFC 9474 blind signatures."""
    if key_size < 2048:
        raise ValueError("Key size must be at least 2048 bits for production security")
    priv = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
    )
    return priv, priv.public_key()
