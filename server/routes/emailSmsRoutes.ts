import { Router } from 'express';
import { requireAuth, requireAdmin } from '../simpleAuth';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { storage } from '../storage';

const emailSmsRoutes = Router();

// Email notification endpoints
emailSmsRoutes.post('/email/send', requireAuth, async (req: any, res) => {
  try {
    const { to, templateType, customerName, orderNumber, orderTotal, orderItems, orderStatus, deliveryAddress, orderNotes, promoCode, tone } = req.body;

    if (!to || !templateType) {
      return res.status(400).json({ message: 'Email address and template type are required' });
    }

    const emailData = {
      to,
      customerName,
      orderNumber,
      orderTotal,
      orderItems,
      orderStatus,
      deliveryAddress,
      orderNotes,
      promoCode,
      customData: req.body.customData
    };

    const success = await emailService.sendEmail(emailData, templateType, tone || 'professional');
    
    if (success) {
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ success: false, message: 'Email sending failed' });
  }
});

// Batch email sending
emailSmsRoutes.post('/email/batch', requireAdmin, async (req: any, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'Emails array is required' });
    }

    const results = await emailService.sendBatchEmails(emails);
    
    res.json({
      success: true,
      results,
      message: `Sent ${results.success} emails successfully, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Batch email sending error:', error);
    res.status(500).json({ success: false, message: 'Batch email sending failed' });
  }
});

// SMS notification endpoints
emailSmsRoutes.post('/sms/send', requireAuth, async (req: any, res) => {
  try {
    const { to, messageType, customerName, orderNumber, orderTotal, orderStatus, deliveryTime, promoCode, urgencyLevel } = req.body;

    if (!to || !messageType) {
      return res.status(400).json({ message: 'Phone number and message type are required' });
    }

    const smsData = {
      to,
      customerName,
      orderNumber,
      orderTotal,
      orderStatus,
      deliveryTime,
      promoCode,
      urgencyLevel,
      customData: req.body.customData
    };

    const success = await smsService.sendSMS(smsData, messageType);
    
    if (success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send SMS' });
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    res.status(500).json({ success: false, message: 'SMS sending failed' });
  }
});

// Batch SMS sending
emailSmsRoutes.post('/sms/batch', requireAdmin, async (req: any, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    const results = await smsService.sendBatchSMS(messages);
    
    res.json({
      success: true,
      results,
      message: `Sent ${results.success} SMS messages successfully, ${results.failed} failed`
    });
  } catch (error) {
    console.error('Batch SMS sending error:', error);
    res.status(500).json({ success: false, message: 'Batch SMS sending failed' });
  }
});

// AI-powered message optimization
emailSmsRoutes.post('/sms/optimize', requireAuth, async (req: any, res) => {
  try {
    const { messageType, customerName, orderNumber, orderTotal, orderStatus, deliveryTime, promoCode, urgencyLevel, previousPerformance } = req.body;

    if (!messageType) {
      return res.status(400).json({ message: 'Message type is required' });
    }

    const smsData = {
      to: '', // Not needed for optimization
      customerName,
      orderNumber,
      orderTotal,
      orderStatus,
      deliveryTime,
      promoCode,
      urgencyLevel,
      customData: req.body.customData
    };

    const optimizedMessage = await smsService.optimizeMessage(messageType, smsData, previousPerformance);
    
    res.json({
      success: true,
      optimizedMessage,
      messageType,
      estimatedImprovement: {
        responseRate: '+15-25%',
        conversionRate: '+8-12%',
        engagement: '+20-30%'
      }
    });
  } catch (error) {
    console.error('Message optimization error:', error);
    res.status(500).json({ success: false, message: 'Message optimization failed' });
  }
});

// Automated notification triggers
emailSmsRoutes.post('/notify/order-confirmation', requireAuth, async (req: any, res) => {
  try {
    const { orderId, customerEmail, customerPhone, sendEmail = true, sendSMS = true } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Get order details
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get customer details
    const customer = await storage.getUser(order.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const results = {
      email: { success: false, message: 'Email not sent' },
      sms: { success: false, message: 'SMS not sent' }
    };

    // Send email notification
    if (sendEmail && (customerEmail || customer.email)) {
      const emailData = {
        to: customerEmail || customer.email,
        customerName: customer.displayName || customer.userName,
        orderNumber: order.orderNumber,
        orderTotal: order.totalAmount,
        orderItems: [], // Would need to fetch order items
        deliveryAddress: order.deliveryAddress
      };

      results.email.success = await emailService.sendEmail(emailData, 'order_confirmation', 'professional');
      results.email.message = results.email.success ? 'Email sent successfully' : 'Email sending failed';
    }

    // Send SMS notification
    if (sendSMS && (customerPhone || customer.phone)) {
      const smsData = {
        to: customerPhone || customer.phone,
        customerName: customer.displayName || customer.userName,
        orderNumber: order.orderNumber,
        orderTotal: order.totalAmount,
        urgencyLevel: 'medium' as const
      };

      results.sms.success = await smsService.sendSMS(smsData, 'order_confirmation');
      results.sms.message = results.sms.success ? 'SMS sent successfully' : 'SMS sending failed';
    }

    res.json({
      success: true,
      results,
      orderId,
      customerName: customer.displayName || customer.userName
    });
  } catch (error) {
    console.error('Order confirmation notification error:', error);
    res.status(500).json({ success: false, message: 'Notification sending failed' });
  }
});

// Automated order status update notifications
emailSmsRoutes.post('/notify/order-status', requireAuth, async (req: any, res) => {
  try {
    const { orderId, newStatus, customerEmail, customerPhone, sendEmail = true, sendSMS = true, notes } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({ message: 'Order ID and new status are required' });
    }

    // Get order details
    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get customer details
    const customer = await storage.getUser(order.customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const results = {
      email: { success: false, message: 'Email not sent' },
      sms: { success: false, message: 'SMS not sent' }
    };

    // Send email notification
    if (sendEmail && (customerEmail || customer.email)) {
      const emailData = {
        to: customerEmail || customer.email,
        customerName: customer.displayName || customer.userName,
        orderNumber: order.orderNumber,
        orderStatus: newStatus,
        orderNotes: notes
      };

      results.email.success = await emailService.sendEmail(emailData, 'order_status_update', 'professional');
      results.email.message = results.email.success ? 'Email sent successfully' : 'Email sending failed';
    }

    // Send SMS notification
    if (sendSMS && (customerPhone || customer.phone)) {
      const smsData = {
        to: customerPhone || customer.phone,
        customerName: customer.displayName || customer.userName,
        orderNumber: order.orderNumber,
        orderStatus: newStatus,
        urgencyLevel: newStatus === 'ready' ? 'high' : 'medium' as const
      };

      results.sms.success = await smsService.sendSMS(smsData, 'delivery_update');
      results.sms.message = results.sms.success ? 'SMS sent successfully' : 'SMS sending failed';
    }

    res.json({
      success: true,
      results,
      orderId,
      newStatus,
      customerName: customer.displayName || customer.userName
    });
  } catch (error) {
    console.error('Order status notification error:', error);
    res.status(500).json({ success: false, message: 'Status notification sending failed' });
  }
});

// Promotional campaign notifications
emailSmsRoutes.post('/notify/promotion', requireAdmin, async (req: any, res) => {
  try {
    const { title, message, promoCode, targetCustomers, sendEmail = true, sendSMS = true } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const results = {
      email: { success: 0, failed: 0 },
      sms: { success: 0, failed: 0 }
    };

    // Get target customers
    let customers = [];
    if (targetCustomers && Array.isArray(targetCustomers)) {
      customers = targetCustomers;
    } else {
      // Get all customers if no specific targets provided
      const allCustomers = await storage.getAllCustomers();
      customers = allCustomers.map(c => ({
        email: c.email,
        phone: c.phone,
        name: c.displayName || c.userName,
        preferredLanguage: c.preferredLanguage || 'en'
      }));
    }

    // Send email promotions
    if (sendEmail) {
      const emailPromotions = customers
        .filter(c => c.email)
        .map(c => ({
          data: {
            to: c.email,
            customerName: c.name,
            promoCode,
            language: c.preferredLanguage || 'en',
            customData: { message }
          },
          templateType: 'promotional',
          tone: 'friendly' as const
        }));

      if (emailPromotions.length > 0) {
        results.email = await emailService.sendBatchEmails(emailPromotions);
      }
    }

    // Send SMS promotions
    if (sendSMS) {
      const smsPromotions = customers
        .filter(c => c.phone)
        .map(c => ({
          data: {
            to: c.phone,
            customerName: c.name,
            promoCode,
            urgencyLevel: 'medium' as const,
            language: c.preferredLanguage || 'en',
            customData: { message }
          },
          messageType: 'promotional'
        }));

      if (smsPromotions.length > 0) {
        results.sms = await smsService.sendBatchSMS(smsPromotions);
      }
    }

    res.json({
      success: true,
      results,
      totalCustomers: customers.length,
      campaignTitle: title
    });
  } catch (error) {
    console.error('Promotional campaign error:', error);
    res.status(500).json({ success: false, message: 'Promotional campaign failed' });
  }
});

export default emailSmsRoutes;