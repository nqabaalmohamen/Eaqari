@echo off
title Eaqari - تشغيل النظام الكامل
color 0A
echo ============================================
echo    Eaqari - تشغيل النظام الكامل
echo ============================================
echo.

REM ===== 1. تشغيل PostgreSQL =====
echo [1/5] تشغيل PostgreSQL...
net start postgresql-x64-16 2>nul || net start postgresql-x64-17 2>nul || echo PostgreSQL يعمل بالفعل أو سيتم تشغيله يدوياً

REM ===== 2. تشغيل الخادم الخلفي =====
echo [2/5] تشغيل الخادم الخلفي (Backend)...
start "Eaqari Backend" /min cmd /c "cd /d D:\Eaqari\backend && npm run dev"

REM ===== 3. تشغيل Cloudflare Tunnel =====
echo [3/5] تشغيل Cloudflare Tunnel...
start "Eaqari Tunnel" /min cmd /c "cloudflared tunnel --url http://localhost:5000 --output json > D:\Eaqari\backend\tunnel_url.txt"

REM ===== 4. تشغيل سكريبت تحديث الرابط =====
echo [4/5] تشغيل سكريبت تحديث الرابط التلقائي...
start "Eaqari URL Updater" /min cmd /c "cd /d D:\Eaqari\backend && node update_api_url.js"

REM ===== 5. انتظار بدء الخادم =====
echo [5/5] انتظار بدء الخادم...
timeout /t 5

echo.
echo ============================================
echo    تم تشغيل النظام بنجاح!
echo    الخادم يعمل على: http://localhost:5000
echo    النفق يعمل على: (انظر ملف tunnel_url.txt)
echo ============================================
echo.
echo ملاحظة: للحصول على الرابط الثابت، ستحتاج إلى حساب Cloudflare مجاني.
echo الرابط المؤقت يتغير كل مرة، لكن سكريبت التحديث سيقوم بتحديثه تلقائياً.
echo.
pause