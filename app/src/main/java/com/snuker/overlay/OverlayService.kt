package com.snuker.overlay

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.NotificationCompat

/**
 * Foreground overlay host:
 * - Idle: small floating window → touches outside pass through to the phone
 * - Game: full-screen transparent WebView → touches captured
 */
class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var webView: WebView? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var overlayAttached = false
    private var currentMode: String = OverlayJsBridge.MODE_IDLE

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        isRunning = true
        isGameActive = false
        attachOverlay()
        publishState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                tearDownAndStop()
                return START_NOT_STICKY
            }
            ACTION_RETURN_IDLE -> {
                returnToIdle()
                return START_STICKY
            }
        }
        if (!overlayAttached) {
            attachOverlay()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        removeOverlay()
        isRunning = false
        isGameActive = false
        publishState()
        super.onDestroy()
    }

    private fun tearDownAndStop() {
        removeOverlay()
        isRunning = false
        isGameActive = false
        publishState()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    /** Stop gameplay and restore the floating 8-ball (idle overlay). */
    private fun returnToIdle() {
        if (!overlayAttached) return
        // Classic Pool may be on pool/index.html — always bounce to idle shell.
        webView?.evaluateJavascript(
            """
            (function () {
              try {
                if (window.SnukerBridge && window.SnukerBridge.setMode) {
                  window.SnukerBridge.setMode('idle');
                }
              } catch (e) {}
              window.location.href = 'file:///android_asset/game.html';
            })();
            """.trimIndent(),
            null
        )
        applyTouchMode(OverlayJsBridge.MODE_IDLE)
    }

    private fun publishState() {
        sendBroadcast(
            Intent(ACTION_STATE_CHANGED).setPackage(packageName)
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun attachOverlay() {
        if (overlayAttached) return

        val params = buildLayoutParams(idle = true)
        layoutParams = params

        val view = WebView(this).apply {
            setBackgroundColor(Color.TRANSPARENT)
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            isLongClickable = false
            isHapticFeedbackEnabled = false

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                // Keep portrait game stable on density changes
                useWideViewPort = true
                loadWithOverviewMode = true
                displayZoomControls = false
                builtInZoomControls = false
                setSupportZoom(false)
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    // Ensure native starts in idle touch-through window
                    applyTouchMode(OverlayJsBridge.MODE_IDLE)
                }
            }
            webChromeClient = WebChromeClient()

            addJavascriptInterface(
                OverlayJsBridge(
                    onModeChanged = { mode -> applyTouchMode(mode) },
                    onExitOverlay = { tearDownAndStop() }
                ),
                OverlayJsBridge.JS_NAME
            )

            loadUrl(ASSET_GAME_URL)
        }

        webView = view
        windowManager.addView(view, params)
        overlayAttached = true
        currentMode = OverlayJsBridge.MODE_IDLE
    }

    private fun removeOverlay() {
        val view = webView ?: return
        try {
            if (overlayAttached) {
                windowManager.removeView(view)
            }
        } catch (_: IllegalArgumentException) {
            // Already detached
        }
        view.removeJavascriptInterface(OverlayJsBridge.JS_NAME)
        view.destroy()
        webView = null
        layoutParams = null
        overlayAttached = false
    }

    /**
     * Idle → small window (pass-through around it).
     * Game → full screen (capture all touches).
     */
    private fun applyTouchMode(mode: String) {
        val normalized = mode.lowercase().trim()
        if (normalized != OverlayJsBridge.MODE_IDLE &&
            normalized != OverlayJsBridge.MODE_GAME
        ) {
            return
        }
        if (!overlayAttached) return
        if (normalized == currentMode && layoutParams != null) {
            // Still refresh params in case of first attach race
        }

        val idle = normalized == OverlayJsBridge.MODE_IDLE
        val params = buildLayoutParams(idle = idle)
        layoutParams = params
        currentMode = normalized
        isGameActive = !idle
        publishState()

        try {
            webView?.let { view ->
                windowManager.updateViewLayout(view, params)
                view.requestLayout()
                // Notify page so later game canvas can resize with the window
                view.evaluateJavascript(
                    "window.dispatchEvent(new Event('resize'));",
                    null
                )
            }
        } catch (_: IllegalArgumentException) {
            // View not attached yet
        }
    }

    private fun buildLayoutParams(idle: Boolean): WindowManager.LayoutParams {
        val type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY

        val flags = (
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
            )

        val params = if (idle) {
            WindowManager.LayoutParams(
                dp(IDLE_SIZE_DP),
                dp(IDLE_SIZE_DP),
                type,
                flags,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                x = dp(IDLE_MARGIN_DP)
                y = dp(IDLE_TOP_DP)
            }
        } else {
            WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                flags,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = 0
                y = 0
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            params.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        return params
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.notification_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = getString(R.string.notification_channel_desc)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val contentPending = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, OverlayService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(contentPending)
            .addAction(0, getString(R.string.notification_stop), stopPending)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "snuker_overlay"
        const val NOTIFICATION_ID = 1001
        const val ACTION_STOP = "com.snuker.overlay.ACTION_STOP"
        const val ACTION_RETURN_IDLE = "com.snuker.overlay.ACTION_RETURN_IDLE"
        const val ACTION_STATE_CHANGED = "com.snuker.overlay.ACTION_STATE_CHANGED"

        @Volatile
        var isRunning: Boolean = false
            private set

        @Volatile
        var isGameActive: Boolean = false
            private set

        private const val ASSET_GAME_URL = "file:///android_asset/game.html"
        /** Matches the floating 8-ball hit target (Stage 3). */
        private const val IDLE_SIZE_DP = 96
        private const val IDLE_MARGIN_DP = 14
        private const val IDLE_TOP_DP = 120
    }
}
