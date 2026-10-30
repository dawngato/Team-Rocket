package com.himvote.data.network

import com.himvote.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface HimVoteApiService {

    @POST("v1/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @POST("v1/auth/logout")
    suspend fun logout(): Response<Unit>

    @POST("v1/auth/recover")
    suspend fun recoverAccount(
        @Body request: RecoveryRequest
    ): Response<RecoveryResponse>

    @GET("v1/elections")
    suspend fun getElections(): Response<List<ElectionSummary>>

    @GET("v1/elections/{id}")
    suspend fun getElectionDetail(
        @Path("id") electionId: String
    ): Response<Election>

    @GET("v1/elections/{id}/candidates")
    suspend fun getCandidates(
        @Path("id") electionId: String
    ): Response<List<Candidate>>

    @POST("v1/credentials/issue")
    suspend fun requestCredentialIssuance(
        @Body request: BlindedIssuanceRequest
    ): Response<BlindedIssuanceResponse>

    @GET("v1/credentials/issuance-status")
    suspend fun getIssuanceStatus(
        @Query("election_id") electionId: String
    ): Response<IssuanceStatusResponse>

    @POST("v1/cast/{election_id}/ballots")
    suspend fun castBallot(
        @Path("election_id") electionId: String,
        @Body request: CastBallotRequest
    ): Response<CastBallotResponse>

    @GET("v1/cast/{election_id}/receipts/{handle}")
    suspend fun getReceiptStatus(
        @Path("election_id") electionId: String,
        @Path("handle") receiptHandle: String
    ): Response<ReceiptStatusResponse>

    @GET("v1/elections/{id}/results")
    suspend fun getElectionResults(
        @Path("id") electionId: String
    ): Response<PublishedResults>
}
