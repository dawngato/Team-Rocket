package com.himvote.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Key
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.BannerStyle
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.ui.components.StyledStatusBanner
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens

/**
 * Blind credential issuance screen backed by the identity issuer,
 * elevation transitions, and accessible font scale reflow.
 */
@Composable
fun CredentialScreen(
    viewModel: CredentialViewModel,
    onNavigateBack: () -> Unit,
    onProceedToVoting: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Voting Credential Issuance",
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
                    .background(DesignTokens.Teal600, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Key,
                    contentDescription = null,
                    tint = DesignTokens.CardWhite,
                    modifier = Modifier.size(36.dp)
                )
            }

            Text(
                text = "Voting Credential Issuance",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                modifier = Modifier.talkBackHeading()
            )

            Text(
                text = "This client facilitates cryptographic voting credential issuance. Cryptographic blinding protocols ensure complete identity and ballot separation prior to ballot submission.",
                fontSize = 14.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = 20.sp
            )

            StyledStatusBanner(
                style = BannerStyle.INFO,
                title = "Identity and Ballot Separation",
                message = "Separating credential issuance from ballot submission ensures identity and ballot separation, mitigating timing correlation risks."
            )

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .microPressScale(interactionSource),
                shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                elevation = CardDefaults.cardElevation(defaultElevation = elevation)
            ) {
                Column(
                    modifier = Modifier.padding(DesignTokens.SpacingMedium),
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
                ) {
                    Text(
                        text = "Hardware Keystore Storage",
                        fontSize = if (isLargeFont) 17.sp else 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = DesignTokens.Navy900
                    )

                    Text(
                        text = "Credentials are stored in encrypted preferences protected by an Android Keystore hardware master key. Cloud backup and device migration are permanently disabled.",
                        fontSize = 13.sp,
                        color = DesignTokens.TextPrimary.copy(alpha = 0.8f),
                        lineHeight = 18.sp
                    )

                    if (state.isIssued && state.credential != null) {
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = DesignTokens.SurfaceBg
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = DesignTokens.Green600,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Credential Stored on This Device",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Green600
                            )
                        }

                        Text(
                            text = "Token Signature Fingerprint:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                        )
                        Text(
                            text = state.credential!!.signature.take(24) + "...",
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            color = DesignTokens.Navy900
                        )
                    }
                }
            }

            if (!state.isIssued) {
                HimVoteButton(
                    text = "Request Credential",
                    onClick = { viewModel.requestCredential() },
                    isLoading = state.isLoading,
                    contentDesc = "Request voting credential"
                )
            } else {
                StyledStatusBanner(
                    style = BannerStyle.INFO,
                    title = "Cryptographic Credential Active",
                    message = "An authenticated credential is stored for this election. The election service verifies credential signatures during ballot submission while preserving identity and ballot separation."
                )

                HimVoteButton(
                    text = "Proceed to Ballot Submission",
                    onClick = { onProceedToVoting(state.electionId) },
                    contentDesc = "Proceed to ballot submission with cryptographic credential"
                )
            }
        }
    }
}
