import { Router } from 'express';
import { z } from 'zod';
import { attachUser } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminOnly';
import { ADMIN_DB, type AdminUser } from '../services/admin.store';
import { recordAudit, queryAudit } from '../services/audit';
import { createApiKey, revokeApiKey } from '../services/keys';
import { setFlag } from '../services/flags';
import { listJobs, retryJob, cancelJob } from '../services/jobs';
import { getPosDirectoryStats, getCurrentPosRegister, getRecentPosSales, getPosStatistics } from '../services/pos-manager';

const r = Router();
r.use(attachUser);

// Overview (metrics you can later back with real data)
r.get('/overview', requireAdmin('admin.read'), async (_req, res) => {
  const totalUsers = ADMIN_DB.users.size;
  const totalKeys = ADMIN_DB.keys.size;
  const totalFlags = ADMIN_DB.flags.size;
  const jobs = listJobs();
  const posFileStats = await getPosDirectoryStats();
  const posBusinessStats = getPosStatistics();
  
  res.json({
    data: {
      cards: [
        { label: 'Admin Users', value: totalUsers },
        { label: 'API Keys', value: totalKeys },
        { label: 'Feature Flags', value: totalFlags },
        { label: 'Jobs (queued)', value: jobs.filter(j=>j.status==='queued').length },
        { label: 'POS Sales Today', value: posBusinessStats.today_sales },
        { label: 'POS Receipts', value: posFileStats.receipts.count }
      ],
      health: { 
        ok: true, 
        version: 'admin-1.0.0', 
        time: new Date().toISOString(),
        pos: {
          store_id: process.env.POS_STORE_ID || 'Not configured',
          register_id: process.env.POS_REGISTER_ID || 'Not configured',
          hardware_status: 'Available',
          receipts_dir: 'pos-receipts/',
          exports_dir: 'pos-exports/',
          stats: posFileStats,
          business: posBusinessStats
        }
      }
    }
  });
});

// POS System Management
r.get('/pos/register/status', requireAdmin('admin.read'), (_req, res) => {
  const registerStatus = getCurrentPosRegister();
  res.json({ data: registerStatus });
});

r.get('/pos/sales/recent', requireAdmin('admin.read'), (_req, res) => {
  const recentSales = getRecentPosSales(10);
  res.json({ data: recentSales });
});

r.get('/pos/statistics', requireAdmin('admin.read'), (_req, res) => {
  const posStats = getPosStatistics();
  res.json({ data: posStats });
});

// Generate receipt for POS sale
r.post('/pos/receipt/:saleId', requireAdmin('admin.write'), async (req, res) => {
  try {
    const { saleId } = req.params;
    const { buildReceiptText } = await import('../services/pos-manager');
    const { POS_DB } = await import('../services/pos-db');
    
    const sale = POS_DB.sales.get(saleId);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    const receiptText = buildReceiptText(sale);
    
    res.setHeader('Content-Type', 'text/plain');
    res.json({ data: { receiptText, sale } });
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

// Create sample POS transaction for testing
r.post('/pos/sample-transaction', requireAdmin('admin.write'), async (req, res) => {
  try {
    const { createSale, computeTotals } = await import('../services/pos-db');
    
    // Sample transaction with Illinois tobacco tax
    const items = [
      {
        sku: 'TOB-001',
        name: 'Newport Cigarettes',
        qty: 1,
        unit_price: 1200, // $12.00
        line_tax_rate: 0.08,
        il_otp_cents: 540 // 45% of $12.00
      },
      {
        sku: 'BIC-MINI-50',
        name: 'Bic Mini Lighters (50ct)', 
        qty: 2,
        unit_price: 4500, // $45.00 each
        line_tax_rate: 0.08,
        il_otp_cents: 0
      }
    ];
    
    const totals = computeTotals(items);
    
    const saleData = {
      store_id: process.env.POS_STORE_ID || 'ITASCA',
      register_id: process.env.POS_REGISTER_ID || 'REG-01',
      cashier_id: 'admin',
      items,
      ...totals,
      discount: 0,
      tenders: [{ type: 'CASH' as const, amount: totals.total + 100 }] // $1 extra for change
    };
    
    const sale = await createSale(saleData);
    
    res.json({ data: sale, message: 'Sample POS transaction created successfully' });
  } catch (error) {
    console.error('Error creating sample transaction:', error);
    res.status(500).json({ error: 'Failed to create sample transaction' });
  }
});

r.get('/pos/stats', requireAdmin('admin.read'), async (_req, res) => {
  const fileStats = await getPosDirectoryStats();
  res.json({ data: fileStats });
});

/** USERS */
r.get('/users', requireAdmin('admin.users.read'), (_req,res)=>{
  res.json({ data: [...ADMIN_DB.users.values()] });
});
r.post('/users/invite', requireAdmin('admin.users.write'), (req,res)=>{
  const schema = z.object({ email: z.string().email(), name: z.string().min(1), roles: z.array(z.string()).default(['VIEWER']) });
  const body = schema.parse(req.body);
  const id = crypto.randomUUID();
  const row: AdminUser = { id, email: body.email, name: body.name, roles: body.roles, suspended: false };
  ADMIN_DB.users.set(id, row);
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'USER_INVITE', resource:`user:${id}`, payload: { roles: body.roles } });
  res.json({ data: row });
});
r.post('/users/:id/roles', requireAdmin('admin.users.write'), (req,res)=>{
  const schema = z.object({ roles: z.array(z.string()).min(1) });
  const { roles } = schema.parse(req.body);
  const user = ADMIN_DB.users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  user.roles = roles; ADMIN_DB.users.set(user.id, user);
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'USER_ROLE_UPDATE', resource:`user:${user.id}`, payload:{ roles } });
  res.json({ data: user });
});
r.post('/users/:id/suspend', requireAdmin('admin.users.write'), (req,res)=>{
  const user = ADMIN_DB.users.get(req.params.id); if (!user) return res.status(404).json({ error: 'not_found' });
  user.suspended = true; ADMIN_DB.users.set(user.id, user);
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'USER_SUSPEND', resource:`user:${user.id}` });
  res.json({ data: user });
});
r.post('/users/:id/restore', requireAdmin('admin.users.write'), (req,res)=>{
  const user = ADMIN_DB.users.get(req.params.id); if (!user) return res.status(404).json({ error: 'not_found' });
  user.suspended = false; ADMIN_DB.users.set(user.id, user);
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'USER_RESTORE', resource:`user:${user.id}` });
  res.json({ data: user });
});
r.post('/users/:id/impersonate', requireAdmin('admin.impersonate'), (req,res)=>{
  const user = ADMIN_DB.users.get(req.params.id); if (!user) return res.status(404).json({ error: 'not_found' });
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'IMPERSONATE_START', resource:`user:${user.id}` });
  // TODO: set special impersonation session
  res.json({ data: { ok: true, target: user.id } });
});

/** ROLES (read-only here – you can wire writes later) */
r.get('/roles', requireAdmin('admin.roles.read'), (_req,res)=> res.json({ data: [...ADMIN_DB.roles.values()] }));

/** API KEYS */
r.get('/keys', requireAdmin('admin.keys.read'), (_req,res)=> res.json({ data: [...ADMIN_DB.keys.values()] }));
r.post('/keys', requireAdmin('admin.keys.write'), (req,res)=>{
  const schema = z.object({ name: z.string().min(1), scopes: z.array(z.string()).default(['read']) });
  const { name, scopes } = schema.parse(req.body);
  const key = createApiKey(name, scopes);
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'APIKEY_CREATE', resource:`key:${key.id}`, payload:{ scopes } });
  res.json({ data: key, token_preview:`${key.token_prefix}…` });
});
r.post('/keys/:id/revoke', requireAdmin('admin.keys.write'), (req,res)=>{
  const key = revokeApiKey(req.params.id);
  if (!key) return res.status(404).json({ error: 'not_found' });
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'APIKEY_REVOKE', resource:`key:${key.id}` });
  res.json({ data: key });
});

/** FEATURE FLAGS */
r.get('/flags', requireAdmin('admin.flags.read'), (_req,res)=> res.json({ data:[...ADMIN_DB.flags.values()] }));
r.post('/flags/:key', requireAdmin('admin.flags.write'), (req,res)=>{
  const schema = z.object({ on: z.boolean(), note: z.string().optional(), targeting: z.object({ roles: z.array(z.string()).optional(), stores: z.array(z.string()).optional(), pct: z.number().min(0).max(100).optional() }).optional() });
  const { on, note, targeting } = schema.parse(req.body);
  const row = setFlag(req.params.key, on, note, targeting);
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'FLAG_TOGGLE', resource:`flag:${row.key}`, payload:{ on, targeting } });
  res.json({ data: row });
});

/** JOBS */
r.get('/jobs', requireAdmin('admin.jobs.read'), (_req,res)=> res.json({ data: listJobs() }));
r.post('/jobs/:id/retry', requireAdmin('admin.jobs.write'), (req,res)=>{
  const row = retryJob(req.params.id); if (!row) return res.status(404).json({ error: 'not_found' });
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'JOB_RETRY', resource:`job:${row.id}` });
  res.json({ data: row });
});
r.post('/jobs/:id/cancel', requireAdmin('admin.jobs.write'), (req,res)=>{
  const row = cancelJob(req.params.id); if (!row) return res.status(404).json({ error: 'not_found' });
  recordAudit({ actor_id: req.user!.id, actor_email: req.user!.email || req.user!.username, type:'JOB_CANCEL', resource:`job:${row.id}` });
  res.json({ data: row });
});

/** AUDIT LOG */
r.get('/audit', requireAdmin('admin.audit.read'), (req,res)=>{
  const { q, from, to, type } = req.query as any;
  const rows = queryAudit({ q, from, to, type });
  res.json({ data: rows });
});

export default r;