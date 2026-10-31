package com.himvote.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.OfflinePin
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.BannerStyle
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.MicroInteractions.animateCardElevation
import com.himvote.ui.components.MicroInteractions.microPressScale
import com.himvote.ui.components.StatusBanner
import com.himvote.ui.components.StyledStatusBanner
import com.himvote.util.AccessibilityHelpers.LargeFontScaleThreshold
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Receipt screen providing cryptographic receipt inspection,
 * micro interaction copy feedback, elevation transitions, and accessible font scaling.
 */
@Composable
fun ReceiptScreen(
    viewModel: ReceiptViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToInclusionProof: (String, String) -> Unit,
    onNavigateHome: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val fontScale = LocalDensity.current.fontScale
    val isLargeFont = fontScale >= LargeFontScaleThreshold

    // Micro interaction states for copy buttons
    var copiedHandle by remember { mutableStateOf(false) }
    var copiedHash by remember { mutableStateOf(false) }

    val interactionSource = remember { MutableInteractionSource() }
    val elevation by animateCardElevation(interactionSource)

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Cryptographic Receipt",
                canNavigateBack = true,
                onNavigateBack = onNavigateBack
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DesignTokens.SurfaceBg)
                .verticalScroll(rememberScrollState())
                .padding(paddingValues)
                .padding(DesignTokens.SpacingLarge),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
        ) {
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(DesignTokens.Green600, RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Verified,
                    contentDescription = null,
                    tint = DesignTokens.CardWhite,
                    modifier = Modifier.size(36.dp)
                )
            }

            Text(
                text = "Cryptographic Receipt Recorded",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                modifier = Modifier.talkBackHeading()
            )

            Text(
                text = "The election authority has verified your ballot submission and issued this cryptographic receipt. Preserve your receipt handle to verify mathematical inclusion in the certified Merkle tree ledger.",
                fontSize = 14.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = 20.sp
            )

            state.receipt?.let { receipt ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .microPressScale(interactionSource),
                    shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                    colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = elevation)
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
                                text = "Cryptographic Receipt Handle",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                            )
                            IconButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Receipt Handle", receipt.receiptHandle)
                                    clipboard.setPrimaryClip(clip)
                                    viewModel.markCopied()
                                    copiedHandle = true
                                    coroutineScope.launch {
                                        delay(2000)
                                        copiedHandle = false
                                    }
                                },
                                modifier = Modifier.accessibleTouchTarget()
                            ) {
                                AnimatedContent(
                                    targetState = copiedHandle,
                                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                                    label = "copy_handle_icon"
                                ) { copied ->
                                    if (copied) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "Handle copied",
                                            tint = DesignTokens.Green600,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.ContentCopy,
                                            contentDescription = "Copy cryptographic receipt handle",
                                            tint = DesignTokens.Teal600,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }

                        Text(
                            text = receipt.receiptHandle,
                            fontSize = if (isLargeFont) 16.sp else 15.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.Navy900
                        )

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = DesignTokens.SurfaceBg
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Ballot Hash (SHA-256)",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                            )
                            IconButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Ballot Hash", receipt.ballotHash)
                                    clipboard.setPrimaryClip(clip)
                                    viewModel.markCopied()
                                    copiedHash = true
                                    coroutineScope.launch {
                                        delay(2000)
                                        copiedHash = false
                                    }
                                },
                                modifier = Modifier.accessibleTouchTarget()
                            ) {
                                AnimatedContent(
                                    targetState = copiedHash,
                                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                                    label = "copy_hash_icon"
                                ) { copied ->
                                    if (copied) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "Hash copied",
                                            tint = DesignTokens.Green600,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    } else {
                                        Icon(
                                            imageVector = Icons.Default.ContentCopy,
                                            contentDescription = "Copy cryptographic ballot hash",
                                            tint = DesignTokens.Teal600,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }

                        Text(
                            text = receipt.ballotHash,
                            fontSize = if (isLargeFont) 13.sp else 12.sp,
                            fontFamily = FontFamily.Monospace,
                            color = DesignTokens.TextPrimary
                        )

                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 4.dp),
                            color = DesignTokens.SurfaceBg
                        )

                        Text(
                            text = "Election Identifier",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                        )
                        Text(
                            text = receipt.electionId,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = DesignTokens.Teal600
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
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "Receipt Format Verification: Valid",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DesignTokens.Green600
                                )
                            }
                        }
                    }
                }

                if (state.isCopied) {
                    StyledStatusBanner(
                        style = BannerStyle.SUCCESS,
                        title = "Copied to Clipboard",
                        message = "Cryptographic receipt handle copied to system clipboard."
                    )
                }

                StyledStatusBanner(
                    style = BannerStyle.INFO,
                    title = "Cryptographic Inclusion Verification Available",
                    message = "Cryptographic inclusion verification confirms mathematical presence of your ballot within the certified Merkle root published by election trustees."
                )

                HimVoteButton(
                    text = "Verify Inclusion Proof",
                    onClick = {
                        onNavigateToInclusionProof(receipt.electionId, receipt.receiptHandle)
                    },
                    contentDesc = "Verify cryptographic Merkle tree inclusion proof"
                )

                HimVoteButton(
                    text = "Return to Elections Overview",
                    onClick = onNavigateHome,
                    isSecondary = true
                )
            } ?: run {
                StyledStatusBanner(
                    style = BannerStyle.WARNING,
                    title = "Cryptographic Receipt Not Located",
                    message = "No cryptographic receipt has been recorded for this election on this device."
                )
            }
        }
    }
}
