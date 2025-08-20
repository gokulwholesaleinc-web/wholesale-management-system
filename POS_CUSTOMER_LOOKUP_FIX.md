# POS Customer Lookup Fix

## ✅ **Problem Identified & Fixed**

### **Issue:**
Customer lookup in `/instore/sale` was not showing any customers.

### **Root Cause:**
The POS sale screen was calling `/api/users` instead of the dedicated `/api/pos/customers` endpoint.

### **Solution Implemented:**
```typescript
// Before (wrong endpoint):
const { data: customers = [] } = useQuery({
  queryKey: ['/api/users'], // ❌ Main app endpoint
  ...
});

// After (correct endpoint):
const { data: customers = [] } = useQuery({
  queryKey: ['/api/pos/customers'], // ✅ POS-specific endpoint
  ...
});
```

### **What the POS Customers Endpoint Provides:**
- Filters out admin/employee accounts automatically
- Returns only customer accounts (customerLevel >= 1)
- Includes relevant fields: username, firstName, lastName, email, company, customerLevel, phone
- Supports search functionality
- Optimized for POS performance

### **Verification:**
The `/api/pos/customers` endpoint is working and returning customers like:
- "Gasdepot - Jigar Patel"
- "test1 - Test User Customer"  
- "Ogden@2950 - Alex Patel"

### **Additional Improvements:**
Added debugging console logs to help monitor customer data loading:
```typescript
select: (data: any) => {
  console.log('POS Customers raw data:', data);
  // ... filtering logic
  console.log('Filtered POS customers:', customers);
  return customers;
}
```

## 🎯 **Result**

**Customer lookup in `/instore/sale` should now:**
- Display all customer accounts
- Show customer names and details
- Support customer search functionality
- Filter to only actual customers (no admin/staff)

**Test by:**
1. Go to `/instore/sale`
2. Click customer lookup/selection
3. Should see list of customers like "test1 - Test User Customer"
4. Search should work to filter customers