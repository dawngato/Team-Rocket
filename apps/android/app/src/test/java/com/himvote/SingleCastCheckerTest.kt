package com.himvote

import com.himvote.data.storage.EncryptedStorage
import com.himvote.util.OfflineVerificationHelper
import com.himvote.util.SingleCastChecker
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

class SingleCastCheckerTest {

    private lateinit var inMemoryPrefs: InMemorySharedPreferences
    private lateinit var encryptedStorage: EncryptedStorage
    private lateinit var offlineVerificationHelper: OfflineVerificationHelper
    private lateinit var singleCastChecker: SingleCastChecker

    @Before
    fun setup() {
        val mockContext = Mockito.mock(android.content.Context::class.java)
        inMemoryPrefs = InMemorySharedPreferences()
        encryptedStorage = EncryptedStorage(mockContext, customPrefs = inMemoryPrefs)
        offlineVerificationHelper = OfflineVerificationHelper()
        singleCastChecker = SingleCastChecker(encryptedStorage, offlineVerificationHelper)
    }

    @Test
    fun testInitialElectionCanCast() {
        val electionId = "elec_student_council_2026"
        assertTrue("A voter should be allowed to cast initially", singleCastChecker.canCast(electionId))
        assertFalse("hasCast should be false initially", singleCastChecker.hasCast(electionId))
    }

    @Test
    fun testRevotingIsStrictlyBlockedAfterCast() {
        val electionId = "elec_student_council_2026"
        val receiptHandle = "rcpt_test_handle_123"
        val ballotHash = offlineVerificationHelper.sha256("ballot_1")

        assertTrue(singleCastChecker.canCast(electionId))

        singleCastChecker.recordCast(electionId, receiptHandle, ballotHash, isOfflineVerified = true)

        assertTrue("hasCast should be true after recording", singleCastChecker.hasCast(electionId))
        assertFalse("Revoting must be blocked after a ballot is recorded", singleCastChecker.canCast(electionId))
        assertFalse("Parameter validation must fail if already cast", singleCastChecker.validateCastParameters(electionId, receiptHandle, ballotHash))

        val receipt = singleCastChecker.getReceipt(electionId)
        assertNotNull("Receipt should be retrieved", receipt)
        assertEquals(receiptHandle, receipt?.receiptHandle)
        assertEquals(ballotHash, receipt?.ballotHash)
    }

    @Test
    fun testParameterValidationRejectsBlankFields() {
        assertFalse(singleCastChecker.validateCastParameters("", "rcpt_valid_handle_123", "hash_valid_sha256_abcdef1234567890"))
        assertFalse(singleCastChecker.validateCastParameters("elec", "", "hash_valid_sha256_abcdef1234567890"))
        assertFalse(singleCastChecker.validateCastParameters("elec", "rcpt_valid_handle_123", ""))
    }

    @Test
    fun testOfflineProofValidation() {
        val electionId = "elec_offline_proof_01"
        val receiptHandle = "rcpt_offline_handle_456"
        val leaf = offlineVerificationHelper.sha256("leaf_$electionId")
        val sibling = offlineVerificationHelper.sha256("sibling_$receiptHandle")
        val proof = com.himvote.data.models.InclusionProof(
            receiptHandle = receiptHandle,
            ballotHash = leaf,
            leafIndex = 0L,
            pathHashes = listOf(sibling),
            rootHash = offlineVerificationHelper.computeMerkleRoot(leaf, 0L, listOf(sibling)),
            verified = true
        )

        val isValid = singleCastChecker.validateOfflineProof(electionId, proof)
        assertTrue("Authenticated proof fixture must pass offline validation", isValid)

        singleCastChecker.recordCast(electionId, proof.receiptHandle, proof.ballotHash, isOfflineVerified = true)
        assertTrue("Integrity check must pass for recorded valid receipt", singleCastChecker.verifyRecordedCastIntegrity(electionId))
    }
}
