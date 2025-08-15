import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';

interface PrivacyPolicyContextType {
  needsAcceptance: boolean;
  checkStatus: () => void;
}

const PrivacyPolicyContext = createContext<PrivacyPolicyContextType | undefined>(undefined);

export function usePrivacyPolicy() {
  const context = useContext(PrivacyPolicyContext);
  if (context === undefined) {
    throw new Error('usePrivacyPolicy must be used within a PrivacyPolicyProvider');
  }
  return context;
}

interface PrivacyPolicyProviderProps {
  children: React.ReactNode;
}

export function PrivacyPolicyProvider({ children }: PrivacyPolicyProviderProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);

  const privacyPolicyQuery = useQuery({
    queryKey: ['privacy-policy-status'],
    queryFn: () => apiRequest('/api/privacy-policy/status'),
    enabled: !!user, // Only run when user is authenticated
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (privacyPolicyQuery.data && user) {
      const needsReacceptance = privacyPolicyQuery.data.needsReacceptance;
      setNeedsAcceptance(needsReacceptance);
      
      if (needsReacceptance) {
        // Show modal after a small delay to ensure UI is ready
        setTimeout(() => {
          setShowModal(true);
        }, 500);
      }
    }
  }, [privacyPolicyQuery.data, user]);

  const handleAccepted = () => {
    setShowModal(false);
    setNeedsAcceptance(false);
    // Refetch the status to update the state
    privacyPolicyQuery.refetch();
  };

  const checkStatus = () => {
    privacyPolicyQuery.refetch();
  };

  return (
    <PrivacyPolicyContext.Provider value={{ needsAcceptance, checkStatus }}>
      {children}
      <PrivacyPolicyModal
        isOpen={showModal}
        onClose={() => {}} // Prevent closing the modal
        onAccepted={handleAccepted}
      />
    </PrivacyPolicyContext.Provider>
  );
}