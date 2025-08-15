import { Router, Request, Response } from 'express';
import { requireAdmin } from '../simpleAuth';
import { storage } from '../storage';

const router = Router();

// Global admin cart state - imported from routes.ts
// This is a reference to the same array declared in routes.ts
let globalAdminCart: any[] = [];

// Helper function to set the global cart array reference
export const setGlobalAdminCartReference = (cartArray: any[]) => {
  globalAdminCart = cartArray;
};

// Admin-only endpoint to reset admin cart
router.post('/reset-cart', requireAdmin, async (req: any, res: Response) => {
  try {
    console.log('🔥 ADMIN CART RESET REQUESTED BY ID:', req.user.id);
    
    // Empty the global cart array
    while(globalAdminCart.length > 0) {
      globalAdminCart.pop();
    }
    
    console.log('✅ ADMIN CART RESET COMPLETED');

    return res.json({
      success: true,
      message: 'Admin cart cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing admin cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear admin cart'
    });
  }
});

// Route to reset global admin cart directly
router.post('/clear-global-cart', requireAdmin, (req: Request, res: Response) => {
  try {
    console.log('💥 DIRECT GLOBAL ADMIN CART RESET');
    
    // Reset global admin cart to empty array
    while(globalAdminCart.length > 0) {
      globalAdminCart.pop();
    }
    
    console.log('✅ GLOBAL ADMIN CART RESET SUCCESSFUL');
    
    return res.json({
      success: true,
      message: 'Global admin cart cleared'
    });
  } catch (error) {
    console.error('Failed to clear global admin cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Error clearing global admin cart'
    });
  }
});

// Admin route to check cart state
router.get('/cart-status', requireAdmin, (req: Request, res: Response) => {
  return res.json({
    cartItems: globalAdminCart.length,
    success: true
  });
});

export default router;