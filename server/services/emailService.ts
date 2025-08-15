import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';
import { emailTemplateRegistry } from '../../shared/email-template-registry';

// Initialize SendGrid with better error handling
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid API key configured');
} else {
  console.error('❌ SENDGRID_API_KEY environment variable not set');
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailData {
  to: string;
  customerName?: string;
  orderNumber?: string;
  orderTotal?: number;
  orderItems?: any[];
  orderStatus?: string;
  deliveryAddress?: string;
  orderNotes?: string;
  promoCode?: string;
  customData?: any;
  language?: string; // Language code (e.g., 'en', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'hi')
  customerLocation?: string; // For cultural context
  // Account approval specific fields
  username?: string;
  password?: string;
  businessName?: string;
  customerLevel?: number;
  creditLimit?: number;
}

export class EmailService {
  private static instance: EmailService;
  private fromEmail = (process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'info@shopgokul.com').toLowerCase();
  private companyName = 'Gokul Wholesale Inc.';
  private companyPhone = '(630) 540-9910';
  private companyAddress = '1141 W Bryn Mawr Ave, Itasca, IL 60143';
  private supportEmail = 'sales@gokulwholesaleinc.com';
  private logoUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/gokul-logo.png`;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // Use preferred language from user data, fallback to auto-detection
  private detectLanguage(data: EmailData): string {
    // ALWAYS prioritize the language parameter passed in data - this fixes admin/staff language issues
    if (data.language && data.language.trim().length > 0) {
      console.log(`🌐 Using passed language parameter: ${data.language}`);
      return data.language;
    }
    
    // Check if preferredLanguage is passed in data (for both customer and staff notifications)
    if ((data as any).preferredLanguage && (data as any).preferredLanguage.trim().length > 0) {
      console.log(`🌐 Using preferredLanguage from data: ${(data as any).preferredLanguage}`);
      return (data as any).preferredLanguage;
    }
    
    // Language detection based on email domain - with null check
    if (!data.to) {
      console.log(`🌐 No email address provided, defaulting to 'en'`);
      return 'en';
    }
    
    const emailDomain = data.to.split('@')[1]?.toLowerCase();
    const domainLanguageMap: { [key: string]: string } = {
      'gmail.com': 'en',
      'yahoo.com': 'en',
      'hotmail.com': 'en',
      'outlook.com': 'en',
      'gmx.de': 'de',
      'web.de': 'de',
      'orange.fr': 'fr',
      'free.fr': 'fr',
      'yahoo.fr': 'fr',
      'gmail.es': 'es',
      'yahoo.es': 'es',
      'qq.com': 'zh',
      '163.com': 'zh',
      'sina.com': 'zh',
      'yahoo.co.jp': 'ja',
      'gmail.co.jp': 'ja',
      'yandex.ru': 'ru',
      'mail.ru': 'ru',
      'gmail.com.br': 'pt',
      'yahoo.com.br': 'pt',
      'gmail.it': 'it',
      'yahoo.it': 'it',
      'naver.com': 'ko',
      'daum.net': 'ko'
    };
    
    // Check for country-specific domains
    if (emailDomain) {
      if (emailDomain.endsWith('.mx') || emailDomain.endsWith('.es') || emailDomain.endsWith('.ar')) return 'es';
      if (emailDomain.endsWith('.fr') || emailDomain.endsWith('.ca')) return 'fr';
      if (emailDomain.endsWith('.de') || emailDomain.endsWith('.at') || emailDomain.endsWith('.ch')) return 'de';
      if (emailDomain.endsWith('.it')) return 'it';
      if (emailDomain.endsWith('.br')) return 'pt';
      if (emailDomain.endsWith('.jp')) return 'ja';
      if (emailDomain.endsWith('.cn')) return 'zh';
      if (emailDomain.endsWith('.kr')) return 'ko';
      if (emailDomain.endsWith('.ru')) return 'ru';
      if (emailDomain.endsWith('.in')) return 'hi';
      if (emailDomain.endsWith('.sa') || emailDomain.endsWith('.ae')) return 'ar';
      
      return domainLanguageMap[emailDomain] || 'en';
    }
    
    // Name-based detection (basic patterns)
    const name = data.customerName?.toLowerCase() || '';
    if (name.includes('josé') || name.includes('maría') || name.includes('carlos')) return 'es';
    if (name.includes('jean') || name.includes('pierre') || name.includes('marie')) return 'fr';
    if (name.includes('hans') || name.includes('klaus') || name.includes('wolfgang')) return 'de';
    if (name.includes('giovanni') || name.includes('marco') || name.includes('giuseppe')) return 'it';
    if (name.includes('takeshi') || name.includes('hiroshi') || name.includes('yuki')) return 'ja';
    if (name.includes('wang') || name.includes('li') || name.includes('zhang')) return 'zh';
    
    return 'en'; // Default to English
  }

  // Get language-specific formatting
  private getLanguageFormatting(language: string) {
    const formats: { [key: string]: { currency: string; dateFormat: string; numberFormat: string; rtl: boolean } } = {
      'en': { currency: 'USD', dateFormat: 'MM/DD/YYYY', numberFormat: '1,234.56', rtl: false },
      'es': { currency: 'USD', dateFormat: 'DD/MM/YYYY', numberFormat: '1.234,56', rtl: false },
      'fr': { currency: 'EUR', dateFormat: 'DD/MM/YYYY', numberFormat: '1 234,56', rtl: false },
      'de': { currency: 'EUR', dateFormat: 'DD.MM.YYYY', numberFormat: '1.234,56', rtl: false },
      'it': { currency: 'EUR', dateFormat: 'DD/MM/YYYY', numberFormat: '1.234,56', rtl: false },
      'pt': { currency: 'USD', dateFormat: 'DD/MM/YYYY', numberFormat: '1.234,56', rtl: false },
      'ja': { currency: 'JPY', dateFormat: 'YYYY/MM/DD', numberFormat: '1,234', rtl: false },
      'zh': { currency: 'CNY', dateFormat: 'YYYY/MM/DD', numberFormat: '1,234.56', rtl: false },
      'ko': { currency: 'KRW', dateFormat: 'YYYY.MM.DD', numberFormat: '1,234', rtl: false },
      'ru': { currency: 'RUB', dateFormat: 'DD.MM.YYYY', numberFormat: '1 234,56', rtl: false },
      'hi': { currency: 'INR', dateFormat: 'DD/MM/YYYY', numberFormat: '1,23,456.78', rtl: false },
      'gu': { currency: 'INR', dateFormat: 'DD/MM/YYYY', numberFormat: '1,23,456.78', rtl: false },
      'ar': { currency: 'SAR', dateFormat: 'DD/MM/YYYY', numberFormat: '1,234.56', rtl: true },
      'ur': { currency: 'PKR', dateFormat: 'DD/MM/YYYY', numberFormat: '1,234.56', rtl: true }
    };
    
    return formats[language] || formats['en'];
  }

  // Registry-based email content generation - NO MORE JSON PARSING ISSUES
  async generateEmailContent(
    templateType: string,
    data: EmailData,
    tone: 'professional' | 'friendly' | 'urgent' = 'professional'
  ): Promise<EmailTemplate> {
    const language = this.detectLanguage(data);
    
    console.log(`🎯 Using registry-based email template for ${templateType} in language: ${language}`);
    console.log(`📧 Generating reliable email for ${data.to} - NO JSON parsing needed`);
    if (templateType === 'otp_verification') {
      console.log(`🔐 OTP Debug - data.otpCode:`, (data as any).otpCode);
      console.log(`🔐 OTP Debug - data keys:`, Object.keys(data));
    }
    
    try {
      // Prepare template data for registry
      const templateData = {
        orderNumber: data.orderNumber || 'N/A',
        customerName: data.customerName || 'Valued Customer',
        orderTotal: data.orderTotal || 0,
        orderItems: data.orderItems || [],
        deliveryAddress: data.deliveryAddress,
        orderDate: (data as any).customData?.orderDate || new Date().toLocaleDateString('en-US'),
        companyName: this.companyName,
        companyPhone: this.companyPhone,
        supportEmail: this.supportEmail,
        logoUrl: this.logoUrl,
        companyAddress: this.companyAddress,
        // OTP specific fields  
        otpCode: (data as any).otpCode,
        expiresInMinutes: (data as any).expiresInMinutes,
        systemName: (data as any).systemName,
        securityMessage: (data as any).securityMessage
      };

      // Use registry templates - 100% RELIABLE, NO JSON PARSING
      if (templateType === 'order_confirmation') {
        const template = emailTemplateRegistry.getCustomerOrderConfirmation(language, templateData);
        console.log(`✅ Registry template generated successfully for customer: ${data.customerName}`);
        return template;
      } else if (templateType === 'staff_new_order_alert') {
        const template = emailTemplateRegistry.getStaffOrderAlert(language, templateData);
        console.log(`✅ Registry template generated successfully for staff alert: ${language}`);
        return template;
      } else if (templateType === 'otp_verification') {
        const template = emailTemplateRegistry.getOtpVerification(language, templateData);
        console.log(`✅ OTP verification template generated successfully for: ${data.customerName}`);
        return template;
      } else {
        // For other template types, use enhanced fallback
        console.log(`🔄 Using enhanced fallback for template type: ${templateType}`);
        return this.getFallbackTemplate(templateType, data);
      }
      
    } catch (error) {
      console.error('❌ Registry template generation failed, using fallback:', error);
      console.error('Language detected:', language);
      console.error('Template type:', templateType);
      return this.getFallbackTemplate(templateType, data);
    }
  }

  private createEmailPrompt(templateType: string, data: EmailData, tone: string, language: string, formatting: any): string {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ja': 'Japanese',
      'zh': 'Chinese (Simplified)',
      'ko': 'Korean',
      'ru': 'Russian',
      'hi': 'Hindi',
      'gu': 'Gujarati',
      'ar': 'Arabic',
      'ur': 'Urdu'
    };

    let prompt = `Generate email content for template type: ${templateType}
    
    CRITICAL JSON REQUIREMENTS:
    - Response must be valid JSON only
    - No markdown formatting or code blocks
    - No additional text outside JSON
    - Escape all special characters properly
    - Use double quotes for all strings
    
    PROFESSIONAL EMAIL DESIGN REQUIREMENTS:
    - Use modern, responsive HTML email template design
    - Include professional color scheme: primary (#2563eb), secondary (#059669), accent (#dc2626)
    - Use clean typography with proper hierarchy
    - Include hover effects and subtle animations
    - Add professional email header with company branding
    - Use card-based layout with subtle shadows and rounded corners
    - Include proper spacing and margins for readability
    - Add branded footer with company information
    - Use icons and visual elements to enhance readability
    - Ensure mobile-responsive design that looks great on all devices
    
    LANGUAGE REQUIREMENTS:
    - Write ALL content in ${languageNames[language] || 'English'} (language code: ${language})
    - Use proper grammar and cultural etiquette for ${languageNames[language] || 'English'} speakers
    - Include appropriate business greetings and closings for this culture
    - Use culturally appropriate currency format: ${formatting.currency}
    - Use date format: ${formatting.dateFormat}
    - Use number format: ${formatting.numberFormat}
    
    CRITICAL CURRENCY AND DATE FORMAT REQUIREMENTS:
    - NEVER use any currency other than USD format: $XX.XX (Dollar sign followed by amount)
    - NEVER convert to INR (₹), EUR (€), GBP (£), or any other currency symbols
    - ALWAYS use US date format: MM/DD/YYYY (e.g., 07/18/2025, 12/31/2025)
    - NEVER use DD/MM/YYYY, YYYY-MM-DD, or any other date formats
    - Keep ALL numeric values, amounts, and dates in English/US format regardless of email language
    
    BILINGUAL REQUIREMENT:
    ${language !== 'en' ? `- IMPORTANT: After the main content in ${languageNames[language]}, add a horizontal line and include a complete English translation at the bottom
    - Format: [Main content in ${languageNames[language]}] + [horizontal line] + [Complete English translation]
    - This ensures all staff can understand the content regardless of language preference
    - CRITICAL: Even in ${languageNames[language]} content, use USD amounts ($XX.XX) and US dates (MM/DD/YYYY)` : '- Single language content (English only)'}
    ${formatting.rtl ? '- Use right-to-left text direction in HTML' : ''}
    
    Customer Data:
    - Name: ${data.customerName || 'Valued Customer'}
    - Email: ${data.to}
    
    Business Context:
    - Company: ${this.companyName}
    - Industry: B2B Wholesale Distribution
    - Phone: ${this.companyPhone}
    - Address: ${this.companyAddress}
    - Support Email: ${this.supportEmail}
    - Logo URL: ${this.logoUrl}
    - Tone: ${tone}
    
    `;

    switch (templateType) {
      case 'order_confirmation':
        const orderDate = data.customData?.orderDate ? new Date(data.customData.orderDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
        const deliveryDate = data.customData?.deliveryDate ? new Date(data.customData.deliveryDate).toLocaleDateString('en-US') : 'TBD';
        
        prompt += `
        Order Details (USE EXACT VALUES):
        - Order Number: ${data.orderNumber}
        - Order Date: ${orderDate}
        - Total Amount: $${data.orderTotal?.toFixed(2)}
        - Items: ${data.orderItems?.length || 0} items
        - Delivery Address: ${data.deliveryAddress}
        - Delivery Date: ${deliveryDate}
        - Order Type: ${data.customData?.orderType || 'delivery'}
        
        CRITICAL REQUIREMENTS:
        - Subject line MUST include order number: "Order Confirmation #${data.orderNumber} - Gokul Wholesale Inc."
        - Use modern, professional email template with this exact structure:
        
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation</title>
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f8fafc; }
                .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; }
                .logo-container { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
                .logo { max-height: 80px; max-width: 200px; }
                .header-title { color: white; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .content { padding: 40px 30px; color: #1f2937; }
                .greeting { font-size: 18px; color: #111827; margin-bottom: 20px; font-weight: 600; }
                .order-summary { background: #ffffff; border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #2563eb; border: 1px solid #e5e7eb; }
                .order-title { color: #1f2937; font-size: 22px; font-weight: 700; margin-bottom: 20px; }
                .order-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
                .order-item:last-child { border-bottom: none; }
                .order-label { font-weight: 700; color: #111827; }
                .order-value { color: #1f2937; font-weight: 600; }
                .total-amount { background: #2563eb; color: white; padding: 15px 20px; border-radius: 8px; font-size: 20px; font-weight: 700; text-align: center; margin: 20px 0; }
                .next-steps { background: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #cbd5e1; }
                .next-steps-title { color: #1f2937; font-size: 18px; font-weight: 700; margin-bottom: 15px; }
                .footer { background: #1f2937; padding: 30px; text-align: center; color: #9ca3af; }
                .footer-title { color: white; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
                .contact-info { margin: 10px 0; }
                .contact-link { color: #60a5fa; text-decoration: none; }
                .contact-link:hover { color: #3b82f6; }
                @media (max-width: 600px) {
                    .email-container { width: 100% !important; }
                    .header, .content { padding: 20px !important; }
                    .order-summary { padding: 20px !important; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo-container">
                        <img src="${this.logoUrl}" alt="Gokul Wholesale Inc." class="logo" onerror="this.style.display='none'; this.nextSibling.style.display='block';">
                        <div style="display:none; background: rgba(255,255,255,0.2); color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px;">GOKUL WHOLESALE INC.</div>
                    </div>
                    <h1 class="header-title">[ORDER CONFIRMATION TITLE]</h1>
                </div>
                
                <div class="content">
                    [MAIN CONTENT HERE]
                </div>
                
                <div class="footer">
                    <div class="footer-title">Gokul Wholesale Inc.</div>
                    <div class="contact-info">${this.companyAddress}</div>
                    <div class="contact-info">📞 ${this.companyPhone} | ✉️ <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a></div>
                </div>
            </div>
        </body>
        </html>
        - Show EXACT order date: ${orderDate}
        - Display EXACT order number: ${data.orderNumber}
        - Show EXACT total amount: $${data.orderTotal?.toFixed(2)}
        - Show EXACT delivery date: ${deliveryDate}
        - Use support email: ${this.supportEmail} (NOT harshjpatel9@gmail.com)
        - Include company contact: ${this.companyPhone}
        - Company address: ${this.companyAddress}
        - NEVER mention "shipping" - we only do PICKUP or DELIVERY
        - If order type is "pickup", show pickup instructions and location
        - If order type is "delivery", show delivery address and estimated delivery time
        - Use professional business email design with company branding
        - Include appropriate next steps based on order type (pickup vs delivery)
        - CRITICAL: ALL paragraph text MUST use inline styling: style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;" for maximum readability
        - CRITICAL: Ensure all text content has dark colors (#1f2937, #111827) - NEVER use light gray text (#9ca3af, #6b7280, #374151)
        - CRITICAL: Order details section MUST have white background (#ffffff) with dark text for readability
        - CRITICAL: Replace ALL order-label and order-value classes with inline styling:
          * order-label: style="font-weight: 700; color: #111827;"
          * order-value: style="color: #1f2937; font-weight: 600;"
        - CRITICAL: Use inline styling for ALL text elements to ensure proper contrast on mobile devices
        - CRITICAL: Always include company name text "GOKUL WHOLESALE INC." in header even when logo image is present - this ensures branding shows even when images are blocked by email clients
        
        ${language !== 'en' ? `
        CRITICAL BILINGUAL REQUIREMENT:
        - First write the complete email in ${languageNames[language]}
        - CRITICAL: ALWAYS use USD currency format with $ symbol (e.g., $${data.orderTotal?.toFixed(2)}) - NEVER use INR, EUR, or any other currency
        - CRITICAL: ALWAYS use US date format MM/DD/YYYY (e.g., ${orderDate}) - NEVER use localized date formats
        - CRITICAL: Keep ALL amounts, dates, and numbers in English/USD format regardless of language (e.g., $${data.orderTotal?.toFixed(2)}, ${orderDate}, Order #${data.orderNumber})
        - Then add a horizontal line separator: <hr style="margin: 20px 0; border: 1px solid #ccc;">
        - Then add a section with heading "ENGLISH TRANSLATION:" followed by the complete email in English
        - Both versions must be complete and professional
        - The English translation is MANDATORY for all non-English emails
        ` : ''}
        
        Create a professional order confirmation email that thanks the customer, confirms their order details, and provides next steps for either pickup or delivery.
        `;
        break;

      case 'staff_new_order_alert':
        const staffOrderDate = data.customData?.orderDate ? new Date(data.customData.orderDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
        
        prompt += `
        New Order Alert for Staff/Admin (USE EXACT VALUES):
        - Order Number: ${data.orderNumber}
        - Customer Name: ${data.customerName}
        - Order Date: ${staffOrderDate}
        - Total Amount: $${data.orderTotal?.toFixed(2)}
        - Items Count: ${data.orderItems?.length || 0} items
        - Delivery Address: ${data.deliveryAddress}
        
        CRITICAL REQUIREMENTS FOR STAFF ALERT:
        - Subject line MUST be: "🚨 New Order ${data.orderNumber} Created by ${data.customerName}"
        - Use professional staff alert email template with this exact structure:
        
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Order Alert</title>
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f8fafc; }
                .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center; }
                .logo-container { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
                .logo { max-height: 80px; max-width: 200px; }
                .header-title { color: white; font-size: 26px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .alert-badge { background: #fef2f2; color: #dc2626; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; display: inline-block; }
                .content { padding: 40px 30px; }
                .order-summary { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #dc2626; }
                .order-title { color: #dc2626; font-size: 22px; font-weight: 600; margin-bottom: 20px; }
                .order-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #fee2e2; }
                .order-item:last-child { border-bottom: none; }
                .order-label { font-weight: 600; color: #374151; }
                .order-value { color: #1f2937; font-weight: 500; }
                .total-amount { background: #dc2626; color: white; padding: 15px 20px; border-radius: 8px; font-size: 20px; font-weight: 700; text-align: center; margin: 20px 0; }
                .action-required { background: #fff7ed; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #fed7aa; }
                .action-title { color: #ea580c; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
                .action-button { background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 15px; }
                .footer { background: #1f2937; padding: 30px; text-align: center; color: #9ca3af; }
                .footer-title { color: white; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
                .contact-info { margin: 10px 0; }
                .contact-link { color: #60a5fa; text-decoration: none; }
                @media (max-width: 600px) {
                    .email-container { width: 100% !important; }
                    .header, .content { padding: 20px !important; }
                    .order-summary { padding: 20px !important; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo-container">
                        <img src="${this.logoUrl}" alt="Gokul Wholesale Inc." class="logo" onerror="this.style.display='none'; this.nextSibling.style.display='block';">
                        <div style="display:none; background: rgba(255,255,255,0.2); color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px;">GOKUL WHOLESALE INC.</div>
                    </div>
                    <div class="alert-badge">🚨 URGENT: New Order Alert</div>
                    <h1 class="header-title">[STAFF ALERT TITLE]</h1>
                </div>
                
                <div class="content">
                    [MAIN CONTENT HERE]
                </div>
                
                <div class="footer">
                    <div class="footer-title">Gokul Wholesale Inc.</div>
                    <div class="contact-info">${this.companyAddress}</div>
                    <div class="contact-info">📞 ${this.companyPhone} | ✉️ <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a></div>
                </div>
            </div>
        </body>
        </html>
        - This is a STAFF/ADMIN notification, NOT a customer confirmation
        - Focus on order management and action items for staff
        - Include quick summary of order details
        - Tell staff to "view app for full order details"
        - Use professional administrative tone
        - Include order processing instructions
        - Use support email: ${this.supportEmail}
        - DO NOT include customer contact information in staff emails
        
        ${language !== 'en' ? `
        CRITICAL BILINGUAL REQUIREMENT:
        - First write the complete staff alert in ${languageNames[language]}
        - CRITICAL: ALWAYS use USD currency format with $ symbol (e.g., $${data.orderTotal?.toFixed(2)}) - NEVER use INR, EUR, or any other currency
        - CRITICAL: ALWAYS use US date format MM/DD/YYYY (e.g., ${staffOrderDate}) - NEVER use localized date formats
        - CRITICAL: Keep ALL amounts, dates, and numbers in English/USD format regardless of language (e.g., $${data.orderTotal?.toFixed(2)}, ${staffOrderDate}, Order #${data.orderNumber})
        - Then add a horizontal line separator: <hr style="margin: 20px 0; border: 1px solid #ccc;">
        - Then add a section with heading "ENGLISH TRANSLATION:" followed by the complete alert in English
        - Both versions must be complete and professional
        - The English translation is MANDATORY for all non-English emails
        ` : ''}
        
        Create a staff/admin alert email that notifies staff about a new order requiring attention and processing.
        `;
        break;
        
      case 'order_note':
        const noteAddedBy = data.customData?.fromUser || data.customData?.staffName || 'Staff Member';
        const isCustomerNote = data.customData?.addedBy && !data.customData?.addedBy.includes('admin') && !data.customData?.addedBy.includes('employee');
        const noteType = isCustomerNote ? 'Customer' : 'Staff member';
        const customerOrStaff = isCustomerNote ? 'Customer' : 'Staff';
        
        prompt += `
        Order Note Notification (USE EXACT VALUES):
        - Order Number: ${data.orderNumber}
        - Customer Name: ${data.customerName}
        - Note Content: "${data.customData?.note || 'Note content not specified'}"
        - Note Added By: ${noteAddedBy} (${noteType})
        - Who Added Note: ${customerOrStaff}
        
        CRITICAL REQUIREMENTS FOR ORDER NOTE:
        - Subject line MUST be: "💬 ${noteType} ${noteAddedBy} added a note to Order #${data.orderNumber}"
        - Use OpenAI to create contextual content that explains WHO left the note and WHY you're being notified
        - ALWAYS mention that "${noteType} ${noteAddedBy} has left a new note on Order #${data.orderNumber}"
        - Include the actual note content in quotes
        - Explain what action might be needed (if customer note: review and respond; if staff note: informational)
        - Use professional order note email template with this exact structure:
        
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Note</title>
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f8fafc; }
                .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center; }
                .logo-container { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
                .logo { max-height: 80px; max-width: 200px; }
                .header-title { color: white; font-size: 26px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .note-badge { background: #dcfce7; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; display: inline-block; }
                .content { padding: 40px 30px; }
                .note-summary { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #059669; }
                .note-title { color: #059669; font-size: 22px; font-weight: 600; margin-bottom: 20px; }
                .note-content { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #d1fae5; font-size: 16px; line-height: 1.6; }
                .staff-info { color: #6b7280; font-size: 14px; margin-top: 15px; }
                .order-link { background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; margin-top: 15px; }
                .footer { background: #1f2937; padding: 30px; text-align: center; color: #9ca3af; }
                .footer-title { color: white; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
                .contact-info { margin: 10px 0; }
                .contact-link { color: #60a5fa; text-decoration: none; }
                @media (max-width: 600px) {
                    .email-container { width: 100% !important; }
                    .header, .content { padding: 20px !important; }
                    .note-summary { padding: 20px !important; }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <div class="logo-container">
                        <img src="${this.logoUrl}" alt="Gokul Wholesale Inc." class="logo" onerror="this.style.display='none'; this.nextSibling.style.display='block';">
                        <div style="display:none; background: rgba(255,255,255,0.2); color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px;">GOKUL WHOLESALE INC.</div>
                    </div>
                    <div class="note-badge">📝 Order Update</div>
                    <h1 class="header-title">[ORDER NOTE TITLE]</h1>
                </div>
                
                <div class="content">
                    [MAIN CONTENT HERE]
                </div>
                
                <div class="footer">
                    <div class="footer-title">Gokul Wholesale Inc.</div>
                    <div class="contact-info">${this.companyAddress}</div>
                    <div class="contact-info">📞 ${this.companyPhone} | ✉️ <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a></div>
                </div>
            </div>
        </body>
        </html>
        - This notification informs customer about a new note added to their order
        - Show the actual note content clearly
        - Include order number for easy reference
        - Mention which staff member added the note
        - Use professional but friendly tone
        - Include "View order details in app" call-to-action
        - Use support email: ${this.supportEmail}
        
        ${language !== 'en' ? `
        CRITICAL BILINGUAL REQUIREMENT:
        - First write the complete order note notification in ${languageNames[language]}
        - CRITICAL: ALWAYS use USD currency format with $ symbol (e.g., $${data.orderTotal?.toFixed(2)}) - NEVER use INR, EUR, or any other currency
        - CRITICAL: ALWAYS use US date format MM/DD/YYYY - NEVER use localized date formats
        - CRITICAL: Keep ALL amounts, dates, and numbers in English/USD format regardless of language (e.g., $${data.orderTotal?.toFixed(2)}, Order #${data.orderNumber})
        - Then add a horizontal line separator: <hr style="margin: 20px 0; border: 1px solid #ccc;">
        - Then add a section with heading "ENGLISH TRANSLATION:" followed by the complete notification in English
        - Both versions must be complete and professional
        - The English translation is MANDATORY for all non-English emails
        ` : ''}
        
        ENHANCED OPENAI INSTRUCTION WITH CONTEXT:
        Generate a professional email that provides CLEAR CONTEXT about why this notification was sent:
        
        1. START with contextual explanation: "You're receiving this email because ${noteType} ${noteAddedBy} has left a new note on your Order #${data.orderNumber}"
        2. EXPLAIN the significance: ${noteType === 'Customer' ? 'This customer message may require your attention and response' : 'This is an informational update from our team'}
        3. SHOW the note content prominently with proper formatting
        4. SPECIFY next steps: ${noteType === 'Customer' ? 'Please review this customer message and respond if needed' : 'No action required unless you have questions'}
        5. INCLUDE clear call-to-action for accessing the order
        
        Use professional but human language. The recipient should immediately understand:
        - Why they received this email
        - Who left the note and why it matters
        - What they need to do next
        
        Create an order note notification email that eliminates confusion and provides clear context from the subject line through the entire message.
        `;
        break;
        
      case 'order_status_update':
        prompt += `
        Order Update:
        - Order Number: ${data.orderNumber}
        - New Status: ${data.orderStatus}
        - Notes: ${data.orderNotes || 'No additional notes'}
        
        ${language !== 'en' ? `
        CRITICAL BILINGUAL REQUIREMENT:
        - First write the complete status update in ${languageNames[language]}
        - IMPORTANT: Keep ALL amounts, dates, and numbers in English format (e.g., Order ${data.orderNumber}, Status: ${data.orderStatus})
        - Then add a horizontal line separator: <hr style="margin: 20px 0; border: 1px solid #ccc;">
        - Then add a section with heading "ENGLISH TRANSLATION:" followed by the complete update in English
        - Both versions must be complete and professional
        - The English translation is MANDATORY for all non-English emails
        ` : ''}
        
        Create an order status update email that keeps the customer informed about their order progress.
        `;
        break;
        
      case 'promotional':
        prompt += `
        Promotion Details:
        - Promo Code: ${data.promoCode || 'No code provided'}
        - Custom Message: ${data.customData?.message || 'Special offer for valued customers'}
        
        ${language !== 'en' ? `
        BILINGUAL REQUIREMENT:
        - First write the complete promotional email in ${languageNames[language]}
        - Then add a horizontal line (---) 
        - Then add a section "English Translation:" with the complete promotional content in English
        - Both versions should be complete and professional
        ` : ''}
        
        Create an engaging promotional email that drives sales and customer engagement.
        `;
        break;
        
      case 'receipt':
        prompt += `
        Receipt/Invoice Email with PDF Attachment:
        - Order Number: ${data.orderNumber}
        - Customer Name: ${data.customerName}
        - Order Total: $${data.orderTotal?.toFixed(2)}
        - Delivery Type: ${data.customData?.orderType || 'Standard'}
        
        CRITICAL REQUIREMENTS FOR RECEIPT EMAIL:
        - Subject line MUST be: "📄 Your Receipt for Order #${data.orderNumber} - Gokul Wholesale Inc."
        - This email includes a PDF receipt attachment
        - Use professional, thankful tone
        - Confirm order completion and payment
        - Include company contact information
        - Mention PDF attachment clearly
        - Provide customer service information
        
        ${language !== 'en' ? `
        BILINGUAL REQUIREMENT:
        - First write the complete receipt email in ${languageNames[language]}
        - CRITICAL: Keep ALL order numbers, amounts, and details in English/USD format (e.g., Order #${data.orderNumber}, $${data.orderTotal?.toFixed(2)})
        - Then add a horizontal line separator: <hr style="margin: 20px 0; border: 1px solid #ccc;">
        - Then add a section with heading "ENGLISH TRANSLATION:" followed by the complete email in English
        - Both versions must be complete and professional
        - The English translation is MANDATORY for all non-English emails
        ` : ''}
        
        Create a professional receipt email that thanks the customer and explains the PDF attachment.
        `;
        break;
      
      case 'account_approved':
        prompt += `
        Account Approval Details:
        - Business Name: ${data.businessName || 'N/A'}
        - Username: ${data.username || 'N/A'}
        - Password: ${data.password || 'N/A'}
        - Customer Level: ${data.customerLevel || 'N/A'}
        - Credit Limit: $${data.creditLimit?.toFixed(2) || '0.00'}
        
        CRITICAL REQUIREMENTS FOR ACCOUNT APPROVAL:
        - Subject line MUST be: "🎉 Account Approved - Welcome to Gokul Wholesale Inc.!"
        - Include login credentials clearly (username and password)
        - Provide next steps for accessing the account
        - Include company contact information
        - Use professional welcome tone
        - Emphasize security and credential protection
        
        ${language !== 'en' ? `
        BILINGUAL REQUIREMENT:
        - First write the complete approval email in ${languageNames[language]}
        - CRITICAL: Keep ALL usernames, passwords, and account details in English format
        - Then add a horizontal line separator: <hr style="margin: 20px 0; border: 1px solid #ccc;">
        - Then add a section with heading "ENGLISH TRANSLATION:" followed by the complete email in English
        - Both versions must be complete and professional
        - The English translation is MANDATORY for all non-English emails
        ` : ''}
        
        Create a professional account approval email that welcomes the customer and provides their login credentials.
        `;
        break;
        
      default:
        prompt += `
        ${language !== 'en' ? `
        BILINGUAL REQUIREMENT:
        - First write the complete email in ${languageNames[language]}
        - Then add a horizontal line (---) 
        - Then add a section "English Translation:" with the complete email in English
        - Both versions should be complete and professional
        ` : ''}
        
        Create a general business email for: ${templateType}`;
    }

    prompt += `
    
    Please respond with valid JSON in this format:
    {
      "subject": "Email subject line",
      "htmlContent": "Full HTML email content with inline CSS styling",
      "textContent": "Plain text version of the email"
    }
    
    Requirements:
    - Subject line should be compelling and under 50 characters
    - HTML content should be mobile-responsive with inline CSS
    - Include company branding and professional styling
    - Text content should be a clean, readable plain text version
    - Personalize with customer name and relevant details
    - Include clear call-to-action when appropriate
    - NEVER use the word "shipping" - only use "pickup" or "delivery"
    - For pickup orders: include pickup location and instructions
    - For delivery orders: include delivery address and estimated delivery time
    `;

    return prompt;
  }

  // Send email using SendGrid
  async sendEmail(data: EmailData, templateType: string, tone: 'professional' | 'friendly' | 'urgent' = 'professional'): Promise<boolean> {
    try {
      // Better API key validation
      if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SendGrid API key not configured - missing SENDGRID_API_KEY environment variable');
        return false;
      }

      if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        console.error('❌ SendGrid API key format appears invalid - should start with "SG."');
        return false;
      }

      // Generate AI-powered email content
      const template = await this.generateEmailContent(templateType, data, tone);
      console.log(`📧 Sending email to ${data.to}: ${template.subject}`);
      console.log(`📧 Email language detected: ${this.detectLanguage(data)}`);
      console.log(`📧 Email content preview: ${template.textContent.substring(0, 200)}...`);

      const msg = {
        to: data.to,
        from: {
          email: this.fromEmail,
          name: this.companyName
        },
        subject: template.subject,
        text: template.textContent,
        html: template.htmlContent
      };

      const result = await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${data.to} for ${templateType}, Message ID: ${result[0]?.headers?.['x-message-id'] || 'N/A'}`);
      return true;
    } catch (error: any) {
      console.error('❌ Email sending failed:', error);
      if (error.response?.body?.errors) {
        console.error('SendGrid error details:', error.response.body.errors);
      }
      return false;
    }
  }

  // Batch email sending with AI optimization
  // Method for email campaigns with custom templates
  async sendEmailWithTemplate(
    to: string,
    subject: string,
    textContent: string,
    htmlContent: string,
    templateData: { customerName?: string; companyName?: string; language?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const language = templateData.language || 'en';
      console.log(`📧 Sending campaign email to ${to} in ${language}`);
      
      // Replace placeholders in content
      let finalTextContent = textContent
        .replace(/{{customerName}}/g, templateData.customerName || 'Valued Customer')
        .replace(/{{companyName}}/g, templateData.companyName || '');

      // Add unsubscribe information to text content
      const unsubscribeUrl = 'https://shopgokul.com/unsubscribe';
      finalTextContent += `\n\n---\nYou received this email because you are subscribed to marketing emails from ${this.companyName}.\nTo unsubscribe from marketing emails, visit: ${unsubscribeUrl}\nFor support, email: ${this.supportEmail}\n\n${this.companyName}\n${this.companyAddress || ''}`;
      
      let finalHtmlContent = htmlContent
        .replace(/{{customerName}}/g, templateData.customerName || 'Valued Customer')
        .replace(/{{companyName}}/g, templateData.companyName || '');

      // Add unsubscribe link to HTML content (without hash routing)
      const unsubscribeSection = `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
          <p>You received this email because you are subscribed to marketing emails from ${this.companyName}.</p>
          <p>
            <a href="${unsubscribeUrl}" style="color: #dc2626; text-decoration: underline;">Unsubscribe from marketing emails</a> | 
            <a href="mailto:${this.supportEmail}" style="color: #2563eb; text-decoration: underline;">Contact Support</a>
          </p>
          <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
            ${this.companyName}<br>
            ${this.companyAddress || ''}
          </p>
        </div>
      `;

      // Add unsubscribe section before closing body tag, or append if no body tag exists
      if (finalHtmlContent.includes('</body>')) {
        finalHtmlContent = finalHtmlContent.replace('</body>', unsubscribeSection + '</body>');
      } else {
        finalHtmlContent += unsubscribeSection;
      }
      
      // If language is not English, generate localized content
      if (language !== 'en') {
        const localizedContent = await this.localizeContent(finalTextContent, finalHtmlContent, subject, language);
        finalTextContent = localizedContent.textContent;
        finalHtmlContent = localizedContent.htmlContent;
        subject = localizedContent.subject;
      }
      
      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.companyName
        },
        replyTo: {
          email: this.supportEmail,
          name: `${this.companyName} Support`
        },
        subject,
        text: finalTextContent,
        html: finalHtmlContent,
        categories: ['email-campaigns', 'wholesale-business', 'marketing'],
        headers: {
          // Include both web and mailto unsubscribe options for better compliance
          'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:unsubscribe@shopgokul.com>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      };
      
      await sgMail.send(msg);
      console.log(`✅ Campaign email sent successfully to ${to} in ${language}`);
      return { success: true };
      
    } catch (error: any) {
      console.error(`❌ Failed to send campaign email to ${to}:`, error);
      
      // Log detailed SendGrid error for debugging
      if (error.response?.body?.errors) {
        console.error('📧 SendGrid detailed errors:', JSON.stringify(error.response.body.errors, null, 2));
      }
      
      return { success: false, error: error.message };
    }
  }

  // Localize email content using OpenAI
  private async localizeContent(textContent: string, htmlContent: string, subject: string, language: string): Promise<{ textContent: string; htmlContent: string; subject: string }> {
    try {
      const languageNames: { [key: string]: string } = {
        'es': 'Spanish',
        'fr': 'French', 
        'de': 'German',
        'hi': 'Hindi',
        'gu': 'Gujarati',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'pt': 'Portuguese',
        'it': 'Italian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ru': 'Russian'
      };
      
      const targetLanguage = languageNames[language] || 'English';
      
      const prompt = `Translate this email campaign content to ${targetLanguage}. Maintain the same tone, formatting, and marketing effectiveness. Ensure cultural appropriateness for ${targetLanguage} speakers.

Subject: ${subject}

Text Content:
${textContent}

HTML Content:
${htmlContent}

Return JSON with "subject", "textContent", and "htmlContent" fields in ${targetLanguage}.`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        subject: result.subject || subject,
        textContent: result.textContent || textContent,
        htmlContent: result.htmlContent || htmlContent
      };
      
    } catch (error) {
      console.error('Error localizing email content:', error);
      // Return original content if localization fails
      return { textContent, htmlContent, subject };
    }
  }

  async sendBatchEmails(emails: { data: EmailData; templateType: string; tone?: 'professional' | 'friendly' | 'urgent' }[]): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };
    
    // Process emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map(email => 
        this.sendEmail(email.data, email.templateType, email.tone || 'professional')
      );
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.success++;
        } else {
          results.failed++;
        }
      });
      
      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // Fallback templates when AI fails
  private getFallbackTemplate(templateType: string, data: EmailData): EmailTemplate {
    // Detect language for fallback template
    const language = this.detectLanguage(data);
    
    switch (templateType) {
      case 'order_confirmation':
        const orderDate = data.customData?.orderDate ? new Date(data.customData.orderDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
        const deliveryDate = data.customData?.deliveryDate ? new Date(data.customData.deliveryDate).toLocaleDateString('en-US') : 'TBD';
        
        // Use language-specific fallback content
        if (language === 'hi') {
          return {
            subject: `ऑर्डर कन्फर्मेशन #${data.orderNumber} - ${this.companyName}`,
            htmlContent: `
              <!DOCTYPE html>
              <html xmlns="http://www.w3.org/1999/xhtml">
              <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>ऑर्डर कन्फर्मेशन</title>
                  <style>
                      body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f8fafc; }
                      .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                      .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; }
                      .logo-container { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
                      .logo { max-height: 80px; max-width: 200px; }
                      .header-title { color: white; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                      .content { padding: 40px 30px; color: #1f2937; }
                      .greeting { font-size: 18px; color: #111827; margin-bottom: 20px; font-weight: 600; }
                      .order-summary { background: #ffffff; border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #2563eb; border: 1px solid #e5e7eb; }
                      .order-title { color: #1f2937; font-size: 22px; font-weight: 700; margin-bottom: 20px; }
                      .order-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
                      .order-item:last-child { border-bottom: none; }
                      .order-label { font-weight: 700; color: #111827; }
                      .order-value { color: #1f2937; font-weight: 600; }
                      .total-amount { background: #2563eb; color: white; padding: 15px 20px; border-radius: 8px; font-size: 20px; font-weight: 700; text-align: center; margin: 20px 0; }
                      .footer { background: #1f2937; padding: 30px; text-align: center; color: #9ca3af; }
                      .footer-title { color: white; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
                      .contact-info { margin: 10px 0; }
                      .contact-link { color: #60a5fa; text-decoration: none; }
                      @media (max-width: 600px) {
                          .email-container { width: 100% !important; }
                          .header, .content { padding: 20px !important; }
                          .order-summary { padding: 20px !important; }
                      }
                  </style>
              </head>
              <body>
                  <div class="email-container">
                      <div class="header">
                          <div class="logo-container">
                              <img src="${this.logoUrl}" alt="${this.companyName} Logo" class="logo" style="display: block; max-height: 80px; max-width: 200px; margin: 0 auto;">
                              <div style="background: rgba(255,255,255,0.2); color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px; text-align: center; margin-top: 10px;">
                                  GOKUL WHOLESALE INC.
                              </div>
                          </div>
                          <h1 class="header-title">ऑर्डर कन्फर्मेशन</h1>
                      </div>
                      <div class="content">
                          <div class="greeting">प्रिय ${data.customerName || 'मूल्यवान ग्राहक'},</div>
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">${this.companyName} के साथ नया ऑर्डर देने के लिए धन्यवाद। हम आपके ऑर्डर की पुष्टि करते हैं और इसे सावधानीपूर्वक प्रोसेस कर रहे हैं।</p>
                          
                          <div class="order-summary">
                              <div class="order-title">ऑर्डर विवरण:</div>
                              <div class="order-item">
                                  <div class="order-label">ऑर्डर नंबर:</div>
                                  <div class="order-value">#${data.orderNumber}</div>
                              </div>
                              <div class="order-item">
                                  <div class="order-label">ऑर्डर तारीख:</div>
                                  <div class="order-value">${orderDate}</div>
                              </div>
                              <div class="order-item">
                                  <div class="order-label">डिलीवरी पता:</div>
                                  <div class="order-value">${data.deliveryAddress || 'स्टोर से पिकअप'}</div>
                              </div>
                          </div>
                          
                          <div class="total-amount">कुल राशि: $${data.orderTotal?.toFixed(2)}</div>
                          
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">किसी भी सवाल के लिए हमसे संपर्क करें: <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a> या फोन करें ${this.companyPhone}.</p>
                          
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">आपके व्यापार की हम सराहना करते हैं।</p>
                          
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">धन्यवाद,<br>${this.companyName}</p>
                          
                          <hr style="margin: 30px 0; border: 2px solid #e5e7eb;">
                          <div class="order-title">ENGLISH TRANSLATION:</div>
                          <div class="greeting">Dear ${data.customerName || 'Valued Customer'},</div>
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for placing a new order with ${this.companyName}. We are pleased to confirm your order and are currently processing it with the utmost care.</p>
                          <div class="order-summary">
                              <div class="order-title">Order Details:</div>
                              <div class="order-item">
                                  <div class="order-label">Order Number:</div>
                                  <div class="order-value">#${data.orderNumber}</div>
                              </div>
                              <div class="order-item">
                                  <div class="order-label">Order Date:</div>
                                  <div class="order-value">${orderDate}</div>
                              </div>
                              <div class="order-item">
                                  <div class="order-label">Delivery Address:</div>
                                  <div class="order-value">${data.deliveryAddress || 'Store Pickup'}</div>
                              </div>
                          </div>
                          <div class="total-amount">Total Amount: $${data.orderTotal?.toFixed(2)}</div>
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">For any inquiries, contact us at <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a> or call ${this.companyPhone}.</p>
                          <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Best regards,<br>${this.companyName}</p>
                      </div>
                      <div class="footer">
                          <div class="footer-title">${this.companyName}</div>
                          <div class="contact-info">${this.companyAddress}</div>
                          <div class="contact-info">📞 ${this.companyPhone} | ✉️ <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a></div>
                      </div>
                  </div>
              </body>
              </html>
            `,
            textContent: `ऑर्डर कन्फर्मेशन #${data.orderNumber}\n\nप्रिय ${data.customerName || 'मूल्यवान ग्राहक'},\n\nऑर्डर के लिए धन्यवाद! हम आपकी सेवा करने के लिए उत्साहित हैं।\n\nऑर्डर विवरण:\n- ऑर्डर नंबर: #${data.orderNumber}\n- ऑर्डर तारीख: ${orderDate}\n- कुल राशि: $${data.orderTotal?.toFixed(2)}\n- डिलीवरी पता: ${data.deliveryAddress || 'स्टोर से पिकअप'}\n\nकिसी भी सवाल के लिए हमसे संपर्क करें।\n\nधन्यवाद,\n${this.companyName}\n\n--- ENGLISH TRANSLATION ---\n\nOrder Confirmation #${data.orderNumber}\n\nDear ${data.customerName || 'Valued Customer'},\n\nThank you for your order! We're excited to serve you.\n\nOrder Details:\n- Order Number: #${data.orderNumber}\n- Order Date: ${orderDate}\n- Total Amount: $${data.orderTotal?.toFixed(2)}\n- Delivery Address: ${data.deliveryAddress || 'Store Pickup'}\n\nBest regards,\n${this.companyName}\n${this.companyAddress}\nPhone: ${this.companyPhone} | Email: ${this.supportEmail}`
          };
        }
        
        return {
          subject: `Order Confirmation #${data.orderNumber} - ${this.companyName}`,
          htmlContent: `
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Confirmation</title>
                <style>
                    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f8fafc; }
                    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; }
                    .logo-container { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px; }
                    .logo { max-height: 80px; max-width: 200px; }
                    .header-title { color: white; font-size: 28px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .content { padding: 40px 30px; color: #1f2937; }
                    .greeting { font-size: 18px; color: #111827; margin-bottom: 20px; font-weight: 600; }
                    .order-summary { background: #ffffff; border-radius: 12px; padding: 30px; margin: 30px 0; border-left: 4px solid #2563eb; border: 1px solid #e5e7eb; }
                    .order-title { color: #1f2937; font-size: 22px; font-weight: 700; margin-bottom: 20px; }
                    .order-item { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e5e7eb; }
                    .order-item:last-child { border-bottom: none; }
                    .order-label { font-weight: 700; color: #111827; }
                    .order-value { color: #1f2937; font-weight: 600; }
                    .total-amount { background: #2563eb; color: white; padding: 15px 20px; border-radius: 8px; font-size: 20px; font-weight: 700; text-align: center; margin: 20px 0; }
                    .next-steps { background: #f8fafc; border-radius: 12px; padding: 25px; margin: 30px 0; border: 1px solid #cbd5e1; }
                    .next-steps-title { color: #1f2937; font-size: 18px; font-weight: 700; margin-bottom: 15px; }
                    .footer { background: #1f2937; padding: 30px; text-align: center; color: #9ca3af; }
                    .footer-title { color: white; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
                    .contact-info { margin: 10px 0; }
                    .contact-link { color: #60a5fa; text-decoration: none; }
                    .contact-link:hover { color: #3b82f6; }
                    @media (max-width: 600px) {
                        .email-container { width: 100% !important; }
                        .header, .content { padding: 20px !important; }
                        .order-summary { padding: 20px !important; }
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <div class="logo-container">
                            <img src="${this.logoUrl}" alt="${this.companyName} Logo" class="logo" style="display: block; max-height: 80px; max-width: 200px; margin: 0 auto;">
                            <div style="background: rgba(255,255,255,0.2); color: white; padding: 15px 25px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px; text-align: center; margin-top: 10px;">
                                GOKUL WHOLESALE INC.
                            </div>
                        </div>
                        <h1 class="header-title">Order Confirmation</h1>
                    </div>
                    <div class="content">
                        <div class="greeting">Dear ${data.customerName || 'Valued Customer'},</div>
                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Thank you for placing a new order with ${this.companyName}. We are pleased to confirm your order and are currently processing it with the utmost care.</p>
                        
                        <div class="order-summary">
                            <div class="order-title">Order Details:</div>
                            <div class="order-item">
                                <div class="order-label">Order Number:</div>
                                <div class="order-value">#${data.orderNumber}</div>
                            </div>
                            <div class="order-item">
                                <div class="order-label">Order Date:</div>
                                <div class="order-value">${orderDate}</div>
                            </div>
                            <div class="order-item">
                                <div class="order-label">Estimated Delivery Date:</div>
                                <div class="order-value">${deliveryDate}</div>
                            </div>
                            ${data.deliveryAddress ? `<div class="order-item">
                                <div class="order-label">Delivery Address:</div>
                                <div class="order-value">${data.deliveryAddress}</div>
                            </div>` : ''}
                        </div>
                        
                        <div class="total-amount">Total Amount: $${data.orderTotal?.toFixed(2)}</div>
                        
                        <div class="next-steps">
                            <div class="next-steps-title">Next Steps:</div>
                            <p>We are now processing your order and will keep you updated on its progress. You will receive another email when your order is ready for pickup or delivery.</p>
                        </div>
                        
                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">For any inquiries or further assistance, feel free to contact us at <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a> or call us at ${this.companyPhone}.</p>
                        
                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">We appreciate your business and look forward to serving you again in the future.</p>
                        
                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Best regards,<br>${this.companyName}</p>
                    </div>
                    <div class="footer">
                        <div class="footer-title">${this.companyName}</div>
                        <div class="contact-info">${this.companyAddress}</div>
                        <div class="contact-info">📞 ${this.companyPhone} | ✉️ <a href="mailto:${this.supportEmail}" class="contact-link">${this.supportEmail}</a></div>
                    </div>
                </div>
            </body>
            </html>
          `,
          textContent: `Order Confirmation #${data.orderNumber}\n\nDear ${data.customerName || 'Valued Customer'},\n\nThank you for your order! We're excited to serve you and ensure a seamless experience.\n\nOrder Details:\n- Order Number: #${data.orderNumber}\n- Order Date: ${new Date().toLocaleDateString('en-US')}\n- Total Amount: $${data.orderTotal}\n- Items: ${data.orderItems?.length || 0} items\n${data.deliveryAddress ? `- Delivery Address: ${data.deliveryAddress}\n` : ''}\nWe'll notify you when your order is ready for ${data.customData?.orderType === 'pickup' ? 'pickup' : 'delivery'}. If you have any questions, please don't hesitate to contact us.\n\nBest regards,\nThe ${this.companyName} Team\n\n${this.companyName}\n${this.companyAddress}\nPhone: ${this.companyPhone} | Email: ${this.supportEmail}`
        };
        
      case 'staff_new_order_alert':
        const staffOrderDate = data.customData?.orderDate ? new Date(data.customData.orderDate).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US');
        
        return {
          subject: `New Order ${data.orderNumber} Created by ${data.customerName}`,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>New Order Alert</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
                    .logo { max-height: 60px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; }
                    .content { padding: 30px; }
                    .order-summary { background-color: #fef2f2; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
                    .action-button { background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
                    .footer { background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="${this.logoUrl}" alt="${this.companyName} Logo" class="logo">
                        <h1>🚨 New Order Alert</h1>
                    </div>
                    <div class="content">
                        <h2>Order requires your attention</h2>
                        <p><strong>A new order has been placed and requires processing.</strong></p>
                        
                        <div class="order-summary">
                            <h3>Order Summary:</h3>
                            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p><strong>Customer:</strong> ${data.customerName}</p>
                            <p><strong>Order Date:</strong> ${staffOrderDate}</p>
                            <p><strong>Total Amount:</strong> $${data.orderTotal?.toFixed(2)}</p>
                            <p><strong>Items:</strong> ${data.orderItems?.length || 0} items</p>
                            ${data.deliveryAddress ? `<p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>` : ''}
                        </div>
                        
                        <p><strong>Next Steps:</strong></p>
                        <ul>
                            <li>Review the order details in the admin app</li>
                            <li>Process the order for fulfillment</li>
                            <li>Contact customer if needed for clarification</li>
                        </ul>
                        
                        <p><em>Please view the app for complete order details and to begin processing.</em></p>
                    </div>
                    <div class="footer">
                        <p>${this.companyName} Staff Alert System</p>
                        <p>Contact: ${this.companyPhone} | Email: ${this.supportEmail}</p>
                    </div>
                </div>
            </body>
            </html>
          `,
          textContent: `🚨 NEW ORDER ALERT\n\nOrder Number: ${data.orderNumber}\nCustomer: ${data.customerName}\nOrder Date: ${staffOrderDate}\nTotal Amount: $${data.orderTotal?.toFixed(2)}\nItems: ${data.orderItems?.length || 0} items\n${data.deliveryAddress ? `Delivery Address: ${data.deliveryAddress}\n` : ''}\nACTION REQUIRED: Please view the app for full order details and begin processing.\n\n${this.companyName} Staff Alert\nContact: ${this.companyPhone}\nEmail: ${this.supportEmail}`
        };

      case 'order_status_update':
        return {
          subject: `Order #${data.orderNumber} Status Update`,
          htmlContent: `
            <h2>Order Status Update</h2>
            <p>Dear ${data.customerName},</p>
            <p>Your order #${data.orderNumber} status has been updated to: ${data.orderStatus}</p>
            <p>Best regards,<br>${this.companyName}</p>
          `,
          textContent: `Order Status Update\n\nDear ${data.customerName},\n\nYour order #${data.orderNumber} status has been updated to: ${data.orderStatus}\n\nBest regards,\n${this.companyName}`
        };

      case 'account_approved':
        return {
          subject: `🎉 Your Account Has Been Created - Welcome to ${this.companyName}!`,
          htmlContent: `
            <h2>🎉 Your Account Has Been Created!</h2>
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            <p>Congratulations! Your wholesale account application has been approved and your account has been created.</p>
            
            <h3>Your Account Details:</h3>
            <ul>
              <li><strong>Username:</strong> ${data.username || 'N/A'}</li>
              <li><strong>Password:</strong> ${data.password || 'Use the password you created during account request'}</li>
              <li><strong>Customer Level:</strong> Level ${data.customerLevel || 'N/A'}</li>
              <li><strong>Business Name:</strong> ${data.businessName || 'N/A'}</li>
              <li><strong>Credit Limit:</strong> $${data.creditLimit?.toFixed(2) || '0.00'}</li>
            </ul>
            
            <p>You can now log in to our website using your credentials above.</p>
            
            <p>Thank you for choosing ${this.companyName}!</p>
            <p>Best regards,<br>${this.companyName}</p>
          `,
          textContent: `🎉 YOUR ACCOUNT HAS BEEN CREATED - Welcome to ${this.companyName}!\n\nDear ${data.customerName || 'Valued Customer'},\n\nCongratulations! Your wholesale account application has been approved and your account has been created.\n\nYour Account Details:\n- Username: ${data.username || 'N/A'}\n- Password: ${data.password || 'Use the password you created during account request'}\n- Customer Level: Level ${data.customerLevel || 'N/A'}\n- Business Name: ${data.businessName || 'N/A'}\n- Credit Limit: $${data.creditLimit?.toFixed(2) || '0.00'}\n\nYou can now log in to our website using your credentials above.\n\nThank you for choosing ${this.companyName}!\n\nBest regards,\n${this.companyName}`
        };

      case 'order_note':
        const noteBy = data.customData?.fromUser || 'Staff Member';
        const noteContent = data.customData?.note || 'Note content not available';
        const isFromCustomer = data.customData?.addedBy && !data.customData?.addedBy.includes('admin') && !data.customData?.addedBy.includes('employee');
        const senderType = isFromCustomer ? 'Customer' : 'Staff member';
        
        // Enhanced subject line with clear context
        const contextualSubject = isFromCustomer 
          ? `📝 Customer ${noteBy} left you a new note on Order #${data.orderNumber}`
          : `💬 Staff note added to Order #${data.orderNumber} by ${noteBy}`;
        
        return {
          subject: contextualSubject,
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937; border-bottom: 3px solid #059669; padding-bottom: 10px;">📝 New Note on Order #${data.orderNumber}</h2>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Dear ${data.customerName || 'Team'},</p>
              
              <!-- Context Section -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">📨 Why are you receiving this notification?</h3>
                <p style="color: #92400e; margin: 0; font-size: 15px;">${senderType} <strong>${noteBy}</strong> has left a new note on your Order #${data.orderNumber}${isFromCustomer ? ' and may need your attention' : ' for your information'}.</p>
              </div>
              
              <!-- Note Content -->
              <div style="background: #f0fdf4; border-left: 4px solid #059669; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #059669; margin-top: 0; font-size: 16px;">📝 Note Content:</h3>
                <blockquote style="background: white; border-radius: 8px; padding: 20px; margin: 15px 0; border: 1px solid #d1fae5; font-style: italic; font-size: 16px; line-height: 1.6; color: #374151;">
                  "${noteContent}"
                </blockquote>
                <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0;"><strong>From:</strong> ${senderType} ${noteBy}</p>
              </div>
              
              <!-- Action Required -->
              <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #ea580c; margin-top: 0; font-size: 16px;">🎯 What should you do next?</h3>
                <p style="color: #9a3412; margin: 0; font-size: 15px;">${isFromCustomer ? 'Please review this customer message and respond if needed. You can reply through your dashboard or contact the customer directly.' : 'This is an informational update about your order. No action is required unless you have questions.'}</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">You can view the full order details and respond through your dashboard.</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Best regards,<br><strong>${this.companyName}</strong></p>
            </div>
          `,
          textContent: `📝 New Note on Order #${data.orderNumber}\n\nDear ${data.customerName || 'Team'},\n\n📨 Why are you receiving this notification?\n${senderType} ${noteBy} has left a new note on your Order #${data.orderNumber}${isFromCustomer ? ' and may need your attention' : ' for your information'}.\n\n📝 Note Content:\n"${noteContent}"\nFrom: ${senderType} ${noteBy}\n\n🎯 What should you do next?\n${isFromCustomer ? 'Please review this customer message and respond if needed. You can reply through your dashboard or contact the customer directly.' : 'This is an informational update about your order. No action is required unless you have questions.'}\n\nYou can view the full order details and respond through your dashboard.\n\nBest regards,\n${this.companyName}`
        };
      
      default:
        return {
          subject: `Message from ${this.companyName}`,
          htmlContent: `
            <h2>Message from ${this.companyName}</h2>
            <p>Dear ${data.customerName},</p>
            <p>We have an important message for you regarding your account or recent activity.</p>
            <p>Please check your dashboard for more details.</p>
            <p>Best regards,<br>${this.companyName}</p>
          `,
          textContent: `Message from ${this.companyName}\n\nDear ${data.customerName},\n\nWe have an important message for you regarding your account or recent activity.\n\nPlease check your dashboard for more details.\n\nBest regards,\n${this.companyName}`
        };
    }
  }

  private getDefaultSubject(templateType: string): string {
    switch (templateType) {
      case 'order_confirmation': return 'Order Confirmation';
      case 'order_status_update': return 'Order Status Update';
      case 'promotional': return 'Special Offer';
      case 'receipt': return 'Your Receipt - Gokul Wholesale Inc.';
      default: return `Message from ${this.companyName}`;
    }
  }

  private getDefaultHtmlContent(templateType: string, data: EmailData): string {
    return `<p>Dear ${data.customerName || 'Valued Customer'},</p><p>Message from ${this.companyName}.</p>`;
  }

  private getDefaultTextContent(templateType: string, data: EmailData): string {
    return `Dear ${data.customerName || 'Valued Customer'},\n\nMessage from ${this.companyName}.`;
  }

  // Send email with PDF attachment
  async sendEmailWithAttachment(data: EmailData, templateType: string, attachment: Buffer, filename: string): Promise<boolean> {
    try {
      console.log(`📧 [EmailService] Starting sendEmailWithAttachment for ${templateType} to ${data.to}`);
      
      // Better API key validation
      if (!process.env.SENDGRID_API_KEY) {
        console.error('❌ SendGrid API key not configured - missing SENDGRID_API_KEY environment variable');
        return false;
      }

      if (!process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        console.error('❌ SendGrid API key format appears invalid - should start with "SG."');
        return false;
      }

      console.log(`📧 [EmailService] Generating email content for template: ${templateType}`);
      
      // Generate AI-powered email content
      const template = await this.generateEmailContent(templateType, data, 'professional');
      console.log(`📧 [EmailService] Email template generated successfully`);
      console.log(`📧 [EmailService] Subject: ${template.subject}`);
      console.log(`📧 [EmailService] Sending to: ${data.to}`);
      console.log(`📧 [EmailService] Attachment: ${filename} (${attachment.length} bytes)`);

      // Simplified message structure for better SendGrid compatibility
      const msg = {
        to: data.to,
        from: {
          email: this.fromEmail,
          name: this.companyName
        },
        subject: template.subject,
        text: template.textContent,
        html: template.htmlContent,
        attachments: [
          {
            content: attachment.toString('base64'),
            filename: filename,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      console.log(`📧 [EmailService] Sending email via SendGrid...`);
      console.log(`📧 [EmailService] Message structure:`, JSON.stringify(msg, null, 2));
      
      const result = await sgMail.send(msg);
      console.log(`✅ [EmailService] Email with attachment sent successfully to ${data.to} for ${templateType}`);
      console.log(`✅ [EmailService] Message ID: ${result[0]?.headers?.['x-message-id'] || 'N/A'}`);
      return true;
    } catch (error: any) {
      console.error('❌ [EmailService] Email with attachment sending failed:', error);
      console.error('❌ [EmailService] Error message:', error.message);
      if (error.response?.body?.errors) {
        console.error('❌ [EmailService] SendGrid error details:', error.response.body.errors);
      }
      if (error.response?.status) {
        console.error('❌ [EmailService] HTTP Status:', error.response.status);
      }
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();