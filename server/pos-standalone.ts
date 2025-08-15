import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import posRouter from './routes/pos';

const app = express();

// CORS configuration for standalone POS service
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));

// Mount POS routes
app.use('/api/pos', posRouter);

// Health check for standalone service
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'POS Standalone API',
    version: '1.0.0',
    store_id: process.env.POS_STORE_ID || 'ITASCA',
    register_id: process.env.POS_REGISTER_ID || 'REG-01',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[POS API Error]:', err);
  res.status(err?.status || 500).json({
    error: err?.message || 'Internal server error',
    service: 'POS Standalone API'
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    service: 'POS Standalone API',
    available_endpoints: [
      'GET /health',
      'GET /api/pos/health',
      'GET /api/pos/register/status',
      'POST /api/pos/register/open',
      'POST /api/pos/register/close',
      'GET /api/pos/products/:sku',
      'POST /api/pos/sales',
      'GET /api/pos/sales',
      'GET /api/pos/sales/:id',
      'GET /api/pos/inventory',
      'POST /api/pos/inventory/adjust',
      'GET /api/pos/stats',
      'GET /api/pos/reports/daily/:date'
    ]
  });
});

const port = process.env.POS_PORT || process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`🏪 POS Standalone API listening on port ${port}`);
  console.log(`🏬 Store ID: ${process.env.POS_STORE_ID || 'ITASCA'}`);
  console.log(`💳 Register ID: ${process.env.POS_REGISTER_ID || 'REG-01'}`);
  console.log(`🌐 Health Check: http://localhost:${port}/health`);
});