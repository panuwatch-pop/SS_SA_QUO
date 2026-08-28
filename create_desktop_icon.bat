@echo off
chcp 65001 >nul
title ติดตั้งไอคอนระบบใบเสนอราคา (Quotation & ERP) บน Desktop
echo ========================================================
echo   ระบบสร้างทางลัด (Shortcut) เข้าสู่ระบบใบเสนอราคา
echo ========================================================
echo.

set "DEFAULT_URL=https://ss-sa-quo.vercel.app"
set /p "TARGET_URL=กรุณากรอก URL เว็บไซต์ระบบ (กด Enter หากใช้ค่าเดิม %DEFAULT_URL%): "
if "%TARGET_URL%"=="" set "TARGET_URL=%DEFAULT_URL%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut(\"$desktop\ระบบใบเสนอราคา (Quotation & ERP).url\"); $s.TargetPath = '%TARGET_URL%/quotations'; $s.Save();"

echo.
echo [สำเร็จ] สร้างไอคอนทางลัด "ระบบใบเสนอราคา (Quotation & ERP)"
echo ไว้บนหน้าจอ Desktop ของคุณเรียบร้อยแล้ว!
echo.
echo คุณสามารถดับเบิ้ลคลิกที่ไอคอนบน Desktop เพื่อเข้าใช้งานได้ทันทีครับ
echo.
pause
