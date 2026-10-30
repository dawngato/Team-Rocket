package com.himvote

import com.himvote.ui.components.BiometricFeedbackController
import com.himvote.ui.components.BiometricState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Unit tests verifying biometric feedback controller state transitions.
 */
class BiometricFeedbackControllerTest {

    private lateinit var controller: BiometricFeedbackController

    @Before
    fun setUp() {
        controller = BiometricFeedbackController()
    }

    @Test
    fun testInitialStateIsIdle() {
        assertEquals("Initial state must be idle", BiometricState.IDLE, controller.state.value)
        assertNull("Initial error message must be null", controller.errorMessage.value)
    }

    @Test
    fun testStartScanTransitionsToScanning() {
        controller.startScan()
        assertEquals("State must transition to scanning", BiometricState.SCANNING, controller.state.value)
        assertNull("Error message must remain null on scan start", controller.errorMessage.value)
    }

    @Test
    fun testMarkSuccessTransitionsToSuccess() {
        controller.startScan()
        controller.markSuccess()
        assertEquals("State must transition to success", BiometricState.SUCCESS, controller.state.value)
        assertNull("Error message must be null on success", controller.errorMessage.value)
    }

    @Test
    fun testMarkErrorTransitionsToErrorAndSetsMessage() {
        controller.startScan()
        controller.markError("Fingerprint sensor mismatch")
        assertEquals("State must transition to error", BiometricState.ERROR, controller.state.value)
        assertEquals("Error message must match", "Fingerprint sensor mismatch", controller.errorMessage.value)
    }

    @Test
    fun testMarkLockoutTransitionsToLockout() {
        controller.markLockout("Hardware sensor lockout after multiple attempts")
        assertEquals("State must transition to lockout", BiometricState.LOCKOUT, controller.state.value)
        assertEquals("Lockout message must match", "Hardware sensor lockout after multiple attempts", controller.errorMessage.value)
    }

    @Test
    fun testResetClearsStateAndErrorMessage() {
        controller.markError("Sensor error")
        controller.reset()
        assertEquals("Reset must return state to idle", BiometricState.IDLE, controller.state.value)
        assertNull("Reset must clear error message", controller.errorMessage.value)
    }
}
