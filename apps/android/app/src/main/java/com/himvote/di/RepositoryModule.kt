package com.himvote.di

import com.himvote.data.network.HimVoteApiService
import com.himvote.data.repository.*
import com.himvote.data.storage.EncryptedStorage
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(
        apiService: HimVoteApiService,
        encryptedStorage: EncryptedStorage
    ): AuthRepository {
        return AuthRepository(apiService, encryptedStorage)
    }

    @Provides
    @Singleton
    fun provideElectionRepository(
        apiService: HimVoteApiService,
        encryptedStorage: EncryptedStorage
    ): ElectionRepository {
        return ElectionRepository(apiService, encryptedStorage)
    }

    @Provides
    @Singleton
    fun provideCredentialRepository(
        apiService: HimVoteApiService,
        encryptedStorage: EncryptedStorage
    ): CredentialRepository {
        return CredentialRepository(apiService, encryptedStorage)
    }

    @Provides
    @Singleton
    fun provideVotingRepository(
        apiService: HimVoteApiService,
        encryptedStorage: EncryptedStorage
    ): VotingRepository {
        return VotingRepository(apiService, encryptedStorage)
    }

    @Provides
    @Singleton
    fun provideResultsRepository(
        apiService: HimVoteApiService
    ): ResultsRepository {
        return ResultsRepository(apiService)
    }
}
