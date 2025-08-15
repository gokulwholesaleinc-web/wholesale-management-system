// ENDPOINT REGISTRY - Prevents duplicate endpoints
// This file is auto-generated and tracks all API endpoints

export const ENDPOINT_REGISTRY = {
  // Authentication endpoints
  'POST /api/login': 'Authentication - User login',
  'POST /api/logout': 'Authentication - User logout',
  'GET /api/user/profile': 'Authentication - Get user profile',
  
  // Product endpoints
  'GET /api/products': 'Products - Get all products',
  'POST /api/admin/products': 'Products - Create product (admin)',
  'PUT /api/admin/products/:id': 'Products - Update product (admin)',
  'DELETE /api/admin/products/:id': 'Products - Delete product (admin)',
  
  // Cart endpoints
  'GET /api/cart': 'Cart - Get user cart',
  'POST /api/cart/add': 'Cart - Add item to cart',
  'PUT /api/cart/:productId': 'Cart - Update cart item',
  'DELETE /api/cart/:productId': 'Cart - Remove cart item',
  
  // Order endpoints
  'GET /api/orders': 'Orders - Get user orders',
  'POST /api/orders': 'Orders - Create new order',
  'GET /api/admin/orders': 'Orders - Get all orders (admin)',
  'PUT /api/admin/orders/:id': 'Orders - Update order (admin)',
  
  // Notification endpoints
  'GET /api/notifications': 'Notifications - Get user notifications',
  'PATCH /api/notifications/:id/read': 'Notifications - Mark as read',
  'DELETE /api/notifications/:id': 'Notifications - Delete notification',
  
  // Add more endpoints as needed...
};

// Function to check for duplicate endpoints
export function validateEndpoint(method: string, path: string) {
  const key = `${method} ${path}`;
  if (ENDPOINT_REGISTRY[key]) {
    throw new Error(`Duplicate endpoint detected: ${key}`);
  }
  return true;
}
