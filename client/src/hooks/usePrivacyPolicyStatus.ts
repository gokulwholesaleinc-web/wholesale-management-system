import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PrivacyPolicyStatus {
  accepted: boolean;
  version?: string;
  acceptedDate?: string;
  currentVersion: string;
  needsReacceptance: boolean;
}

export function usePrivacyPolicyStatus() {
  return useQuery({
    queryKey: ['/api/privacy-policy/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/privacy-policy/status');
      return response as PrivacyPolicyStatus;
    },
    retry: false,
    refetchOnWindowFocus: false
  });
}