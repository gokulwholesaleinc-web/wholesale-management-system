import { promises as fs } from 'fs';
import path from 'path';
import type { PosSale, PosRegister, InventoryAdjustment } from '../../shared/pos-types';

export interface PosStats {
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

export async function getPosDirectoryStats(): Promise<PosStats> {
  const stats: PosStats = {
    receipts: { count: 0, totalSize: 0 },
    exports: { count: 0, totalSize: 0 }
  };

  try {
    // Ensure directories exist
    await fs.mkdir('pos-receipts', { recursive: true });
    await fs.mkdir('pos-exports', { recursive: true });

    // Get receipts stats
    const receiptsFiles = await fs.readdir('pos-receipts');
    for (const file of receiptsFiles) {
      const filePath = path.join('pos-receipts', file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        stats.receipts.count++;
        stats.receipts.totalSize += stat.size;
        
        if (!stats.receipts.oldestFile || stat.mtime < (await fs.stat(path.join('pos-receipts', stats.receipts.oldestFile))).mtime) {
          stats.receipts.oldestFile = file;
        }
        if (!stats.receipts.newestFile || stat.mtime > (await fs.stat(path.join('pos-receipts', stats.receipts.newestFile))).mtime) {
          stats.receipts.newestFile = file;
        }
      }
    }

    // Get exports stats
    const exportsFiles = await fs.readdir('pos-exports');
    for (const file of exportsFiles) {
      const filePath = path.join('pos-exports', file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        stats.exports.count++;
        stats.exports.totalSize += stat.size;
        
        if (!stats.exports.oldestFile || stat.mtime < (await fs.stat(path.join('pos-exports', stats.exports.oldestFile))).mtime) {
          stats.exports.oldestFile = file;
        }
        if (!stats.exports.newestFile || stat.mtime > (await fs.stat(path.join('pos-exports', stats.exports.newestFile))).mtime) {
          stats.exports.newestFile = file;
        }
      }
    }
  } catch (error) {
    console.error('Error getting POS directory stats:', error);
  }

  return stats;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Mock data generators for testing
export function generateMockPosSale(): PosSale {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  
  return {
    id: `POS-${dateStr}-${seq}`,
    store_id: process.env.POS_STORE_ID || 'ITASCA',
    register_id: process.env.POS_REGISTER_ID || 'REG-01',
    created_at: now.toISOString(),
    cashier_id: 'admin',
    items: [
      {
        sku: 'BIC-MINI-50',
        name: 'Bic Mini Lighters (50ct)',
        qty: 1,
        unit_price: 4500, // $45.00 in cents
        line_tax_rate: 0.08,
        il_otp_cents: 0
      }
    ],
    subtotal: 4500,
    tax_il_otp: 0,
    tax_other: 360, // 8% of $45.00
    discount: 0,
    total: 4860,
    tenders: [{ type: 'CASH', amount: 5000 }],
    change_due: 140,
    customer_id: undefined,
    note: undefined
  };
}

export function generateMockPosRegister(): PosRegister {
  return {
    id: process.env.POS_REGISTER_ID || 'REG-01',
    store_id: process.env.POS_STORE_ID || 'ITASCA',
    name: 'Main Register',
    is_open: true,
    opening_float_cents: 20000, // $200.00
    opened_at: new Date().toISOString(),
    closed_at: undefined,
    z_seq: 1
  };
}