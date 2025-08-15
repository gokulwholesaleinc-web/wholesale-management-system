@echo off
echo Installing TM-T88V Printer Driver for Windows
echo ==========================================
echo.
echo Since RMH works with your hardware, we just need Windows drivers.
echo.
echo Method 1: Manual Installation
echo -----------------------------
echo 1. Control Panel -^> Devices and Printers
echo 2. "Add a printer" -^> "Add a local printer"  
echo 3. "Use an existing port" -^> Select USB001 or USB002
echo 4. Manufacturer: "Generic"
echo 5. Printer: "Generic / Text Only"
echo 6. Name: "TM-T88V"
echo 7. Test print
echo.
echo Method 2: Automatic Setup
echo -------------------------
echo Opening printer setup now...
echo.
pause
echo.
echo Starting Windows printer setup...
start ms-settings:printers
echo.
echo Follow the manual steps above in the Settings window.
echo After installation, run: node verify-tm-t88v-connection.js
echo.
echo Press any key when driver installation is complete...
pause