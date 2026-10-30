package com.himvote.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.himvote.data.models.StudentCredential
import com.himvote.data.repository.CredentialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CredentialUiState(
    val electionId: String = "",
    val credential: StudentCredential? = null,
    val isLoading: Boolean = false,
    val isIssued: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class CredentialViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val credentialRepository: CredentialRepository
) : ViewModel() {

    private val electionId: String = checkNotNull(savedStateHandle["electionId"])
    private val _uiState = MutableStateFlow(CredentialUiState(electionId = electionId))
    val uiState: StateFlow<CredentialUiState> = _uiState.asStateFlow()

    init {
        checkExistingCredential()
    }

    private fun checkExistingCredential() {
        val existing = credentialRepository.getStoredCredential(electionId)
        if (existing != null) {
            _uiState.value = _uiState.value.copy(
                credential = existing,
                isIssued = true
            )
        }
    }

    fun requestCredential() {
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val result = credentialRepository.requestCredentialIssuance(electionId)
            result.onSuccess { cred ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isIssued = true,
                    credential = cred
                )
            }.onFailure { ex ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = ex.message ?: "Failed to issue credential"
                )
            }
        }
    }
}
