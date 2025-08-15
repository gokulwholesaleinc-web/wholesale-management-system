import { apiRequest } from '@/lib/queryClient';

export const CART_KEY = ['/api/cart'] as const;

export async function fetchCart() {
  return apiRequest('/api/cart'); // assumes apiRequest returns parsed JSON
}

export async function updateQuantity(productId: number, quantity: number) {
  if (quantity <= 0) {
    return apiRequest('/api/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({ productId }),
    });
  }
  return apiRequest('/api/cart/update', {
    method: 'PUT',
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function removeFromCart(productId: number) {
  return apiRequest('/api/cart/remove', {
    method: 'DELETE',
    body: JSON.stringify({ productId }),
  });
}

export async function addToCart(productId: number, quantity: number = 1) {
  return apiRequest('/api/cart/add', {
    method: 'POST',
    body: { productId, quantity },
  });
}

export async function clearCartServer() {
  return apiRequest('DELETE', '/api/cart/clear');
}