package com.himvote.util

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * Design system tokens according to Section 8.1 of HimVote specification.
 * Tokens are shared across all client platforms by value.
 */
object DesignTokens {
    // Brand Colors
    val Navy900 = Color(0xFF10233F)   // Navigation, headings
    val Teal600 = Color(0xFF157E92)   // Primary action, focus
    val Green600 = Color(0xFF15805D)  // Cryptographically verified only
    val Amber600 = Color(0xFFAA6C0B)  // Pending witness or finality
    val Red600 = Color(0xFFC23C45)    // Invalid proof, blocked action
    val SurfaceBg = Color(0xFFF3F6FA) // App background
    val CardWhite = Color(0xFFFFFFFF) // Surface cards
    val TextPrimary = Color(0xFF17233B) // Body copy

    // Dark Variant Tokens
    val DarkSurfaceBg = Color(0xFF0C1726)
    val DarkCardSurface = Color(0xFF152238)
    val DarkTextPrimary = Color(0xFFE2E8F0)

    // Spacing Grid (8 point grid)
    val SpacingXSmall = 4.dp
    val SpacingSmall = 8.dp
    val SpacingMedium = 16.dp
    val SpacingLarge = 24.dp
    val SpacingXLarge = 32.dp
    val Spacing2XLarge = 40.dp
    val Spacing3XLarge = 48.dp

    // Accessibility standard touch targets (minimum 44 points)
    val MinTouchTargetSize = 44.dp
    val ButtonHeight = 48.dp
    val CardCornerRadius = 12.dp
    val BadgeCornerRadius = 6.dp

    // Micro interaction animation timing constants in milliseconds
    const val AnimationDurationShort = 150
    const val AnimationDurationMedium = 300
    const val AnimationDurationLong = 500

    // Elevation levels for interactive Material 3 surfaces
    val ElevationFlat = 0.dp
    val ElevationDefault = 2.dp
    val ElevationHovered = 4.dp
    val ElevationPressed = 6.dp
    val ElevationFocused = 8.dp

    // Micro interaction scale factors
    const val PressedScaleFactor = 0.98f
    const val HoveredScaleFactor = 1.02f

    // Visual alpha tokens for polished borders and surfaces
    const val BorderAlphaSubtle = 0.25f
    const val BackgroundAlphaSubtle = 0.10f
    const val ShimmerAlphaHigh = 0.35f
    const val ShimmerAlphaLow = 0.08f
}
