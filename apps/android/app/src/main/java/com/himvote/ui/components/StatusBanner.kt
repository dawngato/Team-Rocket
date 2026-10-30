package com.himvote.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
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
import com.himvote.util.DesignTokens

@Composable
fun StatusBanner(
    title: String,
    message: String,
    icon: ImageVector = Icons.Default.Info,
    tintColor: Color = DesignTokens.Teal600,
    backgroundColor: Color = DesignTokens.Teal600.copy(alpha = 0.1f),
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(backgroundColor, RoundedCornerShape(DesignTokens.CardCornerRadius))
            .padding(DesignTokens.SpacingMedium)
            .semantics(mergeDescendants = true) {
                contentDescription = "$title: $message"
            },
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = tintColor,
            modifier = Modifier.size(24.dp)
        )
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = tintColor
            )
            Text(
                text = message,
                fontSize = 13.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = 18.sp
            )
        }
    }
}
