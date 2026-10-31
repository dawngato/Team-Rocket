package com.himvote.data.repository

import com.himvote.BuildConfig
import com.himvote.data.models.CastReceipt
import com.himvote.data.models.InclusionProof
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.storage.EncryptedStorage
import com.himvote.util.OfflineVerificationHelper
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VotingRepository @Inject constructor(
    private val apiService: HimVoteApiService,
    private val encryptedStorage: EncryptedStorage,
    private val offlineVerificationHelper: OfflineVerificationHelper = OfflineVerificationHelper()
) {
    companion object {
        val BOOTH_BASE_URL: String get() = BuildConfig.BOOTH_BASE_URL
        val APP_LINK_RETURN_URL: String get() = BuildConfig.APP_LINK_RETURN_URL
    }

    /**
     * Checks if the voter is permitted to cast a ballot.
     * Enforces strict single cast check: If already cast in Keystore, revoting is blocked.
     */
    fun canCastBallot(electionId: String): Boolean {
        return !encryptedStorage.hasCastBallot(electionId)
    }

    /**
     * Constructs the secure browser booth handoff URL.
     * Handoff opens through Chrome Custom Tabs with verified App Link return.
     * WebViews are prohibited to prevent DOM inspection of secret ballots.
     */
    fun buildBoothHandoffUrl(electionId: String, credentialToken: String): String {
        require(electionId.isNotBlank()) { "Election ID cannot be blank" }
        require(credentialToken.isNotBlank()) { "Credential token cannot be blank" }
        require(BOOTH_BASE_URL.startsWith("https://") || BOOTH_BASE_URL.startsWith("http://")) { "A deployed booth URL must be configured" }

        // Candidate selection must be made inside the engine-controlled booth.
        // Putting it in a URL leaks the choice to browser history, referrers,
        // proxy logs, and any intermediary that can observe the handoff.
        fun encode(value: String): String =
            URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

        // Credentials are never placed in navigation URLs. The production
        // booth must exchange this request through a same-origin back channel
        // or a one-time opaque handoff before accepting a ballot.
        check(credentialToken.isNotBlank()) { "Credential is required for a secure back-channel handoff" }
        return "$BOOTH_BASE_URL?election_id=${encode(electionId)}" +
            "&return_url=${encode(APP_LINK_RETURN_URL)}"
    }

    /**
     * Processes verified App Link return from the voting engine booth.
     * Verifies single cast status and permanently commits cast receipt into hardware Keystore.
     */
    suspend fun handleBoothReturn(
        electionId: String,
        receiptHandle: String,
        ballotHash: String
    ): Result<CastReceipt> {
        if (encryptedStorage.hasCastBallot(electionId)) {
            val existing = encryptedStorage.getReceipt(electionId)
            return if (existing != null) {
                Result.success(existing)
            } else {
                Result.failure(IllegalStateException("Ballot has already been cast for this election. Revoting is strictly prohibited."))
            }
        }

        val response = try {
            apiService.getReceiptStatus(electionId, receiptHandle)
        } catch (ex: Exception) {
            return Result.failure(IllegalStateException("Casting service could not authenticate the receipt", ex))
        }
        if (!response.isSuccessful || response.body() == null) {
            return Result.failure(IllegalStateException("Casting service did not authenticate the receipt"))
        }
        val status = response.body()!!.status
        if (status != "COMMITTED_PENDING_WITNESS" && status != "WITNESSED" && status != "ANCHORED") {
            return Result.failure(IllegalStateException("Casting service returned an invalid receipt state"))
        }
        if (response.body()!!.receiptHandle != receiptHandle) {
            return Result.failure(IllegalStateException("Receipt handle does not match the casting service"))
        }

        encryptedStorage.markBallotCast(
            electionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash
        )

        val receipt = CastReceipt(
            electionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash,
            castTimestamp = System.currentTimeMillis().toString(),
            // A deep-link return proves only that the browser handed control
            // back to the app. The casting service must still authenticate
            // the receipt before it can be called witnessed or verified.
            verified = false
        )
        return Result.success(receipt)
    }

    fun getReceipt(electionId: String): CastReceipt? {
        return encryptedStorage.getReceipt(electionId)
    }

    /**
     * Verifies cryptographic Merkle inclusion proof for a cast receipt.
     * Validates leaf hash and path against the published Merkle root.
     */
    suspend fun verifyInclusionProof(electionId: String, receiptHandle: String): Result<InclusionProof> {
        return try {
            val response = apiService.getReceiptStatus(electionId, receiptHandle)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val leafHash = body.ballotHash
                    ?: return Result.failure(IllegalStateException("Receipt is not witnessed and has no authenticated leaf"))
                val path = body.inclusionProof
                    ?: return Result.failure(IllegalStateException("Receipt is not witnessed and has no authenticated proof"))
                val rootHash = body.rootHash
                    ?: return Result.failure(IllegalStateException("Receipt is not witnessed and has no authenticated root"))
                val isCalculatedRootValid = offlineVerificationHelper.verifyMerklePath(
                    leafHash = leafHash,
                    leafIndex = body.leafIndex,
                    path = path,
                    expectedRoot = rootHash
                )
                val proof = InclusionProof(
                    receiptHandle = body.receiptHandle,
                    ballotHash = leafHash,
                    leafIndex = body.leafIndex,
                    pathHashes = path,
                    rootHash = rootHash,
                    verified = isCalculatedRootValid
                )
                encryptedStorage.saveInclusionProof(electionId, proof)
                if (isCalculatedRootValid) Result.success(proof)
                else Result.failure(IllegalStateException("Authenticated inclusion proof did not verify"))
            } else {
                Result.failure(IllegalStateException("Receipt is not yet witnessed"))
            }
        } catch (ex: Exception) {
            Result.failure(IllegalStateException("Authenticated inclusion proof is unavailable", ex))
        }
    }

    /**
     * Performs pure offline proof verification without making any network requests.
     */
    fun verifyProofOfflineOnly(electionId: String, receiptHandle: String): InclusionProof {
        val existingCached = encryptedStorage.getInclusionProof(electionId)
        if (existingCached != null) {
            val verified = offlineVerificationHelper.verifyInclusionProofOffline(existingCached)
            return existingCached.copy(verified = verified)
        }
        throw IllegalStateException(
            "No authenticated inclusion proof is available offline for this receipt"
        )
    }
}
