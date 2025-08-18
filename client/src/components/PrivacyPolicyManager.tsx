import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyPolicyStatus } from '@/hooks/usePrivacyPolicyStatus';
import { PrivacyPolicyModal } from '@/components/auth/PrivacyPolicyModal';
import { useQueryClient } from '@tanstack/react-query';

export function PrivacyPolicyManager() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: privacyStatus, isLoading: policyLoading } = usePrivacyPolicyStatus();
  const [showModal, setShowModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only check for authenticated users who aren't admins/employees (they can skip)
    if (!authLoading && !policyLoading && user && !hasChecked) {
      const isStaff = user.isAdmin || user.isEmployee;
      
      // Show modal if user needs to accept privacy policy and isn't staff
      if (!isStaff && privacyStatus?.needsReacceptance) {
        setShowModal(true);
      }
      
      setHasChecked(true);
    }
  }, [authLoading, policyLoading, user, privacyStatus, hasChecked]);

  const handleModalClose = (accepted: boolean) => {
    setShowModal(false);
    
    if (accepted) {
      // Invalidate privacy policy status to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/privacy-policy/status'] });
    }
  };

  // Don't render anything for loading states or if modal shouldn't show
  if (authLoading || policyLoading || !showModal) {
    return null;
  }

  return (
    <PrivacyPolicyModal
      isOpen={showModal}
      onClose={handleModalClose}
      userName={user?.firstName || user?.username}
    />
  );
}