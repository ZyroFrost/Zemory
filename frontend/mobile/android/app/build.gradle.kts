plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "zemory.phone.app"
    compileSdk = 34
    defaultConfig {
        applicationId = "zemory.phone"
        minSdk = 26
        targetSdk = 34
        versionCode = 6
        versionName = "0.5.0"
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            // a debug-signed release for side-loading; a real keystore comes with a store release
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    packaging {
        resources.excludes += setOf("META-INF/versions/9/OSGI-INF/MANIFEST.MF", "META-INF/*.SF", "META-INF/*.DSA", "META-INF/*.RSA")
    }
}

dependencies {
    // org.json is part of Android
    implementation(project(":core")) { exclude(group = "org.json") }
}
