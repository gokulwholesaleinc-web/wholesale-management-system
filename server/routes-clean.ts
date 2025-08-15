import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertCartItemSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertDeliveryAddressSchema,
} from "@shared/schema";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sql, eq } from "drizzle-orm";
import cookieParser from "cookie-parser";
import { requireAuth, requireAdmin, requireEmployeeOrAdmin, createAuthToken, validateToken } from "./simpleAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Essential middleware setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  
  // Serve static files
  app.use('/images', express.static(path.join(process.cwd(), 'public/images')));
  app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
  
  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token, auth-token, Authentication, X-Access-Token, token');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Set JSON content type for all API routes
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================
  
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Username and password are required' 
        });
      }
      
      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Incorrect password' 
        });
      }
      
      const token = createAuthToken(user.id);
      
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          isEmployee: user.isEmployee,
          customerLevel: user.customerLevel
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false,
        message: 'An error occurred during login' 
      });
    }
  });

  // ============================================================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================================================
  
  app.get('/api/users', requireAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.patch('/api/users/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updatedUser = await storage.updateUser({ id, ...req.body });
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.get('/api/users/:userId/addresses', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const addresses = await storage.getDeliveryAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      res.status(500).json({ message: 'Failed to fetch addresses' });
    }
  });

  app.post('/api/users/:userId/addresses', requireAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const validatedData = insertDeliveryAddressSchema.parse({ ...req.body, userId });
      const address = await storage.createDeliveryAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      console.error('Error creating address:', error);
      res.status(500).json({ message: 'Failed to create address' });
    }
  });

  // ============================================================================
  // ADMIN STATS ENDPOINTS
  // ============================================================================
  
  app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      const allProducts = await storage.getProducts();
      const allCustomers = await storage.getAllCustomers();
      
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;
      
      const stats = {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        totalOrders: allOrders.length,
        totalProducts: allProducts.length,
        totalCustomers: allCustomers.filter(customer => !customer.isAdmin && !customer.isEmployee).length,
        pendingOrders: allOrders.filter(order => order.status === 'pending').length,
        processingOrders: allOrders.filter(order => order.status === 'processing').length,
        completedOrders: allOrders.filter(order => order.status === 'completed').length,
        cancelledOrders: allOrders.filter(order => order.status === 'cancelled').length,
        lowStockProducts: allProducts.filter(product => 
          product.stock !== null && product.stock < 10
        ).length
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getAllOrders();
      
      const ordersWithCustomerInfo = await Promise.all(
        orders.map(async (order) => {
          const user = await storage.getUser(order.userId);
          return {
            ...order,
            customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Unknown'
          };
        })
      );
      
      res.json(ordersWithCustomerInfo);
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // ============================================================================
  // PRODUCT MANAGEMENT ENDPOINTS
  // ============================================================================
  
  app.get('/api/products', async (req, res) => {
    try {
      const { categoryId } = req.query;
      const products = await storage.getProducts(categoryId ? parseInt(categoryId as string) : undefined);
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.get('/api/admin/products', requireAdmin, async (req: any, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error('Error fetching admin products:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // ============================================================================
  // CART MANAGEMENT ENDPOINTS
  // ============================================================================
  
  app.get('/api/cart', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ message: 'Failed to fetch cart' });
    }
  });

  app.post('/api/cart', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertCartItemSchema.parse({ ...req.body, userId });
      
      const existingItem = await storage.getCartItemByUserAndProduct(userId, validatedData.productId);
      
      if (existingItem) {
        const updatedItem = await storage.updateCartItem(userId, validatedData.productId, 
          existingItem.quantity + (validatedData.quantity || 1));
        res.json(updatedItem);
      } else {
        const cartItem = await storage.addToCart(validatedData);
        res.status(201).json(cartItem);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      res.status(500).json({ message: 'Failed to add to cart' });
    }
  });

  app.put('/api/cart/:productId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const { quantity } = req.body;
      
      const updatedItem = await storage.updateCartItem(userId, parseInt(productId), quantity);
      res.json(updatedItem);
    } catch (error) {
      console.error('Error updating cart item:', error);
      res.status(500).json({ message: 'Failed to update cart item' });
    }
  });

  app.delete('/api/cart/:productId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      
      await storage.removeFromCart(userId, parseInt(productId));
      res.json({ message: 'Item removed from cart' });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ message: 'Failed to remove from cart' });
    }
  });

  app.delete('/api/cart', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.clearCart(userId);
      res.json({ message: 'Cart cleared' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ message: 'Failed to clear cart' });
    }
  });

  // ============================================================================
  // ORDER MANAGEMENT ENDPOINTS
  // ============================================================================
  
  app.get('/api/orders', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await storage.getOrdersByUser(userId);
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/orders/:id', requireAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(parseInt(id));
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check if user owns this order or is admin/employee
      if (order.userId !== req.user.id && !req.user.isAdmin && !req.user.isEmployee) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  app.post('/api/orders', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { deliveryAddressId, orderType, deliveryDate, deliveryTimeSlot, deliveryNote } = req.body;
      
      const cartItems = await storage.getCartItems(userId);
      if (!cartItems.length) {
        return res.status(400).json({ message: 'Cart is empty' });
      }
      
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const orderData = {
        userId,
        total,
        status: 'pending',
        orderType: orderType || 'delivery',
        deliveryAddressId: deliveryAddressId || null,
        deliveryDate: deliveryDate || null,
        deliveryTimeSlot: deliveryTimeSlot || null,
        deliveryNote: deliveryNote || null,
        deliveryFee: orderType === 'delivery' && total < 500 ? 25 : 0,
      };
      
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }));
      
      const order = await storage.createOrder(orderData, orderItems);
      await storage.clearCart(userId);
      
      res.status(201).json(order);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  app.patch('/api/orders/:id/status', requireEmployeeOrAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const updatedOrder = await storage.updateOrderStatus(parseInt(id), status);
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  app.post('/api/orders/:id/complete', requireEmployeeOrAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { paymentMethod, checkNumber, paymentNotes } = req.body;
      
      const completedOrder = await storage.completeOrderWithPayment(parseInt(id), {
        paymentMethod,
        checkNumber,
        paymentNotes
      });
      
      res.json(completedOrder);
    } catch (error) {
      console.error('Error completing order:', error);
      res.status(500).json({ message: 'Failed to complete order' });
    }
  });

  // ============================================================================
  // ACTIVITY LOGS ENDPOINT
  // ============================================================================
  
  app.get('/api/activity-logs', requireEmployeeOrAdmin, async (req: any, res) => {
    try {
      const logs = await storage.getActivityLogs(100);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  // ============================================================================
  // CATEGORIES ENDPOINTS
  // ============================================================================
  
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // ============================================================================
  // CUSTOMER STATISTICS ENDPOINT
  // ============================================================================
  
  app.get('/api/customer/statistics', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await storage.getOrdersByUserId(userId);
      
      if (!orders || orders.length === 0) {
        return res.json(null);
      }
      
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
      const pendingOrders = orders.filter(o => ['pending', 'processing', 'ready', 'out-for-delivery'].includes(o.status)).length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalSpent / totalOrders;
      
      const sortedOrders = orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastOrderDate = sortedOrders[0]?.createdAt || null;
      
      // Calculate favorite products
      const productCounts = new Map();
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach((item: any) => {
            const key = item.productName || item.name;
            productCounts.set(key, (productCounts.get(key) || 0) + (item.quantity || 1));
          });
        }
      });
      
      const favoriteProducts = Array.from(productCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, orderCount: count }));
      
      const user = await storage.getUser(userId);
      
      const statistics = {
        totalOrders,
        completedOrders,
        pendingOrders,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        lastOrderDate,
        favoriteProducts,
        customerLevel: user?.customerLevel || 1,
        monthlySpending: {
          current: totalSpent,
          previous: 0
        }
      };
      
      res.json(statistics);
    } catch (error) {
      console.error('Error fetching customer statistics:', error);
      res.status(500).json({ message: 'Failed to fetch customer statistics' });
    }
  });

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}