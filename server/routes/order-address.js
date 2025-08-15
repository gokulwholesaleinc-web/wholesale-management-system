// Direct route to get the correct delivery address for a specific order
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/:orderId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    
    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    // First get the delivery_address_id from the order
    const orderResult = await pool.query(
      'SELECT delivery_address_id FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (!orderResult.rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const addressId = orderResult.rows[0].delivery_address_id;
    
    if (!addressId) {
      return res.status(404).json({ error: 'No delivery address ID found for this order' });
    }
    
    // Then get the address details
    const addressResult = await pool.query(
      'SELECT * FROM delivery_addresses WHERE id = $1',
      [addressId]
    );
    
    if (!addressResult.rows.length) {
      return res.status(404).json({ error: 'Delivery address not found' });
    }
    
    const address = addressResult.rows[0];
    
    // Create a normalized response
    const normalizedAddress = {
      ...address,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2,
      postalCode: address.postal_code,
      businessName: address.business_name
    };
    
    res.json(normalizedAddress);
  } catch (error) {
    console.error('Error fetching order address:', error);
    res.status(500).json({ error: 'Server error when fetching order address' });
  }
});

module.exports = router;