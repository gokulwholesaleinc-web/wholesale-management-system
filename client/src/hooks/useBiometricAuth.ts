import { useState, useEffect } from 'react';

interface BiometricAuthOptions {
  allowFallback?: boolean;
  fallbackTitle?: string;
  disableBackup?: boolean;
  subtitle?: string;
}

interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

export const useBiometricAuth = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('');
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      // Check if running on mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (!isMobile) {
        setIsSupported(false);
        return;
      }

      // Check for Web Authentication API support
      if (!window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }

      // Check if biometric authentication is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsSupported(available);

      if (available) {
        // Detect biometry type based on device
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          setBiometryType('Face ID / Touch ID');
        } else if (userAgent.includes('android')) {
          setBiometryType('Fingerprint / Face Unlock');
        } else {
          setBiometryType('Biometric Authentication');
        }
        setIsEnrolled(true);
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
    }
  };

  const authenticateWithBiometrics = async (options: BiometricAuthOptions = {}): Promise<BiometricAuthResult> => {
    try {
      if (!isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not supported on this device'
        };
      }

      // Create a credential request for biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // In production, get this from server
          rp: {
            name: "Gokul Wholesale",
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: "user@gokulwholesale.com",
            displayName: "Gokul Wholesale User",
          },
          pubKeyCredParams: [{alg: -7, type: "public-key"}],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "direct"
        }
      });

      if (credential) {
        return {
          success: true,
          biometryType: biometryType
        };
      } else {
        return {
          success: false,
          error: 'Authentication was cancelled or failed'
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      let errorMessage = 'Authentication failed';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was denied or cancelled';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error occurred during authentication';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Authentication was aborted';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const verifyExistingCredential = async (credentialId: string): Promise<BiometricAuthResult> => {
    try {
      if (!isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not supported on this device'
        };
      }

      // Verify existing credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [{
            id: new TextEncoder().encode(credentialId),
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (assertion) {
        return {
          success: true,
          biometryType: biometryType
        };
      } else {
        return {
          success: false,
          error: 'Verification failed'
        };
      }
    } catch (error: any) {
      console.error('Credential verification error:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  };

  const enableBiometricLogin = async (username: string, password: string): Promise<BiometricAuthResult> => {
    try {
      // First authenticate with username/password
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!loginResponse.ok) {
        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Then set up biometric authentication
      const biometricResult = await authenticateWithBiometrics();
      
      if (biometricResult.success) {
        // Store biometric preference
        localStorage.setItem('biometric_enabled', 'true');
        localStorage.setItem('biometric_username', username);
        
        return {
          success: true,
          biometryType: biometryType
        };
      }

      return biometricResult;
    } catch (error) {
      console.error('Error enabling biometric login:', error);
      return {
        success: false,
        error: 'Failed to enable biometric authentication'
      };
    }
  };

  const loginWithBiometrics = async (): Promise<BiometricAuthResult & { token?: string }> => {
    try {
      const isBiometricEnabled = localStorage.getItem('biometric_enabled') === 'true';
      const savedUsername = localStorage.getItem('biometric_username');

      if (!isBiometricEnabled || !savedUsername) {
        return {
          success: false,
          error: 'Biometric login is not set up'
        };
      }

      // Verify biometric authentication
      const biometricResult = await verifyExistingCredential(savedUsername);
      
      if (biometricResult.success) {
        // Get authentication token using biometric verification
        const tokenResponse = await fetch('/api/auth/biometric-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: savedUsername }),
        });

        if (tokenResponse.ok) {
          const data = await tokenResponse.json();
          return {
            success: true,
            biometryType: biometryType,
            token: data.token
          };
        }
      }

      return biometricResult;
    } catch (error) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        error: 'Biometric login failed'
      };
    }
  };

  const disableBiometricAuth = () => {
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_username');
  };

  return {
    isSupported,
    biometryType,
    isEnrolled,
    authenticateWithBiometrics,
    verifyExistingCredential,
    enableBiometricLogin,
    loginWithBiometrics,
    disableBiometricAuth,
    checkBiometricSupport
  };
};