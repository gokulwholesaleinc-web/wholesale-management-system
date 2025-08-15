import React from 'react';

const COLORS: Record<string, string> = {
  NEW: '#64748b',
  PAID: '#16a34a',
  PACKED: '#0ea5e9',
  SHIPPED: '#2563eb',
  DELIVERED: '#0f766e',
  CANCELLED: '#ef4444',
  REFUNDED: '#f59e0b',
  ON_HOLD: '#a855f7',
  RETURN_REQUESTED: '#f97316'
};

export function StatusPill({ status }: { status: string }) {
  const color = COLORS[status] || '#64748b';
  return (
    <span style={{
      background: color, color: 'white', padding: '4px 10px',
      borderRadius: 999, fontSize: 12, fontWeight: 600
    }}>{status}</span>
  );
}