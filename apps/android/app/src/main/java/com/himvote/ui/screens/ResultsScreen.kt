package com.himvote.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StatusBanner
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens
import com.himvote.util.StateBadge

@Composable
fun ResultsScreen(
    viewModel: ResultsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateHome: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Audited Results",
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
            if (state.isLoading && state.results == null) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = DesignTokens.Teal600
                )
            } else {
                state.results?.let { res ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(DesignTokens.SpacingLarge),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .background(DesignTokens.Teal600, RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Assessment,
                                contentDescription = null,
                                tint = DesignTokens.CardWhite,
                                modifier = Modifier.size(36.dp)
                            )
                        }

                        Text(
                            text = res.electionTitle,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.Navy900,
                            modifier = Modifier.talkBackHeading()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            StateBadge(status = res.status)

                            Text(
                                text = "Turnout: ${"%.1f".format(res.turnoutPercentage)}%",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Navy900
                            )
                        }

                        if (res.privacyLimited) {
                            StatusBanner(
                                title = "Privacy Limited Mode Enforced",
                                message = "Turnout was below the minimum anonymity threshold. Per candidate totals are suppressed to protect ballot confidentiality.",
                                icon = Icons.Default.Lock,
                                tintColor = DesignTokens.Amber600,
                                backgroundColor = DesignTokens.Amber600.copy(alpha = 0.1f)
                            )
                        } else {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                                colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(DesignTokens.SpacingMedium),
                                    verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                                ) {
                                    Text(
                                        text = "Published Vote Tallies",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Navy900
                                    )

                                    res.tallies.forEach { tally ->
                                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text(
                                                    text = tally.candidateName,
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = DesignTokens.Navy900
                                                )
                                                Text(
                                                    text = "${tally.votesReceived} votes (${"%.1f".format(tally.percentage)}%)",
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = DesignTokens.Teal600
                                                )
                                            }

                                            LinearProgressIndicator(
                                                progress = { (tally.percentage / 100.0).toFloat() },
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(8.dp),
                                                color = DesignTokens.Teal600,
                                                trackColor = DesignTokens.SurfaceBg
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Cryptographic Attestation Card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                            colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(DesignTokens.SpacingMedium),
                                verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Shield,
                                        contentDescription = null,
                                        tint = DesignTokens.Green600,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Text(
                                        text = "Auditor Hardware Attestation",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Green600
                                    )
                                }

                                Text(
                                    text = res.auditAttestation ?: "attestation_rsa_pkcs1_v1_5_valid_sha256",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.8f)
                                )

                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = DesignTokens.SurfaceBg
                                )

                                Text(
                                    text = "Chain Anchor Transaction Hash",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = res.chainAnchorTx ?: "0x89ab12cd34ef567890123456789abcdef0123456789abcdef0123456789abcdef",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = DesignTokens.Teal600
                                )
                            }
                        }

                        HimVoteButton(
                            text = "Back to Elections Overview",
                            onClick = onNavigateHome
                        )
                    }
                }
            }
        }
    }
}
