#!/bin/bash
# GENERATED CLEANUP SCRIPT - Review before running!

echo "🧹 Starting comprehensive cleanup..."

# Create backup directory
mkdir -p .cleanup-backup/$(date +%Y%m%d_%H%M%S)


# LOGFILES FILES (7 files)
# Matches pattern: /\.log$/i
echo "Removing .config/.semgrep/semgrep.log..."
rm -f ".config/.semgrep/semgrep.log"
# Matches pattern: /logs/i
echo "Removing attached_assets/Pasted-StaffActivityMonitor-tsx-46-Uncaught-TypeError-activityLogs-map-is-not-a-function-at-S-1753392933024_1753392933024.txt..."
rm -f "attached_assets/Pasted-StaffActivityMonitor-tsx-46-Uncaught-TypeError-activityLogs-map-is-not-a-function-at-S-1753392933024_1753392933024.txt"
# Matches pattern: /logs/i
echo "Removing client/src/pages/RealActivityLogs.tsx..."
rm -f "client/src/pages/RealActivityLogs.tsx"
# Matches pattern: /logs/i
echo "Removing scripts/create-activity-logs-table.ts..."
rm -f "scripts/create-activity-logs-table.ts"
# Matches pattern: /logs/i
echo "Removing scripts/create-mock-activity-logs.ts..."
rm -f "scripts/create-mock-activity-logs.ts"
# Matches pattern: /logs/i
echo "Removing scripts/fix-activity-logs-table.ts..."
rm -f "scripts/fix-activity-logs-table.ts"
# Matches pattern: /logs/i
echo "Removing server/routes/activity-logs-consolidated.ts..."
rm -f "server/routes/activity-logs-consolidated.ts"


# BUILDFILES FILES (22 files)
# Matches pattern: /build/
echo "Removing .local/state/replit/agent/rapid_build_started..."
rm -f ".local/state/replit/agent/rapid_build_started"
# Matches pattern: /build/
echo "Removing .local/state/replit/agent/rapid_build_success..."
rm -f ".local/state/replit/agent/rapid_build_success"
# Matches pattern: /dist/
echo "Removing dist/index.js..."
rm -f "dist/index.js"
# Matches pattern: /dist/
echo "Removing dist/public/assets/CartSidebar-Db1yJECq.js..."
rm -f "dist/public/assets/CartSidebar-Db1yJECq.js"
# Matches pattern: /dist/
echo "Removing dist/public/assets/IMG_0846-DxUsanwF.png..."
rm -f "dist/public/assets/IMG_0846-DxUsanwF.png"
# Matches pattern: /dist/
echo "Removing dist/public/assets/TillManagement-CzVlyHyJ.js..."
rm -f "dist/public/assets/TillManagement-CzVlyHyJ.js"
# Matches pattern: /dist/
echo "Removing dist/public/assets/html2canvas.esm-CBrSDip1.js..."
rm -f "dist/public/assets/html2canvas.esm-CBrSDip1.js"
# Matches pattern: /dist/
echo "Removing dist/public/assets/index-ClmOy72-.js..."
rm -f "dist/public/assets/index-ClmOy72-.js"
# Matches pattern: /dist/
echo "Removing dist/public/assets/index-nl_C8QC5.css..."
rm -f "dist/public/assets/index-nl_C8QC5.css"
# Matches pattern: /dist/
echo "Removing dist/public/assets/index.es-DTi44xcz.js..."
rm -f "dist/public/assets/index.es-DTi44xcz.js"
# Matches pattern: /dist/
echo "Removing dist/public/assets/purify.es-CQJ0hv7W.js..."
rm -f "dist/public/assets/purify.es-CQJ0hv7W.js"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-128x128.png..."
rm -f "dist/public/icons/icon-128x128.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-144x144.png..."
rm -f "dist/public/icons/icon-144x144.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-152x152.png..."
rm -f "dist/public/icons/icon-152x152.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-192x192.png..."
rm -f "dist/public/icons/icon-192x192.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-512x512.png..."
rm -f "dist/public/icons/icon-512x512.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-72x72.png..."
rm -f "dist/public/icons/icon-72x72.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-96x96.png..."
rm -f "dist/public/icons/icon-96x96.png"
# Matches pattern: /dist/
echo "Removing dist/public/icons/icon-generator.svg..."
rm -f "dist/public/icons/icon-generator.svg"
# Matches pattern: /dist/
echo "Removing dist/public/icons/maskable-icon.png..."
rm -f "dist/public/icons/maskable-icon.png"
# Matches pattern: /dist/
echo "Removing dist/public/index.html..."
rm -f "dist/public/index.html"
# Matches pattern: /dist/
echo "Removing dist/public/manifest.json..."
rm -f "dist/public/manifest.json"


# DOCFILES FILES (12 files)
# Matches pattern: /GUIDE/i
echo "Removing BRIDGE_SETUP_GUIDE.md..."
rm -f "BRIDGE_SETUP_GUIDE.md"
# Matches pattern: /GUIDE/i
echo "Removing DESKTOP_SETUP_GUIDE.md..."
rm -f "DESKTOP_SETUP_GUIDE.md"
# Matches pattern: /GUIDE/i
echo "Removing OFFICIAL-TM-T88V-DRIVER-GUIDE.md..."
rm -f "OFFICIAL-TM-T88V-DRIVER-GUIDE.md"
# Matches pattern: /GUIDE/i
echo "Removing ORDER_EDITING_GUIDE.md..."
rm -f "ORDER_EDITING_GUIDE.md"
# Matches pattern: /GUIDE/i
echo "Removing SECURITY_GUIDELINES.md..."
rm -f "SECURITY_GUIDELINES.md"
# Matches pattern: /SETUP_INSTRUCTIONS/i
echo "Removing SETUP_INSTRUCTIONS.md..."
rm -f "SETUP_INSTRUCTIONS.md"
# Matches pattern: /GUIDE/i
echo "Removing TM-T88V-DRIVER-INSTALL-GUIDE.md..."
rm -f "TM-T88V-DRIVER-INSTALL-GUIDE.md"
# Matches pattern: /INSTRUCTIONS/i
echo "Removing WINDOWS-DRIVER-TEST-INSTRUCTIONS.md..."
rm -f "WINDOWS-DRIVER-TEST-INSTRUCTIONS.md"
# Matches pattern: /README/i
echo "Removing attached_assets/CREDIT_MANAGEMENT_README_1752341365173.md..."
rm -f "attached_assets/CREDIT_MANAGEMENT_README_1752341365173.md"
# Matches pattern: /GUIDE/i
echo "Removing attached_assets/Pasted-Wholesale-POS-System-Complete-Implementation-Guide-This-guide-provides-all-the-core-components-d-1754069974614_1754069974614.txt..."
rm -f "attached_assets/Pasted-Wholesale-POS-System-Complete-Implementation-Guide-This-guide-provides-all-the-core-components-d-1754069974614_1754069974614.txt"
# Matches pattern: /INSTRUCTIONS/i
echo "Removing client/hardware-bridge/MMFDrawerBridge.exe.instructions.md..."
rm -f "client/hardware-bridge/MMFDrawerBridge.exe.instructions.md"
# Matches pattern: /README/i
echo "Removing client/src/hooks/README-CART-CONSOLIDATION.md..."
rm -f "client/src/hooks/README-CART-CONSOLIDATION.md"


# AUDITFILES FILES (80 files)
# Matches pattern: /audit/i
echo "Removing COMPREHENSIVE-AUDIT-SUMMARY-2025.md..."
rm -f "COMPREHENSIVE-AUDIT-SUMMARY-2025.md"
# Matches pattern: /report/i
echo "Removing NOTIFICATION_SYSTEM_CONSOLIDATION_REPORT.md..."
rm -f "NOTIFICATION_SYSTEM_CONSOLIDATION_REPORT.md"
# Matches pattern: /report/i
echo "Removing SMS_CONSENT_COMPLIANCE_REPORT.md..."
rm -f "SMS_CONSENT_COMPLIANCE_REPORT.md"
# Matches pattern: /report/i
echo "Removing account-types-test-report.md..."
rm -f "account-types-test-report.md"
# Matches pattern: /analysis/i
echo "Removing admin-endpoint-analysis.js..."
rm -f "admin-endpoint-analysis.js"
# Matches pattern: /report/i
echo "Removing ai-mapping-system-test-report.json..."
rm -f "ai-mapping-system-test-report.json"
# Matches pattern: /report/i
echo "Removing api-sync-report.json..."
rm -f "api-sync-report.json"
# Matches pattern: /security-/i
echo "Removing attached_assets/Pasted--User-roles-for-security-export-const-USER-ROLES-ADMIN-admin-MANAGER-manager-CAS-1754069846781_1754069846781.txt..."
rm -f "attached_assets/Pasted--User-roles-for-security-export-const-USER-ROLES-ADMIN-admin-MANAGER-manager-CAS-1754069846781_1754069846781.txt"
# Matches pattern: /sync-/i
echo "Removing attached_assets/Pasted--app-post-api-admin-backup-requireAdmin-async-req-any-res-try-const-back-1750910747619_1750910747619.txt..."
rm -f "attached_assets/Pasted--app-post-api-admin-backup-requireAdmin-async-req-any-res-try-const-back-1750910747619_1750910747619.txt"
# Matches pattern: /validation/i
echo "Removing attached_assets/Pasted-1-Token-Validation-Completely-Broken-All-cart-API-requests-returning-401-Unauthorized-Auth-1750706256369_1750706256369.txt..."
rm -f "attached_assets/Pasted-1-Token-Validation-Completely-Broken-All-cart-API-requests-returning-401-Unauthorized-Auth-1750706256369_1750706256369.txt"
# Matches pattern: /audit/i
echo "Removing attached_assets/Pasted-Based-on-my-analysis-of-the-comprehensive-audit-reports-and-system-logs-here-are-all-the-issues-I-v-1749846841618_1749846841618.txt..."
rm -f "attached_assets/Pasted-Based-on-my-analysis-of-the-comprehensive-audit-reports-and-system-logs-here-are-all-the-issues-I-v-1749846841618_1749846841618.txt"
# Matches pattern: /endpoint-/i
echo "Removing attached_assets/Pasted-COMPLETE-API-ENDPOINT-ROUTING-MISMATCHES-TEXT-FORMAT-1-Authentication-Token-Validation-Issues-Is-1750709246171_1750709246171.txt..."
rm -f "attached_assets/Pasted-COMPLETE-API-ENDPOINT-ROUTING-MISMATCHES-TEXT-FORMAT-1-Authentication-Token-Validation-Issues-Is-1750709246171_1750709246171.txt"
# Matches pattern: /endpoint-/i
echo "Removing attached_assets/Pasted-Complete-API-Endpoint-Routing-Mismatches-Text-Format-1-Authentication-Token-Validation-Issues-Is-1750709176422_1750709176422.txt..."
rm -f "attached_assets/Pasted-Complete-API-Endpoint-Routing-Mismatches-Text-Format-1-Authentication-Token-Validation-Issues-Is-1750709176422_1750709176422.txt"
# Matches pattern: /deployment-/i
echo "Removing attached_assets/Pasted-Critical-Issues-Must-Fix-for-Deployment-Service-Worker-Registration-Failure-Service-worker--1749848088513_1749848088513.txt..."
rm -f "attached_assets/Pasted-Critical-Issues-Must-Fix-for-Deployment-Service-Worker-Registration-Failure-Service-worker--1749848088513_1749848088513.txt"
# Matches pattern: /endpoint-/i
echo "Removing attached_assets/Pasted-Issues-Found-The-endpoint-registry-was-not-actually-scanning-real-route-files-it-only-tracke-1750881266135_1750881266136.txt..."
rm -f "attached_assets/Pasted-Issues-Found-The-endpoint-registry-was-not-actually-scanning-real-route-files-it-only-tracke-1750881266135_1750881266136.txt"
# Matches pattern: /sync-/i
echo "Removing attached_assets/Pasted-private-generatePremiumInvoice-async-doc-any-receiptData-ReceiptData-fs-any-path--1755203392375_1755203392375.txt..."
rm -f "attached_assets/Pasted-private-generatePremiumInvoice-async-doc-any-receiptData-ReceiptData-fs-any-path--1755203392375_1755203392375.txt"
# Matches pattern: /analysis/i
echo "Removing cache_system_operation_analysis.mjs..."
rm -f "cache_system_operation_analysis.mjs"
# Matches pattern: /report/i
echo "Removing client/src/pages/pos/PosReports.tsx..."
rm -f "client/src/pages/pos/PosReports.tsx"
# Matches pattern: /validation/i
echo "Removing complete-sync-validation.mjs..."
rm -f "complete-sync-validation.mjs"
# Matches pattern: /audit/i
echo "Removing comprehensive-audit-2025.mjs..."
rm -f "comprehensive-audit-2025.mjs"
# Matches pattern: /audit/i
echo "Removing comprehensive-audit-report-2025.json..."
rm -f "comprehensive-audit-report-2025.json"
# Matches pattern: /report/i
echo "Removing comprehensive-debug-report.md..."
rm -f "comprehensive-debug-report.md"
# Matches pattern: /audit/i
echo "Removing comprehensive-endpoint-audit.mjs..."
rm -f "comprehensive-endpoint-audit.mjs"
# Matches pattern: /audit/i
echo "Removing comprehensive-endpoint-schema-audit.mjs..."
rm -f "comprehensive-endpoint-schema-audit.mjs"
# Matches pattern: /comprehensive-/i
echo "Removing comprehensive-enhancement-summary.md..."
rm -f "comprehensive-enhancement-summary.md"
# Matches pattern: /audit/i
echo "Removing comprehensive-frontend-backend-sync-audit.md..."
rm -f "comprehensive-frontend-backend-sync-audit.md"
# Matches pattern: /report/i
echo "Removing comprehensive-function-test-report.md..."
rm -f "comprehensive-function-test-report.md"
# Matches pattern: /audit/i
echo "Removing comprehensive-system-audit.json..."
rm -f "comprehensive-system-audit.json"
# Matches pattern: /audit/i
echo "Removing comprehensive-system-audit.sh..."
rm -f "comprehensive-system-audit.sh"
# Matches pattern: /report/i
echo "Removing comprehensive-test-report.json..."
rm -f "comprehensive-test-report.json"
# Matches pattern: /audit/i
echo "Removing comprehensive_audit.mjs..."
rm -f "comprehensive_audit.mjs"
# Matches pattern: /audit/i
echo "Removing comprehensive_cleanup_audit.mjs..."
rm -f "comprehensive_cleanup_audit.mjs"
# Matches pattern: /analysis/i
echo "Removing comprehensive_endpoint_analysis.mjs..."
rm -f "comprehensive_endpoint_analysis.mjs"
# Matches pattern: /audit/i
echo "Removing comprehensive_endpoint_sync_audit.mjs..."
rm -f "comprehensive_endpoint_sync_audit.mjs"
# Matches pattern: /audit/i
echo "Removing comprehensive_schema_audit.mjs..."
rm -f "comprehensive_schema_audit.mjs"
# Matches pattern: /analysis/i
echo "Removing comprehensive_system_analysis.mjs..."
rm -f "comprehensive_system_analysis.mjs"
# Matches pattern: /report/i
echo "Removing credit-validation-system-report.md..."
rm -f "credit-validation-system-report.md"
# Matches pattern: /report/i
echo "Removing current-registry-status-report.md..."
rm -f "current-registry-status-report.md"
# Matches pattern: /audit/i
echo "Removing deployment-audit-report.json..."
rm -f "deployment-audit-report.json"
# Matches pattern: /deployment-/i
echo "Removing deployment-check.sh..."
rm -f "deployment-check.sh"
# Matches pattern: /report/i
echo "Removing deployment-report.md..."
rm -f "deployment-report.md"
# Matches pattern: /deployment-/i
echo "Removing deployment-verification.js..."
rm -f "deployment-verification.js"
# Matches pattern: /sync-/i
echo "Removing dist/public/assets/authSync-CgezIhVP.js..."
rm -f "dist/public/assets/authSync-CgezIhVP.js"
# Matches pattern: /analysis/i
echo "Removing endpoint-analysis-report.json..."
rm -f "endpoint-analysis-report.json"
# Matches pattern: /analysis/i
echo "Removing endpoint-analysis-report.md..."
rm -f "endpoint-analysis-report.md"
# Matches pattern: /audit/i
echo "Removing endpoint-audit.mjs..."
rm -f "endpoint-audit.mjs"
# Matches pattern: /endpoint-/i
echo "Removing endpoint-duplicates.log..."
rm -f "endpoint-duplicates.log"
# Matches pattern: /report/i
echo "Removing endpoint-registry-report.json..."
rm -f "endpoint-registry-report.json"
# Matches pattern: /report/i
echo "Removing enhanced-cart-report.md..."
rm -f "enhanced-cart-report.md"
# Matches pattern: /report/i
echo "Removing final-authentication-report.md..."
rm -f "final-authentication-report.md"
# Matches pattern: /validation/i
echo "Removing final-authentication-validation.mjs..."
rm -f "final-authentication-validation.mjs"
# Matches pattern: /report/i
echo "Removing final-cache-management-fix-report.md..."
rm -f "final-cache-management-fix-report.md"
# Matches pattern: /report/i
echo "Removing final-checkout-recalculation-report.md..."
rm -f "final-checkout-recalculation-report.md"
# Matches pattern: /comprehensive-/i
echo "Removing final-comprehensive-validation.mjs..."
rm -f "final-comprehensive-validation.mjs"
# Matches pattern: /report/i
echo "Removing final-deployment-readiness-report.md..."
rm -f "final-deployment-readiness-report.md"
# Matches pattern: /validation/i
echo "Removing final-registry-validation.mjs..."
rm -f "final-registry-validation.mjs"
# Matches pattern: /report/i
echo "Removing final-sync-report.json..."
rm -f "final-sync-report.json"
# Matches pattern: /validation/i
echo "Removing final-sync-validation.mjs..."
rm -f "final-sync-validation.mjs"
# Matches pattern: /report/i
echo "Removing final-test-report.md..."
rm -f "final-test-report.md"
# Matches pattern: /report/i
echo "Removing final-validation-report.json..."
rm -f "final-validation-report.json"
# Matches pattern: /sync-/i
echo "Removing find-remaining-sync-issues.mjs..."
rm -f "find-remaining-sync-issues.mjs"
# Matches pattern: /deployment-/i
echo "Removing fix-deployment-duplicates.mjs..."
rm -f "fix-deployment-duplicates.mjs"
# Matches pattern: /report/i
echo "Removing frontend-auth-debug-report.md..."
rm -f "frontend-auth-debug-report.md"
# Matches pattern: /report/i
echo "Removing frontend-visual-report.json..."
rm -f "frontend-visual-report.json"
# Matches pattern: /report/i
echo "Removing mobile-compatibility-report.json..."
rm -f "mobile-compatibility-report.json"
# Matches pattern: /validation/i
echo "Removing order-editing-validation.md..."
rm -f "order-editing-validation.md"
# Matches pattern: /analysis/i
echo "Removing routing_analysis.js..."
rm -f "routing_analysis.js"
# Matches pattern: /audit/i
echo "Removing schema_audit_report.json..."
rm -f "schema_audit_report.json"
# Matches pattern: /endpoint-/i
echo "Removing scripts/endpoint-registry-enforcer.mjs..."
rm -f "scripts/endpoint-registry-enforcer.mjs"
# Matches pattern: /audit/i
echo "Removing scripts/enhanced-endpoint-audit.mjs..."
rm -f "scripts/enhanced-endpoint-audit.mjs"
# Matches pattern: /validation/i
echo "Removing scripts/route-validation-hook.mjs..."
rm -f "scripts/route-validation-hook.mjs"
# Matches pattern: /audit/i
echo "Removing security-audit-report.json..."
rm -f "security-audit-report.json"
# Matches pattern: /audit/i
echo "Removing security-audit-report.md..."
rm -f "security-audit-report.md"
# Matches pattern: /audit/i
echo "Removing security-audit-script.mjs..."
rm -f "security-audit-script.mjs"
# Matches pattern: /endpoint-/i
echo "Removing server/endpoint-registry-manager.ts..."
rm -f "server/endpoint-registry-manager.ts"
# Matches pattern: /endpoint-/i
echo "Removing server/endpoint-registry.ts..."
rm -f "server/endpoint-registry.ts"
# Matches pattern: /endpoint-/i
echo "Removing server/endpoint-validator.ts..."
rm -f "server/endpoint-validator.ts"
# Matches pattern: /analysis/i
echo "Removing tfv-success-template-analysis.md..."
rm -f "tfv-success-template-analysis.md"
# Matches pattern: /deployment-/i
echo "Removing twilio-sms-deployment-guide.md..."
rm -f "twilio-sms-deployment-guide.md"
# Matches pattern: /report/i
echo "Removing ultimate-enhancement-completion-report.md..."
rm -f "ultimate-enhancement-completion-report.md"


# BACKUPFILES FILES (30 files)
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-Opened-cache-index-BxEkcwrm-js-438-Using-simpleCart-instead-of-the-old-CartProvider-index-BxEkcwrm-j-1748970726023.txt..."
rm -f "attached_assets/Pasted-Opened-cache-index-BxEkcwrm-js-438-Using-simpleCart-instead-of-the-old-CartProvider-index-BxEkcwrm-j-1748970726023.txt"
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-Opened-cache-index-BydwKh-A-js-438-Using-simpleCart-instead-of-the-old-CartProvider-index-BydwKh-A-j-1748966425602.txt..."
rm -f "attached_assets/Pasted-Opened-cache-index-BydwKh-A-js-438-Using-simpleCart-instead-of-the-old-CartProvider-index-BydwKh-A-j-1748966425602.txt"
# Matches pattern: /temp/i
echo "Removing attached_assets/Pasted-Press-Ctrl-C-to-stop-monitoring-3-39-52-PM-New-temp-f-1754944998724_1754944998725.txt..."
rm -f "attached_assets/Pasted-Press-Ctrl-C-to-stop-monitoring-3-39-52-PM-New-temp-f-1754944998724_1754944998725.txt"
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-Using-simpleCart-instead-of-the-old-CartProvider-index-BRjarK14-js-438-Products-state-Object-index--1748965682094.txt..."
rm -f "attached_assets/Pasted-Using-simpleCart-instead-of-the-old-CartProvider-index-BRjarK14-js-438-Products-state-Object-index--1748965682094.txt"
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-Using-simpleCart-instead-of-the-old-CartProvider-index-BxzI2xq3-js-413-Fetching-cart-items-index--1748709653402.txt..."
rm -f "attached_assets/Pasted-Using-simpleCart-instead-of-the-old-CartProvider-index-BxzI2xq3-js-413-Fetching-cart-items-index--1748709653402.txt"
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-Using-simpleCart-instead-of-the-old-CartProvider-index-DHw65Lwu-js-438-Products-state-Object-index--1749499809121_1749499809122.txt..."
rm -f "attached_assets/Pasted-Using-simpleCart-instead-of-the-old-CartProvider-index-DHw65Lwu-js-438-Products-state-Object-index--1749499809121_1749499809122.txt"
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-index-CorF5ShQ-js-438-Using-simpleCart-instead-of-the-old-CartProvider-index-CorF5ShQ-js-438-Product-1749502088499_1749502088499.txt..."
rm -f "attached_assets/Pasted-index-CorF5ShQ-js-438-Using-simpleCart-instead-of-the-old-CartProvider-index-CorF5ShQ-js-438-Product-1749502088499_1749502088499.txt"
# Matches pattern: /backup/i
echo "Removing attached_assets/Pasted-index-pcv0GleT-js-706-AUTH-DEBUG-2025-06-09T18-35-38-289Z-SessionStorage-SET-backup-authToken--1749494157190_1749494157190.txt..."
rm -f "attached_assets/Pasted-index-pcv0GleT-js-706-AUTH-DEBUG-2025-06-09T18-35-38-289Z-SessionStorage-SET-backup-authToken--1749494157190_1749494157190.txt"
# Matches pattern: /backup/i
echo "Removing attached_assets/Pasted-index-pcv0GleT-js-706-AUTH-DEBUG-2025-06-09T18-35-38-289Z-SessionStorage-SET-backup-authToken--1749494346834_1749494346834.txt..."
rm -f "attached_assets/Pasted-index-pcv0GleT-js-706-AUTH-DEBUG-2025-06-09T18-35-38-289Z-SessionStorage-SET-backup-authToken--1749494346834_1749494346834.txt"
# Matches pattern: /old/i
echo "Removing attached_assets/Pasted-sing-simpleCart-instead-of-the-old-CartProvider-index-BNI78CBc-js-413-Fetching-cart-items-index-B-1748714070880.txt..."
rm -f "attached_assets/Pasted-sing-simpleCart-instead-of-the-old-CartProvider-index-BNI78CBc-js-413-Fetching-cart-items-index-B-1748714070880.txt"
# Matches pattern: /backup/i
echo "Removing backups/gokul-data-backup-2025-07-30T19-19-05-959Z.json..."
rm -f "backups/gokul-data-backup-2025-07-30T19-19-05-959Z.json"
# Matches pattern: /\.bak$/i
echo "Removing client/src/components/checkout/PickupDateSelector.tsx.bak..."
rm -f "client/src/components/checkout/PickupDateSelector.tsx.bak"
# Matches pattern: /backup/i
echo "Removing client/src/pages/AdminProductManagement-backup.tsx..."
rm -f "client/src/pages/AdminProductManagement-backup.tsx"
# Matches pattern: /backup/i
echo "Removing client/src/pages/BackupManagement.tsx..."
rm -f "client/src/pages/BackupManagement.tsx"
# Matches pattern: /backup/i
echo "Removing client/src/pages/Products_backup.tsx..."
rm -f "client/src/pages/Products_backup.tsx"
# Matches pattern: /backup/i
echo "Removing client/src/pages/StaffProductManagement.backup.tsx..."
rm -f "client/src/pages/StaffProductManagement.backup.tsx"
# Matches pattern: /duplicate/i
echo "Removing duplicate-cleanup-plan.md..."
rm -f "duplicate-cleanup-plan.md"
# Matches pattern: /duplicate/i
echo "Removing fix-duplicate-endpoints.mjs..."
rm -f "fix-duplicate-endpoints.mjs"
# Matches pattern: /duplicate/i
echo "Removing fix_duplicate_endpoints.mjs..."
rm -f "fix_duplicate_endpoints.mjs"
# Matches pattern: /duplicate/i
echo "Removing scripts/prevent-duplicates.mjs..."
rm -f "scripts/prevent-duplicates.mjs"
# Matches pattern: /backup/i
echo "Removing server/backup/routes.ts.disabled..."
rm -f "server/backup/routes.ts.disabled"
# Matches pattern: /backup/i
echo "Removing server/backup.ts..."
rm -f "server/backup.ts"
# Matches pattern: /backup/i
echo "Removing server/routes/emergency.ts.backup..."
rm -f "server/routes/emergency.ts.backup"
# Matches pattern: /backup/i
echo "Removing server/routes.ts.backup..."
rm -f "server/routes.ts.backup"
# Matches pattern: /backup/i
echo "Removing server/routes_backup.ts.bak..."
rm -f "server/routes_backup.ts.bak"
# Matches pattern: /backup/i
echo "Removing server/services/receiptGenerator.backup.ts..."
rm -f "server/services/receiptGenerator.backup.ts"
# Matches pattern: /backup/i
echo "Removing server/simpleBackup.ts..."
rm -f "server/simpleBackup.ts"
# Matches pattern: /temp/i
echo "Removing server/temp_section.txt..."
rm -f "server/temp_section.txt"
# Matches pattern: /temp/i
echo "Removing shared/email-template-registry.ts..."
rm -f "shared/email-template-registry.ts"
# Matches pattern: /temp/i
echo "Removing temp_routes.ts..."
rm -f "temp_routes.ts"


# TESTFILES FILES (97 files)
# Matches pattern: /-test\./i
echo "Removing cache-system-browser-test.html..."
rm -f "cache-system-browser-test.html"
# Matches pattern: /-test\./i
echo "Removing checkout-calculation-test.js..."
rm -f "checkout-calculation-test.js"
# Matches pattern: /-test\./i
echo "Removing comma-fix-test.pdf..."
rm -f "comma-fix-test.pdf"
# Matches pattern: /-debug\./i
echo "Removing customer-data-debug.pdf..."
rm -f "customer-data-debug.pdf"
# Matches pattern: /-test\./i
echo "Removing customer-debug-test.pdf..."
rm -f "customer-debug-test.pdf"
# Matches pattern: /-test\./i
echo "Removing customer-info-fixed-test.pdf..."
rm -f "customer-info-fixed-test.pdf"
# Matches pattern: /^debug-/i
echo "Removing debug-ai-invoice-access.mjs..."
rm -f "debug-ai-invoice-access.mjs"
# Matches pattern: /^debug-/i
echo "Removing debug-cart-report.md..."
rm -f "debug-cart-report.md"
# Matches pattern: /^debug-/i
echo "Removing debug-comma-test.pdf..."
rm -f "debug-comma-test.pdf"
# Matches pattern: /^debug-/i
echo "Removing debug-header-test.pdf..."
rm -f "debug-header-test.pdf"
# Matches pattern: /^debug-/i
echo "Removing debug-order-10-notifications.js..."
rm -f "debug-order-10-notifications.js"
# Matches pattern: /^debug-/i
echo "Removing debug-order-2-notifications.js..."
rm -f "debug-order-2-notifications.js"
# Matches pattern: /^debug-/i
echo "Removing debug-sms-order-9.js..."
rm -f "debug-sms-order-9.js"
# Matches pattern: /^debug-/i
echo "Removing debug-test-v2.pdf..."
rm -f "debug-test-v2.pdf"
# Matches pattern: /^debug-/i
echo "Removing debug-test.pdf..."
rm -f "debug-test.pdf"
# Matches pattern: /-test\./i
echo "Removing fresh-test.pdf..."
rm -f "fresh-test.pdf"
# Matches pattern: /-test\./i
echo "Removing post-driver-test.js..."
rm -f "post-driver-test.js"
# Matches pattern: /-test\./i
echo "Removing scripts/create-employee-test.ts..."
rm -f "scripts/create-employee-test.ts"
# Matches pattern: /test\.js$/i
echo "Removing server/services/mmfTest.js..."
rm -f "server/services/mmfTest.js"
# Matches pattern: /-test\./i
echo "Removing simple-sms-test.js..."
rm -f "simple-sms-test.js"
# Matches pattern: /^test-/i
echo "Removing test-admin-language-debug.js..."
rm -f "test-admin-language-debug.js"
# Matches pattern: /^test-/i
echo "Removing test-ai-invoice-fix.js..."
rm -f "test-ai-invoice-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-ai-invoice-processing.js..."
rm -f "test-ai-invoice-processing.js"
# Matches pattern: /^test-/i
echo "Removing test-ai-mapping-system-live.mjs..."
rm -f "test-ai-mapping-system-live.mjs"
# Matches pattern: /^test-/i
echo "Removing test-ai-mapping-system.mjs..."
rm -f "test-ai-mapping-system.mjs"
# Matches pattern: /^test-/i
echo "Removing test-ai-recommendations-complete.mjs..."
rm -f "test-ai-recommendations-complete.mjs"
# Matches pattern: /^test-/i
echo "Removing test-ai-suggestions-fix.js..."
rm -f "test-ai-suggestions-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-ai-system-integration.mjs..."
rm -f "test-ai-system-integration.mjs"
# Matches pattern: /^test-/i
echo "Removing test-ai-upload-fix.js..."
rm -f "test-ai-upload-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-authentication-fix.mjs..."
rm -f "test-authentication-fix.mjs"
# Matches pattern: /^test-/i
echo "Removing test-cash-drawer-fix.js..."
rm -f "test-cash-drawer-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-complete-invoice-email.js..."
rm -f "test-complete-invoice-email.js"
# Matches pattern: /^test-/i
echo "Removing test-complete-notifications.mjs..."
rm -f "test-complete-notifications.mjs"
# Matches pattern: /^test-/i
echo "Removing test-complete-sms-flow.js..."
rm -f "test-complete-sms-flow.js"
# Matches pattern: /^test-/i
echo "Removing test-comprehensive-activity-logging.js..."
rm -f "test-comprehensive-activity-logging.js"
# Matches pattern: /^test-/i
echo "Removing test-confidence-thresholds.mjs..."
rm -f "test-confidence-thresholds.mjs"
# Matches pattern: /^test-/i
echo "Removing test-credit-validation.js..."
rm -f "test-credit-validation.js"
# Matches pattern: /^test-/i
echo "Removing test-critical-fixes-complete.js..."
rm -f "test-critical-fixes-complete.js"
# Matches pattern: /^test-/i
echo "Removing test-critical-sync-check.mjs..."
rm -f "test-critical-sync-check.mjs"
# Matches pattern: /^test-/i
echo "Removing test-critical-sync-fixes.mjs..."
rm -f "test-critical-sync-fixes.mjs"
# Matches pattern: /^test-/i
echo "Removing test-drivers.bat..."
rm -f "test-drivers.bat"
# Matches pattern: /^test-/i
echo "Removing test-email-fixes.js..."
rm -f "test-email-fixes.js"
# Matches pattern: /^test-/i
echo "Removing test-email-notification.js..."
rm -f "test-email-notification.js"
# Matches pattern: /^test-/i
echo "Removing test-enhanced-sms-system.mjs..."
rm -f "test-enhanced-sms-system.mjs"
# Matches pattern: /^test-/i
echo "Removing test-existing-receipt.pdf..."
rm -f "test-existing-receipt.pdf"
# Matches pattern: /^test-/i
echo "Removing test-final-ai-mapping-demo.mjs..."
rm -f "test-final-ai-mapping-demo.mjs"
# Matches pattern: /^test-/i
echo "Removing test-final-notification-fixes.mjs..."
rm -f "test-final-notification-fixes.mjs"
# Matches pattern: /^test-/i
echo "Removing test-final-notifications.js..."
rm -f "test-final-notifications.js"
# Matches pattern: /^test-/i
echo "Removing test-fixed-receipt.pdf..."
rm -f "test-fixed-receipt.pdf"
# Matches pattern: /^test-/i
echo "Removing test-invoice-email-fix.js..."
rm -f "test-invoice-email-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-invoice-fixed.pdf..."
rm -f "test-invoice-fixed.pdf"
# Matches pattern: /^test-/i
echo "Removing test-invoice-simple.mjs..."
rm -f "test-invoice-simple.mjs"
# Matches pattern: /^test-/i
echo "Removing test-language-logo-fixes.js..."
rm -f "test-language-logo-fixes.js"
# Matches pattern: /^test-/i
echo "Removing test-language-update.js..."
rm -f "test-language-update.js"
# Matches pattern: /^test-/i
echo "Removing test-logo-integration.js..."
rm -f "test-logo-integration.js"
# Matches pattern: /^test-/i
echo "Removing test-logo-notification-fixes.js..."
rm -f "test-logo-notification-fixes.js"
# Matches pattern: /^test-/i
echo "Removing test-loyalty-exclusion-direct.js..."
rm -f "test-loyalty-exclusion-direct.js"
# Matches pattern: /^test-/i
echo "Removing test-loyalty-exclusion.js..."
rm -f "test-loyalty-exclusion.js"
# Matches pattern: /^test-/i
echo "Removing test-loyalty-simple.js..."
rm -f "test-loyalty-simple.js"
# Matches pattern: /^test-/i
echo "Removing test-notification-fix.js..."
rm -f "test-notification-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-notification-system.js..."
rm -f "test-notification-system.js"
# Matches pattern: /^test-/i
echo "Removing test-notifications.mjs..."
rm -f "test-notifications.mjs"
# Matches pattern: /^test-/i
echo "Removing test-order-2-customer-notification.js..."
rm -f "test-order-2-customer-notification.js"
# Matches pattern: /^test-/i
echo "Removing test-order-3-comprehensive-notification-fix.js..."
rm -f "test-order-3-comprehensive-notification-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-order-8-receipt-v2.pdf..."
rm -f "test-order-8-receipt-v2.pdf"
# Matches pattern: /^test-/i
echo "Removing test-order-8-receipt-v3.pdf..."
rm -f "test-order-8-receipt-v3.pdf"
# Matches pattern: /^test-/i
echo "Removing test-order-8-receipt.pdf..."
rm -f "test-order-8-receipt.pdf"
# Matches pattern: /^test-/i
echo "Removing test-order-9-sms.js..."
rm -f "test-order-9-sms.js"
# Matches pattern: /^test-/i
echo "Removing test-order-note-notification.js..."
rm -f "test-order-note-notification.js"
# Matches pattern: /^test-/i
echo "Removing test-order-notification.mjs..."
rm -f "test-order-notification.mjs"
# Matches pattern: /^test-/i
echo "Removing test-order-sms-complete.js..."
rm -f "test-order-sms-complete.js"
# Matches pattern: /^test-/i
echo "Removing test-order-with-sms.js..."
rm -f "test-order-with-sms.js"
# Matches pattern: /^test-/i
echo "Removing test-pdf-generation.js..."
rm -f "test-pdf-generation.js"
# Matches pattern: /^test-/i
echo "Removing test-pos-system-complete.mjs..."
rm -f "test-pos-system-complete.mjs"
# Matches pattern: /^test-/i
echo "Removing test-pos-with-auth.mjs..."
rm -f "test-pos-with-auth.mjs"
# Matches pattern: /^test-/i
echo "Removing test-professional-invoice-v2.pdf..."
rm -f "test-professional-invoice-v2.pdf"
# Matches pattern: /^test-/i
echo "Removing test-professional-invoice.pdf..."
rm -f "test-professional-invoice.pdf"
# Matches pattern: /^test-/i
echo "Removing test-purchase-order.js..."
rm -f "test-purchase-order.js"
# Matches pattern: /^test-/i
echo "Removing test-receipt-generator.js..."
rm -f "test-receipt-generator.js"
# Matches pattern: /^test-/i
echo "Removing test-receipt-with-sku.pdf..."
rm -f "test-receipt-with-sku.pdf"
# Matches pattern: /^test-/i
echo "Removing test-redeployed-notifications.js..."
rm -f "test-redeployed-notifications.js"
# Matches pattern: /^test-/i
echo "Removing test-reorder-functionality.js..."
rm -f "test-reorder-functionality.js"
# Matches pattern: /^test-/i
echo "Removing test-sendgrid-detailed.js..."
rm -f "test-sendgrid-detailed.js"
# Matches pattern: /^test-/i
echo "Removing test-sendgrid-simple.js..."
rm -f "test-sendgrid-simple.js"
# Matches pattern: /^test-/i
echo "Removing test-sendgrid-verification.js..."
rm -f "test-sendgrid-verification.js"
# Matches pattern: /^test-/i
echo "Removing test-simple-sendgrid.js..."
rm -f "test-simple-sendgrid.js"
# Matches pattern: /^test-/i
echo "Removing test-sms-consent-fix.js..."
rm -f "test-sms-consent-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-sms-delivery.js..."
rm -f "test-sms-delivery.js"
# Matches pattern: /^test-/i
echo "Removing test-sms-fix.js..."
rm -f "test-sms-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-sms-opt-in-out.js..."
rm -f "test-sms-opt-in-out.js"
# Matches pattern: /^test-/i
echo "Removing test-sms-order-creation.js..."
rm -f "test-sms-order-creation.js"
# Matches pattern: /^test-/i
echo "Removing test-sms-with-api.js..."
rm -f "test-sms-with-api.js"
# Matches pattern: /^test-/i
echo "Removing test-spanish-notifications.js..."
rm -f "test-spanish-notifications.js"
# Matches pattern: /^test-/i
echo "Removing test-staff-notification-fix.js..."
rm -f "test-staff-notification-fix.js"
# Matches pattern: /^test-/i
echo "Removing test-tm-t88v-installation.js..."
rm -f "test-tm-t88v-installation.js"
# Matches pattern: /^test-/i
echo "Removing test-verified-sms.js..."
rm -f "test-verified-sms.js"
# Matches pattern: /^test-/i
echo "Removing test-your-receipt.cjs..."
rm -f "test-your-receipt.cjs"


echo "✅ Cleanup completed! Removed 248 files, saved ~65729KB"
echo "Backup created in .cleanup-backup/"
