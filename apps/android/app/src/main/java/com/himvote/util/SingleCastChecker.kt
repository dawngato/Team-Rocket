package com.himvote.util

import com.himvote.data.models.CastReceipt
import com.himvote.data.models.InclusionProof
import com.himvote.data.storage.EncryptedStorage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Enforces Gate E1 requirement:
 * Single cast check preventing revoting or duplicate ballot submissions.
 * Backed by hardware Keystore storage with offline verification support.
 */
@Singleton
class SingleCastChecker @Inject constructor(
    private val encryptedStorage: EncryptedStorage,
    private val offlineVerificationHelper: OfflineVerificationHelper
) {
    /**
     * Asserts whether a ballot can be cast for the given election ID.
     * Returns true only if no prior ballot has been recorded for this election.
     */
    fun canCast(electionId: String): Boolean {
        if (electionId.isBlank()) return false
        return !encryptedStorage.hasCastBallot(electionId)
    }

    /**
     * Checks if a ballot has already been cast.
     */
    fun hasCast(electionId: String): Boolean {
        if (electionId.isBlank()) return false
        return encryptedStorage.hasCastBallot(electionId)
    }

    /**
     * Validates that the return payload contains non empty cryptographic hashes
     * and has not already been submitted.
     */
    fun validateCastParameters(
        electionId: String,
        receiptHandle: String,
        ballotHash: String
    ): Boolean {
        if (electionId.isBlank() || receiptHandle.isBlank() || ballotHash.isBlank()) {
            return false
        }
        // If already cast, duplicate submission is strictly invalid
        if (encryptedStorage.hasCastBallot(electionId)) {
            return false
        }
        return offlineVerificationHelper.verifyReceiptFormat(receiptHandle, ballotHash)
    }

    /**
     * Validates an inclusion proof against single cast state and offline math.
     */
    fun validateOfflineProof(electionId: String, proof: InclusionProof): Boolean {
        if (electionId.isBlank()) return false
        val isMathValid = offlineVerificationHelper.verifyInclusionProofOffline(proof)
        if (!isMathValid) return false
        
        // Ensure receipt matches stored record if one exists
        val recordedReceipt = encryptedStorage.getReceipt(electionId)
        if (recordedReceipt != null) {
            return recordedReceipt.receiptHandle == proof.receiptHandle &&
                    recordedReceipt.ballotHash == proof.ballotHash
        }
        return true
    }

    /**
     * Commits the ballot cast receipt to Keystore and locks revoting permanently.
     */
    fun recordCast(
        electionId: String,
        receiptHandle: String,
        ballotHash: String,
        isOfflineVerified: Boolean = false
    ) {
        require(electionId.isNotBlank()) { "Election ID cannot be blank" }
        require(receiptHandle.isNotBlank()) { "Receipt handle cannot be blank" }
        require(ballotHash.isNotBlank()) { "Ballot hash cannot be blank" }

        encryptedStorage.markBallotCast(
            electionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash
        )

        if (isOfflineVerified) {
            encryptedStorage.markOfflineVerified(electionId)
        }
    }

    /**
     * Retrieves the recorded cast receipt from Keystore.
     */
    fun getReceipt(electionId: String): CastReceipt? {
        if (electionId.isBlank()) return null
        return encryptedStorage.getReceipt(electionId)
    }

    /**
     * Verifies that the recorded cast receipt in Keystore has valid cryptographic formatting.
     */
    fun verifyRecordedCastIntegrity(electionId: String): Boolean {
        val receipt = encryptedStorage.getReceipt(electionId) ?: return false
        return offlineVerificationHelper.verifyReceiptFormat(receipt.receiptHandle, receipt.ballotHash)
    }
}
