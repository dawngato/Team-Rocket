package com.himvote.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HowToVote
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StatusBanner
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens

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
                title = "Cast Secret Ballot",
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
                text = "Secure Voting Booth",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                modifier = Modifier.talkBackHeading()
            )

            if (!state.canCast) {
                StatusBanner(
                    title = "Single Cast Enforcement",
                    message = "A ballot has already been submitted and finalized for this election. Revoting is strictly prohibited by platform cryptography.",
                    icon = Icons.Default.Block,
                    tintColor = DesignTokens.Red600,
                    backgroundColor = DesignTokens.Red600.copy(alpha = 0.1f)
                )

                HimVoteButton(
                    text = "View Recorded Cast Receipt",
                    onClick = { onNavigateToReceipt(state.electionId) }
                )
            } else {
                Text(
                    text = "Section 8.5 Security Standard: Ballot encryption and casting take place in an isolated Chrome Custom Tab session. In app WebViews are prohibited to protect ballot privacy.",
                    fontSize = 14.sp,
                    color = DesignTokens.TextPrimary,
                    lineHeight = 20.sp
                )

                StatusBanner(
                    title = "Verified App Link Return",
                    message = "Upon ballot submission, the voting engine returns you automatically to HimVote via an authenticated App Link with your cryptographic receipt.",
                    icon = Icons.Default.Security,
                    tintColor = DesignTokens.Teal600,
                    backgroundColor = DesignTokens.Teal600.copy(alpha = 0.1f)
                )

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
                        Text(
                            text = "Single Cast Policy",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.Navy900
                        )
                        Text(
                            text = "Once you submit your ballot in the booth, the cryptographic nullifier is spent and locked in the Android Keystore. You cannot submit another ballot.",
                            fontSize = 13.sp,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.8f),
                            lineHeight = 18.sp
                        )
                    }
                }

                if (state.errorMessage != null) {
                    StatusBanner(
                        title = "Notice",
                        message = state.errorMessage!!,
                        tintColor = DesignTokens.Red600,
                        backgroundColor = DesignTokens.Red600.copy(alpha = 0.1f)
                    )
                }

                HimVoteButton(
                    text = "Launch Secure Booth in Custom Tab",
                    onClick = { viewModel.launchCustomTabsBooth(context) },
                    contentDesc = "Open external secure voting booth"
                )

                // Emulation button for test / local emulator flow
                HimVoteButton(
                    text = "Complete Local Test Cast (Emulate App Link Return)",
                    onClick = {
                        viewModel.simulateSuccessfulBoothReturn {
                            onNavigateToReceipt(it)
                        }
                    },
                    isSecondary = true,
                    contentDesc = "Simulate successful booth submission and receipt return"
                )
            }
        }
    }
}
