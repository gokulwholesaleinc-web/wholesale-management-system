@echo off
echo Official EPSON TM-T88V Driver Installation
echo ==========================================
echo.
echo Your hardware works (RMH confirmed) - installing official EPSON drivers
echo.
echo OPTION 1: Official EPSON Drivers (RECOMMENDED)
echo ==============================================
echo 1. Go to: https://support.epson.net/setupnavi/?MKN=TM-T88V+
echo 2. Select your Windows version
echo 3. Download "Advanced Printer Driver (APD)"
echo 4. Run installer as Administrator
echo 5. Choose USB connection, select TM-T88V model
echo.
echo OPTION 2: Windows Generic Driver (BACKUP)
echo =========================================
echo Opening Windows printer settings for manual setup...
start ms-settings:printers
echo.
echo Manual steps if needed:
echo 1. Add device -^> Add manually -^> Add local printer
echo 2. Use existing port: USB001
echo 3. Manufacturer: Generic, Printer: Generic / Text Only
echo 4. Name: TM-T88V, Set as default, Print test page
echo.
echo OFFICIAL EPSON SUPPORT:
echo Phone: (562) 276-1314
echo Hours: Mon-Fri 7am-4pm PT
echo Business Support: https://support.epson.net/setupnavi/?MKN=TM-T88V+
echo.
echo Press any key after installing drivers to test...
pause
echo.
echo Testing driver installation...
node post-driver-test.js