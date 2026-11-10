# Snuker overlay — keep WebView JS bridge methods
-keepclassmembers class com.snuker.overlay.OverlayJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
