package com.himvote

import androidx.lifecycle.SavedStateHandle
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.CredentialRepository
import com.himvote.data.repository.VotingRepository
import com.himvote.data.storage.EncryptedStorage
import com.himvote.ui.screens.VotingViewModel
import com.himvote.util.SingleCastChecker
import com.himvote.util.OfflineVerificationHelper
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
class VotingViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var encryptedStorage: EncryptedStorage
    private lateinit var votingRepository: VotingRepository
    private lateinit var credentialRepository: CredentialRepository
    private lateinit var singleCastChecker: SingleCastChecker
    private lateinit var offlineVerificationHelper: OfflineVerificationHelper
    private lateinit var votingViewModel: VotingViewModel

    private val electionId = "elec_test_voting_01"

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val mockContext = Mockito.mock(android.content.Context::class.java)
        encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
        kotlinx.coroutines.runBlocking {
            Mockito.doReturn(Response.success(com.himvote.data.models.ReceiptStatusResponse(
                status = "COMMITTED_PENDING_WITNESS",
                receiptHandle = "rcpt_return_handle_999",
                leafIndex = 0L
            ))).`when`(mockApiService).getReceiptStatus(electionId, "rcpt_return_handle_999")
        }
        votingRepository = VotingRepository(mockApiService, encryptedStorage)
        credentialRepository = CredentialRepository(mockApiService, encryptedStorage)
        offlineVerificationHelper = OfflineVerificationHelper()
        singleCastChecker = SingleCastChecker(encryptedStorage, offlineVerificationHelper)

        val savedStateHandle = SavedStateHandle(mapOf("electionId" to electionId))
        votingViewModel = VotingViewModel(
            savedStateHandle = savedStateHandle,
            votingRepository = votingRepository,
            credentialRepository = credentialRepository,
            singleCastChecker = singleCastChecker
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testInitialUiStateAllowsCasting() {
        val state = votingViewModel.uiState.value
        assertEquals(electionId, state.electionId)
        assertTrue(state.canCast)
        assertNull(state.castSuccessReceipt)
    }

    @Test
    fun testAppLinkReturnRecordsReceiptAndDisablesCasting() = runTest(testDispatcher) {
        val receiptHandle = "rcpt_return_handle_999"
        val ballotHash = offlineVerificationHelper.sha256("return_ballot")

        var returnedElectionId: String? = null
        votingViewModel.handleAppLinkReturn(
            returnElectionId = electionId,
            receiptHandle = receiptHandle,
            ballotHash = ballotHash
        ) { id ->
            returnedElectionId = id
        }

        advanceUntilIdle()

        val state = votingViewModel.uiState.value
        assertFalse("Voter must not be allowed to cast again after app link return", state.canCast)
        assertNotNull("Cast receipt must be saved", state.castSuccessReceipt)
        assertEquals(receiptHandle, state.castSuccessReceipt?.receiptHandle)
        assertEquals(ballotHash, state.castSuccessReceipt?.ballotHash)
        assertEquals(electionId, returnedElectionId)
    }
}
