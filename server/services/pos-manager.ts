import { promises as fs } from 'fs';
import path from 'path';
import type { PosSale, PosRegister, InventoryAdjustment } from '../../shared/pos-types';
import { POS_DB, openRegister, createSale, computeTotals } from './pos-db';
import { POS_DB, lookupSku, computeTotals, openRegister, closeRegister, createSale } from './pos-db';

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

// Initialize default register if needed
export function initializePosSystem() {
  const storeId = process.env.POS_STORE_ID || 'ITASCA';
  const registerId = process.env.POS_REGISTER_ID || 'REG-01';
  
  if (!POS_DB.registers.has(registerId)) {
    const register: PosRegister = {
      id: registerId,
      store_id: storeId,
      name: 'Main Register',
      is_open: true,
      opening_float_cents: 20000, // $200.00
      opened_at: new Date().toISOString(),
      closed_at: undefined,
      z_seq: 1
    };
    POS_DB.registers.set(registerId, register);
  }
  
  return POS_DB.registers.get(registerId)!;
}

// Get actual POS data with fallbacks
export function getCurrentPosRegister(): PosRegister {
  const registerId = process.env.POS_REGISTER_ID || 'REG-01';
  let register = POS_DB.registers.get(registerId);
  
  if (!register) {
    register = initializePosSystem();
  }
  
  return register;
}

export function getRecentPosSales(limit = 10): PosSale[] {
  return Array.from(POS_DB.sales.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function getPosStatistics() {
  const sales = Array.from(POS_DB.sales.values());
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.created_at.startsWith(today));
  
  return {
    total_sales: sales.length,
    today_sales: todaySales.length,
    total_revenue: sales.reduce((sum, s) => sum + s.total, 0),
    today_revenue: todaySales.reduce((sum, s) => sum + s.total, 0),
    inventory_movements: POS_DB.inventory_ledger.length,
    registers_count: POS_DB.registers.size
  };
}