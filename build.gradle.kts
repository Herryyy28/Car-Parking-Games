plugins {
    id("com.android.application") version "8.3.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.23" apply false
    id("org.jetbrains.kotlin.jvm") version "1.9.23" apply false
}

extra["gdxVersion"] = "1.12.1"
extra["roboVMVersion"] = "2.3.20"
extra["box2DLightsVersion"] = "1.5"
extra["ashleyVersion"] = "1.7.4"
extra["aiVersion"] = "1.8.2"

tasks.register("clean", Delete::class) {
    delete(rootProject.layout.buildDirectory)
}
