import React, { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { StatusPill } from './StatusPill';
import { OrderDrawer } from './OrderDrawer';

type Filters = { query: string; status: string };

export function NewOrderList() {
  const [filters, setFilters] = useState<Filters>({ query: '', status: '' });
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { data, isLoading } = useOrders({ query: filters.query, status: filters.status, limit: 50 });

  const rows = data?.data || [];

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r: any) => m.set(r.status, (m.get(r.status) || 0) + 1));
    return Array.from(m.entries()).sort();
  }, [rows]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>New Orders (IL Compliance)</h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="Search by order #, customer, SKU"
          value={filters.query}
          onChange={e => setFilters(s => ({ ...s, query: e.target.value }))}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 320 }}
        />
        <select
          value={filters.status}
          onChange={e => setFilters(s => ({ ...s, status: e.target.value }))}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}
        >
          <option value="">All statuses</option>
          {['NEW','PAID','PACKED','SHIPPED','DELIVERED','CANCELLED','REFUNDED','ON_HOLD','RETURN_REQUESTED']
            .map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {statusCounts.map(([s, n]) => (
          <div key={s} style={{ fontSize: 12, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 999, padding: '4px 10px' }}>
            {s}: {n}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 170px 1fr 100px 100px 120px', gap: 0, background: '#f9fafb', fontSize: 12, fontWeight: 700, padding: '10px 12px' }}>
          <div>Order #</div>
          <div>Date</div>
          <div>Customer</div>
          <div>Total</div>
          <div>Balance</div>
          <div>Status</div>
        </div>

        {isLoading && <div style={{ padding: 16 }}>Loading…</div>}

        {rows.map((r: any) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            style={{ display: 'grid', gridTemplateColumns: '140px 170px 1fr 100px 100px 120px',
              width: '100%', textAlign: 'left', padding: '12px', borderTop: '1px solid #f3f4f6', background: 'white' }}
          >
            <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.id}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(r.created_at).toLocaleString()}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>{r.items?.length || 0} items</div>
            </div>
            <div>${(r.total/100).toFixed(2)}</div>
            <div style={{ color: r.balance > 0 ? '#ef4444' : '#16a34a' }}>
              ${(r.balance/100).toFixed(2)}
            </div>
            <div><StatusPill status={r.status} /></div>
          </button>
        ))}
      </div>

      {/* Seed Button for Development */}
      <button
        onClick={async () => {
          await fetch('/api/orders/_seed', { method: 'POST' });
          window.location.reload();
        }}
        style={{ 
          marginTop: 16, 
          marginLeft: 8, 
          padding: '6px 10px', 
          borderRadius: 8, 
          border: '1px solid #e5e7eb',
          background: '#f3f4f6',
          fontSize: 12
        }}
      >
        Seed Sample Orders
      </button>

      {/* Drawer */}
      {selectedId && <OrderDrawer id={selectedId} onClose={() => setSelectedId(undefined)} />}
    </div>
  );
}