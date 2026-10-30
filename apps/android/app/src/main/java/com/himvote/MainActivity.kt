package com.himvote

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.lifecycleScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.himvote.data.repository.VotingRepository
import com.himvote.ui.navigation.HimVoteNavHost
import com.himvote.ui.navigation.Screen
import com.himvote.ui.theme.HimVoteTheme
import com.himvote.util.BoothReturnValidator
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Main activity hosting Jetpack Compose navigation.
 * Handles verified App Link intent returns from Chrome Custom Tab voting booth sessions.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var votingRepository: VotingRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val returnElectionId = intent?.data?.let { handleBoothReturnUri(it) }

        setContent {
            HimVoteTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    val startRoute = if (returnElectionId != null) {
                        Screen.Receipt.createRoute(returnElectionId)
                    } else {
                        Screen.Login.route
                    }
                    HimVoteNavHost(
                        navController = navController,
                        startDestination = startRoute
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.let { uri ->
            handleBoothReturnUri(uri)
        }
    }

    private fun handleBoothReturnUri(uri: Uri): String? {
        val payload = BoothReturnValidator.parse(uri) ?: return null

        lifecycleScope.launch {
            votingRepository.handleBoothReturn(
                electionId = payload.electionId,
                receiptHandle = payload.receiptHandle,
                ballotHash = payload.ballotHash
            )
        }
        return payload.electionId
    }
}
