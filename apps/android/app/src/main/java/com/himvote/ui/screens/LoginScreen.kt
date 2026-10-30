package com.himvote.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.BannerStyle
import com.himvote.ui.components.BiometricAuthFeedbackCard
import com.himvote.ui.components.BiometricFeedbackController
import com.himvote.ui.components.BiometricState
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.ui.components.StatusBanner
import com.himvote.ui.components.StyledStatusBanner
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Login screen featuring biometric hardware feedback,
 * tactile micro interactions, elevation transitions, and accessible font scale reflow.
 */
@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLoginSuccess: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val keyboardController = LocalSoftwareKeyboardController.current
    val coroutineScope = rememberCoroutineScope()
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)

    // Biometric feedback controller for quick sign in
    val biometricController = remember { BiometricFeedbackController() }
    val biometricState by biometricController.state.collectAsState()
    val biometricError by biometricController.errorMessage.collectAsState()
    var showBiometricCard by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DesignTokens.SurfaceBg)
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.SpacingLarge),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
    ) {
        Spacer(modifier = Modifier.height(DesignTokens.SpacingLarge))

        Box(
            modifier = Modifier
                .size(72.dp)
                .background(DesignTokens.Navy900, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Shield,
                contentDescription = null,
                tint = DesignTokens.CardWhite,
                modifier = Modifier.size(40.dp)
            )
        }

        Text(
            text = "HimVote",
            fontSize = if (isLargeFont) 30.sp else 28.sp,
            fontWeight = FontWeight.Bold,
            color = DesignTokens.Navy900,
            modifier = Modifier.talkBackHeading()
        )

        Text(
            text = "Institutional Election Platform\nHimachal Pradesh Technical University",
            fontSize = if (isLargeFont) 15.sp else 14.sp,
            color = DesignTokens.TextPrimary.copy(alpha = 0.75f),
            lineHeight = if (isLargeFont) 22.sp else 20.sp,
            modifier = Modifier.semantics {
                contentDescription = "HimVote institutional election platform for Himachal Pradesh Technical University"
            }
        )

        Spacer(modifier = Modifier.height(DesignTokens.SpacingSmall))

        // Biometric quick sign in section
        if (showBiometricCard) {
            BiometricAuthFeedbackCard(
                state = biometricState,
                errorMessage = biometricError,
                onTriggerScan = {
                    coroutineScope.launch {
                        biometricController.startScan()
                        delay(800)
                        biometricController.markSuccess()
                        delay(400)
                        viewModel.populateDemoCredentials()
                        viewModel.login(onLoginSuccess)
                    }
                },
                onFallbackPassword = {
                    showBiometricCard = false
                    biometricController.reset()
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
                verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
            ) {
                Text(
                    text = "Sign In with University ID",
                    fontSize = if (isLargeFont) 19.sp else 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.Navy900
                )

                OutlinedTextField(
                    value = state.email,
                    onValueChange = { viewModel.onEmailChanged(it) },
                    label = { Text("University Email") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = null,
                            tint = DesignTokens.Navy900
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibleTouchTarget()
                        .semantics {
                            contentDescription = "Input university email address"
                        },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )
                )

                OutlinedTextField(
                    value = state.password,
                    onValueChange = { viewModel.onPasswordChanged(it) },
                    label = { Text("Password") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = DesignTokens.Navy900
                        )
                    },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibleTouchTarget()
                        .semantics {
                            contentDescription = "Input account password"
                        },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            keyboardController?.hide()
                            viewModel.login(onLoginSuccess)
                        }
                    )
                )

                if (state.errorMessage != null) {
                    StyledStatusBanner(
                        style = BannerStyle.ERROR,
                        title = "Authentication Notice",
                        message = state.errorMessage!!
                    )
                }

                HimVoteButton(
                    text = "Sign In",
                    onClick = {
                        keyboardController?.hide()
                        viewModel.login(onLoginSuccess)
                    },
                    isLoading = state.isLoading,
                    contentDesc = "Submit credentials and sign in"
                )

                if (!showBiometricCard) {
                    TextButton(
                        onClick = {
                            showBiometricCard = true
                            biometricController.reset()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .accessibleTouchTarget()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Fingerprint,
                                contentDescription = null,
                                tint = DesignTokens.Teal600,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "Sign In with Biometric Passkey",
                                color = DesignTokens.Teal600,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                    }
                }

                HimVoteButton(
                    text = "Use Quick Demo Student Credentials",
                    onClick = { viewModel.populateDemoCredentials() },
                    isSecondary = true,
                    contentDesc = "Fill demo student credentials"
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Text(
            text = "Keystore Backed Hardware Security • Excluded From Backup",
            fontSize = 11.sp,
            color = DesignTokens.TextPrimary.copy(alpha = 0.6f),
            fontWeight = FontWeight.Medium
        )
    }
}
