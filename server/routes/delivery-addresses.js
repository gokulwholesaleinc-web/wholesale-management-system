const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { deliveryAddresses, orders } = require('../../shared/schema');
const { eq } = require('drizzle-orm');

// Get all delivery addresses (admin endpoint)
router.get('/', async (req, res) => {
  console.log('Fetching all delivery addresses');
  
  try {
    // Query for all addresses
    const allAddresses = await db.select()
      .from(deliveryAddresses);
    
    console.log(`Found ${allAddresses.length} total delivery addresses`);
    
    // Normalize fields to support both camelCase and snake_case formats
    const normalizedAddresses = allAddresses.map(address => ({
      ...address,
      addressLine1: address.addressLine1 || address.address_line1,
      address_line1: address.address_line1 || address.addressLine1,
      addressLine2: address.addressLine2 || address.address_line2,
      address_line2: address.address_line2 || address.addressLine2,
      postalCode: address.postalCode || address.postal_code,
      postal_code: address.postal_code || address.postalCode,
      businessName: address.businessName || address.business_name,
      business_name: address.business_name || address.businessName
    }));
    
    res.json(normalizedAddresses);
  } catch (error) {
    console.error('Error fetching all delivery addresses:', error);
    res.status(500).json({ error: 'Failed to fetch delivery addresses' });
  }
});

// Get delivery addresses for a specific user
router.get('/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`Fetching delivery addresses for user: ${userId}`);
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  
  try {
    // Query for addresses belonging to the user
    const userAddresses = await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.userId, userId));
    
    console.log(`Found ${userAddresses.length} addresses for user ${userId}`);
    
    // Normalize fields to support both camelCase and snake_case formats
    const normalizedAddresses = userAddresses.map(address => ({
      ...address,
      addressLine1: address.addressLine1 || address.address_line1,
      address_line1: address.address_line1 || address.addressLine1,
      addressLine2: address.addressLine2 || address.address_line2,
      address_line2: address.address_line2 || address.addressLine2,
      postalCode: address.postalCode || address.postal_code,
      postal_code: address.postal_code || address.postalCode,
      businessName: address.businessName || address.business_name,
      business_name: address.business_name || address.businessName
    }));
    
    res.json(normalizedAddresses);
  } catch (error) {
    console.error('Error fetching user delivery addresses:', error);
    res.status(500).json({ error: 'Failed to fetch user delivery addresses' });
  }
});

// Get delivery address by ID - specific endpoint for order details view
router.get('/:id', async (req, res) => {
  const addressId = parseInt(req.params.id);
  console.log(`Fetching delivery address by ID: ${addressId}`);
  
  if (!addressId || isNaN(addressId)) {
    return res.status(400).json({ error: 'Invalid address ID' });
  }
  
  try {
    // Query for the address
    const [address] = await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, addressId));
    
    if (!address) {
      console.log(`No address found with ID: ${addressId}`);
      return res.status(404).json({ error: 'Address not found' });
    }
    
    // Normalize fields to support both camelCase and snake_case formats
    const normalizedAddress = {
      ...address,
      addressLine1: address.addressLine1 || address.address_line1,
      address_line1: address.address_line1 || address.addressLine1,
      addressLine2: address.addressLine2 || address.address_line2,
      address_line2: address.address_line2 || address.addressLine2,
      postalCode: address.postalCode || address.postal_code,
      postal_code: address.postal_code || address.postalCode,
      businessName: address.businessName || address.business_name,
      business_name: address.business_name || address.businessName
    };
    
    console.log(`Successfully retrieved address: ${normalizedAddress.name}`);
    res.json(normalizedAddress);
  } catch (error) {
    console.error('Error fetching delivery address:', error);
    res.status(500).json({ error: 'Failed to fetch delivery address' });
  }
});

// For updating order delivery addresses
router.put('/order/:orderId', async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const { addressId } = req.body;
  
  if (!orderId || isNaN(orderId) || !addressId || isNaN(addressId)) {
    return res.status(400).json({ error: 'Invalid order ID or address ID' });
  }
  
  try {
    await db.update(orders)
      .set({ delivery_address_id: addressId })
      .where(eq(orders.id, orderId));
    
    res.json({ success: true, message: 'Order delivery address updated' });
  } catch (error) {
    console.error('Error updating order delivery address:', error);
    res.status(500).json({ error: 'Failed to update order delivery address' });
  }
});

module.exports = router;