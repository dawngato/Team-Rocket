package com.himvote.data.repository

import com.himvote.data.models.BlindedIssuanceRequest
import com.himvote.data.models.StudentCredential
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.storage.EncryptedStorage
import java.security.MessageDigest
import java.security.SecureRandom
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

        return try {
            val random = ByteArray(32)
            SecureRandom().nextBytes(random)
            val tokenHex = random.toHex()
            val blindedHash = sha256("blind_$tokenHex")

            val response = apiService.requestCredentialIssuance(
                BlindedIssuanceRequest(electionId = electionId, blindedToken = blindedHash)
            )

            if (!response.isSuccessful || response.body() == null) {
                return Result.failure(
                    IllegalStateException("Credential issuance was rejected by the identity service")
                )
            }

            val signature = response.body()!!.signature
            if (signature.isBlank()) {
                return Result.failure(
                    IllegalStateException("Identity service returned an empty credential signature")
                )
            }

            val credential = StudentCredential(
                electionId = electionId,
                token = tokenHex,
                signature = signature,
                issuedAt = System.currentTimeMillis()
            )
            encryptedStorage.saveCredential(electionId, credential)
            Result.success(credential)
        } catch (ex: Exception) {
            Result.failure(
                IllegalStateException("Credential issuance service is unavailable", ex)
            )
        }
    }

    fun getStoredCredential(electionId: String): StudentCredential? {
        return encryptedStorage.getCredential(electionId)
    }

    fun hasCredential(electionId: String): Boolean {
        return encryptedStorage.hasCredential(electionId)
    }

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.toHex()
    }

    private fun ByteArray.toHex(): String =
        joinToString("") { "%02x".format(it) }
}
