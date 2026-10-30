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
    val errorMessage: String? = null
)

@HiltViewModel
class VotingViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val votingRepository: VotingRepository,
    private val credentialRepository: CredentialRepository,
    private val singleCastChecker: SingleCastChecker
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
        _uiState.value = _uiState.value.copy(
            canCast = canVote,
            castSuccessReceipt = existingReceipt
        )
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
        val token = cred?.token ?: "dev_cred_token_sample"
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
            val result = votingRepository.handleBoothReturn(
                electionId = returnElectionId,
                receiptHandle = receiptHandle,
                ballotHash = ballotHash
            )

            result.onSuccess { receipt ->
                _uiState.value = _uiState.value.copy(
                    isProcessingReturn = false,
                    canCast = false,
                    castSuccessReceipt = receipt
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

    /**
     * Simulates successful booth return for test and emulator environments.
     */
    fun simulateSuccessfulBoothReturn(onSuccess: (String) -> Unit) {
        val simulatedHandle = "rcpt_mock_${System.currentTimeMillis()}"
        val simulatedHash = "bhash_98a76f231e45bc0123d45e6f78a9012bc34de5678"
        handleAppLinkReturn(
            returnElectionId = electionId,
            receiptHandle = simulatedHandle,
            ballotHash = simulatedHash,
            onSuccess = onSuccess
        )
    }
}
