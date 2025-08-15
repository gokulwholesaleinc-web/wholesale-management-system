import React from 'react';
import { useOrder, useChangeStatus } from '../../hooks/useNewOrders';

const ALLOWED: Record<string, string[]> = {
  NEW: ['PAID', 'CANCELLED', 'ON_HOLD'],
  PAID: ['PACKED', 'REFUNDED', 'ON_HOLD'],
  PACKED: ['SHIPPED', 'ON_HOLD'],
  SHIPPED: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
  ON_HOLD: ['NEW', 'PAID', 'PACKED', 'CANCELLED']
};

export function OrderDrawer({ id, onClose }: { id?: string; onClose: () => void }) {
  const { data, isLoading } = useOrder(id);
  const mutate = useChangeStatus();

  if (!id) return null;

  const order = data?.data;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: '520px', height: '100vh',
      background: 'white', borderLeft: '1px solid #e5e7eb', boxShadow: '-6px 0 24px rgba(0,0,0,0.08)', padding: 16, overflowY: 'auto', zIndex: 50
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Order {id}</h3>
        <button onClick={onClose} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}>Close</button>
      </div>

      {isLoading && <div style={{ padding: 12 }}>Loading…</div>}
      {order && (
        <>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600 }}>{order.customer_name}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>
              {order.customer_email} · {order.customer_phone}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Line Items</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {order.items?.map((it: any, index: number) => (
                <div key={it.id || index} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px', gap: 8, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{it.sku}</div>
                  </div>
                  <div>qty: {it.qty}</div>
                  <div style={{ textAlign: 'right' }}>${(it.unit_price / 100).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address Section - Add before totals */}
          {order.orderType === "delivery" && order.deliveryAddress && (
            <div style={{ marginTop: 12, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Delivery Address</div>
              <div style={{ fontSize: 14 }}>
                {(() => {
                  // Handle the delivery address parsing - same logic as UnifiedOrderDetail
                  if (typeof order.deliveryAddress === 'string') {
                    try {
                      const parsed = JSON.parse(order.deliveryAddress);
                      return (
                        <div>
                          <div style={{ fontWeight: 600 }}>{parsed.businessName || parsed.name}</div>
                          <div>{parsed.addressLine1}</div>
                          {parsed.addressLine2 && <div>{parsed.addressLine2}</div>}
                          <div>{parsed.city}, {parsed.state} {parsed.postalCode}</div>
                          {parsed.phone && <div style={{ fontSize: 12, color: '#6b7280' }}>📞 {parsed.phone}</div>}
                        </div>
                      );
                    } catch {
                      return <div>{order.deliveryAddress}</div>;
                    }
                  }
                  if (order.deliveryAddress.businessName) {
                    return (
                      <div>
                        <div style={{ fontWeight: 600 }}>{order.deliveryAddress.businessName}</div>
                        <div>{order.deliveryAddress.addressLine1}</div>
                        {order.deliveryAddress.addressLine2 && <div>{order.deliveryAddress.addressLine2}</div>}
                        <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</div>
                      </div>
                    );
                  }
                  return <div>Delivery address not formatted properly</div>;
                })()}
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, borderTop: '1px dashed #e5e7eb', paddingTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
              <div>Subtotal</div><div>${(order.subtotal / 100).toFixed(2)}</div>
              <div>45% IL TOBACCO TAX PAID</div><div>${(order.tax_il_otp / 100).toFixed(2)}</div>
              <div>Other Taxes</div><div>${(order.tax_other / 100).toFixed(2)}</div>
              <div>Shipping</div><div>${(order.shipping / 100).toFixed(2)}</div>
              <div>Discount</div><div>-${(order.discount / 100).toFixed(2)}</div>
              <div style={{ fontWeight: 700 }}>Total</div><div style={{ fontWeight: 700 }}>${(order.total / 100).toFixed(2)}</div>
              <div>Paid</div><div>${(order.paid / 100).toFixed(2)}</div>
              <div>Balance</div><div>${(order.balance / 100).toFixed(2)}</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALLOWED[order.status]?.map(to => (
                <button
                  key={to}
                  onClick={() => mutate.mutate({ id: order.id, to, reason: `Status changed to ${to}` })}
                  style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb' }}
                >
                  {to}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: order.total === order.paid + order.balance ? '#16a34a' : '#ef4444' }}>
              {order.total === order.paid + order.balance ? 'Totals in sync' : 'Totals mismatch — run recalc'}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              onClick={async () => {
                await fetch(`/api/new-orders/${order.id}/recalc`, { method: 'POST' });
                window.location.reload();
              }}
              style={{ padding: '8px 12px', borderRadius: 8, background: '#111827', color: 'white' }}
            >
              Recalculate Totals
            </button>
          </div>
        </>
      )}
    </div>
  );
}