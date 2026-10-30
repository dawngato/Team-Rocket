package com.himvote.ui.components

import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.util.DesignTokens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HimVoteTopBar(
    title: String,
    canNavigateBack: Boolean = false,
    onNavigateBack: (() -> Unit)? = null,
    onLogout: (() -> Unit)? = null
) {
    TopAppBar(
        title = {
            Text(
                text = title,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
                color = DesignTokens.CardWhite
            )
        },
        navigationIcon = {
            if (canNavigateBack && onNavigateBack != null) {
                IconButton(
                    onClick = onNavigateBack,
                    modifier = Modifier
                        .defaultMinSize(minWidth = DesignTokens.MinTouchTargetSize, minHeight = DesignTokens.MinTouchTargetSize)
                        .semantics {
                            contentDescription = "Navigate back"
                        }
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        tint = DesignTokens.CardWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        },
        actions = {
            if (onLogout != null) {
                IconButton(
                    onClick = onLogout,
                    modifier = Modifier
                        .defaultMinSize(minWidth = DesignTokens.MinTouchTargetSize, minHeight = DesignTokens.MinTouchTargetSize)
                        .semantics {
                            contentDescription = "Sign out from session"
                        }
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                        contentDescription = null,
                        tint = DesignTokens.CardWhite,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = DesignTokens.Navy900,
            titleContentColor = DesignTokens.CardWhite
        )
    )
}
