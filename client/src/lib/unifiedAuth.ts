/**
 * Unified Authentication Storage
 * 
 * Provides a consistent interface for authentication data storage
 * across different environments (browser, PWA, mobile webview)
 */

const AUTH_STORAGE_KEY = 'gokul_auth_data';
const TOKEN_STORAGE_KEY = 'authToken';

export interface AuthData {
  token: string;
  user: any;
  expiresAt: number;
  loginTime: number;
}

export class UnifiedAuthStorage {
  private static instance: UnifiedAuthStorage;

  private constructor() {}

  static getInstance(): UnifiedAuthStorage {
    if (!UnifiedAuthStorage.instance) {
      UnifiedAuthStorage.instance = new UnifiedAuthStorage();
    }
    return UnifiedAuthStorage.instance;
  }

  /**
   * Store authentication data
   */
  setAuthData(authData: AuthData): void {
    try {
      const authString = JSON.stringify(authData);
      
      // Always store in sessionStorage for immediate access
      sessionStorage.setItem(AUTH_STORAGE_KEY, authString);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, authData.token);
      
      // Also store in localStorage for persistence
      localStorage.setItem(AUTH_STORAGE_KEY, authString);
      localStorage.setItem(TOKEN_STORAGE_KEY, authData.token);
      
      console.log('[UnifiedAuth] Auth data stored successfully');
    } catch (error) {
      console.error('[UnifiedAuth] Failed to store auth data:', error);
    }
  }

  /**
   * Get authentication data
   */
  getAuthData(): AuthData | null {
    try {
      // Check for PWA mode
      if (this.isPWA()) {
        console.log('[UnifiedAuth] PWA mode detected, checking localStorage');
        const authDataStr = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!authDataStr) {
          console.log('[UnifiedAuth] PWA FAILURE - No valid auth data found in localStorage');
          return null;
        }
        
        const authData: AuthData = JSON.parse(authDataStr);
        
        // Check if token has expired
        if (Date.now() > authData.expiresAt) {
          this.clearAuthData();
          return null;
        }
        
        return authData;
      }

      // Regular web browser logic
      let authDataStr = sessionStorage.getItem(AUTH_STORAGE_KEY);
      
      // Fallback to localStorage
      if (!authDataStr) {
        authDataStr = localStorage.getItem(AUTH_STORAGE_KEY);
      }

      if (!authDataStr) {
        return null;
      }

      const authData: AuthData = JSON.parse(authDataStr);
      
      // Check if token has expired
      if (Date.now() > authData.expiresAt) {
        this.clearAuthData();
        return null;
      }

      return authData;
    } catch (error) {
      console.error('[UnifiedAuth] Failed to get auth data:', error);
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Get user data
   */
  getUser(): any | null {
    const authData = this.getAuthData();
    return authData?.user || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthData();
  }

  /**
   * Clear all authentication data
   */
  clearAuthData(): void {
    try {
      const isPWAMode = this.isPWA();
      const isIOSDevice = /iPhone|iPad|iPod/.test(navigator.userAgent);
      
      // CRITICAL: For PWA users, preserve localStorage for automatic login persistence
      // Only clear sessionStorage to maintain cross-tab communication
      if (isPWAMode || isIOSDevice) {
        console.log('[UnifiedAuth] PWA/iOS detected - clearing session storage but preserving persistent storage');
        
        // Clear only sessionStorage for PWA (preserves authentication across app restarts)
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        
        // DO NOT clear localStorage for PWA - this maintains persistent login
        return;
      }
      
      // Standard web browser - clear everything
      console.log('[UnifiedAuth] Standard browser - clearing all auth storage');
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      
      // Clear legacy storage
      this.clearLegacyStorage();
    } catch (error) {
      console.error('[UnifiedAuth] Error clearing auth data:', error);
    }
  }

  /**
   * Clear legacy storage keys
   */
  private clearLegacyStorage(): void {
    const legacyKeys = [
      'replit_auth_token',
      'replit_user_data',
      'user_auth_data',
      'auth_token',
      'user_data'
    ];
    
    legacyKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`[UnifiedAuth] Failed to clear legacy key ${key}:`, error);
      }
    });
  }

  /**
   * Force clear all auth data (emergency cleanup)
   */
  forceClearAllAuthData(): void {
    try {
      console.log('[UnifiedAuth] FORCE CLEAR - Removing all authentication data');
      
      // Clear standard keys
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      
      // Clear legacy keys
      this.clearLegacyStorage();
      
      console.log('[UnifiedAuth] Force clear completed');
    } catch (error) {
      console.error('[UnifiedAuth] Error during force clear:', error);
    }
  }

  /**
   * Extend session
   */
  extendSession(): void {
    const authData = this.getAuthData();
    if (!authData) return;
    
    // Extend expiration by 8 hours
    authData.expiresAt = Date.now() + (8 * 60 * 60 * 1000);
    this.setAuthData(authData);
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    const user = this.getUser();
    return !!(user?.isAdmin || user?.is_admin);
  }

  /**
   * Check if user is employee
   */
  isEmployee(): boolean {
    const user = this.getUser();
    return !!(user?.isEmployee || user?.is_employee);
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(): number {
    const authData = this.getAuthData();
    if (!authData) return 0;
    return Date.now() - authData.loginTime;
  }

  /**
   * Check if running in PWA mode
   */
  private isPWA(): boolean {
    try {
      // Check for PWA display mode
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
      
      // Check for iOS PWA
      if ('navigator' in window && 'standalone' in (window.navigator as any)) {
        return !!(window.navigator as any).standalone;
      }
      
      // Check for Android PWA
      if (document.referrer.includes('android-app://')) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[UnifiedAuth] Error checking PWA mode:', error);
      return false;
    }
  }
}

// Export singleton instance
export const unifiedAuth = UnifiedAuthStorage.getInstance();