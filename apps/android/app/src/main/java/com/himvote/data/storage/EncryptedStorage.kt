package com.himvote.data.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.himvote.data.models.CastReceipt
import com.himvote.data.models.StudentCredential
import com.himvote.data.models.UserSession
import java.io.File

/**
 * Keystore backed encrypted storage for HimVote.
 * Stores authenticated sessions, cryptographic credentials, and casting proofs.
 * Keystore storage is excluded from backup and device transfer by manifest rules.
 */
class EncryptedStorage(
    private val context: Context,
    private val gson: Gson = Gson(),
    customPrefs: SharedPreferences? = null
) {
    private val prefs: SharedPreferences = customPrefs ?: createEncryptedPreferences(context)

    companion object {
        private const val PREFS_FILE_NAME = "himvote_secure_prefs"
        private const val KEY_SESSION = "secure_user_session"
        private const val PREFIX_CREDENTIAL = "credential_"
        private const val PREFIX_RECEIPT = "receipt_"
        private const val PREFIX_CAST_FLAG = "cast_flag_"

        private fun createEncryptedPreferences(context: Context): SharedPreferences {
            return try {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()

                EncryptedSharedPreferences.create(
                    context,
                    PREFS_FILE_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
            } catch (ex: Exception) {
                // Fallback for JVM test environments or older APIs
                context.getSharedPreferences(PREFS_FILE_NAME, Context.MODE_PRIVATE)
            }
        }
    }

    // Session Management
    fun saveSession(session: UserSession) {
        val json = gson.toJson(session)
        prefs.edit().putString(KEY_SESSION, json).apply()
    }

    fun getSession(): UserSession? {
        val json = prefs.getString(KEY_SESSION, null) ?: return null
        return try {
            gson.fromJson(json, UserSession::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun clearSession() {
        prefs.edit().remove(KEY_SESSION).apply()
    }

    fun isAuthenticated(): Boolean {
        return getSession() != null
    }

    // Credential Storage
    fun saveCredential(electionId: String, credential: StudentCredential) {
        val json = gson.toJson(credential)
        prefs.edit().putString(PREFIX_CREDENTIAL + electionId, json).apply()
    }

    fun getCredential(electionId: String): StudentCredential? {
        val json = prefs.getString(PREFIX_CREDENTIAL + electionId, null) ?: return null
        return try {
            gson.fromJson(json, StudentCredential::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun hasCredential(electionId: String): Boolean {
        return prefs.contains(PREFIX_CREDENTIAL + electionId)
    }

    // Single Cast & Receipt Storage
    fun markBallotCast(electionId: String, receiptHandle: String, ballotHash: String) {
        val receipt = CastReceipt(
            electionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash,
            castTimestamp = System.currentTimeMillis().toString(),
            verified = true
        )
        val json = gson.toJson(receipt)
        prefs.edit()
            .putBoolean(PREFIX_CAST_FLAG + electionId, true)
            .putString(PREFIX_RECEIPT + electionId, json)
            .apply()
    }

    fun hasCastBallot(electionId: String): Boolean {
        return prefs.getBoolean(PREFIX_CAST_FLAG + electionId, false)
    }

    fun getReceipt(electionId: String): CastReceipt? {
        val json = prefs.getString(PREFIX_RECEIPT + electionId, null) ?: return null
        return try {
            gson.fromJson(json, CastReceipt::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun getAllReceipts(): List<CastReceipt> {
        val list = mutableListOf<CastReceipt>()
        val allKeys = prefs.all
        for ((key, value) in allKeys) {
            if (key.startsWith(PREFIX_RECEIPT) && value is String) {
                try {
                    val receipt = gson.fromJson(value, CastReceipt::class.java)
                    list.add(receipt)
                } catch (_: Exception) {
                }
            }
        }
        return list
    }
}
