package com.himvote

import com.himvote.ui.components.VerificationProgressEngine
import com.himvote.ui.components.VerificationStepState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for multi stage cryptographic verification progress engine.
 */
class VerificationProgressEngineTest {

    private lateinit var engine: VerificationProgressEngine

    @Before
    fun setUp() {
        engine = VerificationProgressEngine()
    }

    @Test
    fun testInitialStateHasFourDefaultSteps() {
        val steps = engine.steps.value
        assertEquals("Default pipeline must contain 4 steps", 4, steps.size)
        assertEquals("Initial step index must be 0", 0, engine.currentStepIndex.value)
        assertFalse("Overall verification must not be completed initially", engine.overallStatus.value.isCompleted)
        assertFalse("Overall status must not be success initially", engine.overallStatus.value.isSuccess)

        steps.forEach { step ->
            assertEquals("All steps should initially be pending", VerificationStepState.PENDING, step.state)
        }
    }

    @Test
    fun testStartVerificationActivatesFirstStep() {
        engine.startVerification()

        val steps = engine.steps.value
        assertEquals("First step must be in progress", VerificationStepState.IN_PROGRESS, steps[0].state)
        assertEquals("Second step must be pending", VerificationStepState.PENDING, steps[1].state)
        assertEquals("Third step must be pending", VerificationStepState.PENDING, steps[2].state)
        assertEquals("Fourth step must be pending", VerificationStepState.PENDING, steps[3].state)
        assertEquals("Current step index must be 0", 0, engine.currentStepIndex.value)
    }

    @Test
    fun testCompleteStepAdvancesToNext() {
        engine.startVerification()
        engine.completeStep("keystore_attestation", "Key signature valid")

        val steps = engine.steps.value
        assertEquals("First step must be marked completed", VerificationStepState.COMPLETED, steps[0].state)
        assertEquals("First step detail must match", "Key signature valid", steps[0].detailInfo)
        assertEquals("Second step must be in progress", VerificationStepState.IN_PROGRESS, steps[1].state)
        assertEquals("Current index must advance to 1", 1, engine.currentStepIndex.value)
        assertFalse("Pipeline must not be completed yet", engine.overallStatus.value.isCompleted)
    }

    @Test
    fun testCompletingAllStepsMarksSuccess() {
        engine.startVerification()
        engine.completeStep("keystore_attestation", "Hardware key OK")
        engine.completeStep("blind_token", "RSA signature OK")
        engine.completeStep("merkle_path", "Merkle root OK")
        engine.completeStep("witness_attestation", "Consensus OK")

        val steps = engine.steps.value
        steps.forEach { step ->
            assertEquals("Step ${step.id} must be completed", VerificationStepState.COMPLETED, step.state)
        }

        assertTrue("Verification must be marked completed", engine.overallStatus.value.isCompleted)
        assertTrue("Verification must be marked successful", engine.overallStatus.value.isSuccess)
    }

    @Test
    fun testFailureHaltsPipelineAndRecordsReason() {
        engine.startVerification()
        engine.completeStep("keystore_attestation", "Hardware key OK")
        engine.failStep("blind_token", "Invalid token signature authority")

        val steps = engine.steps.value
        assertEquals("First step must be completed", VerificationStepState.COMPLETED, steps[0].state)
        assertEquals("Second step must be failed", VerificationStepState.FAILED, steps[1].state)
        assertEquals("Failure reason must be recorded", "Invalid token signature authority", steps[1].detailInfo)
        assertEquals("Third step must remain pending", VerificationStepState.PENDING, steps[2].state)
        assertEquals("Fourth step must remain pending", VerificationStepState.PENDING, steps[3].state)

        assertTrue("Pipeline must be marked completed on failure", engine.overallStatus.value.isCompleted)
        assertFalse("Pipeline must not be successful on failure", engine.overallStatus.value.isSuccess)
    }

    @Test
    fun testResetRestoresInitialState() {
        engine.startVerification()
        engine.completeStep("keystore_attestation", "Hardware key OK")
        engine.reset()

        val steps = engine.steps.value
        assertEquals("Step count must be 4", 4, steps.size)
        assertEquals("Current index must be 0", 0, engine.currentStepIndex.value)
        assertFalse("Overall status must not be completed", engine.overallStatus.value.isCompleted)
        steps.forEach { step ->
            assertEquals("Steps must be pending after reset", VerificationStepState.PENDING, step.state)
        }
    }
}
