package com.himvote.data.repository

import com.himvote.data.models.PublishedResults
import com.himvote.data.network.HimVoteApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ResultsRepository @Inject constructor(
    private val apiService: HimVoteApiService
) {
    suspend fun getElectionResults(electionId: String): Result<PublishedResults> {
        return try {
            val response = apiService.getElectionResults(electionId)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.toClientModel(electionId))
            } else {
                Result.failure(Exception("Results service returned HTTP ${response.code()}"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        }
    }
}
