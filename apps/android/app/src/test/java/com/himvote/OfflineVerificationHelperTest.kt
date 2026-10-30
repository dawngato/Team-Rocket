package com.himvote

import com.himvote.util.OfflineVerificationHelper
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class OfflineVerificationHelperTest {

    private lateinit var helper: OfflineVerificationHelper

    @Before
    fun setup() {
        helper = OfflineVerificationHelper()
    }

    @Test
    fun testSha256Determinism() {
        val input = "HimVote_Offline_Test_123"
        val hash1 = helper.sha256(input)
        val hash2 = helper.sha256(input)
        assertEquals("SHA_256 must be deterministic", hash1, hash2)
        assertEquals("SHA_256 hex string must be 64 characters long", 64, hash1.length)
    }

    @Test
    fun testMerkleRootComputationAndVerification() {
        val leaf = helper.sha256("ballot_encrypted_sample")
        val sibling0 = helper.sha256("merkle_sibling_0")
        val sibling1 = helper.sha256("merkle_sibling_1")
        val path = listOf(sibling0, sibling1)
        val leafIndex = 0L

        val expectedRoot = helper.computeMerkleRoot(leaf, leafIndex, path)
        val isVerified = helper.verifyMerklePath(leaf, leafIndex, path, expectedRoot)

        assertTrue("Path must match recomputed root", isVerified)
    }

    @Test
    fun testMerkleVerificationFailsOnTamperedPath() {
        val leaf = helper.sha256("ballot_encrypted_sample")
        val sibling0 = helper.sha256("merkle_sibling_0")
        val sibling1 = helper.sha256("merkle_sibling_1")
        val path = listOf(sibling0, sibling1)
        val leafIndex = 0L

        val expectedRoot = helper.computeMerkleRoot(leaf, leafIndex, path)

        val tamperedPath = listOf(sibling0, helper.sha256("tampered_sibling_1"))
        val isVerified = helper.verifyMerklePath(leaf, leafIndex, tamperedPath, expectedRoot)

        assertFalse("Tampered path must fail verification", isVerified)
    }

    @Test
    fun testAuthenticatedProofOfflineVerification() {
        val electionId = "elec_offline_unit_test"
        val receiptHandle = "rcpt_sample_handle_999"
        val leaf = helper.sha256("leaf_$electionId")
        val sibling = helper.sha256("sibling_$receiptHandle")
        val path = listOf(sibling)
        val proof = com.himvote.data.models.InclusionProof(
            receiptHandle = receiptHandle,
            ballotHash = leaf,
            leafIndex = 0L,
            pathHashes = path,
            rootHash = helper.computeMerkleRoot(leaf, 0L, path),
            verified = true
        )

        assertTrue("Authenticated proof fixture must verify offline", helper.verifyInclusionProofOffline(proof))
    }

    @Test
    fun testVerifyReceiptFormat() {
        val validHandle = "rcpt_test_handle_abc123"
        val validHash = helper.sha256("content")
        assertTrue(helper.verifyReceiptFormat(validHandle, validHash))

        assertFalse(helper.verifyReceiptFormat("", validHash))
        assertFalse(helper.verifyReceiptFormat("short", validHash))
        assertFalse(helper.verifyReceiptFormat(validHandle, ""))
    }

    @Test
    fun testAuditAttestationVerification() {
        val attestation = "hardware_tpm_attestation_valid_sha256_sig"
        val rootHash = helper.sha256("merkle_tree_published_root")
        assertFalse("Attestation shape alone must not verify", helper.verifyAuditAttestationOffline(attestation, rootHash))
        assertFalse(helper.verifyAuditAttestationOffline("", rootHash))
        assertFalse(helper.verifyAuditAttestationOffline(attestation, ""))
    }
}
