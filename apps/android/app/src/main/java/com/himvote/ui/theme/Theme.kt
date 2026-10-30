package com.himvote.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = Teal600,
    onPrimary = CardWhite,
    primaryContainer = Teal600.copy(alpha = 0.12f),
    onPrimaryContainer = Navy900,
    secondary = Navy900,
    onSecondary = CardWhite,
    background = SurfaceBg,
    onBackground = TextPrimary,
    surface = CardWhite,
    onSurface = TextPrimary,
    error = Red600,
    onError = CardWhite
)

private val DarkColorScheme = darkColorScheme(
    primary = Teal600,
    onPrimary = CardWhite,
    primaryContainer = Navy900,
    onPrimaryContainer = DarkTextPrimary,
    secondary = Teal600,
    onSecondary = CardWhite,
    background = DarkSurfaceBg,
    onBackground = DarkTextPrimary,
    surface = DarkCardSurface,
    onSurface = DarkTextPrimary,
    error = Red600,
    onError = CardWhite
)

@Composable
fun HimVoteTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
