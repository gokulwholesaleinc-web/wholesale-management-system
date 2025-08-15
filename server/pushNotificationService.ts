import webpush from 'web-push';
import { storage } from './storage';

// Configure web-push (these should be set as environment variables)
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLWw2E6ly-L-LDIk5L3iq3Pb7QtFcm9LV8L3O8HMoOMOhV2Q_7tR6tY',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'JzLfbEKvvQWHlFPF5XqEo2V-85-Jfp9sUNzW9aEuHgE'
};

webpush.setVapidDetails(
  'mailto:support@gokulwholesale.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
}

export class PushNotificationService {
  
  // Helper method to check if notification should be sent based on user preferences
  private shouldSendNotification(notificationType: string, settings: any): boolean {
    if (!settings) return true; // If no settings, default to allow all
    
    switch (notificationType) {
      case 'order_note':
      case 'order_notes':
        return settings.orderNotes !== false;
      case 'order_status':
      case 'status_change':
        return settings.orderStatus !== false;
      case 'order_change':
      case 'order_changes':
        return settings.orderChanges !== false;
      case 'new_order':
      case 'new_items':
        return settings.newItems !== false;
      case 'promotion':
      case 'promotions':
        return settings.promotions !== false;
      case 'system':
      case 'system_updates':
        return settings.systemUpdates !== false;
      default:
        return true; // Allow unknown notification types by default
    }
  }
  
  // Send push notification to specific user
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
    try {
      // Always log the notification first
      console.log(`📱 NOTIFICATION FOR ${userId}: ${payload.title} - ${payload.body}`);
      
      // Check user notification preferences first
      const notificationSettings = await storage.getNotificationSettings(userId);
      const notificationType = payload.data?.type || 'general';
      
      // Map notification types to settings
      const shouldNotify = this.shouldSendNotification(notificationType, notificationSettings);
      
      if (!shouldNotify) {
        console.log(`🔕 Notification blocked by user preferences for ${userId}: ${notificationType}`);
        return;
      }
      
      // In-app notifications removed - using SMS/email only
      
      // Push notifications disabled - notifications are handled via SMS/email only
      console.log(`📱 Push notification logged for user ${userId}: ${payload.title}`);
      console.log(`📧 User should receive SMS/email notification instead`);
    } catch (error) {
      console.error('Error in notification service:', error);
      // At minimum, log to console as fallback
      console.log(`📱 FALLBACK NOTIFICATION: ${payload.title} for user ${userId}`);
    }
  }

  // In-app notification fallback removed - using SMS/email only

  // Send push notification to all admins
  async sendToAllAdmins(payload: PushNotificationPayload): Promise<void> {
    try {
      const users = await storage.getAllUsers();
      const admins = users.filter(user => user.isAdmin);
      
      const promises = admins.map(admin => this.sendToUser(admin.id, payload));
      await Promise.allSettled(promises);
      
      console.log(`Push notification sent to ${admins.length} admins`);
    } catch (error) {
      console.error('Error sending push notification to admins:', error);
    }
  }

  // Send push notification to all staff (admins + employees)
  async sendToAllStaff(payload: PushNotificationPayload): Promise<void> {
    try {
      const users = await storage.getAllUsers();
      const staff = users.filter(user => user.isAdmin || user.isEmployee);
      
      const promises = staff.map(staffMember => this.sendToUser(staffMember.id, payload));
      await Promise.allSettled(promises);
      
      console.log(`Push notification sent to ${staff.length} staff members`);
    } catch (error) {
      console.error('Error sending push notification to staff:', error);
    }
  }

  // Send push notification to specific users by role
  async sendToUsersByRole(role: 'admin' | 'employee' | 'customer', payload: PushNotificationPayload): Promise<void> {
    try {
      const users = await storage.getAllUsers();
      let targetUsers: any[] = [];
      
      switch (role) {
        case 'admin':
          targetUsers = users.filter(user => user.isAdmin);
          break;
        case 'employee':
          targetUsers = users.filter(user => user.isEmployee && !user.isAdmin);
          break;
        case 'customer':
          targetUsers = users.filter(user => !user.isAdmin && !user.isEmployee);
          break;
      }
      
      const promises = targetUsers.map(user => this.sendToUser(user.id, payload));
      await Promise.allSettled(promises);
      
      console.log(`Push notification sent to ${targetUsers.length} ${role}s`);
    } catch (error) {
      console.error(`Error sending push notification to ${role}s:`, error);
    }
  }

  // Notification types for different scenarios
  
  // 1. New Order Notifications
  async notifyNewOrder(orderId: number, customerName: string, orderTotal: number): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '🛒 New Order Received!',
      body: `${customerName} placed a new order #${orderId} for $${orderTotal.toFixed(2)}`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'new_order',
        orderId: orderId,
        url: `/admin/orders/${orderId}`
      },
      actions: [
        {
          action: 'view_order',
          title: 'View Order',
          icon: '/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: true,
      tag: `new_order_${orderId}`,
      renotify: true
    };

    await this.sendToAllStaff(payload);
  }

  // 2. Customer Note Notifications
  async notifyCustomerNote(orderId: number, customerName: string, note: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '💬 Customer Note Added',
      body: `${customerName} added a note to order #${orderId}: "${note.substring(0, 50)}${note.length > 50 ? '...' : ''}"`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'customer_note',
        orderId: orderId,
        url: `/admin/orders/${orderId}`
      },
      actions: [
        {
          action: 'view_order',
          title: 'View Order',
          icon: '/view-icon.png'
        },
        {
          action: 'reply',
          title: 'Reply'
        }
      ],
      requireInteraction: true,
      tag: `customer_note_${orderId}`,
      renotify: true
    };

    await this.sendToAllStaff(payload);
  }

  // 2b. Staff Note to Customer Notifications
  async notifyCustomerOrderNote(customerId: string, orderId: number, staffName: string, note: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '📝 Staff Note Added',
      body: `${staffName} added a note to your order #${orderId}: "${note.substring(0, 50)}${note.length > 50 ? '...' : ''}"`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'staff_note',
        orderId: orderId,
        url: `/orders/${orderId}`
      },
      actions: [
        {
          action: 'view_order',
          title: 'View Order',
          icon: '/view-icon.png'
        }
      ],
      requireInteraction: true,
      tag: `staff_note_${orderId}`,
      renotify: true
    };

    await this.sendToUser(customerId, payload);
  }

  // 3. Order Status Change Notifications (for customers)
  async notifyOrderStatusChange(userId: string, orderId: number, newStatus: string, customerName: string): Promise<void> {
    const statusMessages = {
      pending: 'Your order has been received and is pending processing',
      processing: 'Your order is being processed',
      ready: 'Your order is ready for pickup/delivery',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      completed: 'Your order has been completed',
      cancelled: 'Your order has been cancelled'
    };

    const payload: PushNotificationPayload = {
      title: `📦 Order #${orderId} Update`,
      body: statusMessages[newStatus as keyof typeof statusMessages] || `Order status updated to: ${newStatus}`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'order_status_change',
        orderId: orderId,
        status: newStatus,
        url: `/orders/${orderId}`
      },
      actions: [
        {
          action: 'view_order',
          title: 'View Order'
        }
      ],
      tag: `order_status_${orderId}`,
      renotify: true
    };

    await this.sendToUser(userId, payload);
  }

  // 4. Low Stock Alerts (for staff)
  async notifyLowStock(productName: string, currentStock: number, minStock: number): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '⚠️ Low Stock Alert',
      body: `${productName} is running low (${currentStock} remaining, minimum: ${minStock})`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'low_stock',
        productName: productName,
        currentStock: currentStock,
        minStock: minStock,
        url: '/admin/products'
      },
      actions: [
        {
          action: 'view_products',
          title: 'View Products'
        },
        {
          action: 'create_po',
          title: 'Create Purchase Order'
        }
      ],
      requireInteraction: true,
      tag: `low_stock_${productName.replace(/\s+/g, '_')}`,
      renotify: false
    };

    await this.sendToAllStaff(payload);
  }

  // 5. Payment Received Notifications
  async notifyPaymentReceived(orderId: number, amount: number, paymentMethod: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '💰 Payment Received',
      body: `Payment of $${amount.toFixed(2)} received for order #${orderId} via ${paymentMethod}`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'payment_received',
        orderId: orderId,
        amount: amount,
        paymentMethod: paymentMethod,
        url: `/admin/orders/${orderId}`
      },
      actions: [
        {
          action: 'view_order',
          title: 'View Order'
        }
      ],
      tag: `payment_${orderId}`,
      renotify: false
    };

    await this.sendToAllAdmins(payload);
  }

  // 6. System Maintenance Notifications
  async notifySystemMaintenance(message: string, scheduledTime?: Date): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '🔧 System Maintenance',
      body: scheduledTime 
        ? `Scheduled maintenance: ${message} at ${scheduledTime.toLocaleString()}`
        : message,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'system_maintenance',
        message: message,
        scheduledTime: scheduledTime?.toISOString(),
        url: '/admin/dashboard'
      },
      requireInteraction: true,
      tag: 'system_maintenance',
      renotify: true
    };

    // Send to all users
    const users = await storage.getAllUsers();
    const promises = users.map(user => this.sendToUser(user.id, payload));
    await Promise.allSettled(promises);
  }

  // 7. Daily Summary Notifications (for admins)
  async notifyDailySummary(data: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    lowStockItems: number;
  }): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '📊 Daily Summary',
      body: `Today: ${data.totalOrders} orders, $${data.totalRevenue.toFixed(2)} revenue, ${data.pendingOrders} pending orders`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'daily_summary',
        ...data,
        url: '/admin/dashboard'
      },
      actions: [
        {
          action: 'view_dashboard',
          title: 'View Dashboard'
        }
      ],
      tag: 'daily_summary',
      renotify: false
    };

    await this.sendToAllAdmins(payload);
  }

  // 8. Emergency Notifications (high priority)
  async notifyEmergency(title: string, message: string, targetRole?: 'admin' | 'staff' | 'all'): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `🚨 URGENT: ${title}`,
      body: message,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'emergency',
        title: title,
        message: message,
        url: '/admin/dashboard'
      },
      requireInteraction: true,
      tag: 'emergency',
      renotify: true,
      silent: false
    };

    switch (targetRole) {
      case 'admin':
        await this.sendToAllAdmins(payload);
        break;
      case 'staff':
        await this.sendToAllStaff(payload);
        break;
      default:
        // Send to all users
        const users = await storage.getAllUsers();
        const promises = users.map(user => this.sendToUser(user.id, payload));
        await Promise.allSettled(promises);
    }
  }

  // 9. Promotional Notifications (for customers)
  async notifyPromotion(title: string, message: string, promoCode?: string): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `🎉 ${title}`,
      body: promoCode ? `${message} Use code: ${promoCode}` : message,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'promotion',
        title: title,
        message: message,
        promoCode: promoCode,
        url: '/products'
      },
      actions: [
        {
          action: 'shop_now',
          title: 'Shop Now'
        }
      ],
      tag: 'promotion',
      renotify: false
    };

    await this.sendToUsersByRole('customer', payload);
  }

  // 10. Purchase Order Notifications
  async notifyPurchaseOrderReceived(poNumber: string, supplierName: string, totalItems: number): Promise<void> {
    const payload: PushNotificationPayload = {
      title: '📦 Purchase Order Received',
      body: `PO #${poNumber} from ${supplierName} received with ${totalItems} items`,
      icon: '/favicon.ico',
      badge: '/badge-icon.png',
      data: {
        type: 'purchase_order_received',
        poNumber: poNumber,
        supplierName: supplierName,
        totalItems: totalItems,
        url: '/admin/purchase-orders'
      },
      actions: [
        {
          action: 'view_po',
          title: 'View Purchase Orders'
        }
      ],
      tag: `po_received_${poNumber}`,
      renotify: false
    };

    await this.sendToAllStaff(payload);
  }
}

export const pushNotificationService = new PushNotificationService();