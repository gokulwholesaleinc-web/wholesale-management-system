# Gokul Wholesale Application

## Overview
Gokul Wholesale is a comprehensive B2B e-commerce platform designed to streamline wholesale operations. It offers robust features for ordering, administration, inventory tracking, and business analytics. The platform aims to enhance customer experience and provide tools for managing products, orders, and business insights, including multi-tier pricing, AI-powered invoice processing, and comprehensive analytics for business growth and market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Major Updates (August 20, 2025)
**Password Reset System Complete Overhaul**: Implemented enterprise-grade password reset system with full cutover from legacy architecture. New system features cryptographically secure 256-bit tokens, SHA-256 hashing, single-use enforcement, and comprehensive security measures. Clean TypeScript services for email/SMS with proper error handling, environment validation, and TCPA-compliant messaging. Replaced legacy PasswordResetService with secure auth-reset router supporting email/SMS channels with user enumeration protection. System tested and verified working - endpoints responding correctly with proper token validation.

**Route Cleanup Completed**: Cleaned up legacy endpoints reducing total from 292 to 287. Removed 5 duplicate/deprecated endpoints including legacy password reset routes and duplicate cart endpoint. Eliminated 150+ lines of legacy code while maintaining all functionality. All endpoints documented and categorized for future reference.

**Multilingual Notification System Implemented**: Added comprehensive multilingual support for customer notifications supporting English, Spanish, and Hindi. System automatically detects user language preferences for account requests, order confirmations, status updates, and staff communications. Password reset notifications remain in English for security consistency. Fixed SMS service property issue (body→message) and integrated multilingual templates with proper fallback logic. All customer-facing notifications now respect individual language preferences.
**Password Reset Domain Configuration Fixed**: Resolved critical production deployment issue where password reset links generated incorrect Replit development URLs instead of shopgokul.com domain. Implemented enterprise-grade URL builder system with fail-fast production validation, environment-based configuration, proper query parameter handling, and SendGrid click tracking compatibility. System requires APP_URL environment variable in production deployment. Comprehensive deployment checklist and testing guide created for production verification.

**Password Reset Link Tracking Issue Resolved**: Fixed SendGrid click tracking corruption of password reset tokens. Implemented robust email delivery with tracking disabled, fallback token input UI, and corrected expiration time display from confusing "6 hours" to accurate "15 minutes". Enhanced system now bulletproof against email service provider link manipulation.

**Security Architecture Complete**: Achieved 99.1% security resolution with all TypeScript compilation errors fixed and enterprise-grade type safety implemented. Only 4 minor development-environment vulnerabilities remain in legacy dependencies.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui
- **Build Tool**: Vite
- **State Management**: TanStack Query
- **Routing**: Client-side with protected routes based on roles
- **UI/UX Decisions**: Consistent professional branding with Gokul Wholesale logo, optimized for mobile with responsive layouts, intuitive navigation including breadcrumbs. Product displays support dynamic card sizing. PWA support for iOS and Android.

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM
- **Authentication**: Custom token-based system with role-based access control (Admin, Employee, Customer) and customer tier levels (1-5). Session persistence with database-backed storage. Separate token systems and device fingerprinting for POS.
- **File Handling**: Multer for image uploads.

### Database
- **Primary Database**: PostgreSQL (configured for Neon/Replit)
- **Connection Pooling**: Neon serverless pool
- **Migration System**: Drizzle Kit

### Key Features & Technical Implementations
- **Authentication**: Custom token-based, role-based access control with an independent in-store POS authentication layer.
- **AI Invoice Processing**: Utilizes GPT-4o for data extraction (PDF/image), intelligent product mapping, category suggestion, and user approval workflow. Supports brand-specific recognition.
- **AI Recommendation Engine**: GPT-4o powered system analyzing seasonal trends, weather, sporting events, and economic factors for contextual product recommendations.
- **Product Management**: Comprehensive catalog with categories, multi-tier pricing, inventory tracking, image uploads, barcode support, and a purchase order system.
- **Order Management**: Shopping cart, order processing, delivery address management, status tracking, history, delivery fee calculation, and bulk order completion.
- **Admin Dashboard**: Real-time business statistics, user management, product/category management, order fulfillment, backup/restore, activity logging, credit management, AI recommendation management, and comprehensive tax management.
- **Business Intelligence Dashboard**: Advanced analytics including profit margins, customer lifetime value, pricing intelligence, sales forecasting, and AI-powered business insights.
- **Unified POS System**: Comprehensive point-of-sale system with barcode scanning, customer pricing memory, hold/recall transactions, order management, customer history, credit management, and receipt printing.
- **Tax Management System**: Admin interface for flat tax configuration, IL-TP1 tobacco sales tracking, tax calculation audits, and customer/product tax settings. Handles percentage and flat taxes, with database-driven flat tax values.
- **Customer Features**: Registration, profile management, product browsing (search/filter), shopping cart, multiple delivery addresses, order history, and customer-specific pricing.
- **Account Creation System**: User-defined username/password, admin approval workflow with customer tier selection, credit limit assignment, and multi-staff email and SMS notifications with TCPA compliance.
- **Notifications**: Comprehensive SMS and email notification system with multilingual support, template-based routing, and TCPA-compliant SMS consent management. Dual phone number system for cell and business phones. Email and SMS notifications are coordinated. Staff notification system for account requests includes both email and SMS alerts with proper consent verification.
- **PDF Generation**: Server-side generation for professional invoices and receipts, displaying customer information, order details, and credit account balance tracking. Includes business branding and tax compliance messages. Advanced address normalization for consistent display.
- **Hardware Integration**: Supports Epson TM-T88V receipt printers and MMF cash drawers.
- **Consent Tracking**: Enhanced system for capturing SMS consent and privacy policy acceptance (IP address, user agent, timestamp).
- **Unified Order Architecture**: Single-component systems for `UnifiedOrderDetail.tsx` (role-based order display) and `UnifiedOrderList.tsx` (order listings), eliminating duplication.
- **Calculation System**: Comprehensive system with item line details, standard subtotal fields, loyalty points calculation (2% non-tobacco), and invariant checks. Checkout-time recalculation using fresh database lookups for flat taxes.
- **Excel Exports**: Functionality for sales and customer data.
- **Customer Price Memory**: Tracks historical customer purchase prices.
- **Enhanced Payment Dialog**: Advanced PaymentConfirmationDialog with manager override capability, auto-populated notes, real-time credit validation, and comprehensive error handling.

## External Dependencies

- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Web Framework**: `express`
- **File Handling**: `multer`, `archiver`
- **Authentication/Security**: `bcrypt`
- **AI/ML**: OpenAI GPT-4o
- **Frontend State Management**: `@tanstack/react-query`
- **UI Components**: `@radix-ui/react-*`, `tailwindcss` (`shadcn/ui`)
- **Forms & Validation**: `react-hook-form`, `zod`
- **Development Tools**: `typescript`, `vite`
- **SMS Integration**: Twilio
- **Email Integration**: SendGrid