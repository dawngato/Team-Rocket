package com.himvote.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.himvote.data.models.ElectionStatus
import com.himvote.data.models.ElectionSummary
import com.himvote.data.repository.AuthRepository
import com.himvote.data.repository.ElectionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ElectionFilterTab {
    ALL,
    OPEN_ACTIVE,
    COMPLETED
}

data class ElectionsUiState(
    val elections: List<ElectionSummary> = emptyList(),
    val filteredElections: List<ElectionSummary> = emptyList(),
    val selectedTab: ElectionFilterTab = ElectionFilterTab.ALL,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class ElectionsViewModel @Inject constructor(
    private val electionRepository: ElectionRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ElectionsUiState())
    val uiState: StateFlow<ElectionsUiState> = _uiState.asStateFlow()

    init {
        loadElections()
    }

    fun loadElections() {
        _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
        viewModelScope.launch {
            val result = electionRepository.getElections()
            result.onSuccess { list ->
                _uiState.value = _uiState.value.copy(
                    elections = list,
                    isLoading = false
                )
                applyFilter(_uiState.value.selectedTab)
            }.onFailure { ex ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = ex.message ?: "Failed to load elections"
                )
            }
        }
    }

    fun selectTab(tab: ElectionFilterTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
        applyFilter(tab)
    }

    private fun applyFilter(tab: ElectionFilterTab) {
        val all = _uiState.value.elections
        val filtered = when (tab) {
            ElectionFilterTab.ALL -> all
            ElectionFilterTab.OPEN_ACTIVE -> all.filter { it.status == ElectionStatus.OPEN }
            ElectionFilterTab.COMPLETED -> all.filter {
                it.status == ElectionStatus.AUDIT_PASSED ||
                it.status == ElectionStatus.AUDITOR_ATTESTED ||
                it.status == ElectionStatus.ANCHOR_FINALIZED
            }
        }
        _uiState.value = _uiState.value.copy(filteredElections = filtered)
    }

    fun logout(onLoggedOut: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onLoggedOut()
        }
    }
}
