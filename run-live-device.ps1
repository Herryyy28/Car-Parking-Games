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
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " 2. Building & installing APK on device..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
.\gradlew.bat :android:installDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 3. Launching game live on device..." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    adb shell am start -n com.trafficpuzzle.game/.android.AndroidLauncher

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " 4. Streaming LIVE game logs (Press Ctrl+C to exit)..." -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Cyan
    adb logcat -s TrafficGame:V AndroidLauncher:V com.trafficpuzzle.game:V
} else {
    Write-Host "`n[ERROR] Build failed. You can also open the project in Android Studio to build:" -ForegroundColor Red
    Write-Host "& 'C:\Program Files\Android\Android Studio\bin\studio64.exe' '$PSScriptRoot'" -ForegroundColor Yellow
}
