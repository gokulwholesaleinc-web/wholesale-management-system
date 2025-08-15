import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API = '/api/new-orders';

export function useOrders(q: { query?: string; status?: string; from?: string; to?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (q.query) params.set('query', q.query);
  if (q.status) params.set('status', q.status);
  if (q.from) params.set('from', q.from);
  if (q.to) params.set('to', q.to);
  if (q.page) params.set('page', String(q.page));
  if (q.limit) params.set('limit', String(q.limit));

  return useQuery({
    queryKey: ['new-orders', q],
    queryFn: async () => {
      const res = await fetch(`${API}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json() as Promise<{ data: any[]; total: number; page: number; limit: number }>;
    },
    staleTime: 30_000
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ['new-order', id],
    queryFn: async () => {
      const res = await fetch(`${API}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json() as Promise<{ data: any; history: any[]; payments: any[] }>;
    },
    enabled: !!id
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; to: string; reason?: string }) => {
      const res = await fetch(`${API}/${vars.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: vars.to, reason: vars.reason })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['new-orders'] });
      const prev = qc.getQueryData<any>(['new-orders']);
      qc.setQueryData<any>(['new-orders'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o: any) => (o.id === vars.id ? { ...o, status: vars.to } : o))
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['new-orders'], ctx.prev),
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['new-orders'] });
      qc.invalidateQueries({ queryKey: ['new-order', vars.id] });
    }
  });
}