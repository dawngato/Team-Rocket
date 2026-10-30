package com.himvote.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.DesignTokens

/**
 * Standard banner visual presentation styles.
 */
enum class BannerStyle {
    INFO,
    SUCCESS,
    VERIFIED,
    WARNING,
    ERROR
}

/**
 * Visual configuration for a banner presentation style.
 */
data class BannerVisualConfig(
    val tintColor: Color,
    val backgroundColor: Color,
    val icon: ImageVector,
    val defaultPrefix: String
)

/**
 * Status banner style resolver.
 */
object BannerStyleResolver {
    fun resolve(style: BannerStyle): BannerVisualConfig {
        return when (style) {
            BannerStyle.INFO -> BannerVisualConfig(
                tintColor = DesignTokens.Teal600,
                backgroundColor = DesignTokens.Teal600.copy(alpha = DesignTokens.BackgroundAlphaSubtle),
                icon = Icons.Default.Info,
                defaultPrefix = "Information"
            )
            BannerStyle.SUCCESS -> BannerVisualConfig(
                tintColor = DesignTokens.Teal600,
                backgroundColor = DesignTokens.Teal600.copy(alpha = DesignTokens.BackgroundAlphaSubtle),
                icon = Icons.Default.CheckCircle,
                defaultPrefix = "Success"
            )
            BannerStyle.VERIFIED -> BannerVisualConfig(
                tintColor = DesignTokens.Green600,
                backgroundColor = DesignTokens.Green600.copy(alpha = 0.12f),
                icon = Icons.Default.Verified,
                defaultPrefix = "Cryptographically Verified"
            )
            BannerStyle.WARNING -> BannerVisualConfig(
                tintColor = DesignTokens.Amber600,
                backgroundColor = DesignTokens.Amber600.copy(alpha = 0.12f),
                icon = Icons.Default.Warning,
                defaultPrefix = "Warning Notice"
            )
            BannerStyle.ERROR -> BannerVisualConfig(
                tintColor = DesignTokens.Red600,
                backgroundColor = DesignTokens.Red600.copy(alpha = 0.12f),
                icon = Icons.Default.Error,
                defaultPrefix = "Error Notice"
            )
        }
    }
}

/**
 * Polished Material 3 status banner with responsive font scaling and elevation borders.
 */
@Composable
fun StatusBanner(
    title: String,
    message: String,
    icon: ImageVector = Icons.Default.Info,
    tintColor: Color = DesignTokens.Teal600,
    backgroundColor: Color = DesignTokens.Teal600.copy(alpha = 0.1f),
    modifier: Modifier = Modifier,
    isDismissible: Boolean = false,
    onDismiss: (() -> Unit)? = null
) {
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold
    val cornerShape = RoundedCornerShape(DesignTokens.CardCornerRadius)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(cornerShape)
            .background(backgroundColor, cornerShape)
            .border(
                BorderStroke(1.dp, tintColor.copy(alpha = DesignTokens.BorderAlphaSubtle)),
                cornerShape
            )
            .padding(DesignTokens.SpacingMedium)
            .semantics(mergeDescendants = true) {
                contentDescription = "$title. $message"
                liveRegion = LiveRegionMode.Polite
            }
    ) {
        if (isLargeFont) {
            // High font scale layout stacked vertically to prevent clipping
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(tintColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = tintColor,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    if (isDismissible && onDismiss != null) {
                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier.accessibleTouchTarget()
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Dismiss notice",
                                tint = tintColor,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                Text(
                    text = title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = tintColor
                )

                Text(
                    text = message,
                    fontSize = 14.sp,
                    color = DesignTokens.TextPrimary,
                    lineHeight = 20.sp
                )
            }
        } else {
            // Standard layout
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(tintColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = tintColor,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
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

                if (isDismissible && onDismiss != null) {
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .size(32.dp)
                            .accessibleTouchTarget()
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Dismiss notice",
                            tint = tintColor,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Convenient styled status banner builder.
 */
@Composable
fun StyledStatusBanner(
    style: BannerStyle,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    isDismissible: Boolean = false,
    onDismiss: (() -> Unit)? = null
) {
    val config = BannerStyleResolver.resolve(style)
    StatusBanner(
        title = title,
        message = message,
        icon = config.icon,
        tintColor = config.tintColor,
        backgroundColor = config.backgroundColor,
        modifier = modifier,
        isDismissible = isDismissible,
        onDismiss = onDismiss
    )
}
