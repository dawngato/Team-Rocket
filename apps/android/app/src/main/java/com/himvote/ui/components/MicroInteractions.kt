package com.himvote.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import com.himvote.util.DesignTokens

/**
 * Micro interaction modifiers providing tactile press feedback and elevation transitions.
 */
object MicroInteractions {

    /**
     * Applies a spring scale compression when the surface is pressed by the user.
     */
    @Composable
    fun Modifier.microPressScale(
        interactionSource: MutableInteractionSource,
        pressedScale: Float = DesignTokens.PressedScaleFactor
    ): Modifier {
        val isPressed by interactionSource.collectIsPressedAsState()
        val scale by animateFloatAsState(
            targetValue = if (isPressed) pressedScale else 1.0f,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioMediumBouncy,
                stiffness = Spring.StiffnessMedium
            ),
            label = "micro_press_scale"
        )
        return this.graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
    }

    /**
     * Smoothly transitions card elevation between resting and active pressed states.
     */
    @Composable
    fun animateCardElevation(
        interactionSource: MutableInteractionSource,
        defaultElevation: Dp = DesignTokens.ElevationDefault,
        pressedElevation: Dp = DesignTokens.ElevationPressed
    ): State<Dp> {
        val isPressed by interactionSource.collectIsPressedAsState()
        return animateDpAsState(
            targetValue = if (isPressed) pressedElevation else defaultElevation,
            animationSpec = tween(
                durationMillis = DesignTokens.AnimationDurationShort,
                easing = FastOutSlowInEasing
            ),
            label = "card_elevation_transition"
        )
    }

    /**
     * Continuous pulsing scale effect for active cryptographic operations.
     */
    @Composable
    fun Modifier.pulsingWave(
        enabled: Boolean = true,
        minScale: Float = 0.94f,
        maxScale: Float = 1.06f,
        durationMillis: Int = 1000
    ): Modifier {
        if (!enabled) return this

        val transition = rememberInfiniteTransition(label = "pulsing_wave")
        val scale by transition.animateFloat(
            initialValue = minScale,
            targetValue = maxScale,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = durationMillis, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "wave_scale"
        )
        return this.graphicsLayer {
            scaleX = scale
            scaleY = scale
        }
    }

    /**
     * Infinite breathing alpha effect for waiting or attestation indicators.
     */
    @Composable
    fun Modifier.breathingAlpha(
        enabled: Boolean = true,
        minAlpha: Float = DesignTokens.ShimmerAlphaLow,
        maxAlpha: Float = DesignTokens.ShimmerAlphaHigh,
        durationMillis: Int = 1200
    ): Modifier {
        if (!enabled) return this

        val transition = rememberInfiniteTransition(label = "breathing_alpha")
        val alpha by transition.animateFloat(
            initialValue = minAlpha,
            targetValue = maxAlpha,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = durationMillis, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "alpha_value"
        )
        return this.graphicsLayer {
            this.alpha = alpha
        }
    }
}
