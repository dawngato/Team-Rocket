package com.himvote.data.models

data class CandidateTally(
    val candidateId: String,
    val candidateName: String,
    val department: String,
    val votesReceived: Int,
    val percentage: Double
)

data class PublishedResults(
    val electionId: String,
    val electionTitle: String,
    val status: ElectionStatus,
    val totalVotesCast: Int,
    val totalEligibleVoters: Int,
    val turnoutPercentage: Double,
    val privacyLimited: Boolean,
    val tallies: List<CandidateTally>,
    val auditAttestation: String? = null,
    val finalWitness: String? = null,
    val chainAnchorTx: String? = null
)
