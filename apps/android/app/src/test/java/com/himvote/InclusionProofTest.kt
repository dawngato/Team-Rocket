package com.himvote

import org.junit.Assert.*
import org.junit.Test
import java.security.MessageDigest

class InclusionProofTest {

    private fun sha256(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun computeMerkleRoot(leafHash: String, leafIndex: Long, path: List<String>): String {
        var current = leafHash
        var index = leafIndex
        for (sibling in path) {
            current = if (index % 2L == 0L) {
                sha256(current + sibling)
            } else {
                sha256(sibling + current)
            }
            index /= 2L
        }
        return current
    }

    @Test
    fun testValidMerklePathVerifiesRoot() {
        val leaf = sha256("valid_ballot_content_123")
        val sibling0 = sha256("sibling_node_0")
        val sibling1 = sha256("sibling_node_1")
        val path = listOf(sibling0, sibling1)
        val leafIndex = 0L

        val expectedRoot = computeMerkleRoot(leaf, leafIndex, path)

        val recomputedRoot = computeMerkleRoot(leaf, leafIndex, path)
        assertEquals("Valid path must produce identical root", expectedRoot, recomputedRoot)
    }

    @Test
    fun testTamperedBallotByteFailsVerification() {
        val leaf = sha256("valid_ballot_content_123")
        val tamperedLeaf = sha256("valid_ballot_content_124") // 1 byte altered
        val sibling0 = sha256("sibling_node_0")
        val sibling1 = sha256("sibling_node_1")
        val path = listOf(sibling0, sibling1)
        val leafIndex = 0L

        val expectedRoot = computeMerkleRoot(leaf, leafIndex, path)
        val tamperedRoot = computeMerkleRoot(tamperedLeaf, leafIndex, path)

        assertNotEquals("Altering one byte of the ballot must fail root match", expectedRoot, tamperedRoot)
    }
}
