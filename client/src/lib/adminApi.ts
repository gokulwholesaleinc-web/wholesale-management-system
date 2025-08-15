/**
 * Centralized Admin API Client
 * Replaces scattered fetch usage with consistent auth and error handling
 */

import { apiRequest } from '@/lib/queryClient';
import { getAuthHeader, authenticatedFetch } from '@/lib/unifiedAuth';

/**
 * Admin-specific API client with proper authorization
 */
class AdminApiClient {
  private baseUrl = '/api/admin';

  /**
   * Make authenticated admin API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('/') ? endpoint : `${this.baseUrl}/${endpoint}`;
    
    try {
      const response = await authenticatedFetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }, 'main');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Admin API Error for ${url}:`, error);
      throw error;
    }
  }

  // User Management
  async getUsers(): Promise<any[]> {
    return this.request('users');
  }

  async getUser(id: string): Promise<any> {
    return this.request(`users/${id}`);
  }

  async createUser(userData: any): Promise<any> {
    return this.request('users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id: string, userData: any): Promise<any> {
    return this.request(`users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id: string): Promise<void> {
    return this.request(`users/${id}`, {
      method: 'DELETE'
    });
  }

  // Order Management
  async getOrders(params?: { page?: number; limit?: number; status?: string }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return this.request(`orders${queryString ? `?${queryString}` : ''}`);
  }

  async getOrder(id: string): Promise<any> {
    return this.request(`orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    return this.request(`orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Product Management
  async getProducts(): Promise<any[]> {
    return this.request('products');
  }

  async updateProductVisibility(id: string, visible: boolean): Promise<any> {
    return this.request(`products/${id}/visibility`, {
      method: 'PUT',
      body: JSON.stringify({ visible })
    });
  }

  async getProductPriceHistory(id: string): Promise<any[]> {
    return this.request(`products/${id}/price-history`);
  }

  async getProductSalesAnalytics(id: string): Promise<any> {
    return this.request(`products/${id}/sales-analytics`);
  }

  // Category Management
  async getCategories(): Promise<any[]> {
    return this.request('categories');
  }

  async mergeCategories(sourceId: string, targetId: string): Promise<any> {
    return this.request('categories/merge', {
      method: 'POST',
      body: JSON.stringify({ sourceId, targetId })
    });
  }

  // Tax Management
  async getFlatTaxes(): Promise<any[]> {
    return this.request('tax/flat-taxes');
  }

  async createFlatTax(taxData: any): Promise<any> {
    return this.request('tax/flat-taxes', {
      method: 'POST',
      body: JSON.stringify(taxData)
    });
  }

  async updateFlatTax(id: string, taxData: any): Promise<any> {
    return this.request(`tax/flat-taxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taxData)
    });
  }

  async deleteFlatTax(id: string): Promise<void> {
    return this.request(`tax/flat-taxes/${id}`, {
      method: 'DELETE'
    });
  }

  async getTaxCalculationAudits(): Promise<any[]> {
    return this.request('tax/calculation-audits');
  }

  async previewTaxCalculation(data: any): Promise<any> {
    return this.request('tax/calculate-preview', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Account Requests
  async getAccountRequests(): Promise<any[]> {
    return this.request('account-requests');
  }

  async approveAccountRequest(id: string, data: any): Promise<any> {
    return this.request(`account-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async rejectAccountRequest(id: string, reason: string): Promise<any> {
    return this.request(`account-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // SMS Consent Management
  async getSmsConsent(): Promise<any[]> {
    return this.request('sms-consent');
  }

  async updateSmsConsent(userId: string, consent: boolean): Promise<any> {
    return this.request(`sms-consent/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ consent })
    });
  }

  // Loyalty Management
  async getLoyaltyTransactions(): Promise<any[]> {
    return this.request('loyalty/transactions');
  }

  async adjustLoyaltyPoints(userId: string, points: number, reason: string): Promise<any> {
    return this.request('loyalty/manual-adjust', {
      method: 'POST',
      body: JSON.stringify({ userId, points, reason })
    });
  }

  async getLoyaltyStats(): Promise<any> {
    return this.request('loyalty/stats');
  }

  // AI Recommendations
  async getAiRecommendationsStatus(): Promise<any> {
    return this.request('ai-recommendations/status');
  }

  async regenerateAiRecommendations(): Promise<any> {
    return this.request('ai-recommendations/regenerate', {
      method: 'POST'
    });
  }

  async getAiRecommendationsHistory(): Promise<any[]> {
    return this.request('ai-recommendations/history');
  }

  // System Health & Insights
  async getSystemHealth(): Promise<any> {
    return this.request('system-health');
  }

  async getBusinessInsights(): Promise<any> {
    return this.request('business-insights');
  }

  async getRecentActivity(): Promise<any[]> {
    return this.request('recent-activity');
  }

  // Backup Management
  async getBackups(): Promise<any[]> {
    return this.request('backup');
  }

  async createBackup(): Promise<any> {
    return this.request('backup', {
      method: 'POST'
    });
  }

  async downloadBackup(id: string): Promise<Blob> {
    const response = await authenticatedFetch(`/api/admin/backup/${id}/download`, {}, 'main');
    if (!response.ok) {
      throw new Error(`Failed to download backup: ${response.statusText}`);
    }
    return response.blob();
  }

  async deleteBackup(id: string): Promise<void> {
    return this.request(`backup/${id}`, {
      method: 'DELETE'
    });
  }

  async restoreBackup(id: string): Promise<any> {
    return this.request(`backup/${id}/restore`, {
      method: 'POST'
    });
  }

  // Export Functions
  async exportInventory(): Promise<Blob> {
    const response = await authenticatedFetch('/api/admin/exports/inventory', {}, 'main');
    if (!response.ok) {
      throw new Error(`Failed to export inventory: ${response.statusText}`);
    }
    return response.blob();
  }

  async exportCustomers(): Promise<Blob> {
    const response = await authenticatedFetch('/api/admin/exports/customers', {}, 'main');
    if (!response.ok) {
      throw new Error(`Failed to export customers: ${response.statusText}`);
    }
    return response.blob();
  }
}

// Singleton instance
export const adminApi = new AdminApiClient();

/**
 * React hook for admin operations with proper error handling
 */
export function useAdminApi() {
  const handleApiError = (error: any) => {
    console.error('Admin API Error:', error);
    
    if (error.message.includes('401: Unauthorized')) {
      // Handle unauthorized access
      window.location.href = '/login';
      return;
    }
    
    if (error.message.includes('403:')) {
      throw new Error('Admin access required');
    }
    
    throw error;
  };

  return {
    api: adminApi,
    handleError: handleApiError
  };
}