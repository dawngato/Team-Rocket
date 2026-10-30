package com.himvote

import com.himvote.ui.components.BannerStyle
import com.himvote.ui.components.BannerStyleResolver
import com.himvote.util.AccessibilityHelpers
import com.himvote.util.DesignTokens
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests verifying accessibility font scaling calculations and banner styling.
 */
class AccessibilityFontScaleTest {

    @Test
    fun testComputeAdaptiveMinHeightWithStandardScale() {
        val baseHeight = 48.0f
        val computed = AccessibilityHelpers.computeAdaptiveMinHeight(baseHeight, 1.0f)
        assertEquals("Standard scale should preserve base height", baseHeight, computed, 0.01f)
    }

    @Test
    fun testComputeAdaptiveMinHeightWithEnlargedFontScale() {
        val baseHeight = 48.0f
        val fontScale = 1.5f
        val expected = 48.0f * 1.5f
        val computed = AccessibilityHelpers.computeAdaptiveMinHeight(baseHeight, fontScale)
        assertEquals("Enlarged scale should scale base height proportionally", expected, computed, 0.01f)
    }

    @Test
    fun testComputeAdaptiveMinHeightCapsAtTwoX() {
        val baseHeight = 48.0f
        val excessiveScale = 3.5f
        val expected = 48.0f * 2.0f
        val computed = AccessibilityHelpers.computeAdaptiveMinHeight(baseHeight, excessiveScale)
        assertEquals("Scale calculation should cap at 2.0x factor", expected, computed, 0.01f)
    }

    @Test
    fun testLargeFontScaleThresholdConstant() {
        assertEquals("Threshold constant must be 1.3f", 1.3f, AccessibilityHelpers.LargeFontScaleThreshold, 0.001f)
    }

    @Test
    fun testBannerStyleResolverProvidesDistinctVisualConfigs() {
        val infoConfig = BannerStyleResolver.resolve(BannerStyle.INFO)
        val successConfig = BannerStyleResolver.resolve(BannerStyle.SUCCESS)
        val verifiedConfig = BannerStyleResolver.resolve(BannerStyle.VERIFIED)
        val warningConfig = BannerStyleResolver.resolve(BannerStyle.WARNING)
        val errorConfig = BannerStyleResolver.resolve(BannerStyle.ERROR)

        assertEquals("Info tint must be Teal600", DesignTokens.Teal600, infoConfig.tintColor)
        assertEquals("Verified tint must be Green600", DesignTokens.Green600, verifiedConfig.tintColor)
        assertEquals("Warning tint must be Amber600", DesignTokens.Amber600, warningConfig.tintColor)
        assertEquals("Error tint must be Red600", DesignTokens.Red600, errorConfig.tintColor)

        assertEquals("Verified prefix check", "Cryptographically Verified", verifiedConfig.defaultPrefix)
    }
}
