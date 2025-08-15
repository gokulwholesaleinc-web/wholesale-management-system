// Authentication state manager to prevent session loss during navigation
export class AuthStateManager {
  private static instance: AuthStateManager;
  private authCheckInterval: NodeJS.Timeout | null = null;
  private isNavigating = false;
  
  private constructor() {
    // Only initialize if not already done
    if (!this.isInitialized) {
      this.initAuthProtection();
      this.startAuthMonitoring();
      this.isInitialized = true;
    }
  }

  private isInitialized = false;

  static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  private initAuthProtection() {
    // Protect auth data during navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.isNavigating = true;
      this.protectAuthData();
      const result = originalPushState.apply(history, args);
      setTimeout(() => { this.isNavigating = false; }, 100);
      return result;
    };

    history.replaceState = (...args) => {
      this.isNavigating = true;
      this.protectAuthData();
      const result = originalReplaceState.apply(history, args);
      setTimeout(() => { this.isNavigating = false; }, 100);
      return result;
    };

    // Listen for navigation events
    window.addEventListener('beforeunload', () => {
      this.protectAuthData();
    });

    window.addEventListener('popstate', () => {
      this.isNavigating = true;
      this.protectAuthData();
      setTimeout(() => { this.isNavigating = false; }, 100);
    });
  }

  private protectAuthData() {
    try {
      const authToken = sessionStorage.getItem('authToken');
      const authData = sessionStorage.getItem('gokul_auth_data');
      
      // Only create backup if it doesn't exist and we have valid auth data
      if ((authToken || authData) && !localStorage.getItem('_backup_authToken')) {
        if (authToken) {
          localStorage.setItem('_backup_authToken', authToken);
        }
        if (authData) {
          localStorage.setItem('_backup_gokul_auth_data', authData);
        }
        localStorage.setItem('_auth_protected', Date.now().toString());
      }
    } catch (error) {
      console.warn('Failed to protect auth data:', error);
    }
  }

  private restoreAuthData() {
    try {
      const isProtected = sessionStorage.getItem('_auth_protected') || localStorage.getItem('_auth_protected');
      
      if (isProtected) {
        // Restore from backup if main storage is missing
        const authToken = sessionStorage.getItem('authToken');
        const authData = sessionStorage.getItem('gokul_auth_data');
        
        if (!authToken) {
          const backupToken = localStorage.getItem('_backup_authToken') || sessionStorage.getItem('_backup_authToken');
          if (backupToken) {
            sessionStorage.setItem('authToken', backupToken);
            console.log('Restored auth token from backup');
          }
        }
        
        if (!authData) {
          const backupData = localStorage.getItem('_backup_gokul_auth_data') || sessionStorage.getItem('_backup_gokul_auth_data');
          if (backupData) {
            sessionStorage.setItem('gokul_auth_data', backupData);
            console.log('Restored auth data from backup');
          }
        }
      }
    } catch (error) {
      console.warn('Failed to restore auth data:', error);
    }
  }

  private startAuthMonitoring() {
    // Prevent multiple intervals
    if (this.authCheckInterval) {
      return;
    }
    
    // Use requestAnimationFrame for the initial check to avoid React conflicts
    requestAnimationFrame(() => {
      try {
        this.restoreAuthData();
      } catch (error) {
        console.warn('Initial auth restore error:', error);
      }
    });
    
    // Set up monitoring with longer interval to reduce conflicts
    this.authCheckInterval = setInterval(() => {
      try {
        // Only run if not currently navigating
        if (!this.isNavigating) {
          this.restoreAuthData();
          this.validateAuthState();
        }
      } catch (error) {
        console.warn('Auth monitoring error:', error);
      }
    }, 60000); // Increased to 1 minute to reduce conflicts
  }

  private validateAuthState() {
    try {
      const authData = sessionStorage.getItem('gokul_auth_data');
      
      if (authData) {
        const parsed = JSON.parse(authData);
        const now = Date.now();
        
        // Check if token is expired
        if (parsed.expiresAt && now > parsed.expiresAt) {
          console.log('Auth token expired, clearing session');
          this.clearAuthData();
          return false;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Failed to validate auth state:', error);
      return false;
    }
  }

  public clearAuthData() {
    try {
      // Clear main auth storage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('gokul_auth_data');
      localStorage.removeItem('authToken');
      localStorage.removeItem('gokul_auth_data');
      
      // Clear backup storage
      localStorage.removeItem('_backup_authToken');
      sessionStorage.removeItem('_backup_authToken');
      localStorage.removeItem('_backup_gokul_auth_data');
      sessionStorage.removeItem('_backup_gokul_auth_data');
      
      // Clear protection flags
      sessionStorage.removeItem('_auth_protected');
      localStorage.removeItem('_auth_protected');
      
      // Clear all possible auth-related storage
      const authKeys = [
        'gokul_auth_token', 'gokul_user_data', 'gokul_auth_expiry',
        'user_data', 'token', 'auth_data', 'user_session'
      ];
      
      authKeys.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      
      // Stop auth monitoring
      if (this.authCheckInterval) {
        clearInterval(this.authCheckInterval);
        this.authCheckInterval = null;
      }
      
      console.log('Auth data cleared completely');
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
  }

  public isNavigationInProgress(): boolean {
    return this.isNavigating;
  }

  public destroy() {
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }
  }
}

// Export singleton instance
export const authStateManager = AuthStateManager.getInstance();