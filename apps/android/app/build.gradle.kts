plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("kotlin-kapt")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.himvote"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.himvote"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "2.0.0"
    }
    val boothBaseUrl = providers.gradleProperty("himvote.boothBaseUrl").orElse("").get()
    val returnUrl = providers.gradleProperty("himvote.returnUrl").orElse("").get()
    val returnHost = providers.gradleProperty("himvote.returnHost").orElse("").get()
    if (boothBaseUrl.isBlank() || returnUrl.isBlank() || returnHost.isBlank()) {
        logger.warn("HimVote booth App Link values are not configured; debug builds will not launch a real booth.")
    }
    buildTypes {
        release {
            buildConfigField("String", "BOOTH_BASE_URL", "\"${boothBaseUrl.replace("\"", "\\\"")}\"")
            buildConfigField("String", "APP_LINK_RETURN_URL", "\"${returnUrl.replace("\"", "\\\"")}\"")
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
        }
        debug {
            buildConfigField("String", "BOOTH_BASE_URL", "\"${boothBaseUrl.replace("\"", "\\\"")}\"")
            buildConfigField("String", "APP_LINK_RETURN_URL", "\"${returnUrl.replace("\"", "\\\"")}\"")
            applicationIdSuffix = ".debug"
        }
    }
    gradle.taskGraph.whenReady {
        if (allTasks.any { it.name.contains("Release", ignoreCase = true) }) {
            if (boothBaseUrl.isBlank() || returnUrl.isBlank() || returnHost.isBlank()) {
                throw GradleException("Configure himvote.boothBaseUrl, himvote.returnUrl, and himvote.returnHost for release builds")
            }
        }
    }
    defaultConfig.manifestPlaceholders["himvoteReturnHost"] = returnHost
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.0")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui:1.6.0")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("androidx.compose.material:material-icons-extended:1.6.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.0")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("com.google.dagger:hilt-android:2.51.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    kapt("com.google.dagger:hilt-compiler:2.51.1")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.11.0")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
}
