@echo off
title Push Portfolio Website to GitHub
cd /d "%~dp0"
echo ========================================================
echo  MOHD SADAT KHAN - PORTFOLIO GITHUB PUSH
echo ========================================================
echo.
echo Target Repository:
echo https://github.com/sadatkhan-codes/Portfolio-Website.git
echo.
echo Pushing committed files on branch 'main'...
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo  SUCCESS: All files successfully pushed to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo  Push encountered an issue (e.g. authentication needed).
    echo ========================================================
)
echo.
pause
