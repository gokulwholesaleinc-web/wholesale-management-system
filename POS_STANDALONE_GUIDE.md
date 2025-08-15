# POS Standalone API Service Guide

## Overview

The POS Standalone API Service provides a complete, independent point-of-sale system that can operate separately from the main e-commerce application. This service includes your comprehensive business logic for Illinois OTP tax calculations, inventory management, and transaction processing.

## Quick Start

### Option 1: Integrated with Main Application
The POS system is already integrated into your main enterprise admin dashboard at `/admin` under the "POS System" tab.

### Option 2: Standalone Service
Run the POS system as a separate service:

```bash
# Start the standalone POS API server
npm run pos:standalone

# Or with custom port
POS_PORT=3001 npm run pos:dev
```

## Configuration

Set these environment variables:
```bash
POS_STORE_ID=ITASCA          # Your store identifier
POS_REGISTER_ID=REG-01       # Register identifier
POS_PORT=3001                # Port for standalone service (optional)
```

## API Endpoints

### Register Management
- `GET /api/pos/register/status` - Get current register status
- `POST /api/pos/register/open` - Open a register
- `POST /api/pos/register/close` - Close a register

### Product Management
- `GET /api/pos/products/:sku` - Lookup product by SKU

### Sales Management
- `POST /api/pos/sales` - Create a new sale
- `GET /api/pos/sales` - Get all sales
- `GET /api/pos/sales/:id` - Get specific sale

### Inventory Management
- `GET /api/pos/inventory` - Get inventory adjustments
- `POST /api/pos/inventory/adjust` - Manual inventory adjustment

### Reports & Analytics
- `GET /api/pos/stats` - Get business statistics
- `GET /api/pos/reports/daily/:date` - Daily sales report

### System Health
- `GET /api/pos/health` - Health check and system status

## Business Logic Features

### Illinois OTP Tax Compliance
- Automatic 45% tobacco tax on items with SKUs starting with 'TOB' or containing 'ECIG'
- Per-line OTP override support
- Complete tax calculation with other taxes

### Transaction Processing
- Payment validation with change calculation
- Multiple tender types (CASH, CARD, OTHER)
- Transaction ID format: `POS-YYYYMMDD-XXXXXXXX`

### Inventory Management
- Automatic inventory adjustments for sales/refunds
- Manual adjustment tracking with reasons
- Complete audit trail

### Register Operations
- Open/close with float tracking
- Z-sequence management
- Timestamp audit trail

## Example Usage

### Create a Sale
```bash
curl -X POST http://localhost:3001/api/pos/sales \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "ITASCA",
    "register_id": "REG-01",
    "cashier_id": "admin",
    "items": [{
      "sku": "BIC-MINI-50",
      "name": "Bic Mini Lighters (50ct)",
      "qty": 1,
      "unit_price": 4500,
      "line_tax_rate": 0.08,
      "il_otp_cents": 0
    }],
    "tenders": [{
      "type": "CASH",
      "amount": 5000
    }]
  }'
```

### Get Register Status
```bash
curl http://localhost:3001/api/pos/register/status
```

### Daily Report
```bash
curl http://localhost:3001/api/pos/reports/daily/2025-08-15
```

## Integration with Enterprise Admin

Your POS system is fully integrated with the enterprise admin dashboard, providing:
- Real-time business statistics
- Register monitoring
- Sales tracking
- File management (receipts/exports)
- Inventory movement tracking

## Architecture

### Database Structure
- In-memory storage using Map objects
- Registers: Active register status and history
- Sales: Complete transaction records
- Inventory Ledger: All stock movements with reasons

### Service Separation
- Complete independence from main e-commerce system
- Shared business logic via `server/services/pos-db.ts`
- Enterprise monitoring via admin dashboard
- Standalone API capability for external integrations

## Production Deployment

### Standalone Mode
1. Set production environment variables
2. Run: `npm run pos:standalone`
3. Configure reverse proxy to port 3001
4. Set up monitoring and logging

### Integrated Mode
The POS system runs automatically with your main application and is accessible via the enterprise admin dashboard.

## Monitoring & Maintenance

- Health check endpoint: `/api/pos/health`
- Enterprise admin dashboard provides comprehensive monitoring
- All transactions logged with audit trail
- Automatic inventory synchronization
- Illinois tax compliance reporting

## Support Files

- `server/services/pos-db.ts` - Core business logic
- `server/routes/pos.ts` - API endpoints
- `server/pos-standalone.ts` - Standalone server
- `shared/pos-types.ts` - TypeScript definitions