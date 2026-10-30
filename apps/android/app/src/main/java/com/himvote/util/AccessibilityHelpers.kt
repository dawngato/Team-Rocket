package com.himvote.util

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics

/**
 * Accessibility utility helpers ensuring WCAG 2.2 AA compliance and TalkBack support.
 */
object AccessibilityHelpers {

    /**
     * Enforces the minimum 44 point touch target standard on interactive items.
     */
    fun Modifier.accessibleTouchTarget(): Modifier =
        this.defaultMinSize(
            minWidth = DesignTokens.MinTouchTargetSize,
            minHeight = DesignTokens.MinTouchTargetSize
        )

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
