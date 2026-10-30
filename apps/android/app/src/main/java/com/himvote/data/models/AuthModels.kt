package com.himvote.data.models

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val email: String,
    val password: String,
    @SerializedName("mfa_token") val mfaToken: String? = null
)

data class UserProfile(
    val id: String,
    val email: String,
    val name: String,
    val department: String? = null,
    val rollNumber: String? = null
)

data class LoginResponse(
    @SerializedName("session_token") val sessionToken: String = "",
    val role: String = "STUDENT",
    @SerializedName("mfa_required") val mfaRequired: Boolean = false,
    @SerializedName("user_id") val userId: String? = null,
    val user: UserProfile? = null,
    @SerializedName("token") val legacyToken: String? = null
) {
    val token: String
        get() = sessionToken.ifBlank { legacyToken.orEmpty() }
}

data class UserSession(
    val token: String,
    val role: String,
    val email: String,
    val name: String,
    val department: String? = null,
    val rollNumber: String? = null
)

data class RecoveryRequest(
    val email: String
)

data class RecoveryResponse(
    val message: String,
    val recoverySent: Boolean
)
