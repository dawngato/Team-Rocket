package com.himvote.di

import com.himvote.data.network.ApiClient
import com.himvote.data.network.HimVoteApiService
import com.himvote.data.storage.EncryptedStorage
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideApiClient(
        encryptedStorage: EncryptedStorage
    ): ApiClient {
        // Debug mode enabled for local development host resolution
        return ApiClient(encryptedStorage = encryptedStorage, isDebug = true)
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(apiClient: ApiClient): OkHttpClient {
        return apiClient.okHttpClient
    }

    @Provides
    @Singleton
    fun provideCertificatePinner(apiClient: ApiClient): CertificatePinner {
        return apiClient.certificatePinner
    }

    @Provides
    @Singleton
    fun provideHimVoteApiService(apiClient: ApiClient): HimVoteApiService {
        return apiClient.apiService
    }
}
