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

copy "android\app\build\outputs\apk\debug\Eaqari-v1.3.apk" "..\%apk_name%"
echo.
echo ========================================================
echo Copied APK to root directory as: %apk_name%
echo Location: D:\Eaqari\%apk_name%
echo ========================================================
