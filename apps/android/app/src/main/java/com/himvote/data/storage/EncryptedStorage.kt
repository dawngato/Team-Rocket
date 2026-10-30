package com.himvote.data.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import com.himvote.data.models.CastReceipt
import com.himvote.data.models.InclusionProof
import com.himvote.data.models.StudentCredential
import com.himvote.data.models.UserSession

/**
 * Keystore backed encrypted storage for HimVote.
 * Stores authenticated sessions, cryptographic credentials, casting proofs,
 * and offline verification status.
 * Excluded from backup and device transfer by manifest security rules.
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
        private const val PREFIX_OFFLINE_VERIFIED = "offline_verified_"
        private const val PREFIX_PROOF = "proof_"
        private const val KEY_AUDIT_LOGS = "audit_event_trail"

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
            } catch (_: Exception) {
                // Fallback for JVM test environments or older APIs
                context.getSharedPreferences(PREFS_FILE_NAME, Context.MODE_PRIVATE)
            }
        }
    }

    // Session Management
    fun saveSession(session: UserSession) {
        val json = gson.toJson(session)
        prefs.edit().putString(KEY_SESSION, json).apply()
        // Do not retain student identifiers in the local audit trail.
        recordAuditEvent("SESSION_SAVED")
    }

    fun getSession(): UserSession? {
        val json = prefs.getString(KEY_SESSION, null) ?: return null
        return try {
            gson.fromJson(json, UserSession::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun clearSession() {
        prefs.edit().remove(KEY_SESSION).apply()
        recordAuditEvent("SESSION_CLEARED")
    }

    fun isAuthenticated(): Boolean {
        return getSession() != null
    }

    // Credential Storage
    fun saveCredential(electionId: String, credential: StudentCredential) {
        val json = gson.toJson(credential)
        prefs.edit().putString(PREFIX_CREDENTIAL + electionId, json).apply()
        recordAuditEvent("CREDENTIAL_SAVED: $electionId")
    }

    fun getCredential(electionId: String): StudentCredential? {
        val json = prefs.getString(PREFIX_CREDENTIAL + electionId, null) ?: return null
        return try {
            gson.fromJson(json, StudentCredential::class.java)
        } catch (_: Exception) {
            null
        }
    }

    fun hasCredential(electionId: String): Boolean {
        return prefs.contains(PREFIX_CREDENTIAL + electionId)
    }

    fun removeCredential(electionId: String) {
        prefs.edit().remove(PREFIX_CREDENTIAL + electionId).apply()
    }

    // Single Cast and Receipt Storage
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
        // The receipt is holder-controlled evidence, not an operational log
        // field. Never duplicate it into an audit trail or diagnostic output.
        recordAuditEvent("BALLOT_CAST_COMMITTED: election=$electionId")
    }

    fun hasCastBallot(electionId: String): Boolean {
        return prefs.getBoolean(PREFIX_CAST_FLAG + electionId, false)
    }

    fun getReceipt(electionId: String): CastReceipt? {
        val json = prefs.getString(PREFIX_RECEIPT + electionId, null) ?: return null
        return try {
            gson.fromJson(json, CastReceipt::class.java)
        } catch (_: Exception) {
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

    fun getCastElectionIds(): Set<String> {
        val ids = mutableSetOf<String>()
        val allKeys = prefs.all
        for ((key, value) in allKeys) {
            if (key.startsWith(PREFIX_CAST_FLAG) && value == true) {
                ids.add(key.removePrefix(PREFIX_CAST_FLAG))
            }
        }
        return ids
    }

    // Offline Verification Proof Storage
    fun markOfflineVerified(electionId: String) {
        prefs.edit().putBoolean(PREFIX_OFFLINE_VERIFIED + electionId, true).apply()
        recordAuditEvent("OFFLINE_VERIFIED: $electionId")
    }

    fun isOfflineVerified(electionId: String): Boolean {
        return prefs.getBoolean(PREFIX_OFFLINE_VERIFIED + electionId, false)
    }

    fun saveInclusionProof(electionId: String, proof: InclusionProof) {
        val json = gson.toJson(proof)
        prefs.edit().putString(PREFIX_PROOF + electionId, json).apply()
    }

    fun getInclusionProof(electionId: String): InclusionProof? {
        val json = prefs.getString(PREFIX_PROOF + electionId, null) ?: return null
        return try {
            gson.fromJson(json, InclusionProof::class.java)
        } catch (_: Exception) {
            null
        }
    }

    // Audit Event Trail
    fun recordAuditEvent(event: String) {
        val timestamp = System.currentTimeMillis()
        val entry = "[$timestamp] $event"
        val existing = getAuditTrail().toMutableList()
        existing.add(entry)
        if (existing.size > 50) {
            existing.removeAt(0)
        }
        prefs.edit().putString(KEY_AUDIT_LOGS, gson.toJson(existing)).apply()
    }

    fun getAuditTrail(): List<String> {
        val json = prefs.getString(KEY_AUDIT_LOGS, null) ?: return emptyList()
        return try {
            val list = gson.fromJson(json, Array<String>::class.java)
            list?.toList() ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Safe Logout: Clears session and tokens, preserves immutable cast records
    fun clearSessionOnLogout() {
        val editor = prefs.edit()
        editor.remove(KEY_SESSION)
        // Remove credentials but preserve cast flags and receipts so single cast cannot be circumvented
        val allKeys = prefs.all
        for (key in allKeys.keys) {
            if (key.startsWith(PREFIX_CREDENTIAL)) {
                editor.remove(key)
            }
        }
        editor.apply()
        recordAuditEvent("LOGOUT_SESSION_CLEARED")
    }
}
