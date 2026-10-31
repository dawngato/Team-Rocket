package com.himvote.util

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.ElectionStatus

/**
 * State metadata configuration ensuring WCAG compliance and "never color alone".
 * Green is reserved strictly for cryptographically verified properties.
 */
data class StateVisualConfig(
    val backgroundColor: Color,
    val textColor: Color,
    val icon: ImageVector,
    val accessibilityLabel: String
)

object StateBadges {

    fun getConfig(status: ElectionStatus): StateVisualConfig {
        return when (status) {
            ElectionStatus.DRAFT -> StateVisualConfig(
                backgroundColor = DesignTokens.Navy900.copy(alpha = 0.12f),
                textColor = DesignTokens.Navy900,
                icon = Icons.Default.Edit,
                accessibilityLabel = "Status: Draft, election under preparation"
            )
            ElectionStatus.FROZEN -> StateVisualConfig(
                backgroundColor = DesignTokens.Navy900.copy(alpha = 0.16f),
                textColor = DesignTokens.Navy900,
                icon = Icons.Default.Lock,
                accessibilityLabel = "Status: Frozen, manifest locked and finalized"
            )
            ElectionStatus.OPEN -> StateVisualConfig(
                backgroundColor = DesignTokens.Teal600.copy(alpha = 0.14f),
                textColor = DesignTokens.Teal600,
                icon = Icons.Default.HowToVote,
                accessibilityLabel = "Status: Open, ballot submission active"
            )
            ElectionStatus.PENDING_WITNESS -> StateVisualConfig(
                backgroundColor = DesignTokens.Amber600.copy(alpha = 0.14f),
                textColor = DesignTokens.Amber600,
                icon = Icons.Default.HourglassEmpty,
                accessibilityLabel = "Status: Pending witness confirmation"
            )
            ElectionStatus.WITNESSED -> StateVisualConfig(
                backgroundColor = DesignTokens.Green600.copy(alpha = 0.14f),
                textColor = DesignTokens.Green600,
                icon = Icons.Default.Verified,
                accessibilityLabel = "Status: Witnessed, cryptographically attested"
            )
            ElectionStatus.ANCHOR_PENDING -> StateVisualConfig(
                backgroundColor = DesignTokens.Amber600.copy(alpha = 0.14f),
                textColor = DesignTokens.Amber600,
                icon = Icons.Default.Sync,
                accessibilityLabel = "Status: Anchor pending chain publication"
            )
            ElectionStatus.ANCHOR_FINALIZED -> StateVisualConfig(
                backgroundColor = DesignTokens.Green600.copy(alpha = 0.14f),
                textColor = DesignTokens.Green600,
                icon = Icons.Default.Link,
                accessibilityLabel = "Status: Anchor finalized on chain"
            )
            ElectionStatus.AUDIT_PASSED -> StateVisualConfig(
                backgroundColor = DesignTokens.Green600.copy(alpha = 0.14f),
                textColor = DesignTokens.Green600,
                icon = Icons.Default.CheckCircle,
                accessibilityLabel = "Status: Audit passed, mathematically verified"
            )
            ElectionStatus.AUDITOR_ATTESTED -> StateVisualConfig(
                backgroundColor = DesignTokens.Green600.copy(alpha = 0.14f),
                textColor = DesignTokens.Green600,
                icon = Icons.Default.Shield,
                accessibilityLabel = "Status: Auditor attested with hardware signature"
            )
            ElectionStatus.FAILED -> StateVisualConfig(
                backgroundColor = DesignTokens.Red600.copy(alpha = 0.14f),
                textColor = DesignTokens.Red600,
                icon = Icons.Default.Error,
                accessibilityLabel = "Status: Failed cryptographic verification"
            )
            ElectionStatus.DISPUTED -> StateVisualConfig(
                backgroundColor = DesignTokens.Red600.copy(alpha = 0.14f),
                textColor = DesignTokens.Red600,
                icon = Icons.Default.Warning,
                accessibilityLabel = "Status: Disputed tally or witness anomaly"
            )
            ElectionStatus.PUBLISHED -> StateVisualConfig(
                backgroundColor = DesignTokens.Green600.copy(alpha = 0.14f),
                textColor = DesignTokens.Green600,
                icon = Icons.Default.Public,
                accessibilityLabel = "Status: Published"
            )
            else -> StateVisualConfig(
                backgroundColor = DesignTokens.Navy900.copy(alpha = 0.12f),
                textColor = DesignTokens.Navy900,
                icon = Icons.Default.Info,
                accessibilityLabel = "Status: ${status.label}"
            )
        }
    }
}

@Composable
fun StateBadge(
    status: ElectionStatus,
    modifier: Modifier = Modifier,
    labelOverride: String? = null,
    accessibilityLabelOverride: String? = null
) {
    val config = StateBadges.getConfig(status)

    Row(
        modifier = modifier
            .background(
                color = config.backgroundColor,
                shape = RoundedCornerShape(DesignTokens.BadgeCornerRadius)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = accessibilityLabelOverride ?: config.accessibilityLabel
            },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Icon(
            imageVector = config.icon,
            contentDescription = null,
            tint = config.textColor,
            modifier = Modifier.size(14.dp)
        )
        Text(
            text = labelOverride ?: status.label,
            color = config.textColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}
