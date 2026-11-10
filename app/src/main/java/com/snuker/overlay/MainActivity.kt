package com.snuker.overlay

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Stage 1 scaffold: permission gate + service launch entry point.
 * Overlay WebView / touch logic lands in later stages.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var overlaySettingsButton: Button

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            refreshStatus()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Lock portrait (also declared in Manifest)
        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        statusText = findViewById(R.id.statusText)
        startButton = findViewById(R.id.startButton)
        overlaySettingsButton = findViewById(R.id.overlaySettingsButton)

        startButton.setOnClickListener { onStartOverlayClicked() }
        overlaySettingsButton.setOnClickListener { openOverlaySettings() }

        ensureNotificationPermission()
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun ensureNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(this)

    private fun openOverlaySettings() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName")
        )
        startActivity(intent)
    }

    private fun onStartOverlayClicked() {
        if (!canDrawOverlays()) {
            Toast.makeText(
                this,
                R.string.overlay_permission_required,
                Toast.LENGTH_LONG
            ).show()
            openOverlaySettings()
            return
        }

        val intent = Intent(this, OverlayService::class.java)
        ContextCompat.startForegroundService(this, intent)
        Toast.makeText(this, R.string.overlay_started, Toast.LENGTH_SHORT).show()
        // Move task to background so user sees their phone + overlay
        moveTaskToBack(true)
    }

    private fun refreshStatus() {
        val overlayOk = canDrawOverlays()
        val notifOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        statusText.text = buildString {
            append(getString(R.string.status_overlay, if (overlayOk) "OK" else "MISSING"))
            append('\n')
            append(getString(R.string.status_notification, if (notifOk) "OK" else "MISSING"))
        }
        startButton.isEnabled = overlayOk
    }
}
