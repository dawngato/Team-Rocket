package com.himvote.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HowToVote
import androidx.compose.material.icons.filled.OfflinePin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.BannerStyle
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StyledStatusBanner
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens

/**
 * Voting screen using the supported browser booth and real cached proof verification,
 * with accessible state messaging.
 */
@Composable
fun VotingScreen(
    viewModel: VotingViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToReceipt: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Ballot Submission",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.SurfaceBg)
                .verticalScroll(rememberScrollState())
                .padding(paddingValues)
                .padding(DesignTokens.SpacingLarge),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(DesignTokens.Navy900, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.HowToVote,
                    contentDescription = null,
                    tint = DesignTokens.CardWhite,
                    modifier = Modifier.size(36.dp)
                )
            }

            Text(
                text = "Ballot Submission Booth",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                modifier = Modifier.talkBackHeading()
            )

            if (!state.canCast) {
                StyledStatusBanner(
                    style = BannerStyle.ERROR,
                    title = "Ballot Already Submitted from This Device",
                    message = "A cryptographic receipt is recorded for this election on this device. Multiple ballot submissions from this installation are prohibited. Institutional election rules enforce single submission across devices."
                )

                // Recorded cast card with elevation
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                    colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = DesignTokens.ElevationDefault)
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
                                imageVector = Icons.Default.OfflinePin,
                                contentDescription = null,
                                tint = DesignTokens.Green600,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Cryptographic Receipt Format Check",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Green600
                            )
                        }

                        Text(
                            text = state.offlineVerificationSummary
                                ?: "A valid cryptographic receipt is recorded locally. Verification may be performed once inclusion proof is published.",
                            fontSize = 13.sp,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.85f),
                            lineHeight = 18.sp
                        )

                        state.castSuccessReceipt?.let { rcpt ->
                            Text(
                                text = "Handle: ${rcpt.receiptHandle}",
                                fontSize = 12.sp,
                                fontFamily = FontFamily.Monospace,
                                color = DesignTokens.Navy900
                            )
                        }
                    }
                }

                HimVoteButton(
                    text = "View Cryptographic Receipt",
                    onClick = { onNavigateToReceipt(state.electionId) }
                )
            } else {
                Text(
                    text = "Ballot submission executes in an isolated Chrome Custom Tab session to guarantee secure enclave boundaries. Embedded WebViews are prohibited to preserve complete identity and ballot separation.",
                    fontSize = 14.sp,
                    color = DesignTokens.TextPrimary,
                    lineHeight = 20.sp
                )

                StyledStatusBanner(
                    style = BannerStyle.INFO,
                    title = "Cryptographic Return Protocol",
                    message = "Upon ballot submission, the voting booth returns a cryptographic receipt handle via an authenticated App Link. The application verifies receipt structure before recording the submission flag."
                )

                // Offline proof verification card. Only the actual cached proof result
                // is shown; no client-side animation is treated as cryptographic evidence.
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                    colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = DesignTokens.ElevationDefault)
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
                                imageVector = Icons.Default.OfflinePin,
                                contentDescription = null,
                                tint = DesignTokens.Teal600,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Offline Verification Engine",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Navy900
                            )
                        }

                        Text(
                            text = "A cached cryptographic Merkle inclusion proof can be independently verified offline by recomputing tree hashes from the ballot receipt leaf to the certified root.",
                            fontSize = 13.sp,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.8f),
                            lineHeight = 18.sp
                        )

                        if (state.isOfflineVerified && state.offlineVerificationSummary != null) {
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
                                    text = state.offlineVerificationSummary!!,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DesignTokens.Green600
                                )
                            }
                        }

                        TextButton(
                            onClick = { viewModel.runOfflineVerification() },
                            modifier = Modifier.align(Alignment.Start)
                        ) {
                            Text(
                                text = "Run Offline Cryptographic Verification Check",
                                color = DesignTokens.Teal600,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                    colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = DesignTokens.ElevationDefault)
                ) {
                    Column(
                        modifier = Modifier.padding(DesignTokens.SpacingMedium),
                        verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
                    ) {
                        Text(
                            text = "Single Ballot Submission Policy",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.Navy900
                        )
                        Text(
                            text = "Upon verified ballot submission, the application permanently records the cryptographic receipt in hardware-backed storage to prevent re-submission from this device.",
                            fontSize = 13.sp,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.8f),
                            lineHeight = 18.sp
                        )
                    }
                }

                if (state.errorMessage != null) {
                    StyledStatusBanner(
                        style = BannerStyle.ERROR,
                        title = "Notice",
                        message = state.errorMessage!!
                    )
                }

                HimVoteButton(
                    text = "Open Ballot Submission Booth",
                    onClick = { viewModel.launchCustomTabsBooth(context) },
                    contentDesc = "Open secure isolated ballot submission booth"
                )

            }
        }
    }
}
