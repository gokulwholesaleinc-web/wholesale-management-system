// Simple, React-friendly authentication manager
export class SimpleAuthManager {
  private static instance: SimpleAuthManager;
  private hasBackup = false;

  private constructor() {}

  static getInstance(): SimpleAuthManager {
    if (!SimpleAuthManager.instance) {
      SimpleAuthManager.instance = new SimpleAuthManager();
    }
    return SimpleAuthManager.instance;
  }

  // Create a single backup when user logs in
  createAuthBackup() {
    if (this.hasBackup) return; // Prevent duplicate backups

    try {
      const authToken = sessionStorage.getItem('authToken');
      const authData = sessionStorage.getItem('gokul_auth_data');
      
      if (authToken || authData) {
        if (authToken) {
          localStorage.setItem('_backup_authToken', authToken);
        }
        if (authData) {
          localStorage.setItem('_backup_gokul_auth_data', authData);
        }
        this.hasBackup = true;
        console.log('Auth backup created');
      }
    } catch (error) {
      console.warn('Failed to create auth backup:', error);
    }
  }

  // Restore auth data only when needed
  restoreAuthIfNeeded() {
    try {
      const hasSessionToken = sessionStorage.getItem('authToken') || sessionStorage.getItem('gokul_auth_data');
      
      if (!hasSessionToken) {
        const backupToken = localStorage.getItem('_backup_authToken');
        const backupData = localStorage.getItem('_backup_gokul_auth_data');
        
        if (backupToken || backupData) {
          if (backupToken) {
            sessionStorage.setItem('authToken', backupToken);
          }
          if (backupData) {
            sessionStorage.setItem('gokul_auth_data', backupData);
          }
          console.log('Auth data restored from backup');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Failed to restore auth data:', error);
      return false;
    }
  }

  // Clear all auth data on logout
  clearAuth() {
    try {
      // Clear session storage
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('gokul_auth_data');
      
      // Clear backup storage
      localStorage.removeItem('_backup_authToken');
      localStorage.removeItem('_backup_gokul_auth_data');
      
      this.hasBackup = false;
      console.log('All auth data cleared');
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
  }
}

export const simpleAuthManager = SimpleAuthManager.getInstance();