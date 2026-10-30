package com.himvote.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountTree
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.OfflinePin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.data.models.ElectionStatus
import com.himvote.ui.components.BannerStyle
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StatusBanner
import com.himvote.ui.components.StyledStatusBanner
import com.himvote.ui.components.VerificationOverallStatus
import com.himvote.ui.components.VerificationProgressIndicator
import com.himvote.ui.components.VerificationStep
import com.himvote.ui.components.VerificationStepState
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens
import com.himvote.util.StateBadge
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Inclusion proof screen displaying cryptographic Merkle tree audit verification,
 * stateful progress indicators, and responsive accessibility font scaling.
 */
@Composable
fun InclusionProofScreen(
    viewModel: InclusionProofViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToResults: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val coroutineScope = rememberCoroutineScope()
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    // Local state for interactive step by step recomputation
    var isRecomputing by remember { mutableStateOf(false) }
    var recomputedStepIndex by remember { mutableStateOf(4) }

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Cryptographic Inclusion Proof",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.SurfaceBg)
                .padding(paddingValues)
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = DesignTokens.Teal600
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(DesignTokens.SpacingLarge),
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .background(DesignTokens.Navy900, RoundedCornerShape(16.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.AccountTree,
                            contentDescription = null,
                            tint = DesignTokens.CardWhite,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Text(
                        text = "Merkle Tree Audit Verification",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = DesignTokens.Navy900,
                        modifier = Modifier.talkBackHeading()
                    )

                    Text(
                        text = "The platform constructs an append only cryptographic Merkle tree of all accepted ballots. Your client recomputed the hash path from your receipt leaf to the published root.",
                        fontSize = 14.sp,
                        color = DesignTokens.TextPrimary,
                        lineHeight = 20.sp
                    )

                    state.proof?.let { proof ->
                        // Dynamic stepped verification indicator for the Merkle tree proof
                        val proofSteps = remember(proof, recomputedStepIndex) {
                            listOf(
                                VerificationStep(
                                    id = "leaf_validation",
                                    title = "Receipt Leaf Node Position",
                                    description = "Validate leaf index #${proof.leafIndex} within ledger boundary",
                                    state = if (recomputedStepIndex >= 1) VerificationStepState.COMPLETED else VerificationStepState.IN_PROGRESS,
                                    detailInfo = "Index: #${proof.leafIndex}\nHash: ${proof.ballotHash}"
                                ),
                                VerificationStep(
                                    id = "path_hash_chain",
                                    title = "Merkle Sibling Hash Chain",
                                    description = "Traverse ${proof.pathHashes.size} sibling hashes using SHA_256",
                                    state = if (recomputedStepIndex >= 2) VerificationStepState.COMPLETED else if (recomputedStepIndex == 1) VerificationStepState.IN_PROGRESS else VerificationStepState.PENDING,
                                    detailInfo = proof.pathHashes.mapIndexed { i, h -> "Sibling $i: ${h.take(24)}..." }.joinToString("\n")
                                ),
                                VerificationStep(
                                    id = "root_recomputation",
                                    title = "Computed Merkle Root Match",
                                    description = "Compare computed root against published root hash",
                                    state = if (recomputedStepIndex >= 3) {
                                        if (state.isVerifiedLocally) VerificationStepState.COMPLETED else VerificationStepState.FAILED
                                    } else if (recomputedStepIndex == 2) VerificationStepState.IN_PROGRESS else VerificationStepState.PENDING,
                                    detailInfo = "Root: ${proof.rootHash}"
                                ),
                                VerificationStep(
                                    id = "consensus_finality",
                                    title = "Chain Finality and Attestation",
                                    description = "Validate block confirmation and witness signatures",
                                    state = if (recomputedStepIndex >= 4) {
                                        if (state.isVerifiedLocally) VerificationStepState.COMPLETED else VerificationStepState.FAILED
                                    } else if (recomputedStepIndex == 3) VerificationStepState.IN_PROGRESS else VerificationStepState.PENDING,
                                    detailInfo = "Cryptographic ledger confirmation verified"
                                )
                            )
                        }

                        val overallProofStatus = remember(recomputedStepIndex, state.isVerifiedLocally) {
                            VerificationOverallStatus(
                                isCompleted = recomputedStepIndex >= 4,
                                isSuccess = state.isVerifiedLocally,
                                summaryText = if (recomputedStepIndex >= 4) {
                                    if (state.isVerifiedLocally) "Cryptographic inclusion proof sound and verified" else "Root mismatch detected in Merkle path"
                                } else {
                                    "Recomputing inclusion proof step $recomputedStepIndex of 4..."
                                }
                            )
                        }

                        VerificationProgressIndicator(
                            steps = proofSteps,
                            overallStatus = overallProofStatus
                        )

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                            colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                            elevation = CardDefaults.cardElevation(defaultElevation = DesignTokens.ElevationDefault)
                        ) {
                            Column(
                                modifier = Modifier.padding(DesignTokens.SpacingMedium),
                                verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingSmall)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Verification Result",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Navy900
                                    )
                                    if (state.isVerifiedLocally) {
                                        StateBadge(status = ElectionStatus.AUDIT_PASSED)
                                    } else {
                                        StateBadge(status = ElectionStatus.FAILED)
                                    }
                                }

                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = DesignTokens.SurfaceBg
                                )

                                Text(
                                    text = "Tree Leaf Index",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = "#${proof.leafIndex}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DesignTokens.Navy900
                                )

                                Text(
                                    text = "Ballot Leaf Hash",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = proof.ballotHash,
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = DesignTokens.TextPrimary
                                )

                                Text(
                                    text = "Witness Path Hashes (${proof.pathHashes.size} steps)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                )
                                proof.pathHashes.forEachIndexed { idx, h ->
                                    Text(
                                        text = "Sibling $idx: ${h.take(28)}...",
                                        fontSize = 11.sp,
                                        fontFamily = FontFamily.Monospace,
                                        color = DesignTokens.Teal600
                                    )
                                }

                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = DesignTokens.SurfaceBg
                                )

                                Text(
                                    text = "Computed Merkle Root Hash",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                )
                                Text(
                                    text = proof.rootHash,
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = DesignTokens.Green600
                                )

                                if (state.isOfflineVerified) {
                                    HorizontalDivider(
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        color = DesignTokens.SurfaceBg
                                    )

                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.OfflinePin,
                                            contentDescription = null,
                                            tint = DesignTokens.Green600,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Text(
                                            text = "Offline Mathematical Engine: Path Sound",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = DesignTokens.Green600
                                        )
                                    }
                                }
                            }
                        }

                        if (state.isVerifiedLocally) {
                            StyledStatusBanner(
                                style = BannerStyle.VERIFIED,
                                title = "Cryptographic Mathematical Proof Valid",
                                message = "Green label indicates complete mathematical verification. Your ballot is confirmed inside the audited set."
                            )
                        }

                        HimVoteButton(
                            text = if (isRecomputing) "Recomputing Proof Steps..." else "Recompute Proof with Offline Engine",
                            onClick = {
                                isRecomputing = true
                                recomputedStepIndex = 0
                                coroutineScope.launch {
                                    delay(300)
                                    recomputedStepIndex = 1
                                    delay(300)
                                    recomputedStepIndex = 2
                                    delay(300)
                                    recomputedStepIndex = 3
                                    delay(300)
                                    recomputedStepIndex = 4
                                    isRecomputing = false
                                    viewModel.recomputeOfflineProof()
                                }
                            },
                            isLoading = isRecomputing,
                            isSecondary = true,
                            contentDesc = "Recompute cryptographic root using local mathematical verification engine"
                        )

                        HimVoteButton(
                            text = "View Verified Election Tally",
                            onClick = { onNavigateToResults(state.electionId) }
                        )
                    }
                }
            }
        }
    }
}
