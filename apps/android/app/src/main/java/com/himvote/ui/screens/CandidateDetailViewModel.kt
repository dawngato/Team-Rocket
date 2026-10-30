package com.himvote.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.himvote.data.models.Candidate
import com.himvote.data.models.Election
import com.himvote.data.repository.ElectionRepository
import com.himvote.data.storage.EncryptedStorage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CandidateDetailUiState(
    val electionId: String = "",
    val election: Election? = null,
    val candidates: List<Candidate> = emptyList(),
    val selectedCandidateId: String? = null,
    val hasVoted: Boolean = false,
    val hasCredential: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class CandidateDetailViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val electionRepository: ElectionRepository,
    private val encryptedStorage: EncryptedStorage
) : ViewModel() {

    private val electionId: String = checkNotNull(savedStateHandle["electionId"])
    private val _uiState = MutableStateFlow(CandidateDetailUiState(electionId = electionId))
    val uiState: StateFlow<CandidateDetailUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        _uiState.value = _uiState.value.copy(
            isLoading = true,
            hasVoted = encryptedStorage.hasCastBallot(electionId),
            hasCredential = encryptedStorage.hasCredential(electionId)
        )

        viewModelScope.launch {
            val electionResult = electionRepository.getElectionDetail(electionId)
            val candidatesResult = electionRepository.getCandidates(electionId)

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                election = electionResult.getOrNull(),
                candidates = candidatesResult.getOrDefault(emptyList()),
                errorMessage = electionResult.exceptionOrNull()?.message
            )
        }
    }

    fun selectCandidate(candidateId: String) {
        _uiState.value = _uiState.value.copy(selectedCandidateId = candidateId)
    }
}
