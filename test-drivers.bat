@echo off
echo TM-T88V Driver Installation Test
echo =================================
echo.

echo Testing Windows printer recognition...
echo.
wmic printer list brief | findstr /i "epson tm-t88"
if %errorlevel% equ 0 (
    echo ✅ TM-T88V found in Windows printer list!
    echo.
) else (
    echo ❌ TM-T88V not found in Windows printers
    echo Available printers:
    wmic printer get name /value | findstr "Name="
    echo.
)

echo Creating test print file...
echo TM-T88V DRIVER TEST > "%temp%\tm_test.txt"
echo %date% %time% >> "%temp%\tm_test.txt"
echo Driver installation successful! >> "%temp%\tm_test.txt"
echo If you see this, printing works. >> "%temp%\tm_test.txt"

echo.
echo Testing physical printing...
echo Method 1: EPSON TM-T88V Receipt
print /d:"EPSON TM-T88V Receipt" "%temp%\tm_test.txt"
if %errorlevel% equ 0 (
    echo ✅ Print command succeeded!
    echo 📄 CHECK YOUR TM-T88V - Did it print?
) else (
    echo ❌ EPSON TM-T88V Receipt method failed
    echo Trying alternative method...
    print /d:"TM-T88V" "%temp%\tm_test.txt"
    if %errorlevel% equ 0 (
        echo ✅ TM-T88V print succeeded!
        echo 📄 CHECK YOUR PRINTER
    ) else (
        echo ❌ Both print methods failed
    )
)

echo.
echo Testing cash drawer...
echo Creating drawer command file...
echo|set /p "=%ESC%p" > "%temp%\drawer.bin"
echo Method 1: Opening cash drawer
print /d:"EPSON TM-T88V Receipt" "%temp%\drawer.bin"
if %errorlevel% equ 0 (
    echo ✅ Drawer command sent!
    echo 🔓 CHECK YOUR CASH DRAWER - Did it open?
) else (
    echo ❌ Drawer command failed
)

del "%temp%\tm_test.txt" 2>nul
del "%temp%\drawer.bin" 2>nul

echo.
echo =================================
echo NEXT STEPS:
echo 1. If printing worked: Test POS at /instore
echo 2. If printing failed: Check USB connection
echo 3. If drawer worked: Complete POS testing
echo 4. If drawer failed: Check MMF cable
echo =================================