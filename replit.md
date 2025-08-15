# Gokul Wholesale Application

## Overview
Gokul Wholesale is a comprehensive B2B e-commerce platform designed to streamline wholesale operations. It offers robust features for ordering, administration, inventory tracking, and business analytics. The platform aims to enhance customer experience and provide tools for managing products, orders, and business insights, including multi-tier pricing, AI-powered invoice processing, and comprehensive analytics for business growth and market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **PDF Generation**: Server-side generation for professional invoices and receipts, displaying customer information, order details, and credit account balance tracking. Includes business branding and tax compliance messages.
- **Hardware Integration**: Supports Epson TM-T88V receipt printers and MMF cash drawers.
- **Consent Tracking**: Enhanced system for capturing SMS consent and privacy policy acceptance (IP address, user agent, timestamp).
- **Unified Order Architecture**: Single-component systems for `UnifiedOrderDetail.tsx` (role-based order display) and `UnifiedOrderList.tsx` (order listings), eliminating duplication.
- **Calculation System**: Comprehensive system with item line details, standard subtotal fields, loyalty points calculation (2% non-tobacco), and invariant checks. Checkout-time recalculation using fresh database lookups for flat taxes.
- **Excel Exports**: Functionality for sales and customer data.
- **Customer Price Memory**: Tracks historical customer purchase prices.
- **Enhanced Payment Dialog**: Advanced PaymentConfirmationDialog with manager override capability, auto-populated notes, real-time credit validation, and comprehensive error handling.
- **Credit Management Testing Guide**: Comprehensive step-by-step guide for testing all credit system enhancements and manager override functionality.

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