package com.himvote.ui.screens

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.himvote.data.models.CastReceipt
import com.himvote.data.repository.CredentialRepository
import com.himvote.data.repository.VotingRepository
import com.himvote.util.OfflineVerificationHelper
import com.himvote.util.SingleCastChecker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class VotingUiState(
    val electionId: String = "",
    val canCast: Boolean = true,
    val isLaunchingBooth: Boolean = false,
    val isProcessingReturn: Boolean = false,
    val castSuccessReceipt: CastReceipt? = null,
    val isOfflineVerified: Boolean = false,
    val offlineVerificationSummary: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class VotingViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val votingRepository: VotingRepository,
    private val credentialRepository: CredentialRepository,
    private val singleCastChecker: SingleCastChecker,
    private val offlineVerificationHelper: OfflineVerificationHelper = OfflineVerificationHelper()
) : ViewModel() {

    private val electionId: String = checkNotNull(savedStateHandle["electionId"])
    private val _uiState = MutableStateFlow(VotingUiState(electionId = electionId))
    val uiState: StateFlow<VotingUiState> = _uiState.asStateFlow()

    init {
        checkSingleCastStatus()
    }

    fun checkSingleCastStatus() {
        val canVote = singleCastChecker.canCast(electionId)
        val existingReceipt = votingRepository.getReceipt(electionId)
        val isVerifiedOffline = existingReceipt != null && singleCastChecker.verifyRecordedCastIntegrity(electionId)
        _uiState.value = _uiState.value.copy(
            canCast = canVote,
            castSuccessReceipt = existingReceipt,
            isOfflineVerified = isVerifiedOffline,
            offlineVerificationSummary = if (isVerifiedOffline) {
                "Receipt handle and ballot hash formats are valid. No inclusion proof has been checked."
            } else null
        )
    }

    /**
     * Executes client side offline mathematical proof verification.
     * Operates with zero network connectivity.
     */
    fun runOfflineVerification() {
        viewModelScope.launch {
            try {
                val receipt = _uiState.value.castSuccessReceipt
                    ?: throw IllegalStateException("No cast receipt is available for offline verification")
                val proof = votingRepository.verifyProofOfflineOnly(electionId, receipt.receiptHandle)
                val isValid = offlineVerificationHelper.verifyInclusionProofOffline(proof)
                if (!isValid) throw IllegalStateException("Authenticated inclusion proof did not verify")
                _uiState.value = _uiState.value.copy(
                    isOfflineVerified = true,
                    offlineVerificationSummary = "Cached Merkle inclusion proof matched its supplied root offline"
                )
            } catch (ex: Exception) {
                _uiState.value = _uiState.value.copy(
                    isOfflineVerified = false,
                    errorMessage = ex.message ?: "No authenticated inclusion proof is available offline"
                )
            }
        }
    }

    /**
     * Launches the voting booth in Chrome Custom Tabs.
     * Section 8.5: No WebView voting allowed to safeguard ballot secrecy.
     */
    fun launchCustomTabsBooth(context: Context) {
        if (!_uiState.value.canCast) {
            _uiState.value = _uiState.value.copy(errorMessage = "Ballot already cast. Multiple submissions prohibited.")
            return
        }

        val cred = credentialRepository.getStoredCredential(electionId)
        val token = cred?.token
        if (token.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "An issued credential is required before opening the voting booth"
            )
            return
        }
        val boothUrl = votingRepository.buildBoothHandoffUrl(electionId, token)

        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()

        try {
            customTabsIntent.launchUrl(context, Uri.parse(boothUrl))
            _uiState.value = _uiState.value.copy(isLaunchingBooth = true)
        } catch (_: Exception) {
            _uiState.value = _uiState.value.copy(
                errorMessage = "Browser could not be launched. Please ensure a secure browser is installed."
            )
        }
    }

    /**
     * App Link return handler called when deep link returns from the booth.
     */
    fun handleAppLinkReturn(
        returnElectionId: String,
        receiptHandle: String,
        ballotHash: String,
        onSuccess: (String) -> Unit
    ) {
        _uiState.value = _uiState.value.copy(isProcessingReturn = true, errorMessage = null)
        viewModelScope.launch {
            if (returnElectionId != electionId ||
                !singleCastChecker.validateCastParameters(returnElectionId, receiptHandle, ballotHash)
            ) {
                _uiState.value = _uiState.value.copy(
                    isProcessingReturn = false,
                    errorMessage = "The booth return did not match this election or receipt format"
                )
                return@launch
            }
            val result = votingRepository.handleBoothReturn(
                electionId = returnElectionId,
                receiptHandle = receiptHandle,
                ballotHash = ballotHash
            )

            result.onSuccess { receipt ->
                singleCastChecker.recordCast(
                    electionId = returnElectionId,
                    receiptHandle = receiptHandle,
                    ballotHash = ballotHash,
                    isOfflineVerified = false
                )
                _uiState.value = _uiState.value.copy(
                    isProcessingReturn = false,
                    canCast = false,
                    castSuccessReceipt = receipt,
                    isOfflineVerified = false,
                    offlineVerificationSummary = "Accepted receipt stored locally; witness verification is still pending"
                )
                onSuccess(returnElectionId)
            }.onFailure { ex ->
                _uiState.value = _uiState.value.copy(
                    isProcessingReturn = false,
                    errorMessage = ex.message ?: "Failed to record cast receipt"
                )
            }
        }
    }

}
