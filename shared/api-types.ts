/**
 * Centralized API Type Registry
 * 
 * This file contains all standardized data structures used across the application
 * to prevent React errors and ensure consistent data handling between frontend and backend.
 * 
 * ALL components should import types from this registry instead of defining their own.
 */

// ============================================================================
// AI Analytics & Recommendations Types
// ============================================================================

export interface AIRecommendationStats {
  timeframe: 'week' | 'month' | 'quarter';
  overall: {
    totalViewed: number;
    totalClicked: number;
    totalAddedToCart: number;
    totalPurchased: number;
    clickThroughRate: string; // Always string percentage format "15.5"
    cartConversionRate: string; // Always string percentage format "8.2"
    purchaseConversionRate: string; // Always string percentage format "3.1"
  };
  byType: Array<{
    recommendationType: string;
    totalViewed: number;
    totalClicked: number;
    totalAddedToCart: number;
    totalPurchased: number;
    clickThroughRate: string;
    cartConversionRate: string;
    purchaseConversionRate: string;
  }>;
}

export interface TopPerformingRecommendation {
  productId: number;
  productName: string;
  totalViewed: number;
  totalClicked: number;
  totalAddedToCart: number;
  totalPurchased: number;
  currentPrice: number;
  productImage: string | null;
  clickThroughRate: string;
  cartConversionRate: string;
  purchaseConversionRate: string;
}

export interface SalesAnalyticsData {
  timeframe: string;
  salesData: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    averageOrdersPerCustomer: number;
  };
  observations: string[];
}

export interface CustomerBehaviorInsights {
  customerSegments: Array<{
    segment: string;
    characteristics: string[];
    size: number;
    averageOrderValue: number;
    frequency: string;
  }>;
  behaviorPatterns: Array<{
    pattern: string;
    description: string;
    impact: string;
    recommendation: string;
  }>;
  insights: string[];
  recommendations: string[];
}

export interface SalesTrendAnalysis {
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number;
  insights: string[];
  recommendations: string[];
  topPerformingProducts: Array<{
    productId: number;
    name: string;
    salesGrowth: number;
    reason: string;
  }>;
  underperformingProducts: Array<{
    productId: number;
    name: string;
    salesDecline: number;
    reason: string;
  }>;
}

export interface PricingOptimization {
  overallPricingHealth: 'optimal' | 'needs_adjustment' | 'critical';
  recommendations: Array<{
    productId: number;
    productName: string;
    currentPrice: number;
    suggestedPrice: number;
    reasoning: string;
    expectedImpact: string;
  }>;
  insights: string[];
  marketComparisons: Array<{
    category: string;
    ourAverage: number;
    marketAverage: number;
    competitiveness: 'competitive' | 'expensive' | 'cheap';
  }>;
}

// ============================================================================
// Business Analytics Types
// ============================================================================

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentActivity: Array<{
    id: number;
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }>;
}

export interface BusinessInsight {
  type: 'sales' | 'inventory' | 'customers' | 'orders';
  title: string;
  value: string | number;
  change: number; // percentage change
  trend: 'up' | 'down' | 'stable';
  description: string;
  timestamp: string;
}

// ============================================================================
// Product & Inventory Types
// ============================================================================

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  sku: string | null;
  categoryId: number | null;
  imageUrl: string | null;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  tier1Price: number | null;
  tier2Price: number | null;
  tier3Price: number | null;
  tier4Price: number | null;
  tier5Price: number | null;
  barcode: string | null;
  weight: number | null;
  dimensions: string | null;
  brand: string | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  productCount?: number;
}

// ============================================================================
// Order & Customer Types
// ============================================================================

export interface Order {
  id: number;
  customerId: number;
  status: 'pending' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  total: number;
  deliveryFee: number;
  deliveryAddressId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  paymentMethod: string | null;
  checkNumber: string | null;
  paymentNotes: string | null;
  completedAt: string | null;
}

export interface Customer {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  customerLevel: number;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Query Key Registry
// ============================================================================

export const API_ENDPOINTS = {
  // AI Analytics
  AI_RECOMMENDATION_STATS: '/api/admin/ai-recommendations/stats',
  AI_RECOMMENDATION_CONVERSION: '/api/admin/ai-recommendations/conversion',
  AI_TOP_PERFORMING: '/api/admin/ai-recommendations/top-performing',
  SALES_ANALYTICS: '/api/analytics/sales',
  AI_ANALYTICS_SALES_TRENDS: '/api/ai-analytics/sales-trends',
  AI_ANALYTICS_CUSTOMER_BEHAVIOR: '/api/ai-analytics/customer-behavior',
  AI_ANALYTICS_PRICING: '/api/ai-analytics/pricing-optimization',
  
  // Business Data
  ADMIN_STATS: '/api/admin-stats-data',
  BUSINESS_INSIGHTS: '/api/admin/business-insights',
  
  // Products & Categories
  PRODUCTS: '/api/products',
  ADMIN_PRODUCTS: '/api/admin/products',
  CATEGORIES: '/api/admin/categories',
  
  // Orders & Customers
  ORDERS: '/api/orders',
  ADMIN_ORDERS: '/api/admin/orders',
  CUSTOMERS: '/api/admin/customers',
  
  // Settings
  ORDER_SETTINGS: '/api/admin/order-settings',
} as const;

// ============================================================================
// Type Guards & Validators
// ============================================================================

export function isValidAIRecommendationStats(data: any): data is AIRecommendationStats {
  return (
    data &&
    typeof data === 'object' &&
    data.overall &&
    typeof data.overall.totalViewed === 'number' &&
    typeof data.overall.clickThroughRate === 'string' &&
    Array.isArray(data.byType)
  );
}

export function isValidSalesAnalyticsData(data: any): data is SalesAnalyticsData {
  return (
    data &&
    typeof data === 'object' &&
    data.salesData &&
    typeof data.salesData.totalRevenue === 'number' &&
    typeof data.salesData.averageOrdersPerCustomer === 'number' &&
    Array.isArray(data.observations)
  );
}

export function isValidCustomerBehaviorInsights(data: any): data is CustomerBehaviorInsights {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.customerSegments) &&
    Array.isArray(data.behaviorPatterns) &&
    Array.isArray(data.insights)
  );
}

// ============================================================================
// Default/Empty State Values
// ============================================================================

export const DEFAULT_AI_RECOMMENDATION_STATS: AIRecommendationStats = {
  timeframe: 'month',
  overall: {
    totalViewed: 0,
    totalClicked: 0,
    totalAddedToCart: 0,
    totalPurchased: 0,
    clickThroughRate: '0',
    cartConversionRate: '0',
    purchaseConversionRate: '0'
  },
  byType: []
};

export const DEFAULT_SALES_ANALYTICS: SalesAnalyticsData = {
  timeframe: 'month',
  salesData: {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    averageOrdersPerCustomer: 0
  },
  observations: ['No sales data available yet']
};

export const DEFAULT_CUSTOMER_BEHAVIOR: CustomerBehaviorInsights = {
  customerSegments: [],
  behaviorPatterns: [],
  insights: ['No customer behavior data available yet'],
  recommendations: []
};