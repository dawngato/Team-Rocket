package com.himvote.data.models

import com.google.gson.annotations.SerializedName

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

data class PublishedResultsResponse(
    @SerializedName("election_id") val electionId: String,
    @SerializedName("manifest_digest") val manifestDigest: String,
    val tally: Map<String, Double> = emptyMap(),
    @SerializedName("total_ballots") val totalBallots: Int,
    @SerializedName("published_at_utc") val publishedAtUtc: String,
    @SerializedName("privacy_limited") val privacyLimited: Boolean = false
) {
    fun toClientModel(requestedElectionId: String): PublishedResults {
        val voteTotal = tally.values.sum().toInt()
        val tallies = tally.entries.map { (candidateId, votes) ->
            CandidateTally(
                candidateId = candidateId,
                candidateName = candidateId,
                department = "",
                votesReceived = votes.toInt(),
                percentage = if (voteTotal == 0) 0.0 else votes * 100.0 / voteTotal
            )
        }
        return PublishedResults(
            electionId = electionId.ifBlank { requestedElectionId },
            electionTitle = electionId.ifBlank { requestedElectionId },
            status = ElectionStatus.PUBLISHED,
            totalVotesCast = totalBallots,
            totalEligibleVoters = 0,
            turnoutPercentage = 0.0,
            privacyLimited = privacyLimited,
            tallies = tallies
        )
    }
}
