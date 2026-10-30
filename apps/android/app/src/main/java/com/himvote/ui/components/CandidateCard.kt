package com.himvote.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.Candidate
import com.himvote.util.DesignTokens

@Composable
fun CandidateCard(
    candidate: Candidate,
    isSelected: Boolean = false,
    onSelect: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .defaultMinSize(minHeight = DesignTokens.MinTouchTargetSize)
            .semantics(mergeDescendants = true) {
                contentDescription = "Candidate: ${candidate.name}, Department: ${candidate.department}, Roll Number: ${candidate.rollNumber}"
            },
        shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) DesignTokens.Teal600.copy(alpha = 0.08f) else DesignTokens.CardWhite
        ),
        border = if (isSelected) CardDefaults.outlinedCardBorder().copy(brush = androidx.compose.ui.graphics.SolidColor(DesignTokens.Teal600)) else null,
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(DesignTokens.Teal600.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = DesignTokens.Teal600,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Column {
                    Text(
                        text = candidate.name,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = DesignTokens.Navy900
                    )
                    Text(
                        text = "${candidate.rollNumber} • ${candidate.department}",
                        fontSize = 13.sp,
                        color = DesignTokens.TextPrimary.copy(alpha = 0.7f)
                    )
                }
            }

            Text(
                text = candidate.manifesto,
                fontSize = 14.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = 20.sp,
                modifier = Modifier.padding(top = 4.dp)
            )

            if (onSelect != null) {
                HimVoteButton(
                    text = if (isSelected) "Selected Candidate" else "Select This Candidate",
                    onClick = onSelect,
                    isSecondary = !isSelected,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    }
}
