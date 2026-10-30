package com.himvote

import androidx.lifecycle.SavedStateHandle
import com.himvote.data.models.ElectionStatus
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.ResultsRepository
import com.himvote.ui.screens.ResultsViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito
import retrofit2.Response

@OptIn(ExperimentalCoroutinesApi::class)
class ResultsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var resultsViewModel: ResultsViewModel
    private val electionId = "elec_results_test_01"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
        kotlinx.coroutines.runBlocking {
            Mockito.doReturn(Response.success(com.himvote.data.models.PublishedResultsResponse(
                electionId = electionId,
                manifestDigest = "a".repeat(64),
                tally = mapOf("candidate-1" to 3.0, "candidate-2" to 2.0),
                totalBallots = 5,
                publishedAtUtc = "2026-10-31T12:00:00Z",
                privacyLimited = false
            ))).`when`(mockApiService).getElectionResults(electionId)
        }
        val resultsRepository = ResultsRepository(mockApiService)
        val savedStateHandle = SavedStateHandle(mapOf("electionId" to electionId))
        resultsViewModel = ResultsViewModel(savedStateHandle, resultsRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testResultsLoadedSuccessfully() = runTest(testDispatcher) {
        advanceUntilIdle()

        val state = resultsViewModel.uiState.value
        assertFalse(state.isLoading)
        assertNotNull("Results should be populated", state.results)
        assertEquals(electionId, state.results?.electionId)
        assertEquals(ElectionStatus.PUBLISHED, state.results?.status)
        assertEquals(5, state.results?.totalVotesCast)
        assertFalse("Privacy limited should reflect the service response", state.results?.privacyLimited ?: true)
        assertTrue("Tallies should not be empty when not privacy limited", state.results?.tallies?.isNotEmpty() ?: false)
    }
}
