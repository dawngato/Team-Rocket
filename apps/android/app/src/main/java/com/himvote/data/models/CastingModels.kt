package com.himvote.data.models

data class CastBallotRequest(
    val electionId: String,
    val ciphertext: String,
    val proof: String,
    val credentialSignature: String
)

data class CastBallotResponse(
    val receiptHandle: String,
    val ballotHash: String,
    val castTimestamp: String,
    val status: String
)

data class ReceiptStatusResponse(
    val receiptHandle: String,
    val ballotHash: String,
    val status: String,
    val leafIndex: Long,
    val inclusionProof: List<String>,
    val rootHash: String
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
