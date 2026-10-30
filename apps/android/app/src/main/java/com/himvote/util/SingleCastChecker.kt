package com.himvote.util

import com.himvote.data.storage.EncryptedStorage
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Enforces Section 9.1 Gate E1 requirement:
 * Single cast check preventing revoting or duplicate ballot submissions.
 * Maintains encrypted local state backed by Android Keystore.
 */
@Singleton
class SingleCastChecker @Inject constructor(
    private val encryptedStorage: EncryptedStorage
) {
    /**
     * Asserts whether a ballot can be cast for the given election ID.
     * Returns true only if no prior ballot has been recorded for this election.
     */
    fun canCast(electionId: String): Boolean {
        return !encryptedStorage.hasCastBallot(electionId)
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
        // If already cast, duplicate submission is invalid
        if (encryptedStorage.hasCastBallot(electionId)) {
            return false
        }
        return true
    }

    /**
     * Commits the ballot cast receipt to Keystore and locks revoting permanently.
     */
    fun recordCast(electionId: String, receiptHandle: String, ballotHash: String) {
        encryptedStorage.markBallotCast(
            electionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash
        )
    }
}
