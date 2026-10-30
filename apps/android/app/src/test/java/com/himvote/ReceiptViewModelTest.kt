package com.himvote

import androidx.lifecycle.SavedStateHandle
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.VotingRepository
import com.himvote.data.storage.EncryptedStorage
import com.himvote.ui.screens.ReceiptViewModel
import com.himvote.util.OfflineVerificationHelper
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito

class ReceiptViewModelTest {

    private lateinit var encryptedStorage: EncryptedStorage
    private lateinit var votingRepository: VotingRepository
    private lateinit var offlineVerificationHelper: OfflineVerificationHelper
    private lateinit var receiptViewModel: ReceiptViewModel
    private val electionId = "elec_receipt_test_01"

    @Before
    fun setup() {
        val mockContext = Mockito.mock(android.content.Context::class.java)
        encryptedStorage = EncryptedStorage(mockContext, customPrefs = InMemorySharedPreferences())
        val mockApiService = Mockito.mock(HimVoteApiService::class.java)
        offlineVerificationHelper = OfflineVerificationHelper()
        votingRepository = VotingRepository(mockApiService, encryptedStorage, offlineVerificationHelper)

        encryptedStorage.markBallotCast(
            electionId = electionId,
            receiptHandle = "rcpt_test_handle_valid_999",
            ballotHash = offlineVerificationHelper.sha256("test_ballot_content_123")
        )

        val savedStateHandle = SavedStateHandle(mapOf("electionId" to electionId))
        receiptViewModel = ReceiptViewModel(
            savedStateHandle = savedStateHandle,
            votingRepository = votingRepository,
            offlineVerificationHelper = offlineVerificationHelper
        )
    }

    @Test
    fun testReceiptLoadedAndOfflineVerified() {
        val state = receiptViewModel.uiState.value
        assertNotNull("Receipt should be retrieved from storage", state.receipt)
        assertEquals("rcpt_test_handle_valid_999", state.receipt?.receiptHandle)
        assertTrue("Receipt should be marked offline verified", state.isOfflineVerified)
    }

    @Test
    fun testMarkCopied() {
        assertFalse(receiptViewModel.uiState.value.isCopied)
        receiptViewModel.markCopied()
        assertTrue(receiptViewModel.uiState.value.isCopied)
    }
}
