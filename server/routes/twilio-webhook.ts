import express from 'express';
import { storage } from '../storage';

const router = express.Router();

// Handle Twilio STOP webhook for automatic opt-out processing
router.post('/sms/stop-webhook', async (req, res) => {
  try {
    const { From: phoneNumber, Body: message, MessageSid, AccountSid } = req.body;
    
    console.log('📱 Twilio STOP Webhook received:', { phoneNumber, message, MessageSid });
    
    // Check if this is a STOP command (case insensitive)
    const stopKeywords = ['STOP', 'QUIT', 'CANCEL', 'END', 'UNSUBSCRIBE'];
    const isStopCommand = stopKeywords.some(keyword => 
      message.toUpperCase().includes(keyword)
    );
    
    if (isStopCommand) {
      // Find user by phone number
      const users = await storage.getUsers();
      const user = users.find(u => u.phone === phoneNumber);
      
      if (user) {
        // Update user to opt-out
        const optOutData = {
          smsConsentGiven: false,
          smsOptOutDate: new Date(),
          smsOptOutMethod: 'STOP_reply',
          transactionalSmsConsent: false,
          marketingSmsConsent: false,
          smsNotifications: false,
          updatedAt: new Date()
        };

        await storage.updateUser(user.id, optOutData);

        // Log the opt-out activity
        await storage.addActivityLog({
          userId: user.id,
          action: 'SMS_OPT_OUT_STOP',
          details: `User opted out via STOP reply from ${phoneNumber}. Message: "${message}"`,
          ipAddress: 'twilio_webhook',
          userAgent: `Twilio-Webhook-${MessageSid}`
        });

        console.log(`✅ User ${user.id} (${user.username}) opted out via STOP reply`);
      } else {
        console.log(`⚠️ STOP reply from unknown number: ${phoneNumber}`);
      }
    }

    // Handle HELP keyword
    const helpKeywords = ['HELP', 'INFO', 'SUPPORT'];
    const isHelpCommand = helpKeywords.some(keyword => 
      message.toUpperCase().includes(keyword)
    );

    if (isHelpCommand) {
      console.log(`📞 Help request from ${phoneNumber}: "${message}"`);
      // Log help request
      const users = await storage.getUsers();
      const user = users.find(u => u.phone === phoneNumber);
      
      if (user) {
        await storage.addActivityLog({
          userId: user.id,
          action: 'SMS_HELP_REQUEST',
          details: `User requested help via SMS from ${phoneNumber}. Message: "${message}"`,
          ipAddress: 'twilio_webhook'
        });
      }
    }

    // Always respond with 200 OK to Twilio
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Error handling Twilio STOP webhook:', error);
    // Always respond OK to prevent Twilio retries
    res.status(200).send('OK');
  }
});

// Handle Twilio delivery status webhooks
router.post('/sms/status', async (req, res) => {
  try {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;
    
    console.log('📊 SMS Status Update:', { 
      MessageSid, 
      MessageStatus, 
      To: To?.substring(0, 3) + '***' + To?.substring(To.length - 4), // Mask phone number
      ErrorCode, 
      ErrorMessage 
    });

    // Log status updates for monitoring
    if (MessageStatus === 'failed' || ErrorCode) {
      console.error(`❌ SMS Delivery Failed: ${MessageSid} to ${To} - Error: ${ErrorCode} ${ErrorMessage}`);
    } else if (MessageStatus === 'delivered') {
      console.log(`✅ SMS Delivered Successfully: ${MessageSid} to ${To}`);
    }

    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Error handling SMS status webhook:', error);
    res.status(200).send('OK');
  }
});

export default router;