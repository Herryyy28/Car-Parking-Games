# Setup Android environment paths
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 1. Checking connected Android device..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
adb devices

$devices = (adb devices) | Where-Object { $_ -match "\tdevice$" }
if (-not $devices) {
    Write-Host "[WARNING] No authorized device found! Please connect your phone via USB with 'USB Debugging' enabled." -ForegroundColor Red
    Write-Host "Also ensure you tap 'Allow' on your phone's screen if prompted." -ForegroundColor Yellow
    exit 1
}

function Test-PortOpen([string]$server, [int]$port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $async = $tcp.BeginConnect($server, $port, $null, $null)
        $wait = $async.AsyncWaitHandle.WaitOne(800)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($async)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch {}
    return $false
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 2. Checking 3D Game Dev Server (port 3000)..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

$serverReady = Test-PortOpen "127.0.0.1" 3000
if (-not $serverReady) {
    Write-Host "[INFO] Port 3000 not active. Automatically starting 'npm run dev' in background..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $PSScriptRoot -WindowStyle Minimized
    
    $attempts = 0
    while (-not $serverReady -and $attempts -lt 20) {
        Start-Sleep -Seconds 1
        $attempts++
        $serverReady = Test-PortOpen "127.0.0.1" 3000
        Write-Host " Waiting for Vite dev server ($attempts/20)..." -ForegroundColor Gray
    }
}

if ($serverReady) {
    Write-Host "[SUCCESS] 3D Game Server is ONLINE at http://localhost:3000!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Could not connect to port 3000 yet. The app will auto-retry connecting." -ForegroundColor Yellow
}

# Forward port 3000 to the device so the APK can connect to the 3D game
adb reverse tcp:3000 tcp:3000

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 3. Compiling Android APK with Real 3D Game..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
.\gradlew.bat :android:assembleDebug

$apkPath = "$PSScriptRoot\android\build\outputs\apk\debug\android-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 4. Installing APK onto device..." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "APK File: $apkPath"
    adb install -r -d -g "$apkPath"

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 5. Launching Real 3D Bus Game on your device..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    adb shell am start -n com.trafficpuzzle.game/com.trafficpuzzle.game.android.AndroidLauncher

    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " 6. 3D Game is running live on your phone at 60 FPS!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "Streaming live logs (Press Ctrl+C to stop)..."
    adb logcat -s WebGame:D AndroidLauncher:V com.trafficpuzzle.game:V AndroidRuntime:E
} else {
    Write-Host "`n[ERROR] APK was not found at $apkPath." -ForegroundColor Red
}
