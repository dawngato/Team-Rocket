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
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import com.himvote.util.StateBadge

@Composable
fun ResultsScreen(
    viewModel: ResultsViewModel,
    onNavigateBack: () -> Unit,
    onNavigateHome: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var copiedLabel by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            HimVoteTopBar(
                title = "Published Election Results",
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
            if (state.isLoading && state.results == null) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = DesignTokens.Teal600
                )
            } else {
                state.results?.let { res ->
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
                                .background(DesignTokens.Teal600, RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Assessment,
                                contentDescription = null,
                                tint = DesignTokens.CardWhite,
                                modifier = Modifier.size(36.dp)
                            )
                        }

                        Text(
                            text = res.electionTitle,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = DesignTokens.Navy900,
                            modifier = Modifier.talkBackHeading()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            StateBadge(status = res.status)

                            Text(
                                text = "Turnout: ${"%.1f".format(res.turnoutPercentage)}%",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = DesignTokens.Navy900
                            )
                        }

                        // Turnout statistics card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                            colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(DesignTokens.SpacingMedium),
                                horizontalArrangement = Arrangement.SpaceAround,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "Total Ballots Submitted",
                                        fontSize = 12.sp,
                                        color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                    )
                                    Text(
                                        text = "${res.totalVotesCast}",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Navy900
                                    )
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "Eligible Voters",
                                        fontSize = 12.sp,
                                        color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                    )
                                    Text(
                                        text = "${res.totalEligibleVoters}",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Navy900
                                    )
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "Independent Audit",
                                        fontSize = 12.sp,
                                        color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                    )
                                    Text(
                                        text = "Not verified",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Green600
                                    )
                                }
                            }
                        }

                        if (res.privacyLimited) {
                            StatusBanner(
                                title = "Identity and Ballot Separation Threshold Active",
                                message = "The results service reports that turnout is below its privacy threshold, so candidate totals are not shown here. This screen does not independently verify the threshold or privacy outcome.",
                                icon = Icons.Default.Lock,
                                tintColor = DesignTokens.Amber600,
                                backgroundColor = DesignTokens.Amber600.copy(alpha = 0.1f)
                            )
                        } else {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(DesignTokens.CardCornerRadius),
                                colors = CardDefaults.cardColors(containerColor = DesignTokens.CardWhite),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(DesignTokens.SpacingMedium),
                                    verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
                                ) {
                                    Text(
                                        text = "Published Ballot Tallies",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = DesignTokens.Navy900
                                    )

                                    res.tallies.forEach { tally ->
                                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Column {
                                                    Text(
                                                        text = tally.candidateName,
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = DesignTokens.Navy900
                                                    )
                                                    Text(
                                                        text = tally.department,
                                                        fontSize = 11.sp,
                                                        color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                                    )
                                                }
                                                Text(
                                                    text = "${tally.votesReceived} votes (${"%.1f".format(tally.percentage)}%)",
                                                    fontSize = 13.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = DesignTokens.Teal600
                                                )
                                            }

                                            LinearProgressIndicator(
                                                progress = { (tally.percentage / 100.0).toFloat() },
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .height(8.dp),
                                                color = DesignTokens.Teal600,
                                                trackColor = DesignTokens.SurfaceBg
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Cryptographic Attestation Card
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
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Shield,
                                            contentDescription = null,
                                            tint = DesignTokens.Green600,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Text(
                                            text = "Service-Reported Audit Attestation",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = DesignTokens.Green600
                                        )
                                    }

                                    IconButton(
                                        enabled = res.auditAttestation != null,
                                        onClick = {
                                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                            val clip = ClipData.newPlainText("Attestation", res.auditAttestation ?: "")
                                            clipboard.setPrimaryClip(clip)
                                            copiedLabel = "Attestation"
                                        }
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ContentCopy,
                                            contentDescription = "Copy auditor attestation",
                                            tint = DesignTokens.Teal600,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Text(
                                    text = res.auditAttestation ?: "No attestation reported by the results service",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = DesignTokens.TextPrimary.copy(alpha = 0.8f)
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
                                        text = "Reported Anchor Transaction Reference",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = DesignTokens.TextPrimary.copy(alpha = 0.6f)
                                    )

                                    IconButton(
                                        enabled = res.chainAnchorTx != null,
                                        onClick = {
                                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                            val clip = ClipData.newPlainText("Anchor Tx", res.chainAnchorTx ?: "")
                                            clipboard.setPrimaryClip(clip)
                                            copiedLabel = "Anchor Transaction"
                                        }
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ContentCopy,
                                            contentDescription = "Copy chain anchor transaction",
                                            tint = DesignTokens.Teal600,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Text(
                                    text = res.chainAnchorTx ?: "No blockchain transaction reported by the results service",
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = DesignTokens.Teal600
                                )
                            }
                        }

                        if (copiedLabel != null) {
                            StatusBanner(
                                title = "Copied to Clipboard",
                                message = "$copiedLabel has been copied to your system clipboard.",
                                icon = Icons.Default.Verified,
                                tintColor = DesignTokens.Teal600,
                                backgroundColor = DesignTokens.Teal600.copy(alpha = 0.1f)
                            )
                        }

                        HimVoteButton(
                            text = "Back to Elections Overview",
                            onClick = onNavigateHome
                        )
                    }
                }
            }
        }
    }
}
