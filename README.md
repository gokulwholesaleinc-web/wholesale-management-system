# Gokul Wholesale Management System

A comprehensive B2B e-commerce platform designed to streamline wholesale operations with advanced features for ordering, administration, inventory tracking, and business analytics.

## 🚀 Features

- **Multi-tier Customer Pricing** - Customizable pricing levels based on customer tiers
- **AI-Powered Invoice Processing** - GPT-4o integration for intelligent document processing
- **Comprehensive POS System** - Point-of-sale with barcode scanning and receipt printing
- **Order Management** - Complete workflow from cart to delivery tracking
- **Business Intelligence** - Advanced analytics and reporting dashboard
- **SMS/Email Notifications** - TCPA-compliant customer communication system
- **Credit Management** - Customer credit limits and transaction tracking
- **Tax Management** - Illinois TP1 tobacco sales tracking and compliance

## 🛠️ Tech Stack

**Frontend:**
- React with TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query for state management
- Vite for build tooling

**Backend:**
- Node.js with Express
- PostgreSQL with Drizzle ORM
- Custom authentication with role-based access

**Integrations:**
- OpenAI GPT-4o for AI features
- Twilio for SMS notifications
- SendGrid for email delivery
- Stripe for payment processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- API keys for external services

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/gokulwholesaleinc-web/wholesale-management-system.git
cd wholesale-management-system
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```bash
DATABASE_URL=your_postgresql_connection_string
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SESSION_SECRET=your_session_secret
OPENAI_API_KEY=your_openai_key
```

### Installation & Development

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 📁 Project Structure

```
├── client/          # React frontend application
├── server/          # Express backend API
├── shared/          # Shared types and schemas
├── public/          # Static assets
└── migrations/      # Database migrations
```

## 🔐 Security & Compliance

- TCPA-compliant SMS consent management
- Secure session management with database storage
- Role-based access control (Admin, Employee, Customer)
- Environment variable protection
- Illinois tobacco sales compliance (TP1 tracking)

## 📊 Key Modules

- **Authentication System** - Custom token-based with role management
- **Product Catalog** - Multi-category inventory with barcode support
- **Order Processing** - Complete B2B workflow with delivery tracking
- **POS Integration** - Hardware support for receipt printers and cash drawers
- **AI Recommendations** - Context-aware product suggestions
- **Business Analytics** - Profit margins, customer lifetime value, forecasting

## 🚀 Deployment

The application is designed to run on Replit with automatic deployments. For production:

1. Ensure all environment variables are configured
2. Database migrations are applied
3. External service integrations are tested

## 📄 License

This project is proprietary software for Gokul Wholesale, Inc.

## 🤝 Support

For technical support or questions, please contact the development team.