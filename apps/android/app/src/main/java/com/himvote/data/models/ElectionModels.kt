package com.himvote.data.models

enum class ElectionStatus(val label: String) {
    DRAFT("DRAFT"),
    FROZEN("FROZEN"),
    OPEN("OPEN"),
    PENDING_WITNESS("PENDING_WITNESS"),
    WITNESSED("WITNESSED"),
    ANCHOR_PENDING("ANCHOR_PENDING"),
    ANCHOR_FINALIZED("ANCHOR_FINALIZED"),
    AUDIT_PASSED("AUDIT_PASSED"),
    AUDITOR_ATTESTED("AUDITOR_ATTESTED"),
    FAILED("FAILED"),
    DISPUTED("DISPUTED");

    companion object {
        fun fromString(value: String): ElectionStatus {
            return entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: DRAFT
        }
    }
}

data class ElectionSummary(
    val id: String,
    val title: String,
    val description: String,
    val status: ElectionStatus,
    val startDate: String,
    val endDate: String,
    val department: String,
    val candidateCount: Int,
    val alreadyVoted: Boolean = false
)

data class Election(
    val id: String,
    val title: String,
    val description: String,
    val status: ElectionStatus,
    val startDate: String,
    val endDate: String,
    val department: String,
    val manifestHash: String,
    val minTurnoutThreshold: Int = 50,
    val eligibleVoterCount: Int = 0
)

data class Candidate(
    val id: String,
    val electionId: String,
    val name: String,
    val rollNumber: String,
    val department: String,
    val manifesto: String,
    val photoUrl: String? = null
)
