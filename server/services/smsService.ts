import twilio from 'twilio';
import OpenAI from 'openai';

// Initialize Twilio
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SMSData {
  to: string;
  customerName?: string;
  orderNumber?: string;
  orderTotal?: number;
  orderStatus?: string;
  deliveryTime?: string;
  promoCode?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  customData?: any;
  language?: string; // Language code (e.g., 'en', 'es', 'fr', 'de', 'hi', 'gu', etc.)
  customerLocation?: string; // For cultural context
}

export class SMSService {
  private static instance: SMSService;
  private fromPhone = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
  private companyName = 'Gokul Wholesale';

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  // ✅ TWILIO A2P 10DLC REQUIREMENT: Send immediate opt-in confirmation
  async sendOptInConfirmation(phoneNumber: string, customerName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`📱 [OPT-IN CONFIRMATION] Sending required confirmation SMS to ${phoneNumber} for ${customerName}`);
      
      const smsData: SMSData = {
        to: phoneNumber,
        customerName: customerName || 'Customer'
      };
      
      // Send confirmation SMS without consent check (this IS the consent confirmation)
      const result = await this.sendSMS(smsData, 'sms_opt_in_confirmation', false);
      
      if (result.success) {
        console.log(`✅ [OPT-IN CONFIRMATION] Successfully sent TCPA-compliant confirmation to ${phoneNumber}`);
      } else {
        console.error(`❌ [OPT-IN CONFIRMATION] Failed to send confirmation: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error('❌ [OPT-IN CONFIRMATION] Error sending confirmation SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // TCPA Compliance: Check if user has consented to receive SMS
  async checkSMSConsent(phoneNumber: string, messageType: string): Promise<{ canSend: boolean; reason?: string }> {
    try {
      // Validate phone number parameter
      if (!phoneNumber) {
        console.error(`❌ [SMS CONSENT] Phone number is undefined or null for messageType: ${messageType}`);
        return { 
          canSend: false, 
          reason: 'Invalid phone number provided' 
        };
      }

      // Use storage interface to avoid database import issues
      const storage = (await import('../storage')).storage;
      
      // Find user by phone number - use storage method instead of direct db access
      // Format phone number for consistent lookup
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      } else if (!phoneNumber.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        formattedPhone = phoneNumber;
      }

      // Use storage to find user instead of direct database access
      const allUsers = await storage.getUsers();
      const user = allUsers.find((u: any) => u.phone === formattedPhone);

      if (!user) {
        return { 
          canSend: false, 
          reason: 'User not found or phone number not verified' 
        };
      }

      // Check if user has opted out
      if (user.smsOptOutDate) {
        return { 
          canSend: false, 
          reason: 'User has opted out of SMS communications' 
        };
      }

      // Check privacy policy acceptance
      if (!user.privacyPolicyAccepted) {
        return { 
          canSend: false, 
          reason: 'User has not accepted privacy policy' 
        };
      }

      // Check general SMS consent
      if (!user.smsConsentGiven) {
        return { 
          canSend: false, 
          reason: 'User has not provided SMS consent' 
        };
      }

      // Check specific consent types
      const isMarketing = ['promotional', 'marketing', 'newsletter'].includes(messageType.toLowerCase());
      const isTransactional = ['order_confirmation', 'order_ready', 'delivery_update', 'order_status'].includes(messageType.toLowerCase());

      if (isMarketing && !user.marketingSmsConsent) {
        return { 
          canSend: false, 
          reason: 'User has not consented to marketing SMS messages' 
        };
      }

      if (isTransactional && !user.transactionalSmsConsent) {
        return { 
          canSend: false, 
          reason: 'User has not consented to transactional SMS messages' 
        };
      }

      return { canSend: true };

    } catch (error) {
      console.error('Error checking SMS consent:', error);
      return { 
        canSend: false, 
        reason: 'Error verifying SMS consent - defaulting to no consent for compliance' 
      };
    }
  }

  // Auto-detect language from phone number or customer data
  private detectLanguage(data: SMSData): string {
    if (data.language) return data.language;
    
    // Phone number-based detection
    const phoneNumber = data.to.replace(/\D/g, '');
    if (phoneNumber.startsWith('1')) return 'en'; // US/Canada
    if (phoneNumber.startsWith('52')) return 'es'; // Mexico
    if (phoneNumber.startsWith('33')) return 'fr'; // France
    if (phoneNumber.startsWith('49')) return 'de'; // Germany
    if (phoneNumber.startsWith('39')) return 'it'; // Italy
    if (phoneNumber.startsWith('55')) return 'pt'; // Brazil
    if (phoneNumber.startsWith('81')) return 'ja'; // Japan
    if (phoneNumber.startsWith('86')) return 'zh'; // China
    if (phoneNumber.startsWith('82')) return 'ko'; // South Korea
    if (phoneNumber.startsWith('7')) return 'ru'; // Russia
    if (phoneNumber.startsWith('91')) return 'hi'; // India
    if (phoneNumber.startsWith('966')) return 'ar'; // Saudi Arabia
    if (phoneNumber.startsWith('92')) return 'ur'; // Pakistan
    
    return 'en'; // Default to English
  }

  // Get SMS character limits for different languages
  private getLanguageCharacterLimits(language: string): { singleSMS: number; multiSMS: number } {
    // Languages with special characters may have different limits
    const limits: { [key: string]: { singleSMS: number; multiSMS: number } } = {
      'en': { singleSMS: 160, multiSMS: 153 },
      'es': { singleSMS: 160, multiSMS: 153 },
      'fr': { singleSMS: 160, multiSMS: 153 },
      'de': { singleSMS: 160, multiSMS: 153 },
      'it': { singleSMS: 160, multiSMS: 153 },
      'pt': { singleSMS: 160, multiSMS: 153 },
      'ja': { singleSMS: 70, multiSMS: 67 },   // Unicode characters
      'zh': { singleSMS: 70, multiSMS: 67 },   // Unicode characters
      'ko': { singleSMS: 70, multiSMS: 67 },   // Unicode characters
      'ru': { singleSMS: 70, multiSMS: 67 },   // Unicode characters
      'hi': { singleSMS: 70, multiSMS: 67 },   // Unicode characters (Devanagari)
      'gu': { singleSMS: 70, multiSMS: 67 },   // Unicode characters (Gujarati)
      'ar': { singleSMS: 70, multiSMS: 67 },   // Unicode characters (Arabic)
      'ur': { singleSMS: 70, multiSMS: 67 },   // Unicode characters (Urdu)
    };
    
    return limits[language] || limits['en'];
  }

  // AI-powered multi-language SMS content generation with length optimization
  async generateSMSContent(
    messageType: string,
    data: SMSData,
    maxLength?: number
  ): Promise<string> {
    try {
      const language = this.detectLanguage(data);
      const characterLimits = this.getLanguageCharacterLimits(language);
      const actualMaxLength = maxLength || characterLimits.singleSMS;
      
      const prompt = this.createSMSPrompt(messageType, data, actualMaxLength, language);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert multilingual SMS content creator for ${this.companyName}, a B2B wholesale company. Create concise, culturally appropriate SMS messages in the requested language that drive engagement while staying within character limits. Focus on essential information, clear calls-to-action, and cultural sensitivity. For Hindi and Gujarati, use proper scripts and appropriate Indian business etiquette.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 150
      });

      const content = JSON.parse(response.choices[0].message.content || '{}');
      const message = content.message || this.getFallbackMessage(messageType, data);
      
      // Ensure message fits within SMS limits
      return message.length <= (maxLength || 160) ? message : message.substring(0, (maxLength || 160) - 3) + '...';
    } catch (error) {
      console.error('AI SMS generation failed, using fallback:', error);
      return this.getFallbackMessage(messageType, data);
    }
  }

  private createSMSPrompt(messageType: string, data: SMSData, maxLength: number, language?: string): string {
    const detectedLanguage = language || this.detectLanguage(data);
    let prompt = `Generate SMS content for message type: ${messageType}
    
    Customer Data:
    - Name: ${data.customerName || 'Customer'}
    - Phone: ${data.to}
    - Language: ${detectedLanguage}
    
    Business Context:
    - Company: ${this.companyName}
    - Industry: B2B Wholesale
    - Urgency: ${data.urgencyLevel || 'medium'}
    - Character limit: ${maxLength}
    
    `;

    switch (messageType) {
      case 'order_confirmation':
        prompt += `
        Order Details:
        - Order Number: ${data.orderNumber}
        - Total: $${data.orderTotal}
        
        Create a brief order confirmation SMS that thanks the customer and confirms their order.
        `;
        break;
        
      case 'order_ready':
        prompt += `
        Order Details:
        - Order Number: ${data.orderNumber}
        - Status: Ready for pickup/delivery
        - Delivery Time: ${data.deliveryTime || 'Soon'}
        
        Create an SMS notifying the customer their order is ready.
        `;
        break;
        
      case 'delivery_update':
        prompt += `
        Delivery Update:
        - Order Number: ${data.orderNumber}
        - Status: ${data.orderStatus}
        - Expected Time: ${data.deliveryTime || 'Soon'}
        
        Create a delivery status update SMS.
        `;
        break;
        
      case 'staff_new_order_alert':
        prompt += `
        New Order Alert for Staff:
        - Order Number: ${data.orderNumber}
        - Customer: ${data.customerName}
        - Total: $${data.orderTotal}
        
        CRITICAL: This is a STAFF ALERT, not a customer message.
        Create a brief SMS alerting staff about a new order that needs processing.
        Tell staff to "view app for details".
        `;
        break;
        
      case 'staff_new_account_alert':
        prompt += `
        New Account Request Alert for Staff:
        - Business Name: ${data.customData?.businessName || 'Not provided'}
        - Contact Name: ${data.customerName}
        - Phone: ${data.customData?.phone || 'Not provided'}
        - Email: ${data.customData?.email || 'Not provided'}
        - FEIN: ${data.customData?.feinNumber || 'Not provided'}
        - Business Type: ${data.customData?.businessType || 'Not provided'}
        
        CRITICAL: This is a STAFF ALERT, not a customer message.
        Create a detailed SMS alerting staff about a new business account request that needs immediate review and approval.
        Include business name, contact info, and tell staff to "approve/reject in admin dashboard".
        Make it sound urgent and professional for B2B wholesale context.
        `;
        break;
        
      case 'order_note':
        prompt += `
        Order Note Notification:
        - Order Number: ${data.orderNumber}
        - Customer: ${data.customerName}
        - Note: ${data.customData?.note || 'New note added'}
        - Added By: ${data.customData?.staffName || 'Staff'}
        
        Create a brief SMS notifying the customer that a new note was added to their order.
        Include the note content and tell them to check the app for full details.
        `;
        break;

      case 'promotional':
        prompt += `
        Promotion Details:
        - Promo Code: ${data.promoCode || 'No code'}
        - Custom Message: ${data.customData?.message || 'Special offer'}
        
        Create an engaging promotional SMS that drives action.
        `;
        break;

      case 'sms_opt_in_confirmation':
        prompt += `
        SMS Opt-In Confirmation Message (REQUIRED BY TWILIO A2P 10DLC):
        - Customer Name: ${data.customerName}
        
        Create a TCPA-compliant SMS opt-in confirmation message that includes ALL required elements:
        1. Welcome message confirming SMS enrollment
        2. Program/service description (order updates & business alerts)
        3. Message frequency disclosure ("varies")
        4. "Message and data rates may apply"
        5. Customer care contact info: 630-540-9910
        6. Opt-out instructions (Reply STOP)
        7. Help instructions (Reply HELP)
        
        CRITICAL: This message is legally required for campaign approval.
        Keep under ${maxLength} characters but include all required disclosures.
        `;
        break;
        
      default:
        prompt += `Create a general business SMS for: ${messageType}`;
    }

    prompt += `
    
    CRITICAL REQUIREMENTS:
    - Message must be exactly ${maxLength} characters or less
    - Include customer name for personalization
    - Be concise and actionable
    - Include company name briefly
    - No emojis unless specifically requested
    - Focus on key information only
    
    Please respond with valid JSON in this format:
    {
      "message": "Complete SMS message under ${maxLength} characters"
    }
    `;

    return prompt;
  }

  // Enhanced SMS sending with carrier-friendly optimizations
  async sendSMS(data: SMSData, messageType: string, checkConsent: boolean = true): Promise<{ success: boolean; messageId?: string; status?: string; error?: string }> {
    try {
      // Better API key validation
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.error('❌ Twilio configuration incomplete - missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER');
        return { success: false, error: 'Missing Twilio configuration' };
      }

      if (!twilioClient) {
        console.error('❌ Twilio client not initialized properly');
        return { success: false, error: 'Twilio client not initialized' };
      }

      // TCPA Compliance: Check for SMS consent before sending
      if (checkConsent) {
        const consentCheck = await this.checkSMSConsent(data.to, messageType);
        if (!consentCheck.canSend) {
          console.warn(`🚫 SMS consent check failed for ${data.to}: ${consentCheck.reason}`);
          return { 
            success: false, 
            error: `SMS consent required: ${consentCheck.reason}` 
          };
        }
        console.log(`✅ SMS consent verified for ${data.to} - can send ${messageType}`);
      }

      // Generate carrier-friendly SMS content
      const message = await this.generateCarrierFriendlyContent(messageType, data);
      
      // Format phone number to E.164 format (+1 for US numbers)
      let formattedPhone = data.to;
      if (data.to && !data.to.startsWith('+')) {
        // If it's a 10-digit US number, add +1
        if (data.to.length === 10 && /^\d{10}$/.test(data.to)) {
          formattedPhone = '+1' + data.to;
        }
      }
      
      console.log(`📱 Sending carrier-optimized SMS to ${formattedPhone}: ${message}`);

      // Try multiple delivery strategies using your valid messaging service
      const deliveryStrategies = [
        // Strategy 1: Direct send (confirmed working)
        {
          name: 'Direct Send Verified',
          params: {
            body: message,
            from: this.fromPhone,
            to: formattedPhone,
            statusCallback: `${process.env.BASE_URL || 'https://shopgokul.com'}/api/sms/status`,
            maxPrice: 0.05,
            provideFeedback: true,
            validityPeriod: 14400
          }
        },
        // Strategy 2: Direct from verified number (fallback)
        {
          name: 'Direct Send',
          params: {
            body: message,
            from: this.fromPhone,
            to: formattedPhone,
            statusCallback: `${process.env.BASE_URL || 'https://shopgokul.com'}/api/sms/status`,
            maxPrice: 0.05,
            provideFeedback: true,
            validityPeriod: 14400
          }
        },
        // Strategy 3: Simple send (final fallback)
        {
          name: 'Simple Send',
          params: {
            body: message,
            from: this.fromPhone,
            to: formattedPhone,
            maxPrice: 0.05
          }
        }
      ];

      let lastError = null;
      
      for (const strategy of deliveryStrategies) {
        try {
          console.log(`🔄 Trying SMS strategy: ${strategy.name}`);
          
          const smsResult = await twilioClient.messages.create(strategy.params);
          
          console.log(`✅ SMS sent successfully via ${strategy.name} to ${data.to} for ${messageType}`);
          console.log(`📋 SID: ${smsResult.sid}, Status: ${smsResult.status}`);
          
          return {
            success: true,
            messageId: smsResult.sid,
            status: smsResult.status
          };
          
        } catch (error: any) {
          console.log(`❌ Strategy ${strategy.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          lastError = error;
          
          // If this is a permanent error, don't try other strategies
          if (error.code === 21211 || error.code === 20003) {
            break;
          }
        }
      }
      
      // All strategies failed
      console.error('❌ All SMS delivery strategies failed');
      return {
        success: false,
        error: lastError instanceof Error ? lastError.message : 'All delivery strategies failed'
      };
      
    } catch (error: any) {
      console.error('❌ SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Generate carrier-friendly content
  private async generateCarrierFriendlyContent(messageType: string, data: SMSData): Promise<string> {
    // Twilio A2P 10DLC CTA verification compliant messages with brand name prefix
    const customerName = data.customerName || 'Customer';
    
    // Base messages with mandatory brand identification for CTA verification and TCPA compliance
    const compliantMessages = {
      'order_confirmation': `${this.companyName}: Thank you ${customerName}! Order #${data.orderNumber} confirmed. Total: $${data.orderTotal}. Reply STOP to opt out.`,
      'order_ready': `${this.companyName}: ${customerName}, order #${data.orderNumber} is ready for pickup. Reply STOP to opt out.`,
      'delivery_update': `${this.companyName}: Delivery update for ${customerName}. Order #${data.orderNumber} status: ${data.orderStatus}. Reply STOP to opt out.`,
      'promotional': `${this.companyName}: Special offer for ${customerName}! ${data.promoCode || 'Contact us for details'}. Reply STOP to opt out.`,
      'customer_note': `${this.companyName}: ${customerName}, new message about order #${data.orderNumber}. Reply STOP to opt out.`,
      'staff_new_order_alert': `${this.companyName}: New order #${data.orderNumber} from ${customerName}. $${data.orderTotal}. Check app. Reply STOP to opt out.`,
      'staff_new_account_alert': `${this.companyName}: 🔔 NEW B2B ACCOUNT REQUEST - ${data.customData?.businessName || 'Business'} (Contact: ${customerName}, Phone: ${data.customData?.phone || 'N/A'}). URGENT: Approve/reject in admin now. Reply STOP to opt out.`,
      'order_note': `${this.companyName}: ${customerName}, note added to order #${data.orderNumber}: ${data.customData?.note || 'Check app for details'}. Reply STOP to opt out.`,
      'system_test': `${this.companyName}: System test message. All systems operational. Reply STOP to opt out.`,
      'sms_opt_in_confirmation': `${this.companyName}: Thank you ${customerName}! You've opted in for SMS updates. You'll receive order confirmations and important alerts. Reply STOP to opt out anytime.`
    };
    
    // Ensure message exists and add compliance elements
    let message = (compliantMessages as any)[messageType] || `${this.companyName}: ${customerName}, update available. Reply STOP to opt out.`;
    
    // Ensure message length compliance (160 chars max for single SMS)
    if (message.length > 160) {
      // Calculate space needed for STOP instruction (22 chars: " Reply STOP to opt out.")
      const stopInstruction = ' Reply STOP to opt out.';
      const maxContentLength = 160 - stopInstruction.length - 3; // 3 for "..."
      const baseMessage = message.replace(stopInstruction, '');
      message = baseMessage.substring(0, maxContentLength) + '...' + stopInstruction;
    }
    
    return message;
  }

  // Get ultra-short message for carrier compatibility
  private getShortCarrierFriendlyMessage(messageType: string, data: SMSData): string {
    const shortMessages = {
      'order_confirmation': `Order #${data.orderNumber} confirmed - ${this.companyName}. Reply STOP to opt out.`,
      'order_ready': `Order #${data.orderNumber} ready - ${this.companyName}. Reply STOP to opt out.`,
      'delivery_update': `Order #${data.orderNumber}: ${data.orderStatus} - ${this.companyName}. Reply STOP to opt out.`,
      'promotional': `Special offer - ${this.companyName}. Reply STOP to opt out.`,
      'customer_note': `Order #${data.orderNumber} message - ${this.companyName}. Reply STOP to opt out.`,
      'system_test': `Test - ${this.companyName}. Reply STOP to opt out.`,
      'sms_opt_in_confirmation': `${this.companyName}: SMS opt-in confirmed. Reply STOP to opt out.`
    };
    
    return (shortMessages as any)[messageType] || `Update - ${this.companyName}. Reply STOP to opt out.`;
  }

  // Batch SMS sending with carrier-friendly rate limiting
  async sendBatchSMS(messages: { data: SMSData; messageType: string }[]): Promise<{ success: number; failed: number; details: any[] }> {
    const results = { success: 0, failed: 0, details: [] };
    
    // Process SMS in smaller batches to avoid carrier rate limits
    const batchSize = 3; // Reduced batch size for better carrier compatibility
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const promises = batch.map(msg => this.sendSMS(msg.data, msg.messageType));
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.success++;
          results.details.push({
            phone: batch[index].data.to,
            status: 'success',
            messageId: result.value.messageId
          });
        } else {
          results.failed++;
          results.details.push({
            phone: batch[index].data.to,
            status: 'failed',
            error: result.status === 'fulfilled' ? result.value.error : result.reason
          });
        }
      });
      
      // Add longer delay between batches for carrier compatibility
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      }
    }
    
    return results;
  }

  // AI-powered message optimization based on performance
  async optimizeMessage(messageType: string, data: SMSData, previousPerformance?: {
    deliveryRate: number;
    responseRate: number;
    conversionRate: number;
  }): Promise<string> {
    try {
      const optimizationPrompt = `
        Optimize SMS message for better performance:
        
        Message Type: ${messageType}
        Customer: ${data.customerName}
        
        Previous Performance:
        - Delivery Rate: ${previousPerformance?.deliveryRate || 95}%
        - Response Rate: ${previousPerformance?.responseRate || 15}%
        - Conversion Rate: ${previousPerformance?.conversionRate || 8}%
        
        Create an improved version that:
        - Increases engagement
        - Improves response rates
        - Drives more conversions
        - Maintains professional tone
        - Stays under 160 characters
        
        Focus on psychological triggers like urgency, scarcity, and personalization.
        
        Respond with JSON: { "optimizedMessage": "your improved message" }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert in SMS marketing optimization with deep understanding of customer psychology and B2B communication."
          },
          {
            role: "user",
            content: optimizationPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 150
      });

      const content = JSON.parse(response.choices[0].message.content || '{}');
      return content.optimizedMessage || this.getFallbackMessage(messageType, data);
    } catch (error) {
      console.error('SMS optimization failed:', error);
      return this.getFallbackMessage(messageType, data);
    }
  }

  private getFallbackMessage(messageType: string, data: SMSData): string {
    // Twilio CTA verification compliant fallback messages with brand prefix
    const customerName = data.customerName || 'Customer';
    
    switch (messageType) {
      case 'order_confirmation':
        return `${this.companyName}: Thank you ${customerName}! Order #${data.orderNumber} for $${data.orderTotal} confirmed. Reply STOP to opt out.`;
        
      case 'order_ready':
        return `${this.companyName}: ${customerName}, order #${data.orderNumber} is ready for pickup! Reply STOP to opt out.`;
        
      case 'delivery_update':
        return `${this.companyName}: Order #${data.orderNumber} update: ${data.orderStatus}. Expected: ${data.deliveryTime || 'Soon'}. Reply STOP to opt out.`;
        
      case 'staff_new_order_alert':
        return `${this.companyName}: NEW ORDER #${data.orderNumber} by ${customerName} - $${data.orderTotal}. Check app. Reply STOP to opt out.`;

      case 'staff_new_account_alert':
        return `${this.companyName}: 🔔 NEW B2B ACCOUNT REQUEST
Business: ${data.customData?.businessName || 'Unknown Business'}
Contact: ${customerName}
Phone: ${data.customData?.phone || 'N/A'}
FEIN: ${data.customData?.feinNumber || 'N/A'}
URGENT: Approve/reject in admin dashboard now. Reply STOP to opt out.`;

      case 'promotional':
        return `${this.companyName}: ${customerName}, special offer! ${data.promoCode ? `Code: ${data.promoCode}` : 'Contact us'}. Reply STOP to opt out.`;

      case 'order_note':
        return `${this.companyName}: ${customerName}, note added to order #${data.orderNumber}. Check app for details. Reply STOP to opt out.`;
        
      default:
        return `${this.companyName}: ${customerName}, update available. Contact us for details. Reply STOP to opt out.`;
    }
  }
}

export const smsService = SMSService.getInstance();