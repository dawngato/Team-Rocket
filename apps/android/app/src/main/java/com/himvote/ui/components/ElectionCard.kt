package com.himvote.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.ElectionSummary
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.DesignTokens
import com.himvote.util.StateBadge

/**
 * Election card component with tactile micro interaction press scaling,
 * elevation transitions, and responsive reflow for accessibility font scaling.
 */
@Composable
fun ElectionCard(
    election: ElectionSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    Card(
        modifier = modifier
            .fillMaxWidth()
            .accessibleTouchTarget()
            .microPressScale(interactionSource)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .semantics(mergeDescendants = true) {
                contentDescription = "Election: ${election.title}, Status: ${election.status.label}, Department: ${election.department}"
            },
        shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
        colors = CardDefaults.cardColors(
            containerColor = DesignTokens.CardWhite
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Column(
            modifier = Modifier.padding(DesignTokens.SpacingMedium),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
        ) {
            if (isLargeFont) {
                // Stack status badge and vote state vertically on large font scale
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    StateBadge(status = election.status)

                    if (election.alreadyVoted) {
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
                                text = "Ballot Submitted",
                                color = DesignTokens.Green600,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    StateBadge(status = election.status)

                    if (election.alreadyVoted) {
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
                                text = "Ballot Submitted",
                                color = DesignTokens.Green600,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Text(
                text = election.title,
                fontSize = if (isLargeFont) 19.sp else 18.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                lineHeight = if (isLargeFont) 24.sp else 22.sp
            )

            Text(
                text = election.description,
                fontSize = 14.sp,
                color = DesignTokens.TextPrimary.copy(alpha = 0.85f),
                lineHeight = 20.sp
            )

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 4.dp),
                color = DesignTokens.SurfaceBg
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = election.department,
                    fontSize = 12.sp,
                    color = DesignTokens.Teal600,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${election.candidateCount} Candidates",
                    fontSize = 12.sp,
                    color = DesignTokens.TextPrimary.copy(alpha = 0.7f)
                )
            }
        }
    }
}
