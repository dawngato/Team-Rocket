package com.himvote.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.ElectionCard
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StatusBanner
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ElectionsScreen(
    viewModel: ElectionsViewModel,
    onElectionSelected: (String) -> Unit,
    onLogout: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Institutional Elections",
                onLogout = { viewModel.logout(onLogout) }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.SurfaceBg)
                .padding(paddingValues)
        ) {
            // Search field
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.onSearchQueryChanged(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = DesignTokens.SpacingMedium, vertical = DesignTokens.SpacingSmall)
                    .accessibleTouchTarget()
                    .semantics {
                        contentDescription = "Search elections by title or department"
                    },
                placeholder = { Text("Search elections or department...") },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = null,
                        tint = DesignTokens.Teal600
                    )
                },
                trailingIcon = {
                    if (state.searchQuery.isNotEmpty()) {
                        IconButton(
                            onClick = { viewModel.onSearchQueryChanged("") },
                            modifier = Modifier.accessibleTouchTarget()
                        ) {
                            Icon(
                                imageVector = Icons.Default.Clear,
                                contentDescription = "Clear search query",
                                tint = DesignTokens.TextPrimary
                            )
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = DesignTokens.CardWhite,
                    unfocusedContainerColor = DesignTokens.CardWhite,
                    focusedBorderColor = DesignTokens.Teal600,
                    unfocusedBorderColor = DesignTokens.Teal600.copy(alpha = 0.3f)
                )
            )

            // Filter Tabs
            TabRow(
                selectedTabIndex = state.selectedTab.ordinal,
                containerColor = DesignTokens.CardWhite,
                contentColor = DesignTokens.Teal600
            ) {
                Tab(
                    selected = state.selectedTab == ElectionFilterTab.ALL,
                    onClick = { viewModel.selectTab(ElectionFilterTab.ALL) },
                    text = { Text("All", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.accessibleTouchTarget()
                )
                Tab(
                    selected = state.selectedTab == ElectionFilterTab.OPEN_ACTIVE,
                    onClick = { viewModel.selectTab(ElectionFilterTab.OPEN_ACTIVE) },
                    text = { Text("Open for Voting", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.accessibleTouchTarget()
                )
                Tab(
                    selected = state.selectedTab == ElectionFilterTab.COMPLETED,
                    onClick = { viewModel.selectTab(ElectionFilterTab.COMPLETED) },
                    text = { Text("Certified", fontWeight = FontWeight.SemiBold) },
                    modifier = Modifier.accessibleTouchTarget()
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(DesignTokens.SpacingMedium)
            ) {
                if (state.isLoading && state.elections.isEmpty()) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = DesignTokens.Teal600
                    )
                } else if (state.filteredElections.isEmpty()) {
                    Column(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .padding(DesignTokens.SpacingLarge),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                    ) {
                        Text(
                            text = "No elections found matching selected criteria",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.7f)
                        )
                        IconButton(
                            onClick = { viewModel.loadElections() },
                            modifier = Modifier.accessibleTouchTarget()
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Reload election listings",
                                tint = DesignTokens.Teal600
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                    ) {
                        item {
                            Text(
                                text = "Eligible Elections Roster",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Navy900,
                                modifier = Modifier
                                    .talkBackHeading()
                                    .padding(vertical = 4.dp)
                            )
                        }

                        if (state.errorMessage != null) {
                            item {
                                StatusBanner(
                                    title = "Notice",
                                    message = state.errorMessage!!,
                                    tintColor = DesignTokens.Amber600,
                                    backgroundColor = DesignTokens.Amber600.copy(alpha = 0.1f)
                                )
                            }
                        }

                        items(
                            items = state.filteredElections,
                            key = { it.id }
                        ) { election ->
                            ElectionCard(
                                election = election,
                                onClick = { onElectionSelected(election.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}
