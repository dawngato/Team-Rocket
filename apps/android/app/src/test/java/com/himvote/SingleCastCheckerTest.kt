package com.himvote

import android.content.SharedPreferences
import com.himvote.data.storage.EncryptedStorage
import com.himvote.util.SingleCastChecker
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

class SingleCastCheckerTest {

    private lateinit var inMemoryPrefs: InMemorySharedPreferences
    private lateinit var encryptedStorage: EncryptedStorage
    private lateinit var singleCastChecker: SingleCastChecker

    @Before
    fun setup() {
        val mockContext = Mockito.mock(android.content.Context::class.java)
        inMemoryPrefs = InMemorySharedPreferences()
        encryptedStorage = EncryptedStorage(mockContext, customPrefs = inMemoryPrefs)
        singleCastChecker = SingleCastChecker(encryptedStorage)
    }

    @Test
    fun testInitialElectionCanCast() {
        val electionId = "elec_student_council_2026"
        assertTrue("A voter should be allowed to cast initially", singleCastChecker.canCast(electionId))
    }

    @Test
    fun testRevotingIsStrictlyBlockedAfterCast() {
        val electionId = "elec_student_council_2026"
        val receiptHandle = "rcpt_test_handle_123"
        val ballotHash = "hash_sha256_mock_abc"

        assertTrue(singleCastChecker.canCast(electionId))

        singleCastChecker.recordCast(electionId, receiptHandle, ballotHash)

        assertFalse("Revoting must be blocked after a ballot is recorded", singleCastChecker.canCast(electionId))
        assertFalse("Parameter validation must fail if already cast", singleCastChecker.validateCastParameters(electionId, receiptHandle, ballotHash))
    }

    @Test
    fun testParameterValidationRejectsBlankFields() {
        assertFalse(singleCastChecker.validateCastParameters("", "rcpt", "hash"))
        assertFalse(singleCastChecker.validateCastParameters("elec", "", "hash"))
        assertFalse(singleCastChecker.validateCastParameters("elec", "rcpt", ""))
    }
}
