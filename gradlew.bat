@echo off
setlocal

rem Set JAVA_HOME if not already set, using Android Studio's bundled JBR
if not defined JAVA_HOME (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    )
)

rem Path to cached Gradle 8.7
set "CACHED_GRADLE=%USERPROFILE%\.gradle\wrapper\dists\gradle-8.7-bin\bqym53liwl3c1gdrmpbaose0d\gradle-8.7\bin\gradle.bat"

if exist "%CACHED_GRADLE%" (
    call "%CACHED_GRADLE%" %*
    exit /b %ERRORLEVEL%
)

rem Fallback to any gradle in PATH
where gradle >nul 2>nul
if %ERRORLEVEL% equ 0 (
    call gradle %*
    exit /b %ERRORLEVEL%
)

echo [ERROR] Gradle not found. Please open this project in Android Studio.
exit /b 1
