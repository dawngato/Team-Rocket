package com.himvote

import com.himvote.util.BoothReturnValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BoothReturnValidatorTest {
    private val validHash = "a".repeat(64)

    @Test
    fun acceptsOnlyTheVerifiedHttpsReturnOrigin() {
        val payload = BoothReturnValidator.fromParts(
            scheme = "https",
            host = "himvote.example.in",
            path = "/booth/return",
            electionId = "election_2026",
            receiptHandle = "receipt_handle_123",
            ballotHash = validHash
        )

        assertEquals("election_2026", payload?.electionId)
    }

    @Test
    fun rejectsForeignOriginAndMalformedCryptographicFields() {
        assertNull(
            BoothReturnValidator.fromParts(
                scheme = "https",
                host = "attacker.example",
                path = "/booth/return",
                electionId = "election_2026",
                receiptHandle = "receipt_handle_123",
                ballotHash = validHash
            )
        )
        assertNull(
            BoothReturnValidator.fromParts(
                scheme = "https",
                host = "himvote.example.in",
                path = "/booth/return",
                electionId = "election_2026",
                receiptHandle = "receipt_handle_123",
                ballotHash = "not-a-sha256"
            )
        )
    }

    @Test
    fun supportsTheExplicitLocalSchemeWithoutAcceptingArbitraryPaths() {
        val payload = BoothReturnValidator.fromParts(
            scheme = "himvote",
            host = "booth",
            path = "/return",
            electionId = "election_2026",
            receiptHandle = "receipt_handle_123",
            ballotHash = validHash
        )
        assertEquals("receipt_handle_123", payload?.receiptHandle)

        assertNull(
            BoothReturnValidator.fromParts(
                scheme = "himvote",
                host = "booth",
                path = "/unexpected",
                electionId = "election_2026",
                receiptHandle = "receipt_handle_123",
                ballotHash = validHash
            )
        )
    }
}
