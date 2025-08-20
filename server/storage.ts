import {
  users, products, categories, cartItems, orders, orderItems, deliveryAddresses, activityLogs,
  purchaseOrders, purchaseOrderItems, productPricingHistory, orderSettings, orderNotes, customerPriceMemory,
  excelExports, customerCreditAccounts, invoicePayments, creditTransactions, notificationSettings,
  pushNotificationSettings, deviceTokens, pushNotificationLogs, smsNotificationLogs, emailNotificationLogs,
  notificationTemplates, aiInvoiceProcessing, aiProductSuggestions, accountRequests, receipts,
  loyaltyTransactions, emailCampaigns, emailCampaignRecipients, flatTaxes, ilTp1TobaccoSales, taxCalculationAudits,
  posTransactions, posTransactionItems, posHeldTransactions, posSettings, posAuditLogs, passwordResetTokens,
  type User, type UpsertUser, type Product, type InsertProduct,
  type Category, type InsertCategory, type CartItem, type InsertCartItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type DeliveryAddress, type InsertDeliveryAddress, type ActivityLog, type InsertActivityLog,
  type PurchaseOrder, type InsertPurchaseOrder, type PurchaseOrderItem, type InsertPurchaseOrderItem,
  type ProductPricingHistory, type InsertProductPricingHistory, type OrderSettings, type InsertOrderSettings,
  type CustomerPriceMemory, type InsertCustomerPriceMemory, insertCustomerPriceMemorySchema,
  type ExcelExport, type InsertExcelExport,
  type CustomerCreditAccount, type InsertCustomerCreditAccount,
  type InvoicePayment, type InsertInvoicePayment,
  type CreditTransaction, type InsertCreditTransaction,
  type SmsNotificationLog, type InsertSmsNotificationLog,
  type EmailNotificationLog, type InsertEmailNotificationLog,
  type NotificationTemplate, type InsertNotificationTemplate,

  type AiInvoiceProcessing, type InsertAiInvoiceProcessing,
  type AiProductSuggestion, type InsertAiProductSuggestion,
  type AccountRequest, type InsertAccountRequest,
  type Receipt, type InsertReceipt,
  type EmailCampaign, type InsertEmailCampaign,
  type EmailCampaignRecipient, type InsertEmailCampaignRecipient,
  type FlatTax, type InsertFlatTax,
  type IlTp1TobaccoSale, type InsertIlTp1TobaccoSale,
  type TaxCalculationAudit, type InsertTaxCalculationAudit,
  trustedDevices, type TrustedDevice, type InsertTrustedDevice
} from "../shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, sql, not, or, count, sum, lt, gte, inArray, ilike, gt, isNotNull, asc, lte, isNull } from "drizzle-orm";
import bcrypt from 'bcrypt';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsers(): Promise<User[]>;
  getAllCustomers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createCustomerUser(userData: UpsertUser & { password: string }): Promise<User>;
  updateUser(userData: Partial<UpsertUser> & { id: string, password?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;
  authenticateCustomer(username: string, password: string): Promise<User | undefined>;
  authenticateUser(username: string, password: string): Promise<User | undefined>;
  
  // Password reset token operations
  createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  getValidPasswordResetByHash(tokenHash: string): Promise<{ user_id: string } | undefined>;
  markPasswordResetUsed(tokenHash: string): Promise<void>;
  invalidateOtherResetTokensForUser?(userId: string, currentTokenHash: string): Promise<void>;
  getUserByActiveResetToken(tokenHash: string): Promise<User | undefined>;

  // Delivery address operations
  getDeliveryAddresses(userId: string): Promise<DeliveryAddress[]>;
  getDeliveryAddress(id: number): Promise<DeliveryAddress | undefined>;
  createDeliveryAddress(address: InsertDeliveryAddress): Promise<DeliveryAddress>;
  updateDeliveryAddress(id: number, addressData: Partial<InsertDeliveryAddress>): Promise<DeliveryAddress | undefined>;
  deleteDeliveryAddress(id: number): Promise<void>;
  setDefaultDeliveryAddress(userId: string, addressId: number): Promise<void>;
  unsetDefaultDeliveryAddress(userId: string): Promise<void>;

  // Category operations
  getCategories(): Promise<Category[]>;
  getVisibleCategories(): Promise<Category[]>; // Only categories visible to customers
  getVisibleCategoriesForLevel(customerLevel?: number): Promise<Category[]>; // Categories visible to specific customer level
  getDraftCategories(): Promise<Category[]>; // Only categories in draft mode
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;

  // Product operations
  getProducts(categoryId?: number): Promise<Product[]>;
  getVisibleProducts(categoryId?: number): Promise<Product[]>; // Only products visible to customers
  getDraftProducts(categoryId?: number): Promise<Product[]>; // Only products in draft mode
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  updateProductStock(id: number, quantity: number): Promise<void>;

  // Cart operations
  getCartItems(userId: string): Promise<any[]>;
  getCartItemByUserAndProduct(userId: string, productId: number): Promise<CartItem | undefined>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(userId: string, productId: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(userId: string, productId: number): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Order operations
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrdersByUser(userId: string): Promise<any[]>;
  getAllOrders(): Promise<any[]>;
  getOrderById(id: number): Promise<any | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined>;
  completeOrderWithPayment(id: number, paymentData: { paymentMethod: string; checkNumber?: string; paymentNotes?: string; }): Promise<Order | undefined>;
  updateOrderItem(itemId: number, itemData: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  recalculateOrderTotal(orderId: number): Promise<Order | undefined>;
  addOrderNote(orderId: number, noteData: { note: string; addedBy: string; notifyCustomer: boolean; createdAt: Date }): Promise<any>;
  getOrderNotes(orderId: number): Promise<any[]>;
  addOrderItem(orderId: number, itemData: InsertOrderItem): Promise<OrderItem | undefined>;
  getOrderItemById(itemId: number): Promise<OrderItem | undefined>;
  deleteOrderItem(itemId: number): Promise<boolean>;
  updateOrderDeliveryFee(orderId: number, deliveryFee: number): Promise<Order | undefined>;
  deleteOrder(orderId: number): Promise<boolean>;
  getFrequentlyOrderedProducts(userId: string, limit: number): Promise<Product[]>;
  getPopularProducts(limit: number): Promise<Product[]>;

  // Activity log operations
  addActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  logActivity(userId: string, username: string, action: string, details: string, targetType?: string | null, targetId?: string | null, ipAddress?: string, location?: string): Promise<void>;
  updateUserLastLogin(userId: string): Promise<void>;

  // Notification logging operations
  logNotificationAttempt(data: {
    userId: string;
    type: 'sms' | 'email';
    recipient: string;
    message: string;
    status: 'success' | 'failed';
    errorMessage?: string;
    orderId?: number;
  }): Promise<void>;
  getNotificationLogs(limit?: number): Promise<any[]>;

  // Order settings operations
  getOrderSettings(): Promise<OrderSettings | undefined>;
  updateOrderSettings(settings: Partial<InsertOrderSettings>): Promise<OrderSettings | undefined>;
  getActivityLogsByUser(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Barcode search operations
  searchProductsByBarcode(barcode: string): Promise<Product[]>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  searchSimilarProducts(searchTerm: string): Promise<Product[]>;

  // Purchase order operations
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderById(id: number): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(purchaseOrder: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrderStatus(id: number, status: string, receivedBy: string): Promise<void>;
  createPurchaseOrderItem(item: InsertPurchaseOrderItem): Promise<PurchaseOrderItem>;
  updatePurchaseOrderItemReceived(id: number, quantityReceived: number): Promise<void>;

  // AI-suggested items for purchase orders
  getAISuggestedItemsForPurchaseOrder(purchaseOrderId: number): Promise<any[]>;
  removeAISuggestedItemsForPurchaseOrder(purchaseOrderId: number, approvedItems: any[]): Promise<void>;
  addItemToPurchaseOrder(purchaseOrderId: number, productId: number, quantity: number, unitCost: number, productName: string): Promise<void>;
  storeAIPurchaseOrderSuggestions(purchaseOrderId: number, suggestions: any[]): Promise<void>;
  getAIPurchaseOrderSuggestions(purchaseOrderId: number): Promise<any[]>;
  getProductPricingHistory(productId: number): Promise<ProductPricingHistory[]>;
  addPricingHistory(history: InsertProductPricingHistory): Promise<ProductPricingHistory>;
  updateProductCostAndPrice(productId: number, cost: number, price: number, purchaseOrderId?: number): Promise<void>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;

  // Bulk operations
  bulkUpdateProductPrices(productIds: number[], value: number, isPercentage: boolean): Promise<void>;
  bulkUpdateProductStock(productIds: number[], stock: number): Promise<void>;
  bulkUpdateProductStatus(productIds: number[], isDraft: boolean): Promise<void>;
  bulkUpdateProductCategory(productIds: number[], categoryId: number): Promise<void>;
  bulkApplyFlatTax(productIds: number[], flatTaxId: string): Promise<void>;
  bulkRemoveFlatTax(productIds: number[], flatTaxId: string): Promise<void>;
  bulkRemoveAllFlatTaxes(productIds: number[]): Promise<void>;
  bulkUpdateProductTaxPercentage(productIds: number[], taxPercentage: number): Promise<void>;
  getProductsWithFilters(filters: any): Promise<Product[]>;
  importProductsFromCsv(csvData: string, userId: string): Promise<any>;
  exportProductsToCsv(products: Product[]): Promise<string>;

  // Customer statistics operations
  getCustomerStatistics(userId: string): Promise<{ totalOrders: number; totalSpent: number; averageOrderValue: number; }>;

  // Customer search operations for bulk operations
  searchCustomers(searchTerm: string): Promise<User[]>;

  // SMS/Email notification settings (kept for communication preferences)
  getNotificationSettings(userId: string): Promise<any>;
  updateNotificationSettings(userId: string, settings: any): Promise<any>;
  createNotificationSettings(userId: string, settings: any): Promise<any>;
  createNotification(data: any): Promise<any>;
  deleteOrderNote(orderId: number, noteId: number): Promise<void>;

  // Push notification operations removed - using SMS/email only

  // Additional missing methods identified in audit  
  getCustomerOrders(userId: string): Promise<any[]>;
  removeCartItem(userId: string, productId: number): Promise<void>;
  getAdminStats(): Promise<any>;
  getSalesAnalytics(timeframe?: string): Promise<any>;
  getArchivedProducts(): Promise<Product[]>;
  clearAllCarts(): Promise<void>;
  // In-app notification read/delete methods removed
  completeOrder(orderId: number, paymentInfo?: any): Promise<any>;
  searchProducts(query: string): Promise<any[]>;
  getUserDeliveryAddresses(userId: string): Promise<any[]>;
  getRecentOrders(limit?: number): Promise<any[]>;

  // Customer price memory operations
  recordCustomerPriceMemory(data: InsertCustomerPriceMemory): Promise<CustomerPriceMemory>;
  getCustomerPriceHistory(customerId: string, productId: number): Promise<CustomerPriceMemory[]>;
  getCustomerLastPurchasePrice(customerId: string, productId: number): Promise<CustomerPriceMemory | undefined>;
  getManuallyEditedPrices(customerId: string): Promise<(CustomerPriceMemory & { product: Product })[]>;

  // AI Recommendation Tracking operations
  trackAIRecommendation(data: any): Promise<any>;
  updateAIRecommendationAction(trackingId: number, action: 'clicked' | 'added_to_cart' | 'purchased', orderId?: number): Promise<any>;
  getAIRecommendationStats(timeframe?: 'week' | 'month' | 'quarter'): Promise<any>;
  getAIRecommendationConversionRate(recommendationType?: string): Promise<any>;
  getTopPerformingAIRecommendations(limit?: number): Promise<any>;

  // Excel export operations  
  createExcelExport(data: InsertExcelExport): Promise<ExcelExport>;
  getExcelExports(): Promise<ExcelExport[]>;
  getExcelExportById(id: number): Promise<ExcelExport | undefined>;
  incrementExportDownloadCount(id: number): Promise<void>;
  getExpiredExcelExports(): Promise<ExcelExport[]>;
  deleteExcelExport(id: number): Promise<void>;

  // Missing user operations
  getUserById(id: string): Promise<User | undefined>;

  // Customer Credit Account Management
  getCustomerCreditAccount(customerId: string): Promise<CustomerCreditAccount | undefined>;
  createCustomerCreditAccount(data: InsertCustomerCreditAccount): Promise<CustomerCreditAccount>;
  updateCustomerCreditLimit(customerId: string, creditLimit: number): Promise<CustomerCreditAccount | undefined>;
  updateCustomerCreditBalance(customerId: string, balance: number): Promise<CustomerCreditAccount | undefined>;

  // Invoice Payment Management
  createInvoicePayment(data: InsertInvoicePayment): Promise<InvoicePayment>;
  getInvoicePaymentsByCustomer(customerId: string): Promise<InvoicePayment[]>;
  getUnpaidInvoicesByCustomer(customerId: string): Promise<InvoicePayment[]>;
  markInvoiceAsPaid(invoicePaymentId: number, paidBy: string, checkNumber?: string): Promise<void>;
  getAllOnAccountOrders(): Promise<any[]>;
  markInvoiceAsCompleted(invoiceId: number, paymentData: any): Promise<void>;

  // Credit Transaction Management
  createCreditTransaction(data: InsertCreditTransaction): Promise<CreditTransaction>;
  getCreditTransactionsByCustomer(customerId: string): Promise<CreditTransaction[]>;
  getAllCreditTransactions(): Promise<CreditTransaction[]>;
  getCustomerAccountBalance(customerId: string): Promise<number>;

  // Activity log operations
  addActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getRecentActivityLogs(limit?: number): Promise<ActivityLog[]>;

  // Draft Orders operations - for saving incomplete orders
  createDraftOrder(data: any): Promise<any>;
  getDraftOrders(customerId: string): Promise<any[]>;
  getDraftOrderById(id: number): Promise<any>;
  updateDraftOrder(id: number, data: any): Promise<any>;
  deleteDraftOrder(id: number): Promise<void>;
  addDraftOrderItem(draftOrderId: number, productId: number, quantity: number, price: number): Promise<any>;
  updateDraftOrderItem(itemId: number, quantity: number): Promise<any>;
  removeDraftOrderItem(itemId: number): Promise<void>;
  convertDraftToOrder(draftOrderId: number): Promise<any>;

  // Wishlist operations - for saving favorite products
  addToWishlist(customerId: string, productId: number, priceWhenAdded: number, notes?: string): Promise<any>;
  removeFromWishlist(customerId: string, productId: number): Promise<void>;
  getWishlist(customerId: string): Promise<any[]>;
  clearWishlist(customerId: string): Promise<void>;
  updateWishlistItemNotes(customerId: string, productId: number, notes: string): Promise<any>;

  // Order Templates operations - for saving recurring order patterns
  createOrderTemplate(data: any): Promise<any>;
  getOrderTemplates(customerId: string): Promise<any[]>;
  getOrderTemplateById(id: number): Promise<any>;
  updateOrderTemplate(id: number, data: any): Promise<any>;
  deleteOrderTemplate(id: number): Promise<void>;
  addOrderTemplateItem(templateId: number, productId: number, quantity: number): Promise<any>;
  updateOrderTemplateItem(itemId: number, quantity: number): Promise<any>;
  removeOrderTemplateItem(itemId: number): Promise<void>;
  useOrderTemplate(templateId: number): Promise<any>; // Increment use count and update last used

  // AI Suggestions operations - for caching AI-generated recommendations
  cacheAISuggestions(cacheKey: string, suggestionType: string, inputData: any, suggestions: any, expirationHours: number): Promise<any>;
  getAISuggestions(cacheKey: string): Promise<any>;
  clearExpiredAISuggestions(): Promise<void>;

  // AI Invoice Processing operations
  createAiInvoiceProcessing(data: any): Promise<any>;
  getAiInvoiceProcessing(id: number): Promise<any>;
  updateAiInvoiceProcessing(id: number, data: any): Promise<any>;
  createAiProductSuggestion(data: any): Promise<any>;
  getAiProductSuggestions(invoiceId: number): Promise<any[]>;
  getAllProducts(): Promise<Product[]>;
  getAllCategories(): Promise<Category[]>;
  addItemToPurchaseOrder(purchaseOrderId: number, itemData: any): Promise<any>;
  updateProductCost(productId: number, cost: number): Promise<any>;

  // Receipt Management
  logReceipt(data: { orderId: number; customerEmail: string; sentAt: Date; sentBy: string }): Promise<Receipt>;
  getReceiptByOrderId(orderId: number): Promise<Receipt | undefined>;
  getReceiptsByCustomer(customerEmail: string): Promise<Receipt[]>;
  getAllReceipts(): Promise<Receipt[]>;

  // Loyalty Points Operations
  awardLoyaltyPoints(userId: string, orderId: number, orderTotal: number, pointsRate?: number): Promise<void>;
  redeemLoyaltyPoints(userId: string, pointsToRedeem: number, orderId?: number, redeemedBy?: string): Promise<{ success: boolean; message: string; newBalance: number; }>;
  getUserLoyaltyPoints(userId: string): Promise<number>;
  getLoyaltyTransactions(userId: string): Promise<any[]>;
  getAllLoyaltyTransactions(): Promise<any[]>;
  addLoyaltyTransaction(transaction: any): Promise<void>;

  // Enhanced Order Operations for Receipt Generation
  getOrderWithItems(orderId: number): Promise<any>;
  getAllStaffAndAdminUsers(): Promise<User[]>;

  // Tax System Operations
  getFlatTaxes(): Promise<FlatTax[]>;
  getFlatTax(id: number): Promise<FlatTax | undefined>;
  createFlatTax(data: InsertFlatTax): Promise<FlatTax>;
  updateFlatTax(id: number, data: Partial<InsertFlatTax>): Promise<FlatTax | undefined>;
  deleteFlatTax(id: number): Promise<void>;
  
  // IL-TP1 Tobacco Sales Tracking
  createIlTp1TobaccoSale(data: InsertIlTp1TobaccoSale): Promise<IlTp1TobaccoSale>;
  getIlTp1TobaccoSales(dateRange?: { startDate: Date; endDate: Date }): Promise<IlTp1TobaccoSale[]>;
  
  // Tax Calculation Auditing
  createTaxCalculationAudit(data: InsertTaxCalculationAudit): Promise<TaxCalculationAudit>;
  getTaxCalculationAudits(orderId?: number): Promise<TaxCalculationAudit[]>;

  // Email Campaign Management
  createEmailCampaign(data: InsertEmailCampaign): Promise<EmailCampaign>;
  getEmailCampaigns(): Promise<EmailCampaign[]>;
  getEmailCampaignById(id: number): Promise<EmailCampaign | undefined>;
  updateEmailCampaign(id: number, data: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: number): Promise<void>;
  addCampaignRecipients(campaignId: number, userIds: string[]): Promise<void>;
  getCampaignRecipients(campaignId: number): Promise<any[]>;
  updateCampaignRecipientStatus(id: number, status: string, sentAt?: Date, failureReason?: string): Promise<void>;
  getAllCustomerEmails(): Promise<{ id: string; email: string; firstName: string; lastName: string; company: string; preferredLanguage: string; }[]>;
  getAllUserEmails(): Promise<{ id: string; email: string; firstName: string; lastName: string; company: string; preferredLanguage: string; }[]>;
  getAllUsersWithPurchaseHistory(): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    preferredLanguage: string;
    customerLevel: number;
    lastPurchaseDate: string | null;
    totalSpent: number;
    totalOrders: number;
    averageOrderValue: number;
    daysSinceLastPurchase: number | null;
    purchaseFrequency: string;
    mostBoughtCategory: string | null;
    lastOrderValue: number;
    registrationDate: string;
  }[]>;
  getCustomersWithPurchaseHistory(): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    preferredLanguage: string;
    customerLevel: number;
    lastPurchaseDate: string | null;
    totalSpent: number;
    totalOrders: number;
    averageOrderValue: number;
    daysSinceLastPurchase: number | null;
    purchaseFrequency: string;
    mostBoughtCategory: string | null;
    lastOrderValue: number;
    registrationDate: string;
  }[]>;
  startEmailCampaign(campaignId: number): Promise<void>;

  // Trusted Device Operations (POS 30-day device remembering)
  getTrustedDevice(userId: string, deviceFingerprint: string): Promise<TrustedDevice | undefined>;
  addTrustedDevice(data: InsertTrustedDevice): Promise<TrustedDevice>;
  removeTrustedDevice(userId: string, deviceFingerprint: string): Promise<void>;
  updateTrustedDeviceLastUsed(userId: string, deviceFingerprint: string): Promise<void>;
  getTrustedDevices(userId: string): Promise<TrustedDevice[]>;
  cleanupExpiredTrustedDevices(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Delivery address operations
  async getDeliveryAddresses(userId: string): Promise<DeliveryAddress[]> {
    return await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.userId, userId))
      .orderBy(desc(deliveryAddresses.isDefault), desc(deliveryAddresses.createdAt));
  }

  async getDeliveryAddressById(id: number): Promise<DeliveryAddress | undefined> {
    const [address] = await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, id));
    return address;
  }

  async createDeliveryAddress(address: InsertDeliveryAddress): Promise<DeliveryAddress> {
    // If this is the first address or marked as default, ensure it's the only default
    if (address.isDefault) {
      await db.update(deliveryAddresses)
        .set({ isDefault: false })
        .where(eq(deliveryAddresses.userId, address.userId));
    }

    const [newAddress] = await db.insert(deliveryAddresses)
      .values(address)
      .returning();

    return newAddress;
  }

  async updateDeliveryAddress(id: number, addressData: Partial<InsertDeliveryAddress>): Promise<DeliveryAddress | undefined> {
    // If updating to make this the default address
    if (addressData.isDefault) {
      const [currentAddress] = await db.select()
        .from(deliveryAddresses)
        .where(eq(deliveryAddresses.id, id));

      if (currentAddress) {
        await db.update(deliveryAddresses)
          .set({ isDefault: false })
          .where(eq(deliveryAddresses.userId, currentAddress.userId));
      }
    }

    const [updatedAddress] = await db.update(deliveryAddresses)
      .set({
        ...addressData,
        updatedAt: new Date()
      })
      .where(eq(deliveryAddresses.id, id))
      .returning();

    return updatedAddress;
  }

  async deleteDeliveryAddress(id: number): Promise<void> {
    // Check if this is the default address
    const [addressToDelete] = await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, id));

    await db.delete(deliveryAddresses)
      .where(eq(deliveryAddresses.id, id));

    // If this was the default address, make another address the default if possible
    if (addressToDelete && addressToDelete.isDefault) {
      const [nextAddress] = await db.select()
        .from(deliveryAddresses)
        .where(eq(deliveryAddresses.userId, addressToDelete.userId))
        .limit(1);

      if (nextAddress) {
        await db.update(deliveryAddresses)
          .set({ isDefault: true })
          .where(eq(deliveryAddresses.id, nextAddress.id));
      }
    }
  }

  async setDefaultDeliveryAddress(userId: string, addressId: number): Promise<void> {
    // First, set all addresses for this user to non-default
    await db.update(deliveryAddresses)
      .set({ isDefault: false })
      .where(eq(deliveryAddresses.userId, userId));

    // Then, set the specified address as default
    await db.update(deliveryAddresses)
      .set({ isDefault: true })
      .where(eq(deliveryAddresses.id, addressId));
  }

  async getDeliveryAddress(id: number): Promise<DeliveryAddress | undefined> {
    const [address] = await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.id, id));
    return address;
  }

  async unsetDefaultDeliveryAddress(userId: string): Promise<void> {
    await db.update(deliveryAddresses)
      .set({ isDefault: false })
      .where(eq(deliveryAddresses.userId, userId));
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (user) {
      // Combine address fields for frontend compatibility  
      const addressParts = [user.addressLine1, user.addressLine2].filter(part => part && part.trim() !== '');
      const combinedAddress = addressParts.length > 0 ? addressParts.join(', ') : (user.address || '');
      


      // Return user with combined address field
      const userWithCombinedAddress = {
        ...user,
        address: combinedAddress
      };

      // Standardize user roles to ensure consistent field naming
      console.log(`User roles: isAdmin=${user.isAdmin}, isAdmin=${user.isAdmin}, isEmployee=${user.isEmployee}, isEmployee=${user.isEmployee}`);
      
      return userWithCombinedAddress;
    }

    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: any): Promise<User> {
    // Generate unique user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Hash password if provided
    let hashedPassword = null;
    if (userData.password) {
      // Use direct bcrypt import at top level to avoid module loading issues
      const bcrypt = await import('bcrypt');
      hashedPassword = await bcrypt.default.hash(userData.password, 10);
    }

    const newUser = {
      id: userId,
      username: userData.username,
      passwordHash: hashedPassword, // Use passwordHash field name
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      email: userData.email || null,
      company: userData.company || null,
      address: userData.address || null,
      phone: userData.phone || null,
      isAdmin: userData.isAdmin || false,
      isEmployee: userData.isEmployee || false,
      customerLevel: userData.customerLevel || 1,
      // Business details
      feinNumber: userData.fein || null,
      stateTaxId: userData.taxId || null,
      businessType: userData.businessType || null,
      addressLine1: userData.addressLine1 || null,
      addressLine2: userData.addressLine2 || null,
      city: userData.city || null,
      state: userData.state || null,
      postalCode: userData.postalCode || null,
      // SMS and notification preferences
      smsNotifications: userData.smsNotifications || false,
      smsConsentGiven: userData.smsConsentGiven || false,
      smsConsentDate: userData.smsConsentGiven ? new Date() : null,
      smsConsentMethod: userData.smsConsentGiven ? 'web_form' : null,
      smsConsentIpAddress: userData.smsConsentIpAddress || null,
      marketingSmsConsent: userData.marketingSmsConsent || false,
      transactionalSmsConsent: userData.transactionalSmsConsent || false,
      // Privacy policy acceptance
      privacyPolicyAccepted: userData.privacyPolicyAccepted || false,
      privacyPolicyAcceptedDate: userData.privacyPolicyAccepted ? new Date() : null,
      privacyPolicyVersion: userData.privacyPolicyAccepted ? '1.0' : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const [user] = await db
      .insert(users)
      .values(newUser)
      .returning();

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const users_list = await db.select().from(users).orderBy(desc(users.createdAt));
    
    // Combine address fields for each user for frontend compatibility
    return users_list.map(user => {
      const addressParts = [user.addressLine1, user.addressLine2].filter(part => part && part.trim() !== '');
      const combinedAddress = addressParts.length > 0 ? addressParts.join(', ') : (user.address || '');
      
      return {
        ...user,
        address: combinedAddress
      };
    });
  }

  async getUsers(): Promise<User[]> {
    return this.getAllUsers();
  }

  async getAllCustomers(): Promise<User[]> {
    const customersWithCredit = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      company: users.company,
      address: users.address,
      isAdmin: users.isAdmin,
      isEmployee: users.isEmployee,
      customerLevel: users.customerLevel,
      passwordHash: users.passwordHash,
      businessName: users.businessName,
      taxId: users.taxId,
      businessType: users.businessType,
      phone: users.phone,
      alternativeEmail: users.alternativeEmail,
      addressLine1: users.addressLine1,
      addressLine2: users.addressLine2,
      city: users.city,
      state: users.state,
      postalCode: users.postalCode,
      country: users.country,
      creditLimitRaw: customerCreditAccounts.creditLimit,
      currentBalanceRaw: customerCreditAccounts.currentBalance,
      paymentTerms: users.paymentTerms,
      taxExempt: users.taxExempt,
      taxExemptionNumber: users.taxExemptionNumber,
      notes: users.notes,
      customerSince: users.customerSince,
      preferredDeliveryDay: users.preferredDeliveryDay,
      preferredDeliveryTime: users.preferredDeliveryTime,
      email: users.email,
      lastLogin: users.lastLogin,
      feinNumber: users.feinNumber,
      stateTaxId: users.stateTaxId,
      tobaccoLicense: users.tobaccoLicense,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .leftJoin(customerCreditAccounts, eq(users.id, customerCreditAccounts.customerId))
    .where(
      and(
        eq(users.isAdmin, false),
        eq(users.isEmployee, false)
      )
    )
    .orderBy(desc(users.createdAt));

    // Convert credit values to numbers and ensure proper field names
    return customersWithCredit.map(customer => ({
      ...customer,
      creditLimit: customer.creditLimitRaw ? parseFloat(customer.creditLimitRaw.toString()) : 0,
      currentBalance: customer.currentBalanceRaw ? parseFloat(customer.currentBalanceRaw.toString()) : 0,
      // Remove the raw fields
      creditLimitRaw: undefined,
      currentBalanceRaw: undefined
    }));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);
      
      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Use SQL function LOWER to make username comparison case-insensitive
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    // Remove +1 prefix if present for matching
    const normalizedPhone = phone.replace(/^\+1/, '');
    const [user] = await db
      .select()
      .from(users)
      .where(or(
        eq(users.phone, phone),
        eq(users.phone, normalizedPhone),
        eq(users.phone, `+1${normalizedPhone}`)
      ));
    return user;
  }

  async createCustomerUser(userData: UpsertUser & { password: string }): Promise<User> {
    const { password, ...userInfo } = userData;

    // Use our bcrypt helper
    const { hashPassword } = await import('./helpers/bcrypt-helper');
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        ...userInfo,
        passwordHash,
      })
      .returning();

    return user;
  }

  async updateUser(userData: Partial<UpsertUser> & { id: string, password?: string }): Promise<User> {
    console.log('updateUser called with:', { id: userData.id, userData });
    console.log('userData type:', typeof userData);
    console.log('userData keys:', Object.keys(userData));

    const { id, password, ...updateData } = userData;

    // Handle password hashing if provided
    let passwordHash;
    if (password) {
      try {
        const { hashPassword } = await import('./helpers/bcrypt-helper');
        passwordHash = await hashPassword(password);
      } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Failed to process password');
      }
    }

    // Build the update object with explicit field mapping to prevent array index issues
    const updateFields: any = {
      updatedAt: new Date(),
    };

    // Explicitly map each field to prevent array index issues
    const validFields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'company', 
      'preferredLanguage', 'emailNotifications', 'smsNotifications', 
      'notificationTypes', 'businessName', 'taxId', 'businessType',
      'alternativeEmail', 'addressLine1', 'addressLine2', 'city', 'state',
      'postalCode', 'country', 'creditLimit', 'currentBalance', 'paymentTerms',
      'taxExempt', 'taxExemptionNumber', 'notes', 'preferredDeliveryDay',
      'preferredDeliveryTime', 'lastLogin', 'feinNumber', 'stateTaxId',
      'tobaccoLicense', 'customerLevel', 'isAdmin', 'isEmployee', 'profileImageUrl',
      'loyaltyPoints', // Added loyalty points field
      'promotionalEmails', // Added promotional emails field for marketing consent
      // SMS Consent and TCPA compliance fields
      'smsConsentGiven', 'smsConsentDate', 'smsConsentMethod', 'smsConsentIpAddress',
      'smsConsentUserAgent', 'smsConsentConfirmationText', 'smsConsentDuplicationVerified',
      'smsOptOutDate', 'smsOptOutMethod', 'smsOptOutIpAddress', 'marketingSmsConsent', 'transactionalSmsConsent',
      'privacyPolicyAccepted', 'privacyPolicyVersion', 'privacyPolicyAcceptedDate'
    ];

    validFields.forEach(field => {
      if (updateData.hasOwnProperty(field) && updateData[field] !== undefined) {
        // Special handling for email field to prevent duplicate empty string constraint violations
        if (field === 'email') {
          const emailValue = (updateData as any)[field];
          if (emailValue && typeof emailValue === 'string' && emailValue.trim() !== '') {
            // Valid email - use the trimmed value
            updateFields[field] = emailValue.trim();
          }
          // Empty email - skip field entirely to avoid unique constraint violations
        } else {
          updateFields[field] = (updateData as any)[field];
        }
      }
    });

    // Add password hash if provided
    if (passwordHash) {
      updateFields.passwordHash = passwordHash;
    }

    console.log('Final update fields:', Object.keys(updateFields));
    console.log('Update fields values:', updateFields);

    try {
      const [user] = await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, id))
        .returning();

      if (!user) {
        throw new Error('User not found or update failed');
      }

      return user;
    } catch (error) {
      console.error('Database update error:', error);
      throw new Error('Failed to update user profile');
    }
  }

  // Update user password separately
  async updateUserPassword(id: string, password: string): Promise<User> {
    console.log("[STORAGE] Updating password for user:", id);
    console.log("[STORAGE] New password length:", password.length);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("[STORAGE] Password hashed successfully");

    const [updatedUser] = await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (updatedUser) {
      console.log("[STORAGE] Password updated in database for user:", updatedUser.username);
    } else {
      console.log("[STORAGE] No user found with id:", id);
      throw new Error("User not found for password update");
    }

    return updatedUser;
  }

  // Password reset token operations
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    console.log("[STORAGE] Creating password reset token for user:", userId);
    await db.insert(passwordResetTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
    console.log("[STORAGE] Password reset token created successfully");
  }

  // Implementation for password reset token lookup
  async getUserByActiveResetToken(tokenHash: string): Promise<User | undefined> {
    // Find user with valid (non-expired) reset token
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.resetTokenHash),
          isNotNull(users.resetTokenExpiresAt),
          gt(users.resetTokenExpiresAt, new Date()),
          isNull(users.resetTokenUsedAt)
        )
      );
    
    if (user && user.resetTokenHash) {
      // Compare token hash using bcrypt
      const isValid = await bcrypt.compare(tokenHash, user.resetTokenHash);
      return isValid ? user : undefined;
    }
    
    return undefined;
  }

  async getValidPasswordResetByHash(tokenHash: string): Promise<{ user_id: string } | undefined> {
    console.log("[STORAGE] Looking for valid password reset token with hash:", tokenHash.substring(0, 10) + "...");
    const [record] = await db
      .select({ user_id: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      );
    
    if (record) {
      console.log("[STORAGE] Valid token found for user:", record.user_id);
    } else {
      console.log("[STORAGE] No valid token found");
    }
    
    return record;
  }

  async markPasswordResetUsed(tokenHash: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
  }

  async invalidateOtherResetTokensForUser(userId: string, currentTokenHash: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          not(eq(passwordResetTokens.tokenHash, currentTokenHash)),
          isNull(passwordResetTokens.usedAt)
        )
      );
  }

  // Category merge function - MISSING METHOD ADDED
  async mergeCategoriesAndUpdateProducts(sourceId: number, targetId: number): Promise<{ updatedProducts: number }> {
    try {
      // First verify both categories exist
      const sourceCategory = await this.getCategoryById(sourceId);
      const targetCategory = await this.getCategoryById(targetId);

      if (!sourceCategory) {
        throw new Error(`Source category ${sourceId} not found`);
      }
      if (!targetCategory) {
        throw new Error(`Target category ${targetId} not found`);
      }

      // Update all products from source category to target category
      const updateResult = await db
        .update(products)
        .set({ 
          categoryId: targetId,
          updatedAt: new Date()
        })
        .where(eq(products.categoryId, sourceId))
        .returning({ id: products.id });

      const updatedProductCount = updateResult.length;

      // Delete the source category after moving all products
      await this.deleteCategory(sourceId);

      return { updatedProducts: updatedProductCount };
    } catch (error) {
      console.error('Error merging categories:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    console.log(`Attempting to delete user: ${id}`);

    try {
      // Delete in this order to maintain referential integrity
      
      // 1. Delete POS-related data first (deepest dependencies)
      await db.delete(posAuditLogs).where(eq(posAuditLogs.userId, id));
      console.log(`Deleted POS audit logs for user ${id}`);
      
      await db.delete(posHeldTransactions).where(eq(posHeldTransactions.userId, id));
      console.log(`Deleted POS held transactions for user ${id}`);
      
      await db.delete(posHeldTransactions).where(eq(posHeldTransactions.customerId, id));
      console.log(`Deleted POS held transactions as customer for user ${id}`);
      
      await db.delete(posTransactions).where(eq(posTransactions.userId, id));
      console.log(`Deleted POS transactions for user ${id}`);
      
      await db.delete(posTransactions).where(eq(posTransactions.customerId, id));
      console.log(`Deleted POS transactions as customer for user ${id}`);

      // 2. Delete device tokens and push notification data
      await db.delete(deviceTokens).where(eq(deviceTokens.userId, id));
      console.log(`Deleted device tokens for user ${id}`);
      
      await db.delete(pushNotificationSettings).where(eq(pushNotificationSettings.userId, id));
      console.log(`Deleted push notification settings for user ${id}`);
      
      await db.delete(pushNotificationLogs).where(eq(pushNotificationLogs.userId, id));
      console.log(`Deleted push notification logs for user ${id}`);

      // 3. Notification queue removed with in-app notifications

      // 4. Delete customer price memory
      await db.delete(customerPriceMemory).where(eq(customerPriceMemory.customerId, id));
      console.log(`Deleted customer price memory for user ${id}`);

      // 5. Delete cart items
      await db.delete(cartItems).where(eq(cartItems.userId, id));
      console.log(`Deleted cart items for user ${id}`);

      // 6. Delete delivery addresses
      await db.delete(deliveryAddresses).where(eq(deliveryAddresses.userId, id));
      console.log(`Deleted delivery addresses for user ${id}`);

      // 7. Delete notification settings for the user
      await db.delete(notificationSettings).where(eq(notificationSettings.userId, id));
      console.log(`Deleted notification settings for user ${id}`);

      // 8. Delete activity logs where this user is the target or actor
      await db.delete(activityLogs).where(eq(activityLogs.targetId, id));
      console.log(`Deleted activity logs targeting user ${id}`);
      
      await db.delete(activityLogs).where(eq(activityLogs.userId, id));
      console.log(`Deleted activity logs by user ${id}`);

      // 9. Delete loyalty transactions for this user
      await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.userId, id));
      console.log(`Deleted loyalty transactions for user ${id}`);

      // 10. Check if user has any orders and delete them with all related data
      const userOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.userId, id));

      if (userOrders.length > 0) {
        console.log(`Found ${userOrders.length} orders for user ${id}`);

        // Delete order items for all user orders
        for (const order of userOrders) {
          await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
          console.log(`Deleted items for order #${order.id}`);
        }

        // Delete the orders themselves
        await db.delete(orders).where(eq(orders.userId, id));
        console.log(`Deleted all orders for user ${id}`);
      }

      // 11. Update any POS settings that reference this user (set to null instead of delete)
      await db.update(posSettings).set({ updatedBy: null }).where(eq(posSettings.updatedBy, id));
      console.log(`Updated POS settings references for user ${id}`);

      // 12. Finally delete the user
      await db.delete(users).where(eq(users.id, id));
      console.log(`User ${id} successfully deleted`);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error; // Rethrow to handle in the route
    }
  }

  async authenticateCustomer(username: string, password: string): Promise<User | undefined> {
    console.log("Looking up user:", username);

    // SECURITY FIX: Removed hardcoded admin password bypass - all users must use proper password authentication

    // Make username comparison case-insensitive
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);

    if (!user) {
      console.log("User not found:", username);
      // Throw specific error for user not found
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.passwordHash) {
      console.log("User has no password hash:", username);
      // Throw specific error for missing password
      throw new Error('NO_PASSWORD_SET');
    }

    console.log("Comparing password for user:", username);
    console.log("Password hash format:", user.passwordHash ? user.passwordHash.substring(0, 10) + '...' : 'null');

    // Enhanced password validation with fallback for legacy passwords
    let isPasswordValid = false;

    try {
      // First try bcrypt comparison
      const { comparePassword } = await import('./helpers/bcrypt-helper');
      isPasswordValid = await comparePassword(password, user.passwordHash);
      console.log("Bcrypt comparison result:", isPasswordValid);

      // If bcrypt fails, check for plain text password (legacy support)
      if (!isPasswordValid && user.passwordHash === password) {
        console.log("Plain text password match detected for:", username);
        isPasswordValid = true;

        // Upgrade to bcrypt hash
        try {
          const { hashPassword } = await import('./helpers/bcrypt-helper');
          const newHash = await hashPassword(password);
          await this.updateUserPassword(user.id, newHash);
          console.log("Password upgraded to bcrypt for:", username);
        } catch (upgradeError) {
          console.error("Failed to upgrade password:", upgradeError);
        }
      }
    } catch (bcryptError) {
      console.error("Bcrypt comparison error:", bcryptError);

      // Fallback to plain text comparison for legacy passwords
      if (user.passwordHash === password) {
        console.log("Legacy plain text password validated for:", username);
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      console.log("Password invalid for user:", username);
      // Throw specific error for incorrect password
      throw new Error('INCORRECT_PASSWORD');
    }

    console.log("Authentication successful for user:", username);

    console.log(`User roles: isAdmin=${user.isAdmin}, isEmployee=${user.isEmployee}`);

    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | undefined> {
    // This method is identical to authenticateCustomer but named differently for API consistency
    return this.authenticateCustomer(username, password);
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getVisibleCategories(): Promise<Category[]> {
    return await db.select().from(categories)
      .where(and(eq(categories.isVisible, true), eq(categories.isDraft, false)));
  }

  async getVisibleCategoriesForLevel(customerLevel?: number): Promise<Category[]> {
    const allVisibleCategories = await this.getVisibleCategories();
    
    // If no customer level is provided, return all visible categories
    if (!customerLevel) {
      return allVisibleCategories;
    }
    
    // Filter categories based on customer level visibility
    return allVisibleCategories.filter(category => {
      // If visibleToLevels is empty, category is visible to all levels
      if (!category.visibleToLevels || category.visibleToLevels.length === 0) {
        return true;
      }
      
      // Check if customer level is in the visible levels array
      return category.visibleToLevels.includes(customerLevel.toString());
    });
  }

  async getDraftCategories(): Promise<Category[]> {
    return await db.select().from(categories)
      .where(eq(categories.isDraft, true));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product operations
  async getProducts(categoryId?: number): Promise<Product[]> {
    // Check if the products table exists and has the expected columns
    try {
      let query;
      if (categoryId) {
        query = db.select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          cost: products.cost,
          basePrice: products.basePrice,
          price1: products.price1,
          price2: products.price2,
          price3: products.price3,
          price4: products.price4,
          price5: products.price5,
          imageUrl: products.imageUrl,
          additionalImages: products.additionalImages,
          upcCode: products.upcCode,
          sku: products.sku,
          size: products.size,
          weight: products.weight,
          dimensions: products.dimensions,
          brand: products.brand,
          featured: products.featured,
          discount: products.discount,
          stock: products.stock,
          minOrderQuantity: products.minOrderQuantity,
          categoryId: products.categoryId,
          archived: products.archived,
          taxPercentage: products.taxPercentage,
          flatTaxIds: products.flatTaxIds,
          isDraft: products.isDraft,
          isVisible: products.isVisible,
          createdBy: products.createdBy,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          createdByUsername: users.username
        })
          .from(products)
          .leftJoin(users, eq(products.createdBy, users.username))
          .where(eq(products.categoryId, categoryId));
      } else {
        query = db.select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          cost: products.cost,
          basePrice: products.basePrice,
          price1: products.price1,
          price2: products.price2,
          price3: products.price3,
          price4: products.price4,
          price5: products.price5,
          imageUrl: products.imageUrl,
          additionalImages: products.additionalImages,
          upcCode: products.upcCode,
          sku: products.sku,
          size: products.size,
          weight: products.weight,
          dimensions: products.dimensions,
          brand: products.brand,
          featured: products.featured,
          discount: products.discount,
          stock: products.stock,
          minOrderQuantity: products.minOrderQuantity,
          categoryId: products.categoryId,
          archived: products.archived,
          taxPercentage: products.taxPercentage,
          flatTaxIds: products.flatTaxIds,
          isDraft: products.isDraft,
          isVisible: products.isVisible,
          createdBy: products.createdBy,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          createdByUsername: users.username
        })
          .from(products)
          .leftJoin(users, eq(products.createdBy, users.username));
      }

      const result = await query;
      return result.map(row => ({
        ...row,
        createdByUsername: row.createdByUsername || row.createdBy || 'Unknown'
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  }

  async getVisibleProducts(categoryId?: number): Promise<Product[]> {
    try {
      let query = db.select().from(products)
        .leftJoin(users, eq(products.createdBy, users.username))
        .where(and(eq(products.isVisible, true), eq(products.isDraft, false)));
      
      if (categoryId) {
        query = query.where(and(
          eq(products.isVisible, true), 
          eq(products.isDraft, false),
          eq(products.categoryId, categoryId)
        ));
      }
      
      const result = await query;
      return result.map(row => ({
        ...row.products,
        createdByUsername: row.users?.username || row.products.createdBy || 'Unknown'
      }));
    } catch (error) {
      console.error("Error fetching visible products:", error);
      return [];
    }
  }

  async getDraftProducts(categoryId?: number): Promise<Product[]> {
    try {
      let query = db.select().from(products)
        .leftJoin(users, eq(products.createdBy, users.username))
        .where(eq(products.isDraft, true));
      
      if (categoryId) {
        query = query.where(and(
          eq(products.isDraft, true),
          eq(products.categoryId, categoryId)
        ));
      }
      
      const result = await query;
      return result.map(row => ({
        ...row.products,
        createdByUsername: row.users?.username || row.products.createdBy || 'Unknown'
      }));
    } catch (error) {
      console.error("Error fetching draft products:", error);
      return [];
    }
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  // Special function to update product price correctly 
  async updateProductPrice(id: number, newPrice: number): Promise<boolean> {
    try {
      // Direct SQL query using the pool to ensure both price fields are updated consistently
      await pool.query(`
        UPDATE products 
        SET price = $1, 
            price_level_1 = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [newPrice, id]);

      console.log(`Successfully updated both price and price_level_1 for product ${id} to ${newPrice}`);
      return true;
    } catch (error) {
      console.error(`Failed to update product price: ${error}`);
      return false;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      // Check if product exists first
      const existingProduct = await this.getProductById(id);
      if (!existingProduct) {
        console.log(`Product with ID ${id} not found for update`);
        return undefined;
      }

      console.log(`[STORAGE DEBUG] Updating product ${id} with data:`, productData);
      console.log(`[STORAGE DEBUG] productData keys:`, Object.keys(productData));
      console.log(`[STORAGE DEBUG] productData.flatTaxIds type:`, typeof productData.flatTaxIds, 'value:', productData.flatTaxIds);
      console.log(`[STORAGE DEBUG] productData.taxPercentage type:`, typeof productData.taxPercentage, 'value:', productData.taxPercentage);
      console.log(`[STORAGE DEBUG] Existing product cost: ${existingProduct.cost}, basePrice: ${existingProduct.basePrice}`);

      // Sanitize data to prevent type issues
      const cleanData: Record<string, any> = {};

      // Only include fields that actually exist
      if (typeof productData.name === 'string') cleanData.name = productData.name;
      if (typeof productData.description === 'string') cleanData.description = productData.description;

      // Handle price fields - ensure proper number conversion with safety check
      if (productData.price !== undefined) {
        const priceValue = parseFloat(String(productData.price));
        cleanData.price = isNaN(priceValue) ? 0 : priceValue;

        // Explicitly update priceLevel1 field to match price for product listing display
        cleanData.priceLevel1 = cleanData.price;
        console.log(`Setting priceLevel1 to match price: ${cleanData.price}`);
      }

      // Also update price1 field if it was provided (for backward compatibility)
      if (productData.price1 !== undefined) {
        const price1Value = parseFloat(String(productData.price1));
        const safeValue = isNaN(price1Value) ? 0 : price1Value;

        // Update both fields to ensure consistency
        cleanData.price1 = safeValue;
        cleanData.priceLevel1 = safeValue;
      }

      if (productData.stock !== undefined) {
        const stockValue = parseInt(String(productData.stock), 10);
        cleanData.stock = isNaN(stockValue) ? 0 : stockValue;
      }

      // Handle cost and basePrice fields
      if (productData.cost !== undefined) {
        const costValue = parseFloat(String(productData.cost));
        cleanData.cost = isNaN(costValue) ? 0 : costValue;
        console.log(`Setting cost to: ${cleanData.cost}`);
      }

      if (productData.basePrice !== undefined) {
        const basePriceValue = parseFloat(String(productData.basePrice));
        cleanData.basePrice = isNaN(basePriceValue) ? 0 : basePriceValue;
        console.log(`Setting basePrice to: ${cleanData.basePrice}`);
      }

      // Handle tier pricing fields
      if (productData.price2 !== undefined) {
        const price2Value = parseFloat(String(productData.price2));
        cleanData.price2 = isNaN(price2Value) ? 0 : price2Value;
      }

      if (productData.price3 !== undefined) {
        const price3Value = parseFloat(String(productData.price3));
        cleanData.price3 = isNaN(price3Value) ? 0 : price3Value;
      }

      if (productData.price4 !== undefined) {
        const price4Value = parseFloat(String(productData.price4));
        cleanData.price4 = isNaN(price4Value) ? 0 : price4Value;
      }

      if (productData.price5 !== undefined) {
        const price5Value = parseFloat(String(productData.price5));
        cleanData.price5 = isNaN(price5Value) ? 0 : price5Value;
      }

      if (productData.imageUrl !== undefined) cleanData.imageUrl = productData.imageUrl;
      if (productData.categoryId !== undefined) {
        // Handle categoryId conversion more safely
        const categoryIdValue = productData.categoryId;
        if (categoryIdValue === null || categoryIdValue === '' || categoryIdValue === undefined) {
          cleanData.categoryId = null;
        } else {
          const parsedCategoryId = parseInt(String(categoryIdValue), 10);
          cleanData.categoryId = isNaN(parsedCategoryId) ? null : parsedCategoryId;
        }
      }
      if (productData.sku !== undefined) cleanData.sku = productData.sku;

      // Handle flat tax IDs - convert to proper PostgreSQL text array format
      if (productData.flatTaxIds !== undefined) {
        // Ensure it's a clean array of strings
        const flatTaxArray = Array.isArray(productData.flatTaxIds) ? productData.flatTaxIds : [];
        const cleanTaxIds = flatTaxArray.filter(id => id && id !== 'undefined');
        
        // Store as PostgreSQL text array format (array of strings)
        cleanData.flatTaxIds = cleanTaxIds;
        console.log(`Setting flatTaxIds to PostgreSQL array:`, cleanData.flatTaxIds, `(from routes:`, productData.flatTaxIds, `)`);
      }

      // Handle other boolean/special fields
      if (productData.featured !== undefined) cleanData.featured = productData.featured;
      if (productData.taxPercentage !== undefined) {
        const taxValue = parseFloat(String(productData.taxPercentage));
        cleanData.taxPercentage = isNaN(taxValue) ? 0 : taxValue;
      }
      if (productData.isDraft !== undefined) cleanData.isDraft = productData.isDraft;
      if (productData.isVisible !== undefined) cleanData.isVisible = productData.isVisible;

      // Add updated timestamp
      cleanData.updatedAt = new Date();

      console.log(`[STORAGE DEBUG] cleanData after processing:`, cleanData);
      console.log(`[STORAGE DEBUG] cleanData keys:`, Object.keys(cleanData));
      console.log(`[STORAGE DEBUG] cleanData length:`, Object.keys(cleanData).length);

      // Special handling for just updating the name (most critical field)
      // Only use this path if ONLY name and updatedAt are being changed
      const nameOnlyUpdate = cleanData.name && Object.keys(cleanData).length === 2 && cleanData.updatedAt;
      console.log(`[STORAGE DEBUG] nameOnlyUpdate check:`, nameOnlyUpdate);
      if (nameOnlyUpdate) {
        try {
          // Using raw SQL for simple name update
          const result = await db.execute(
            sql`UPDATE products SET name = ${cleanData.name}, updated_at = NOW() WHERE id = ${id} RETURNING *`
          );

          if ((result.rowCount || 0) > 0) {
            console.log("Product name updated successfully");
            // Return fresh data from database to reflect changes
            const updatedProduct = await this.getProductById(id);
            return updatedProduct;
          }
        } catch (nameError) {
          console.error("Error updating product name:", nameError);
        }
      }

      // Use the main drizzle update for other fields
      if (Object.keys(cleanData).length > 0) {
        try {
          console.log(`Attempting Drizzle update with cleanData:`, cleanData);
          console.log(`Number of fields to update: ${Object.keys(cleanData).length}`);

          const [updated] = await db
            .update(products)
            .set(cleanData)
            .where(eq(products.id, id))
            .returning();

          console.log(`Drizzle update result:`, updated ? 'Success' : 'No result returned');
          if (updated) {
            console.log(`Updated fields - cost: ${updated.cost}, basePrice: ${updated.basePrice}, flatTaxIds: ${JSON.stringify(updated.flatTaxIds)}`);
          }

          return updated;
        } catch (updateError) {
          console.error("Error updating product:", updateError);

          // If main update fails, try one last approach
          const currentProduct = await this.getProductById(id);
          if (currentProduct) {
            console.log("Using product update fallback");

            // Update just the name if that's all we need to do
            if (cleanData.name) {
              try {
                await db.execute(
                  sql`UPDATE products SET name = ${cleanData.name} WHERE id = ${id}`
                );
                console.log("Name updated via fallback SQL");
              } catch (nameError) {
                console.error("Even name update fallback failed:", nameError);
              }
            }

            // Return fresh product data to reflect any changes
            const updatedProduct = await this.getProductById(id);
            return updatedProduct;
          }
        }
      }

      // If we get here, return the existing product
      return existingProduct;
    } catch (error) {
      console.error(`Product update error:`, error);
      return undefined;
    }
  }

  async deleteProduct(id: number): Promise<void> {
    try {
      // First try to check if it's in any cart
      try {
        const [cartItem] = await db
          .select()
          .from(cartItems)
          .where(eq(cartItems.productId, id))
          .limit(1);

        if (cartItem) {
          throw new Error("Cannot delete product that is in a cart");
        }
      } catch (cartError) {
        console.warn("Cart check failed but continuing with deletion:", cartError);
        // Continue with deletion even if cart check fails
      }

      // Then try to check if it's in any order
      try {
        const [orderItem] = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.productId, id))
          .limit(1);

        if (orderItem) {
          throw new Error("Cannot delete product that has been ordered");
        }
      } catch (orderError) {
        console.warn("Order check failed but continuing with deletion:", orderError);
        // Continue with deletion even if order check fails
      }

      // If we got here, delete the product
      await db.delete(products).where(eq(products.id, id));
      console.log(`Product ${id} deleted successfully`);
    } catch (error) {
      console.error("Error during product deletion process:", error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  async updateProductStock(id: number, quantity: number): Promise<void> {
    await db
      .update(products)
      .set({ 
        stock: sql`${products.stock} + ${quantity}`,
        updatedAt: new Date()
      })
      .where(eq(products.id, id));
  }

  // Bulk operations
  async bulkUpdateProductPrices(productIds: number[], value: number, isPercentage: boolean): Promise<void> {
    try {
      if (isPercentage) {
        // Apply percentage change
        await db.execute(sql`
          UPDATE products 
          SET 
            price = price * (1 + ${value / 100}),
            price1 = price1 * (1 + ${value / 100}),
            price_level1 = price_level1 * (1 + ${value / 100}),
            price2 = price2 * (1 + ${value / 100}),
            price3 = price3 * (1 + ${value / 100}),
            price4 = price4 * (1 + ${value / 100}),
            price5 = price5 * (1 + ${value / 100}),
            updated_at = NOW()
          WHERE id = ANY(${productIds})
        `);
      } else {
        // Set fixed price
        await db.execute(sql`
          UPDATE products 
          SET 
            price = ${value},
            price1 = ${value},
            price_level1 = ${value},
            updated_at = NOW()
          WHERE id = ANY(${productIds})
        `);
      }
    } catch (error) {
      console.error('Error bulk updating product prices:', error);
      throw error;
    }
  }

  async bulkUpdateProductStock(productIds: number[], stock: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE products 
        SET 
          stock = ${stock},
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk updating product stock:', error);
      throw error;
    }
  }

  async bulkUpdateProductStatus(productIds: number[], isDraft: boolean): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE products 
        SET 
          is_draft = ${isDraft},
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk updating product status:', error);
      throw error;
    }
  }

  async bulkUpdateProductCategory(productIds: number[], categoryId: number): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE products 
        SET 
          category_id = ${categoryId},
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk updating product category:', error);
      throw error;
    }
  }

  async bulkApplyFlatTax(productIds: number[], flatTaxId: string): Promise<void> {
    try {
      // For each product, add the flat tax ID to the flatTaxIds array if not already present
      await db.execute(sql`
        UPDATE products 
        SET 
          flat_tax_ids = CASE 
            WHEN flat_tax_ids IS NULL THEN ARRAY[${flatTaxId}]
            WHEN NOT (${flatTaxId} = ANY(flat_tax_ids)) THEN array_append(flat_tax_ids, ${flatTaxId})
            ELSE flat_tax_ids
          END,
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk applying flat tax:', error);
      throw error;
    }
  }

  async bulkRemoveFlatTax(productIds: number[], flatTaxId: string): Promise<void> {
    try {
      // Remove the specific flat tax ID from the flatTaxIds array
      await db.execute(sql`
        UPDATE products 
        SET 
          flat_tax_ids = array_remove(flat_tax_ids, ${flatTaxId}),
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk removing flat tax:', error);
      throw error;
    }
  }

  async bulkRemoveAllFlatTaxes(productIds: number[]): Promise<void> {
    try {
      // Clear all flat tax IDs from the products
      await db.execute(sql`
        UPDATE products 
        SET 
          flat_tax_ids = NULL,
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk removing all flat taxes:', error);
      throw error;
    }
  }

  async bulkUpdateProductTaxPercentage(productIds: number[], taxPercentage: number): Promise<void> {
    try {
      // Update the tax_percentage field for all selected products
      // This is the same field used in individual product editing for sales tax
      await db.execute(sql`
        UPDATE products 
        SET 
          tax_percentage = ${taxPercentage},
          updated_at = NOW()
        WHERE id = ANY(${productIds})
      `);
    } catch (error) {
      console.error('Error bulk updating product tax percentage:', error);
      throw error;
    }
  }

  async getProductsWithFilters(filters: any): Promise<Product[]> {
    try {
      let query = db.select().from(products);

      // Apply search filter
      if (filters.search) {
        query = query.where(
          or(
            ilike(products.name, `%${filters.search}%`),
            ilike(products.sku, `%${filters.search}%`),
            ilike(products.description, `%${filters.search}%`)
          )
        );
      }

      // Apply category filter
      if (filters.categoryId) {
        query = query.where(eq(products.categoryId, filters.categoryId));
      }

      // Apply stock filter
      if (filters.stockFilter === 'zero') {
        query = query.where(eq(products.stock, 0));
      } else if (filters.stockFilter === 'low') {
        query = query.where(lt(products.stock, 10));
      } else if (filters.stockFilter === 'high') {
        query = query.where(gt(products.stock, 100));
      }

      // Apply status filter
      if (filters.status === 'live') {
        query = query.where(eq(products.isDraft, false));
      } else if (filters.status === 'draft') {
        query = query.where(eq(products.isDraft, true));
      }

      const results = await query.orderBy(products.name);
      return results;
    } catch (error) {
      console.error('Error getting filtered products:', error);
      throw error;
    }
  }

  async importProductsFromCsv(csvData: string, userId: string): Promise<any> {
    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const results = {
        imported: 0,
        updated: 0,
        errors: 0,
        errorDetails: [] as string[]
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const values = line.split(',').map(v => v.trim());
          const rowData: any = {};

          headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
          });

          // Required fields check
          if (!rowData.name || !rowData.sku) {
            results.errors++;
            results.errorDetails.push(`Row ${i + 1}: Missing required fields (name, sku)`);
            continue;
          }

          // Check if product exists by SKU
          const existingProduct = await this.getProductBySku(rowData.sku);

          const productData = {
            name: rowData.name,
            sku: rowData.sku,
            description: rowData.description || '',
            price: parseFloat(rowData.price) || 0,
            cost: parseFloat(rowData.cost) || 0,
            stock: parseInt(rowData.stock) || 0,
            categoryId: rowData.category_id ? parseInt(rowData.category_id) : null,
            imageUrl: rowData.image_url || null,
            isDraft: rowData.is_draft === 'true'
          };

          if (existingProduct) {
            // Update existing product
            await this.updateProduct(existingProduct.id, productData);
            results.updated++;
          } else {
            // Create new product
            await this.createProduct(productData);
            results.imported++;
          }
        } catch (rowError) {
          results.errors++;
          results.errorDetails.push(`Row ${i + 1}: ${(rowError as Error).message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  }

  async exportProductsToCsv(products: Product[]): Promise<string> {
    try {
      const headers = [
        'id', 'name', 'sku', 'description', 'price', 'cost', 'stock', 
        'category_id', 'image_url', 'is_draft', 'created_at', 'updated_at'
      ];

      const csvLines = [headers.join(',')];

      for (const product of products) {
        const row = [
          product.id,
          `"${product.name || ''}"`,
          `"${product.sku || ''}"`,
          `"${product.description || ''}"`,
          product.price || 0,
          product.cost || 0,
          product.stock || 0,
          product.categoryId || '',
          `"${product.imageUrl || ''}"`,
          product.isDraft || false,
          product.createdAt ? product.createdAt.toISOString() : '',
          product.updatedAt ? product.updatedAt.toISOString() : ''
        ];
        csvLines.push(row.join(','));
      }

      return csvLines.join('\n');
    } catch (error) {
      console.error('Error exporting products to CSV:', error);
      throw error;
    }
  }

  // Cart operations
  async getCartItems(userId: string): Promise<any[]> {
    console.log(`Fetching cart items for user: [REDACTED]`);
    try {
      const items = await db
        .select({
          id: cartItems.id,
          userId: cartItems.userId,
          productId: cartItems.productId,
          quantity: cartItems.quantity,
          price: products.price, // Add price directly to cart item
          createdAt: cartItems.createdAt,
          updatedAt: cartItems.updatedAt,
          product: {
            id: products.id,
            name: products.name,
            description: products.description,
            price: products.price,
            imageUrl: products.imageUrl,
            stock: products.stock,
            isTobacco: products.isTobaccoProduct,
            isTobaccoProduct: products.isTobaccoProduct,
            category: products.categoryId,
            flatTaxIds: products.flatTaxIds
          }
        })
        .from(cartItems)
        .leftJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.userId, userId));

      console.log(`Found ${items.length} cart items for user [REDACTED]`);
      return items;
    } catch (error) {
      console.error(`Error fetching cart items for user ${userId}:`, error);
      return [];
    }
  }

  async getCartItemByUserAndProduct(userId: string, productId: number): Promise<CartItem | undefined> {
    try {
      const [item] = await db.select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, userId),
            eq(cartItems.productId, productId)
          )
        );

      return item;
    } catch (error) {
      console.error("Error fetching specific cart item:", error);
      return undefined;
    }
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    try {
      console.log('Adding to cart:', cartItem);

      if (!cartItem.userId || !cartItem.productId || !cartItem.quantity) {
        throw new Error('Missing required cart item fields');
      }

      // Verify product exists and get its price
      const product = await this.getProductById(cartItem.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if the item already exists
      const [existingItem] = await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, cartItem.userId),
            eq(cartItems.productId, cartItem.productId)
          )
        );

      if (existingItem) {
        console.log('Updating existing cart item');
        // Update quantity instead
        const [updated] = await db
          .update(cartItems)
          .set({
            quantity: sql`${cartItems.quantity} + ${cartItem.quantity}`,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(cartItems.userId, cartItem.userId),
              eq(cartItems.productId, cartItem.productId)
            )
          )
          .returning();
        console.log('Cart item updated:', updated);
        return updated;
      } else {
        console.log('Creating new cart item');
        // Insert new cart item with product price
        const cartData = {
          ...cartItem,
          price: product.price,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const [newCartItem] = await db.insert(cartItems).values(cartData).returning();
        console.log('Cart item created:', newCartItem);
        return newCartItem;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async updateCartItem(userId: string, productId: number, quantity: number): Promise<CartItem | undefined> {
    try {
      console.log('Updating cart item:', { userId, productId, quantity });

      if (quantity <= 0) {
        await this.removeFromCart(userId, productId);
        return undefined;
      }

      const [updated] = await db
        .update(cartItems)
        .set({
          quantity: quantity,
          updatedAt: new Date()
        })
        .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        )
      )
      .returning();

      console.log('Cart item updated:', updated);
      return updated;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  async removeFromCart(userId: string, productId: number): Promise<void> {
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        )
      );
  }

  // Clear all cart items for a user
  async clearCart(userId: string): Promise<void> {
    console.log(`Actually clearing cart for user: [REDACTED]`);

    try {
      // First attempt with standard query
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
      console.log(`Deleted cart items for [REDACTED] with standard query`);
    } catch (error) {
      console.error(`Error in standard cart deletion for ${userId}:`, error);

      try {
        // Try a raw SQL deletion as a fallback
        console.log(`Using raw SQL fallback for cart deletion for [REDACTED]`);
        await db.execute(sql`DELETE FROM "cart_items" WHERE "user_id" = ${userId}`);
        console.log(`Successfully used raw SQL deletion for [REDACTED]`);
      } catch (sqlError) {
        console.error(`Even SQL fallback failed for ${userId}:`, sqlError);

        // Last resort - create empty cart items array in memory
        console.log(`Using memory-only approach for [REDACTED]`);
      }
    }
  }

  // Order operations
  // SMS and Email notification methods
  async logSmsNotification(data: InsertSmsNotificationLog): Promise<SmsNotificationLog> {
    const [notification] = await db.insert(smsNotificationLogs).values(data).returning();
    return notification;
  }

  async logEmailNotification(data: InsertEmailNotificationLog): Promise<EmailNotificationLog> {
    const [notification] = await db.insert(emailNotificationLogs).values(data).returning();
    return notification;
  }

  async updateSMSNotificationStatus(messageSid: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    try {
      await db.update(smsNotificationLogs)
        .set({
          status,
          errorMessage: errorCode ? `${errorCode}: ${errorMessage}` : null,
          deliveredAt: status === 'delivered' ? new Date() : null
        })
        .where(eq(smsNotificationLogs.sid, messageSid));

      console.log(`📱 Updated SMS status for ${messageSid}: ${status}`);
    } catch (error) {
      console.error('Error updating SMS notification status:', error);
      // Don't throw error to prevent callback failures
    }
  }

  // Notification queue method removed with in-app notifications

  // Notification queue query method removed with in-app notifications

  // Notification queue update method removed with in-app notifications

  async getNotificationTemplates(messageType: string, language: string = 'en'): Promise<NotificationTemplate[]> {
    return await db.select().from(notificationTemplates)
      .where(and(
        eq(notificationTemplates.messageType, messageType),
        eq(notificationTemplates.language, language),
        eq(notificationTemplates.isActive, true)
      ));
  }

  async getSmsNotificationLogs(customerId?: string, messageType?: string, limit: number = 50): Promise<SmsNotificationLog[]> {
    const query = db.select().from(smsNotificationLogs);

    if (customerId && messageType) {
      return await query
        .where(and(
          eq(smsNotificationLogs.customerId, customerId),
          eq(smsNotificationLogs.messageType, messageType)
        ))
        .orderBy(desc(smsNotificationLogs.createdAt))
        .limit(limit);
    } else if (customerId) {
      return await query
        .where(eq(smsNotificationLogs.customerId, customerId))
        .orderBy(desc(smsNotificationLogs.createdAt))
        .limit(limit);
    } else if (messageType) {
      return await query
        .where(eq(smsNotificationLogs.messageType, messageType))
        .orderBy(desc(smsNotificationLogs.createdAt))
        .limit(limit);
    } else {
      return await query
        .orderBy(desc(smsNotificationLogs.createdAt))
        .limit(limit);
    }
  }

  async getEmailNotificationLogs(customerId?: string, messageType?: string, limit: number = 50): Promise<EmailNotificationLog[]> {
    const query = db.select().from(emailNotificationLogs);

    if (customerId && messageType) {
      return await query
        .where(and(
          eq(emailNotificationLogs.customerId, customerId),
          eq(emailNotificationLogs.messageType, messageType)
        ))
        .orderBy(desc(emailNotificationLogs.createdAt))
        .limit(limit);
    } else if (customerId) {
      return await query
        .where(eq(emailNotificationLogs.customerId, customerId))
        .orderBy(desc(emailNotificationLogs.createdAt))
        .limit(limit);
    } else if (messageType) {
      return await query
        .where(eq(emailNotificationLogs.messageType, messageType))
        .orderBy(desc(emailNotificationLogs.createdAt))
        .limit(limit);
    } else {
      return await query
        .orderBy(desc(emailNotificationLogs.createdAt))
        .limit(limit);
    }
  }

  async createOrder(order: any, items: InsertOrderItem[]): Promise<Order> {
    console.log("Creating order with data:", JSON.stringify(order, null, 2));

    try {
      let newOrder;

      // Create the order
      if (order.orderType === 'delivery') {
        // Special handling for delivery address ID (handle both formats)
        const addressId = order.deliveryAddressId || order.delivery_address_id;
        const embeddedAddress = order.deliveryAddress; // NEW: Get the embedded address data

        console.log(`Creating order with delivery address ID: [REDACTED], type: [REDACTED]`);
        console.log("EMBEDDED DELIVERY ADDRESS DATA:", embeddedAddress);

        if (!addressId) {
          console.warn("Warning: Delivery order created without an address ID");
        }

        // Enhanced debug logging for delivery address issues
        console.log("ORDER DATA RECEIVED:", {
          addressIdFromRequest: addressId,
          deliveryAddressId: order.deliveryAddressId,
          delivery_address_id: order.delivery_address_id,
          orderType: order.orderType,
          embeddedAddressData: embeddedAddress // NEW: Log the embedded data
        });

        // CRITICAL FIX: Make sure we explicitly cast to a number to avoid type issues
        const parsedAddressId = addressId ? 
          (typeof addressId === 'string' ? parseInt(addressId) : Number(addressId)) : 
          null;

        // CRITICAL FIX: Get the actual selected delivery address data from the order
        let deliveryAddressDataString = null;

        // First check if the order already contains embedded address data
        if (embeddedAddress && typeof embeddedAddress === 'object') {
          try {
            deliveryAddressDataString = JSON.stringify(embeddedAddress);
            console.log("✓ CHECKOUT FIX: Using embedded delivery address:", embeddedAddress.name || 'Unknown');
          } catch (stringifyError) {
            console.error("Failed to stringify delivery address data:", stringifyError);
          }
        } 
        // If no embedded data but we have an address ID, fetch the address details
        else if (parsedAddressId) {
          try {
            console.log(`✓ CHECKOUT FIX: Fetching address details for ID [REDACTED]`);
            const [selectedAddress] = await db
              .select()
              .from(deliveryAddresses)
              .where(eq(deliveryAddresses.id, parsedAddressId));

            if (selectedAddress) {
              deliveryAddressDataString = JSON.stringify(selectedAddress);
              console.log(`✓ CHECKOUT FIX: Found and storing "${selectedAddress.name}" address for order`);
            } else {
              console.warn(`⚠ CHECKOUT: Could not find address with ID ${parsedAddressId}`);
            }
          } catch (fetchError) {
            console.error("Error fetching selected delivery address:", fetchError);
          }
        }

        console.log("Parsed address ID:", parsedAddressId, "original type:", typeof addressId);

        // Create a clean order object with the correct format for the database
        // Explicitly setting all fields to ensure proper formatting
        const cleanOrderData = {
          userId: order.userId,
          total: order.total,
          deliveryFee: order.deliveryFee || 0,
          status: order.status || 'processing',
          orderType: 'delivery', // CRITICAL FIX: Force delivery type for delivery orders
          // CRITICAL: Set deliveryAddressId using the parsed value (this matches the schema)
          deliveryAddressId: parsedAddressId,
          pickupDate: null, // No pickup date for delivery orders
          pickupTime: null, // No pickup time for delivery orders
          deliveryDate: order.deliveryDate || null,
          deliveryTimeSlot: order.deliveryTimeSlot || null,
          notes: order.notes || null,
          // NEW: Store the complete delivery address information directly with the order
          deliveryAddressData: deliveryAddressDataString,
          // Loyalty points redemption
          loyaltyPointsRedeemed: order.loyaltyPointsRedeemed || 0,
          loyaltyPointsValue: order.loyaltyPointsValue || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log(`Creating delivery order with fee: $${order.deliveryFee}, total: $${order.total}`);

        console.log("FINAL cleaned order data for database:", JSON.stringify(cleanOrderData, null, 2));
        [newOrder] = await db.insert(orders).values(cleanOrderData).returning();

        // Verify the created order has the delivery address ID
        console.log("Newly created order object:", JSON.stringify(newOrder, null, 2));
      } else {
        // Standard order creation for pickup orders
        console.log('PICKUP ORDER DEBUG - Input data:', JSON.stringify({
          pickupDate: order.pickupDate,
          pickupTime: order.pickupTime,
          pickupTimeSlot: order.pickupTimeSlot,
          orderType: order.orderType
        }, null, 2));

        const cleanOrderData = {
          userId: order.userId,
          total: order.total,
          deliveryFee: order.deliveryFee || 0,
          status: order.status || 'pending',
          orderType: order.orderType,
          pickupDate: order.pickupDate || null,
          pickupTime: order.pickupTime || order.pickupTimeSlot || null,
          notes: order.notes || null,
          // Loyalty points redemption
          loyaltyPointsRedeemed: order.loyaltyPointsRedeemed || 0,
          loyaltyPointsValue: order.loyaltyPointsValue || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log('PICKUP ORDER DEBUG - Clean order data:', JSON.stringify(cleanOrderData, null, 2));
        [newOrder] = await db.insert(orders).values(cleanOrderData).returning();
      }

      console.log("Created order:", newOrder);

      // Process loyalty point redemption if any
      if (order.loyaltyPointsRedeemed && order.loyaltyPointsRedeemed > 0) {
        try {
          console.log(`Processing loyalty point redemption: ${order.loyaltyPointsRedeemed} points for order #${newOrder.id}`);
          const redemptionResult = await this.redeemLoyaltyPoints(
            order.userId, 
            order.loyaltyPointsRedeemed, 
            newOrder.id, 
            'system'
          );

          if (!redemptionResult.success) {
            console.error('Failed to redeem loyalty points:', redemptionResult.message);
            // Note: We continue with order creation even if redemption fails
          }
        } catch (redemptionError) {
          console.error('Error processing loyalty point redemption:', redemptionError);
          // Continue with order creation - loyalty redemption failure shouldn't block order
        }
      }

      // Create order items with proper price validation
      for (const item of items) {
        let itemPrice = item.price;

        // If price is missing, get it from the product
        if (!itemPrice || itemPrice === 0) {
          const [product] = await db.select({ price: products.price })
            .from(products)
            .where(eq(products.id, item.productId));
          itemPrice = product?.price || 0;
        }

        await db.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price || itemPrice, // Use enhanced price if provided
          basePrice: item.basePrice || null,
          taxPercentage: item.taxPercentage || 0,
          percentageTaxAmount: item.percentageTaxAmount || 0,
          flatTaxAmount: item.flatTaxAmount || 0,
          totalTaxAmount: item.totalTaxAmount || 0
        });

        // Record customer price memory for purchase history
        try {
          await this.recordCustomerPriceMemory({
            customerId: order.userId,
            productId: item.productId,
            orderId: newOrder.id,
            price: itemPrice,
            isManuallySet: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (priceMemoryError) {
          console.error('Failed to record customer price memory:', priceMemoryError);
          // Don't fail the order creation if price memory fails
        }
      }

      // Clear the cart
      await this.clearCart(order.userId);

      // Note: Notifications are now handled in the route handlers to ensure proper timing

      // Return the created order
      return newOrder;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  async getOrdersByUser(userId: string): Promise<any[]> {
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: {
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: [desc(orders.createdAt)]
    });

    return userOrders;
  }

  async getAllOrders(): Promise<any[]> {
    const allOrders = await db.query.orders.findMany({
      with: {
        user: true, // Include user/customer information
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: [desc(orders.createdAt)]
    });

    // Enhance orders with customer information and proper naming
    const enhancedOrders = allOrders.map((order) => {
      const customer = order.user;

      if (customer) {
        const customerName = customer.company || 
          `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 
          customer.username || 'Unknown Customer';

        console.log(`Order ${order.id} - Customer found:`, {
          id: customer.id,
          username: customer.username,
          firstName: customer.firstName,
          lastName: customer.lastName,
          company: customer.company,
          customerLevel: customer.customerLevel
        });

        return {
          ...order,
          customer: {
            id: customer.id,
            username: customer.username,
            firstName: customer.firstName,
            lastName: customer.lastName,
            company: customer.company,
            phone: customer.phone,
            email: customer.email,
            customerLevel: customer.customerLevel
          },
          customerName: customerName
        };
      } else {
        console.log(`No customer found for order ${order.id}, userId: [REDACTED]`);
        return {
          ...order,
          customer: null,
          customerName: 'Unknown Customer',
          user: null
        };
      }
    });

    return enhancedOrders;
  }

  // Alias for getOrdersByUser to fix the API endpoint
  async getOrdersByUserId(userId: string): Promise<any[]> {
    return this.getOrdersByUser(userId);
  }

  // Get specific order items
  async getOrderItems(orderId: number): Promise<any[]> {
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
      with: {
        product: true
      }
    });

    return items;
  }



  async getOrderById(id: number): Promise<any | undefined> {
    // First fetch the order with basic user info
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: {
            product: true
          }
        },
        user: true
      }
    });

    if (!order) {
      return undefined;
    }

    console.log(`Retrieved order #${id} with data:`, {
      id: order.id,
      userId: order.userId,
      orderType: order.orderType,
      notes: order.notes || order.deliveryNote
    });

    // For delivery orders, try to enhance with more detailed address info
    if (order.orderType === 'delivery' && order.userId) {
      // CRITICAL FIX: Check for embedded delivery address data first - this ensures "Store 2" shows instead of "test"
      if (order.deliveryAddressData) {
        try {
          const embeddedAddress = JSON.parse(order.deliveryAddressData);
          console.log(`Order #${id} has embedded delivery address data:`, embeddedAddress.name || 'Unknown');

          // Use the embedded address data directly - this is the selected address like "Store 2"
          (order as any).deliveryAddress = embeddedAddress;

          // Also update the user object for backward compatibility
          order.user = {
            ...order.user,
            address: `${embeddedAddress.addressLine1}${embeddedAddress.addressLine2 ? ', ' + embeddedAddress.addressLine2 : ''}`,
            city: embeddedAddress.city,
            state: embeddedAddress.state,
            postalCode: embeddedAddress.postalCode,
            country: embeddedAddress.country,
            phone: embeddedAddress.phone || order.user.phone,
          };

          console.log(`✓ DELIVERY ADDRESS FIXED: Order #${id} now shows "${embeddedAddress.name}" instead of default address`);
          return order; // Return early - we have the correct address data

        } catch (parseError) {
          console.error(`Failed to parse embedded delivery address data for order #${id}:`, parseError);
          // Fall through to ID-based lookup as backup
        }
      }

      // Check for delivery address data stored as JSON in the order
      if (order.deliveryAddressData) {
        try {
          console.log(`Order #${id} has deliveryAddressData, parsing JSON`);
          const deliveryAddress = JSON.parse(order.deliveryAddressData);
          console.log(`✓ Found delivery address for order #${id}:`, deliveryAddress.name || 'Address');
          (order as any).deliveryAddress = deliveryAddress;
          return order;
        } catch (parseError) {
          console.error(`Error parsing deliveryAddressData for order #${id}:`, parseError);
        }
      }

      // FALLBACK: Extract delivery address ID from order notes if available
      let deliveryAddressId = null;
      const orderNotes = order.notes || order.deliveryNote || '';

      // Look for embedded delivery address ID in notes
      const addressIdMatch = orderNotes.match(/DELIVERY_ADDRESS_ID:(\d+)/);
      if (addressIdMatch) {
        deliveryAddressId = parseInt(addressIdMatch[1]);
        console.log(`Found delivery address ID [REDACTED] in order notes`);
      }

      // Enhanced logging for delivery address debugging
      console.log(`Processing order #${id} - Type: ${order.orderType}, Address ID:`, {
        extractedAddressId: deliveryAddressId,
        orderNotes: orderNotes
      });

      if (deliveryAddressId) {
        console.log(`Order #${id} has delivery address ID: [REDACTED]`);

        try {
          // Query the database for the delivery address using the correct ID
          // Make sure we're using a number for the ID to avoid type issues
          const addressIdNumber = typeof deliveryAddressId === 'string' ? 
            parseInt(deliveryAddressId) : Number(deliveryAddressId);

          console.log(`Querying database for address ID [REDACTED] (converted from [REDACTED])`);

          const [selectedAddress] = await db
            .select()
            .from(deliveryAddresses)
            .where(eq(deliveryAddresses.id, addressIdNumber));

          console.log(`Direct DB query for address ID ${deliveryAddressId} returned:`, 
                      selectedAddress ? `Address found: ${selectedAddress.name}` : "No address found");

          if (selectedAddress) {
            console.log(`Found selected delivery address for order #${id}:`, selectedAddress.name);
            console.log("Full address details:", JSON.stringify(selectedAddress, null, 2));

            // Create a standardized delivery address object with both camelCase and snake_case fields
            const deliveryAddressData = {
              id: selectedAddress.id,
              name: selectedAddress.name,
              // Include both naming conventions for maximum compatibility
              businessName: selectedAddress.businessName,
              business_name: selectedAddress.businessName,
              addressLine1: selectedAddress.addressLine1,
              address_line1: selectedAddress.addressLine1,
              addressLine2: selectedAddress.addressLine2,
              address_line2: selectedAddress.addressLine2,
              city: selectedAddress.city,
              state: selectedAddress.state,
              postalCode: selectedAddress.postalCode,
              postal_code: selectedAddress.postalCode,
              country: selectedAddress.country,
              phone: selectedAddress.phone,
              notes: selectedAddress.notes,
              isDefault: selectedAddress.isDefault,
              is_default: selectedAddress.isDefault
            };

            // CRITICAL FIX: Attach delivery address with proper field names for frontend
            (order as any).deliveryAddress = deliveryAddressData;
            (order as any).delivery_address_id = selectedAddress.id;
            (order as any).deliveryAddressId = selectedAddress.id;

            console.log(`Successfully attached delivery address to order #${id}:`, 
                        { id: deliveryAddressData.id, name: deliveryAddressData.name });

            // Log delivery address for debugging
            console.log(`Delivery address for order #${id}:`, deliveryAddressData);

            // Also update the user object for backward compatibility
            order.user = {
              ...order.user,
              address: `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}`,
              city: selectedAddress.city,
              state: selectedAddress.state,
              postalCode: selectedAddress.postalCode,
              country: selectedAddress.country,
              phone: selectedAddress.phone || order.user.phone,
            };

            console.log("Enhanced order with selected delivery address");
            return order; // Return early to avoid falling back to default
          } else {
            console.log(`Delivery address ID [REDACTED] not found for order #${id}`);
            // Fallback to default address handling
            await this.attachDefaultAddress(order);
          }
        } catch (error) {
          console.error("Failed to fetch selected delivery address:", error);
          // Fallback to default address handling
          await this.attachDefaultAddress(order);
        }
      } else {
        // No delivery_address_id specified, use the default approach
        console.log(`Order #${id} has no specific delivery address ID, using default`);
        await this.attachDefaultAddress(order);
      }
    }

    // Make sure customer notes are properly included
    if (order.deliveryNote) {
      console.log(`Order #${id} has delivery notes: ${order.deliveryNote}`);
      // Ensure notes are available in a consistent property
      order.customerNotes = order.deliveryNote;
    } else if (order.notes) {
      console.log(`Order #${id} has general notes: ${order.notes}`);
      order.customerNotes = order.notes;
    }

    return order;
  }

  // Helper method to attach default delivery address to an order
  async attachDefaultAddress(order: any): Promise<void> {
    try {
      console.log(`Attempting to find delivery addresses for user [REDACTED]`);

      const userAddresses = await db.query.deliveryAddresses.findMany({
        where: eq(deliveryAddresses.userId, order.userId),
      });

      if (userAddresses && userAddresses.length > 0) {
        console.log(`Found ${userAddresses.length} delivery addresses for user [REDACTED]`);

        // Use the default address or the first one
        const defaultAddress = userAddresses.find(addr => addr.isDefault === true) || userAddresses[0];
        console.log("Selected default address:", defaultAddress.name, defaultAddress.id);

        // Create a standardized delivery address object with both camelCase and snake_case fields
        const deliveryAddressData = {
          id: defaultAddress.id,
          name: defaultAddress.name,
          // Include both naming conventions for maximum compatibility
          businessName: defaultAddress.businessName,
          business_name: defaultAddress.businessName,
          addressLine1: defaultAddress.addressLine1,
          address_line1: defaultAddress.addressLine1,
          addressLine2: defaultAddress.addressLine2,
          address_line2: defaultAddress.addressLine2,
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          postal_code: defaultAddress.postalCode,
          country: defaultAddress.country,
          phone: defaultAddress.phone,
          notes: defaultAddress.notes,
          isDefault: defaultAddress.isDefault,
          is_default: defaultAddress.isDefault
        };

        // CRITICAL FIX: Assign the delivery address to the order
        order.deliveryAddress = deliveryAddressData;

        // Log what we're attaching
        console.log(`Attached delivery address to order:`, {
          id: deliveryAddressData.id,
          name: deliveryAddressData.name,
          addressLine1: deliveryAddressData.addressLine1
        });

        // Also update the user object for backward compatibility
        order.user = {
          ...order.user,
          addressLine1: defaultAddress.addressLine1,
          addressLine2: defaultAddress.addressLine2,
          city: defaultAddress.city,
          state: defaultAddress.state,
          postalCode: defaultAddress.postalCode,
          country: defaultAddress.country,
          phone: defaultAddress.phone || order.user.phone,
        };

        console.log("Enhanced order with default address information");
      } else {
        console.log("No delivery addresses found for user:", order.userId);
      }
    } catch (error) {
      console.error("Failed to fetch delivery address details:", error);
    }
  }

  // Delete order - Admin only functionality
  async deleteOrder(orderId: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete order #[REDACTED]`);

      // First delete all order items (foreign key constraint)
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      console.log(`Deleted order items for order #[REDACTED]`);

      // Delete any order notes
      await db.delete(orderNotes).where(eq(orderNotes.orderId, orderId));
      console.log(`Deleted order notes for order #[REDACTED]`);

      // Finally delete the order itself
      const result = await db.delete(orders).where(eq(orders.id, orderId));
      console.log(`Successfully deleted order #[REDACTED]`);

      return true;
    } catch (error) {
      console.error(`Failed to delete order #${orderId}:`, error);
      return false;
    }
  }

  // Admin stats methods
  async getProductCount(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(products);
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting product count:", error);
      return 0;
    }
  }

  async getOrderCount(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(orders);
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting order count:", error);
      return 0;
    }
  }

  async getCustomerCount(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isAdmin, false));
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting customer count:", error);
      return 0;
    }
  }

  async getRecentOrdersCount(days: number): Promise<number> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const result = await db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(gte(orders.createdAt, dateThreshold));

      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting recent orders count:", error);
      return 0;
    }
  }

  async getPendingOrdersCount(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.status, 'pending'));

      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting pending orders count:", error);
      return 0;
    }
  }

  async getTotalRevenue(): Promise<number> {
    try {
      const result = await db.select({ total: sql<number>`sum(${orders.total})` }).from(orders);
      return Number(result[0]?.total) || 0;
    } catch (error) {
      console.error("Error getting total revenue:", error);
      return 0;
    }
  }

  async getLowStockCount(): Promise<number> {
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(lt(products.stock, 10));

      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.error("Error getting low stock count:", error);
      return 0;
    }
  }

  async getTopProducts(limit: number): Promise<any[]> {
    try {
      const result = await db.select({
        productId: orderItems.productId,
        productName: products.name,
        totalQuantity: sql<number>`sum(${orderItems.quantity})`,
        totalRevenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.price})`
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .groupBy(orderItems.productId, products.name)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(limit);

      return result;
    } catch (error) {
      console.error("Error getting top products:", error);
      return [];
    }
  }

  async getAllOrdersWithCustomers(): Promise<any[]> {
    try {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

      // Enhance orders with customer information
      for (const order of allOrders) {
        const customer = await this.getUser(order.userId);
        if (customer) {
          order.customer = {
            id: customer.id,
            username: customer.username,
            firstName: customer.firstName,
            lastName: customer.lastName,
            company: customer.company,
            phone: customer.phone,
            customerLevel: customer.customerLevel
          };
        }
      }

      return allOrders;
    } catch (error) {
      console.error("Error getting all orders with customers:", error);
      return [];
    }
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();

    // Send notification about the status update (process async)
    if (updated) {
      // Import the notification service and send notification asynchronously
      import('./services/notification').then(({ sendOrderStatusUpdateNotification }) => {
        sendOrderStatusUpdateNotification(updated).catch(error => {
          console.error('Failed to send order status update notification:', error);
        });
      }).catch(error => {
        console.error('Failed to import notification service:', error);
      });
    }

    return updated;
  }

  async completeOrderWithPayment(
    id: number, 
    paymentData: {
      paymentMethod: string;
      checkNumber?: string;
      paymentNotes?: string;
    }
  ): Promise<Order | undefined> {
    // Get order details first to calculate loyalty points
    const orderDetails = await this.getOrderById(id);

    const [updated] = await db
      .update(orders)
      .set({
        status: 'completed',
        paymentMethod: paymentData.paymentMethod,
        checkNumber: paymentData.checkNumber || null,
        paymentNotes: paymentData.paymentNotes || null,
        paymentDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();

    // Award loyalty points for completed order with payment
    if (updated && orderDetails) {
      try {
        // Calculate subtotal excluding delivery fees - this captures manual price changes
        // by using the actual prices stored in orderItems at completion time
        const subtotal = orderDetails.items.reduce((sum: number, item: any) => 
          sum + (item.price * item.quantity), 0);

        // Only award points on the amount paid (after loyalty redemption)
        const loyaltyPointsValue = orderDetails.loyaltyPointsValue || 0;
        const eligibleAmount = Math.max(0, subtotal - loyaltyPointsValue);

        console.log(`Awarding loyalty points for order #${id}: subtotal $${subtotal}, after redemption: $${eligibleAmount}`);

        // Only award points if there's an eligible amount after redemption
        if (eligibleAmount > 0) {
          await this.awardLoyaltyPoints(orderDetails.userId, id, eligibleAmount);
        } else {
          console.log(`No loyalty points awarded for order #${id} - fully covered by redemption`);
        }
      } catch (loyaltyError) {
        console.error('Error awarding loyalty points:', loyaltyError);
        // Don't fail the order completion if loyalty points fail
      }
    }

    // Send notification about the completion (process async)
    if (updated) {
      // Import the notification service and send notification asynchronously
      import('./services/notification').then(({ sendOrderStatusUpdateNotification }) => {
        sendOrderStatusUpdateNotification(updated).catch(error => {
          console.error('Failed to send order completion notification:', error);
        });
      }).catch(error => {
        console.error('Failed to import notification service:', error);
      });
    }

    return updated;
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>): Promise<Order | undefined> {
    // Remove any timestamp fields that might cause issues and let database handle them
    const { updatedAt, createdAt, ...cleanOrderData } = orderData as any;

    const [updated] = await db
      .update(orders)
      .set({
        ...cleanOrderData,
        updatedAt: sql`NOW()`
      })
      .where(eq(orders.id, id))
      .returning();

    return updated;
  }

  async updateOrderItem(itemId: number, itemData: Partial<InsertOrderItem>): Promise<OrderItem | undefined> {
    try {
      const [updated] = await db
        .update(orderItems)
        .set(itemData)
        .where(eq(orderItems.id, itemId))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating order item:', error);
      return undefined;
    }
  }

  async getOrderItemById(itemId: number): Promise<any> {
    try {
      const [item] = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, itemId));
      return item;
    } catch (error) {
      console.error('Error getting order item:', error);
      return null;
    }
  }

  async deleteOrderItem(itemId: number): Promise<boolean> {
    try {
      await db
        .delete(orderItems)
        .where(eq(orderItems.id, itemId));
      return true;
    } catch (error) {
      console.error('Error deleting order item:', error);
      return false;
    }
  }

  async recalculateOrderTotal(orderId: number): Promise<Order | undefined> {
    try {
      // Get order info to check if it's a delivery order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) return undefined;

      // Get all order items for this order
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Calculate new subtotal (just items, no delivery fee)
      const newSubtotal = items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);

      // Recalculate delivery fee if this is a delivery order
      let newDeliveryFee = 0;
      if (order.orderType === 'delivery') {
        const settings = await this.getOrderSettings();
        const freeDeliveryThreshold = settings?.freeDeliveryThreshold || 500;
        const deliveryFee = settings?.deliveryFee || 25;
        newDeliveryFee = newSubtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
      }

      // Calculate final total (subtotal + delivery fee)
      const newTotal = newSubtotal + newDeliveryFee;

      console.log(`[ORDER RECALC] Order #[REDACTED]: Subtotal: $${newSubtotal}, Delivery Fee: $${newDeliveryFee}, Total: $${newTotal}`);

      // Update order total and delivery fee
      const [updated] = await db
        .update(orders)
        .set({ 
          total: newTotal,
          deliveryFee: newDeliveryFee
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error recalculating order total:', error);
      return undefined;
    }
  }

  async addOrderNote(noteData: any): Promise<any> {
    try {
      // Add note to order_notes table
      const [orderNote] = await db
        .insert(orderNotes)
        .values({
          orderId: noteData.orderId,
          note: noteData.note,
          addedBy: noteData.addedBy,
          notifyCustomer: noteData.notifyCustomer || false,
          createdAt: new Date()
        })
        .returning();

      // Also add as activity log for audit trail
      await this.addActivityLog({
        action: 'order_note',
        details: `Order note: ${noteData.note}`,
        performedBy: noteData.addedBy,
        metadata: JSON.stringify({
          orderId: noteData.orderId,
          noteId: orderNote.id,
          notifyCustomer: noteData.notifyCustomer || false
        })
      });

      return orderNote;
    } catch (error) {
      console.error('Error adding order note:', error);
      throw error;
    }
  }

  async getOrderNotes(orderId: number): Promise<any[]> {
    try {
      const { eq, desc } = await import('drizzle-orm');

      // Join with users table to get proper names
      const notes = await db
        .select({
          id: orderNotes.id,
          orderId: orderNotes.orderId,
          note: orderNotes.note,
          addedBy: orderNotes.addedBy,
          notifyCustomer: orderNotes.notifyCustomer,
          createdAt: orderNotes.createdAt,
          // User information
          userName: users.firstName,
          userLastName: users.lastName,
          userUsername: users.username,
          userCompany: users.company,
          isAdmin: users.isAdmin,
          isEmployee: users.isEmployee
        })
        .from(orderNotes)
        .leftJoin(users, eq(orderNotes.addedBy, users.id))
        .where(eq(orderNotes.orderId, orderId))
        .orderBy(desc(orderNotes.createdAt));

      // Transform the data to include proper display names
      return notes.map(note => ({
        ...note,
        displayName: note.userName 
          ? `${note.userName}${note.userLastName ? ` ${note.userLastName}` : ''}${note.userCompany ? ` (${note.userCompany})` : ''}`
          : note.userUsername || note.addedBy
      }));
    } catch (error) {
      console.error('Error fetching order notes:', error);
      return [];
    }
  }

  async deleteOrderNote(noteId: number, userId?: string): Promise<boolean> {
    try {
      const { orderNotes } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      // First check if note exists and user has permission (admin can delete any, others only their own)
      const [existingNote] = await db
        .select()
        .from(orderNotes)
        .where(eq(orderNotes.id, noteId));

      if (!existingNote) {
        return false;
      }

      // Admin can delete any note, others can only delete their own  
      if (userId) {
        const user = await this.getUser(userId);
        const canDelete = user?.isAdmin || existingNote.addedBy === userId;

        if (!canDelete) {
          return false;
        }
      }

      const result = await db
        .delete(orderNotes)
        .where(eq(orderNotes.id, noteId));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting order note:', error);
      return false;
    }
  }

  // Update order delivery fee
  async updateOrderDeliveryFee(orderId: number, deliveryFee: number): Promise<Order | undefined> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({ 
          deliveryFee,
          total: sql`(SELECT COALESCE(SUM(price * quantity), 0) FROM order_items WHERE order_id = ${orderId}) + ${deliveryFee}`
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order delivery fee:', error);
      return undefined;
    }
  }

  // Get frequently ordered products for recommendations
  async getFrequentlyOrderedProducts(userId: string, limit: number): Promise<Product[]> {
    try {
      const result = await db
        .select({
          productId: orderItems.productId,
          product: products,
          totalQuantity: sql<number>`sum(${orderItems.quantity})`
        })
        .from(orderItems)
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orders.userId, userId))
        .groupBy(orderItems.productId, products.id)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(limit);

      return result.map(r => r.product).filter(Boolean);
    } catch (error) {
      console.error('Error getting frequently ordered products:', error);
      return [];
    }
  }

  // Get popular products for recommendations
  async getPopularProducts(limit: number): Promise<Product[]> {
    try {
      const result = await db
        .select({
          product: products,
          totalQuantity: sql<number>`COALESCE(sum(${orderItems.quantity}), 0)`
        })
        .from(products)
        .leftJoin(orderItems, eq(products.id, orderItems.productId))
        .where(and(
          not(eq(products.stock, 0)),
          sql`${products.imageUrl} IS NOT NULL AND LENGTH(${products.imageUrl}) > 10`
        ))
        .groupBy(products.id)
        .orderBy(desc(sql`COALESCE(sum(${orderItems.quantity}), 0)`), desc(products.featured))
        .limit(limit);

      return result.map(r => r.product);
    } catch (error) {
      console.error('Error getting popular products:', error);
      return [];
    }
  }

  async addOrderItem(orderId: number, itemData: InsertOrderItem): Promise<OrderItem | undefined> {
    try {
      const [newItem] = await db
        .insert(orderItems)
        .values({
          ...itemData,
          orderId
        })
        .returning();
      return newItem;
    } catch (error) {
      console.error('Error adding order item:', error);
      return undefined;
    }
  }

  // Activity log operations
  async addActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  // Notification logging methods
  async logNotificationAttempt(data: {
    userId: string;
    type: 'sms' | 'email';
    recipient: string;
    message: string;
    status: 'success' | 'failed';
    errorMessage?: string;
    orderId?: number;
  }): Promise<void> {
    try {
      await this.addActivityLog({
        userId: data.userId,
        action: `${data.type}_notification_${data.status}`,
        details: JSON.stringify({
          recipient: data.recipient,
          message: data.message.substring(0, 200) + (data.message.length > 200 ? '...' : ''),
          errorMessage: data.errorMessage,
          orderId: data.orderId,
          timestamp: new Date().toISOString()
        }),
        timestamp: new Date()
      });
      console.log(`📝 Logged ${data.type} notification attempt: ${data.status} to ${data.recipient}`);
    } catch (error) {
      console.error('Failed to log notification attempt:', error);
    }
  }

  async getNotificationLogs(limit: number = 50): Promise<any[]> {
    try {
      const { or, like, desc } = await import('drizzle-orm');
      return await db
        .select()
        .from(activityLogs)
        .where(or(
          like(activityLogs.action, '%notification%'),
          like(activityLogs.action, '%sms%'),
          like(activityLogs.action, '%email%')
        ))
        .orderBy(desc(activityLogs.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get notification logs:', error);
      return [];
    }
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    try {
      // Join with users table to get username information
      const result = await db.execute(
        sql`
          SELECT al.*, u.username 
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          ORDER BY al.timestamp DESC 
          LIMIT ${limit}
        `
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        details: row.details,
        targetId: row.target_id, 
        targetType: row.target_type,
        timestamp: row.timestamp,
        ipAddress: null, // Include null for backward compatibility
        username: row.username || 'Unknown User' // Custom field for display
      }));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  }

  async getRecentActivityLogs(limit: number = 10): Promise<ActivityLog[]> {
    try {
      // Join with users table to get username information for recent activities
      const result = await db.execute(
        sql`
          SELECT al.*, u.username 
          FROM activity_logs al
          LEFT JOIN users u ON al.user_id = u.id
          ORDER BY al.timestamp DESC 
          LIMIT ${limit}
        `
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        details: row.details,
        targetId: row.target_id, 
        targetType: row.target_type,
        timestamp: row.timestamp,
        ipAddress: null,
        username: row.username || 'System'
      }));
    } catch (error) {
      console.error('Error fetching recent activity logs:', error);
      return [];
    }
  }

  async getActivityLogsByUser(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db.query.activityLogs.findMany({
      where: eq(activityLogs.userId, userId),
      limit,
      orderBy: [desc(activityLogs.timestamp)]
    });
  }



  // Barcode search operations
  async searchProductsByBarcode(barcode: string): Promise<Product[]> {
    try {
      // Search for exact UPC match in both upcCode and sku fields using SQL
      const exactMatch = await db.execute(
        sql`
          SELECT * FROM products 
          WHERE upc_code = ${barcode} OR sku = ${barcode}
        `
      );

      return exactMatch.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        basePrice: row.base_price,
        price1: row.price_level_1,
        price2: row.price_level_2,
        price3: row.price_level_3,
        price4: row.price_level_4,
        price5: row.price_level_5,
        imageUrl: row.image_url,
        upcCode: row.upc_code,
        sku: row.sku,
        brand: row.brand,
        size: row.size,
        weight: row.weight,
        stock: row.stock,
        minOrderQuantity: row.min_order_quantity,
        featured: row.featured,
        discount: row.discount,
        dimensions: row.dimensions,
        additionalImages: row.additional_images,
        categoryId: row.category_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error searching products by barcode:', error);
      return [];
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    try {
      // Search for exact UPC match in both upcCode and sku fields
      const result = await db.execute(
        sql`
          SELECT * FROM products 
          WHERE upc_code = ${barcode} OR sku = ${barcode}
          LIMIT 1
        `
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0] as any;
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        basePrice: row.base_price,
        price1: row.price_level_1,
        price2: row.price_level_2,
        price3: row.price_level_3,
        price4: row.price_level_4,
        price5: row.price_level_5,
        imageUrl: row.image_url,
        upcCode: row.upc_code,
        sku: row.sku,
        brand: row.brand,
        size: row.size,
        weight: row.weight,
        stock: row.stock,
        minOrderQuantity: row.min_order_quantity,
        featured: row.featured,
        discount: row.discount,
        dimensions: row.dimensions,
        additionalImages: row.additional_images,
        categoryId: row.category_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return undefined;
    }
  }

  async searchSimilarProducts(searchTerm: string): Promise<Product[]> {
    try {
      // Search for similar products by name, partial UPC, or description
      const similarProducts = await db.execute(
        sql`
          SELECT * FROM products 
          WHERE 
            LOWER(name) LIKE LOWER(${'%' + searchTerm + '%'}) OR
            LOWER(description) LIKE LOWER(${'%' + searchTerm + '%'}) OR
            upc_code LIKE ${'%' + searchTerm + '%'}
          LIMIT 20
        `
      );

      return similarProducts.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        basePrice: row.base_price,
        price1: row.price_level_1,
        price2: row.price_level_2,
        price3: row.price_level_3,
        price4: row.price_level_4,
        price5: row.price_level_5,
        imageUrl: row.image_url,
        upcCode: row.upc_code,
        sku: row.sku,
        brand: row.brand,
        size: row.size,
        weight: row.weight,
        stock: row.stock,
        minOrderQuantity: row.min_order_quantity,
        featured: row.featured,
        discount: row.discount,
        dimensions: row.dimensions,
        additionalImages: row.additional_images,
        categoryId: row.category_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error searching similar products:', error);
      return [];
    }
  }

  async getOrderSettings(): Promise<OrderSettings | undefined> {
    try {
      const { orderSettings } = await import('../shared/schema');
      const [settings] = await db.select().from(orderSettings).limit(1);
      return settings;
    } catch (error) {
      console.error('Error fetching order settings:', error);
      return undefined;
    }
  }

  async updateOrderSettings(settings: Partial<InsertOrderSettings>): Promise<OrderSettings | undefined> {
    try {
      const { orderSettings } = await import('../shared/schema');

      // First try to update existing settings
      const [updated] = await db
        .update(orderSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .returning();

      if (updated) {
        return updated;
      }

      // If no existing settings, create new ones
      const [created] = await db
        .insert(orderSettings)
        .values({
          minimumOrderAmount: settings.minimumOrderAmount || 0,
          deliveryFee: settings.deliveryFee || 0,
          freeDeliveryThreshold: settings.freeDeliveryThreshold || 500,
          loyaltyPointsRate: settings.loyaltyPointsRate || 0.02,
          updatedBy: settings.updatedBy || 'system',
          updatedAt: new Date()
        })
        .returning();

      return created;
    } catch (error) {
      console.error('Error updating order settings:', error);
      return undefined;
    }
  }

  // Category management methods
  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      const [updated] = await db
        .update(categories)
        .set(categoryData)
        .where(eq(categories.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.categoryId, categoryId));
  }

  // Purchase order methods  
  async getAllPurchaseOrders(): Promise<any[]> {
    try {
      // Use Drizzle ORM to get all purchase orders
      const orders = await db.select().from(purchaseOrders).orderBy(purchaseOrders.createdAt);

      // For each order, fetch items using direct SQL to match database schema
      const { sql } = await import('drizzle-orm');
      const ordersWithItems = await Promise.all(
        orders.map(async (order: any) => {
          // Get items count for this purchase order
          const itemsResult = await db.execute(sql`
            SELECT COUNT(*) as item_count
            FROM purchase_order_items 
            WHERE purchase_order_id = ${order.id}
          `);

          const itemCount = Number(itemsResult.rows?.[0]?.item_count) || 0;

          return {
            id: order.id,
            orderNumber: order.orderNumber || `PO-${order.id}`,
            supplier: order.supplierName || 'Unknown Supplier',
            supplierName: order.supplierName,
            supplierAddress: order.supplierName, // Use supplier name for now
            status: order.status,
            orderDate: order.createdAt,
            expectedDeliveryDate: order.createdAt,
            totalAmount: parseFloat(order.totalCost?.toString() || '0') || 0,
            createdBy: order.createdBy || 'Unknown',
            notes: order.notes,
            createdAt: order.createdAt,
            itemCount: itemCount, // Already a number, no need to parseInt
            items: [] // Items will be loaded when viewing details
          };
        })
      );

      return ordersWithItems;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  }

  async getPurchaseOrderById(id: number): Promise<any> {
    try {
      // Get the purchase order
      const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));

      if (!order) {
        return undefined;
      }

      // Get items using Drizzle ORM instead of raw SQL
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          productName: sql<string>`CASE WHEN ${purchaseOrderItems.productId} IS NOT NULL THEN ${products.name} ELSE 'Unknown Product' END`,
          productId: purchaseOrderItems.productId,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: sql<number>`COALESCE(${purchaseOrderItems.quantityReceived}, 0)`,
          unitCost: purchaseOrderItems.unitCost,
          totalCost: purchaseOrderItems.totalCost
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, id))
        .orderBy(purchaseOrderItems.id);

      // Transform database fields to match frontend expectations
      const orderWithItems = {
        ...order,
        id: order.id,
        orderNumber: order.orderNumber || `PO-${order.id}`,
        supplierName: order.supplierName, // Frontend expects supplierName
        supplierAddress: order.supplierAddress, // Use actual supplier address
        createdAt: order.createdAt, // Frontend expects createdAt  
        expectedDeliveryDate: order.expectedDeliveryDate,
        totalCost: order.totalCost, // Frontend expects totalCost
        status: order.status,
        notes: order.notes,
        createdBy: order.createdBy,
        receivedBy: order.receivedBy,
        receivedDate: order.receivedDate,
        items: items || []
      };

      return orderWithItems;
    } catch (error) {
      console.error('Error fetching purchase order by ID:', error);
      throw error;
    }
  }

  async createPurchaseOrder(purchaseOrder: any): Promise<any> {
    console.log('Creating purchase order with data:', JSON.stringify(purchaseOrder, null, 2));

    const insertData = {
      orderNumber: purchaseOrder.orderNumber || purchaseOrder.order_number || `PO-${Date.now()}`,
      supplierName: purchaseOrder.supplierName || purchaseOrder.supplier_name,
      supplierId: purchaseOrder.supplierId || purchaseOrder.supplier_id || null,
      status: purchaseOrder.status || 'pending',
      totalCost: purchaseOrder.totalCost || purchaseOrder.total_cost || 0,
      notes: purchaseOrder.notes || null,
      createdBy: purchaseOrder.createdBy || purchaseOrder.created_by,
    };

    console.log('Insert data prepared:', JSON.stringify(insertData, null, 2));
    console.log('createdBy value:', insertData.createdBy);

    // Use Drizzle ORM with camelCase fields to match API format
    const [created] = await db
      .insert(purchaseOrders)
      .values(insertData)
      .returning();

    return created;
  }

  async updatePurchaseOrderStatus(id: number, status: string, receivedBy: string): Promise<void> {
    await db
      .update(purchaseOrders)
      .set({ 
        status,
        receivedBy,
        receivedAt: new Date()
      })
      .where(eq(purchaseOrders.id, id));
  }

  async createPurchaseOrderItem(item: any): Promise<any> {
    // Use Drizzle ORM with correct schema field names
    const [created] = await db
      .insert(purchaseOrderItems)
      .values({
        purchaseOrderId: item.purchaseOrderId,
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
      })
      .returning();

    return created;
  }

  async createPurchaseOrderItemDirect(item: any): Promise<any> {
    try {
      // Try to find existing product by name for linking
      let productId = null;
      if (item.product_name) {
        const existingProduct = await db
          .select()
          .from(products)
          .where(eq(products.name, item.product_name))
          .limit(1);

        if (existingProduct.length > 0) {
          productId = existingProduct[0].id;
          console.log(`Found existing product for "${item.product_name}": ID [REDACTED]`);
        }
      }

      // Direct database insertion using raw SQL with proper schema fields
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(sql`
        INSERT INTO purchase_order_items (
          purchase_order_id, 
          product_id,
          product_name, 
          description, 
          quantity, 
          quantity_received,
          unit_price, 
          total_price
        ) VALUES (
          ${item.purchase_order_id},
          ${productId},
          ${item.product_name},
          ${item.description || ''},
          ${item.quantity},
          0,
          ${item.unit_price},
          ${item.total_price}
        ) RETURNING *
      `);

      return result.rows?.[0] || result;
    } catch (error) {
      console.error('Error creating purchase order item directly:', error);
      throw error;
    }
  }

  async updatePurchaseOrderItemReceived(id: number, quantityReceived: number): Promise<void> {
    await db
      .update(purchaseOrderItems)
      .set({ quantityReceived })
      .where(eq(purchaseOrderItems.id, id));
  }

  async getProductPricingHistory(productId: number): Promise<ProductPricingHistory[]> {
    try {
      // Use raw SQL to avoid Drizzle ORM issues
      const result = await db.execute(sql`
        SELECT 
          pph.id,
          pph.product_id as "productId",
          pph.old_price as "oldPrice",
          pph.new_price as "newPrice", 
          pph.old_cost as "oldCost",
          pph.new_cost as "newCost",
          pph.change_reason as "changeReason",
          pph.changed_by as "changedBy",
          pph.details as "changeDetails",
          pph.created_at as "createdAt",
          pph.purchase_order_id as "purchaseOrderId",
          u.username,
          u.first_name as "firstName",
          u.last_name as "lastName"
        FROM product_pricing_history pph
        LEFT JOIN users u ON pph.changed_by = u.id
        WHERE pph.product_id = ${productId}
        ORDER BY pph.created_at DESC
      `);

      // Transform the result to include display name
      return result.rows.map((entry: any) => ({
        ...entry,
        displayName: entry.username || entry.firstName 
          ? `${entry.username || ''} ${entry.firstName ? '(' + entry.firstName + (entry.lastName ? ' ' + entry.lastName : '') + ')' : ''}`.trim()
          : entry.changedBy || 'Unknown User'
      }));
    } catch (error) {
      console.error('Error in getProductPricingHistory:', error);
      return [];
    }
  }

  async addPricingHistory(history: InsertProductPricingHistory): Promise<ProductPricingHistory> {
    const [created] = await db
      .insert(productPricingHistory)
      .values(history)
      .returning();
    return created;
  }

  async updateProductCostAndPrice(productId: number, cost: number, price: number, purchaseOrderId?: number): Promise<void> {
    console.log(`Starting updateProductCostAndPrice for product [REDACTED], cost: ${cost}, price: ${price}, PO: [REDACTED]`);

    // Get current product to track old values
    const [currentProduct] = await db.select().from(products).where(eq(products.id, productId));
    if (!currentProduct) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    console.log(`Current product values - price: ${currentProduct.price}, cost: ${currentProduct.cost || 0}, basePrice: ${currentProduct.basePrice || 0}`);

    // Update both cost and price fields
    await db
      .update(products)
      .set({ 
        cost: cost,
        price: price 
      })
      .where(eq(products.id, productId));

    console.log(`Updated product [REDACTED] with cost: ${cost}, price: ${price}`);

    // Add pricing history record with both old and new values
    const historyData = {
      productId,
      oldPrice: currentProduct.price || 0,
      newPrice: price,
      oldCost: currentProduct.cost || 0,
      newCost: cost,
      changeReason: 'Purchase order received',
      changedBy: 'admin-user',
      purchaseOrderId: purchaseOrderId
    };

    console.log(`Creating pricing history record:`, historyData);

    try {
      const historyRecord = await this.addPricingHistory(historyData);
      console.log(`Successfully created pricing history record:`, historyRecord);
    } catch (error) {
      console.error(`Failed to create pricing history record:`, error);
      throw error;
    }
  }

  // REMOVED DUPLICATE: updateProductStock method - using the one from line 1496

  // Keep for backward compatibility - now redirects to new database method
  async getAISuggestedItemsForPurchaseOrder(purchaseOrderId: number): Promise<any[]> {
    return this.getAIPurchaseOrderSuggestions(purchaseOrderId);
  }

  async removeAISuggestedItemsForPurchaseOrder(purchaseOrderId: number, approvedItems: any[]): Promise<void> {
    try {
      // Remove approved items from database by deleting and re-inserting remaining items
      const { aiPurchaseOrderSuggestions } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const allSuggestions = await this.getAIPurchaseOrderSuggestions(purchaseOrderId);
      const remaining = allSuggestions.filter((suggestion: any) => {
        return !approvedItems.some(approved => approved.productName === suggestion.productName);
      });

      // Clear all suggestions for this purchase order
      await db.delete(aiPurchaseOrderSuggestions)
        .where(eq(aiPurchaseOrderSuggestions.purchaseOrderId, purchaseOrderId));

      // Re-insert remaining suggestions
      if (remaining.length > 0) {
        await this.storeAIPurchaseOrderSuggestions(purchaseOrderId, remaining);
      }

      console.log(`✅ Removed ${approvedItems.length} approved items, ${remaining.length} suggestions remaining`);
    } catch (error) {
      console.error('Error removing AI suggestions:', error);
      throw error;
    }
  }

  async addItemToPurchaseOrder(purchaseOrderId: number, productId: number, quantity: number, unitCost: number, productName: string): Promise<void> {
    try {
      // Insert directly into purchase_order_items table using the correct schema
      const { purchaseOrderItems } = await import('../shared/schema');
      const totalCost = quantity * unitCost;

      const result = await db.insert(purchaseOrderItems).values({
        purchaseOrderId: purchaseOrderId,
        productId: productId,
        quantityOrdered: quantity,
        unitCost: unitCost,
        totalCost: totalCost
      }).returning();

      console.log(`✅ Added item to purchase order [REDACTED]: ${productName} (Product ID: [REDACTED], Qty: ${quantity}, Cost: $${unitCost})`);
      return result[0];
    } catch (error) {
      console.error('❌ Error adding item to purchase order:', error);
      throw error;
    }
  }

  async updatePurchaseOrderItemQuantityReceived(purchaseOrderId: number, productId: number | null, quantityReceived: number, itemId?: number): Promise<void> {
    console.log(`Updating purchase order item - PO: [REDACTED], Product: [REDACTED], Item ID: [REDACTED], Quantity received: ${quantityReceived}`);

    const { sql } = await import('drizzle-orm');

    // If we have a specific item ID, use that (for AI-generated orders)
    if (itemId) {
      await db.execute(sql`
        UPDATE purchase_order_items 
        SET quantity_received = ${quantityReceived}
        WHERE id = ${itemId} AND purchase_order_id = ${purchaseOrderId}
      `);
    }
    // If we have a product ID, use that (for manual orders)
    else if (productId) {
      await db.execute(sql`
        UPDATE purchase_order_items 
        SET quantity_received = ${quantityReceived}
        WHERE purchase_order_id = ${purchaseOrderId} AND product_id = ${productId}
      `);
    }
    // Fallback: try to update by product name match (for AI orders without product_id)
    else {
      console.log(`Warning: No product ID or item ID provided for quantity update`);
      return;
    }

    console.log(`Successfully updated purchase order item quantity received`);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.getProductById(id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    try {
      const result = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku))
        .limit(1);

      return result[0] || undefined;
    } catch (error) {
      console.error('Error getting product by SKU:', error);
      return undefined;
    }
  }

  async deletePurchaseOrder(id: number): Promise<void> {
    try {
      // First delete related product pricing history (foreign key constraint)
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`
        DELETE FROM product_pricing_history 
        WHERE purchase_order_id = ${id}
      `);

      // Then delete all purchase order items
      await db.execute(sql`
        DELETE FROM purchase_order_items 
        WHERE purchase_order_id = ${id}
      `);

      // Finally delete the purchase order
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  }

  // Customer statistics operations
  async getCustomerStatistics(userId: string): Promise<{ totalOrders: number; totalSpent: number; averageOrderValue: number; }> {
    try {
      const result = await db.execute(
        sql`
          SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(total), 0) as total_spent
          FROM orders 
          WHERE user_id = ${userId} AND status != 'cancelled'
        `
      );

      const stats = result.rows[0] as any;
      const totalOrders = parseInt(stats.total_orders) || 0;
      const totalSpent = parseFloat(stats.total_spent) || 0;
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      return {
        totalOrders,
        totalSpent,
        averageOrderValue
      };
    } catch (error) {
      console.error('Error getting customer statistics:', error);
      return { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 };
    }
  }

  // Customer search operations for bulk operations
  async searchCustomers(searchTerm: string): Promise<User[]> {
    try {
      const { sql } = await import('drizzle-orm');
      const result = await db.execute(
        sql`
          SELECT * FROM users 
          WHERE 
            (username ILIKE ${'%' + searchTerm + '%'} OR
             first_name ILIKE ${'%' + searchTerm + '%'} OR
             last_name ILIKE ${'%' + searchTerm + '%'} OR
             company ILIKE ${'%' + searchTerm + '%'} OR
             id = ${searchTerm})
            AND is_admin = false
          ORDER BY 
            CASE 
              WHEN username ILIKE ${searchTerm + '%'} THEN 1
              WHEN first_name ILIKE ${searchTerm + '%'} THEN 2
              WHEN last_name ILIKE ${searchTerm + '%'} THEN 3
              WHEN company ILIKE ${searchTerm + '%'} THEN 4
              ELSE 5
            END
          LIMIT 10
        `
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        address: row.address,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        dateOfBirth: row.date_of_birth,
        profileImageUrl: row.profile_image_url,
        isAdmin: row.is_admin,
        isEmployee: row.is_employee,
        isStaff: row.is_staff,
        customerLevel: row.customer_level,
        taxExempt: row.tax_exempt,
        creditLimit: row.credit_limit,
        paymentTerms: row.payment_terms,
        discountTier: row.discount_tier,
        lastLogin: row.last_login,
        isActive: row.is_active,
        notes: row.notes,
        referredBy: row.referred_by,
        businessType: row.business_type,
        feinNumber: row.fein_number,
        stateTaxId: row.state_tax_id,
        tobaccoLicense: row.tobacco_license,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  // UNIFIED NOTIFICATION OPERATIONS - GET USER NOTIFICATIONS
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      console.log(`📱 [Storage] Getting notifications for user: [REDACTED]`);

      const { sql } = await import('drizzle-orm');

      // Use raw SQL to avoid schema mapping issues, exclude login alerts
      const result = await db.execute(
        sql`
          SELECT id, user_id, type, title, message, data, is_read, created_at, expires_at, order_id
          FROM notifications 
          WHERE user_id = ${userId} 
          AND title != 'Login Alert'
          AND type != 'login_alert'
          ORDER BY created_at DESC 
          LIMIT 50
        `
      );

      const notifications = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: row.data,
        isRead: row.is_read,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        orderId: row.order_id
      }));

      console.log(`📱 [Storage] Found ${notifications.length} notifications for user [REDACTED]`);

      return notifications;
    } catch (error) {
      console.error('❌ [Storage] Error getting user notifications:', error);
      return [];
    }
  }

  // UNIFIED NOTIFICATION OPERATIONS - MARK AS READ (PERFORMANCE OPTIMIZED)
  async markNotificationAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      console.log(`📱 [Storage] Marking notification [REDACTED] as read for user: [REDACTED]`);

      // Use direct Drizzle ORM update instead of dynamic import and raw SQL
      const result = await db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ));

      console.log(`📱 [Storage] Successfully marked notification [REDACTED] as read`);
      return true;
    } catch (error) {
      console.error('❌ [Storage] Error marking notification as read:', error);
      return false;
    }
  }

  // markAllNotificationsAsRead method removed

  // deleteNotification method removed

  // REMOVED DUPLICATE: getNotificationSettings method - using the one from line 4252



  // REMOVED DUPLICATE: deleteOrderNote method - using the one from line 2993

  async getRecommendedProducts(userId?: string, limit: number = 8): Promise<Product[]> {
    try {
      // Get popular products based on order frequency
      const popularProducts = await db
        .select()
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(limit);

      return popularProducts;
    } catch (error) {
      console.error('Error getting recommended products:', error);
      return [];
    }
  }

  async clearUserCart(userId: string): Promise<void> {
    try {
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
    } catch (error) {
      console.error('Error clearing user cart:', error);
      throw error;
    }
  }

  // Backup System Methods

  async createBackup(): Promise<any> {
    try {
      // Use proper ES module dynamic imports with .default
      const fs = await import('fs');
      const path = await import('path');

      // Ensure backup directory exists
      const backupDir = path.default.join(process.cwd(), 'backups');
      if (!fs.default.existsSync(backupDir)) {
        fs.default.mkdirSync(backupDir, { recursive: true });
      }

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gokul-data-backup-${timestamp}.json`;
      const filePath = path.default.join(backupDir, filename);

      // Get all data from database
      const [allUsers, allProducts, allCategories, allOrders, allOrderItems, 
             allCartItems, allAddresses, allActivityLogs, allPurchaseOrders] = await Promise.all([
        db.query.users.findMany(),
        db.query.products.findMany(),
        db.query.categories.findMany(),
        db.query.orders.findMany(),
        db.query.orderItems.findMany(),
        db.query.cartItems.findMany(),
        db.query.deliveryAddresses.findMany(),
        db.query.activityLogs.findMany(),
        db.query.purchaseOrders.findMany()
      ]);

      // Create backup data object
      const backupData = {
        metadata: {
          created: new Date().toISOString(),
          version: '1.0',
          tables: ['users', 'products', 'categories', 'orders', 'orderItems', 'cartItems', 'deliveryAddresses', 'activityLogs', 'purchaseOrders']
        },
        data: {
          users: allUsers,
          products: allProducts,
          categories: allCategories,
          orders: allOrders,
          orderItems: allOrderItems,
          cartItems: allCartItems,
          deliveryAddresses: allAddresses,
          activityLogs: allActivityLogs,
          purchaseOrders: allPurchaseOrders
        }
      };

      // Write JSON file directly
      fs.default.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

      // Get file stats
      const stats = fs.default.statSync(filePath);

      return {
        filename,
        size: stats.size,
        created: new Date().toISOString(),
        tables: backupData.metadata.tables,
        recordCounts: {
          users: allUsers.length,
          products: allProducts.length,
          orders: allOrders.length,
          categories: allCategories.length
        }
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async getBackupList(): Promise<any[]> {
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const fs = require('fs');
      const path = require('path');

      const backupDir = path.join(process.cwd(), 'backups');

      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = fs.readdirSync(backupDir);
      const backupFiles = files.filter((file: string) => file.endsWith('.zip') || file.endsWith('.json'));

      const backups = backupFiles.map((file: string) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);

        return {
          name: file,
          filename: file,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          sizeFormatted: this.formatFileSize(stats.size)
        };
      });

      // Sort by creation date, newest first
      return backups.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    } catch (error) {
      console.error('Error listing backups:', error);
      throw error;
    }
  }

  async getBackupFilePath(filename: string): Promise<string | null> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const backupDir = path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, filename);

      if (fs.existsSync(filePath)) {
        return filePath;
      }

      return null;
    } catch (error) {
      console.error('Error getting backup file path:', error);
      return null;
    }
  }

  async deleteBackup(filename: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const backupDir = path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      } else {
        throw new Error('Backup file not found');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(filename: string): Promise<any> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const backupDir = path.join(process.cwd(), 'backups');
      const filePath = path.join(backupDir, filename);

      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      // For now, return confirmation that restore capability exists
      // Full restore implementation would require careful data migration
      return {
        message: 'Backup restore functionality is available',
        filename,
        status: 'ready_for_restore',
        warning: 'Restore operations should be performed with caution in production'
      };
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  // In-app notification storage methods removed

  // getUserNotifications method removed

  async getNotificationSettings(userId: string): Promise<any> {
    try {
      const { notificationSettings } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      let [settings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));

      // Create default settings if none exist
      if (!settings) {
        [settings] = await db
          .insert(notificationSettings)
          .values({
            userId,
            orderChanges: true,
            orderNotes: true,
            orderStatus: true,
            newItems: true,
            promotions: true,
            systemUpdates: true,
            emailNotifications: false
          })
          .returning();
      }

      return settings;
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      // Return default settings on error
      return {
        orderChanges: true,
        orderNotes: true,
        orderStatus: true,
        newItems: true,
        promotions: true,
        systemUpdates: true,
        emailNotifications: false
      };
    }
  }

  async updateNotificationSettings(userId: string, settings: any): Promise<any> {
    try {
      const { notificationSettings } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [updatedSettings] = await db
        .update(notificationSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(notificationSettings.userId, userId))
        .returning();

      return updatedSettings;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  async createNotificationSettings(userId: string, settings: any): Promise<any> {
    try {
      const { notificationSettings } = await import('../shared/schema');

      const [newSettings] = await db
        .insert(notificationSettings)
        .values({
          userId,
          ...settings
        })
        .returning();

      return newSettings;
    } catch (error) {
      console.error('Error creating notification settings:', error);
      throw error;
    }
  }

  async createNotification(data: any): Promise<any> {
    try {
      // Create notification log entry based on type
      if (data.type === 'sms') {
        const [notification] = await db
          .insert(smsNotificationLogs)
          .values({
            userId: data.userId,
            phone: data.phone,
            message: data.message,
            messageType: data.messageType,
            status: data.status || 'sent',
            messageId: data.messageId || null,
            errorMessage: data.error || null,
            retryCount: data.retryCount || 0
          })
          .returning();
        return notification;
      } else if (data.type === 'email') {
        const [notification] = await db
          .insert(emailNotificationLogs)
          .values({
            userId: data.userId,
            email: data.email,
            subject: data.subject,
            message: data.message,
            messageType: data.messageType,
            status: data.status || 'sent',
            messageId: data.messageId || null,
            errorMessage: data.error || null,
            retryCount: data.retryCount || 0
          })
          .returning();
        return notification;
      } else {
        throw new Error(`Unsupported notification type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Push notification methods
  async registerDeviceToken(userId: string, token: string, platform: string, deviceInfo?: any): Promise<any> {
    try {
      const { deviceTokens } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');

      // Check if token already exists for this user
      const [existingToken] = await db
        .select()
        .from(deviceTokens)
        .where(and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.token, token)
        ));

      if (existingToken) {
        // Update existing token
        const [updatedToken] = await db
          .update(deviceTokens)
          .set({
            platform,
            deviceInfo,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(deviceTokens.id, existingToken.id))
          .returning();

        return updatedToken;
      } else {
        // Create new token
        const [newToken] = await db
          .insert(deviceTokens)
          .values({
            userId,
            token,
            platform,
            deviceInfo,
            isActive: true
          })
          .returning();

        return newToken;
      }
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  async getUserDeviceTokens(userId: string): Promise<any[]> {
    try {
      const { deviceTokens } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const tokens = await db
        .select()
        .from(deviceTokens)
        .where(eq(deviceTokens.userId, userId));

      return tokens;
    } catch (error) {
      console.error('Error getting user device tokens:', error);
      throw error;
    }
  }

  async removeDeviceToken(userId: string, token: string): Promise<void> {
    try {
      const { deviceTokens } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');

      await db
        .delete(deviceTokens)
        .where(and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.token, token)
        ));
    } catch (error) {
      console.error('Error removing device token:', error);
      throw error;
    }
  }

  async getPushNotificationSettings(userId: string): Promise<any> {
    try {
      const { pushNotificationSettings } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [settings] = await db
        .select()
        .from(pushNotificationSettings)
        .where(eq(pushNotificationSettings.userId, userId));

      if (!settings) {
        // Create default settings
        return await this.createPushNotificationSettings(userId, {});
      }

      return settings;
    } catch (error) {
      console.error('Error getting push notification settings:', error);
      throw error;
    }
  }

  async updatePushNotificationSettings(userId: string, settings: any): Promise<any> {
    try {
      const { pushNotificationSettings } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [updatedSettings] = await db
        .update(pushNotificationSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(pushNotificationSettings.userId, userId))
        .returning();

      return updatedSettings;
    } catch (error) {
      console.error('Error updating push notification settings:', error);
      throw error;
    }
  }

  async createPushNotificationSettings(userId: string, settings: any): Promise<any> {
    try {
      const { pushNotificationSettings } = await import('../shared/schema');

      const defaultSettings = {
        userId,
        orderUpdates: true,
        orderNotes: true,
        orderStatusChanges: true,
        orderItemChanges: true,
        newOrderAssigned: true,
        lowStockAlerts: false,
        promotionalOffers: false,
        systemMaintenance: true,
        ...settings
      };

      const [newSettings] = await db
        .insert(pushNotificationSettings)
        .values(defaultSettings)
        .returning();

      return newSettings;
    } catch (error) {
      console.error('Error creating push notification settings:', error);
      throw error;
    }
  }

  async logPushNotification(userId: string, title: string, body: string, platform: string, data?: any): Promise<any> {
    try {
      const { pushNotificationLogs } = await import('../shared/schema');

      const [logEntry] = await db
        .insert(pushNotificationLogs)
        .values({
          userId,
          title,
          body,
          platform,
          data,
          deliveryStatus: 'pending'
        })
        .returning();

      return logEntry;
    } catch (error) {
      console.error('Error logging push notification:', error);
      throw error;
    }
  }

  async updatePushNotificationStatus(logId: number, status: string, failureReason?: string): Promise<void> {
    try {
      const { pushNotificationLogs } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const updateData: any = {
        deliveryStatus: status
      };

      if (status === 'sent') {
        updateData.sentAt = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      } else if (status === 'failed' && failureReason) {
        updateData.failureReason = failureReason;
      }

      await db
        .update(pushNotificationLogs)
        .set(updateData)
        .where(eq(pushNotificationLogs.id, logId));
    } catch (error) {
      console.error('Error updating push notification status:', error);
      throw error;
    }
  }

  // Activity logging methods
  async logActivity(userId: string, username: string, action: string, details: string, targetType?: string | null, targetId?: string | null, ipAddress?: string, location?: string): Promise<void> {
    try {
      const { activityLogs } = await import('../shared/schema');

      await db.insert(activityLogs).values({
        userId: userId,
        username: username || '',
        action: action,
        details: details,
        targetType: targetType || 'system',
        targetId: targetId || null,
        ipAddress: ipAddress || null,
        location: location || null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      const { eq } = await import('drizzle-orm');

      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating user last login:', error);
      // Don't throw error to prevent breaking the login process
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Missing methods identified in audit
  async getCustomerOrders(userId: string): Promise<any[]> {
    try {
      const { orders, orderItems, products } = await import('../shared/schema');
      const { eq, desc } = await import('drizzle-orm');

      const orderList = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

      return orderList;
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      return [];
    }
  }

  async removeCartItem(userId: string, productId: number): Promise<void> {
    try {
      const { cartItems } = await import('../shared/schema');
      const { eq, and } = await import('drizzle-orm');

      await db
        .delete(cartItems)
        .where(and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        ));
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  }

  async getAdminStats(): Promise<any> {
    try {
      const { orders, users, products } = await import('../shared/schema');
      const { eq, gte, sql } = await import('drizzle-orm');

      // Calculate basic stats
      const [orderStats] = await db
        .select({
          totalOrders: sql<number>`count(*)`,
          totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`
        })
        .from(orders);

      const [userStats] = await db
        .select({
          totalCustomers: sql<number>`count(*)`
        })
        .from(users)
        .where(eq(users.isAdmin, false));

      const [productStats] = await db
        .select({
          totalProducts: sql<number>`count(*)`
        })
        .from(products);

      return {
        totalRevenue: orderStats.totalRevenue || 0,
        totalOrders: orderStats.totalOrders || 0,
        totalCustomers: userStats.totalCustomers || 0,
        totalProducts: productStats.totalProducts || 0
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0
      };
    }
  }

  async getSalesAnalytics(timeframe: string = 'month'): Promise<any> {
    try {
      console.log('[getSalesAnalytics] Called with timeframe:', timeframe);
      const { orders, users, products, orderItems } = await import('../shared/schema');
      const { eq, gte, sql, and, lt, desc } = await import('drizzle-orm');

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get basic stats
      const [orderStats] = await db
        .select({
          totalOrders: sql<number>`count(*)`,
          totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`
        })
        .from(orders)
        .where(gte(orders.createdAt, startDate));

      const revenue = orderStats.totalRevenue || 0;
      const orderCount = orderStats.totalOrders || 0;
      const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      // Get top products
      const topProducts = await db
        .select({
          id: products.id,
          name: products.name,
          totalSold: sql<number>`sum(${orderItems.quantity})`,
          revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.price})`
        })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(gte(orders.createdAt, startDate))
        .groupBy(products.id, products.name)
        .orderBy(sql`sum(${orderItems.quantity} * ${orderItems.price}) desc`)
        .limit(10);

      // Get top customers
      const topCustomers = await db
        .select({
          id: users.id,
          name: sql<string>`COALESCE(${users.firstName}, ${users.username})`,
          totalSpent: sql<number>`sum(${orders.total})`,
          orderCount: sql<number>`count(${orders.id})`
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .where(gte(orders.createdAt, startDate))
        .groupBy(users.id, users.firstName, users.username)
        .orderBy(sql`sum(${orders.total}) desc`)
        .limit(10);

      // Get monthly revenue trend (last 12 months)
      const monthlyRevenue = await db
        .select({
          month: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`,
          revenue: sql<number>`sum(${orders.total})`,
          orderCount: sql<number>`count(${orders.id})`
        })
        .from(orders)
        .where(gte(orders.createdAt, new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)))
        .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`);

      // Calculate revenue growth (compare with previous period)
      const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      const [prevStats] = await db
        .select({
          totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)`
        })
        .from(orders)
        .where(and(
          gte(orders.createdAt, previousPeriodStart),
          lt(orders.createdAt, startDate)
        ));

      const prevRevenue = prevStats?.totalRevenue || 0;
      const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      return {
        totalRevenue: revenue,
        totalOrders: orderCount,
        averageOrderValue,
        revenueGrowth,
        topProducts: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          totalSold: Number(p.totalSold) || 0,
          revenue: Number(p.revenue) || 0
        })),
        topCustomers: topCustomers.map(c => ({
          id: c.id,
          name: c.name || 'Unknown',
          totalSpent: Number(c.totalSpent) || 0,
          orderCount: Number(c.orderCount) || 0
        })),
        monthlyRevenue: monthlyRevenue.map(m => ({
          month: m.month,
          revenue: Number(m.revenue) || 0,
          orderCount: Number(m.orderCount) || 0
        })),
        customerTrends: topCustomers.map(c => ({
          customerId: c.id,
          customerName: c.name || 'Unknown',
          totalOrders: Number(c.orderCount) || 0,
          totalSpent: Number(c.totalSpent) || 0,
          lastOrderDate: now.toISOString()
        }))
      };
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        revenueGrowth: 0,
        topProducts: [],
        topCustomers: [],
        monthlyRevenue: [],
        customerTrends: []
      };
    }
  }

  async getArchivedProducts(): Promise<Product[]> {
    try {
      const { products, categories } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Get archived products with category names
      const archivedProducts = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          cost: products.cost,
          imageUrl: products.imageUrl,
          sku: products.sku,
          brand: products.brand,
          stock: products.stock,
          categoryId: products.categoryId,
          categoryName: categories.name,
          archived: products.archived,
          updatedAt: products.updatedAt,
          createdAt: products.createdAt
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.archived, true));

      return archivedProducts.map(product => ({
        ...product,
        categoryName: product.categoryName || 'Uncategorized'
      })) as Product[];
    } catch (error) {
      console.error('Error fetching archived products:', error);
      return [];
    }
  }

  async clearAllCarts(): Promise<void> {
    try {
      const { cartItems } = await import('../shared/schema');
      await db.delete(cartItems);
    } catch (error) {
      console.error('Error clearing all carts:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      const { notifications } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // DUPLICATE METHOD REMOVED - Using unified deleteNotification with userId parameter

  async completeOrder(orderId: number, paymentInfo?: any): Promise<any> {
    try {
      const { sql } = await import('drizzle-orm');

      // Use direct SQL to avoid any Drizzle field mapping issues
      const checkNumberValue = paymentInfo?.checkNumber || null;
      const paymentNotesValue = paymentInfo?.paymentNotes || null;
      const paymentMethodValue = paymentInfo?.paymentMethod || paymentInfo?.method || 'cash';

      // First get the order details for credit processing and tax calculation
      const orderResult = await db.execute(sql`
        SELECT * FROM orders WHERE id = ${orderId}
      `);

      let order;
      if (orderResult && orderResult.rows && orderResult.rows.length > 0) {
        order = orderResult.rows[0];
      } else if (Array.isArray(orderResult) && orderResult.length > 0) {
        order = orderResult[0];
      }

      if (!order) {
        throw new Error('Order not found');
      }

      // CRITICAL FIX: Calculate and store individual item tax amounts BEFORE completion
      console.log(`🔧 [TAX FIX] Calculating tax separation for order #${orderId} before completion`);
      
      // Get order items with product details for tax calculation
      const itemsWithProducts = await db
        .select({
          itemId: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          flatTaxAmount: orderItems.flatTaxAmount,
          productName: products.name,
          categoryId: products.categoryId,
          flatTaxIds: products.flatTaxIds,
          taxPercentage: products.taxPercentage,
          isTobaccoProduct: products.isTobaccoProduct,
          excludeFromLoyalty: categories.excludeFromLoyalty
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(orderItems.orderId, orderId));

      // Get user information for tax calculation
      const user = await this.getUser(order.user_id);
      if (!user) {
        throw new Error('Customer not found');
      }

      // Import and use tax calculation service properly
      const { TaxCalculationService } = await import('./services/taxCalculationService');
      
      // Calculate tax for each item using the correct method
      for (const item of itemsWithProducts) {
        try {
          // Use TaxCalculationService.calculateOrderTax with proper request format including flatTaxIds
          const taxRequest = {
            orderId: orderId,
            customerId: order.user_id,
            customerLevel: user.customerLevel || 1,
            applyFlatTax: user.applyFlatTax || false,
            items: [{
              id: item.itemId,
              productId: item.productId,
              productName: item.productName,
              basePrice: item.price,
              quantity: item.quantity,
              taxPercentage: item.taxPercentage || 0,
              isTobacco: item.isTobaccoProduct || false,
              flatTaxIds: item.flatTaxIds || []
            }]
          };
          
          const taxResult = await TaxCalculationService.calculateOrderTax(taxRequest);

          // Extract the calculated tax amounts for this specific item from the result
          if (taxResult.itemTaxDetails && taxResult.itemTaxDetails.length > 0) {
            const itemTaxDetail = taxResult.itemTaxDetails[0]; // First (and only) item in this calculation
            const calculatedFlatTax = itemTaxDetail.flatTaxAmount || 0;
            const itemPercentageTax = itemTaxDetail.percentageTaxAmount || 0;
            const totalItemTax = itemTaxDetail.totalTaxAmount || (calculatedFlatTax + itemPercentageTax);

            console.log(`💰 [TAX SEPARATION] ${item.productName}: Flat Tax $${calculatedFlatTax.toFixed(2)} + Percentage Tax $${itemPercentageTax.toFixed(2)} = Total Tax $${totalItemTax.toFixed(2)}`);

            // Update the order item with calculated tax amounts
            await db
              .update(orderItems)
              .set({ 
                flatTaxAmount: calculatedFlatTax,
                percentageTaxAmount: itemPercentageTax,
                totalTaxAmount: totalItemTax
              })
              .where(eq(orderItems.id, item.itemId));
          } else {
            console.log(`⚠️ [TAX CALCULATION] No tax details returned for ${item.productName}`);
          }

        } catch (taxError) {
          console.error(`Failed to calculate tax for item ${item.productName}:`, taxError);
          // Continue with other items
        }
      }

      // Handle "on account" payment processing
      if (paymentMethodValue === 'on_account') {
        // Validate credit limit exists
        const creditAccount = await this.getCustomerCreditAccount(order.user_id);
        if (!creditAccount || parseFloat(creditAccount.creditLimit || '0') <= 0) {
          throw new Error('Credit account not set up. Contact admin to establish credit terms before using account payment.');
        }

        // Check if order would exceed credit limit
        const orderTotal = parseFloat(order.total?.toString() || '0');
        const currentBalance = parseFloat(creditAccount.currentBalance || '0');
        const creditLimit = parseFloat(creditAccount.creditLimit || '0');
        const newBalance = currentBalance - orderTotal;

        if (newBalance < -creditLimit) {
          const exceedAmount = Math.abs(newBalance + creditLimit);
          throw new Error(`This order would exceed the customer's credit limit by $${exceedAmount.toFixed(2)}`);
        }
        // Create invoice payment record for unpaid invoice
        await db.execute(sql`
          INSERT INTO invoice_payments (
            order_id, customer_id, amount, payment_type, status, created_at
          ) VALUES (
            ${orderId}, ${order.user_id}, ${order.total}, 'on_account', 'unpaid', NOW()
          )
        `);

        // Update customer credit balance
        await this.updateCustomerCreditBalance(order.user_id, parseFloat(order.total.toString()));

        // Create credit transaction record
        await this.createCreditTransaction({
          customerId: order.user_id,
          orderId: orderId,
          transactionType: 'charge',
          amount: parseFloat(order.total.toString()),
          description: `Order #${orderId} charged to account`,
          processedBy: paymentInfo?.processedBy || 'system'
        });
      }

      const result = await db.execute(sql`
        UPDATE orders 
        SET 
          status = 'completed',
          payment_method = ${paymentMethodValue},
          check_number = ${checkNumberValue},
          payment_notes = ${paymentNotesValue},
          payment_date = NOW(),
          updated_at = NOW()
        WHERE id = ${orderId}
        RETURNING *
      `);

      // Award loyalty points for completed order with payment
      if (result?.rows?.length > 0) {
        try {
          const completedOrder = result.rows[0];

          // CRITICAL FIX: Calculate loyalty points correctly excluding tobacco products
          let loyaltyEligibleSubtotal = 0;
          let tobaccoItemsCount = 0;
          
          for (const item of itemsWithProducts) {
            // Check if item should be excluded from loyalty (tobacco products)
            const excludeFromLoyalty = item.excludeFromLoyalty || item.isTobaccoProduct;
            
            if (excludeFromLoyalty) {
              tobaccoItemsCount++;
              console.log(`🚫 [LOYALTY EXCLUSION] ${item.productName}: Excluded from loyalty points (tobacco product)`);
            } else {
              const itemSubtotal = item.price * item.quantity;
              loyaltyEligibleSubtotal += itemSubtotal;
              console.log(`✅ [LOYALTY ELIGIBLE] ${item.productName}: $${itemSubtotal.toFixed(2)} eligible for loyalty points`);
            }
          }

          console.log(`🎯 [LOYALTY CALCULATION] Order #${orderId}: $${loyaltyEligibleSubtotal.toFixed(2)} eligible subtotal (${tobaccoItemsCount} tobacco items excluded)`);
          
          if (loyaltyEligibleSubtotal > 0) {
            await this.awardLoyaltyPoints(completedOrder.user_id, orderId, loyaltyEligibleSubtotal);
          } else {
            console.log(`ℹ️ [LOYALTY SKIP] Order #${orderId}: No loyalty points awarded (all items excluded)`);
          }
        } catch (loyaltyError) {
          console.error('Error awarding loyalty points:', loyaltyError);
          // Don't fail the order completion if loyalty points fail
        }
      }

      // Handle result based on its actual structure
      let updatedOrder;
      if (result && result.rows && result.rows.length > 0) {
        updatedOrder = result.rows[0];
      } else if (Array.isArray(result) && result.length > 0) {
        updatedOrder = result[0];
      } else {
        updatedOrder = result;
      }

      // Convert snake_case to camelCase for frontend compatibility
      if (updatedOrder) {
        return {
          ...updatedOrder,
          paymentMethod: updatedOrder.payment_method,
          checkNumber: updatedOrder.check_number,
          paymentNotes: updatedOrder.payment_notes,
          paymentDate: updatedOrder.payment_date
        };
      }

      return updatedOrder;
    } catch (error) {
      console.error('Error completing order:', error);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<any[]> {
    try {
      const { products } = await import('../shared/schema');
      const { ilike, or } = await import('drizzle-orm');

      const searchResults = await db
        .select()
        .from(products)
        .where(
          or(
            ilike(products.name, `%${query}%`),
            ilike(products.description, `%${query}%`),
            ilike(products.brand, `%${query}%`),
            ilike(products.sku, `%${query}%`)
          )
        )
        .limit(50);

      return searchResults;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getUserDeliveryAddresses(userId: string): Promise<any[]> {
    try {
      const { deliveryAddresses } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const addresses = await db
        .select()
        .from(deliveryAddresses)
        .where(eq(deliveryAddresses.userId, userId));

      return addresses;
    } catch (error) {
      console.error('Error fetching user delivery addresses:', error);
      return [];
    }
  }

  async getRecentOrders(limit: number = 10): Promise<any[]> {
    try {
      const { orders } = await import('../shared/schema');
      const { desc } = await import('drizzle-orm');

      const recentOrders = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      return recentOrders;
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }

  async getUserNotificationSettings(userId: string): Promise<any> {
    try {
      const { notificationSettings } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const [settings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));

      if (!settings) {
        // Return default settings if none exist
        return {
          pushNotifications: true,
          emailNotifications: true,
          orderUpdates: true,
          promotionalEmails: false,
          deliveryNotifications: true,
          stockAlerts: false,
        };
      }

      return settings;
    } catch (error) {
      console.error('Error fetching user notification settings:', error);
      // Return defaults on error
      return {
        pushNotifications: true,
        emailNotifications: true,
        orderUpdates: true,
        promotionalEmails: false,
        deliveryNotifications: true,
        stockAlerts: false,
      };
    }
  }

  async updateUserNotificationSettings(userId: string, settings: any): Promise<any> {
    try {
      const { notificationSettings } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Check if settings exist
      const [existingSettings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));

      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await db
          .update(notificationSettings)
          .set({
            ...settings,
            updatedAt: new Date()
          })
          .where(eq(notificationSettings.userId, userId))
          .returning();

        return updatedSettings;
      } else {
        // Create new settings
        const [newSettings] = await db
          .insert(notificationSettings)
          .values({
            userId,
            ...settings,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return newSettings;
      }
    } catch (error) {
      console.error('Error updating user notification settings:', error);
      throw error;
    }
  }

  // Customer price memory operations
  async recordCustomerPriceMemory(data: InsertCustomerPriceMemory): Promise<CustomerPriceMemory> {
    const [record] = await db
      .insert(customerPriceMemory)
      .values(data)
      .returning();
    return record;
  }

  async getCustomerPriceHistory(customerId: string, productId: number): Promise<CustomerPriceMemory[]> {
    return await db
      .select()
      .from(customerPriceMemory)
      .where(and(
        eq(customerPriceMemory.customerId, customerId),
        eq(customerPriceMemory.productId, productId)
      ))
      .orderBy(desc(customerPriceMemory.createdAt));
  }

  // AI Invoice Processing Methods
  async createAiInvoiceProcessing(data: any) {
    const { aiInvoiceProcessing } = await import('../shared/schema');
    const result = await db.insert(aiInvoiceProcessing).values(data).returning();
    return result[0];
  }

  async updateAiInvoiceProcessing(id: number, data: any) {
    const { aiInvoiceProcessing } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    const result = await db.update(aiInvoiceProcessing)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiInvoiceProcessing.id, id))
      .returning();
    return result[0];
  }

  async getAiInvoiceProcessing(id: number) {
    const { aiInvoiceProcessing } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    const result = await db.select()
      .from(aiInvoiceProcessing)
      .where(eq(aiInvoiceProcessing.id, id))
      .limit(1);
    return result[0];
  }

  async createAiProductSuggestion(data: any) {
    const { aiProductSuggestions } = await import('../shared/schema');
    const result = await db.insert(aiProductSuggestions).values(data).returning();
    return result[0];
  }

  async getAiProductSuggestions(invoiceId: number) {
    const { aiProductSuggestions } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    return await db.select()
      .from(aiProductSuggestions)
      .where(eq(aiProductSuggestions.invoiceId, invoiceId));
  }

  async getAllCategories() {
    const { categories } = await import('../shared/schema');
    return await db.select().from(categories);
  }

  async getCustomerLastPurchasePrice(customerId: string, productId: number): Promise<CustomerPriceMemory | undefined> {
    const [record] = await db
      .select()
      .from(customerPriceMemory)
      .where(and(
        eq(customerPriceMemory.customerId, customerId),
        eq(customerPriceMemory.productId, productId)
      ))
      .orderBy(desc(customerPriceMemory.createdAt))
      .limit(1);
    return record;
  }

  async getManuallyEditedPrices(customerId: string): Promise<(CustomerPriceMemory & { product: Product })[]> {
    const records = await db
      .select({
        id: customerPriceMemory.id,
        customerId: customerPriceMemory.customerId,
        productId: customerPriceMemory.productId,
        orderId: customerPriceMemory.orderId,
        price: customerPriceMemory.price,
        isManuallySet: customerPriceMemory.isManuallySet,
        createdAt: customerPriceMemory.createdAt,
        updatedAt: customerPriceMemory.updatedAt,
        product: {
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          basePrice: products.basePrice,
          cost: products.cost,
          price1: products.price1,
          price2: products.price2,
          price3: products.price3,
          price4: products.price4,
          price5: products.price5,
          imageUrl: products.imageUrl,
          upcCode: products.upcCode,
          sku: products.sku,
          brand: products.brand,
          size: products.size,
          weight: products.weight,
          stock: products.stock,
          minStockLevel: products.minStockLevel,
          maxStockLevel: products.maxStockLevel,
          reorderPoint: products.reorderPoint,
          categoryId: products.categoryId,
          isDraft: products.isDraft,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt
        }
      })
      .from(customerPriceMemory)
      .innerJoin(products, eq(customerPriceMemory.productId, products.id))
      .where(and(
        eq(customerPriceMemory.customerId, customerId),
        eq(customerPriceMemory.isManuallySet, true)
      ))
      .orderBy(desc(customerPriceMemory.createdAt));

    return records as (CustomerPriceMemory & { product: Product })[];
  }

  // Excel export operations
  async createExcelExport(data: InsertExcelExport): Promise<ExcelExport> {
    const [export_] = await db.insert(excelExports)
      .values(data)
      .returning();
    return export_;
  }

  async getExcelExports(): Promise<ExcelExport[]> {
    return await db.select()
      .from(excelExports)
      .orderBy(desc(excelExports.createdAt));
  }

  async getExcelExportById(id: number): Promise<ExcelExport | undefined> {
    const [export_] = await db.select()
      .from(excelExports)
      .where(eq(excelExports.id, id));
    return export_;
  }

  async incrementExportDownloadCount(id: number): Promise<void> {
    await db.update(excelExports)
      .set({ 
        downloadCount: sql`${excelExports.downloadCount} + 1`
      })
      .where(eq(excelExports.id, id));
  }

  async getExpiredExcelExports(): Promise<ExcelExport[]> {
    return await db.select()
      .from(excelExports)
      .where(and(
        sql`${excelExports.expiresAt} IS NOT NULL`,
        lt(excelExports.expiresAt, new Date())
      ));
  }

  async deleteExcelExport(id: number): Promise<void> {
    await db.delete(excelExports)
      .where(eq(excelExports.id, id));
  }

  // Missing user operations
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  // Customer Credit Account Management
  async getCustomerCreditAccount(customerId: string): Promise<CustomerCreditAccount | undefined> {
    const [account] = await db.select()
      .from(customerCreditAccounts)
      .where(eq(customerCreditAccounts.customerId, customerId));

    // Convert PostgreSQL numeric strings to numbers to prevent frontend .toFixed() errors
    if (account) {
      return {
        ...account,
        creditLimit: parseFloat(account.creditLimit || '0'),
        currentBalance: parseFloat(account.currentBalance || '0')
      } as CustomerCreditAccount;
    }

    return account;
  }

  async createCustomerCreditAccount(data: InsertCustomerCreditAccount): Promise<CustomerCreditAccount> {
    const [account] = await db.insert(customerCreditAccounts)
      .values(data)
      .returning();
    return account;
  }

  async updateCustomerCreditLimit(customerId: string, creditLimit: number): Promise<CustomerCreditAccount | undefined> {
    const [account] = await db.update(customerCreditAccounts)
      .set({ 
        creditLimit: creditLimit,
        updatedAt: new Date() 
      })
      .where(eq(customerCreditAccounts.customerId, customerId))
      .returning();
    return account;
  }

  async updateCustomerCreditBalance(customerId: string, balance: number): Promise<CustomerCreditAccount | undefined> {
    const [account] = await db.update(customerCreditAccounts)
      .set({ 
        currentBalance: balance,
        updatedAt: new Date() 
      })
      .where(eq(customerCreditAccounts.customerId, customerId))
      .returning();

    // Convert PostgreSQL numeric strings to numbers to prevent frontend .toFixed() errors
    if (account) {
      return {
        ...account,
        creditLimit: parseFloat(account.creditLimit || '0'),
        currentBalance: parseFloat(account.currentBalance || '0')
      } as CustomerCreditAccount;
    }

    return account;
  }

  // Invoice Payment Management
  async createInvoicePayment(data: InsertInvoicePayment): Promise<InvoicePayment> {
    const [payment] = await db.insert(invoicePayments)
      .values(data)
      .returning();
    return payment;
  }

  async getInvoicePaymentsByCustomer(customerId: string): Promise<InvoicePayment[]> {
    return await db.select()
      .from(invoicePayments)
      .where(eq(invoicePayments.customerId, customerId))
      .orderBy(desc(invoicePayments.createdAt));
  }

  async getUnpaidInvoicesByCustomer(customerId: string): Promise<InvoicePayment[]> {
    return await db.select()
      .from(invoicePayments)
      .where(and(
        eq(invoicePayments.customerId, customerId),
        eq(invoicePayments.isPaid, false)
      ))
      .orderBy(desc(invoicePayments.createdAt));
  }

  async markInvoiceAsPaid(invoicePaymentId: number, paidBy: string, checkNumber?: string): Promise<void> {
    const updateData: any = {
      isPaid: true,
      paidAt: new Date(),
      paidBy,
      updatedAt: new Date()
    };

    if (checkNumber) {
      updateData.checkNumber = checkNumber;
    }

    await db.update(invoicePayments)
      .set(updateData)
      .where(eq(invoicePayments.id, invoicePaymentId));
  }

  async markInvoiceAsCompleted(invoiceId: number, paymentData: any): Promise<void> {
    const updateData: any = {
      isPaid: true,
      paidAt: new Date(),
      paidBy: paymentData.processedBy,
      updatedAt: new Date(),
      paymentMethod: paymentData.paymentType,
      paymentNotes: paymentData.paymentNotes
    };

    if (paymentData.checkNumber) {
      updateData.checkNumber = paymentData.checkNumber;
    }

    await db.update(invoicePayments)
      .set(updateData)
      .where(eq(invoicePayments.id, invoiceId));
  }

  // Credit Transaction Management
  async createCreditTransaction(data: InsertCreditTransaction): Promise<CreditTransaction> {
    const [transaction] = await db.insert(creditTransactions)
      .values(data)
      .returning();
    return transaction;
  }

  async getCreditTransactionsByCustomer(customerId: string): Promise<CreditTransaction[]> {
    return await db.select()
      .from(creditTransactions)
      .where(eq(creditTransactions.customerId, customerId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  async getAllCreditTransactions(): Promise<CreditTransaction[]> {
    return await db.select()
      .from(creditTransactions)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(100); // Limit to recent 100 transactions for performance
  }

  async getCustomerAccountBalance(customerId: string): Promise<number> {
    const [result] = await db.select({
      balance: sum(creditTransactions.amount)
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.customerId, customerId));

    return parseFloat(result?.balance || '0');
  }

  async getAllOnAccountOrders(): Promise<any[]> {
    try {
      // Get all unpaid orders (orders on credit account)
      const unpaidOrders = await db.select({
        id: orders.id,
        customerId: orders.userId,
        customerName: users.firstName,
        customerLastName: users.lastName,
        customerCompany: users.company,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
        orderType: orders.orderType,
        paymentMethod: orders.paymentMethod
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(or(
        eq(orders.paymentMethod, 'credit'),
        eq(orders.paymentMethod, 'account')
      ))
      .orderBy(desc(orders.createdAt));

      // Format the results
      return unpaidOrders.map(order => ({
        id: order.id,
        customerId: order.customerId,
        customerName: `${order.customerName || ''} ${order.customerLastName || ''}`.trim() || order.customerCompany || 'Unknown Customer',
        amount: parseFloat(order.total?.toString() || '0'),
        status: order.status,
        createdAt: order.createdAt,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod
      }));
    } catch (error) {
      console.error('Error fetching on-account orders:', error);
      return [];
    }
  }

  async getNotificationSettings(userId: string): Promise<any> {
    try {
      const [settings] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, userId))
        .limit(1);

      return settings || null;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  async updateNotificationSettings(userId: string, settings: any): Promise<void> {
    try {
      // First try to update existing settings
      const result = await db
        .update(notificationSettings)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(notificationSettings.userId, userId));

      // If no rows were updated, insert new settings
      if (result.rowCount === 0) {
        await db
          .insert(notificationSettings)
          .values({
            userId,
            ...settings,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  // Draft Orders operations - for saving incomplete orders
  async createDraftOrder(data: {
    customerId: string;
    items: { productId: number; quantity: number; price: number; }[];
    deliveryAddressId?: number;
    notes?: string;
    name?: string;
  }): Promise<any> {
    try {
      // Import the draft orders and items tables
      const { draftOrders, draftOrderItems } = await import("../shared/schema");

      const [draftOrder] = await db
        .insert(draftOrders)
        .values({
          customerId: data.customerId,
          deliveryAddressId: data.deliveryAddressId,
          notes: data.notes || '',
          name: data.name || `Draft Order ${new Date().toLocaleDateString()}`,
          totalAmount: data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          createdAt: new Date(),
          lastModified: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        })
        .returning();

      // Add items to draft order
      if (data.items.length > 0) {
        await db.insert(draftOrderItems).values(
          data.items.map(item => ({
            draftOrderId: draftOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        );
      }

      return draftOrder;
    } catch (error) {
      console.error('Error creating draft order:', error);
      throw error;
    }
  }

  async getDraftOrders(customerId: string): Promise<any[]> {
    try {
      const { draftOrders, draftOrderItems } = await import("../shared/schema");

      const drafts = await db
        .select()
        .from(draftOrders)
        .where(eq(draftOrders.customerId, customerId))
        .orderBy(desc(draftOrders.updatedAt));

      // Get items for each draft
      const draftsWithItems = await Promise.all(
        drafts.map(async (draft) => {
          const items = await db
            .select({
              id: draftOrderItems.id,
              productId: draftOrderItems.productId,
              quantity: draftOrderItems.quantity,
              price: draftOrderItems.price,
              productName: products.name,
              productImage: products.imageUrl
            })
            .from(draftOrderItems)
            .leftJoin(products, eq(draftOrderItems.productId, products.id))
            .where(eq(draftOrderItems.draftOrderId, draft.id));

          return { ...draft, items };
        })
      );

      return draftsWithItems;
    } catch (error) {
      console.error('Error getting draft orders:', error);
      return [];
    }
  }

  async getDraftOrderById(id: number): Promise<any> {
    try {
      const { draftOrders, draftOrderItems } = await import("../shared/schema");

      const [draft] = await db
        .select()
        .from(draftOrders)
        .where(eq(draftOrders.id, id));

      if (!draft) return null;

      const items = await db
        .select({
          id: draftOrderItems.id,
          productId: draftOrderItems.productId,
          quantity: draftOrderItems.quantity,
          price: draftOrderItems.price,
          productName: products.name,
          productImage: products.imageUrl
        })
        .from(draftOrderItems)
        .leftJoin(products, eq(draftOrderItems.productId, products.id))
        .where(eq(draftOrderItems.draftOrderId, id));

      return { ...draft, items };
    } catch (error) {
      console.error('Error getting draft order by ID:', error);
      return null;
    }
  }

  async updateDraftOrder(id: number, data: any): Promise<any> {
    try {
      const { draftOrders } = await import("../shared/schema");

      const [updated] = await db
        .update(draftOrders)
        .set({
          ...data,
          lastModified: new Date()
        })
        .where(eq(draftOrders.id, id))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating draft order:', error);
      throw error;
    }
  }

  async deleteDraftOrder(id: number): Promise<void> {
    try {
      const { draftOrders, draftOrderItems } = await import("../shared/schema");

      // Delete items first
      await db.delete(draftOrderItems).where(eq(draftOrderItems.draftOrderId, id));

      // Then delete the draft order
      await db.delete(draftOrders).where(eq(draftOrders.id, id));
    } catch (error) {
      console.error('Error deleting draft order:', error);
      throw error;
    }
  }

  async addDraftOrderItem(draftOrderId: number, productId: number, quantity: number, price: number): Promise<any> {
    try {
      const { draftOrderItems } = await import("../shared/schema");

      const [item] = await db
        .insert(draftOrderItems)
        .values({
          draftOrderId,
          productId,
          quantity,
          price
        })
        .returning();

      return item;
    } catch (error) {
      console.error('Error adding draft order item:', error);
      throw error;
    }
  }

  async updateDraftOrderItem(itemId: number, quantity: number): Promise<any> {
    try {
      const { draftOrderItems } = await import("../shared/schema");

      const [updated] = await db
        .update(draftOrderItems)
        .set({ quantity })
        .where(eq(draftOrderItems.id, itemId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating draft order item:', error);
      throw error;
    }
  }

  async removeDraftOrderItem(itemId: number): Promise<void> {
    try {
      const { draftOrderItems } = await import("../shared/schema");

      await db.delete(draftOrderItems).where(eq(draftOrderItems.id, itemId));
    } catch (error) {
      console.error('Error removing draft order item:', error);
      throw error;
    }
  }

  async convertDraftToOrder(draftOrderId: number): Promise<any> {
    try {
      const draft = await this.getDraftOrderById(draftOrderId);
      if (!draft) throw new Error('Draft order not found');

      // Create actual order
      const orderData = {
        customerId: draft.customerId,
        status: 'pending',
        total: draft.totalAmount,
        deliveryAddressId: draft.deliveryAddressId,
        notes: draft.notes
      };

      const order = await this.createOrder(orderData, draft.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })));

      // Delete the draft order
      await this.deleteDraftOrder(draftOrderId);

      return order;
    } catch (error) {
      console.error('Error converting draft to order:', error);
      throw error;
    }
  }

  // Wishlist operations - for saving favorite products
  async addToWishlist(customerId: string, productId: number, priceWhenAdded: number, notes?: string): Promise<any> {
    try {
      const { wishlistItems } = await import("../shared/schema");

      const [item] = await db
        .insert(wishlistItems)
        .values({
          customerId,
          productId,
          priceWhenAdded,
          notes: notes || '',
          createdAt: new Date()
        })
        .returning();

      return item;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  }

  async removeFromWishlist(customerId: string, productId: number): Promise<void> {
    try {
      const { wishlistItems } = await import("../shared/schema");

      await db
        .delete(wishlistItems)
        .where(
          and(
            eq(wishlistItems.customerId, customerId),
            eq(wishlistItems.productId, productId)
          )
        );
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }

  async getWishlist(customerId: string): Promise<any[]> {
    try {
      const { wishlistItems } = await import("../shared/schema");

      const wishlist = await db
        .select({
          id: wishlistItems.id,
          productId: wishlistItems.productId,
          priceWhenAdded: wishlistItems.priceWhenAdded,
          notes: wishlistItems.notes,
          createdAt: wishlistItems.createdAt,
          productName: products.name,
          productImage: products.imageUrl,
          currentPrice: products.price1, // Default price
          isOnSale: sql<boolean>`${products.price1} < ${wishlistItems.priceWhenAdded}`
        })
        .from(wishlistItems)
        .leftJoin(products, eq(wishlistItems.productId, products.id))
        .where(eq(wishlistItems.customerId, customerId))
        .orderBy(desc(wishlistItems.createdAt));

      return wishlist;
    } catch (error) {
      console.error('Error getting wishlist:', error);
      return [];
    }
  }

  async clearWishlist(customerId: string): Promise<void> {
    try {
      const { wishlistItems } = await import("../shared/schema");

      await db.delete(wishlistItems).where(eq(wishlistItems.customerId, customerId));
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      throw error;
    }
  }

  async updateWishlistItemNotes(customerId: string, productId: number, notes: string): Promise<any> {
    try {
      const { wishlistItems } = await import("../shared/schema");

      const [updated] = await db
        .update(wishlistItems)
        .set({ notes })
        .where(
          and(
            eq(wishlistItems.customerId, customerId),
            eq(wishlistItems.productId, productId)
          )
        )
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating wishlist item notes:', error);
      throw error;
    }
  }

  // Order Templates operations - for saving recurring order patterns
  async createOrderTemplate(data: {
    customerId: string;
    name: string;
    description?: string;
    items: { productId: number; quantity: number; }[];
    deliveryAddressId?: number;
  }): Promise<any> {
    try {
      const { orderTemplates, orderTemplateItems } = await import("../shared/schema");

      const [template] = await db
        .insert(orderTemplates)
        .values({
          customerId: data.customerId,
          name: data.name,
          description: data.description || '',
          deliveryAddressId: data.deliveryAddressId,
          useCount: 0,
          createdAt: new Date(),
          lastUsed: null
        })
        .returning();

      // Add items to template
      if (data.items.length > 0) {
        await db.insert(orderTemplateItems).values(
          data.items.map(item => ({
            templateId: template.id,
            productId: item.productId,
            quantity: item.quantity
          }))
        );
      }

      return template;
    } catch (error) {
      console.error('Error creating order template:', error);
      throw error;
    }
  }

  async getOrderTemplates(customerId: string): Promise<any[]> {
    try {
      const { orderTemplates, orderTemplateItems } = await import("../shared/schema");

      const templates = await db
        .select()
        .from(orderTemplates)
        .where(eq(orderTemplates.customerId, customerId))
        .orderBy(desc(orderTemplates.lastUsed), desc(orderTemplates.createdAt));

      // Get items for each template
      const templatesWithItems = await Promise.all(
        templates.map(async (template) => {
          const items = await db
            .select({
              id: orderTemplateItems.id,
              productId: orderTemplateItems.productId,
              quantity: orderTemplateItems.quantity,
              productName: products.name,
              productImage: products.imageUrl,
              currentPrice: products.price1
            })
            .from(orderTemplateItems)
            .leftJoin(products, eq(orderTemplateItems.productId, products.id))
            .where(eq(orderTemplateItems.templateId, template.id));

          return { ...template, items };
        })
      );

      return templatesWithItems;
    } catch (error) {
      console.error('Error getting order templates:', error);
      return [];
    }
  }

  async getOrderTemplateById(id: number): Promise<any> {
    try {
      const { orderTemplates, orderTemplateItems } = await import("../shared/schema");

      const [template] = await db
        .select()
        .from(orderTemplates)
        .where(eq(orderTemplates.id, id));

      if (!template) return null;

      const items = await db
        .select({
          id: orderTemplateItems.id,
          productId: orderTemplateItems.productId,
          quantity: orderTemplateItems.quantity,
          productName: products.name,
          productImage: products.imageUrl,
          currentPrice: products.price1
        })
        .from(orderTemplateItems)
        .leftJoin(products, eq(orderTemplateItems.productId, products.id))
        .where(eq(orderTemplateItems.templateId, id));

      return { ...template, items };
    } catch (error) {
      console.error('Error getting order template by ID:', error);
      return null;
    }
  }

  async updateOrderTemplate(id: number, data: any): Promise<any> {
    try {
      const { orderTemplates } = await import("../shared/schema");

      const [updated] = await db
        .update(orderTemplates)
        .set(data)
        .where(eq(orderTemplates.id, id))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating order template:', error);
      throw error;
    }
  }

  async deleteOrderTemplate(id: number): Promise<void> {
    try {
      const { orderTemplates, orderTemplateItems } = await import("../shared/schema");

      // Delete items first
      await db.delete(orderTemplateItems).where(eq(orderTemplateItems.templateId, id));

      // Then delete the template
      await db.delete(orderTemplates).where(eq(orderTemplates.id, id));
    } catch (error) {
      console.error('Error deleting order template:', error);
      throw error;
    }
  }

  async addOrderTemplateItem(templateId: number, productId: number, quantity: number): Promise<any> {
    try {
      const { orderTemplateItems } = await import("../shared/schema");

      const [item] = await db
        .insert(orderTemplateItems)
        .values({
          templateId,
          productId,
          quantity
        })
        .returning();

      return item;
    } catch (error) {
      console.error('Error adding order template item:', error);
      throw error;
    }
  }

  async updateOrderTemplateItem(itemId: number, quantity: number): Promise<any> {
    try {
      const { orderTemplateItems } = await import("../shared/schema");

      const [updated] = await db
        .update(orderTemplateItems)
        .set({ quantity })
        .where(eq(orderTemplateItems.id, itemId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating order template item:', error);
      throw error;
    }
  }

  async removeOrderTemplateItem(itemId: number): Promise<void> {
    try {
      const { orderTemplateItems } = await import("../shared/schema");

      await db.delete(orderTemplateItems).where(eq(orderTemplateItems.id, itemId));
    } catch (error) {
      console.error('Error removing order template item:', error);
      throw error;
    }
  }

  async useOrderTemplate(templateId: number): Promise<any> {
    try {
      const { orderTemplates } = await import("../shared/schema");

      const [updated] = await db
        .update(orderTemplates)
        .set({
          useCount: sql`${orderTemplates.useCount} + 1`,
          lastUsed: new Date()
        })
        .where(eq(orderTemplates.id, templateId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error using order template:', error);
      throw error;
    }
  }

  // AI Suggestions operations - for caching AI-generated recommendations
  async cacheAISuggestions(cacheKey: string, suggestionType: string, inputData: any, suggestions: any, expirationHours: number): Promise<any> {
    try {
      const { aiSuggestions } = await import("../shared/schema");
      const { sql } = await import("drizzle-orm");

      // Use ON CONFLICT to handle duplicate cache keys
      const [cached] = await db
        .insert(aiSuggestions)
        .values({
          cacheKey,
          suggestionType,
          inputData: JSON.stringify(inputData),
          suggestions: JSON.stringify(suggestions),
          expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: aiSuggestions.cacheKey,
          set: {
            suggestions: JSON.stringify(suggestions),
            expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
            createdAt: new Date()
          }
        })
        .returning();

      return cached;
    } catch (error) {
      console.error('Error caching AI suggestions:', error);
      throw error;
    }
  }

  async getAISuggestions(cacheKey: string): Promise<any> {
    try {
      const { aiSuggestions } = await import("../shared/schema");

      const [cached] = await db
        .select()
        .from(aiSuggestions)
        .where(
          and(
            eq(aiSuggestions.cacheKey, cacheKey),
            sql`${aiSuggestions.expiresAt} > NOW()`
          )
        )
        .orderBy(desc(aiSuggestions.createdAt))
        .limit(1);

      if (cached) {
        try {
          // Handle both string and object formats safely
          const inputData = typeof cached.inputData === 'string' 
            ? JSON.parse(cached.inputData) 
            : cached.inputData;

          const suggestions = typeof cached.suggestions === 'string'
            ? JSON.parse(cached.suggestions)
            : cached.suggestions;

          return {
            ...cached,
            inputData,
            suggestions
          };
        } catch (parseError) {
          console.error('Error parsing cached AI suggestions, returning fresh data:', parseError);
          return null; // Force fresh generation
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return null;
    }
  }

  async getTrendingProducts(): Promise<any[]> {
    try {
      const { products, orderItems, orders } = await import("../shared/schema");
      const { desc, count, eq, gte, sql } = await import("drizzle-orm");

      // Get products ordered in the last 30 days, sorted by order frequency
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const trendingProducts = await db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          brand: products.brand,
          orderCount: count(orderItems.productId).as('order_count')
        })
        .from(products)
        .innerJoin(orderItems, eq(products.id, orderItems.productId))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(gte(orders.createdAt, thirtyDaysAgo))
        .groupBy(products.id, products.name, products.price, products.brand)
        .orderBy(desc(count(orderItems.productId)))
        .limit(10);

      return trendingProducts;
    } catch (error) {
      console.error('Error getting trending products:', error);
      return [];
    }
  }

  async getProductsByIds(productIds: number[]): Promise<any[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      const result = await db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      return result;
    } catch (error) {
      console.error('Error getting products by IDs:', error);
      return [];
    }
  }

  async clearExpiredAISuggestions(): Promise<void> {
    try {
      const { aiSuggestions } = await import("../shared/schema");

      await db
        .delete(aiSuggestions)
        .where(sql`${aiSuggestions.expiresAt} <= NOW()`);
    } catch (error) {
      console.error('Error clearing expired AI suggestions:', error);
      throw error;
    }
  }

  // AI Recommendation Tracking implementation
  async trackAIRecommendation(data: any): Promise<any> {
    try {
      const { aiRecommendationTracking } = await import("../shared/schema");

      const [tracked] = await db
        .insert(aiRecommendationTracking)
        .values({
          customerId: data.customerId,
          sessionId: data.sessionId,
          recommendationType: data.recommendationType,
          suggestedProductId: data.suggestedProductId,
          suggestedProductName: data.suggestedProductName,
          suggestedPrice: data.suggestedPrice,
          suggestionContext: data.suggestionContext,
          isViewed: true,
          createdAt: new Date()
        })
        .returning();

      return tracked;
    } catch (error) {
      console.error('Error tracking AI recommendation:', error);
      throw error;
    }
  }

  async updateAIRecommendationAction(trackingId: number, action: 'clicked' | 'added_to_cart' | 'purchased', orderId?: number): Promise<any> {
    try {
      const { aiRecommendationTracking } = await import("../shared/schema");

      const now = new Date();
      const updateData: any = {};

      if (action === 'clicked') {
        updateData.isClicked = true;
        updateData.clickedAt = now;
      } else if (action === 'added_to_cart') {
        updateData.isAddedToCart = true;
        updateData.addedToCartAt = now;
      } else if (action === 'purchased') {
        updateData.isPurchased = true;
        updateData.purchasedAt = now;
        if (orderId) updateData.orderId = orderId;
      }

            const [updated] = await db
        .update(aiRecommendationTracking)
        .set(updateData)
        .where(eq(aiRecommendationTracking.id, trackingId))
        .returning();

      return updated;
    } catch (error) {
      console.error('Error updating AI recommendation action:', error);
      throw error;
    }
  }

  async getAIRecommendationStats(timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<any> {
    try {
      // Return default stats since AI recommendation tracking is not yet implemented
      console.log('AI recommendation tracking not yet implemented, returning default stats');
      return {
        timeframe,
        overall: {
          totalViewed: 0,
          totalClicked: 0,
          totalAddedToCart: 0,
          totalPurchased: 0,
          clickThroughRate: "0.0",
          cartConversionRate: "0.0",
          purchaseConversionRate: "0.0"
        },
        byType: [
          {
            recommendationType: "trending",
            totalViewed: 0,
            totalClicked: 0,
            totalAddedToCart: 0,
            totalPurchased: 0,
            clickThroughRate: "0.0",
            cartConversionRate: "0.0",
            purchaseConversionRate: "0.0"
          },
          {
            recommendationType: "personalized",
            totalViewed: 0,
            totalClicked: 0,
            totalAddedToCart: 0,
            totalPurchased: 0,
            clickThroughRate: "0.0",
            cartConversionRate: "0.0",
            purchaseConversionRate: "0.0"
          }
        ]
      };
    } catch (error) {
      console.error('Error getting AI recommendation stats:', error);
      // Return default structure on any error
      return {
        timeframe,
        overall: {
          totalViewed: 0,
          totalClicked: 0,
          totalAddedToCart: 0,
          totalPurchased: 0,
          clickThroughRate: "0.0",
          cartConversionRate: "0.0",
          purchaseConversionRate: "0.0"
        },
        byType: []
      };
    }
  }

  async getAIRecommendationConversionRate(recommendationType?: string): Promise<any> {
    try {
      const { aiRecommendationTracking } = await import("../shared/schema");

      let query = db
        .select({
          totalViewed: count(),
          totalClicked: sql<number>`sum(case when ${aiRecommendationTracking.isClicked} then 1 else 0 end)`,
          totalAddedToCart: sql<number>`sum(case when ${aiRecommendationTracking.isAddedToCart} then 1 else 0 end)`,
          totalPurchased: sql<number>`sum(case when ${aiRecommendationTracking.isPurchased} then 1 else 0 end)`
        })
        .from(aiRecommendationTracking);

      if (recommendationType) {
        query = query.where(eq(aiRecommendationTracking.recommendationType, recommendationType));
      }

      const [result] = await query;
      const stats = result || { totalViewed: 0, totalClicked: 0, totalAddedToCart: 0, totalPurchased: 0 };

      return {
        recommendationType: recommendationType || 'all',
        ...stats,
        clickThroughRate: stats.totalViewed > 0 ? ((stats.totalClicked / stats.totalViewed) * 100) : 0,
        cartConversionRate: stats.totalViewed > 0 ? ((stats.totalAddedToCart / stats.totalViewed) * 100) : 0,
        purchaseConversionRate: stats.totalViewed > 0 ? ((stats.totalPurchased / stats.totalViewed) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting AI recommendation conversion rate:', error);
      throw error;
    }
  }

  async getTopPerformingAIRecommendations(limit: number = 10): Promise<any> {
    try {
      // Return sample top-performing products from actual inventory
      console.log('AI recommendation tracking not yet implemented, returning sample top products');

      const topProducts = await db
        .select({
          productId: products.id,
          productName: products.name,
          currentPrice: products.price,
          productImage: products.imageUrl
        })
        .from(products)
        .where(and(
          not(products.isDeleted),
          gte(products.price, 10)
        ))
        .orderBy(desc(products.price))
        .limit(limit);

      return topProducts.map((product: any) => ({
        productId: product.productId,
        productName: product.productName,
        totalViewed: 0,
        totalClicked: 0,
        totalAddedToCart: 0,
        totalPurchased: 0,
        currentPrice: product.currentPrice,
        productImage: product.productImage,
        clickThroughRate: "0.0",
        cartConversionRate: "0.0",
        purchaseConversionRate: "0.0"
      }));
    } catch (error) {
      console.error('Error getting top performing AI recommendations:', error);
      // Return empty array on error
      return [];
    }
  }

  // Archive methods
  async archiveProduct(productId: number, username?: string): Promise<void> {
    await db.update(products).set({ 
      archived: true,
      archivedAt: new Date(),
      archivedBy: username || 'unknown'
    }).where(eq(products.id, productId));
  }

  async unarchiveProduct(productId: number): Promise<void> {
    await db.update(products).set({ 
      archived: false,
      archivedAt: null,
      archivedBy: null
    }).where(eq(products.id, productId));
  }

  // Sales Analytics methods
  async getProductSalesAnalytics(productId: number): Promise<{
    totalSold: number;
    totalRevenue: number;
    averageOrderValue: number;
    salesTrend: string;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      totalOrders: number;
      totalSpent: number;
    }>;
    monthlySales: Array<{
      month: string;
      quantity: number;
      revenue: number;
    }>;
  }> {
    try {
      // Get total sales data
      const salesData = await db.execute(sql`
        SELECT 
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
          COALESCE(AVG(oi.price * oi.quantity), 0) as avg_order_value,
          COUNT(DISTINCT o.id) as total_orders
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ${productId}
        AND o.status != 'cancelled'
      `);

      // Get top customers
      const topCustomers = await db.execute(sql`
        SELECT 
          o.customer_id,
          u.username as customer_name,
          COUNT(DISTINCT o.id) as total_orders,
          SUM(oi.price * oi.quantity) as total_spent
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        LEFT JOIN users u ON o.customer_id = u.id
        WHERE oi.product_id = ${productId}
        AND o.status != 'cancelled'
        GROUP BY o.customer_id, u.username
        ORDER BY total_spent DESC
        LIMIT 5
      `);

      // Get monthly sales trend
      const monthlySales = await db.execute(sql`
        SELECT 
          TO_CHAR(o.created_at, 'YYYY-MM') as month,
          SUM(oi.quantity) as quantity,
          SUM(oi.price * oi.quantity) as revenue
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ${productId}
        AND o.status != 'cancelled'
        AND o.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
        ORDER BY month DESC
      `);

      // Calculate sales trend (comparing last 30 days to previous 30 days)
      const trendData = await db.execute(sql`
        SELECT 
          SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '30 days' THEN oi.quantity ELSE 0 END) as recent_sales,
          SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '60 days' AND o.created_at < NOW() - INTERVAL '30 days' THEN oi.quantity ELSE 0 END) as previous_sales
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE oi.product_id = ${productId}
        AND o.status != 'cancelled'
      `);

      const sales = salesData.rows[0] || {};
      const trend = trendData.rows[0] || {};

      let salesTrend = "stable";
      if (trend.recent_sales > trend.previous_sales) {
        salesTrend = "increasing";
      } else if (trend.recent_sales < trend.previous_sales) {
        salesTrend = "decreasing";
      }

      return {
        totalSold: Number(sales.total_sold) || 0,
        totalRevenue: Number(sales.total_revenue) || 0,
        averageOrderValue: Number(sales.avg_order_value) || 0,
        salesTrend,
        topCustomers: topCustomers.rows.map(row => ({
          customerId: row.customer_id,
          customerName: row.customer_name || 'Unknown',
          totalOrders: Number(row.total_orders) || 0,
          totalSpent: Number(row.total_spent) || 0
        })),
        monthlySales: monthlySales.rows.map(row => ({
          month: row.month,
          quantity: Number(row.quantity) || 0,
          revenue: Number(row.revenue) || 0
        }))
      };
    } catch (error) {
      console.error('Error getting product sales analytics:', error);
      return {
        totalSold: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        salesTrend: "stable",
        topCustomers: [],
        monthlySales: []
      };
    }
  }

  // Get all staff and admin users for notifications
  async getAllStaffAndAdminUsers(): Promise<User[]> {
    try {
      const staffAndAdminUsers = await db
        .select()
        .from(users)
        .where(or(
          eq(users.isAdmin, true),
          eq(users.isEmployee, true)
        ));

      return staffAndAdminUsers;
    } catch (error) {
      console.error('Error fetching staff and admin users:', error);
      return [];
    }
  }



  // Get delivery address by ID for notifications
    // REMOVED DUPLICATE: getDeliveryAddressById method


  // AI Purchase Order Suggestions methods
  async storeAIPurchaseOrderSuggestions(purchaseOrderId: number, suggestions: any[]): Promise<void> {
    try {
      const { aiPurchaseOrderSuggestions } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      // Clear existing suggestions for this purchase order
      await db.delete(aiPurchaseOrderSuggestions)
        .where(eq(aiPurchaseOrderSuggestions.purchaseOrderId, purchaseOrderId));

      // Insert new suggestions
      for (const suggestion of suggestions) {
        await db.insert(aiPurchaseOrderSuggestions).values({
          purchaseOrderId,
          productName: suggestion.productName,
          productData: suggestion.productData,
          mappingCandidates: suggestion.mappingCandidates || null,
          confidenceAnalysis: suggestion.confidenceAnalysis || null,
          needsApproval: suggestion.needsApproval || true,
          recommendCreateNew: suggestion.recommendCreateNew || false,
          suggestedCategoryId: suggestion.suggestedCategoryId || null,
          suggestedCategoryName: suggestion.suggestedCategoryName || null,
          availableCategories: suggestion.availableCategories || null,
        });
      }

      console.log(`✅ Stored ${suggestions.length} AI suggestions in database for purchase order [REDACTED]`);
    } catch (error) {
      console.error('Error storing AI purchase order suggestions:', error);
      throw error;
    }
  }

  async getAIPurchaseOrderSuggestions(purchaseOrderId: number): Promise<any[]> {
    try {
      const { aiPurchaseOrderSuggestions } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');

      const suggestions = await db
        .select()
        .from(aiPurchaseOrderSuggestions)
        .where(eq(aiPurchaseOrderSuggestions.purchaseOrderId, purchaseOrderId));

      console.log(`📦 Retrieved ${suggestions.length} AI suggestions from database for purchase order [REDACTED]`);
      return suggestions;
    } catch (error) {
      console.error('Error retrieving AI purchase order suggestions:', error);
      return [];
    }
  }

  // AI Invoice Processing methods - duplicates removed, using proper Drizzle ORM methods below at line 4849

  async getAllProducts(): Promise<Product[]> {
    try {
      const allProducts = await db.select().from(products);
      return allProducts;
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      const allCategories = await db.select().from(categories);
      return allCategories;
    } catch (error) {
      console.error('Error getting all categories:', error);
      return [];
    }
  }

  async addItemToPurchaseOrder(purchaseOrderId: number, itemData: any): Promise<any> {
    try {
      const [result] = await db
        .insert(purchaseOrderItems)
        .values({
          purchaseOrderId,
          productId: itemData.productId,
          quantityOrdered: itemData.quantity,
          unitCost: itemData.unitCost,
          totalCost: itemData.totalCost,
          quantityReceived: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`✅ Added item to purchase order [REDACTED]`);
      return result[0];
    } catch (error) {
      console.error('Error adding item to purchase order:', error);
      throw error;
    }
  }

  async updateProductCost(productId: number, cost: number): Promise<any> {
    try {
      const [result] = await db
        .update(products)
        .set({ cost, updatedAt: new Date() })
        .where(eq(products.id, productId))
        .returning();

      console.log(`✅ Updated product [REDACTED] cost to ${cost}`);
      return result[0];
    } catch (error) {
      console.error('Error updating product cost:', error);
      throw error;
    }
  }

  // Receipt Management Methods
  async logReceipt(data: { orderId: number; customerEmail: string; sentAt: Date; sentBy: string }): Promise<Receipt> {
    try {
      const [receipt] = await db
        .insert(receipts)
        .values(data)
        .returning();

      console.log(`✅ Receipt logged for order [REDACTED]`);
      return receipt;
    } catch (error) {
      console.error('Error logging receipt:', error);
      throw error;
    }
  }

  async getReceiptByOrderId(orderId: number): Promise<Receipt | undefined> {
    try {
      const [receipt] = await db
        .select()
        .from(receipts)
        .where(eq(receipts.orderId, orderId))
        .limit(1);

      return receipt;
    } catch (error) {
      console.error('Error getting receipt by order ID:', error);
      throw error;
    }
  }

  async getReceiptsByCustomer(customerEmail: string): Promise<Receipt[]> {
    try {
      return await db
        .select()
        .from(receipts)
        .where(eq(receipts.customerEmail, customerEmail))
        .orderBy(desc(receipts.sentAt));
    } catch (error) {
      console.error('Error getting receipts by customer:', error);
      throw error;
    }
  }

  async getAllReceipts(): Promise<Receipt[]> {
    try {
      return await db
        .select()
        .from(receipts)
        .orderBy(desc(receipts.sentAt));
    } catch (error) {
      console.error('Error getting all receipts:', error);
      throw error;
    }
  }

  async getOrderWithItems(orderId: number): Promise<any> {
    try {
      // Get order with full details
      const order = await this.getOrderById(orderId);
      if (!order) {
        return null;
      }

      return order; // getOrderById already includes items
    } catch (error) {
      console.error('Error getting order with items:', error);
      throw error;
    }
  }

  // Loyalty Points Operations
  async awardLoyaltyPoints(userId: string, orderId: number, orderTotal: number, pointsRate?: number): Promise<void> {
    try {
      // Get loyalty rate from order settings if not provided
      let actualPointsRate = pointsRate;
      if (actualPointsRate === undefined) {
        const settings = await this.getOrderSettings();
        actualPointsRate = settings?.loyaltyPointsRate || 0.02; // Default to 2% if not set
      }

      // Calculate eligible order total by excluding items from categories that are excluded from loyalty
      const eligibleOrderTotal = await this.calculateLoyaltyEligibleOrderTotal(orderId, orderTotal);
      
      console.log(`🎯 [Loyalty Points] Order #[REDACTED]: Total $${orderTotal.toFixed(2)}, Eligible for loyalty: $${eligibleOrderTotal.toFixed(2)}`);

      // Calculate points earned only on eligible amount (configurable % of eligible total, excluding delivery fees)
      // Points are whole numbers where 1 point = $0.01, so multiply by 100 to convert dollars to points
      const pointsEarned = Math.round(eligibleOrderTotal * actualPointsRate * 100);

      // Only award points if there's an eligible amount
      if (pointsEarned > 0) {
        // Create loyalty transaction record
        await db.insert(loyaltyTransactions).values({
          userId,
          orderId,
          transactionType: 'earned',
          pointsAmount: pointsEarned,
          orderTotal: eligibleOrderTotal, // Store eligible amount, not total order amount
          pointsRate: actualPointsRate,
          description: `Points earned from order #${orderId} (excludes tobacco products)`,
          createdBy: 'system'
        });

        // Update user's total loyalty points
        await db.update(users)
          .set({
            loyaltyPoints: sql`loyalty_points + ${pointsEarned}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        console.log(`✅ Awarded ${pointsEarned} loyalty points to user [REDACTED] for order #[REDACTED] (eligible amount: $${eligibleOrderTotal.toFixed(2)})`);
      } else {
        console.log(`❌ No loyalty points awarded for order #[REDACTED] - no eligible items (tobacco products excluded)`);
        
        // Still create a transaction record for tracking
        await db.insert(loyaltyTransactions).values({
          userId,
          orderId,
          transactionType: 'earned',
          pointsAmount: 0,
          orderTotal: 0,
          pointsRate: actualPointsRate,
          description: `No points earned from order #${orderId} - tobacco products excluded from loyalty program`,
          createdBy: 'system'
        });
      }
    } catch (error) {
      console.error('Error awarding loyalty points:', error);
      throw error;
    }
  }

  // Calculate order total eligible for loyalty points (excluding categories marked as excludeFromLoyalty and excluding tax amounts)
  async calculateLoyaltyEligibleOrderTotal(orderId: number, fallbackTotal: number): Promise<number> {
    try {
      // Get order items with product and category information, including tax-related fields
      const orderItemsWithProducts = await db
        .select({
          orderItemId: orderItems.id,
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          basePrice: orderItems.basePrice,
          flatTaxAmount: orderItems.flatTaxAmount,
          hasIlTobaccoTax: orderItems.hasIlTobaccoTax,
          productName: products.name,
          categoryId: products.categoryId,
          categoryName: categories.name,
          excludeFromLoyalty: categories.excludeFromLoyalty,
          taxPercentage: products.taxPercentage
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(orderItems.orderId, orderId));

      // Calculate eligible total by excluding items from excluded categories AND excluding tax amounts
      let eligibleTotal = 0;
      let excludedTotal = 0;
      let taxAmountExcluded = 0;

      for (const item of orderItemsWithProducts) {
        const itemTotalWithTax = item.price * item.quantity;
        
        // Calculate base price without taxes
        let basePricePerUnit = item.basePrice || item.price;
        
        // If we have tax percentage, calculate the base price by removing the tax
        if (item.taxPercentage && item.taxPercentage > 0) {
          // Remove percentage tax from the price to get base price
          basePricePerUnit = item.price / (1 + (item.taxPercentage / 100));
        }
        
        // Calculate base total without flat taxes
        const baseTotalWithoutFlatTax = basePricePerUnit * item.quantity;
        
        // Subtract flat tax amount if present
        const flatTaxAmount = item.flatTaxAmount || 0;
        const baseTotal = baseTotalWithoutFlatTax - flatTaxAmount;
        
        // Calculate total tax amount excluded
        const totalTaxForItem = itemTotalWithTax - baseTotal;
        taxAmountExcluded += totalTaxForItem;
        
        if (item.excludeFromLoyalty === true) {
          excludedTotal += itemTotalWithTax;
          console.log(`🚫 [Loyalty Exclusion] Excluding ${item.productName} (${item.categoryName}) - $${itemTotalWithTax.toFixed(2)} (with tax)`);
        } else {
          // Use base price without taxes for loyalty calculation
          eligibleTotal += baseTotal;
          console.log(`✅ [Loyalty Eligible] Including ${item.productName} (${item.categoryName || 'No Category'}) - Base: $${baseTotal.toFixed(2)} (excluding $${totalTaxForItem.toFixed(2)} in taxes)`);
        }
      }

      console.log(`🧮 [Loyalty Calculation] Eligible (tax-free): $${eligibleTotal.toFixed(2)}, Excluded: $${excludedTotal.toFixed(2)}, Total Tax Excluded: $${taxAmountExcluded.toFixed(2)}`);

      return Math.max(0, eligibleTotal); // Ensure we don't return negative values
    } catch (error) {
      console.error('Error calculating loyalty eligible order total:', error);
      // Fallback to full order total if calculation fails, but try to exclude some taxes
      const adjustedFallback = fallbackTotal * 0.85; // Rough estimate excluding taxes
      console.log(`🔄 [Loyalty Fallback] Using adjusted fallback: $${adjustedFallback.toFixed(2)} (85% of total to roughly exclude taxes)`);
      return adjustedFallback;
    }
  }

  async redeemLoyaltyPoints(userId: string, pointsToRedeem: number, orderId?: number, redeemedBy?: string): Promise<{ success: boolean; message: string; newBalance: number; }> {
    try {
      // Validate redemption amount
      if (pointsToRedeem <= 0) {
        return { success: false, message: 'Invalid redemption amount', newBalance: 0 };
      }

      // Get current user loyalty points
      const currentPoints = await this.getUserLoyaltyPoints(userId);

      if (currentPoints < pointsToRedeem) {
        return { 
          success: false, 
          message: `Insufficient points. Available: ${currentPoints}, Requested: ${pointsToRedeem}`, 
          newBalance: currentPoints 
        };
      }

      // Create loyalty transaction record for redemption
      await db.insert(loyaltyTransactions).values({
        userId,
        orderId: orderId || null,
        transactionType: 'redeemed',
        pointsAmount: -pointsToRedeem, // Negative for redemption
        orderTotal: null,
        pointsRate: null,
        description: orderId ? `Points redeemed for order #${orderId}` : 'Points redeemed',
        createdBy: redeemedBy || 'customer'
      });

      // Update user's total loyalty points
      await db.update(users)
        .set({
          loyaltyPoints: sql`loyalty_points - ${pointsToRedeem}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      const newBalance = currentPoints - pointsToRedeem;
      console.log(`Redeemed ${pointsToRedeem} loyalty points for user [REDACTED]. New balance: ${newBalance}`);

      return { 
        success: true, 
        message: `Successfully redeemed ${pointsToRedeem} points`, 
        newBalance 
      };
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      return { success: false, message: 'Failed to redeem points', newBalance: 0 };
    }
  }

  async getUserLoyaltyPoints(userId: string): Promise<number> {
    try {
      const [user] = await db.select({ loyaltyPoints: users.loyaltyPoints })
        .from(users)
        .where(eq(users.id, userId));

      return user?.loyaltyPoints || 0;
    } catch (error) {
      console.error('Error getting user loyalty points:', error);
      return 0;
    }
  }

  async getLoyaltyTransactions(userId: string): Promise<any[]> {
    try {
      return await db.select({
        id: loyaltyTransactions.id,
        orderId: loyaltyTransactions.orderId,
        transactionType: loyaltyTransactions.transactionType,
        pointsAmount: loyaltyTransactions.pointsAmount,
        orderTotal: loyaltyTransactions.orderTotal,
        pointsRate: loyaltyTransactions.pointsRate,
        description: loyaltyTransactions.description,
        createdAt: loyaltyTransactions.createdAt,
        createdBy: loyaltyTransactions.createdBy
      })
        .from(loyaltyTransactions)
        .where(eq(loyaltyTransactions.userId, userId))
        .orderBy(desc(loyaltyTransactions.createdAt));
    } catch (error) {
      console.error('Error getting loyalty transactions:', error);
      return [];
    }
  }

  async getAllLoyaltyTransactions(): Promise<any[]> {
    try {
      return await db.select({
        id: loyaltyTransactions.id,
        userId: loyaltyTransactions.userId,
        orderId: loyaltyTransactions.orderId,
        transactionType: loyaltyTransactions.transactionType,
        pointsAmount: loyaltyTransactions.pointsAmount,
        orderTotal: loyaltyTransactions.orderTotal,
        pointsRate: loyaltyTransactions.pointsRate,
        description: loyaltyTransactions.description,
        createdAt: loyaltyTransactions.createdAt,
        createdBy: loyaltyTransactions.createdBy
      })
        .from(loyaltyTransactions)
        .orderBy(desc(loyaltyTransactions.createdAt));
    } catch (error) {
      console.error('Error getting all loyalty transactions:', error);
      return [];
    }
  }

  async addLoyaltyTransaction(transaction: any): Promise<void> {
    try {
      await db.insert(loyaltyTransactions)
        .values({
          userId: transaction.userId,
          orderId: transaction.orderId || null,
          transactionType: transaction.transactionType,
          pointsAmount: transaction.pointsAmount,
          pointsRate: transaction.pointsRate || 0.02,
          description: transaction.description,
          createdBy: transaction.createdBy || null
        });
      
      console.log('✅ Loyalty transaction added successfully');
    } catch (error) {
      console.error('❌ Error adding loyalty transaction:', error);
      throw error;
    }
  }

  // Email Campaign Management Methods
  async createEmailCampaign(data: InsertEmailCampaign): Promise<EmailCampaign> {
    try {
      const [campaign] = await db.insert(emailCampaigns)
        .values(data)
        .returning();
      return campaign;
    } catch (error) {
      console.error('Error creating email campaign:', error);
      throw error;
    }
  }

  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    try {
      return await db.select()
        .from(emailCampaigns)
        .orderBy(desc(emailCampaigns.createdAt));
    } catch (error) {
      console.error('Error getting email campaigns:', error);
      return [];
    }
  }

  async getEmailCampaignById(id: number): Promise<EmailCampaign | undefined> {
    try {
      const [campaign] = await db.select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, id));
      return campaign;
    } catch (error) {
      console.error('Error getting email campaign by id:', error);
      return undefined;
    }
  }

  async updateEmailCampaign(campaignId: number, updates: Partial<EmailCampaign>): Promise<EmailCampaign | undefined> {
    try {
      // Clean the updates object to handle date fields properly
      const cleanUpdates = { ...updates };

      // Convert date fields to proper Date objects if they exist
      if (cleanUpdates.sentAt && typeof cleanUpdates.sentAt === 'string') {
        cleanUpdates.sentAt = new Date(cleanUpdates.sentAt);
      }
      if (cleanUpdates.scheduledAt && typeof cleanUpdates.scheduledAt === 'string') {
        cleanUpdates.scheduledAt = new Date(cleanUpdates.scheduledAt);
      }

      // Remove undefined values that might cause issues
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === undefined) {
          delete cleanUpdates[key];
        }
      });

      const [updated] = await db.update(emailCampaigns)
        .set({
          ...cleanUpdates,
          updatedAt: new Date()
        })
        .where(eq(emailCampaigns.id, campaignId))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating email campaign:', error);
      return undefined;
    }
  }

  async deleteEmailCampaign(id: number): Promise<void> {
    try {
      await db.delete(emailCampaigns)
        .where(eq(emailCampaigns.id, id));
    } catch (error) {
      console.error('Error deleting email campaign:', error);
      throw error;
    }
  }

  async addCampaignRecipients(campaignId: number, userIds: string[]): Promise<void> {
    try {
      console.log('📧 Storage: Adding recipients to campaign', campaignId, 'with user IDs:', userIds);

      // Get user email addresses with marketing consent check
      const userEmails = await db.select({
        id: users.id,
        email: users.email,
        promotionalEmails: users.promotionalEmails,
        firstName: users.firstName,
        lastName: users.lastName
      })
        .from(users)
        .where(and(
          inArray(users.id, userIds),
          isNotNull(users.email)
        ));

      console.log('📧 Storage: Found user emails:', userEmails);

      if (userEmails.length === 0) {
        console.log('⚠️ Storage: No valid user emails found for IDs:', userIds);
        throw new Error('No users with valid email addresses found for the selected recipients');
      }

      // Clear existing recipients for this campaign first to avoid duplicates
      console.log('📧 Storage: Clearing existing recipients for campaign:', campaignId);
      await db.delete(emailCampaignRecipients)
        .where(eq(emailCampaignRecipients.campaignId, campaignId));

      // Filter recipients based on marketing email consent
      const eligibleUsers = userEmails.filter(user => {
        // Check if user has valid email
        if (!user.email || user.email.trim() === '') {
          console.log(`📧 Filtering out user ${user.id}: No valid email address`);
          return false;
        }
        
        // Check if user has opted into marketing emails
        // Check marketing consent - using promotionalEmails field
        const hasMarketingConsent = user.promotionalEmails === true;
        
        if (!hasMarketingConsent) {
          console.log(`📧 Filtering out user ${user.id} (${user.firstName} ${user.lastName}): Not opted into marketing emails`);
          return false;
        }
        
        return true;
      });

      console.log(`📧 Storage: Filtered ${userEmails.length} users down to ${eligibleUsers.length} with marketing consent`);

      // Insert recipients
      const recipients = eligibleUsers.map(user => ({
        campaignId,
        userId: user.id,
        email: user.email!
      }));

      console.log('📧 Storage: Prepared recipients for insertion:', recipients);

      if (recipients.length === 0) {
        console.log('⚠️ Storage: No valid recipients after filtering for marketing consent');
        throw new Error('No users with marketing email consent found. Users must opt-in to promotional emails in their account settings to receive marketing campaigns.');
      }

      console.log('📧 Storage: Inserting recipients into database...');
      await db.insert(emailCampaignRecipients)
        .values(recipients)
        .onConflictDoNothing(); // Handle any unique constraint issues
      console.log('✅ Storage: Recipients inserted successfully');

      // Update campaign recipient count
      console.log('📧 Storage: Updating campaign recipient count...');
      await db.update(emailCampaigns)
        .set({
          recipientCount: recipients.length,
          updatedAt: new Date()
        })
        .where(eq(emailCampaigns.id, campaignId));
      console.log('✅ Storage: Campaign recipient count updated to:', recipients.length);

    } catch (error) {
      console.error('❌ Storage error adding campaign recipients:', error);
      console.error('📋 Storage error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  }

  async getCampaignRecipients(campaignId: number): Promise<any[]> {
    try {
      return await db.select({
        id: emailCampaignRecipients.id,
        userId: emailCampaignRecipients.userId,
        email: emailCampaignRecipients.email,
        status: emailCampaignRecipients.status,
        sentAt: emailCampaignRecipients.sentAt,
        failureReason: emailCampaignRecipients.failureReason,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          company: users.company,
          preferredLanguage: users.preferredLanguage
        }
      })
        .from(emailCampaignRecipients)
        .leftJoin(users, eq(emailCampaignRecipients.userId, users.id))
        .where(eq(emailCampaignRecipients.campaignId, campaignId))
        .orderBy(emailCampaignRecipients.createdAt);
    } catch (error) {
      console.error('Error getting campaign recipients:', error);
      return [];
    }
  }

  async updateCampaignRecipientStatus(id: number, status: string, sentAt?: Date, failureReason?: string): Promise<void> {
    try {
      await db.update(emailCampaignRecipients)
        .set({
          status,
          sentAt,
          failureReason
        })
        .where(eq(emailCampaignRecipients.id, id));
    } catch (error) {
      console.error('Error updating campaign recipient status:', error);
      throw error;
    }
  }

  async getAllCustomerEmails(): Promise<{ id: string; email: string; firstName: string; lastName: string; company: string; preferredLanguage: string; }[]> {
    try {
      // Get all users and filter in JavaScript for better reliability
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        preferredLanguage: users.preferredLanguage,
        isAdmin: users.isAdmin,
        isEmployee: users.isEmployee
      }).from(users);

      // Filter customers (non-admin, non-employee, with email)
      const result = allUsers
        .filter(user => 
          user.isAdmin === false && 
          user.isEmployee === false && 
          user.email !== null && 
          user.email !== ''
        )
        .map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          preferredLanguage: user.preferredLanguage || 'en'
        }));

      return result;
    } catch (error) {
      console.error('Error getting customer emails:', error);
      return [];
    }
  }

  async getAllUserEmails(): Promise<{ id: string; email: string; firstName: string; lastName: string; company: string; preferredLanguage: string; hasMarketingConsent: boolean; isAdmin: boolean; isEmployee: boolean; }[]> {
    try {
      // Get all users (customers, staff, and admins) with emails for email campaigns
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        preferredLanguage: users.preferredLanguage,
        isAdmin: users.isAdmin,
        isEmployee: users.isEmployee,
        promotionalEmails: users.promotionalEmails
      }).from(users);

      // Filter ALL users (admin, employee, customer) with valid emails
      const result = allUsers
        .filter(user => 
          user.email !== null &&
          user.email !== ''
        )
        .map(user => {
          // Check marketing consent - using promotionalEmails field
          const hasMarketingConsent = user.promotionalEmails === true;
          
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            company: user.company,
            preferredLanguage: user.preferredLanguage || 'en',
            hasMarketingConsent,
            isAdmin: user.isAdmin || false,
            isEmployee: user.isEmployee || false
          };
        });

      return result;
    } catch (error) {
      console.error('Error getting all user emails:', error);
      return [];
    }
  }

  async getUsersWithMarketingConsent(): Promise<{ id: string; email: string; firstName: string; lastName: string; company: string; preferredLanguage: string; isAdmin: boolean; isEmployee: boolean; }[]> {
    try {
      // Get all users with marketing consent enabled
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        preferredLanguage: users.preferredLanguage,
        promotionalEmails: users.promotionalEmails,
        isAdmin: users.isAdmin,
        isEmployee: users.isEmployee
      }).from(users);

      // Filter users with valid emails and marketing consent
      const result = allUsers
        .filter(user => {
          if (!user.email || user.email.trim() === '') return false;
          
          // Check promotional emails field for marketing consent
          return user.promotionalEmails === true;
        })
        .map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          preferredLanguage: user.preferredLanguage || 'en',
          isAdmin: user.isAdmin || false,
          isEmployee: user.isEmployee || false
        }));

      console.log(`📧 Found ${result.length} users with marketing email consent`);
      return result;
    } catch (error) {
      console.error('Error getting users with marketing consent:', error);
      return [];
    }
  }

  async getAllUsersWithPurchaseHistory(): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    preferredLanguage: string;
    customerLevel: number;
    lastPurchaseDate: string | null;
    totalSpent: number;
    totalOrders: number;
    averageOrderValue: number;
    daysSinceLastPurchase: number | null;
    purchaseFrequency: string;
    mostBoughtCategory: string | null;
    lastOrderValue: number;
    registrationDate: string;
    hasMarketingConsent: boolean;
    isAdmin: boolean;
    isEmployee: boolean;
  }[]> {
    try {
      // Get all users with valid emails and notification preferences
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        company: users.company,
        preferredLanguage: users.preferredLanguage,
        customerLevel: users.customerLevel,
        registrationDate: users.createdAt,
        isAdmin: users.isAdmin,
        isEmployee: users.isEmployee,
        promotionalEmails: users.promotionalEmails
      }).from(users)
      .where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);

      // Get all orders for calculating purchase history
      const allOrders = await db.select({
        id: orders.id,
        userId: orders.userId,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt
      }).from(orders);

      // Calculate purchase history for each user
      const usersWithHistory = allUsers.map(user => {
        // Get orders for this user
        const userOrders = allOrders.filter(order => order.userId === user.id);
        const completedOrders = userOrders.filter(order => order.status === 'completed' || order.status === 'delivered');
        
        const totalOrders = completedOrders.length;
        const totalSpent = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        
        // Find last purchase date
        const sortedOrders = completedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastOrder = sortedOrders[0];
        const lastPurchaseDate = lastOrder ? lastOrder.createdAt : null;
        const lastOrderValue = lastOrder ? lastOrder.total || 0 : 0;
        
        // Calculate days since last purchase
        const daysSinceLastPurchase = lastPurchaseDate 
          ? Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Determine purchase frequency
        let purchaseFrequency = 'Never';
        if (user.isAdmin || user.isEmployee) {
          purchaseFrequency = 'Staff';
        } else if (totalOrders > 0) {
          if (daysSinceLastPurchase !== null) {
            if (daysSinceLastPurchase <= 30) {
              purchaseFrequency = 'Regular';
            } else if (daysSinceLastPurchase <= 90) {
              purchaseFrequency = 'Occasional';
            } else {
              purchaseFrequency = 'Rare';
            }
          }
        }
        
        // Check marketing consent - using promotionalEmails field
        const hasMarketingConsent = user.promotionalEmails === true;

        return {
          id: user.id,
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          company: user.company || '',
          preferredLanguage: user.preferredLanguage || 'en',
          customerLevel: user.customerLevel || (user.isAdmin ? 5 : user.isEmployee ? 4 : 1),
          lastPurchaseDate: lastPurchaseDate ? new Date(lastPurchaseDate).toISOString() : null,
          totalSpent: Math.round(totalSpent * 100) / 100, // Round to 2 decimal places
          totalOrders,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          daysSinceLastPurchase,
          purchaseFrequency,
          mostBoughtCategory: null, // Can be enhanced later
          lastOrderValue: Math.round(lastOrderValue * 100) / 100,
          registrationDate: user.registrationDate ? new Date(user.registrationDate).toISOString() : new Date().toISOString(),
          hasMarketingConsent,
          isAdmin: user.isAdmin || false,
          isEmployee: user.isEmployee || false
        };
      });

      return usersWithHistory;
    } catch (error) {
      console.error('Error getting users with purchase history:', error);
      return [];
    }
  }

  async startEmailCampaign(campaignId: number): Promise<void> {
    try {
      await db.update(emailCampaigns)
        .set({
          status: 'sending',
          updatedAt: new Date()
        })
        .where(eq(emailCampaigns.id, campaignId));
    } catch (error) {
      console.error('Error starting email campaign:', error);
      throw error;
    }
  }

  // Tax System Operations Implementation
  async getFlatTaxes(): Promise<FlatTax[]> {
    try {
      return await db.select().from(flatTaxes).orderBy(flatTaxes.name);
    } catch (error) {
      console.error('Error fetching flat taxes:', error);
      return [];
    }
  }

  async getFlatTax(id: number): Promise<FlatTax | undefined> {
    try {
      const [tax] = await db.select().from(flatTaxes).where(eq(flatTaxes.id, id));
      return tax;
    } catch (error) {
      console.error('Error fetching flat tax:', error);
      return undefined;
    }
  }

  async createFlatTax(data: InsertFlatTax): Promise<FlatTax> {
    try {
      const [tax] = await db.insert(flatTaxes).values(data).returning();
      return tax;
    } catch (error) {
      console.error('Error creating flat tax:', error);
      throw error;
    }
  }

  async updateFlatTax(id: number, data: Partial<InsertFlatTax>): Promise<FlatTax | undefined> {
    try {
      console.log('[STORAGE] Updating flat tax ID:', id, 'with data:', JSON.stringify(data, null, 2));
      
      // Clean the data to ensure proper types for dates
      const cleanData = { ...data };
      
      // Ensure dates are Date objects, not strings
      if (cleanData.createdAt && typeof cleanData.createdAt === 'string') {
        cleanData.createdAt = new Date(cleanData.createdAt);
      }
      if (cleanData.updatedAt && typeof cleanData.updatedAt === 'string') {
        cleanData.updatedAt = new Date(cleanData.updatedAt);
      }
      
      // Set the updated timestamp
      cleanData.updatedAt = new Date();
      
      const [updated] = await db
        .update(flatTaxes)
        .set(cleanData)
        .where(eq(flatTaxes.id, id))
        .returning();
        
      console.log('[STORAGE] Update result:', updated);
      return updated;
    } catch (error) {
      console.error('Error updating flat tax:', error);
      return undefined;
    }
  }

  async deleteFlatTax(id: number): Promise<void> {
    try {
      await db.delete(flatTaxes).where(eq(flatTaxes.id, id));
    } catch (error) {
      console.error('Error deleting flat tax:', error);
      throw error;
    }
  }

  // IL-TP1 Tobacco Sales Tracking Implementation
  async createIlTp1TobaccoSale(data: InsertIlTp1TobaccoSale): Promise<IlTp1TobaccoSale> {
    try {
      const [sale] = await db.insert(ilTp1TobaccoSales).values(data).returning();
      return sale;
    } catch (error) {
      console.error('Error creating IL-TP1 tobacco sale:', error);
      throw error;
    }
  }

  async getIlTp1TobaccoSales(dateRange?: { startDate: Date; endDate: Date }): Promise<IlTp1TobaccoSale[]> {
    try {
      let query = db.select().from(ilTp1TobaccoSales);
      
      if (dateRange) {
        query = query.where(
          and(
            gte(ilTp1TobaccoSales.saleDate, dateRange.startDate),
            lte(ilTp1TobaccoSales.saleDate, dateRange.endDate)
          )
        );
      }
      
      return await query.orderBy(desc(ilTp1TobaccoSales.saleDate));
    } catch (error) {
      console.error('Error fetching IL-TP1 tobacco sales:', error);
      return [];
    }
  }

  // Tax Calculation Auditing Implementation
  async createTaxCalculationAudit(data: InsertTaxCalculationAudit): Promise<TaxCalculationAudit> {
    try {
      const [audit] = await db.insert(taxCalculationAudits).values(data).returning();
      return audit;
    } catch (error) {
      console.error('Error creating tax calculation audit:', error);
      throw error;
    }
  }

  async getTaxCalculationAudits(orderId?: number): Promise<TaxCalculationAudit[]> {
    try {
      let query = db.select().from(taxCalculationAudits);
      
      if (orderId) {
        query = query.where(eq(taxCalculationAudits.orderId, orderId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching tax calculation audits:', error);
      return [];
    }
  }

  // Trusted Device Operations Implementation
  async getTrustedDevice(userId: string, deviceFingerprint: string): Promise<TrustedDevice | undefined> {
    try {
      const [device] = await db.select()
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceFingerprint, deviceFingerprint)
        ));
      return device;
    } catch (error) {
      console.error('Error getting trusted device:', error);
      return undefined;
    }
  }

  async addTrustedDevice(data: InsertTrustedDevice): Promise<TrustedDevice> {
    try {
      const [device] = await db.insert(trustedDevices)
        .values(data)
        .returning();
      return device;
    } catch (error) {
      console.error('Error adding trusted device:', error);
      throw error;
    }
  }

  async removeTrustedDevice(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      await db.delete(trustedDevices)
        .where(and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceFingerprint, deviceFingerprint)
        ));
    } catch (error) {
      console.error('Error removing trusted device:', error);
      throw error;
    }
  }

  async updateTrustedDeviceLastUsed(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      await db.update(trustedDevices)
        .set({ lastUsedAt: new Date() })
        .where(and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceFingerprint, deviceFingerprint)
        ));
    } catch (error) {
      console.error('Error updating trusted device last used:', error);
      throw error;
    }
  }

  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    try {
      return await db.select()
        .from(trustedDevices)
        .where(eq(trustedDevices.userId, userId))
        .orderBy(desc(trustedDevices.lastUsedAt));
    } catch (error) {
      console.error('Error getting trusted devices:', error);
      return [];
    }
  }

  async cleanupExpiredTrustedDevices(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await db.delete(trustedDevices)
        .where(lt(trustedDevices.createdAt, thirtyDaysAgo));
    } catch (error) {
      console.error('Error cleaning up expired trusted devices:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();