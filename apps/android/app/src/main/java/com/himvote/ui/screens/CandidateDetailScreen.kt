package com.himvote.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.ElectionStatus
import com.himvote.ui.components.CandidateCard
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StatusBanner
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens
import com.himvote.util.StateBadge

@Composable
fun CandidateDetailScreen(
    viewModel: CandidateDetailViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToCredential: (String) -> Unit,
    onNavigateToVoting: (String) -> Unit,
    onNavigateToReceipt: (String) -> Unit,
    onNavigateToResults: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Candidates & Manifesto",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.SurfaceBg)
                .padding(paddingValues)
        ) {
            if (state.isLoading && state.election == null) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = DesignTokens.Teal600
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(DesignTokens.SpacingMedium),
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                ) {
                    state.election?.let { election ->
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(DesignTokens.SpacingMedium),
                                    verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        StateBadge(status = election.status)

                                        if (state.hasVoted) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.CheckCircle,
                                                    contentDescription = null,
                                                    tint = DesignTokens.Green600,
                                                    modifier = Modifier.size(16.dp)
                                                )
                                                Text(
                                                    text = "Ballot Already Cast",
                                                    color = DesignTokens.Green600,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }

                                    Text(
                                        text = election.title,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Navy900,
                                        modifier = Modifier.talkBackHeading()
                                    )

                                    Text(
                                        text = election.description,
                                        fontSize = 14.sp,
                                        color = DesignTokens.TextPrimary,
                                        lineHeight = 20.sp
                                    )

                                    Text(
                                        text = "Department: ${election.department}",
                                        fontSize = 13.sp,
                                        color = DesignTokens.Teal600,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }

                        // State-based actions
                        item {
                            when {
                                state.hasVoted -> {
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        StatusBanner(
                                            title = "Single Cast Rule Enforced",
                                            message = "You have recorded your vote. Your receipt is securely stored in hardware Keystore.",
                                            icon = Icons.Default.CheckCircle,
                                            tintColor = DesignTokens.Green600,
                                            backgroundColor = DesignTokens.Green600.copy(alpha = 0.1f)
                                        )
                                        HimVoteButton(
                                            text = "View My Cast Receipt",
                                            onClick = { onNavigateToReceipt(state.electionId) }
                                        )
                                    }
                                }
                                election.status == ElectionStatus.OPEN -> {
                                    if (!state.hasCredential) {
                                        HimVoteButton(
                                            text = "Obtain Blind Voting Credential",
                                            onClick = { onNavigateToCredential(state.electionId) },
                                            contentDesc = "Request anonymous blind voting credential"
                                        )
                                    } else {
                                        HimVoteButton(
                                            text = "Proceed to Secure Voting Booth",
                                            onClick = { onNavigateToVoting(state.electionId) },
                                            contentDesc = "Launch secure Chrome Custom Tab voting booth"
                                        )
                                    }
                                }
                                election.status == ElectionStatus.AUDIT_PASSED ||
                                election.status == ElectionStatus.AUDITOR_ATTESTED ||
                                election.status == ElectionStatus.ANCHOR_FINALIZED -> {
                                    HimVoteButton(
                                        text = "View Verified Election Results",
                                        onClick = { onNavigateToResults(state.electionId) }
                                    )
                                }
                                else -> {
                                    StatusBanner(
                                        title = "Voting Window Closed",
                                        message = "This election is currently in ${election.status.label} state. Ballot casting is not open at this time.",
                                        icon = Icons.Default.Info,
                                        tintColor = DesignTokens.Navy900,
                                        backgroundColor = DesignTokens.Navy900.copy(alpha = 0.08f)
                                    )
                                }
                            }
                        }

                        item {
                            Text(
                                text = "Nominated Candidates",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Navy900,
                                modifier = Modifier
                                    .talkBackHeading()
                                    .padding(vertical = 4.dp)
                            )
                        }

                        items(state.candidates, key = { it.id }) { candidate ->
                            CandidateCard(
                                candidate = candidate,
                                isSelected = state.selectedCandidateId == candidate.id,
                                onSelect = if (election.status == ElectionStatus.OPEN && !state.hasVoted) {
                                    { viewModel.selectCandidate(candidate.id) }
                                } else null
                            )
                        }
                    }
                }
            }
        }
    }
}
