plugins {
    id("org.jetbrains.kotlin.jvm")
    application
}

kotlin { jvmToolchain(17) }

dependencies {
    // TLS 1.3 with Ed25519 certificates (the channel's identity) - the platform TLS cannot be relied on for that
    api("org.bouncycastle:bcprov-jdk18on:1.78.1")
    api("org.bouncycastle:bcpkix-jdk18on:1.78.1")
    api("org.bouncycastle:bctls-jdk18on:1.78.1")
    // Android ships org.json; the JVM build needs it as a library (the app module excludes it)
    implementation("org.json:json:20240303")
    testImplementation(kotlin("test"))
}

// desktop runner: drive the same client the phone uses against a real machine
application { mainClass.set("zemory.phone.CliKt") }

tasks.test { useJUnitPlatform() }
