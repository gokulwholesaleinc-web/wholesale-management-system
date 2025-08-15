import { Router } from 'express';
import { storage } from '../storage';
// POS auth will be handled in the new dedicated auth routes
// import { requirePosAuth } from './posAuthRoutes';
import { 
  posTransactions, 
  posTransactionItems, 
  posHeldTransactions,
  posSettings,
  posAuditLogs,
  orders,
  orderItems,
  products,
  users,
  customerPricingMemory,
  customerCreditLines,
  creditLineTransactions,
  taxes,
  customerTaxExemptions,
  productTaxAssignments,
  categoryTaxAssignments
} from '../../shared/schema';
import { db } from '../db';
import { eq, desc, and, like, or, sql } from 'drizzle-orm';

const router = Router();

// POS Authentication verification endpoint
router.post('/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No valid authentication token' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Validate POS token format (pos-{userId}-{timestamp})
    if (!token.startsWith('pos-')) {
      return res.status(401).json({ success: false, message: 'Invalid POS token format' });
    }
    
    // Extract user ID from token
    const tokenParts = token.split('-');
    if (tokenParts.length < 3) {
      return res.status(401).json({ success: false, message: 'Invalid token structure' });
    }
    
    const userId = tokenParts.slice(1, -1).join('-'); // Handle user IDs with hyphens
    
    // Verify user exists and has admin/employee privileges
    const user = await storage.getUser(userId);
    if (!user || (!user.isAdmin && !user.isEmployee)) {
      return res.status(401).json({ success: false, message: 'User not found or insufficient privileges' });
    }
    
    // Return authenticated user data
    res.json({ 
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isEmployee: user.isEmployee,
        role: user.isAdmin ? 'admin' : 'employee'
      }
    });
  } catch (error) {
    console.error('POS token verification error:', error);
    res.status(500).json({ success: false, message: 'Token verification failed' });
  }
});

// Legacy session validation (for backward compatibility)
router.post('/validate-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { session } = req.body;
    
    if (!authHeader || !session) {
      return res.json({ valid: false, message: 'Missing authentication data' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Validate POS token format (pos-{userId}-{timestamp})
    if (!token.startsWith('pos-')) {
      return res.json({ valid: false, message: 'Invalid token format' });
    }
    
    // Extract user ID from token
    const tokenParts = token.split('-');
    if (tokenParts.length < 3) {
      return res.json({ valid: false, message: 'Invalid token structure' });
    }
    
    const userId = tokenParts.slice(1, -1).join('-'); // Handle user IDs with hyphens
    
    // Verify user exists and has admin/employee privileges
    const user = await storage.getUser(userId);
    if (!user || (!user.isAdmin && !user.isEmployee)) {
      return res.json({ valid: false, message: 'User not found or insufficient privileges' });
    }
    
    // For now, accept any valid POS token format
    // In production, you'd validate against stored sessions
    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isEmployee: user.isEmployee
      }
    });
  } catch (error) {
    console.error('POS session validation error:', error);
    res.json({ valid: false, message: 'Session validation failed' });
  }
});

// OTP storage for POS login verification
const otpStore = new Map();

// POS Login Step 1 - Verify credentials and check trusted device
router.post('/login', async (req, res) => {
  try {
    const { username, password, deviceFingerprint } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Authenticate user (use existing auth from main app)
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Verify user has admin or employee privileges
    if (!user.isAdmin && !user.isEmployee) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. POS requires admin or employee privileges.' 
      });
    }
    
    // Verify password
    const bcrypt = await import('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Check if device is trusted (skip OTP for trusted devices)
    if (deviceFingerprint) {
      try {
        const trustedDevice = await storage.getTrustedDevice(user.id, deviceFingerprint);
        if (trustedDevice) {
          // Check if device trust hasn't expired (30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          
          if (trustedDevice.createdAt > thirtyDaysAgo) {
            // Device is trusted and not expired, skip OTP
            const timestamp = Date.now();
            const posToken = `pos-${user.id}-${timestamp}`;
            
            // Update last used timestamp
            await storage.updateTrustedDeviceLastUsed(user.id, deviceFingerprint);
            
            return res.json({
              success: true,
              skipOtp: true,
              message: 'Trusted device login successful',
              token: posToken,
              user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                isEmployee: user.isEmployee
              }
            });
          } else {
            // Device trust expired, remove it
            await storage.removeTrustedDevice(user.id, deviceFingerprint);
          }
        }
      } catch (error) {
        console.error('Error checking trusted device:', error);
        // Continue with OTP flow if trust check fails
      }
    }
    
    // Generate and send OTP for additional security
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `pos-otp-${user.id}-${Date.now()}`;
    
    // Store OTP (expires in 5 minutes)
    otpStore.set(otpKey, {
      code: otpCode,
      userId: user.id,
      userEmail: user.email || `${user.username}@example.com`,
      expires: Date.now() + 5 * 60 * 1000,
      verified: false
    });
    
    // Send OTP via email using proper template system
    try {
      const { EmailService } = await import('../services/emailService');
      const emailService = EmailService.getInstance();
      
      console.log('🔐 POS OTP Debug - Sending OTP email with code:', otpCode);
      console.log('🔐 POS OTP Debug - User email:', user.email || `${user.username}@example.com`);
      
      // Use the OTP verification template with proper data structure
      const emailData = {
        to: user.email || `${user.username}@example.com`,
        customerName: user.firstName || user.username || 'User',
        otpCode: otpCode,
        expiresInMinutes: 5,
        systemName: 'In-Store POS System',
        securityMessage: 'If you did not request this code, please contact your administrator immediately.'
      };
      
      console.log('🔐 POS OTP Debug - Email data structure:', {
        to: emailData.to,
        customerName: emailData.customerName,
        otpCode: emailData.otpCode,
        systemName: emailData.systemName
      });
      
      const template = await emailService.generateEmailContent('otp_verification', emailData);
      
      console.log('🔐 POS OTP Debug - Generated template subject:', template.subject);
      console.log('🔐 POS OTP Debug - Template contains OTP code:', template.htmlContent.includes(otpCode));
      console.log('🔐 POS OTP Debug - Sending email with actual OTP code:', otpCode);
      
      // Send email directly using SendGrid (avoid double template processing)
      const sgMail = await import('@sendgrid/mail');
      
      console.log('🔐 POS OTP Debug - Using direct SendGrid send to avoid template confusion');
      
      const msg = {
        to: emailData.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'info@shopgokul.com',
          name: 'Gokul Wholesale Inc.'
        },
        subject: template.subject,
        text: template.textContent,
        html: template.htmlContent
      };
      
      console.log('🔐 POS OTP Debug - Email message structure:', {
        to: msg.to,
        subject: msg.subject,
        fromEmail: msg.from.email,
        htmlContainsOtp: msg.html.includes(otpCode)
      });
      
      const result = await sgMail.default.send(msg);
      console.log(`🔐 POS OTP Debug - Email sent successfully, Message ID: ${result[0]?.headers?.['x-message-id'] || 'N/A'}`);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }
    
    res.json({
      success: true,
      message: 'Verification code sent to email',
      otpKey,
      requiresOtp: true,
      userEmail: user.email || `${user.username}@example.com`,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isEmployee: user.isEmployee
      }
    });
  } catch (error) {
    console.error('POS login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
});

// POS OTP Verification endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { otpKey, otpCode, rememberDevice, deviceFingerprint } = req.body;
    
    if (!otpKey || !otpCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP key and code are required' 
      });
    }
    
    // Check if OTP exists and hasn't expired
    const otpData = otpStore.get(otpKey);
    if (!otpData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired OTP' 
      });
    }
    
    // Check expiration
    if (Date.now() > otpData.expires) {
      otpStore.delete(otpKey);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired' 
      });
    }
    
    // Verify OTP code
    if (otpData.code !== otpCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP code' 
      });
    }
    
    // In-store access code requirement removed as requested
    
    // OTP and in-store code verified, complete login
    const user = await storage.getUser(otpData.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Generate POS session token
    const timestamp = Date.now();
    const posToken = `pos-${user.id}-${timestamp}`;
    
    // If user chose to remember device, add it to trusted devices
    if (rememberDevice && deviceFingerprint) {
      try {
        await storage.addTrustedDevice({
          userId: user.id,
          deviceFingerprint,
          deviceName: `POS Device ${new Date().toLocaleDateString()}`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      } catch (error) {
        console.error('Error adding trusted device:', error);
        // Continue with login even if trusted device creation fails
      }
    }
    
    // Clean up OTP
    otpStore.delete(otpKey);
    
    res.json({
      success: true,
      message: 'POS authentication successful',
      token: posToken,
      deviceTrusted: rememberDevice && deviceFingerprint,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isEmployee: user.isEmployee
      }
    });
  } catch (error) {
    console.error('POS OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'OTP verification failed' 
    });
  }
});

// Add today's sales endpoint
router.get('/todays-sales', async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // For now, return mock data - in production this would query actual orders
    res.json({
      total: 2847.50,
      transactions: 23,
      date: today.toISOString().split('T')[0],
      averageTransaction: 123.80
    });
  } catch (error) {
    console.error('Error fetching today\'s sales:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales data',
      total: 0,
      transactions: 0,
      date: new Date().toISOString().split('T')[0],
      averageTransaction: 0
    });
  }
});

// REMOVED: Duplicate held-transactions endpoint - keeping the main one below

// Generate unique transaction number
function generateTransactionNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TXN-${timestamp}-${random}`.toUpperCase();
}

// Log POS audit action
async function logPosAudit(userId: string, action: string, resourceType: string, resourceId: string, details: string, ipAddress?: string) {
  try {
    await db.insert(posAuditLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress
    });
  } catch (error) {
    console.error('Failed to log POS audit:', error);
  }
}

// GET /api/pos/settings - Get POS settings
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await db.select().from(posSettings).limit(1);
    
    // Default settings if none exist
    const defaultSettings = {
      businessName: 'Gokul Wholesale Inc.',
      businessAddress: '1141 W Bryn Mawr Ave, Itasca, IL 60143',
      businessPhone: '(630) 540-9910',
      businessEmail: 'sales@gokulwholesaleinc.com',
      taxRate: 0.0875,
      receiptHeader: 'Thank you for shopping with us!',
      receiptFooter: 'Visit us online at shopgokul.com',
      autoApplyTax: true,
      requireManagerVoid: true,
      allowNegativeStock: false,
      roundingMethod: 'nearest_cent',
      defaultPaymentMethod: 'cash'
    };

    res.json(settings || defaultSettings);
  } catch (error) {
    console.error('Error fetching POS settings:', error);
    res.status(500).json({ error: 'Failed to fetch POS settings' });
  }
});

// GET /api/pos/products - Get products for POS
router.get('/products', async (req, res) => {
  try {
    const { search, category, limit = 1000 } = req.query;
    
    const productList = await storage.getProducts();
    let filteredProducts = productList;
    
    // Apply search filter
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
        (product.upcCode && product.upcCode.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply category filter
    if (category) {
      const categoryId = parseInt(category as string);
      filteredProducts = filteredProducts.filter(product => product.categoryId === categoryId);
    }
    
    // Apply limit (default 1000 to show all products for POS)
    const limitNum = parseInt(limit as string) || 1000;
    filteredProducts = filteredProducts.slice(0, limitNum);
    
    res.json(filteredProducts);
  } catch (error) {
    console.error('Error fetching POS products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/pos/customers - Get customers for POS
router.get('/customers', async (req, res) => {
  try {
    const { search, limit = 50 } = req.query;
    
    // Query customers directly from database
    let query = db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      company: users.company,
      customerLevel: users.customerLevel,
      phone: users.phone
    }).from(users).where(
      and(
        eq(users.isAdmin, false),
        eq(users.isEmployee, false)
      )
    );
    
    let customerList = await query.limit(parseInt(limit as string) || 50);
    
    // Apply search filter after query if needed
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      customerList = customerList.filter(customer =>
        (customer.firstName && customer.firstName.toLowerCase().includes(searchTerm)) ||
        (customer.lastName && customer.lastName.toLowerCase().includes(searchTerm)) ||
        (customer.username && customer.username.toLowerCase().includes(searchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
        (customer.company && customer.company.toLowerCase().includes(searchTerm)) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
      );
    }
    
    res.json(customerList);
  } catch (error) {
    console.error('Error fetching POS customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /api/pos/categories - Get categories for POS
router.get('/categories', async (req, res) => {
  try {
    const categories = await storage.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/pos/held-transactions - Get held transactions
router.get('/held-transactions', async (req, res) => {
  try {
    const heldTransactions = await db.select().from(posHeldTransactions)
      .orderBy(desc(posHeldTransactions.createdAt));
    
    res.json(heldTransactions);
  } catch (error) {
    console.error('Error fetching held transactions:', error);
    res.status(500).json({ error: 'Failed to fetch held transactions' });
  }
});

// POST /api/pos/held-transactions - Hold current transaction
router.post('/held-transactions', async (req, res) => {
  try {
    const user = req.user!;
    const { transactionName, customerId, items, subtotal, tax, total } = req.body;
    
    if (!transactionName) {
      return res.status(400).json({ error: 'Transaction name is required' });
    }
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cannot hold empty transaction' });
    }
    
    const [heldTransaction] = await db.insert(posHeldTransactions).values({
      transactionName,
      customerId,
      userId: user.id,
      items: JSON.stringify(items),
      subtotal,
      tax,
      total
    }).returning();
    
    await logPosAudit(
      user.id,
      'hold_transaction',
      'held_transaction',
      heldTransaction.id.toString(),
      `Held transaction ${transactionName}`,
      req.ip
    );
    
    res.json(heldTransaction);
  } catch (error) {
    console.error('Error holding transaction:', error);
    res.status(500).json({ error: 'Failed to hold transaction' });
  }
});

// PUT /api/pos/settings - Update POS settings
router.put('/settings', async (req, res) => {
  try {
    const user = req.user!;
    const settingsData = {
      ...req.body,
      updatedBy: user.id,
      updatedAt: new Date()
    };

    // Check if settings exist
    const [existingSettings] = await db.select().from(posSettings).limit(1);
    
    let result;
    if (existingSettings) {
      result = await db.update(posSettings)
        .set(settingsData)
        .where(eq(posSettings.id, existingSettings.id))
        .returning();
    } else {
      result = await db.insert(posSettings).values(settingsData).returning();
    }

    await logPosAudit(
      user.id, 
      'update_settings', 
      'pos_settings', 
      result[0].id.toString(),
      `Updated POS settings`,
      req.ip
    );

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating POS settings:', error);
    res.status(500).json({ error: 'Failed to update POS settings' });
  }
});

// POST /api/pos/transactions - Process new transaction
router.post('/transactions', async (req, res) => {
  try {
    const user = req.user!;
    const {
      customerId,
      orderId,
      items,
      paymentMethod,
      cashReceived,
      cashChange,
      checkNumber,
      notes,
      subtotal,
      tax,
      total
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Transaction must have at least one item' });
    }

    // Validate payment method specific requirements
    if (paymentMethod === 'check' && !checkNumber) {
      return res.status(400).json({ error: 'Check number is required for check payments' });
    }

    if (paymentMethod === 'cash' && (!cashReceived || cashReceived < total)) {
      return res.status(400).json({ error: 'Insufficient cash amount' });
    }

    // Generate transaction number
    const transactionNumber = generateTransactionNumber();

    // Create transaction
    const [transaction] = await db.insert(posTransactions).values({
      orderId,
      customerId,
      transactionNumber,
      userId: user.id,
      total,
      subtotal,
      tax,
      paymentMethod,
      cashReceived,
      cashChange,
      checkNumber,
      notes,
      status: 'completed'
    }).returning();

    // Create transaction items
    const transactionItems = items.map((item: any) => ({
      transactionId: transaction.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      originalPrice: item.unitPrice, // Store original price before discounts
      discount: item.discount || 0,
      subtotal: item.subtotal
    }));

    await db.insert(posTransactionItems).values(transactionItems);

    // Update inventory (reduce stock)
    for (const item of items) {
      await db.update(products)
        .set({ 
          stock: sql`stock - ${item.quantity}` 
        })
        .where(eq(products.id, item.productId));
    }

    // If this was from a pending order, update order status
    if (orderId) {
      await db.update(orders)
        .set({ 
          status: 'completed',
          paymentMethod,
          paymentDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }

    // Save price memory for customer if they got special pricing
    if (customerId && req.body.savePriceMemory) {
      for (const item of items) {
        if (item.specialPrice && item.specialPrice !== item.originalPrice) {
          // Check if pricing memory exists for this customer+product
          const [existingMemory] = await db
            .select()
            .from(customerPricingMemory)
            .where(and(
              eq(customerPricingMemory.customerId, customerId),
              eq(customerPricingMemory.productId, item.productId)
            ));

          if (existingMemory) {
            // Update existing pricing memory
            await db.update(customerPricingMemory)
              .set({
                lastPrice: item.specialPrice,
                lastPurchaseDate: new Date(),
                purchaseCount: sql`${customerPricingMemory.purchaseCount} + 1`,
                updatedAt: new Date()
              })
              .where(eq(customerPricingMemory.id, existingMemory.id));
          } else {
            // Create new pricing memory
            await db.insert(customerPricingMemory).values({
              customerId,
              productId: item.productId,
              lastPrice: item.specialPrice,
              lastPurchaseDate: new Date(),
              purchaseCount: 1
            });
          }
        }
      }
    }

    // Log audit
    await logPosAudit(
      user.id,
      'process_transaction',
      'pos_transaction',
      transaction.id.toString(),
      `Processed transaction ${transactionNumber} for ${formatCurrency(total)}`,
      req.ip
    );

    res.json({
      success: true,
      transaction: {
        ...transaction,
        items: transactionItems
      },
      message: 'Transaction processed successfully'
    });

  } catch (error) {
    console.error('Error processing transaction:', error);
    res.status(500).json({ error: 'Failed to process transaction' });
  }
});

// GET /api/pos/transactions - Get transaction history
router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const transactions = await db
      .select({
        transaction: posTransactions,
        customer: users,
        staff: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(posTransactions)
      .leftJoin(users, eq(posTransactions.customerId, users.id))
      .leftJoin(users as any, eq(posTransactions.userId, users.id))
      .orderBy(desc(posTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    // Get items for each transaction
    const transactionsWithItems = await Promise.all(
      transactions.map(async (t) => {
        const items = await db
          .select({
            item: posTransactionItems,
            product: products
          })
          .from(posTransactionItems)
          .leftJoin(products, eq(posTransactionItems.productId, products.id))
          .where(eq(posTransactionItems.transactionId, t.transaction.id));

        return {
          ...t.transaction,
          customer: t.customer,
          staff: t.staff,
          items: items.map(i => ({
            ...i.item,
            product: i.product
          }))
        };
      })
    );

    res.json(transactionsWithItems);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// PUT /api/pos/orders/:id - Modify pending order
router.put('/orders/:id', async (req, res) => {
  try {
    const user = req.user!;
    const orderId = parseInt(req.params.id);
    const { items, notes, total } = req.body;

    // Verify order exists and is pending
    const [order] = await db
      .select()
      .from(orders)
      .where(and(
        eq(orders.id, orderId),
        eq(orders.status, 'pending')
      ));

    if (!order) {
      return res.status(404).json({ error: 'Pending order not found' });
    }

    // Delete existing order items
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

    // Add new items
    if (items && items.length > 0) {
      const newItems = items.map((item: any) => ({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }));
      await db.insert(orderItems).values(newItems);
    }

    // Update order
    const [updatedOrder] = await db.update(orders)
      .set({
        total: total || order.total,
        notes: notes || order.notes,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    await logPosAudit(
      user.id,
      'modify_order',
      'order',
      orderId.toString(),
      `Modified pending order #${orderId}`,
      req.ip
    );

    res.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully'
    });

  } catch (error) {
    console.error('Error modifying order:', error);
    res.status(500).json({ error: 'Failed to modify order' });
  }
});

// POST /api/pos/hold-transaction - Hold current transaction
router.post('/hold-transaction', async (req, res) => {
  try {
    const user = req.user!;
    const { customerId, transactionName, items, subtotal, tax, total, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cannot hold empty transaction' });
    }

    const [heldTransaction] = await db.insert(posHeldTransactions).values({
      customerId,
      userId: user.id,
      transactionName: transactionName || `Hold ${new Date().toLocaleTimeString()}`,
      items: JSON.stringify(items),
      subtotal,
      tax,
      total,
      notes
    }).returning();

    await logPosAudit(
      user.id,
      'hold_transaction',
      'held_transaction',
      heldTransaction.id.toString(),
      `Held transaction: ${heldTransaction.transactionName}`,
      req.ip
    );

    res.json({
      success: true,
      heldTransaction,
      message: 'Transaction held successfully'
    });

  } catch (error) {
    console.error('Error holding transaction:', error);
    res.status(500).json({ error: 'Failed to hold transaction' });
  }
});

// REMOVED: Duplicate of held-transactions endpoint above - keeping main implementation

// DELETE /api/pos/held-transactions/:id - Delete held transaction
router.delete('/held-transactions/:id', async (req, res) => {
  try {
    const user = req.user!;
    const heldTransactionId = parseInt(req.params.id);

    await db.delete(posHeldTransactions).where(eq(posHeldTransactions.id, heldTransactionId));

    await logPosAudit(
      user.id,
      'delete_held_transaction',
      'held_transaction',
      heldTransactionId.toString(),
      `Deleted held transaction #${heldTransactionId}`,
      req.ip
    );

    res.json({ success: true, message: 'Held transaction deleted' });
  } catch (error) {
    console.error('Error deleting held transaction:', error);
    res.status(500).json({ error: 'Failed to delete held transaction' });
  }
});

// GET /api/pos/product-lookup - Product lookup by barcode or search
router.get('/product-lookup', async (req, res) => {
  try {
    const { barcode, search } = req.query;
    
    if (!barcode && !search) {
      return res.status(400).json({ error: 'Barcode or search term required' });
    }
    
    let product;
    
    if (barcode) {
      // Look up by barcode/UPC code
      const [productResult] = await db.select()
        .from(products)
        .where(eq(products.upcCode, barcode as string))
        .limit(1);
      product = productResult;
    } else if (search) {
      // Look up by name (first match)
      const [productResult] = await db.select()
        .from(products)
        .where(like(products.name, `%${search}%`))
        .limit(1);
      product = productResult;
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error looking up product:', error);
    res.status(500).json({ error: 'Failed to lookup product' });
  }
});

// GET /api/pos/pricing-memory/:customerId - Get customer pricing memory
router.get('/pricing-memory/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    
    const pricingMemory = await db.select({
      id: customerPricingMemory.id,
      productId: customerPricingMemory.productId,
      specialPrice: customerPricingMemory.specialPrice,
      originalPrice: customerPricingMemory.originalPrice,
      reason: customerPricingMemory.reason,
      isActive: customerPricingMemory.isActive,
      lastUsed: customerPricingMemory.lastUsed,
      useCount: customerPricingMemory.useCount,
      productName: products.name
    })
    .from(customerPricingMemory)
    .leftJoin(products, eq(customerPricingMemory.productId, products.id))
    .where(and(
      eq(customerPricingMemory.customerId, customerId),
      eq(customerPricingMemory.isActive, true)
    ));
    
    res.json(pricingMemory);
  } catch (error) {
    console.error('Error fetching pricing memory:', error);
    res.status(500).json({ error: 'Failed to fetch pricing memory' });
  }
});

// POST /api/pos/pricing-memory - Set special price for customer
router.post('/pricing-memory', async (req, res) => {
  try {
    const user = req.user!;
    const { customerId, productId, specialPrice, reason } = req.body;
    
    // Get original product price
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
      
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if pricing memory already exists
    const [existing] = await db.select()
      .from(customerPricingMemory)
      .where(and(
        eq(customerPricingMemory.customerId, customerId),
        eq(customerPricingMemory.productId, productId),
        eq(customerPricingMemory.isActive, true)
      ))
      .limit(1);
    
    if (existing) {
      // Update existing pricing memory
      const [updated] = await db.update(customerPricingMemory)
        .set({
          specialPrice: specialPrice.toString(),
          reason,
          updatedAt: new Date()
        })
        .where(eq(customerPricingMemory.id, existing.id))
        .returning();
        
      res.json(updated);
    } else {
      // Create new pricing memory
      const [created] = await db.insert(customerPricingMemory)
        .values({
          customerId,
          productId,
          specialPrice: specialPrice.toString(),
          originalPrice: product.price.toString(),
          reason,
          setBy: user.id,
          isActive: true
        })
        .returning();
        
      res.json(created);
    }
    
    await logPosAudit(
      user.id,
      'set_pricing_memory',
      'pricing_memory',
      `${customerId}-${productId}`,
      `Set special price $${specialPrice} for customer ${customerId} on product ${productId}`,
      req.ip
    );
  } catch (error) {
    console.error('Error setting pricing memory:', error);
    res.status(500).json({ error: 'Failed to set pricing memory' });
  }
});

// GET /api/pos/customer-history/:customerId - Get customer purchase history
router.get('/customer-history/:customerId', async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const transactions = await db.select({
      id: posTransactions.id,
      transactionNumber: posTransactions.transactionNumber,
      total: posTransactions.total,
      subtotal: posTransactions.subtotal,
      tax: posTransactions.tax,
      paymentMethod: posTransactions.paymentMethod,
      status: posTransactions.status,
      createdAt: posTransactions.createdAt
    })
    .from(posTransactions)
    .where(eq(posTransactions.customerId, customerId))
    .orderBy(desc(posTransactions.createdAt))
    .limit(limit);
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching customer history:', error);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

// POST /api/pos/held-transactions/:id/recall - Recall held transaction
router.post('/held-transactions/:id/recall', async (req, res) => {
  try {
    const user = req.user!;
    const heldTransactionId = parseInt(req.params.id);
    
    const [heldTransaction] = await db.select()
      .from(posHeldTransactions)
      .where(eq(posHeldTransactions.id, heldTransactionId))
      .limit(1);
    
    if (!heldTransaction) {
      return res.status(404).json({ error: 'Held transaction not found' });
    }
    
    // Get customer info if exists
    let customer = null;
    if (heldTransaction.customerId) {
      const [customerResult] = await db.select()
        .from(users)
        .where(eq(users.id, heldTransaction.customerId))
        .limit(1);
      customer = customerResult;
    }
    
    await logPosAudit(
      user.id,
      'recall_held_transaction',
      'held_transaction',
      heldTransactionId.toString(),
      `Recalled held transaction ${heldTransaction.transactionName}`,
      req.ip
    );
    
    // Parse items if they're stored as JSON string
    let items = heldTransaction.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.error('Failed to parse held transaction items:', e);
        items = [];
      }
    }

    res.json({
      items,
      customer,
      subtotal: heldTransaction.subtotal,
      tax: heldTransaction.tax,
      total: heldTransaction.total
    });
  } catch (error) {
    console.error('Error recalling held transaction:', error);
    res.status(500).json({ error: 'Failed to recall held transaction' });
  }
});

// POST /api/pos/orders - Create order for delivery or pickup
router.post('/orders', async (req, res) => {
  try {
    const user = req.user!;
    const { 
      customerId, 
      customerName, 
      items, 
      subtotal, 
      tax, 
      total, 
      orderType, 
      status, 
      deliveryAddress, 
      pickupDate, 
      notes 
    } = req.body;

    // Create order
    const [order] = await db.insert(orders).values({
      customerId,
      customerName: customerName || 'Walk-in Customer',
      subtotal: subtotal.toString(),
      tax: tax.toString(),
      total: total.toString(),
      status: status || 'pending',
      deliveryAddress,
      pickupDate: pickupDate ? new Date(pickupDate) : null,
      notes,
      orderType: orderType || 'delivery'
    }).returning();

    // Create order items
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        total: (item.quantity * item.unitPrice).toString()
      });
    }

    await logPosAudit(
      user.id,
      'create_order',
      'order',
      order.id.toString(),
      `Created ${orderType} order #${order.id} for ${customerName}`,
      req.ip
    );

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/pos/orders/:id/status - Update order status
router.put('/orders/:id/status', async (req, res) => {
  try {
    const user = req.user!;
    const orderId = parseInt(req.params.id);
    const { status, notes } = req.body;

    const [updatedOrder] = await db.update(orders)
      .set({
        status,
        notes: notes || undefined,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await logPosAudit(
      user.id,
      'update_order_status',
      'order',
      orderId.toString(),
      `Updated order #${orderId} status to ${status}`,
      req.ip
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PUT /api/pos/orders/:id/notes - Update order notes
router.put('/orders/:id/notes', async (req, res) => {
  try {
    const user = req.user!;
    const orderId = parseInt(req.params.id);
    const { notes } = req.body;

    const [updatedOrder] = await db.update(orders)
      .set({
        notes,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await logPosAudit(
      user.id,
      'update_order_notes',
      'order',
      orderId.toString(),
      `Updated notes for order #${orderId}`,
      req.ip
    );

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order notes:', error);
    res.status(500).json({ error: 'Failed to update order notes' });
  }
});

// GET /api/pos/orders - Get orders with filters
router.get('/orders', async (req, res) => {
  try {
    const { status, orderType, customerId, limit = 50, offset = 0 } = req.query;
    
    // Simple approach: Get all orders first, then join with users data
    let ordersQuery = db.select().from(orders);
    
    // Apply filters
    const conditions = [];
    if (status) conditions.push(eq(orders.status, status as string));
    if (orderType) conditions.push(eq(orders.orderType, orderType as string));
    if (customerId) conditions.push(eq(orders.userId, customerId as string));

    if (conditions.length > 0) {
      ordersQuery = ordersQuery.where(and(...conditions));
    }

    const orderList = await ordersQuery
      .orderBy(desc(orders.createdAt))
      .limit(parseInt(limit as string) || 50)
      .offset(parseInt(offset as string) || 0);

    // Get user information for each order
    const ordersWithCustomerInfo = [];
    for (const order of orderList) {
      try {
        const customer = await db.select({
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName
        }).from(users).where(eq(users.id, order.userId)).limit(1);

        ordersWithCustomerInfo.push({
          ...order,
          customerId: order.userId, // Map userId to customerId for frontend compatibility
          customerName: customer[0] ? `${customer[0].firstName} ${customer[0].lastName}` : 'Unknown Customer',
          customer: customer[0] || null
        });
      } catch (err) {
        // If user lookup fails, still include the order
        ordersWithCustomerInfo.push({
          ...order,
          customerId: order.userId,
          customerName: 'Unknown Customer',
          customer: null
        });
      }
    }

    res.json(ordersWithCustomerInfo);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/pos/orders/:id - Get single order with items
router.get('/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    // Get order details
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    const items = await db.select({
      id: orderItems.id,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      total: orderItems.total,
      productName: products.name,
      productImageUrl: products.imageUrl
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
    
    // Get customer info
    let customer = null;
    if (order.userId) {
      const [customerResult] = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName
      }).from(users).where(eq(users.id, order.userId)).limit(1);
      customer = customerResult;
    }
    
    res.json({
      ...order,
      items,
      customer,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer'
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT /api/pos/orders/:id/items/:itemId - Update order item
router.put('/orders/:id/items/:itemId', async (req, res) => {
  try {
    const user = req.user!;
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const { quantity, price, note } = req.body;
    
    // Validate input
    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be 0 or greater' });
    }
    
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    
    // If quantity is 0, remove the item
    if (quantity === 0) {
      await db.delete(orderItems).where(eq(orderItems.id, itemId));
      
      await logPosAudit(
        user.id,
        'remove_order_item',
        'order_item',
        itemId.toString(),
        `Removed item from order #${orderId}`,
        req.ip
      );
      
      return res.json({ success: true, message: 'Item removed from order' });
    }
    
    // Update the item
    const [updatedItem] = await db.update(orderItems)
      .set({
        quantity,
        unitPrice: price.toString(),
        total: (quantity * price).toString()
      })
      .where(eq(orderItems.id, itemId))
      .returning();
    
    if (!updatedItem) {
      return res.status(404).json({ error: 'Order item not found' });
    }
    
    // Update order total
    const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const newSubtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const newTax = newSubtotal * 0.08; // 8% tax
    const newTotal = newSubtotal + newTax;
    
    await db.update(orders)
      .set({
        subtotal: newSubtotal.toString(),
        tax: newTax.toString(),
        total: newTotal.toString(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
    
    await logPosAudit(
      user.id,
      'update_order_item',
      'order_item',
      itemId.toString(),
      `Updated item in order #${orderId}: qty=${quantity}, price=$${price}`,
      req.ip
    );
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating order item:', error);
    res.status(500).json({ error: 'Failed to update order item' });
  }
});

// POST /api/pos/orders/:id/items - Add item to order
router.post('/orders/:id/items', async (req, res) => {
  try {
    const user = req.user!;
    const orderId = parseInt(req.params.id);
    const { productId, quantity, unitPrice } = req.body;
    
    // Validate input
    if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice <= 0) {
      return res.status(400).json({ error: 'Valid productId, quantity, and unitPrice are required' });
    }
    
    // Add the item
    const [newItem] = await db.insert(orderItems).values({
      orderId,
      productId,
      quantity,
      unitPrice: unitPrice.toString(),
      total: (quantity * unitPrice).toString()
    }).returning();
    
    // Update order total
    const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const newSubtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const newTax = newSubtotal * 0.08; // 8% tax
    const newTotal = newSubtotal + newTax;
    
    await db.update(orders)
      .set({
        subtotal: newSubtotal.toString(),
        tax: newTax.toString(),
        total: newTotal.toString(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
    
    await logPosAudit(
      user.id,
      'add_order_item',
      'order_item',
      newItem.id.toString(),
      `Added item to order #${orderId}: ${quantity}x product ${productId}`,
      req.ip
    );
    
    res.json(newItem);
  } catch (error) {
    console.error('Error adding order item:', error);
    res.status(500).json({ error: 'Failed to add order item' });
  }
});

// DELETE /api/pos/orders/:id/items/:itemId - Remove item from order
router.delete('/orders/:id/items/:itemId', async (req, res) => {
  try {
    const user = req.user!;
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    
    await db.delete(orderItems).where(eq(orderItems.id, itemId));
    
    // Update order total
    const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const newSubtotal = allItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const newTax = newSubtotal * 0.08; // 8% tax
    const newTotal = newSubtotal + newTax;
    
    await db.update(orders)
      .set({
        subtotal: newSubtotal.toString(),
        tax: newTax.toString(),
        total: newTotal.toString(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));
    
    await logPosAudit(
      user.id,
      'remove_order_item',
      'order_item',
      itemId.toString(),
      `Removed item from order #${orderId}`,
      req.ip
    );
    
    res.json({ success: true, message: 'Item removed from order' });
  } catch (error) {
    console.error('Error removing order item:', error);
    res.status(500).json({ error: 'Failed to remove order item' });
  }
});

// POST /api/pos/held-transactions/:id/recall - Recall held transaction
router.post('/held-transactions/:id/recall', async (req, res) => {
  try {
    const user = req.user!;
    const heldTransactionId = parseInt(req.params.id);
    
    // Get the held transaction
    const [heldTransaction] = await db.select().from(posHeldTransactions)
      .where(eq(posHeldTransactions.id, heldTransactionId))
      .limit(1);
    
    if (!heldTransaction) {
      return res.status(404).json({ error: 'Held transaction not found' });
    }
    
    // Parse items
    let items = [];
    if (heldTransaction.items) {
      try {
        items = typeof heldTransaction.items === 'string' 
          ? JSON.parse(heldTransaction.items) 
          : heldTransaction.items;
      } catch (e) {
        console.error('Failed to parse held transaction items:', e);
      }
    }
    
    // Get customer data if exists
    let customer = null;
    if (heldTransaction.customerId) {
      const [customerData] = await db.select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        customerLevel: users.customerLevel
      }).from(users)
        .where(eq(users.id, heldTransaction.customerId))
        .limit(1);
      customer = customerData;
    }
    
    // Delete the held transaction
    await db.delete(posHeldTransactions)
      .where(eq(posHeldTransactions.id, heldTransactionId));
    
    await logPosAudit(
      user.id,
      'recall_transaction',
      'held_transaction',
      heldTransactionId.toString(),
      `Recalled held transaction ${heldTransaction.transactionName}`,
      req.ip
    );
    
    res.json({
      items,
      customer,
      subtotal: heldTransaction.subtotal,
      tax: heldTransaction.tax,
      total: heldTransaction.total
    });
  } catch (error) {
    console.error('Error recalling held transaction:', error);
    res.status(500).json({ error: 'Failed to recall held transaction' });
  }
});

// Utility function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// AI-powered POS endpoints
router.post('/ai-suggestions', async (req, res) => {
  try {
    const { customerId, cartItems, currentTotal } = req.body;
    
    // Get customer's recent orders and preferences
    const customer = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
    const allProducts = await db.select().from(products).limit(100);
    
    // Mock response with actual product data
    const mockSuggestions = {
      suggestions: [
        {
          productId: allProducts[0]?.id || 1,
          productName: allProducts[0]?.name || "Sample Product",
          reason: "Frequently bought together with current cart items",
          confidence: 85,
          category: "cross-sell",
          product: allProducts[0]
        },
        {
          productId: allProducts[1]?.id || 2,
          productName: allProducts[1]?.name || "Complementary Item",
          reason: "Popular with Level " + (customer[0]?.customerLevel || 1) + " customers",
          confidence: 78,
          category: "upsell",
          product: allProducts[1]
        }
      ].filter(s => s.product)
    };

    res.json(mockSuggestions);
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.json({ suggestions: [] });
  }
});

router.post('/ai-inventory-analysis', async (req, res) => {
  try {
    const { products, salesData } = req.body;
    
    // Mock inventory analysis with actual data
    const lowStockProducts = products.filter((p: any) => p.inventory < 10);
    const mockAlerts = {
      alerts: [
        {
          title: "Low Stock Alert",
          description: `${lowStockProducts.length} products have inventory below 10 units`,
          priority: "high",
          recommendation: "Reorder immediately to avoid stockouts",
          affectedProducts: lowStockProducts.map((p: any) => p.name).slice(0, 3)
        },
        {
          title: "Fast Moving Items",
          description: "3 products showing increased demand",
          priority: "medium", 
          recommendation: "Consider increasing stock levels for peak season",
          affectedProducts: products.slice(0, 3).map((p: any) => p.name)
        }
      ].filter(alert => alert.affectedProducts.length > 0)
    };

    res.json(mockAlerts);
  } catch (error) {
    console.error('AI inventory analysis error:', error);
    res.json({ alerts: [] });
  }
});

router.post('/ai-pricing-insights', async (req, res) => {
  try {
    const { productId, customerId, customerLevel, recentOrders } = req.body;
    
    // Get product details
    const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    
    if (!product[0]) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Mock pricing insights with actual data
    const mockInsights = {
      insights: {
        suggestedPrice: product[0].price * 0.95, // 5% discount
        priceReason: `Recommended for Level ${customerLevel} customer with ${recentOrders.length} recent orders`,
        averagePrice: product[0].price,
        transactionCount: recentOrders.length,
        insights: [
          "Customer shows high loyalty - consider competitive pricing",
          "Product demand is steady - maintain current margins",
          "Level " + customerLevel + " customers respond well to value pricing"
        ],
        confidence: 82
      }
    };

    res.json(mockInsights);
  } catch (error) {
    console.error('AI pricing insights error:', error);
    res.json({ insights: null });
  }
});

export { router as posRoutes };