package com.himvote.data.models

import com.google.gson.annotations.SerializedName

data class CastBallotRequest(
    @SerializedName("election_id") val electionId: String,
    @SerializedName("credential_proof_b64url") val credentialProofB64Url: String,
    @SerializedName("engine_ballot_b64url") val engineBallotB64Url: String,
    @SerializedName("engine_proofs_b64url") val engineProofsB64Url: String,
    @SerializedName("idempotency_key") val idempotencyKey: String
)

data class CastBallotResponse(
    val status: String,
    @SerializedName("handle") val receiptHandle: String,
    @SerializedName("leaf_index") val leafIndex: Long,
    @SerializedName("nullifier_commitment") val nullifierCommitment: String
)

data class ReceiptStatusResponse(
    val status: String,
    @SerializedName("handle") val receiptHandle: String,
    @SerializedName("leaf_index") val leafIndex: Long,
    @SerializedName("leaf_hash") val ballotHash: String? = null,
    @SerializedName("merkle_proof") val inclusionProof: List<String>? = null,
    @SerializedName("merkle_root") val rootHash: String? = null,
    @SerializedName("witnessed_at_utc") val witnessedAtUtc: String? = null,
    @SerializedName("tree_size") val treeSize: Long? = null
)

data class CastReceipt(
    val electionId: String,
    val receiptHandle: String,
    val ballotHash: String,
    val castTimestamp: String,
    val verified: Boolean = false
)

data class InclusionProof(
    val receiptHandle: String,
    val ballotHash: String,
    val leafIndex: Long,
    val pathHashes: List<String>,
    val rootHash: String,
    val verified: Boolean
)
