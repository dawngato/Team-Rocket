package com.himvote

import android.content.Context
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.VotingRepository
import com.himvote.data.storage.EncryptedStorage
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

class VotingRepositoryPrivacyTest {
    private lateinit var repository: VotingRepository

    @Before
    fun setup() {
        val context = Mockito.mock(Context::class.java)
        repository = VotingRepository(
            apiService = Mockito.mock(HimVoteApiService::class.java),
            encryptedStorage = EncryptedStorage(
                context,
                customPrefs = InMemorySharedPreferences()
            )
        )
    }

    @Test
    fun boothHandoffDoesNotCarryCandidateSelection() {
        val url = repository.buildBoothHandoffUrl(
            electionId = "election_2026",
            credentialToken = "opaque credential with spaces"
        )

        assertFalse(url.contains("selected_candidate"))
        assertFalse(url.contains("candidate_id"))
        assertTrue(url.contains("election_id=election_2026"))
        assertTrue(url.contains("return_url="))
        assertFalse(url.contains("credential=opaque credential with spaces"))
    }
}
