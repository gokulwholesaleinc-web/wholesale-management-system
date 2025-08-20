import { storage } from '../server/storage';
import { smsService } from '../server/services/smsService';
import { emailService } from '../server/services/emailService';
import { User, Order, OrderItem } from './schema';

export interface NotificationData {
  customerId: string;
  orderNumber?: string;
  orderId?: number;
  orderTotal?: number;
  orderStatus?: string;
  customerName?: string;
  orderItems?: OrderItem[];
  deliveryAddress?: string;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
  additionalData?: any;
  language?: string;
  preferredLanguage?: string;
  // Account approval specific fields
  username?: string;
  password?: string;
  businessName?: string;
  customerLevel?: number;
  creditLimit?: number;
}

export interface NotificationOptions {
  immediate?: boolean;
  includeInApp?: boolean;
  includeSMS?: boolean;
  includeEmail?: boolean;
  templateType?: 'order_confirmation' | 'staff_new_order_alert' | 'order_status_update' | 'order_note' | 'account_approved' | 'general';
}

export class NotificationRegistry {
  private static instance: NotificationRegistry;
  private smsService: typeof smsService;
  private emailService: typeof emailService;

  private constructor() {
    this.smsService = smsService;
    this.emailService = emailService;
  }

  static getInstance(): NotificationRegistry {
    if (!NotificationRegistry.instance) {
      NotificationRegistry.instance = new NotificationRegistry();
    }
    return NotificationRegistry.instance;
  }

  /**
   * UNIFIED CUSTOMER ORDER CONFIRMATION
   * Sends multilingual order confirmation to customer
   */
  async sendCustomerOrderConfirmation(
    customerId: string,
    order: Order,
    orderItems: OrderItem[],
    deliveryAddress?: string
  ): Promise<{ success: boolean; details: any }> {
    console.log(`📧 [Registry] Sending customer order confirmation for Order #${order.id}`);
    
    try {
      // Get customer with language preference
      const customer = await storage.getUser(customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      // CRITICAL: Always use customer's preferred language
      const customerLanguage = customer.preferredLanguage || 'en';
      console.log(`🌐 [Registry] Customer ${customer.username} language: ${customerLanguage}`);

      const notificationData: NotificationData = {
        customerId,
        orderNumber: order.id.toString(),
        orderId: order.id,
        orderTotal: order.total,
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username,
        orderItems,
        deliveryAddress: deliveryAddress || 'Pickup at store',
        language: customerLanguage, // CRITICAL: Pass customer's language
        preferredLanguage: customerLanguage
      };

      const options: NotificationOptions = {
        immediate: true,
        includeInApp: true,
        includeSMS: true, // SMS will be sent if email is enabled and customer has consent
        includeEmail: customer.emailNotifications || false,
        templateType: 'order_confirmation'
      };

      return await this.processNotification(customer, notificationData, options);
    } catch (error) {
      console.error('Error sending customer order confirmation:', error);
      return { success: false, details: { error: (error as Error).message } };
    }
  }

  /**
   * UNIFIED STAFF ORDER ALERT
   * Sends order alerts to all staff/admin users in their preferred languages
   */
  async sendStaffOrderAlert(
    order: Order,
    orderItems: OrderItem[],
    customer: User,
    deliveryAddress?: string
  ): Promise<{ success: boolean; details: any }> {
    console.log(`🚨 [Registry] Sending staff order alerts for Order #${order.id}`);
    
    try {
      // Get all staff and admin users
      const staffUsers = await storage.getAllStaffAndAdminUsers();
      console.log(`Found ${staffUsers.length} staff/admin users to notify`);

      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username;

      const results = await Promise.all(
        staffUsers.map(async (staff) => {
          // CRITICAL: Use each staff member's preferred language
          const staffLanguage = staff.preferredLanguage || 'en';
          console.log(`🌐 [Registry] Staff ${staff.username} language: ${staffLanguage}`);

          const notificationData: NotificationData = {
            customerId: customer.id,
            orderNumber: order.id.toString(),
            orderId: order.id,
            orderTotal: order.total,
            customerName,
            orderItems,
            deliveryAddress: deliveryAddress || 'Pickup at store',
            language: staffLanguage, // CRITICAL: Pass staff's language
            preferredLanguage: staffLanguage
          };

          const options: NotificationOptions = {
            immediate: true,
            includeInApp: true,
            includeSMS: true, // SMS will be sent if staff has email enabled and consent
            includeEmail: staff.emailNotifications || false,
            templateType: 'staff_new_order_alert'
          };

          return await this.processNotification(staff, notificationData, options);
        })
      );

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ [Registry] Staff notifications: ${successCount}/${staffUsers.length} successful`);

      return { 
        success: successCount > 0, 
        details: { 
          total: staffUsers.length, 
          successful: successCount,
          results 
        } 
      };
    } catch (error) {
      console.error('Error sending staff order alerts:', error);
      return { success: false, details: { error: (error as Error).message } };
    }
  }

  /**
   * UNIFIED ORDER STATUS UPDATE
   * Sends status updates to customers in their preferred language
   */
  async sendOrderStatusUpdate(
    customerId: string,
    order: Order,
    newStatus: string,
    oldStatus?: string
  ): Promise<{ success: boolean; details: any }> {
    console.log(`📱 [Registry] Sending order status update for Order #${order.id}: ${oldStatus} → ${newStatus}`);
    
    try {
      const customer = await storage.getUser(customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const customerLanguage = customer.preferredLanguage || 'en';

      const notificationData: NotificationData = {
        customerId,
        orderNumber: order.id.toString(),
        orderId: order.id,
        orderTotal: order.total,
        orderStatus: newStatus,
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username,
        language: customerLanguage,
        preferredLanguage: customerLanguage,
        additionalData: { oldStatus, newStatus }
      };

      const options: NotificationOptions = {
        immediate: true,
        includeInApp: true,
        includeSMS: customer.smsNotifications || false,
        includeEmail: customer.emailNotifications || false,
        templateType: 'order_status_update'
      };

      return await this.processNotification(customer, notificationData, options);
    } catch (error) {
      console.error('Error sending order status update:', error);
      return { success: false, details: { error: (error as Error).message } };
    }
  }

  /**
   * UNIFIED ORDER NOTE NOTIFICATION
   * Sends note notifications with proper language routing
   */
  async sendOrderNoteNotification(
    order: Order,
    note: string,
    fromUser: User,
    notifyCustomer: boolean = false
  ): Promise<{ success: boolean; details: any }> {
    console.log(`💬 [Registry] Sending order note notification for Order #${order.id}`);
    
    try {
      const results = [];

      if (notifyCustomer) {
        // Notify customer in their preferred language
        const customer = await storage.getUser(order.userId);
        if (customer) {
          const customerLanguage = customer.preferredLanguage || 'en';
          
          const customerData: NotificationData = {
            customerId: customer.id,
            orderNumber: order.id.toString(),
            orderId: order.id,
            customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username,
            language: customerLanguage,
            preferredLanguage: customerLanguage,
            additionalData: { note, fromUser: fromUser.username }
          };

          const customerOptions: NotificationOptions = {
            immediate: true,
            includeInApp: true,
            includeSMS: customer.smsNotifications || false,
            includeEmail: customer.emailNotifications || false,
            templateType: 'order_note'
          };

          const customerResult = await this.processNotification(customer, customerData, customerOptions);
          results.push({ type: 'customer', result: customerResult });
        }
      } else {
        // Notify staff in their preferred languages
        const staffUsers = await storage.getAllStaffAndAdminUsers();
        
        const staffResults = await Promise.all(
          staffUsers.map(async (staff) => {
            const staffLanguage = staff.preferredLanguage || 'en';
            
            const staffData: NotificationData = {
              customerId: order.userId,
              orderNumber: order.id.toString(),
              orderId: order.id,
              customerName: fromUser.username,
              language: staffLanguage,
              preferredLanguage: staffLanguage,
              additionalData: { note, fromUser: fromUser.username }
            };

            const staffOptions: NotificationOptions = {
              immediate: true,
              includeInApp: true,
              includeSMS: staff.smsNotifications || false,
              includeEmail: staff.emailNotifications || false,
              templateType: 'order_note'
            };

            return await this.processNotification(staff, staffData, staffOptions);
          })
        );

        results.push({ type: 'staff', results: staffResults });
      }

      return { success: true, details: { results } };
    } catch (error) {
      console.error('Error sending order note notification:', error);
      return { success: false, details: { error: (error as Error).message } };
    }
  }

  /**
   * ACCOUNT APPROVAL NOTIFICATION
   * Sends account approval notification with login credentials
   */
  async sendAccountApprovalNotification(
    customer: User,
    username: string,
    password: string,
    customerLevel: number,
    creditLimit: number
  ): Promise<{ success: boolean; details: any }> {
    console.log(`🎉 [Registry] Sending account approval notification to ${customer.email}`);
    
    try {
      const customerLanguage = customer.preferredLanguage || 'en';

      const notificationData: NotificationData = {
        customerId: customer.id,
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username,
        username,
        password,
        businessName: customer.businessName || undefined,
        customerLevel,
        creditLimit,
        language: customerLanguage,
        preferredLanguage: customerLanguage
      };

      const options: NotificationOptions = {
        immediate: true,
        includeInApp: false,
        includeSMS: false,
        includeEmail: true,
        templateType: 'account_approved'
      };

      return await this.processNotification(customer, notificationData, options);
    } catch (error) {
      console.error('Error sending account approval notification:', error);
      return { success: false, details: { error: (error as Error).message } };
    }
  }

  /**
   * CORE NOTIFICATION PROCESSOR - FIXED IN-APP NOTIFICATIONS
   * Handles all notification channels with proper language routing
   */
  private async processNotification(
    user: User,
    data: NotificationData,
    options: NotificationOptions
  ): Promise<{ success: boolean; details: any }> {
    console.log(`🔄 [Registry] Processing notification for ${user.username} (${user.id})`);
    console.log(`📋 [Registry] Options:`, {
      includeInApp: options.includeInApp,
      includeSMS: options.includeSMS,
      includeEmail: options.includeEmail,
      templateType: options.templateType
    });

    const results: any = {
      inApp: false,
      sms: false,
      email: false,
      errors: []
    };

    try {
      // 1. IN-APP NOTIFICATION - Only if enabled
      if (options.includeInApp) {
        console.log(`📱 [Registry] Creating in-app notification for ${user.username}...`);
        try {
          const inAppSuccess = await this.createInAppNotification(user, data, options.templateType || 'general');
          results.inApp = inAppSuccess;
          console.log(`📱 [Registry] In-app notification result: ${inAppSuccess ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.error(`❌ [Registry] In-app notification failed:`, error);
          results.errors.push(`In-app: ${(error as Error).message}`);
          results.inApp = false;
        }
      } else {
        console.log(`📱 [Registry] Skipping in-app notification (disabled)`);
        results.inApp = false;
      }

      // 2. SMS NOTIFICATION - Send whenever email is enabled OR explicitly requested
      if ((options.includeSMS || options.includeEmail) && user.phone) {
        console.log(`📱 [Registry] Attempting SMS notification for ${user.username} (${user.phone})`);
        try {
          const smsResult = await this.smsService.sendSMS(
            {
              to: user.phone,
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              orderTotal: data.orderTotal,
              orderStatus: data.orderStatus,
              deliveryTime: data.deliveryAddress,
              language: data.language, // Pass language to SMS service
              customData: data.additionalData
            },
            options.templateType || 'general'
          );
          results.sms = smsResult.success;
          console.log(`📱 [Registry] SMS notification result: ${smsResult.success ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.error(`❌ [Registry] SMS notification failed:`, error);
          results.errors.push(`SMS: ${(error as Error).message}`);
          results.sms = false;
        }
      } else if (!user.phone) {
        console.log(`📱 [Registry] Skipping SMS notification - no phone number for ${user.username}`);
        results.sms = false;
      }

      // 3. EMAIL NOTIFICATION
      if (options.includeEmail && (user.email || user.alternativeEmail)) {
        console.log(`📧 [Registry] Sending email notification to ${user.email || user.alternativeEmail}...`);
        try {
          const emailResult = await this.emailService.sendEmail(
            {
              to: user.email || user.alternativeEmail || '',
              customerName: data.customerName,
              orderNumber: data.orderNumber,
              orderTotal: data.orderTotal,
              orderStatus: data.orderStatus,
              orderItems: data.orderItems,
              deliveryAddress: data.deliveryAddress,
              language: data.language, // CRITICAL: Pass language to email service
              customData: data.additionalData,
              // Account approval specific data
              username: data.username,
              password: data.password,
              businessName: data.businessName,
              customerLevel: data.customerLevel,
              creditLimit: data.creditLimit
            },
            options.templateType || 'general'
          );
          results.email = emailResult;
          console.log(`📧 [Registry] Email notification result: ${emailResult ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.error(`❌ [Registry] Email notification failed:`, error);
          results.errors.push(`Email: ${(error as Error).message}`);
          results.email = false;
        }
      } else {
        console.log(`📧 [Registry] Skipping email notification - ${!options.includeEmail ? 'disabled' : 'no email address'}`);
        results.email = false;
      }

      const success = results.inApp || results.sms || results.email;
      console.log(`📊 [Registry] Notification results for ${user.username}:`, results);

      return { success, details: results };
    } catch (error) {
      console.error('Error processing notification:', error);
      return { success: false, details: { error: (error as Error).message, results } };
    }
  }

  /**
   * CREATE IN-APP NOTIFICATION - UNIFIED METHOD
   * Creates database notification entries using single storage method
   */
  private async createInAppNotification(
    user: User,
    data: NotificationData,
    templateType: string
  ): Promise<boolean> {
    try {
      const title = this.getNotificationTitle(templateType, data);
      const message = this.getNotificationMessage(templateType, data);

      console.log(`🔔 [Registry] Creating in-app notification for ${user.username} (${user.id}): ${title}`);

      const notification = await storage.createNotification({
        userId: user.id,
        type: templateType,
        title,
        message,
        orderId: data.orderId,
        data: JSON.stringify(data.additionalData || {}),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (notification) {
        console.log(`✅ [Registry] In-app notification created successfully for ${user.username}: ${title}`);
        return true;
      } else {
        console.error(`❌ [Registry] Failed to create in-app notification for ${user.username}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [Registry] Error creating in-app notification:', error);
      return false;
    }
  }

  private getNotificationTitle(templateType: string, data: NotificationData): string {
    switch (templateType) {
      case 'order_confirmation':
        return `Order #${data.orderNumber} Confirmed`;
      case 'staff_new_order_alert':
        return `New Order #${data.orderNumber}`;
      case 'order_status_update':
        return `Order #${data.orderNumber} ${data.orderStatus}`;
      case 'order_note':
        return `📝 New Note Added to Order #${data.orderNumber}`;
      default:
        return 'Notification';
    }
  }

  private getNotificationMessage(templateType: string, data: NotificationData): string {
    switch (templateType) {
      case 'order_confirmation':
        return `Your order for $${data.orderTotal?.toFixed(2)} has been confirmed and is being processed.`;
      case 'staff_new_order_alert':
        return `${data.customerName} placed a new order for $${data.orderTotal?.toFixed(2)}. Review and process the order.`;
      case 'order_status_update':
        return `Your order status has been updated to: ${data.orderStatus}`;
      case 'order_note':
        return `${data.additionalData?.fromUser || 'Staff'} added a note to your order: "${data.additionalData?.note || ''}"`;
      default:
        return 'You have a new notification';
    }
  }
}

// Export singleton instance
export const notificationRegistry = NotificationRegistry.getInstance();