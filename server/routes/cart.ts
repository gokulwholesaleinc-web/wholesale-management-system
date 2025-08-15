import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../simpleAuth";

const cartRoutes = Router();

export default cartRoutes;

// Get cart items
cartRoutes.get('/cart', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching cart items for user:', userId);
    
    const cartItems = await storage.getCartItems(userId);
    console.log(`Found ${cartItems.length} cart items for user ${userId}`);
    res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Failed to fetch cart items' });
  }
});

// Add to cart - SINGLE IMPLEMENTATION
cartRoutes.post('/cart/add', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: 'Valid product ID and quantity are required' });
    }
    
    const cartItemData = {
      userId,
      productId: parseInt(productId),
      quantity: parseInt(quantity)
    };
    
    const cartItem = await storage.addToCart(cartItemData);
    const cart = await storage.getCartItems(userId);
    res.json({ success: true, cart, item: cartItem });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
});

// Update cart item quantity - SINGLE IMPLEMENTATION
cartRoutes.put('/cart/update', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;
    
    if (!productId || quantity === undefined || quantity < 0) {
      return res.status(400).json({ message: 'Valid product ID and quantity (>= 0) are required' });
    }
    
    if (quantity === 0) {
      await storage.removeFromCart(userId, parseInt(productId));
      res.json({ message: 'Item removed from cart' });
    } else {
      const cartItem = await storage.updateCartItem(userId, parseInt(productId), parseInt(quantity));
      res.json(cartItem);
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
});

// Clear cart - SINGLE IMPLEMENTATION
cartRoutes.delete('/cart/clear', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await storage.clearCart(userId);
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
});