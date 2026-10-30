package com.himvote.data.models

import com.google.gson.annotations.SerializedName

data class BlindedIssuanceRequest(
    @SerializedName("election_id") val electionId: String,
    @SerializedName("blinded_request") val blindedRequest: String
)

data class BlindedIssuanceResponse(
    @SerializedName("blind_signature_response") val blindSignatureResponse: String,
    val status: String
)

data class IssuanceStatusResponse(
    @SerializedName("election_id") val electionId: String,
    val status: String,
    @SerializedName("blind_signature_response") val blindSignatureResponse: String? = null,
    val message: String? = null
)

data class StudentCredential(
    val electionId: String,
    val token: String,
    val signature: String,
    val issuedAt: Long = System.currentTimeMillis()
)
