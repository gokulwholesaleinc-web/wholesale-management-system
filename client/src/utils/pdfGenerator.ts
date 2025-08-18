// Main PDF Generator - Dynamically switches between legacy and enhanced styles
import { apiRequest } from "@/lib/queryClient";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  createdAt: string | null;
  product?: { 
    id: number; 
    name: string; 
    sku?: string; 
    isTobaccoProduct?: boolean;
  };
  productName?: string;
  flatTaxAmount?: number;
  totalTaxAmount?: number;
  flatTaxName?: string;
  isTobaccoProduct?: boolean;
}

interface Order {
  id: number;
  userId: string;
  total: number;
  orderType: "delivery" | "pickup" | string;
  deliveryDate: string | null;
  deliveryTimeSlot: string | null;
  deliveryFee: number | null;
  deliveryNote: string | null;
  pickupTimeSlot: string | null;
  pickupNote: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  items: OrderItem[];
  deliveryAddressData?: any;
  paymentMethod?: string;
  checkNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  notes?: string;
  adminNote?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsValue?: number;
  loyaltyPointsEarned?: number;
  flatTaxBreakdown?: any[];
  calculationBreakdown?: any;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    businessName?: string | null;
    username: string;
  };
  previousBalance?: number;
  creditAccountInfo?: { previousBalance?: number };
}

// Helper function to resolve credit balance with pre-computation
async function resolvePreviousBalance(order: Order): Promise<number> {
  // First try to use provided values
  if (typeof order.previousBalance === 'number') {
    return order.previousBalance;
  }
  
  if (order.creditAccountInfo?.previousBalance !== undefined) {
    return order.creditAccountInfo.previousBalance;
  }

  // Fallback to API call with multiple endpoint strategy
  try {
    const endpoints = [
      `/api/users/${order.userId}/credit-balance`,
      `/api/credit-accounts/${order.userId}`,
      `/api/users/${order.userId}/account-balance`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await apiRequest(endpoint);
        
        // Handle different response formats
        if (typeof response === 'number') {
          return response;
        }
        if (response && typeof response.balance === 'number') {
          return response.balance;
        }
        if (response && typeof response.previousBalance === 'number') {
          return response.previousBalance;
        }
        if (response && typeof response.currentBalance === 'number') {
          return response.currentBalance;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.warn('All credit balance endpoints failed:', error);
  }

  // Ultimate fallback
  return 0;
}

// Main export function that chooses the right generator
export const generateOrderPDF = async (order: Order, customerName?: string) => {
  try {
    // Get invoice style setting from admin settings
    const orderSettings = await apiRequest('/api/admin/order-settings');
    const invoiceStyle = orderSettings?.invoiceStyle || 'legacy';

    // Pre-compute credit balance for enhanced version
    const previousBalance = await resolvePreviousBalance(order);

    if (invoiceStyle === 'enhanced') {
      // Dynamic import of enhanced generator
      const { generateOrderPDF: generateEnhanced } = await import('./pdfGeneratorEnhanced');
      return await generateEnhanced(order, customerName, previousBalance);
    } else {
      // Dynamic import of legacy generator
      const { generateOrderPDF: generateLegacy } = await import('./pdfGeneratorLegacy');
      return generateLegacy(order, customerName);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Fallback to legacy if enhanced fails
    try {
      const { generateOrderPDF: generateLegacy } = await import('./pdfGeneratorLegacy');
      return generateLegacy(order, customerName);
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError);
      throw new Error('PDF generation failed');
    }
  }
};