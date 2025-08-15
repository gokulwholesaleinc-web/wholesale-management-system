import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { InitialNotificationOptinModal } from '@/components/InitialNotificationOptinModal';

interface InitialNotificationOptinContextType {
  needsOptin: boolean;
  checkStatus: () => void;
}

const InitialNotificationOptinContext = createContext<InitialNotificationOptinContextType | undefined>(undefined);

export function useInitialNotificationOptin() {
  const context = useContext(InitialNotificationOptinContext);
  if (context === undefined) {
    throw new Error('useInitialNotificationOptin must be used within a InitialNotificationOptinProvider');
  }
  return context;
}

interface InitialNotificationOptinProviderProps {
  children: React.ReactNode;
}

export function InitialNotificationOptinProvider({ children }: InitialNotificationOptinProviderProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [needsOptin, setNeedsOptin] = useState(false);

  // Check if user needs to complete initial notification opt-in
  const optinStatusQuery = useQuery({
    queryKey: ['initial-notification-optin-status'],
    queryFn: async () => {
      const userData = await apiRequest('/api/user/profile');
      return {
        needsInitialOptin: !userData.initialNotificationOptinCompleted,
        privacyPolicyAccepted: userData.privacyPolicyAccepted,
        userName: userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : userData.username
      };
    },
    enabled: !!user, // Only run when user is authenticated
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (optinStatusQuery.data && user) {
      const { needsInitialOptin, privacyPolicyAccepted } = optinStatusQuery.data;
      
      // Only show notification opt-in if privacy policy has been accepted and initial opt-in is not completed
      const shouldShowOptin = privacyPolicyAccepted && needsInitialOptin;
      
      setNeedsOptin(shouldShowOptin);
      
      if (shouldShowOptin) {
        // Show modal after a small delay to ensure UI is ready and privacy policy modal has closed
        setTimeout(() => {
          setShowModal(true);
        }, 1000); // Longer delay than privacy policy to ensure it shows after
      }
    }
  }, [optinStatusQuery.data, user]);

  const handleCompleted = () => {
    setShowModal(false);
    setNeedsOptin(false);
    // Refetch the status to update the state
    optinStatusQuery.refetch();
  };

  const checkStatus = () => {
    optinStatusQuery.refetch();
  };

  return (
    <InitialNotificationOptinContext.Provider value={{ needsOptin, checkStatus }}>
      {children}
      <InitialNotificationOptinModal
        isOpen={showModal}
        onComplete={handleCompleted}
        userName={optinStatusQuery.data?.userName}
      />
    </InitialNotificationOptinContext.Provider>
  );
}