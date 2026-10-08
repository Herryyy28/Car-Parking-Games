package com.trafficpuzzle.game.android

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Native Android Launcher Activity for Bus Game 3D.
 * Hosts a hardware-accelerated WebGL viewport running the full 3D game
 * with 60 FPS graphics, touch physics, and audio.
 */
class AndroidLauncher : Activity() {

    private lateinit var webView: WebView
    private lateinit var errorLayout: LinearLayout
    private val gameUrl = "http://localhost:3000"

    private var hasPageError = false
    private val retryHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val autoRetryRunnable = object : Runnable {
        override fun run() {
            if (hasPageError && !isFinishing) {
                hasPageError = false
                webView.loadUrl(gameUrl)
                retryHandler.postDelayed(this, 3000)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Hardware acceleration & full-screen immersive mode
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )

        hideSystemUI()

        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0a101d"))
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0a101d"))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                useWideViewPort = true
                loadWithOverviewMode = true
                allowFileAccess = true
                allowContentAccess = true
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    android.util.Log.d("WebGame", "${consoleMessage?.message()} -- line ${consoleMessage?.lineNumber()}")
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    hasPageError = false
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    if (request?.isForMainFrame == true) {
                        hasPageError = true
                        showErrorScreen()
                    }
                }

                @Suppress("DEPRECATION")
                override fun onReceivedError(
                    view: WebView?,
                    errorCode: Int,
                    description: String?,
                    failingUrl: String?
                ) {
                    hasPageError = true
                    showErrorScreen()
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    if (!hasPageError) {
                        retryHandler.removeCallbacks(autoRetryRunnable)
                        errorLayout.visibility = View.GONE
                        webView.visibility = View.VISIBLE
                    }
                }
            }
        }

        // Connection helper screen in case server isn't reached yet
        errorLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0a101d"))
            setPadding(48, 48, 48, 48)
            visibility = View.GONE

            val title = TextView(this@AndroidLauncher).apply {
                text = "BUS GAME 3D"
                textSize = 28f
                setTextColor(Color.parseColor("#facc15"))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                gravity = android.view.Gravity.CENTER
            }

            val subtitle = TextView(this@AndroidLauncher).apply {
                text = "Live dev server not reachable.\nPlay offline or connect via USB with 'run-live-device.ps1'."
                textSize = 14f
                setTextColor(Color.parseColor("#94a3b8"))
                gravity = android.view.Gravity.CENTER
                setPadding(0, 24, 0, 32)
            }

            val playOfflineBtn = Button(this@AndroidLauncher).apply {
                text = "⚡ PLAY OFFLINE NOW"
                setBackgroundColor(Color.parseColor("#059669"))
                setTextColor(Color.WHITE)
                textSize = 16f
                typeface = android.graphics.Typeface.DEFAULT_BOLD
                setPadding(32, 18, 32, 18)
                setOnClickListener {
                    hasPageError = false
                    errorLayout.visibility = View.GONE
                    webView.loadUrl("file:///android_asset/web/index.html")
                }
            }

            val retryBtn = Button(this@AndroidLauncher).apply {
                text = "🔄 RETRY LIVE SERVER (:3000)"
                setBackgroundColor(Color.parseColor("#0284c7"))
                setTextColor(Color.WHITE)
                textSize = 14f
                setPadding(32, 14, 32, 14)
                setOnClickListener {
                    hasPageError = false
                    errorLayout.visibility = View.GONE
                    webView.loadUrl(gameUrl)
                }
            }

            val space = View(this@AndroidLauncher).apply {
                layoutParams = LinearLayout.LayoutParams(1, 24)
            }

            addView(title)
            addView(subtitle)
            addView(playOfflineBtn)
            addView(space)
            addView(retryBtn)
        }

        rootLayout.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        rootLayout.addView(
            errorLayout,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        setContentView(rootLayout)

        webView.loadUrl(gameUrl)
    }

    private fun showErrorScreen() {
        runOnUiThread {
            webView.stopLoading()
            webView.visibility = View.GONE
            errorLayout.visibility = View.VISIBLE
            retryHandler.removeCallbacks(autoRetryRunnable)
            retryHandler.postDelayed(autoRetryRunnable, 3000)
        }
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        retryHandler.removeCallbacks(autoRetryRunnable)
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
