// Zemory phone (plan/41): `core` is plain JVM Kotlin (runs on the laptop against a real daemon), `app` is the Android shell.
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "zemory-phone"
include(":core", ":app")
