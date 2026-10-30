package com.himvote.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.himvote.data.models.PublishedResults
import com.himvote.data.repository.ResultsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ResultsUiState(
    val electionId: String = "",
    val results: PublishedResults? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class ResultsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val resultsRepository: ResultsRepository
) : ViewModel() {

    private val electionId: String = checkNotNull(savedStateHandle["electionId"])
    private val _uiState = MutableStateFlow(ResultsUiState(electionId = electionId))
    val uiState: StateFlow<ResultsUiState> = _uiState.asStateFlow()

    init {
        loadResults()
    }

    fun loadResults() {
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val result = resultsRepository.getElectionResults(electionId)
            result.onSuccess { data ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    results = data
                )
            }.onFailure { ex ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = ex.message ?: "Failed to load results"
                )
            }
        }
    }
}
