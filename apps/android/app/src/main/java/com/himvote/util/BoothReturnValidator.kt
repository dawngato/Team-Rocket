package com.himvote.util

import android.net.Uri

data class BoothReturnPayload(
    val electionId: String,
    val receiptHandle: String,
    val ballotHash: String
)

/**
 * Validates the shape and origin of an engine booth return before any receipt
 * lookup or local cast lock is attempted.
 *
 * The Android intent filter is not an authorization boundary by itself: other
 * apps can construct VIEW intents. The casting service remains authoritative,
 * while this validator rejects malformed or foreign deep links early.
 */
object BoothReturnValidator {
    private val electionIdPattern = Regex("^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
    private val receiptHandlePattern = Regex("^[A-Za-z0-9][A-Za-z0-9._~-]{7,255}$")
    private val sha256Pattern = Regex("^[0-9a-fA-F]{64}$")

    fun parse(uri: Uri): BoothReturnPayload? = fromParts(
        scheme = uri.scheme,
        host = uri.host,
        path = uri.path,
        electionId = uri.getQueryParameter("election_id"),
        receiptHandle = uri.getQueryParameter("receipt_handle"),
        ballotHash = uri.getQueryParameter("ballot_hash")
    )

    fun fromParts(
        scheme: String?,
        host: String?,
        path: String?,
        electionId: String?,
        receiptHandle: String?,
        ballotHash: String?
    ): BoothReturnPayload? {
        val validOrigin = (scheme.equals("https", ignoreCase = true) &&
            host.equals("himvote.example.in", ignoreCase = true) &&
            path == "/booth/return") ||
            (scheme.equals("himvote", ignoreCase = true) &&
                host.equals("booth", ignoreCase = true) &&
                path == "/return")

        if (!validOrigin || electionId == null || receiptHandle == null || ballotHash == null) {
            return null
        }
        if (!electionIdPattern.matches(electionId) ||
            !receiptHandlePattern.matches(receiptHandle) ||
            !sha256Pattern.matches(ballotHash)) {
            return null
        }

        return BoothReturnPayload(
            electionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash
        )
    }
}
