package com.himvote

import com.himvote.data.models.CastReceipt
import com.himvote.data.models.InclusionProof
import com.himvote.data.models.StudentCredential
import com.himvote.data.models.UserSession
import com.himvote.data.storage.EncryptedStorage
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

class EncryptedStorageTest {

    private lateinit var inMemoryPrefs: InMemorySharedPreferences
    private lateinit var storage: EncryptedStorage

    @Before
    fun setup() {
        val mockContext = Mockito.mock(android.content.Context::class.java)
        inMemoryPrefs = InMemorySharedPreferences()
        storage = EncryptedStorage(mockContext, customPrefs = inMemoryPrefs)
    }

    @Test
    fun testSessionLifecycle() {
        assertFalse("Initially not authenticated", storage.isAuthenticated())
        assertNull(storage.getSession())

        val session = UserSession(
            token = "jwt_auth_token_xyz",
            role = "STUDENT",
            email = "alpha@hptu.ac.in",
            name = "Student Alpha",
            department = "Computer Science",
            rollNumber = "CS2023_001"
        )

        storage.saveSession(session)
        assertTrue("Must be authenticated after saving session", storage.isAuthenticated())

        val retrieved = storage.getSession()
        assertNotNull(retrieved)
        assertEquals("CS2023_001", retrieved?.rollNumber)
        assertEquals("Computer Science", retrieved?.department)
        assertEquals("STUDENT", retrieved?.role)

        storage.clearSession()
        assertFalse("Must not be authenticated after clearSession", storage.isAuthenticated())
        assertNull(storage.getSession())
    }

    @Test
    fun testCredentialStorage() {
        val electionId = "elec_storage_test_01"
        assertFalse(storage.hasCredential(electionId))
        assertNull(storage.getCredential(electionId))

        val credential = StudentCredential(
            electionId = electionId,
            token = "blinded_unblinded_token_sig_456",
            signature = "sig_rsa_verified_valid"
        )

        storage.saveCredential(electionId, credential)
        assertTrue(storage.hasCredential(electionId))

        val retrieved = storage.getCredential(electionId)
        assertNotNull(retrieved)
        assertEquals(credential.token, retrieved?.token)
        assertEquals(credential.signature, retrieved?.signature)

        storage.removeCredential(electionId)
        assertFalse(storage.hasCredential(electionId))
    }

    @Test
    fun testSingleCastAndReceiptPersistence() {
        val electionId = "elec_council_2026"
        val receiptHandle = "rcpt_storage_handle_789"
        val ballotHash = "hash_storage_ballot_999"

        assertFalse(storage.hasCastBallot(electionId))
        assertNull(storage.getReceipt(electionId))

        storage.markBallotCast(electionId, receiptHandle, ballotHash)

        assertTrue(storage.hasCastBallot(electionId))
        val receipt = storage.getReceipt(electionId)
        assertNotNull(receipt)
        assertEquals(receiptHandle, receipt?.receiptHandle)
        assertEquals(ballotHash, receipt?.ballotHash)

        val allReceipts = storage.getAllReceipts()
        assertEquals(1, allReceipts.size)
        assertEquals(receiptHandle, allReceipts[0].receiptHandle)

        val castIds = storage.getCastElectionIds()
        assertTrue(castIds.contains(electionId))
    }

    @Test
    fun testOfflineProofAndVerificationFlags() {
        val electionId = "elec_offline_flag_test"
        assertFalse(storage.isOfflineVerified(electionId))

        storage.markOfflineVerified(electionId)
        assertTrue(storage.isOfflineVerified(electionId))

        val proof = InclusionProof(
            receiptHandle = "rcpt_proof_flag",
            ballotHash = "leaf_hash_value",
            leafIndex = 12L,
            pathHashes = listOf("sibling_hash_1", "sibling_hash_2"),
            rootHash = "root_hash_value",
            verified = true
        )
        storage.saveInclusionProof(electionId, proof)

        val loadedProof = storage.getInclusionProof(electionId)
        assertNotNull(loadedProof)
        assertEquals(12L, loadedProof?.leafIndex)
        assertEquals("root_hash_value", loadedProof?.rootHash)
    }

    @Test
    fun testSafeLogoutPreservesSingleCastRecords() {
        val electionId = "elec_logout_retention_test"
        val session = UserSession(
            token = "jwt_token",
            role = "STUDENT",
            email = "beta@hptu.ac.in",
            name = "Student Beta",
            department = "CS",
            rollNumber = "CS2023_002"
        )
        storage.saveSession(session)
        storage.saveCredential(electionId, StudentCredential(electionId, "tok", "sig"))
        storage.markBallotCast(electionId, "rcpt_retain", "hash_retain")

        storage.clearSessionOnLogout()

        assertFalse("Session must be cleared on logout", storage.isAuthenticated())
        assertFalse("Credential must be cleared on logout", storage.hasCredential(electionId))
        assertTrue("Single cast record must be retained across logout", storage.hasCastBallot(electionId))
        assertNotNull("Cast receipt must be retained across logout", storage.getReceipt(electionId))
    }

    @Test
    fun testAuditTrailLogging() {
        storage.recordAuditEvent("TEST_EVENT_ONE")
        storage.recordAuditEvent("TEST_EVENT_TWO")

        val trail = storage.getAuditTrail()
        assertTrue(trail.size >= 2)
        assertTrue(trail.any { it.contains("TEST_EVENT_ONE") })
        assertTrue(trail.any { it.contains("TEST_EVENT_TWO") })
    }
}
