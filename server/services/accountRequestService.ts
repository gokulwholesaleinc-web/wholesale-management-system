import { MailService } from '@sendgrid/mail';
import { AccountRequest, User } from '../..../../../shared/schema';
import { db } from '../db';
import { users } from '../..../../../shared/schema';
import { or, eq } from 'drizzle-orm';
import { smsService } from './smsService';

// Soft-fail approach for email service in development
let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid email service initialized');
} else {
  if (process.env.NODE_ENV === 'production') {
    throw new Error("SENDGRID_API_KEY environment variable must be set in production");
  } else {
    console.warn('⚠️ SendGrid API key not configured - email notifications will be disabled');
  }
}

export async function sendAccountRequestNotification(request: AccountRequest): Promise<void> {
  // Skip email sending if service not configured (dev/staging)
  if (!mailService) {
    console.warn('📧 Email service not configured - skipping account request notification');
    return;
  }
  // Get all admin and employee users to notify
  const staffUsers = await db.select({
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    phone: users.phone
  })
  .from(users)
  .where(
    or(
      eq(users.isAdmin, true),
      eq(users.isEmployee, true)
    )
  );

  // Filter out users without valid email addresses
  const emailRecipients = staffUsers
    .filter(user => user.email && user.email.includes('@'))
    .map(user => user.email);

  // Fallback to default admin email if no staff emails found
  if (emailRecipients.length === 0) {
    emailRecipients.push('info@shopgokul.com');
  }
  


  const subject = `New Account Request - ${request.businessName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937; margin-bottom: 20px;">New Account Request</h2>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #374151; margin-top: 0;">Business Information</h3>
        <p><strong>Business Name:</strong> ${request.businessName}</p>
        <p><strong>Contact:</strong> ${request.contactFirstName} ${request.contactLastName}</p>
        <p><strong>Email:</strong> ${request.email}</p>
        <p><strong>Phone:</strong> ${request.phone}</p>
        <p><strong>FEIN:</strong> ${request.feinNumber}</p>
        ${request.businessType ? `<p><strong>Business Type:</strong> ${request.businessType}</p>` : ''}

      </div>

      ${request.businessAddress ? `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">Address</h3>
          <p>${request.businessAddress}</p>
          ${request.city || request.state || request.postalCode ? `<p>${[request.city, request.state, request.postalCode].filter(Boolean).join(', ')}</p>` : ''}
        </div>
      ` : ''}

      ${request.businessDescription ? `
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">Business Description</h3>
          <p>${request.businessDescription}</p>
        </div>
      ` : ''}

      <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #1e40af; margin-top: 0;">Next Steps</h3>
        <p>Please review this account request in your admin dashboard and approve or reject it.</p>
        <p><strong>Request ID:</strong> ${request.id}</p>
        <p><strong>Submitted:</strong> ${request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Unknown'}</p>
      </div>
    </div>
  `;

  const textContent = `
New Account Request

Business Information:
- Business Name: ${request.businessName}
- Contact: ${request.contactFirstName} ${request.contactLastName}
- Email: ${request.email}
- Phone: ${request.phone}
- FEIN: ${request.feinNumber}
${request.businessType ? `- Business Type: ${request.businessType}` : ''}


${request.businessAddress ? `
Address:
${request.businessAddress}
${request.city || request.state || request.postalCode ? `${[request.city, request.state, request.postalCode].filter(Boolean).join(', ')}` : ''}
` : ''}

${request.businessDescription ? `
Business Description:
${request.businessDescription}
` : ''}

Next Steps:
Please review this account request in your admin dashboard and approve or reject it.
Request ID: ${request.id}
Submitted: ${request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Unknown'}
  `;

  // Send email to all staff and admin users
  const emailPromises = emailRecipients
    .filter(email => email && email.length > 0) // Filter out null/empty emails
    .map(email => 
      mailService.send({
        to: email!,
        from: 'info@shopgokul.com', // Verified sender in SendGrid
        subject: subject,
        text: textContent,
        html: htmlContent,
      })
    );

  // Send all emails concurrently and capture results
  const emailResults = await Promise.allSettled(emailPromises);
  
  // Log detailed results
  emailResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✅ Email sent successfully to ${emailRecipients[index]}`);
    } else {
      console.error(`❌ Email failed to ${emailRecipients[index]}:`, result.reason);
    }
  });
  
  console.log(`📧 Account request notification sent to ${emailRecipients.length} staff members:`, emailRecipients);
  
  // ✅ SMS NOTIFICATIONS FOR STAFF - New Account Request Alert
  try {
    console.log('📱 [ACCOUNT REQUEST] Attempting to send SMS notifications to staff...');
    
    // Use the imported smsService directly
    const staffWithPhones = staffUsers.filter(user => user.phone && user.phone.trim() !== '');
    
    console.log(`📱 [ACCOUNT REQUEST] Found ${staffWithPhones.length} staff members with phone numbers`);
    
    if (staffWithPhones.length > 0) {
      for (const staffMember of staffWithPhones) {
        try {
          console.log(`📱 [ACCOUNT REQUEST] Sending SMS to staff member: ${staffMember.phone}`);
          
          const smsData = {
            to: staffMember.phone!,
            customerName: `${request.contactFirstName} ${request.contactLastName}`,
            customData: {
              businessName: request.businessName,
              phone: request.phone,
              email: request.email,
              requestId: request.id
            }
          };
          
          console.log(`📱 [ACCOUNT REQUEST] SMS Data:`, {
            to: smsData.to,
            customerName: smsData.customerName,
            businessName: smsData.customData.businessName,
            phone: smsData.customData.phone
          });
          
          const smsMessage = `🔔 New wholesale account request from ${request.businessName}. Contact: ${request.contactFirstName} ${request.contactLastName}. Review in admin panel.`;
          const smsResult = await smsService.send({
            to: staffMember.phone!,
            body: smsMessage
          });
          
          if (smsResult?.success) {
            console.log(`✅ [ACCOUNT REQUEST] SMS sent successfully to staff: ${staffMember.phone}`);
          } else {
            console.log(`❌ [ACCOUNT REQUEST] SMS failed to staff: ${staffMember.phone} - ${smsResult?.error || 'Unknown error'}`);
          }
        } catch (smsError) {
          console.error(`❌ [ACCOUNT REQUEST] SMS error for staff ${staffMember.phone}:`, smsError);
        }
      }
    } else {
      console.log('📱 [ACCOUNT REQUEST] No staff members have phone numbers configured for SMS notifications');
    }
  } catch (smsError) {
    console.error('❌ [ACCOUNT REQUEST] Failed to send SMS notifications to staff:', smsError);
    // Don't fail the request if SMS fails
  }
}

export async function sendAccountApprovalEmail(user: User, temporaryPassword: string): Promise<void> {
  const subject = `Your Gokul Wholesale Account Has Been Approved`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a; margin-bottom: 20px;">Account Approved - Welcome to Gokul Wholesale!</h2>
      
      <p>Dear ${user.firstName} ${user.lastName},</p>
      
      <p>Congratulations! Your wholesale account request has been approved. You can now access our full product catalog with wholesale pricing.</p>

      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #0369a1; margin-top: 0;">Account Details</h3>
        <p><strong>Business:</strong> ${user.businessName}</p>
        <p><strong>Customer Level:</strong> ${user.customerLevel}</p>
        <p><strong>Credit Limit:</strong> $${user.creditLimit?.toFixed(2) || '0.00'}</p>
        <p><strong>Email:</strong> ${user.email}</p>
      </div>

      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #d97706; margin-top: 0;">Login Information</h3>
        <p><strong>Username:</strong> ${user.email}</p>
        <p><strong>Temporary Password:</strong> <code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-family: monospace;">${temporaryPassword}</code></p>
        <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password after your first login for security.</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.REPL_URL || 'https://your-domain.com'}/login" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Login to Your Account
        </a>
      </div>

      <p>If you have any questions, please contact us at <a href="mailto:sales@gokulwholesaleinc.com" style="color: #2563eb;">sales@gokulwholesaleinc.com</a> or call 630-540-9910.</p>
      
      <p>Thank you for choosing Gokul Wholesale!</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <div style="font-size: 12px; color: #6b7280; text-align: center;">
        <p><strong>Gokul Wholesale</strong><br>
        1141 W Bryn Mawr Ave<br>
        Itasca, IL 60143<br>
        Phone: 630-540-9910</p>
        
        <p style="margin-top: 15px;">
          This email was sent because you requested a wholesale account with us.<br>
          If you received this email in error, please contact us at info@shopgokul.com.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Account Approved - Welcome to Gokul Wholesale!

Dear ${user.firstName} ${user.lastName},

Congratulations! Your wholesale account request has been approved. You can now access our full product catalog with wholesale pricing.

Account Details:
- Business: ${user.businessName}
- Customer Level: ${user.customerLevel}
- Credit Limit: $${user.creditLimit?.toFixed(2) || '0.00'}
- Email: ${user.email}

Login Information:
- Username: ${user.email}
- Temporary Password: ${temporaryPassword}

⚠️ Please change your password after your first login.

Login at: ${process.env.REPL_URL || 'https://your-domain.com'}/login

If you have any questions, please contact us at sales@gokulwholesaleinc.com or call 630-540-9910.

Thank you for choosing Gokul Wholesale!

---
Gokul Wholesale
1141 W Bryn Mawr Ave
Itasca, IL 60143
Phone: 630-540-9910
  `;

  // Send email to customer with anti-spam headers
  if (user.email && user.email.includes('@')) {
    await mailService.send({
      to: user.email,
      from: {
        email: 'info@shopgokul.com',
        name: 'Gokul Wholesale'
      },
      subject: subject,
      text: textContent,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'List-Unsubscribe': '<mailto:unsubscribe@shopgokul.com>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      },
      categories: ['account-approval', 'transactional'],
      customArgs: {
        'email_type': 'account_approval',
        'user_id': user.id
      }
    });
  }
}

export async function sendAccountRejectionEmail(request: AccountRequest, adminNotes?: string): Promise<void> {
  const subject = `Account Request Update - Gokul Wholesale`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626; margin-bottom: 20px;">Account Request Update</h2>
      
      <p>Dear ${request.contactFirstName} ${request.contactLastName},</p>
      
      <p>Thank you for your interest in Gokul Wholesale. After reviewing your account request, we are unable to approve your application at this time.</p>

      ${adminNotes ? `
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="color: #dc2626; margin-top: 0;">Additional Information</h3>
          <p>${adminNotes}</p>
        </div>
      ` : ''}

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Next Steps</h3>
        <p>If you have any questions about this decision or would like to discuss your application further, please contact us:</p>
        <ul>
          <li>Email: sales@gokulwholesaleinc.com</li>
          <li>Phone: 630-540-9910</li>
        </ul>
        <p>You may submit a new application in the future when your business circumstances change.</p>
      </div>

      <p>We appreciate your interest in partnering with us and wish you success in your business endeavors.</p>
      
      <p>Best regards,<br>Gokul Wholesale Team</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280;">
        Gokul Wholesale<br>
        1141 W Bryn Mawr Ave<br>
        Itasca, IL 60143<br>
        Phone: 630-540-9910
      </p>
    </div>
  `;

  const textContent = `
Account Request Update

Dear ${request.contactFirstName} ${request.contactLastName},

Thank you for your interest in Gokul Wholesale. After reviewing your account request, we are unable to approve your application at this time.

${adminNotes ? `
Additional Information:
${adminNotes}
` : ''}

Next Steps:
If you have any questions about this decision or would like to discuss your application further, please contact us:

- Email: sales@gokulwholesaleinc.com
- Phone: 630-540-9910

You may submit a new application in the future when your business circumstances change.

We appreciate your interest in partnering with us and wish you success in your business endeavors.

Best regards,
Gokul Wholesale Team

---
Gokul Wholesale
1141 W Bryn Mawr Ave
Itasca, IL 60143
Phone: 630-540-9910
  `;

  // Send email to customer
  if (request.email && request.email.includes('@')) {
    await mailService.send({
      to: request.email,
      from: 'info@shopgokul.com',
      subject: subject,
      text: textContent,
      html: htmlContent,
    });
  }
}