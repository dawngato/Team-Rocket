package com.himvote.data.repository

import com.himvote.data.models.Candidate
import com.himvote.data.models.Election
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
                Result.success(response.body()!!.elections.map { item ->
                    item.toClientModel().copy(alreadyVoted = encryptedStorage.hasCastBallot(item.id))
                })
            } else {
                Result.failure(Exception("Election service returned HTTP ${response.code()}"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }

    suspend fun getElectionDetail(electionId: String): Result<Election> {
        return try {
            val response = apiService.getElectionDetail(electionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Election service returned HTTP ${response.code()}"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }

    suspend fun getCandidates(electionId: String): Result<List<Candidate>> {
        return try {
            val response = apiService.getCandidates(electionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.map { it.copy(electionId = electionId) })
            } else {
                Result.failure(Exception("Candidate service returned HTTP ${response.code()}"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }
}
