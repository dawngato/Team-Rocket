package com.himvote.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.ElectionStatus
import com.himvote.data.models.ElectionSummary
import com.himvote.util.DesignTokens
import com.himvote.util.StateBadge

@Composable
fun ElectionCard(
    election: ElectionSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = DesignTokens.MinTouchTargetSize)
            .clickable(onClick = onClick)
            .semantics(mergeDescendants = true) {
                contentDescription = "Election: ${election.title}, Status: ${election.status.label}, Department: ${election.department}"
            },
        shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
        colors = CardDefaults.cardColors(
            containerColor = DesignTokens.CardWhite
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(DesignTokens.SpacingMedium),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
        ) {
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
                            text = "Ballot Cast",
                            color = DesignTokens.Green600,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Text(
                text = election.title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900
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
