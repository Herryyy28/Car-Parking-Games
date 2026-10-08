package com.trafficpuzzle.game.android

import android.os.Bundle
import com.badlogic.gdx.backends.android.AndroidApplication
import com.badlogic.gdx.backends.android.AndroidApplicationConfiguration
import com.trafficpuzzle.game.TrafficGame

/**
 * Android launcher entry point for the 3D Traffic Parking Puzzle game.
 * Initialises LibGDX with AndroidApplicationConfiguration and launches TrafficGame.
 */
class AndroidLauncher : AndroidApplication() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val config = AndroidApplicationConfiguration().apply {
            useAccelerometer = false
            useCompass = false
            useImmersiveMode = true
            // Enable 16-bit depth buffer for 3D rendering
            depth = 16
        }
        initialize(TrafficGame(), config)
    }
}
