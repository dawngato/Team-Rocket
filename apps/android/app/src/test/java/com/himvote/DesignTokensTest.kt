package com.himvote

import androidx.compose.ui.unit.dp
import com.himvote.util.DesignTokens
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests verifying design system token contracts, elevations, and animations.
 */
class DesignTokensTest {

    @Test
    fun testElevationHierarchyIntegrity() {
        assertTrue("Flat must be less than default", DesignTokens.ElevationFlat < DesignTokens.ElevationDefault)
        assertTrue("Default must be less than hovered", DesignTokens.ElevationDefault < DesignTokens.ElevationHovered)
        assertTrue("Hovered must be less than pressed", DesignTokens.ElevationHovered < DesignTokens.ElevationPressed)
        assertTrue("Pressed must be less than focused", DesignTokens.ElevationPressed < DesignTokens.ElevationFocused)
    }

    @Test
    fun testAnimationDurationHierarchy() {
        assertTrue("Short animation must be less than medium", DesignTokens.AnimationDurationShort < DesignTokens.AnimationDurationMedium)
        assertTrue("Medium animation must be less than long", DesignTokens.AnimationDurationMedium < DesignTokens.AnimationDurationLong)
    }

    @Test
    fun testMicroInteractionScaleFactors() {
        assertTrue("Pressed scale factor must compress surface", DesignTokens.PressedScaleFactor < 1.0f)
        assertTrue("Hovered scale factor must expand surface", DesignTokens.HoveredScaleFactor > 1.0f)
    }

    @Test
    fun testTouchTargetStandardStandardCompliant() {
        assertEquals("Minimum touch target must be at least 44 dp", 44.dp, DesignTokens.MinTouchTargetSize)
        assertEquals("Standard button height must be 48 dp", 48.dp, DesignTokens.ButtonHeight)
    }
}
