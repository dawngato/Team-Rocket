package com.himvote.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.himvote.ui.screens.*

@Composable
fun HimVoteNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
    startDestination: String = Screen.Login.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Screen.Login.route) {
            val viewModel: LoginViewModel = hiltViewModel()
            LoginScreen(
                viewModel = viewModel,
                onLoginSuccess = {
                    navController.navigate(Screen.Elections.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Elections.route) {
            val viewModel: ElectionsViewModel = hiltViewModel()
            ElectionsScreen(
                viewModel = viewModel,
                onElectionSelected = { electionId ->
                    navController.navigate(Screen.CandidateDetail.createRoute(electionId))
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.CandidateDetail.route,
            arguments = listOf(navArgument("electionId") { type = NavType.StringType })
        ) {
            val viewModel: CandidateDetailViewModel = hiltViewModel()
            CandidateDetailScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCredential = { id ->
                    navController.navigate(Screen.Credential.createRoute(id))
                },
                onNavigateToVoting = { id ->
                    navController.navigate(Screen.Voting.createRoute(id))
                },
                onNavigateToReceipt = { id ->
                    navController.navigate(Screen.Receipt.createRoute(id))
                },
                onNavigateToResults = { id ->
                    navController.navigate(Screen.Results.createRoute(id))
                }
            )
        }

        composable(
            route = Screen.Credential.route,
            arguments = listOf(navArgument("electionId") { type = NavType.StringType })
        ) {
            val viewModel: CredentialViewModel = hiltViewModel()
            CredentialScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onProceedToVoting = { id ->
                    navController.navigate(Screen.Voting.createRoute(id))
                }
            )
        }

        composable(
            route = Screen.Voting.route,
            arguments = listOf(navArgument("electionId") { type = NavType.StringType })
        ) {
            val viewModel: VotingViewModel = hiltViewModel()
            VotingScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToReceipt = { id ->
                    navController.navigate(Screen.Receipt.createRoute(id)) {
                        popUpTo(Screen.Elections.route)
                    }
                }
            )
        }

        composable(
            route = Screen.Receipt.route,
            arguments = listOf(navArgument("electionId") { type = NavType.StringType })
        ) {
            val viewModel: ReceiptViewModel = hiltViewModel()
            ReceiptScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToInclusionProof = { id, handle ->
                    navController.navigate(Screen.InclusionProof.createRoute(id, handle))
                },
                onNavigateHome = {
                    navController.navigate(Screen.Elections.route) {
                        popUpTo(Screen.Elections.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.InclusionProof.route,
            arguments = listOf(
                navArgument("electionId") { type = NavType.StringType },
                navArgument("receiptHandle") { type = NavType.StringType }
            )
        ) {
            val viewModel: InclusionProofViewModel = hiltViewModel()
            InclusionProofScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateToResults = { id ->
                    navController.navigate(Screen.Results.createRoute(id))
                }
            )
        }

        composable(
            route = Screen.Results.route,
            arguments = listOf(navArgument("electionId") { type = NavType.StringType })
        ) {
            val viewModel: ResultsViewModel = hiltViewModel()
            ResultsScreen(
                viewModel = viewModel,
                onNavigateBack = { navController.popBackStack() },
                onNavigateHome = {
                    navController.navigate(Screen.Elections.route) {
                        popUpTo(Screen.Elections.route) { inclusive = true }
                    }
                }
            )
        }
    }
}
