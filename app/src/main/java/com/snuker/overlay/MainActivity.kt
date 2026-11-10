package com.snuker.overlay

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
 * Permission gate + overlay launch entry point.
 * Center "חדש" button returns an active game to the floating 8-ball.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var overlaySettingsButton: Button
    private lateinit var newGameButton: Button

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            refreshStatus()
        }

    private val overlayStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == OverlayService.ACTION_STATE_CHANGED) {
                refreshNewGameButton()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Lock portrait (also declared in Manifest)
        requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT

        statusText = findViewById(R.id.statusText)
        startButton = findViewById(R.id.startButton)
        overlaySettingsButton = findViewById(R.id.overlaySettingsButton)
        newGameButton = findViewById(R.id.newGameButton)

        startButton.setOnClickListener { onStartOverlayClicked() }
        overlaySettingsButton.setOnClickListener { openOverlaySettings() }
        newGameButton.setOnClickListener { onNewGameClicked() }

        ensureNotificationPermission()
        refreshStatus()
        refreshNewGameButton()
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(OverlayService.ACTION_STATE_CHANGED)
        ContextCompat.registerReceiver(
            this,
            overlayStateReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        refreshNewGameButton()
    }

    override fun onStop() {
        unregisterReceiver(overlayStateReceiver)
        super.onStop()
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
        refreshNewGameButton()
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

    private fun onNewGameClicked() {
        if (!OverlayService.isGameActive) return
        val intent = Intent(this, OverlayService::class.java).apply {
            action = OverlayService.ACTION_RETURN_IDLE
        }
        ContextCompat.startForegroundService(this, intent)
        Toast.makeText(this, R.string.game_returned_idle, Toast.LENGTH_SHORT).show()
        refreshNewGameButton()
    }

    private fun refreshNewGameButton() {
        val active = OverlayService.isGameActive
        newGameButton.isEnabled = active
        if (active) {
            newGameButton.backgroundTintList =
                ContextCompat.getColorStateList(this, R.color.btn_new_enabled)
            newGameButton.setTextColor(
                ContextCompat.getColor(this, R.color.btn_new_text_enabled)
            )
        } else {
            newGameButton.backgroundTintList =
                ContextCompat.getColorStateList(this, R.color.btn_new_disabled)
            newGameButton.setTextColor(
                ContextCompat.getColor(this, R.color.btn_new_text_disabled)
            )
        }
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
