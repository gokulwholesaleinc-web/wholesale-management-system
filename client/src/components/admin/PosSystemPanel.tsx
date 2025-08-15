import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  const queryClient = useQueryClient();
  
  const { data: posStats } = useQuery<ApiResponse<PosStats>>({
    queryKey: ['/api/admin/pos/stats'],
  });

  const { data: registerStatus } = useQuery<ApiResponse<PosRegister>>({
    queryKey: ['/api/admin/pos/register/status'],
  });

  const { data: recentSales } = useQuery<ApiResponse<PosSale[]>>({
    queryKey: ['/api/admin/pos/sales/recent'],
  });

  const { data: posStatistics } = useQuery<ApiResponse<any>>({
    queryKey: ['/api/admin/pos/statistics'],
  });

  const createSampleTransaction = useMutation({
    mutationFn: () => apiRequest('/api/admin/pos/sample-transaction', {
      method: 'POST'
    }),
    onSuccess: () => {
      // Refresh all POS data after creating sample transaction
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pos/sales/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pos/statistics'] });
    }
  });

  const stats = posStats?.data;
  const register = registerStatus?.data;
  const sales = recentSales?.data || [];
  const businessStats = posStatistics?.data;

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

      {businessStats && (
        <div style={{ padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Business Statistics</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div>Total Sales: {businessStats.total_sales}</div>
            <div>Today's Sales: {businessStats.today_sales}</div>
            <div>Total Revenue: ${(businessStats.total_revenue / 100).toFixed(2)}</div>
            <div>Today's Revenue: ${(businessStats.today_revenue / 100).toFixed(2)}</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
            Inventory Movements: {businessStats.inventory_movements} | Registers: {businessStats.registers_count}
          </div>
        </div>
      )}

      {sales.length > 0 && (
        <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Recent Sales ({sales.length})</h4>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {sales.slice(0, 3).map((sale: any, idx: number) => (
              <div key={sale.id} style={{ 
                padding: 8, 
                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb', 
                borderRadius: 4, 
                marginBottom: 4 
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>#{sale.id}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {sale.items.length} items | ${(sale.total / 100).toFixed(2)} | {new Date(sale.created_at).toLocaleTimeString()}
                  {sale.tax_il_otp > 0 && <span style={{ color: '#dc2626', marginLeft: 4 }}>IL-OTP</span>}
                </div>
              </div>
            ))}
          </div>
          {sales.length > 3 && (
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
              Showing 3 of {sales.length} recent sales
            </div>
          )}
        </div>
      )}

      {/* Test Controls */}
      <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>POS Testing</h4>
        <button
          onClick={() => createSampleTransaction.mutate()}
          disabled={createSampleTransaction.isPending}
          style={{
            padding: '6px 12px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: createSampleTransaction.isPending ? 'not-allowed' : 'pointer',
            opacity: createSampleTransaction.isPending ? 0.6 : 1
          }}
        >
          {createSampleTransaction.isPending ? 'Creating...' : 'Create Sample Sale (w/ IL-OTP Tax)'}
        </button>
        {createSampleTransaction.isSuccess && (
          <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
            ✅ Sample transaction created successfully
          </div>
        )}
        {createSampleTransaction.isError && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
            ❌ Failed to create sample transaction
          </div>
        )}
      </div>
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