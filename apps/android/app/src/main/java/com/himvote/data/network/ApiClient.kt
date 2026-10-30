package com.himvote.data.network

import com.himvote.data.storage.EncryptedStorage
import okhttp3.CertificatePinner
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * ApiClient handles network communication with HimVote services.
 * Implements strict Certificate Pinning on production hosts and automated Bearer token attachment.
 */
class ApiClient(
    private val encryptedStorage: EncryptedStorage,
    private val isDebug: Boolean = false,
    customBaseUrl: String? = null
) {
    companion object {
        const val PROD_BASE_URL = "https://api.himvote.example.in/"
        const val DEBUG_EMULATOR_URL = "http://10.0.2.2:8080/"

        // Certificate pins for production endpoints
        const val HOST_API = "api.himvote.example.in"
        const val HOST_CAST = "cast.himvote.example.in"
        const val PRIMARY_PIN = "sha256/WoiWRyIOVNa9ihaBciRSC7XHjliYS9VwUGOIud4PB18="
        const val BACKUP_PIN = "sha256/C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M="
    }

    val baseUrl: String = customBaseUrl ?: if (isDebug) DEBUG_EMULATOR_URL else PROD_BASE_URL

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val session = encryptedStorage.getSession()
        val requestBuilder = original.newBuilder()
            .header("Accept", "application/json")
            .header("User_Agent", "HimVote_Android_Native")

        if (session != null && !session.token.isBlank()) {
            requestBuilder.header("Authorization", "Bearer ${session.token}")
        }

        chain.proceed(requestBuilder.build())
    }

    private val securityValidationInterceptor = Interceptor { chain ->
        val request = chain.request()
        if (!isDebug && !request.url.isHttps) {
            throw SecurityException("Insecure cleartext connection prohibited in release mode")
        }
        chain.proceed(request)
    }

    val certificatePinner: CertificatePinner = CertificatePinner.Builder()
        .add(HOST_API, PRIMARY_PIN, BACKUP_PIN)
        .add(HOST_CAST, PRIMARY_PIN, BACKUP_PIN)
        .build()

    val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(securityValidationInterceptor)
        .apply {
            if (!isDebug) {
                certificatePinner(certificatePinner)
            }
        }
        .build()

    val retrofit: Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: HimVoteApiService = retrofit.create(HimVoteApiService::class.java)
}
