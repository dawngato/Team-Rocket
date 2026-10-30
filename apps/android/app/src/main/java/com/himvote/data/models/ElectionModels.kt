package com.himvote.data.models

import com.google.gson.annotations.SerializedName

enum class ElectionStatus(val label: String) {
    DRAFT("DRAFT"),
    REVIEW("REVIEW"),
    APPROVED("APPROVED"),
    FROZEN("FROZEN"),
    SCHEDULED("SCHEDULED"),
    OPEN("OPEN"),
    PAUSED("PAUSED"),
    CLOSING("CLOSING"),
    CLOSED("CLOSED"),
    FINAL_WITNESSED("FINAL_WITNESSED"),
    AUDITED("AUDITED"),
    CANCELLED("CANCELLED"),
    PENDING_WITNESS("PENDING_WITNESS"),
    WITNESSED("WITNESSED"),
    ANCHOR_PENDING("ANCHOR_PENDING"),
    ANCHOR_FINALIZED("ANCHOR_FINALIZED"),
    AUDIT_PASSED("AUDIT_PASSED"),
    AUDITOR_ATTESTED("AUDITOR_ATTESTED"),
    PUBLISHED("PUBLISHED"),
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

data class ElectionListResponse(
    val elections: List<ElectionSummaryResponse> = emptyList()
)

data class ElectionSummaryResponse(
    val id: String,
    val title: String,
    @SerializedName("state") val state: String,
    @SerializedName("opens_at_utc") val opensAtUtc: String,
    @SerializedName("closes_at_utc") val closesAtUtc: String
) {
    fun toClientModel(): ElectionSummary = ElectionSummary(
        id = id,
        title = title,
        description = "",
        status = ElectionStatus.fromString(state),
        startDate = opensAtUtc,
        endDate = closesAtUtc,
        department = "",
        candidateCount = 0
    )
}

data class Election(
    val id: String,
    val title: String,
    val description: String = "",
    @SerializedName("state") val status: ElectionStatus = ElectionStatus.DRAFT,
    @SerializedName("opens_at_utc") val startDate: String = "",
    @SerializedName("closes_at_utc") val endDate: String = "",
    val department: String = "",
    @SerializedName("manifest_digest") val manifestHash: String = "",
    val minTurnoutThreshold: Int = 50,
    @SerializedName("eligible_count") val eligibleVoterCount: Int = 0,
    val candidates: List<Candidate> = emptyList()
)

data class Candidate(
    val id: String,
    val name: String,
    @SerializedName("contest") val department: String = "",
    val electionId: String = "",
    val rollNumber: String = "",
    val manifesto: String = "",
    val photoUrl: String? = null
)
