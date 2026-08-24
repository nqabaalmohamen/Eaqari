@echo off
echo Building Next.js frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Error building frontend!
    exit /b %errorlevel%
)

echo Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 exit /b %errorlevel%

echo Building APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 exit /b %errorlevel%

echo Build successful!
cd ..

rem Get current date and time to create a unique filename
set cur_date=%date:/=-%
set cur_time=%time::=-%
set cur_time=%cur_time: =0%
set cur_time=%cur_time:~0,8%
set apk_name=Eaqari_Update_%cur_date%_%cur_time%.apk

rem Copy the latest generated APK (auto-named by build.gradle as Eaqari-v{versionName}.apk)
for %%f in ("android\app\build\outputs\apk\debug\Eaqari-v*.apk") do (
    copy "%%f" "..\%apk_name%" >nul
    set source_apk=%%~nxf
)
echo.
echo ========================================================
if defined source_apk (
    echo Source APK: %source_apk%
    echo Copied APK to root directory as: %apk_name%
    echo Location: D:\Eaqari\%apk_name%
) else (
    echo WARNING: Could not find generated APK in android\app\build\outputs\apk\debug\
)
echo ========================================================
