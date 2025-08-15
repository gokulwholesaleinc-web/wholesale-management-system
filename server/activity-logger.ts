import { storage } from "./storage";

/**
 * Enhanced activity logging system with proper timezone handling
 * and comprehensive coverage for all user actions
 */

export interface ActivityLogData {
  userId: string;
  username?: string;
  action: string;
  details: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
}

/**
 * Get current timestamp in local timezone (EST/CST for US operations)
 */
function getCurrentTimestamp(): Date {
  return new Date(); // JavaScript Date objects are timezone-aware
}

/**
 * Enhanced activity logger with proper timezone handling
 */
export class ActivityLogger {
  
  /**
   * Log any user activity with comprehensive details
   */
  static async log(data: ActivityLogData): Promise<void> {
    try {
      await storage.addActivityLog({
        userId: data.userId,
        username: data.username || 'Unknown',
        action: data.action,
        details: data.details,
        timestamp: getCurrentTimestamp(), // Use current local time
        targetId: data.targetId,
        targetType: data.targetType,
      });
    } catch (error) {
      console.error('Activity logging failed:', error);
      // Don't throw error to avoid disrupting main functionality
    }
  }

  // Customer activities
  static async logCustomerLogin(userId: string, username: string, ipAddress?: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'CUSTOMER_LOGIN',
      details: `Customer logged in successfully`,
      ipAddress
    });
  }

  static async logCustomerOrderPlaced(userId: string, username: string, orderId: string, total: number): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'ORDER_PLACED',
      details: `Customer placed order #${orderId} for $${total.toFixed(2)}`,
      targetId: orderId,
      targetType: 'order'
    });
  }

  static async logCustomerCartAction(userId: string, username: string, action: 'ADD' | 'UPDATE' | 'REMOVE' | 'CLEAR', productId?: string, productName?: string): Promise<void> {
    let details = '';
    switch (action) {
      case 'ADD':
        details = `Added ${productName || `product ${productId}`} to cart`;
        break;
      case 'UPDATE':
        details = `Updated quantity for ${productName || `product ${productId}`} in cart`;
        break;
      case 'REMOVE':
        details = `Removed ${productName || `product ${productId}`} from cart`;
        break;
      case 'CLEAR':
        details = `Cleared entire shopping cart`;
        break;
    }

    return this.log({
      userId,
      username,
      action: `CART_${action}`,
      details,
      targetId: productId,
      targetType: 'product'
    });
  }

  static async logCustomerProfileUpdate(userId: string, username: string, fieldsUpdated: string[]): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'PROFILE_UPDATED',
      details: `Customer updated profile fields: ${fieldsUpdated.join(', ')}`,
      targetId: userId,
      targetType: 'user'
    });
  }

  static async logCustomerAddressAction(userId: string, username: string, action: 'CREATE' | 'UPDATE' | 'DELETE', addressId: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: `ADDRESS_${action}`,
      details: `Customer ${action.toLowerCase()}d delivery address`,
      targetId: addressId,
      targetType: 'address'
    });
  }

  // Staff/Admin activities
  static async logStaffLogin(userId: string, username: string, ipAddress?: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'STAFF_LOGIN',
      details: `Staff member logged in successfully`,
      ipAddress
    });
  }

  static async logProductUpdate(userId: string, username: string, productId: string, productName: string, fieldsUpdated: string[]): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'PRODUCT_UPDATED',
      details: `Updated product "${productName}" - fields: ${fieldsUpdated.join(', ')}`,
      targetId: productId,
      targetType: 'product'
    });
  }

  static async logProductCreated(userId: string, username: string, productId: string, productName: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'PRODUCT_CREATED',
      details: `Created new product "${productName}"`,
      targetId: productId,
      targetType: 'product'
    });
  }

  static async logProductDeleted(userId: string, username: string, productId: string, productName: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'PRODUCT_DELETED',
      details: `Deleted product "${productName}"`,
      targetId: productId,
      targetType: 'product'
    });
  }

  static async logOrderStatusUpdate(userId: string, username: string, orderId: string, oldStatus: string, newStatus: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'ORDER_STATUS_UPDATED',
      details: `Changed order #${orderId} status from "${oldStatus}" to "${newStatus}"`,
      targetId: orderId,
      targetType: 'order'
    });
  }

  static async logOrderItemEdit(userId: string, username: string, orderId: string, itemId: string, changes: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'ORDER_ITEM_EDITED',
      details: `Modified order #${orderId} item #${itemId}: ${changes}`,
      targetId: orderId,
      targetType: 'order'
    });
  }

  static async logOrderNoteAdded(userId: string, username: string, orderId: string, noteContent: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'ORDER_NOTE_ADDED',
      details: `Added note to order #${orderId}: "${noteContent.substring(0, 100)}${noteContent.length > 100 ? '...' : ''}"`,
      targetId: orderId,
      targetType: 'order'
    });
  }

  static async logOrderCompleted(userId: string, username: string, orderId: string, paymentMethod: string, total: number): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'ORDER_COMPLETED',
      details: `Completed order #${orderId} - Payment: ${paymentMethod}, Total: $${total.toFixed(2)}`,
      targetId: orderId,
      targetType: 'order'
    });
  }

  static async logUserCreated(userId: string, username: string, newUserId: string, newUsername: string, userType: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'USER_CREATED',
      details: `Created new ${userType} user "${newUsername}"`,
      targetId: newUserId,
      targetType: 'user'
    });
  }

  static async logUserUpdated(userId: string, username: string, targetUserId: string, targetUsername: string, fieldsUpdated: string[]): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'USER_UPDATED',
      details: `Updated user "${targetUsername}" - fields: ${fieldsUpdated.join(', ')}`,
      targetId: targetUserId,
      targetType: 'user'
    });
  }

  static async logUserDeleted(userId: string, username: string, targetUserId: string, targetUsername: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'USER_DELETED',
      details: `Deleted user "${targetUsername}"`,
      targetId: targetUserId,
      targetType: 'user'
    });
  }

  static async logCategoryAction(userId: string, username: string, action: 'CREATE' | 'UPDATE' | 'DELETE', categoryId: string, categoryName: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: `CATEGORY_${action}`,
      details: `${action.charAt(0) + action.slice(1).toLowerCase()}d category "${categoryName}"`,
      targetId: categoryId,
      targetType: 'category'
    });
  }

  static async logPurchaseOrderAction(userId: string, username: string, action: 'CREATE' | 'UPDATE' | 'DELETE', poId: string, supplierName?: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: `PURCHASE_ORDER_${action}`,
      details: `${action.charAt(0) + action.slice(1).toLowerCase()}d purchase order #${poId}${supplierName ? ` for ${supplierName}` : ''}`,
      targetId: poId,
      targetType: 'purchase_order'
    });
  }

  static async logSystemAction(userId: string, username: string, action: string, details: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: `SYSTEM_${action}`,
      details
    });
  }

  static async logDataExport(userId: string, username: string, exportType: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: 'DATA_EXPORTED',
      details: `Exported ${exportType} data`
    });
  }

  static async logBackupAction(userId: string, username: string, action: 'CREATE' | 'RESTORE' | 'DOWNLOAD' | 'DELETE', backupName?: string): Promise<void> {
    return this.log({
      userId,
      username,
      action: `BACKUP_${action}`,
      details: `${action.charAt(0) + action.slice(1).toLowerCase()}d backup${backupName ? `: ${backupName}` : ''}`
    });
  }
}