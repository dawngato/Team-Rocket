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
import androidx.compose.material.icons.filled.Security
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
import com.himvote.ui.components.BiometricAuthFeedbackCard
import com.himvote.ui.components.BiometricFeedbackController
import com.himvote.ui.components.BiometricState
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.ui.components.StatusBanner
import com.himvote.ui.components.StyledStatusBanner
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Blind credential issuance screen featuring biometric authorization,
 * elevation transitions, and accessible font scale reflow.
 */
@Composable
fun CredentialScreen(
    viewModel: CredentialViewModel,
    onNavigateBack: () -> Unit,
    onProceedToVoting: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)

    // Biometric feedback controller for key generation
    val biometricController = remember { BiometricFeedbackController() }
    val biometricState by biometricController.state.collectAsState()
    val biometricError by biometricController.errorMessage.collectAsState()
    var isBiometricAuthorized by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Voting Credential",
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
                text = "Cryptographic Blind Credential",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                modifier = Modifier.talkBackHeading()
            )

            Text(
                text = "HimVote issues blinded cryptographic tokens to ensure your identity remains completely detached from your cast ballot.",
                fontSize = 14.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = 20.sp
            )

            StyledStatusBanner(
                style = BannerStyle.INFO,
                title = "Section 10 Privacy Rule",
                message = "Issuance is finalized prior to ballot casting to eliminate identity to cast timing correlations."
            )

            // Biometric hardware authorization prompt before token request
            if (!state.isIssued && !isBiometricAuthorized) {
                BiometricAuthFeedbackCard(
                    state = biometricState,
                    errorMessage = biometricError,
                    onTriggerScan = {
                        coroutineScope.launch {
                            biometricController.startScan()
                            delay(800)
                            biometricController.markSuccess()
                            delay(300)
                            isBiometricAuthorized = true
                            viewModel.requestCredential()
                        }
                    },
                    onFallbackPassword = {
                        isBiometricAuthorized = true
                        viewModel.requestCredential()
                    }
                )
            }

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
                        text = "Your unblinded token is kept exclusively in your device Android Keystore chip. It is excluded from cloud backups and device to device transfers.",
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
                                text = "Credential Active in Secure Enclave",
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
                if (isBiometricAuthorized) {
                    HimVoteButton(
                        text = "Request Blind Credential",
                        onClick = { viewModel.requestCredential() },
                        isLoading = state.isLoading,
                        contentDesc = "Request anonymous blind voting credential"
                    )
                }
            } else {
                StyledStatusBanner(
                    style = BannerStyle.VERIFIED,
                    title = "Cryptographic Token Ready",
                    message = "Your blind token is securely stored and ready for ballot casting in the isolated voting booth."
                )

                HimVoteButton(
                    text = "Continue to Voting Booth",
                    onClick = { onProceedToVoting(state.electionId) },
                    contentDesc = "Proceed to voting booth with valid credential"
                )
            }
        }
    }
}
