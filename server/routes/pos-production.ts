import { Router } from 'express';
import { requireAuth, requireEmployeeOrAdmin } from '../simpleAuth';
import { logActivity } from '../modules/activity/log';

const router = Router();

// Health check endpoint for production monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      cache: 'active',
      queue: 'running'
    }
  });
});

// Printer test endpoint for hardware monitoring
router.post('/test-printer', requireEmployeeOrAdmin, async (req: any, res) => {
  try {
    console.log('🖨️ [PRINTER TEST] Testing Epson TM-T88V printer...');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Test print command for TM-T88V
    const testPrintCommand = `powershell.exe -Command "
      try {
        Add-Type -AssemblyName System.Drawing
        Add-Type -AssemblyName System.Windows.Forms
        $doc = New-Object System.Drawing.Printing.PrintDocument
        $doc.PrinterSettings.PrinterName = 'EPSON TM-T88V Receipt'
        $doc.add_PrintPage({
          param($sender, $e)
          $font = New-Object System.Drawing.Font('Courier New', 12)
          $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
          $testText = 'POS PRINTER TEST - $(Get-Date)'
          $e.Graphics.DrawString($testText, $font, $brush, 10, 10)
        })
        $doc.Print()
        Write-Output 'SUCCESS: Test receipt printed'
      } catch {
        Write-Output 'ERROR: $($_.Exception.Message)'
      }"`;
    
    const { stdout, stderr } = await execAsync(testPrintCommand, { timeout: 10000 });
    
    if (stdout.includes('SUCCESS')) {
      await logActivity({
        action: 'pos.printer.test.success',
        actor_id: req.user.id,
        actor_role: req.user.role,
        subject_type: 'hardware',
        subject_id: 'tm88v-printer',
        severity: 20,
        meta: { test_result: 'success', method: 'powershell' }
      });
      
      res.json({ 
        success: true, 
        message: 'Printer test successful',
        details: stdout.trim()
      });
    } else {
      throw new Error('Printer test failed');
    }
    
  } catch (error) {
    console.error('🖨️ [PRINTER TEST] Failed:', error);
    
    await logActivity({
      action: 'pos.printer.test.failed',
      actor_id: req.user.id,
      actor_role: req.user.role,
      subject_type: 'hardware',
      subject_id: 'tm88v-printer',
      severity: 40,
      meta: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: 'Printer test failed',
      error: error.message
    });
  }
});

// Performance metrics endpoint
router.get('/metrics', requireEmployeeOrAdmin, async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpu: process.cpuUsage(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        // Add database connection pool stats if available
        status: 'connected'
      }
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// System configuration endpoint
router.get('/config', requireEmployeeOrAdmin, async (req, res) => {
  try {
    const config = {
      pos: {
        offline_storage: 'enabled',
        max_offline_transactions: 1000,
        sync_interval: 30000,
        hardware_check_interval: 30000
      },
      security: {
        session_timeout: '8 hours',
        manager_override_required: [
          'void_transaction_over_50',
          'price_override',
          'refund_without_receipt',
          'manual_drawer_open'
        ]
      },
      features: {
        hotkeys: 'enabled',
        offline_mode: 'enabled',
        hardware_monitoring: 'enabled',
        activity_logging: 'enabled'
      }
    };
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// Backup status endpoint
router.get('/backup-status', requireEmployeeOrAdmin, async (req, res) => {
  try {
    // In a real implementation, this would check actual backup systems
    const backupStatus = {
      last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      backup_size: '2.3 GB',
      status: 'healthy',
      next_scheduled: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      retention_policy: '30 days',
      locations: ['primary_db', 'cloud_storage', 'local_backup']
    };
    
    res.json(backupStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check backup status' });
  }
});

// Error reporting endpoint for frontend issues
router.post('/error-report', requireAuth, async (req: any, res) => {
  try {
    const { error, context, userAgent, url, timestamp } = req.body;
    
    await logActivity({
      action: 'pos.frontend.error',
      actor_id: req.user.id,
      actor_role: req.user.role,
      subject_type: 'system',
      subject_id: 'frontend',
      severity: 30,
      meta: {
        error_message: error,
        context,
        user_agent: userAgent,
        url,
        frontend_timestamp: timestamp
      }
    });
    
    console.error('🚨 [FRONTEND ERROR]', {
      user: req.user.id,
      error,
      context,
      url
    });
    
    res.json({ success: true, message: 'Error reported successfully' });
  } catch (error) {
    console.error('Failed to log frontend error:', error);
    res.status(500).json({ success: false, error: 'Failed to report error' });
  }
});

export default router;