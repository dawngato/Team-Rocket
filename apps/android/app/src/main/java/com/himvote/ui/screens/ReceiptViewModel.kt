package com.himvote.ui.screens

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import com.himvote.data.models.CastReceipt
import com.himvote.data.repository.VotingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject

data class ReceiptUiState(
    val electionId: String = "",
    val receipt: CastReceipt? = null,
    val isCopied: Boolean = false
)

@HiltViewModel
class ReceiptViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val votingRepository: VotingRepository
) : ViewModel() {

    private val electionId: String = checkNotNull(savedStateHandle["electionId"])
    private val _uiState = MutableStateFlow(ReceiptUiState(electionId = electionId))
    val uiState: StateFlow<ReceiptUiState> = _uiState.asStateFlow()

    init {
        loadReceipt()
    }

    fun loadReceipt() {
        val stored = votingRepository.getReceipt(electionId)
        _uiState.value = _uiState.value.copy(receipt = stored)
    }

    fun markCopied() {
        _uiState.value = _uiState.value.copy(isCopied = true)
    }
}
