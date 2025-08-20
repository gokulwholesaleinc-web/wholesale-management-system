import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../simpleAuth';
import { logActivity } from '../modules/activity/log';

const router = Router();

// Transaction schema for POS transactions
const PosTransactionSchema = z.object({
  id: z.string(),
  items: z.array(z.object({
    product: z.object({
      id: z.number(),
      name: z.string(),
      price: z.number(),
      sku: z.string(),
      category: z.string()
    }),
    quantity: z.number(),
    price: z.number(),
    lineTotal: z.number()
  })),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  paymentMethod: z.enum(['cash', 'credit', 'debit']),
  timestamp: z.string(),
  status: z.enum(['pending', 'completed', 'synced', 'failed']),
  offline: z.boolean()
});

// Process POS transaction
router.post('/transaction', requireAuth, async (req, res) => {
  try {
    const transaction = PosTransactionSchema.parse(req.body);
    const user = req.user as any;

    console.log('[POS Transaction] Processing:', {
      id: transaction.id,
      total: transaction.total,
      items: transaction.items.length,
      paymentMethod: transaction.paymentMethod,
      offline: transaction.offline
    });

    // In a real implementation, you would:
    // 1. Validate inventory
    // 2. Process payment
    // 3. Update inventory
    // 4. Generate receipt
    // 5. Record in sales table

    // For now, we'll simulate the transaction processing
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time

    // Log the transaction activity
    await logActivity({
      action: 'pos.transaction.complete',
      actor_id: user.id,
      actor_role: user.role,
      subject_type: 'sale',
      subject_id: transaction.id,
      severity: 20,
      ip: req.ip || '127.0.0.1',
      user_agent: req.get('User-Agent') || 'POS-App',
      meta: {
        items: transaction.items.length,
        total_cents: Math.round(transaction.total * 100),
        payment_method: transaction.paymentMethod,
        subtotal_cents: Math.round(transaction.subtotal * 100),
        tax_cents: Math.round(transaction.tax * 100),
        offline_processed: transaction.offline
      }
    });

    res.json({
      success: true,
      transaction_id: transaction.id,
      status: 'completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[POS Transaction] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Transaction processing failed'
    });
  }
});

// Sync offline transactions (batch endpoint)
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { transactions } = z.object({
      transactions: z.array(PosTransactionSchema)
    }).parse(req.body);

    const user = req.user as any;
    const results = [];

    console.log('[POS Sync] Processing', transactions.length, 'offline transactions');

    for (const transaction of transactions) {
      try {
        // Process each offline transaction
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing
        
        // Log sync activity
        await logActivity({
          action: 'pos.transaction.synced',
          actor_id: user.id,
          actor_role: user.role,
          subject_type: 'sale',
          subject_id: transaction.id,
          severity: 20,
          ip: req.ip || '127.0.0.1',
          user_agent: req.get('User-Agent') || 'POS-App',
          meta: {
            items: transaction.items.length,
            total_cents: Math.round(transaction.total * 100),
            payment_method: transaction.paymentMethod,
            original_timestamp: transaction.timestamp,
            sync_timestamp: new Date().toISOString()
          }
        });

        results.push({
          transaction_id: transaction.id,
          status: 'synced',
          success: true
        });

      } catch (error) {
        console.error('[POS Sync] Failed to sync transaction:', transaction.id, error);
        results.push({
          transaction_id: transaction.id,
          status: 'failed',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      synced: successful,
      failed: failed,
      results: results
    });

  } catch (error) {
    console.error('[POS Sync] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Sync operation failed'
    });
  }
});

// Get queue status (for monitoring offline transactions)
router.get('/queue', requireAuth, async (req, res) => {
  try {
    // In a real implementation, you would query the database for:
    // - Pending offline transactions
    // - Failed transactions that need retry
    // - Sync status and last sync time

    res.json({
      success: true,
      queue_status: {
        pending_transactions: 0,
        failed_transactions: 0,
        last_sync: new Date().toISOString(),
        sync_enabled: true
      }
    });

  } catch (error) {
    console.error('[POS Queue] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get queue status'
    });
  }
});

export default router;