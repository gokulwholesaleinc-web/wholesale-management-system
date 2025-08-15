# POS Development Guide

This document provides step-by-step instructions for developing and testing the Point of Sale (POS) system locally.

## Quick Start

### 1. Start the Development Environment

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run pos:dev
```

This will start the development server and automatically open the POS system at `/instore`.

### 2. Generate In-Store Access Code

The POS system requires an in-store access code for authentication. To generate one:

1. Navigate to `/admin` in the main application
2. Go to the "Store Management" section
3. Click "Generate In-Store OTP" 
4. The OTP will be sent to your registered email address
5. Use this OTP code during POS login

Alternatively, if you have admin access, you can check the server logs for OTP codes during development.

### 3. POS Login Process

1. Go to `/instore/login`
2. Enter your employee/admin credentials:
   - Username/Email: Your existing user account
   - Password: Your account password
3. Enter the in-store access code (OTP from step 2)
4. Optionally mark the device as trusted for 30 days

## Testing Workflows

### End-to-End Sale Testing

1. **Login to POS**
   - Follow the login process above
   - Verify you're redirected to the POS dashboard

2. **Navigate to Sales**
   - Click "New Sale" or go to `/instore/sale`
   - The interface should load with an empty cart

3. **Add Products**
   - Use the search bar to find products
   - Click "Add to Cart" or use barcode scanning (if hardware is connected)
   - Verify products appear in the cart with correct pricing

4. **Select Customer** (Optional)
   - Search for and select a customer
   - Pricing memory should apply automatically if available

5. **Process Payment**
   - Choose payment method (Cash, Card, Check, Account Credit)
   - For cash: Enter amount received
   - For account credit: Verify credit limit validation
   - Complete the transaction

6. **Verify Receipt**
   - Transaction should generate a receipt using server transaction data
   - Receipt should display the transaction number
   - Check that all transaction details are accurate

### Credit Line Testing

1. **Setup Test Customer with Credit**
   - In admin panel, create or modify a customer
   - Set up a credit line with a specific limit (e.g., $500)

2. **Test Credit Purchase**
   - Add products to cart totaling less than credit limit
   - Select the customer with credit
   - Choose "Account Credit" payment method
   - Transaction should complete successfully

3. **Test Credit Overflow**
   - Add products exceeding the customer's available credit
   - Attempt to pay with "Account Credit"
   - Should receive validation error with clear message

### Manager Override Testing

1. **Trigger Override Scenario**
   - Attempt an action requiring manager approval (e.g., large discount)
   - System should prompt for manager override

2. **Complete Override**
   - Enter manager credentials (admin/employee account)
   - Verify override is approved and logged
   - Action should complete successfully

### Report Testing

Navigate to `/instore/reports` and verify all report sections load:

- **End of Day Report**: Shows daily sales summary
- **Hourly Sales**: Breakdown by hour
- **Cashier Performance**: Staff performance metrics  
- **Product Movement**: Top selling products

*Note: Reports currently show sample data. Real calculations will be implemented in future iterations.*

## Hardware Testing

### Cash Drawer (TM-T88V MMF)

1. **Install Driver** (Windows only)
   ```bash
   # Run the driver installer
   ./install-tm-t88v-driver.bat
   ```

2. **Test Connection**
   - Go to `/instore/hardware-test`
   - Click "Test Cash Drawer"
   - Drawer should open if properly connected

3. **During Sales**
   - Press F8 key to open cash drawer
   - Drawer should open with audio/visual feedback

### Receipt Printing

1. **Setup Printer**
   - Configure thermal receipt printer
   - Verify it's set as default printer in Windows

2. **Test Printing**
   - Complete a sale transaction
   - Click "Print Receipt" button
   - Receipt should print with transaction details

## Development Scripts

### Available Commands

```bash
# Start POS development environment
npm run pos:dev

# Type checking for POS components
npm run pos:typecheck

# Run all tests
npm test

# Start regular development server
npm run dev

# Build for production
npm run build
```

### POS-Specific URLs

- **POS Login**: `/instore/login`
- **POS Dashboard**: `/instore/dashboard`  
- **New Sale**: `/instore/sale`
- **Inventory**: `/instore/inventory`
- **Customers**: `/instore/customers` 
- **Reports**: `/instore/reports`
- **Hardware Test**: `/instore/hardware-test`

## Authentication Details

### Token System

The POS system uses a dual-token approach:

1. **Main JWT Token**: Used for API calls, stored in unified auth system
2. **POS Session Token**: Used for route gating within POS interface

Both tokens are set during the POS login process for seamless operation.

### Route Protection

- All `/instore/*` routes (except `/instore/login`) require valid authentication
- API endpoints under `/api/pos/*` require employee/admin privileges
- Route guards automatically redirect to login if authentication is missing

## Troubleshooting

### Common Issues

1. **"No main JWT found" error**
   - Clear browser storage and re-login
   - Ensure OTP verification completed successfully

2. **Products not loading**
   - Check network tab for API errors
   - Verify employee/admin privileges
   - Check server logs for authentication issues

3. **Hardware not responding**
   - Verify drivers are installed (Windows)
   - Check printer/drawer connections
   - Review hardware bridge logs at `http://localhost:8080`

4. **Credit validation errors**
   - Verify customer has established credit line
   - Check credit limit and current balance
   - Review transaction amounts

### Debug Mode

Enable detailed logging by adding to localStorage:

```javascript
localStorage.setItem('pos_debug', 'true');
```

This will provide additional console output for troubleshooting.

## API Endpoints Reference

### Authentication
- `POST /api/pos/login` - Initial login
- `POST /api/pos/verify-otp` - OTP verification

### Products & Inventory  
- `GET /api/pos/products?search=...` - Search products
- `GET /api/pos/categories` - Get categories

### Transactions
- `POST /api/pos/transactions` - Process sale
- `GET /api/pos/held-transactions` - Get held transactions
- `POST /api/pos/held-transactions/:id/recall` - Recall held transaction

### Reports
- `GET /api/pos/reports/end-of-day?date=YYYY-MM-DD`
- `GET /api/pos/reports/hourly-sales?date=YYYY-MM-DD`
- `GET /api/pos/reports/cashier-performance?date=YYYY-MM-DD`
- `GET /api/pos/reports/product-movement?date=YYYY-MM-DD`

### Manager Override
- `POST /api/pos/manager-override` - Request manager approval

---

## Support

For technical issues or questions about POS development:

1. Check this documentation first
2. Review console errors and network requests
3. Check server logs for API errors
4. Test with different user accounts and permissions

The POS system is designed to be robust and user-friendly. Follow the testing workflows above to ensure all functionality works as expected.