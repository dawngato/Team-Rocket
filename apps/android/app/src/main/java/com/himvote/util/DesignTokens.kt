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
}
