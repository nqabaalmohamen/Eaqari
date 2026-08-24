@echo off
title Eaqari - الخادم الدائم (إنتاج)
color 0B
echo ============================================
echo    Eaqari - تشغيل الخادم الدائم (الرابط الثابت)
echo ============================================
echo.

REM ===== 1. تشغيل PostgreSQL =====
echo [1/3] تشغيل PostgreSQL...
net start postgresql-x64-16 2>nul || net start postgresql-x64-17 2>nul || echo PostgreSQL يعمل بالفعل.

REM ===== 2. تشغيل الخادم الخلفي =====
echo [2/3] تشغيل الخادم الخلفي (Backend)...
start "Eaqari Backend" /min cmd /c "cd /d D:\Eaqari\backend && npm run dev"

REM ===== 3. تشغيل Ngrok برابط ثابت =====
echo [3/3] تشغيل النفق الدائم (Ngrok Static Tunnel)...
echo الرابط الثابت للتطبيق: https://arming-diaper-stonework.ngrok-free.dev
start "Eaqari Static Tunnel" /min cmd /c "ngrok http --url=https://arming-diaper-stonework.ngrok-free.dev 5000"

echo.
echo ============================================
echo    تم تشغيل النظام بنجاح!
echo    الخادم المحلي يعمل على: http://localhost:5000
echo    رابط التطبيق العالمي: https://eaqari-api-prod-moh.loca.lt
echo    ملاحظة: تأكد من عدم إغلاق هذه النوافذ حتى يستمر التطبيق بالعمل!
echo ============================================
echo.
pause
