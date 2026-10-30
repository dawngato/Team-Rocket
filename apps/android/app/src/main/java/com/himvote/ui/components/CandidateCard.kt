package com.himvote.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.Candidate
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.DesignTokens

/**
 * Candidate profile card with animated selection state, dynamic elevation transitions,
 * tactile micro interactions, and accessible layout reflow.
 */
@Composable
fun CandidateCard(
    candidate: Candidate,
    isSelected: Boolean = false,
    onSelect: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val defaultElevation = if (isSelected) DesignTokens.ElevationHovered else DesignTokens.ElevationDefault
    val elevation by animateCardElevation(
        interactionSource = interactionSource,
        defaultElevation = defaultElevation,
        pressedElevation = DesignTokens.ElevationPressed
    )

    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    // Animated container background color on selection
    val backgroundColor by animateColorAsState(
        targetValue = if (isSelected) DesignTokens.Teal600.copy(alpha = 0.09f) else DesignTokens.CardWhite,
        animationSpec = tween(durationMillis = DesignTokens.AnimationDurationMedium),
        label = "candidate_bg_color"
    )

    // Animated border stroke
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) DesignTokens.Teal600 else DesignTokens.Navy900.copy(alpha = 0.1f),
        animationSpec = tween(durationMillis = DesignTokens.AnimationDurationMedium),
        label = "candidate_border_color"
    )

    // Avatar scale bounce on selection
    val avatarScale by animateFloatAsState(
        targetValue = if (isSelected) 1.08f else 1.0f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        ),
        label = "candidate_avatar_scale"
    )

    val cornerShape = RoundedCornerShape(DesignTokens.CardCornerRadius)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .accessibleTouchTarget()
            .microPressScale(interactionSource)
            .border(
                BorderStroke(if (isSelected) 2.dp else 1.dp, borderColor),
                cornerShape
            )
            .semantics(mergeDescendants = true) {
                contentDescription = "Candidate: ${candidate.name}, Department: ${candidate.department}, Roll Number: ${candidate.rollNumber}, Selected: $isSelected"
            },
        shape = cornerShape,
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Column(
            modifier = Modifier.padding(DesignTokens.SpacingMedium),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
            ) {
                Box(
                    modifier = Modifier
                        .size(if (isLargeFont) 54.dp else 48.dp)
                        .graphicsLayer {
                            scaleX = avatarScale
                            scaleY = avatarScale
                        }
                        .clip(CircleShape)
                        .background(DesignTokens.Teal600.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = DesignTokens.Teal600,
                        modifier = Modifier.size(if (isLargeFont) 32.dp else 28.dp)
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = candidate.name,
                        fontSize = if (isLargeFont) 18.sp else 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = DesignTokens.Navy900
                    )
                    Text(
                        text = "${candidate.rollNumber} • ${candidate.department}",
                        fontSize = if (isLargeFont) 14.sp else 13.sp,
                        color = DesignTokens.TextPrimary.copy(alpha = 0.7f)
                    )
                }
            }

            Text(
                text = candidate.manifesto,
                fontSize = if (isLargeFont) 15.sp else 14.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = if (isLargeFont) 22.sp else 20.sp,
                modifier = Modifier.padding(top = 4.dp)
            )

            if (onSelect != null) {
                HimVoteButton(
                    text = if (isSelected) "Selected Candidate" else "Select This Candidate",
                    onClick = onSelect,
                    isSecondary = !isSelected,
                    modifier = Modifier.padding(top = 8.dp),
                    contentDesc = if (isSelected) "Candidate currently selected" else "Select candidate ${candidate.name}"
                )
            }
        }
    }
}
