package com.himvote.util

import com.himvote.data.models.InclusionProof
import java.security.MessageDigest
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Offline Cryptographic Verification Engine.
 * Enables client side zero network verification of Merkle inclusion proofs,
 * ballot integrity hashes, and auditor signatures.
 */
@Singleton
class OfflineVerificationHelper @Inject constructor() {

    /**
     * Computes SHA_256 hash string for an input string.
     */
    fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(input.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Computes SHA_256 hash for raw byte array.
     */
    fun sha256(bytes: ByteArray): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(bytes)
    }

    /**
     * Recomputes Merkle root hash from a given leaf hash and witness sibling path.
     * Evaluates left or right node placement based on leaf index bit values.
     */
    fun computeMerkleRoot(leafHash: String, leafIndex: Long, path: List<String>): String {
        var current = leafHash
        var index = leafIndex
        for (sibling in path) {
            current = if (index % 2L == 0L) {
                sha256(current + sibling)
            } else {
                sha256(sibling + current)
            }
            index /= 2L
        }
        return current
    }

    /**
     * Mathematically verifies an inclusion proof offline against expected Merkle root.
     */
    fun verifyMerklePath(
        leafHash: String,
        leafIndex: Long,
        path: List<String>,
        expectedRoot: String
    ): Boolean {
        if (leafIndex < 0L || !isSha256Hex(leafHash) || !isSha256Hex(expectedRoot)) {
            return false
        }
        if (path.any { !isSha256Hex(it) }) return false
        val computedRoot = computeMerkleRoot(leafHash, leafIndex, path)
        return computedRoot.equals(expectedRoot, ignoreCase = true)
    }

    /**
     * Verifies an InclusionProof model object completely offline.
     */
    fun verifyInclusionProofOffline(proof: InclusionProof): Boolean {
        return verifyMerklePath(
            leafHash = proof.ballotHash,
            leafIndex = proof.leafIndex,
            path = proof.pathHashes,
            expectedRoot = proof.rootHash
        )
    }

    /**
     * Validates receipt handle and ballot hash format offline.
     */
    fun verifyReceiptFormat(receiptHandle: String, ballotHash: String): Boolean {
        if (receiptHandle.isBlank() || ballotHash.isBlank()) {
            return false
        }
        if (receiptHandle.length < 8) {
            return false
        }
        return isSha256Hex(ballotHash)
    }

    /**
     * Computes deterministic offline ballot hash from ballot parameters.
     */
    fun computeBallotHash(electionId: String, ciphertext: String, salt: String = ""): String {
        return sha256("ballot_${electionId}_${ciphertext}_${salt}")
    }

    /**
     * Verifies auditor hardware attestation offline against published election root.
     */
    fun verifyAuditAttestationOffline(attestation: String, rootHash: String): Boolean {
        if (attestation.isBlank() || rootHash.isBlank()) {
            return false
        }
        // A signature cannot be authenticated without the independently pinned
        // auditor key and canonical signed bytes. Shape alone is not evidence.
        return false
    }

    private fun isSha256Hex(value: String): Boolean {
        return value.length == 64 && value.matches(Regex("^[a-fA-F0-9]{64}$"))
    }
}
