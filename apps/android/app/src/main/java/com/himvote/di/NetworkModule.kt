package com.himvote.di

import com.himvote.BuildConfig
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
        // Release builds must use the pinned HTTPS production origin. Debug
        // routing is derived from the build variant, never from a hardcoded
        // value that can accidentally ship in a release artifact.
        return ApiClient(
            encryptedStorage = encryptedStorage,
            isDebug = BuildConfig.DEBUG,
            customBaseUrl = BuildConfig.API_BASE_URL.takeIf { it.isNotBlank() },
        )
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
