package com.himvote.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.DesignTokens
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.sin

/**
 * Biometric authentication states for Android Keystore key authorization.
 */
enum class BiometricState {
    IDLE,
    SCANNING,
    SUCCESS,
    ERROR,
    LOCKOUT
}

/**
 * Controller managing biometric feedback state transitions and messaging.
 */
class BiometricFeedbackController {
    private val _state = MutableStateFlow(BiometricState.IDLE)
    val state: StateFlow<BiometricState> = _state.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun startScan() {
        _errorMessage.value = null
        _state.value = BiometricState.SCANNING
    }

    fun markSuccess() {
        _errorMessage.value = null
        _state.value = BiometricState.SUCCESS
    }

    fun markError(message: String) {
        _errorMessage.value = message
        _state.value = BiometricState.ERROR
    }

    fun markLockout(message: String) {
        _errorMessage.value = message
        _state.value = BiometricState.LOCKOUT
    }

    fun reset() {
        _errorMessage.value = null
        _state.value = BiometricState.IDLE
    }
}

/**
 * Visual biometric authentication feedback component with tactile micro interactions,
 * scanning wave ripple, success spring confirmation, error shake, and accessible TalkBack descriptions.
 */
@Composable
fun BiometricAuthFeedbackCard(
    state: BiometricState,
    errorMessage: String? = null,
    onTriggerScan: () -> Unit,
    onFallbackPassword: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    // Animated container border color based on biometric authentication state
    val borderColor by animateColorAsState(
        targetValue = when (state) {
            BiometricState.IDLE -> DesignTokens.Navy900.copy(alpha = 0.15f)
            BiometricState.SCANNING -> DesignTokens.Teal600
            BiometricState.SUCCESS -> DesignTokens.Green600
            BiometricState.ERROR -> DesignTokens.Red600
            BiometricState.LOCKOUT -> DesignTokens.Red600
        },
        animationSpec = tween(durationMillis = DesignTokens.AnimationDurationMedium),
        label = "biometric_border_color"
    )

    // Pulse animation for active scanning state
    val infiniteTransition = rememberInfiniteTransition(label = "biometric_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 0.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_alpha"
    )

    // Error shake animation calculation using smooth sine wave
    var shakeTrigger by remember { mutableStateOf(0) }
    LaunchedEffect(state) {
        if (state == BiometricState.ERROR) {
            shakeTrigger++
        }
    }
    val shakePhase by animateFloatAsState(
        targetValue = if (state == BiometricState.ERROR) 6.0f else 0.0f,
        animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing),
        label = "shake_animation"
    )
    val shakeTranslationX = if (state == BiometricState.ERROR && shakePhase > 0f) {
        (sin(shakePhase * Math.PI) * 10).toFloat()
    } else {
        0.0f
    }

    // Success spring scale animation
    val successScale by animateFloatAsState(
        targetValue = if (state == BiometricState.SUCCESS) 1.1f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "success_spring"
    )

    val cornerShape = RoundedCornerShape(DesignTokens.CardCornerRadius)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .microPressScale(interactionSource)
            .graphicsLayer { translationX = shakeTranslationX }
            .border(BorderStroke(1.5.dp, borderColor), cornerShape)
            .semantics(mergeDescendants = true) {
                liveRegion = LiveRegionMode.Polite
                contentDescription = when (state) {
                    BiometricState.IDLE -> "Biometric hardware authentication ready. Tap to scan fingerprint."
                    BiometricState.SCANNING -> "Biometric scanner active. Verifying secure Keystore credentials."
                    BiometricState.SUCCESS -> "Biometric authentication confirmed. Hardware signature verified."
                    BiometricState.ERROR -> "Biometric scan failed. $errorMessage. Tap to retry."
                    BiometricState.LOCKOUT -> "Biometric sensor locked. Please use university password fallback."
                }
            },
        shape = cornerShape,
        colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.SpacingMedium),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
        ) {
            // Interactive sensor graphic
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        enabled = state != BiometricState.SCANNING && state != BiometricState.SUCCESS,
                        onClick = onTriggerScan
                    ),
                contentAlignment = Alignment.Center
            ) {
                // Outer pulsing wave during scanning
                if (state == BiometricState.SCANNING) {
                    Box(
                        modifier = Modifier
                            .size(76.dp)
                            .graphicsLayer {
                                scaleX = pulseScale
                                scaleY = pulseScale
                                alpha = pulseAlpha
                            }
                            .clip(CircleShape)
                            .background(DesignTokens.Teal600)
                    )
                }

                // Inner core circle
                val innerCircleColor = when (state) {
                    BiometricState.IDLE -> DesignTokens.Navy900.copy(alpha = 0.08f)
                    BiometricState.SCANNING -> DesignTokens.Teal600.copy(alpha = 0.15f)
                    BiometricState.SUCCESS -> DesignTokens.Green600.copy(alpha = 0.15f)
                    BiometricState.ERROR -> DesignTokens.Red600.copy(alpha = 0.12f)
                    BiometricState.LOCKOUT -> DesignTokens.Red600.copy(alpha = 0.12f)
                }

                val iconTint = when (state) {
                    BiometricState.IDLE -> DesignTokens.Navy900
                    BiometricState.SCANNING -> DesignTokens.Teal600
                    BiometricState.SUCCESS -> DesignTokens.Green600
                    BiometricState.ERROR -> DesignTokens.Red600
                    BiometricState.LOCKOUT -> DesignTokens.Red600
                }

                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .graphicsLayer {
                            if (state == BiometricState.SUCCESS) {
                                scaleX = successScale
                                scaleY = successScale
                            }
                        }
                        .clip(CircleShape)
                        .background(innerCircleColor),
                    contentAlignment = Alignment.Center
                ) {
                    when (state) {
                        BiometricState.SUCCESS -> Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(34.dp)
                        )
                        BiometricState.ERROR -> Icon(
                            imageVector = Icons.Default.Error,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(32.dp)
                        )
                        BiometricState.LOCKOUT -> Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(32.dp)
                        )
                        else -> Icon(
                            imageVector = Icons.Default.Fingerprint,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }

            // Status heading and explanation text
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                val headerText = when (state) {
                    BiometricState.IDLE -> "Hardware Keystore Authentication"
                    BiometricState.SCANNING -> "Scanning Biometric Hardware..."
                    BiometricState.SUCCESS -> "Attestation Confirmed"
                    BiometricState.ERROR -> "Biometric Verification Failed"
                    BiometricState.LOCKOUT -> "Biometric Sensor Locked Out"
                }

                val headerColor = when (state) {
                    BiometricState.IDLE -> DesignTokens.Navy900
                    BiometricState.SCANNING -> DesignTokens.Teal600
                    BiometricState.SUCCESS -> DesignTokens.Green600
                    BiometricState.ERROR -> DesignTokens.Red600
                    BiometricState.LOCKOUT -> DesignTokens.Red600
                }

                Text(
                    text = headerText,
                    fontSize = if (isLargeFont) 17.sp else 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = headerColor,
                    textAlign = TextAlign.Center
                )

                val bodyText = when (state) {
                    BiometricState.IDLE -> "Touch sensor or look at screen to authorize cryptographic key access."
                    BiometricState.SCANNING -> "Communicating with Android Keystore secure hardware enclave..."
                    BiometricState.SUCCESS -> "Hardware key unlocked. Cryptographic credential authorized."
                    BiometricState.ERROR -> errorMessage ?: "Biometric identity verification unsuccessful. Please tap to retry."
                    BiometricState.LOCKOUT -> errorMessage ?: "Maximum verification attempts exceeded. Please authenticate using university credentials."
                }

                Text(
                    text = bodyText,
                    fontSize = if (isLargeFont) 14.sp else 13.sp,
                    color = DesignTokens.TextPrimary.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
            }

            // Dynamic action controls
            when (state) {
                BiometricState.IDLE -> {
                    HimVoteButton(
                        text = "Authenticate with Biometrics",
                        onClick = onTriggerScan,
                        contentDesc = "Start biometric scanning prompt"
                    )
                }
                BiometricState.ERROR -> {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
                    ) {
                        HimVoteButton(
                            text = "Retry Biometric Scan",
                            onClick = onTriggerScan,
                            modifier = Modifier.weight(1f),
                            contentDesc = "Retry biometric sensor verification"
                        )
                        if (onFallbackPassword != null) {
                            TextButton(
                                onClick = onFallbackPassword,
                                modifier = Modifier.accessibleTouchTarget()
                            ) {
                                Text(
                                    text = "Password",
                                    color = DesignTokens.Teal600,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
                BiometricState.LOCKOUT -> {
                    if (onFallbackPassword != null) {
                        HimVoteButton(
                            text = "Use University Password Fallback",
                            onClick = onFallbackPassword,
                            contentDesc = "Switch to password authentication"
                        )
                    }
                }
                else -> {
                    // Scanning or Success states do not require auxiliary action buttons
                }
            }
        }
    }
}
