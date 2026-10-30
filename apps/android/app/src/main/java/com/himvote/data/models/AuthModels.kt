package com.himvote.data.models

data class LoginRequest(
    val email: String,
    val password: String,
    val otp: String? = null
)

data class UserProfile(
    val id: String,
    val email: String,
    val name: String,
    val department: String? = null,
    val rollNumber: String? = null
)

data class LoginResponse(
    val token: String,
    val role: String,
    val expiresAt: Long,
    val user: UserProfile
)

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
