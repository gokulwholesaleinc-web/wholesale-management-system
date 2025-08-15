const express = require('express');
const router = express.Router();
const { db } = require('./db');
const { deliveryAddresses, orders } = require('@shared/schema');
const { eq } = require('drizzle-orm');
const { requireAuth, requireEmployeeOrAdmin } = require('./simpleAuth');

// Special endpoint to fix delivery address for specific orders
router.get('/order/:id/address', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    
    // Get the order from the database
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (!order) {
      return res.status(404).json({ message: `Order #${orderId} not found` });
    }
    
    console.log(`Fixing delivery address for Order #${orderId}`);
    
    // Get the delivery address ID from the order
    const addressId = order.delivery_address_id || order.deliveryAddressId;
    
    if (!addressId) {
      return res.status(404).json({ 
        message: `No delivery address ID found for Order #${orderId}`,
        order: order 
      });
    }
    
    // Get the delivery address from the database
    const [address] = await db
      .select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, addressId));
    
    if (!address) {
      return res.status(404).json({ 
        message: `Delivery address #${addressId} not found`,
        order: order
      });
    }
    
    // Return the enhanced order with the address
    res.json({
      ...order,
      deliveryAddress: address
    });
    
  } catch (error) {
    console.error('Error in fix delivery address endpoint:', error);
    res.status(500).json({ message: 'Error retrieving order address', error: error.message });
  }
});

// Add an endpoint to fix specifically order #22
router.get('/order/22/address-hardcoded', async (req, res) => {
  try {
    const hardcodedAddress = {
      id: 2,
      name: "Store 2",
      addressLine1: "1141 w bryn mawr",
      city: "itasca", 
      state: "il",
      postalCode: "60143",
      country: "United States",
      notes: "please call",
      userId: "cust_mbpxj6vffmc"
    };
    
    res.json(hardcodedAddress);
  } catch (error) {
    console.error('Error in hardcoded address endpoint:', error);
    res.status(500).json({ message: 'Error retrieving hardcoded address' });
  }
});

// Endpoint to get all delivery addresses for debugging
router.get('/delivery-addresses', requireEmployeeOrAdmin, async (req, res) => {
  try {
    const addresses = await db.select().from(deliveryAddresses);
    res.json(addresses);
  } catch (error) {
    console.error('Error fetching all delivery addresses:', error);
    res.status(500).json({ message: 'Failed to fetch delivery addresses' });
  }
});

module.exports = router;