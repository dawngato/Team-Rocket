package com.himvote.data.models

data class BlindedIssuanceRequest(
    val electionId: String,
    val blindedToken: String
)

data class BlindedIssuanceResponse(
    val electionId: String,
    val signature: String,
    val status: String
)

data class IssuanceStatusResponse(
    val electionId: String,
    val status: String,
    val signature: String? = null,
    val message: String? = null
)

data class StudentCredential(
    val electionId: String,
    val token: String,
    val signature: String,
    val issuedAt: Long = System.currentTimeMillis()
)
