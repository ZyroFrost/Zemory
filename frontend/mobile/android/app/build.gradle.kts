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
        versionCode = 9
        versionName = "0.7.1"
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
    // the pairing QR a machine shows: Google's code scanner opens the camera in its own screen - no camera permission,
    // no scanner UI of ours (needs Google Play services, as on any stock Android phone)
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}
