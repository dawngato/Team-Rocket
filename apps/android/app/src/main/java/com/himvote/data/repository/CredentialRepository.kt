package com.himvote.data.repository

import com.himvote.data.models.StudentCredential
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.storage.EncryptedStorage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CredentialRepository @Inject constructor(
    private val apiService: HimVoteApiService,
    private val encryptedStorage: EncryptedStorage
) {
    /**
     * Issues a blind credential for the student.
     * Section 10 Rule 1: Issuance finishes before casting opens to eliminate identity timing links.
     * The credential is encrypted in hardware Keystore and cannot be backed up.
     */
    suspend fun requestCredentialIssuance(electionId: String): Result<StudentCredential> {
        // Return existing credential if already stored in Keystore
        val existing = encryptedStorage.getCredential(electionId)
        if (existing != null) {
            return Result.success(existing)
        }

        // The Android client has no reviewed RFC 9474 blinding implementation.
        // Never replace that protocol with a locally hashed token. The supported
        // engine booth must provide the blinded request and unblinding step before
        // this path can be enabled.
        return Result.failure(
            UnsupportedOperationException(
                "Credential issuance requires the validated election engine booth"
            )
        )
    }

    fun getStoredCredential(electionId: String): StudentCredential? {
        return encryptedStorage.getCredential(electionId)
    }

    fun hasCredential(electionId: String): Boolean {
        return encryptedStorage.hasCredential(electionId)
    }

}
