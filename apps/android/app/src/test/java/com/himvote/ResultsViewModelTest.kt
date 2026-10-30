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

@OptIn(ExperimentalCoroutinesApi::class)
class ResultsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var resultsViewModel: ResultsViewModel
    private val electionId = "elec_results_test_01"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
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
        assertEquals(ElectionStatus.AUDIT_PASSED, state.results?.status)
        assertTrue("Turnout percentage should be greater than 0", (state.results?.turnoutPercentage ?: 0.0) > 0)
        assertFalse("Privacy limited should be false for default high turnout fallback", state.results?.privacyLimited ?: true)
        assertTrue("Tallies should not be empty when not privacy limited", state.results?.tallies?.isNotEmpty() ?: false)
    }
}
