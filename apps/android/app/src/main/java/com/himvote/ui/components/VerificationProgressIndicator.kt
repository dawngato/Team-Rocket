package com.himvote.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.*
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.ui.components.MicroInteractions.pulsingWave
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.DesignTokens
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Execution status for an individual verification pipeline step.
 */
enum class VerificationStepState {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    FAILED
}

/**
 * Data model for a cryptographic verification pipeline step.
 */
data class VerificationStep(
    val id: String,
    val title: String,
    val description: String,
    val state: VerificationStepState = VerificationStepState.PENDING,
    val detailInfo: String? = null
)

/**
 * Overall summary status for the multi stage verification workflow.
 */
data class VerificationOverallStatus(
    val isCompleted: Boolean,
    val isSuccess: Boolean,
    val summaryText: String
)

/**
 * Stateful controller managing step by step cryptographic verification progression.
 */
class VerificationProgressEngine(
    initialSteps: List<VerificationStep> = createDefaultSteps()
) {
    private val _steps = MutableStateFlow(initialSteps)
    val steps: StateFlow<List<VerificationStep>> = _steps.asStateFlow()

    private val _currentStepIndex = MutableStateFlow(0)
    val currentStepIndex: StateFlow<Int> = _currentStepIndex.asStateFlow()

    private val _overallStatus = MutableStateFlow(
        VerificationOverallStatus(
            isCompleted = false,
            isSuccess = false,
            summaryText = "Verification ready to begin"
        )
    )
    val overallStatus: StateFlow<VerificationOverallStatus> = _overallStatus.asStateFlow()

    fun startVerification() {
        val currentList = _steps.value.mapIndexed { index, step ->
            if (index == 0) {
                step.copy(state = VerificationStepState.IN_PROGRESS)
            } else {
                step.copy(state = VerificationStepState.PENDING, detailInfo = null)
            }
        }
        _steps.value = currentList
        _currentStepIndex.value = 0
        _overallStatus.value = VerificationOverallStatus(
            isCompleted = false,
            isSuccess = false,
            summaryText = "Cryptographic verification in progress..."
        )
    }

    fun completeStep(stepId: String, detailInfo: String? = null) {
        val currentList = _steps.value.toMutableList()
        val index = currentList.indexOfFirst { it.id == stepId }
        if (index == -1) return

        currentList[index] = currentList[index].copy(
            state = VerificationStepState.COMPLETED,
            detailInfo = detailInfo
        )

        val nextIndex = index + 1
        if (nextIndex < currentList.size) {
            currentList[nextIndex] = currentList[nextIndex].copy(
                state = VerificationStepState.IN_PROGRESS
            )
            _currentStepIndex.value = nextIndex
            _overallStatus.value = VerificationOverallStatus(
                isCompleted = false,
                isSuccess = false,
                summaryText = "Verifying ${currentList[nextIndex].title}..."
            )
        } else {
            _currentStepIndex.value = currentList.size
            _overallStatus.value = VerificationOverallStatus(
                isCompleted = true,
                isSuccess = true,
                summaryText = "All cryptographic verification checks passed successfully"
            )
        }
        _steps.value = currentList
    }

    fun failStep(stepId: String, reason: String) {
        val currentList = _steps.value.toMutableList()
        val index = currentList.indexOfFirst { it.id == stepId }
        if (index == -1) return

        currentList[index] = currentList[index].copy(
            state = VerificationStepState.FAILED,
            detailInfo = reason
        )

        // Mark any remaining steps as pending
        for (i in (index + 1) until currentList.size) {
            currentList[i] = currentList[i].copy(state = VerificationStepState.PENDING)
        }

        _steps.value = currentList
        _overallStatus.value = VerificationOverallStatus(
            isCompleted = true,
            isSuccess = false,
            summaryText = "Verification failed at step: ${currentList[index].title}"
        )
    }

    fun reset() {
        _steps.value = createDefaultSteps()
        _currentStepIndex.value = 0
        _overallStatus.value = VerificationOverallStatus(
            isCompleted = false,
            isSuccess = false,
            summaryText = "Verification ready to begin"
        )
    }

    companion object {
        fun createDefaultSteps(): List<VerificationStep> = listOf(
            VerificationStep(
                id = "keystore_attestation",
                title = "Hardware Keystore Attestation",
                description = "Validate device hardware key integrity and absence of tampering"
            ),
            VerificationStep(
                id = "blind_token",
                title = "Blinded Credential Signature",
                description = "Verify RSA signature against institution public key authority"
            ),
            VerificationStep(
                id = "merkle_path",
                title = "Merkle Inclusion Proof Chain",
                description = "Recompute SHA-256 hash path from ballot receipt leaf to published tree root"
            ),
            VerificationStep(
                id = "witness_attestation",
                title = "Witness Quorum Attestation",
                description = "Validate independent auditor witness hardware signatures"
            )
        )
    }
}

/**
 * Stateful multi stage verification progress component with animated transitions,
 * expandable cryptographic diagnostics, and WCAG compliant TalkBack live updates.
 */
@Composable
fun VerificationProgressIndicator(
    steps: List<VerificationStep>,
    overallStatus: VerificationOverallStatus,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold
    val cornerShape = RoundedCornerShape(DesignTokens.CardCornerRadius)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .microPressScale(interactionSource)
            .border(
                BorderStroke(
                    width = 1.dp,
                    color = if (overallStatus.isCompleted) {
                        if (overallStatus.isSuccess) DesignTokens.Green600.copy(alpha = 0.3f) else DesignTokens.Red600.copy(alpha = 0.3f)
                    } else {
                        DesignTokens.Teal600.copy(alpha = 0.2f)
                    }
                ),
                shape = cornerShape
            )
            .semantics(mergeDescendants = true) {
                liveRegion = LiveRegionMode.Polite
                contentDescription = "Verification workflow: ${overallStatus.summaryText}"
            },
        shape = cornerShape,
        colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.SpacingMedium),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
        ) {
            // Header with status indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Verification Progress",
                    fontSize = if (isLargeFont) 17.sp else 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.Navy900
                )

                if (overallStatus.isCompleted) {
                    val badgeColor = if (overallStatus.isSuccess) DesignTokens.Green600 else DesignTokens.Red600
                    val badgeText = if (overallStatus.isSuccess) "PASSED" else "FAILED"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(DesignTokens.BadgeCornerRadius))
                            .background(badgeColor.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = badgeText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = badgeColor
                        )
                    }
                }
            }

            // Status message
            Text(
                text = overallStatus.summaryText,
                fontSize = 13.sp,
                color = DesignTokens.TextPrimary.copy(alpha = 0.8f),
                lineHeight = 18.sp
            )

            HorizontalDivider(color = DesignTokens.SurfaceBg)

            // Stepped verification items list
            steps.forEachIndexed { index, step ->
                val isLast = index == steps.size - 1
                VerificationStepRow(
                    stepNumber = index + 1,
                    step = step,
                    isLast = isLast,
                    isLargeFont = isLargeFont
                )
            }
        }
    }
}

/**
 * Individual step item with node circle, vertical connection rail, and expandable details.
 */
@Composable
private fun VerificationStepRow(
    stepNumber: Int,
    step: VerificationStep,
    isLast: Boolean,
    isLargeFont: Boolean
) {
    var isExpanded by remember { mutableStateOf(false) }

    val nodeColor by animateColorAsState(
        targetValue = when (step.state) {
            VerificationStepState.PENDING -> DesignTokens.Navy900.copy(alpha = 0.2f)
            VerificationStepState.IN_PROGRESS -> DesignTokens.Teal600
            VerificationStepState.COMPLETED -> DesignTokens.Green600
            VerificationStepState.FAILED -> DesignTokens.Red600
        },
        animationSpec = tween(durationMillis = DesignTokens.AnimationDurationMedium),
        label = "step_node_color"
    )

    val stepSpringScale by animateFloatAsState(
        targetValue = if (step.state == VerificationStepState.COMPLETED) 1.05f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "step_spring_scale"
    )

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
    ) {
        // Vertical step node column with connector line
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(32.dp)
        ) {
            // Node circle
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .graphicsLayer {
                        scaleX = stepSpringScale
                        scaleY = stepSpringScale
                    }
                    .clip(CircleShape)
                    .background(nodeColor),
                contentAlignment = Alignment.Center
            ) {
                when (step.state) {
                    VerificationStepState.PENDING -> {
                        Text(
                            text = "$stepNumber",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.CardWhite
                        )
                    }
                    VerificationStepState.IN_PROGRESS -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = DesignTokens.CardWhite,
                            strokeWidth = 2.dp
                        )
                    }
                    VerificationStepState.COMPLETED -> {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = DesignTokens.CardWhite,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    VerificationStepState.FAILED -> {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            tint = DesignTokens.CardWhite,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Connection line to next step
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(if (step.detailInfo != null && isExpanded) 60.dp else 36.dp)
                        .background(
                            if (step.state == VerificationStepState.COMPLETED) {
                                DesignTokens.Green600.copy(alpha = 0.5f)
                            } else {
                                DesignTokens.Navy900.copy(alpha = 0.12f)
                            }
                        )
                )
            }
        }

        // Step text information and expandable details
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(bottom = if (isLast) 0.dp else DesignTokens.SpacingSmall),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = step.title,
                    fontSize = if (isLargeFont) 15.sp else 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = when (step.state) {
                        VerificationStepState.PENDING -> DesignTokens.TextPrimary.copy(alpha = 0.6f)
                        VerificationStepState.IN_PROGRESS -> DesignTokens.Teal600
                        VerificationStepState.COMPLETED -> DesignTokens.Navy900
                        VerificationStepState.FAILED -> DesignTokens.Red600
                    }
                )

                if (step.detailInfo != null) {
                    IconButton(
                        onClick = { isExpanded = !isExpanded },
                        modifier = Modifier
                            .size(24.dp)
                            .accessibleTouchTarget()
                    ) {
                        Icon(
                            imageVector = if (isExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = if (isExpanded) "Collapse diagnostic details" else "Expand diagnostic details",
                            tint = DesignTokens.Teal600,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            Text(
                text = step.description,
                fontSize = if (isLargeFont) 13.sp else 12.sp,
                color = DesignTokens.TextPrimary.copy(alpha = 0.7f),
                lineHeight = 16.sp
            )

            // Animated expansion of diagnostic details
            AnimatedVisibility(
                visible = isExpanded && step.detailInfo != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp)
                        .clip(RoundedCornerShape(DesignTokens.BadgeCornerRadius))
                        .background(DesignTokens.SurfaceBg)
                        .padding(8.dp)
                ) {
                    Text(
                        text = step.detailInfo ?: "",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = DesignTokens.Navy900,
                        lineHeight = 15.sp
                    )
                }
            }
        }
    }
}
