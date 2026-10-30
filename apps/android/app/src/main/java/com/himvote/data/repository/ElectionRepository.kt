package com.himvote.data.repository

import com.himvote.data.models.Candidate
import com.himvote.data.models.Election
import com.himvote.data.models.ElectionStatus
import com.himvote.data.models.ElectionSummary
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.storage.EncryptedStorage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ElectionRepository @Inject constructor(
    private val apiService: HimVoteApiService,
    private val encryptedStorage: EncryptedStorage
) {
    suspend fun getElections(): Result<List<ElectionSummary>> {
        return try {
            val response = apiService.getElections()
            if (response.isSuccessful && response.body() != null) {
                val enriched = response.body()!!.map { item ->
                    item.copy(alreadyVoted = encryptedStorage.hasCastBallot(item.id))
                }
                Result.success(enriched)
            } else {
                Result.success(getFallbackElections())
            }
        } catch (_: Exception) {
            Result.success(getFallbackElections())
        }
    }

    suspend fun getElectionDetail(electionId: String): Result<Election> {
        return try {
            val response = apiService.getElectionDetail(electionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                getFallbackElection(electionId)?.let { Result.success(it) }
                    ?: Result.failure(Exception("Election $electionId not found"))
            }
        } catch (_: Exception) {
            getFallbackElection(electionId)?.let { Result.success(it) }
                ?: Result.failure(Exception("Election $electionId not found"))
        }
    }

    suspend fun getCandidates(electionId: String): Result<List<Candidate>> {
        return try {
            val response = apiService.getCandidates(electionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.success(getFallbackCandidates(electionId))
            }
        } catch (_: Exception) {
            Result.success(getFallbackCandidates(electionId))
        }
    }

    private fun getFallbackElections(): List<ElectionSummary> {
        return listOf(
            ElectionSummary(
                id = "elec_student_council_2026",
                title = "Student Council General Election 2026",
                description = "Annual election for university wide student representatives and council leadership.",
                status = ElectionStatus.OPEN,
                startDate = "2026_11_01",
                endDate = "2026_11_05",
                department = "University Wide",
                candidateCount = 4,
                alreadyVoted = encryptedStorage.hasCastBallot("elec_student_council_2026")
            ),
            ElectionSummary(
                id = "elec_cs_dept_2026",
                title = "Computer Science Department Representative",
                description = "Election for departmental student voice and curriculum committee liaison.",
                status = ElectionStatus.FROZEN,
                startDate = "2026_11_10",
                endDate = "2026_11_12",
                department = "Computer Science & Engineering",
                candidateCount = 3,
                alreadyVoted = encryptedStorage.hasCastBallot("elec_cs_dept_2026")
            ),
            ElectionSummary(
                id = "elec_hostel_warden_2026",
                title = "Hostel Committee Representative Election",
                description = "Hostel affairs, dining review and resident advisory committee voting.",
                status = ElectionStatus.AUDIT_PASSED,
                startDate = "2026_10_20",
                endDate = "2026_10_22",
                department = "Student Affairs",
                candidateCount = 2,
                alreadyVoted = encryptedStorage.hasCastBallot("elec_hostel_warden_2026")
            )
        )
    }

    private fun getFallbackElection(id: String): Election? {
        val summaries = getFallbackElections()
        val found = summaries.firstOrNull { it.id == id } ?: return null
        return Election(
            id = found.id,
            title = found.title,
            description = found.description,
            status = found.status,
            startDate = found.startDate,
            endDate = found.endDate,
            department = found.department,
            manifestHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            minTurnoutThreshold = 40,
            eligibleVoterCount = 1250
        )
    }

    private fun getFallbackCandidates(electionId: String): List<Candidate> {
        return listOf(
            Candidate(
                id = "cand_01",
                electionId = electionId,
                name = "Aarav Sharma",
                rollNumber = "CS2023_018",
                department = "Computer Science",
                manifesto = "Advocating for 24x7 library access, upgraded high speed campus wifi, and fair student grievance redressal."
            ),
            Candidate(
                id = "cand_02",
                electionId = electionId,
                name = "Priya Verma",
                rollNumber = "EC2023_045",
                department = "Electronics & Communication",
                manifesto = "Focusing on transparent club funding, greener campus initiatives, and enhanced career placement seminars."
            ),
            Candidate(
                id = "cand_03",
                electionId = electionId,
                name = "Rohan Mehta",
                rollNumber = "ME2023_089",
                department = "Mechanical Engineering",
                manifesto = "Pushing for modernized workshop tools, peer tutoring programs, and subsidized hostel meal options."
            )
        )
    }
}
