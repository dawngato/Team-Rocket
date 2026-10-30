package com.himvote.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.OfflinePin
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.HimVoteTopBar
import com.himvote.ui.components.StatusBanner
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens

@Composable
fun ReceiptScreen(
    viewModel: ReceiptViewModel,
    onNavigateBack: () -> Unit,
    onNavigateToInclusionProof: (String, String) -> Unit,
    onNavigateHome: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Cast Ballot Receipt",
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
                text = "Ballot Confirmed & Recorded",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = DesignTokens.Navy900,
                modifier = Modifier.talkBackHeading()
            )

            Text(
                text = "Your encrypted vote has been committed to the immutable election ledger. Retain your receipt handle to verify inclusion in the cryptographic Merkle tree.",
                fontSize = 14.sp,
                color = DesignTokens.TextPrimary,
                lineHeight = 20.sp
            )

            state.receipt?.let { receipt ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                    colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                                text = "Receipt Handle",
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
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ContentCopy,
                                    contentDescription = "Copy receipt handle",
                                    tint = DesignTokens.Teal600,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        Text(
                            text = receipt.receiptHandle,
                            fontSize = 15.sp,
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
                                text = "Ballot Hash (SHA_256)",
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
                                }
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ContentCopy,
                                    contentDescription = "Copy ballot hash",
                                    tint = DesignTokens.Teal600,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        Text(
                            text = receipt.ballotHash,
                            fontSize = 13.sp,
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
                                    text = "Offline Cryptographic Verification: Valid",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DesignTokens.Green600
                                )
                            }
                        }
                    }
                }

                if (state.isCopied) {
                    StatusBanner(
                        title = "Copied to Clipboard",
                        message = "Cryptographic handle has been copied to your system clipboard.",
                        icon = Icons.Default.CheckCircle,
                        tintColor = DesignTokens.Teal600,
                        backgroundColor = DesignTokens.Teal600.copy(alpha = 0.1f)
                    )
                }

                StatusBanner(
                    title = "Cryptographic Verification Available",
                    message = "You can mathematically confirm your ballot is part of the final audited tally without revealing your secret choice.",
                    icon = Icons.Default.CheckCircle,
                    tintColor = DesignTokens.Green600,
                    backgroundColor = DesignTokens.Green600.copy(alpha = 0.1f)
                )

                HimVoteButton(
                    text = "Verify Inclusion Proof",
                    onClick = {
                        onNavigateToInclusionProof(receipt.electionId, receipt.receiptHandle)
                    },
                    contentDesc = "Inspect Merkle tree inclusion proof"
                )

                HimVoteButton(
                    text = "Return to Elections Overview",
                    onClick = onNavigateHome,
                    isSecondary = true
                )
            } ?: run {
                StatusBanner(
                    title = "No Receipt Located",
                    message = "No receipt was found in the secure hardware store for this election identifier.",
                    tintColor = DesignTokens.Amber600,
                    backgroundColor = DesignTokens.Amber600.copy(alpha = 0.1f)
                )
            }
        }
    }
}
