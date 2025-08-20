# Maintenance Scripts

This directory contains development and maintenance scripts that are not part of the production application.

## Security Scripts
- `twilio-compliance-verification.js` - TCPA compliance validation
- `twilio-verification-setup.js` - Twilio API setup verification
- `unified-auth-verification.mjs` - Authentication system validation

## Database & Sync Scripts
- `complete-sync-validation.mjs` - Full database synchronization check
- `endpoint_sync_fixer.mjs` - Fix endpoint synchronization issues
- `find-remaining-sync-issues.mjs` - Identify remaining sync problems
- `use_existing_registry.mjs` - Registry validation utilities

## Development Tools
- `monitor-order-creation.js` - Order creation monitoring
- `quick-test-order.js` - Order system testing
- `deployment-check.sh` - Pre-deployment validation
- `deployment-verification.js` - Post-deployment verification

## User Management
- `update-test1-password.mjs` - Test user password updates
- `verify-staff-permissions.mjs` - Staff permission validation

## Repository Management
- `git-cleanup-and-fix.sh` - Git repository maintenance
- `safe_cleanup_script.sh` - Safe file cleanup operations

## Usage Notes
- These scripts are excluded from production builds
- Run from project root: `node scripts/maintenance/script-name.js`
- Always test in development environment first
- Some scripts require environment variables or API keys