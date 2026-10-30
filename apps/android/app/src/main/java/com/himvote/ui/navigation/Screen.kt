package com.himvote.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Elections : Screen("elections")

    object CandidateDetail : Screen("candidate_detail/{electionId}") {
        fun createRoute(electionId: String): String = "candidate_detail/$electionId"
    }

    object Credential : Screen("credential/{electionId}") {
        fun createRoute(electionId: String): String = "credential/$electionId"
    }

    object Voting : Screen("voting/{electionId}") {
        fun createRoute(electionId: String): String = "voting/$electionId"
    }

    object Receipt : Screen("receipt/{electionId}") {
        fun createRoute(electionId: String): String = "receipt/$electionId"
    }

    object InclusionProof : Screen("inclusion/{electionId}/{receiptHandle}") {
        fun createRoute(electionId: String, receiptHandle: String): String =
            "inclusion/$electionId/$receiptHandle"
    }

    object Results : Screen("results/{electionId}") {
        fun createRoute(electionId: String): String = "results/$electionId"
    }
}
