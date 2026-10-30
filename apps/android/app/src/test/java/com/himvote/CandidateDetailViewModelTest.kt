package com.himvote

import androidx.lifecycle.SavedStateHandle
import com.himvote.data.models.ElectionStatus
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.ElectionRepository
import com.himvote.data.storage.EncryptedStorage
import com.himvote.ui.screens.CandidateDetailViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import retrofit2.Response
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

@OptIn(ExperimentalCoroutinesApi::class)
class CandidateDetailViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var encryptedStorage: EncryptedStorage
    private lateinit var electionRepository: ElectionRepository
    private lateinit var candidateDetailViewModel: CandidateDetailViewModel
    private val electionId = "elec_student_council_2026"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val mockContext = Mockito.mock(android.content.Context::class.java)
        encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
        kotlinx.coroutines.runBlocking {
            Mockito.doReturn(Response.success(com.himvote.data.models.Election(
                id = electionId,
                title = "Synthetic election"
            ))).`when`(mockApiService).getElectionDetail(electionId)
            Mockito.doReturn(Response.success(listOf(
                com.himvote.data.models.Candidate(id = "cand_01", name = "Candidate One")
            ))).`when`(mockApiService).getCandidates(electionId)
        }
        electionRepository = ElectionRepository(mockApiService, encryptedStorage)

        val savedStateHandle = SavedStateHandle(mapOf("electionId" to electionId))
        candidateDetailViewModel = CandidateDetailViewModel(
            savedStateHandle = savedStateHandle,
            electionRepository = electionRepository,
            encryptedStorage = encryptedStorage
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testCandidateDataLoaded() = runTest(testDispatcher) {
        advanceUntilIdle()

        val state = candidateDetailViewModel.uiState.value
        assertFalse(state.isLoading)
        assertNotNull("Election details should be populated", state.election)
        assertEquals(electionId, state.election?.id)
        assertTrue("Candidates should be loaded", state.candidates.isNotEmpty())
    }

    @Test
    fun testSelectCandidate() = runTest(testDispatcher) {
        advanceUntilIdle()

        val candidateId = "cand_01"
        candidateDetailViewModel.selectCandidate(candidateId)

        val state = candidateDetailViewModel.uiState.value
        assertEquals(candidateId, state.selectedCandidateId)
    }
}
