package com.snuker.overlay

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface

/**
 * JS ↔ Kotlin bridge (`window.SnukerBridge`).
 *
 * Contract used by `game.html` / `SnukerApp`:
 * - setMode("idle") → small floating window, touches pass through around it
 * - setMode("game") → full-screen window, touches captured
 * - exitOverlay()   → tear down overlay + stop service
 *
 * All callbacks are posted to the main thread.
 */
class OverlayJsBridge(
    private val onModeChanged: (mode: String) -> Unit,
    private val onExitOverlay: () -> Unit
) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun setMode(mode: String) {
        mainHandler.post { onModeChanged(mode) }
    }

    @JavascriptInterface
    fun exitOverlay() {
        mainHandler.post { onExitOverlay() }
    }

    companion object {
        const val MODE_IDLE = "idle"
        const val MODE_GAME = "game"
        const val JS_NAME = "SnukerBridge"
    }
}
