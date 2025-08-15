/**
 * EMAIL TEMPLATE REGISTRY - PERMANENT SOLUTION FOR JSON PARSING ISSUES
 * 
 * This registry system prevents JSON parsing failures by providing
 * pre-built multilingual templates that don't require AI generation.
 * 
 * ROOT CAUSE OF JSON PARSING ISSUES:
 * 1. AI generates complex HTML with nested quotes, special characters
 * 2. Multilingual content includes Unicode characters that break JSON
 * 3. Template literals with ${} expressions cause JSON parsing errors
 * 4. Complex HTML structures with inline styles exceed JSON limits
 * 
 * PERMANENT SOLUTION:
 * 1. Pre-built templates for all languages (no AI generation needed)
 * 2. Simple string substitution instead of complex JSON parsing
 * 3. Reliable multilingual support without parsing failures
 * 4. Consistent branding and formatting across all emails
 */

interface EmailTemplateData {
  orderNumber: string;
  customerName: string;
  orderTotal: number;
  orderItems?: any[];
  deliveryAddress?: string;
  orderDate?: string;
  companyName: string;
  companyPhone: string;
  supportEmail: string;
  logoUrl: string;
  companyAddress: string;
  // OTP specific fields
  otpCode?: string;
  expiresInMinutes?: number;
  systemName?: string;
  securityMessage?: string;
}

export class EmailTemplateRegistry {
  private static instance: EmailTemplateRegistry;
  
  static getInstance(): EmailTemplateRegistry {
    if (!EmailTemplateRegistry.instance) {
      EmailTemplateRegistry.instance = new EmailTemplateRegistry();
    }
    return EmailTemplateRegistry.instance;
  }

  /**
   * CUSTOMER ORDER CONFIRMATION TEMPLATES
   * Pre-built templates for all supported languages
   */
  getCustomerOrderConfirmation(language: string, data: EmailTemplateData): { subject: string; htmlContent: string; textContent: string } {
    const orderDate = data.orderDate || new Date().toLocaleDateString('en-US');
    
    switch (language) {
      case 'hi': // Hindi
        return {
          subject: `ऑर्डर कन्फर्मेशन #${data.orderNumber} - ${data.companyName}`,
          htmlContent: this.getHindiCustomerTemplate(data, orderDate),
          textContent: `ऑर्डर कन्फर्मेशन #${data.orderNumber}\n\nप्रिय ${data.customerName},\n\nआपके ऑर्डर के लिए धन्यवाद! हमें आपकी सेवा करने में खुशी हो रही है।\n\nऑर्डर विवरण:\n- ऑर्डर नंबर: #${data.orderNumber}\n- ऑर्डर तारीख: ${orderDate}\n- कुल राशि: $${data.orderTotal.toFixed(2)}\n- डिलीवरी पता: ${data.deliveryAddress || 'स्टोर से पिकअप'}\n\nसवाल के लिए संपर्क करें: ${data.supportEmail}\n\nधन्यवाद,\n${data.companyName}`
        };
        
      case 'gu': // Gujarati
        return {
          subject: `ઓર્ડર પુષ્ટિ #${data.orderNumber} - ${data.companyName}`,
          htmlContent: this.getGujaratiCustomerTemplate(data, orderDate),
          textContent: `ઓર્ડર પુષ્ટિ #${data.orderNumber}\n\nપ્રિય ${data.customerName},\n\nતમારા ઓર્ડર માટે આભાર! અમે તમારી સેવા કરવા માટે ઉત્સાહિત છીએ।\n\nઓર્ડર વિગતો:\n- ઓર્ડર નંબર: #${data.orderNumber}\n- ઓર્ડર તારીખ: ${orderDate}\n- કુલ રકમ: $${data.orderTotal.toFixed(2)}\n- ડિલિવરી સરનામું: ${data.deliveryAddress || 'સ્ટોર પિકઅપ'}\n\nપ્રશ્નો માટે સંપર્ક કરો: ${data.supportEmail}\n\nઆભાર,\n${data.companyName}`
        };
        
      default: // English
        return {
          subject: `Order Confirmation #${data.orderNumber} - ${data.companyName}`,
          htmlContent: this.getEnglishCustomerTemplate(data, orderDate),
          textContent: `Order Confirmation #${data.orderNumber}\n\nDear ${data.customerName},\n\nThank you for your order! We're excited to serve you.\n\nOrder Details:\n- Order Number: #${data.orderNumber}\n- Order Date: ${orderDate}\n- Total Amount: $${data.orderTotal.toFixed(2)}\n- Delivery Address: ${data.deliveryAddress || 'Store Pickup'}\n\nQuestions? Contact: ${data.supportEmail}\n\nBest regards,\n${data.companyName}`
        };
    }
  }

  /**
   * OTP VERIFICATION TEMPLATES
   * Pre-built templates for OTP codes
   */
  getOtpVerification(language: string, data: EmailTemplateData): { subject: string; htmlContent: string; textContent: string } {
    const systemName = data.systemName || 'System Access';
    const expiresIn = data.expiresInMinutes || 5;
    const securityMessage = data.securityMessage || 'If you did not request this code, please contact support immediately.';
    
    return {
      subject: `🔐 ${systemName} - One-Time Password`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>OTP Verification</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background-color: white; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
                .content { padding: 30px; color: #1f2937; }
                .otp-box { background: #f8f9fa; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { color: #667eea; font-size: 36px; margin: 0; letter-spacing: 5px; font-family: monospace; font-weight: bold; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; color: #856404; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🔐 ${systemName}</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Security Verification Required</p>
                </div>
                <div class="content">
                    <h2 style="color: #333;">Hello ${data.customerName},</h2>
                    <p style="color: #666; font-size: 16px;">You've requested access to ${systemName.toLowerCase()}. Here's your one-time password:</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">${data.otpCode}</div>
                    </div>
                    
                    <p style="color: #666;"><strong>⏰ This code expires in ${expiresIn} minutes.</strong></p>
                    <p style="color: #666;">🔒 ${securityMessage}</p>
                    
                    <div class="warning">
                        <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> If you didn't request this code, please contact your administrator immediately.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message from your security system.</p>
                    <p>${data.companyName} - ${data.companyPhone}</p>
                </div>
            </div>
        </body>
        </html>
      `,
      textContent: `${systemName} - One-Time Password\n\nHello ${data.customerName},\n\nYour OTP code: ${data.otpCode}\n\nThis code expires in ${expiresIn} minutes.\n\n${securityMessage}\n\nSecurity Notice: If you didn't request this code, contact support immediately.\n\n${data.companyName}\n${data.companyPhone}`
    };
  }

  /**
   * STAFF ORDER ALERT TEMPLATES
   * Pre-built templates for all supported languages
   */
  getStaffOrderAlert(language: string, data: EmailTemplateData): { subject: string; htmlContent: string; textContent: string } {
    const orderDate = data.orderDate || new Date().toLocaleDateString('en-US');
    
    switch (language) {
      case 'gu': // Gujarati (for admin)
        return {
          subject: `🚨 નવો ઓર્ડર ${data.orderNumber} - ${data.customerName}`,
          htmlContent: this.getGujaratiStaffTemplate(data, orderDate),
          textContent: `🚨 નવો ઓર્ડર અલર્ટ\n\nઓર્ડર નંબર: ${data.orderNumber}\nગ્રાહક: ${data.customerName}\nકુલ રકમ: $${data.orderTotal.toFixed(2)}\nઆઇટમ્સ: ${data.orderItems?.length || 0}\nડિલિવરી: ${data.deliveryAddress || 'સ્ટોર પિકઅપ'}\n\nકૃપા કરીને એપ્લિકેશન જુઓ।\n\n--- ENGLISH TRANSLATION ---\n\nNEW ORDER ALERT\n\nOrder: ${data.orderNumber}\nCustomer: ${data.customerName}\nTotal: $${data.orderTotal.toFixed(2)}\nItems: ${data.orderItems?.length || 0}\nDelivery: ${data.deliveryAddress || 'Store Pickup'}\n\nPlease view the app for details.`
        };
        
      default: // English (for staff)
        return {
          subject: `🚨 New Order ${data.orderNumber} - ${data.customerName}`,
          htmlContent: this.getEnglishStaffTemplate(data, orderDate),
          textContent: `🚨 NEW ORDER ALERT\n\nOrder Number: ${data.orderNumber}\nCustomer: ${data.customerName}\nTotal Amount: $${data.orderTotal.toFixed(2)}\nItems: ${data.orderItems?.length || 0}\nDelivery: ${data.deliveryAddress || 'Store Pickup'}\n\nACTION REQUIRED: Please view the app for details.`
        };
    }
  }

  /**
   * HINDI CUSTOMER TEMPLATE
   */
  private getHindiCustomerTemplate(data: EmailTemplateData, orderDate: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>ऑर्डर कन्फर्मेशन</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white; }
            .logo { max-height: 80px; margin-bottom: 20px; }
            .company-name { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
            .content { padding: 30px; color: #1f2937; }
            .order-summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total { background: #2563eb; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${data.logoUrl}" alt="${data.companyName}" class="logo" onerror="this.style.display='none'">
                <div class="company-name">GOKUL WHOLESALE INC.</div>
                <h1>ऑर्डर कन्फर्मेशन</h1>
            </div>
            
            <div class="content">
                <p>प्रिय ${data.customerName},</p>
                <p>आपके ऑर्डर के लिए धन्यवाद! हमें आपकी सेवा करने में खुशी हो रही है।</p>
                
                <div class="order-summary">
                    <h3>ऑर्डर विवरण:</h3>
                    <p><strong>ऑर्डर नंबर:</strong> #${data.orderNumber}</p>
                    <p><strong>ऑर्डर तारीख:</strong> ${orderDate}</p>
                    <p><strong>आइटम्स:</strong> ${data.orderItems?.length || 0} आइटम्स</p>
                    <p><strong>डिलीवरी:</strong> ${data.deliveryAddress || 'स्टोर से पिकअप'}</p>
                </div>
                
                <div class="total">कुल राशि: $${data.orderTotal.toFixed(2)}</div>
                
                <p>किसी भी सवाल के लिए हमसे संपर्क करें: ${data.supportEmail}</p>
                
                <hr style="margin: 30px 0;">
                <h3>ENGLISH TRANSLATION:</h3>
                <p>Dear ${data.customerName},</p>
                <p>Thank you for your order! We're excited to serve you.</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Total Amount:</strong> $${data.orderTotal.toFixed(2)}</p>
                <p><strong>Delivery:</strong> ${data.deliveryAddress || 'Store Pickup'}</p>
            </div>
            
            <div class="footer">
                <p>${data.companyName}</p>
                <p>📞 ${data.companyPhone} | ✉️ ${data.supportEmail}</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * GUJARATI CUSTOMER TEMPLATE
   */
  private getGujaratiCustomerTemplate(data: EmailTemplateData, orderDate: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>ઓર્ડર પુષ્ટિ</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white; }
            .logo { max-height: 80px; margin-bottom: 20px; }
            .company-name { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
            .content { padding: 30px; color: #1f2937; }
            .order-summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total { background: #2563eb; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${data.logoUrl}" alt="${data.companyName}" class="logo" onerror="this.style.display='none'">
                <div class="company-name">GOKUL WHOLESALE INC.</div>
                <h1>ઓર્ડર પુષ્ટિ</h1>
            </div>
            
            <div class="content">
                <p>પ્રિય ${data.customerName},</p>
                <p>તમારા ઓર્ડર માટે આભાર! અમે તમારી સેવા કરવા માટે ઉત્સાહિત છીએ।</p>
                
                <div class="order-summary">
                    <h3>ઓર્ડર વિગતો:</h3>
                    <p><strong>ઓર્ડર નંબર:</strong> #${data.orderNumber}</p>
                    <p><strong>ઓર્ડર તારીખ:</strong> ${orderDate}</p>
                    <p><strong>આઇટમ્સ:</strong> ${data.orderItems?.length || 0} આઇટમ્સ</p>
                    <p><strong>ડિલિવરી:</strong> ${data.deliveryAddress || 'સ્ટોર પિકઅપ'}</p>
                </div>
                
                <div class="total">કુલ રકમ: $${data.orderTotal.toFixed(2)}</div>
                
                <p>પ્રશ્નો માટે સંપર્ક કરો: ${data.supportEmail}</p>
                
                <hr style="margin: 30px 0;">
                <h3>ENGLISH TRANSLATION:</h3>
                <p>Dear ${data.customerName},</p>
                <p>Thank you for your order! We're excited to serve you.</p>
                <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${orderDate}</p>
                <p><strong>Total Amount:</strong> $${data.orderTotal.toFixed(2)}</p>
                <p><strong>Delivery:</strong> ${data.deliveryAddress || 'Store Pickup'}</p>
            </div>
            
            <div class="footer">
                <p>${data.companyName}</p>
                <p>📞 ${data.companyPhone} | ✉️ ${data.supportEmail}</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * ENGLISH CUSTOMER TEMPLATE
   */
  private getEnglishCustomerTemplate(data: EmailTemplateData, orderDate: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white; }
            .logo { max-height: 80px; margin-bottom: 20px; }
            .company-name { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
            .content { padding: 30px; color: #1f2937; }
            .order-summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total { background: #2563eb; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${data.logoUrl}" alt="${data.companyName}" class="logo" onerror="this.style.display='none'">
                <div class="company-name">GOKUL WHOLESALE INC.</div>
                <h1>Order Confirmation</h1>
            </div>
            
            <div class="content">
                <p>Dear ${data.customerName},</p>
                <p>Thank you for your order! We're excited to serve you.</p>
                
                <div class="order-summary">
                    <h3>Order Details:</h3>
                    <p><strong>Order Number:</strong> #${data.orderNumber}</p>
                    <p><strong>Order Date:</strong> ${orderDate}</p>
                    <p><strong>Items:</strong> ${data.orderItems?.length || 0} items</p>
                    <p><strong>Delivery:</strong> ${data.deliveryAddress || 'Store Pickup'}</p>
                </div>
                
                <div class="total">Total Amount: $${data.orderTotal.toFixed(2)}</div>
                
                <p>Questions? Contact us at: ${data.supportEmail}</p>
            </div>
            
            <div class="footer">
                <p>${data.companyName}</p>
                <p>📞 ${data.companyPhone} | ✉️ ${data.supportEmail}</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * GUJARATI STAFF TEMPLATE (for admin)
   */
  private getGujaratiStaffTemplate(data: EmailTemplateData, orderDate: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>નવો ઓર્ડર અલર્ટ</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center; color: white; }
            .logo { max-height: 80px; margin-bottom: 20px; }
            .company-name { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
            .content { padding: 30px; color: #1f2937; }
            .order-summary { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .urgent { background: #dc2626; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${data.logoUrl}" alt="${data.companyName}" class="logo" onerror="this.style.display='none'">
                <div class="company-name">GOKUL WHOLESALE INC.</div>
                <h1>🚨 નવો ઓર્ડર અલર્ટ</h1>
            </div>
            
            <div class="content">
                <div class="urgent">જરૂરી પગલાં જરૂરી છે!</div>
                
                <div class="order-summary">
                    <h3>ઓર્ડર વિગતો:</h3>
                    <p><strong>ઓર્ડર નંબર:</strong> ${data.orderNumber}</p>
                    <p><strong>ગ્રાહક:</strong> ${data.customerName}</p>
                    <p><strong>ઓર્ડર તારીખ:</strong> ${orderDate}</p>
                    <p><strong>કુલ રકમ:</strong> $${data.orderTotal.toFixed(2)}</p>
                    <p><strong>આઇટમ્સ:</strong> ${data.orderItems?.length || 0} આઇટમ્સ</p>
                    <p><strong>ડિલિવરી:</strong> ${data.deliveryAddress || 'સ્ટોર પિકઅપ'}</p>
                </div>
                
                <h3>આગળના પગલાં:</h3>
                <ul>
                    <li>એડમિન એપ્લિકેશનમાં ઓર્ડર વિગતો જુઓ</li>
                    <li>ઓર્ડર પ્રક્રિયા કરો</li>
                    <li>જરૂર જણાય તો ગ્રાહક સાથે સંપર્ક કરો</li>
                </ul>
                
                <p><em>સંપૂર્ણ વિગતો માટે કૃપા કરીને એપ્લિકેશન જુઓ.</em></p>
                
                <hr style="margin: 30px 0;">
                <h3>ENGLISH TRANSLATION:</h3>
                <p><strong>🚨 NEW ORDER ALERT - ACTION REQUIRED</strong></p>
                <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p><strong>Customer:</strong> ${data.customerName}</p>
                <p><strong>Total Amount:</strong> $${data.orderTotal.toFixed(2)}</p>
                <p><strong>Items:</strong> ${data.orderItems?.length || 0} items</p>
                <p><strong>Delivery:</strong> ${data.deliveryAddress || 'Store Pickup'}</p>
                <p><strong>Next Steps:</strong> Review order details in admin app, process order, contact customer if needed.</p>
            </div>
            
            <div class="footer">
                <p>${data.companyName} Staff Alert System</p>
                <p>📞 ${data.companyPhone} | ✉️ ${data.supportEmail}</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * ENGLISH STAFF TEMPLATE
   */
  private getEnglishStaffTemplate(data: EmailTemplateData, orderDate: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Order Alert</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center; color: white; }
            .logo { max-height: 80px; margin-bottom: 20px; }
            .company-name { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; }
            .content { padding: 30px; color: #1f2937; }
            .order-summary { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .urgent { background: #dc2626; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${data.logoUrl}" alt="${data.companyName}" class="logo" onerror="this.style.display='none'">
                <div class="company-name">GOKUL WHOLESALE INC.</div>
                <h1>🚨 New Order Alert</h1>
            </div>
            
            <div class="content">
                <div class="urgent">ACTION REQUIRED!</div>
                
                <div class="order-summary">
                    <h3>Order Details:</h3>
                    <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                    <p><strong>Customer:</strong> ${data.customerName}</p>
                    <p><strong>Order Date:</strong> ${orderDate}</p>
                    <p><strong>Total Amount:</strong> $${data.orderTotal.toFixed(2)}</p>
                    <p><strong>Items:</strong> ${data.orderItems?.length || 0} items</p>
                    <p><strong>Delivery:</strong> ${data.deliveryAddress || 'Store Pickup'}</p>
                </div>
                
                <h3>Next Steps:</h3>
                <ul>
                    <li>Review order details in admin app</li>
                    <li>Process order for fulfillment</li>
                    <li>Contact customer if needed</li>
                </ul>
                
                <p><em>Please view the app for complete details.</em></p>
            </div>
            
            <div class="footer">
                <p>${data.companyName} Staff Alert System</p>
                <p>📞 ${data.companyPhone} | ✉️ ${data.supportEmail}</p>
            </div>
        </div>
    </body>
    </html>`;
  }
}

export const emailTemplateRegistry = EmailTemplateRegistry.getInstance();