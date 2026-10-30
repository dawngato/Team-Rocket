package com.himvote.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.himvote.data.models.InclusionProof
import com.himvote.data.repository.VotingRepository
import com.himvote.util.OfflineVerificationHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InclusionProofUiState(
    val electionId: String = "",
    val receiptHandle: String = "",
    val proof: InclusionProof? = null,
    val isLoading: Boolean = false,
    val isVerifiedLocally: Boolean = false,
    val isOfflineVerified: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class InclusionProofViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val votingRepository: VotingRepository,
    private val offlineVerificationHelper: OfflineVerificationHelper = OfflineVerificationHelper()
) : ViewModel() {

    private val electionId: String = checkNotNull(savedStateHandle["electionId"])
    private val receiptHandle: String = checkNotNull(savedStateHandle["receiptHandle"])

    private val _uiState = MutableStateFlow(
        InclusionProofUiState(electionId = electionId, receiptHandle = receiptHandle)
    )
    val uiState: StateFlow<InclusionProofUiState> = _uiState.asStateFlow()

    init {
        loadAndVerifyProof()
    }

    fun loadAndVerifyProof() {
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val result = votingRepository.verifyInclusionProof(electionId, receiptHandle)
            result.onSuccess { proof ->
                val offlineValid = offlineVerificationHelper.verifyInclusionProofOffline(proof)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    proof = proof,
                    isVerifiedLocally = proof.verified,
                    isOfflineVerified = offlineValid
                )
            }.onFailure { ex ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    proof = null,
                    isVerifiedLocally = false,
                    isOfflineVerified = false,
                    errorMessage = ex.message ?: "An authenticated inclusion proof is unavailable"
                )
            }
        }
    }

    fun recomputeOfflineProof() {
        val currentProof = _uiState.value.proof ?: return
        val isCalculatedRootValid = offlineVerificationHelper.verifyInclusionProofOffline(currentProof)
        _uiState.value = _uiState.value.copy(
            isVerifiedLocally = isCalculatedRootValid,
            isOfflineVerified = isCalculatedRootValid
        )
    }
}
