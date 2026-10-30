package com.himvote.data.repository

import com.himvote.data.models.LoginRequest
import com.himvote.data.models.RecoveryRequest
import com.himvote.data.models.UserSession
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.storage.EncryptedStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: HimVoteApiService,
    private val encryptedStorage: EncryptedStorage
) {
    private val _sessionState = MutableStateFlow(encryptedStorage.getSession())
    val sessionState: StateFlow<UserSession?> = _sessionState.asStateFlow()

    suspend fun login(email: String, password: String): Result<UserSession> {
        return try {
            val response = apiService.login(LoginRequest(email = email, password = password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.mfaRequired) {
                    return Result.failure(IllegalStateException("Multi factor authentication is required"))
                }
                val token = body.token.takeIf { it.isNotBlank() }
                    ?: return Result.failure(IllegalStateException("Authentication response did not include a session token"))
                val session = UserSession(
                    token = token,
                    role = body.role,
                    email = body.user?.email ?: email,
                    name = body.user?.name ?: email.substringBefore("@"),
                    department = body.user?.department,
                    rollNumber = body.user?.rollNumber
                )
                encryptedStorage.saveSession(session)
                _sessionState.value = session
                Result.success(session)
            } else {
                Result.failure(Exception("Authentication failed with HTTP code ${response.code()}"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }

    suspend fun logout(): Result<Unit> {
        return try {
            apiService.logout()
            encryptedStorage.clearSession()
            _sessionState.value = null
            Result.success(Unit)
        } catch (_: Exception) {
            encryptedStorage.clearSession()
            _sessionState.value = null
            Result.success(Unit)
        }
    }

    suspend fun recoverAccount(email: String): Result<Boolean> {
        return try {
            val response = apiService.recoverAccount(RecoveryRequest(email = email))
            Result.success(response.isSuccessful)
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }

}
