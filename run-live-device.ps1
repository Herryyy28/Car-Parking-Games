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

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 2. Compiling Android APK..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
.\gradlew.bat :android:assembleDebug

$apkPath = "$PSScriptRoot\android\build\outputs\apk\debug\android-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 3. Installing APK onto device..." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "APK File: $apkPath"
    adb install -r -d -g "$apkPath"

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 4. Launching game on your device..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    adb shell am start -n com.trafficpuzzle.game/com.trafficpuzzle.game.android.AndroidLauncher
    adb shell monkey -p com.trafficpuzzle.game -c android.intent.category.LAUNCHER 1

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 5. Streaming LIVE game logs (Press Ctrl+C to exit)..." -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Cyan
    adb logcat -s TrafficGame:V AndroidLauncher:V com.trafficpuzzle.game:V AndroidRuntime:E
} else {
    Write-Host "`n[ERROR] APK was not found at $apkPath." -ForegroundColor Red
}
