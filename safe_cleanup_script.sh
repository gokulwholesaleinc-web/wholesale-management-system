#!/bin/bash
# SAFE CLEANUP SCRIPT - Only removes application files, not system files

echo "🧹 Starting safe cleanup..."

# Remove test files (avoiding system/build files)
echo "Removing test files..."
find . -maxdepth 1 -name "test-*.js" -o -name "test-*.mjs" -o -name "debug-*.js" -o -name "*-test.*" | xargs -r rm -f

# Remove audit and analysis files  
echo "Removing audit/analysis files..."
find . -maxdepth 1 -name "*audit*" -o -name "*analysis*" -o -name "*-report.*" | grep -E "\.(md|json|txt|js|mjs)$" | xargs -r rm -f

# Remove comprehensive files
echo "Removing comprehensive files..."
find . -maxdepth 1 -name "comprehensive-*" -o -name "comprehensive_*" | xargs -r rm -f

# Remove old documentation
echo "Removing old documentation..."
find . -maxdepth 1 -name "*GUIDE*" -o -name "*INSTRUCTIONS*" -o -name "*SETUP*" | grep -v "replit.md" | xargs -r rm -f

# Remove temporary and backup files
echo "Removing temp/backup files..."
find . -maxdepth 1 -name "*.bak" -o -name "*.tmp" -o -name "*-backup.*" -o -name "*-old.*" | xargs -r rm -f

# Remove logs (but not system logs)
echo "Removing log files..."
find . -maxdepth 1 -name "*.log" | xargs -r rm -f

# Clean up attached_assets of old paste files
echo "Cleaning attached_assets..."
find attached_assets/ -name "Pasted-*" -type f | head -50 | xargs -r rm -f

echo "✅ Safe cleanup completed!"
echo "Remaining files:"
ls -la | grep -E "\.(md|txt|json|log|js|mjs|sh)$" | wc -l