package com.himvote.util

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Accessibility utility helpers ensuring WCAG 2.2 AA compliance and TalkBack support.
 */
object AccessibilityHelpers {

    /**
     * Threshold where system font scaling requires responsive layout reflow.
     */
    const val LargeFontScaleThreshold = 1.3f

    /**
     * Checks if current environment has large font scaling enabled by user.
     */
    @Composable
    fun isLargeFontScale(): Boolean {
        val density = LocalDensity.current
        return density.fontScale >= LargeFontScaleThreshold
    }

    /**
     * Computes adaptive minimum height accounting for accessibility font scale.
     */
    fun computeAdaptiveMinHeight(baseHeightDp: Float, fontScale: Float): Float {
        return if (fontScale > 1.0f) {
            val scaleFactor = fontScale.coerceIn(1.0f, 2.0f)
            baseHeightDp * scaleFactor
        } else {
            baseHeightDp
        }
    }

    /**
     * Enforces the minimum 44 point touch target standard on interactive items.
     */
    fun Modifier.accessibleTouchTarget(): Modifier =
        this.defaultMinSize(
            minWidth = DesignTokens.MinTouchTargetSize,
            minHeight = DesignTokens.MinTouchTargetSize
        )

    /**
     * Dynamically scales touch targets to accommodate larger finger pads when font scale is enlarged.
     */
    @Composable
    fun Modifier.adaptiveTouchTarget(): Modifier {
        val fontScale = LocalDensity.current.fontScale
        val minDimension = if (fontScale >= LargeFontScaleThreshold) {
            (DesignTokens.MinTouchTargetSize.value * fontScale.coerceAtMost(1.6f)).dp
        } else {
            DesignTokens.MinTouchTargetSize
        }
        return this.defaultMinSize(
            minWidth = minDimension,
            minHeight = minDimension
        )
    }

    /**
     * Marks a composable as an accessible heading for TalkBack navigation.
     */
    fun Modifier.talkBackHeading(): Modifier =
        this.semantics {
            heading()
        }

    /**
     * Applies an explicit semantic content description for screen readers.
     */
    fun Modifier.talkBackLabel(description: String): Modifier =
        this.semantics {
            contentDescription = description
        }

    /**
     * Configures a polite accessibility live region for automated TalkBack announcements.
     */
    fun Modifier.accessibilityLivePolite(): Modifier =
        this.semantics {
            liveRegion = LiveRegionMode.Polite
        }

    /**
     * Standard accessible button modifier with role and click action.
     */
    @Composable
    fun Modifier.accessibleButton(
        label: String,
        onClick: () -> Unit
    ): Modifier {
        val interactionSource = remember { MutableInteractionSource() }
        return this
            .accessibleTouchTarget()
            .semantics {
                role = Role.Button
                contentDescription = label
            }
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
    }
}

