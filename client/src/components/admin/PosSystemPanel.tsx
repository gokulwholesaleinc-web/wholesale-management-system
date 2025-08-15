import { useQuery } from "@tanstack/react-query";
import type { PosSale, PosRegister } from "@shared/pos-types";

interface PosStats {
  receipts: {
    count: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
  };
  exports: {
    count: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
  };
}

interface ApiResponse<T> {
  data: T;
}

export function PosSystemPanel() {
  const { data: posStats } = useQuery<ApiResponse<PosStats>>({
    queryKey: ['/api/admin/pos/stats'],
  });

  const { data: registerStatus } = useQuery<ApiResponse<PosRegister>>({
    queryKey: ['/api/admin/pos/register/status'],
  });

  const { data: sampleSale } = useQuery<ApiResponse<PosSale>>({
    queryKey: ['/api/admin/pos/sales/sample'],
  });

  const stats = posStats?.data;
  const register = registerStatus?.data;
  const sale = sampleSale?.data;

  if (!stats) return <div>Loading POS data...</div>;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>POS System Details</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
        <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Receipt Files</h4>
          <div>Count: {stats.receipts.count}</div>
          <div>Total Size: {formatFileSize(stats.receipts.totalSize)}</div>
          {stats.receipts.newestFile && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Latest: {stats.receipts.newestFile}
            </div>
          )}
        </div>
        
        <div style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Export Files</h4>
          <div>Count: {stats.exports.count}</div>
          <div>Total Size: {formatFileSize(stats.exports.totalSize)}</div>
          {stats.exports.newestFile && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Latest: {stats.exports.newestFile}
            </div>
          )}
        </div>
      </div>

      {register && (
        <div style={{ padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Register Status</h4>
          <div>ID: {register.id}</div>
          <div>Store: {register.store_id}</div>
          <div>Status: {register.is_open ? '🟢 Open' : '🔴 Closed'}</div>
          <div>Opening Float: ${(register.opening_float_cents / 100).toFixed(2)}</div>
          {register.opened_at && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              Opened: {new Date(register.opened_at).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {sale && (
        <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Sample Sale Transaction</h4>
          <div>ID: {sale.id}</div>
          <div>Cashier: {sale.cashier_id}</div>
          <div>Items: {sale.items.length}</div>
          <div>Subtotal: ${(sale.subtotal / 100).toFixed(2)}</div>
          <div>Tax: ${((sale.tax_il_otp + sale.tax_other) / 100).toFixed(2)}</div>
          <div>Total: ${(sale.total / 100).toFixed(2)}</div>
          <div>Tenders: {sale.tenders.map((t: any) => `${t.type}: $${(t.amount / 100).toFixed(2)}`).join(', ')}</div>
          {sale.change_due > 0 && (
            <div>Change Due: ${(sale.change_due / 100).toFixed(2)}</div>
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}