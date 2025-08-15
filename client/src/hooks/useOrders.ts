import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API = '/api/orders';

export function useOrders(params: { query?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }

  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API}?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Orders fetch failed: ${res.status} ${res.statusText}`);
      const json = await res.json();

      // ✅ Tolerate both {data: [...]} and [...] shapes
      const data = Array.isArray(json) ? json : json.data;
      const total = Array.isArray(json) ? data.length : json.total ?? data.length;

      if (!Array.isArray(data)) throw new Error('Unexpected orders response shape');

      return { data, total, page: (json.page ?? 1), limit: (json.limit ?? data.length) };
    },
    staleTime: 30_000,
    retry: 1
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      if (!id) throw new Error('Order ID required');
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API}/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Order fetch failed: ${res.status} ${res.statusText}`);
      return res.json();
    },
    enabled: !!id,
    staleTime: 30_000,
    retry: 1
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, to, reason, actor_id = 'user' }: { 
      id: string; 
      to: string; 
      reason?: string; 
      actor_id?: string; 
    }) => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API}/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ to, reason, actor_id })
      });
      if (!res.ok) throw new Error(`Status change failed: ${res.status} ${res.statusText}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}