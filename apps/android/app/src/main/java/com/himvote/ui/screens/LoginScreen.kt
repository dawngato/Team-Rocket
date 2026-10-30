package com.himvote.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.himvote.ui.components.HimVoteButton
import com.himvote.ui.components.StatusBanner
import com.himvote.util.AccessibilityHelpers.accessibleTouchTarget
import com.himvote.util.AccessibilityHelpers.talkBackHeading
import com.himvote.util.DesignTokens

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLoginSuccess: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val keyboardController = LocalSoftwareKeyboardController.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DesignTokens.SurfaceBg)
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.SpacingLarge),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.SpacingMedium)
    ) {
        Spacer(modifier = Modifier.height(DesignTokens.SpacingLarge))

        Box(
            modifier = Modifier
                .size(72.dp)
                .background(DesignTokens.Navy900, RoundedCornerShape(16.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Shield,
                contentDescription = null,
                tint = DesignTokens.CardWhite,
                modifier = Modifier.size(40.dp)
            )
        }

        Text(
            text = "HimVote",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = DesignTokens.Navy900,
            modifier = Modifier.talkBackHeading()
        )

        Text(
            text = "Institutional Election Platform\nHimachal Pradesh Technical University",
            fontSize = 14.sp,
            color = DesignTokens.TextPrimary.copy(alpha = 0.75f),
            lineHeight = 20.sp,
            modifier = Modifier.semantics {
                contentDescription = "HimVote institutional election platform for Himachal Pradesh Technical University"
            }
        )

        Spacer(modifier = Modifier.height(DesignTokens.SpacingSmall))

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
                    text = "Sign In with University ID",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.Navy900
                )

                OutlinedTextField(
                    value = state.email,
                    onValueChange = { viewModel.onEmailChanged(it) },
                    label = { Text("University Email") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = null,
                            tint = DesignTokens.Navy900
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibleTouchTarget()
                        .semantics {
                            contentDescription = "Input university email address"
                        },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )
                )

                OutlinedTextField(
                    value = state.password,
                    onValueChange = { viewModel.onPasswordChanged(it) },
                    label = { Text("Password") },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = DesignTokens.Navy900
                        )
                    },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .accessibleTouchTarget()
                        .semantics {
                            contentDescription = "Input account password"
                        },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            keyboardController?.hide()
                            viewModel.login(onLoginSuccess)
                        }
                    )
                )

                if (state.errorMessage != null) {
                    StatusBanner(
                        title = "Authentication Notice",
                        message = state.errorMessage!!,
                        tintColor = DesignTokens.Red600,
                        backgroundColor = DesignTokens.Red600.copy(alpha = 0.1f)
                    )
                }

                HimVoteButton(
                    text = "Sign In",
                    onClick = {
                        keyboardController?.hide()
                        viewModel.login(onLoginSuccess)
                    },
                    isLoading = state.isLoading,
                    contentDesc = "Submit credentials and sign in"
                )

                HimVoteButton(
                    text = "Use Quick Demo Student Credentials",
                    onClick = { viewModel.populateDemoCredentials() },
                    isSecondary = true,
                    contentDesc = "Fill demo student credentials"
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Text(
            text = "Keystore Backed Hardware Security • Excluded From Backup",
            fontSize = 11.sp,
            color = DesignTokens.TextPrimary.copy(alpha = 0.6f),
            fontWeight = FontWeight.Medium
        )
    }
}
