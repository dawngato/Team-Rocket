package com.himvote

import com.himvote.data.models.ElectionStatus
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.AuthRepository
import com.himvote.data.repository.ElectionRepository
import com.himvote.data.storage.EncryptedStorage
import com.himvote.ui.screens.ElectionFilterTab
import com.himvote.ui.screens.ElectionsViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

@OptIn(ExperimentalCoroutinesApi::class)
class ElectionsViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var electionsViewModel: ElectionsViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val mockContext = Mockito.mock(android.content.Context::class.java)
        val encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
        val electionRepository = ElectionRepository(mockApiService, encryptedStorage)
        val authRepository = AuthRepository(mockApiService, encryptedStorage)
        electionsViewModel = ElectionsViewModel(electionRepository, authRepository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testElectionsLoadedOnLaunch() = runTest(testDispatcher) {
        advanceUntilIdle()

        val state = electionsViewModel.uiState.value
        assertFalse(state.isLoading)
        assertTrue("Elections list should not be empty", state.elections.isNotEmpty())
        assertEquals(state.elections.size, state.filteredElections.size)
    }

    @Test
    fun testFilterByOpenActiveTab() = runTest(testDispatcher) {
        advanceUntilIdle()

        electionsViewModel.selectTab(ElectionFilterTab.OPEN_ACTIVE)
        val state = electionsViewModel.uiState.value

        assertEquals(ElectionFilterTab.OPEN_ACTIVE, state.selectedTab)
        assertTrue(state.filteredElections.all { it.status == ElectionStatus.OPEN })
    }

    @Test
    fun testFilterByCompletedTab() = runTest(testDispatcher) {
        advanceUntilIdle()

        electionsViewModel.selectTab(ElectionFilterTab.COMPLETED)
        val state = electionsViewModel.uiState.value

        assertEquals(ElectionFilterTab.COMPLETED, state.selectedTab)
        assertTrue(state.filteredElections.all {
            it.status == ElectionStatus.AUDIT_PASSED ||
            it.status == ElectionStatus.AUDITOR_ATTESTED ||
            it.status == ElectionStatus.ANCHOR_FINALIZED
        })
    }
}
