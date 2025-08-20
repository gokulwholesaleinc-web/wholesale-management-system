import { storage } from "../storage";
import { emailService } from "./emailService";
import { hashPassword, comparePassword } from "../helpers/bcrypt-helper";
import { generateTempPassword } from "../utils/generateTempPassword";
import sgMail from '@sendgrid/mail';

export class PasswordResetService {
  /**
   * Generate a secure temporary password using CSPRNG
   */
  static async generateTemporaryPassword(): Promise<string> {
    return generateTempPassword(14);
  }

  /**
   * Initiate password reset process
   */
  static async initiatePasswordReset(emailOrUsername: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email or username
      let user = await storage.getUserByEmail(emailOrUsername);
      if (!user) {
        user = await storage.getUserByUsername(emailOrUsername);
      }

      // Always respond neutral to prevent user enumeration
      const NEUTRAL_RESPONSE = {
        success: true,
        message: "If an account exists for that email/username, a reset email has been sent."
      };

      if (!user) {
        // Still return neutral; log server-side
        console.log("Password reset attempted for non-existent user:", emailOrUsername);
        return NEUTRAL_RESPONSE;
      }

      if (!user.email) {
        console.log("Password reset attempted for user without email:", user.id);
        return NEUTRAL_RESPONSE;
      }

      // Generate temporary password
      const tempPassword = await this.generateTemporaryPassword();
      const hashedTempPassword = await hashPassword(tempPassword);
      
      // Set expiry to 24 hours from now
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);

      // Update user with temporary password
      await storage.updateUser({
        id: user.id,
        tempPassword: hashedTempPassword,
        tempPasswordExpiry: expiry,
        forcePasswordChange: true
      });

      // Send email with temporary password
      const emailSent = await this.sendPasswordResetEmail(
        user.email,
        user.firstName || user.username || "User",
        tempPassword
      );

      if (!emailSent) {
        console.error("Failed to send password reset email to:", user.email);
        // Still return neutral to prevent user enumeration
      }

      return NEUTRAL_RESPONSE;

    } catch (error) {
      console.error("Password reset error:", error);
      return {
        success: false,
        message: "An error occurred while processing your request. Please try again."
      };
    }
  }

  /**
   * Send password reset email using SendGrid
   */
  static async sendPasswordResetEmail(
    email: string,
    userName: string,
    tempPassword: string
  ): Promise<boolean> {
    const subject = "Password Reset - Gokul Wholesale";
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">Gokul Wholesale</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p style="color: #555; line-height: 1.6;">Hello ${userName},</p>
          
          <p style="color: #555; line-height: 1.6;">
            We received a request to reset your password for your Gokul Wholesale account. 
            Below is your temporary password:
          </p>
          
          <div style="background: #fff; padding: 20px; border: 2px solid #667eea; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #667eea; margin: 0;">Temporary Password</h3>
            <p style="font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; font-family: 'Courier New', monospace; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${tempPassword}
            </p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 6px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Important Security Information:</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li>This temporary password expires in 24 hours</li>
              <li>You will be required to create a new password when you log in</li>
              <li>If you did not request this reset, please contact us immediately</li>
            </ul>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            To use this temporary password:
          </p>
          
          <ol style="color: #555; line-height: 1.6;">
            <li>Visit the Gokul Wholesale login page</li>
            <li>Enter your username and the temporary password above</li>
            <li>Create and confirm your new permanent password</li>
          </ol>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #888; font-size: 14px; margin: 0;">
              If you have any questions or need assistance, please contact our support team.
            </p>
            <p style="color: #888; font-size: 14px; margin: 5px 0 0 0;">
              Thank you,<br>
              The Gokul Wholesale Team
            </p>
          </div>
        </div>
      </div>
    `;

    const textContent = `
Password Reset - Gokul Wholesale

Hello ${userName},

We received a request to reset your password for your Gokul Wholesale account.

Your temporary password is: ${tempPassword}

Important:
- This temporary password expires in 24 hours
- You will be required to create a new password when you log in
- If you did not request this reset, please contact us immediately

To use this temporary password:
1. Visit the Gokul Wholesale login page
2. Enter your username and the temporary password above
3. Create and confirm your new permanent password

If you have any questions, please contact our support team.

Thank you,
The Gokul Wholesale Team
    `;

    // Send email directly via SendGrid to avoid AI template override
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    
    try {
      const msg = {
        to: email,
        from: {
          email: 'info@shopgokul.com',
          name: 'Gokul Wholesale Inc.'
        },
        subject,
        text: textContent,
        html: htmlContent
      };

      await sgMail.send(msg);
      console.log(`✅ Password reset email sent successfully to ${email}`);
      return true;
    } catch (error: any) {
      console.error('❌ Password reset email sending failed:', error);
      return false;
    }
  }

  /**
   * Verify if a temporary password is valid and not expired
   */
  static async verifyTemporaryPassword(userId: string, tempPassword: string): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.tempPassword || !user.tempPasswordExpiry) {
        return false;
      }

      // Check if temporary password has expired
      if (new Date() > new Date(user.tempPasswordExpiry)) {
        // Clean up expired temporary password
        await storage.updateUser({
          id: userId,
          tempPassword: undefined,
          tempPasswordExpiry: undefined,
          forcePasswordChange: false
        });
        return false;
      }

      // Verify temporary password using bcrypt
      return await comparePassword(tempPassword, user.tempPassword);

    } catch (error) {
      console.error("Temporary password verification error:", error);
      return false;
    }
  }

  /**
   * Complete password reset with username and temp password verification
   */
  static async completePasswordResetByUsernameAndTemp(
    usernameOrEmail: string,
    tempPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      let user = await storage.getUserByEmail(usernameOrEmail);
      if (!user) {
        user = await storage.getUserByUsername(usernameOrEmail);
      }

      if (!user) {
        return { 
          success: false, 
          message: "Invalid temporary password or expired." 
        };
      }

      // Validate temp password
      const isValidTempPassword = await this.verifyTemporaryPassword(user.id, tempPassword);
      if (!isValidTempPassword) {
        return {
          success: false,
          message: "Invalid temporary password or expired."
        };
      }

      // Set new password
      const result = await this.completePasswordReset(user.id, newPassword);
      return result;

    } catch (error) {
      console.error("Password reset completion by username error:", error);
      return {
        success: false,
        message: "Failed to update password. Please try again."
      };
    }
  }

  /**
   * Complete password reset by setting new permanent password
   */
  static async completePasswordReset(
    userId: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const hashedNewPassword = await hashPassword(newPassword);
      
      await storage.updateUser({
        id: userId,
        passwordHash: hashedNewPassword,
        tempPassword: undefined,
        tempPasswordExpiry: undefined,
        forcePasswordChange: false
      });

      return {
        success: true,
        message: "Password successfully updated. You can now log in with your new password."
      };

    } catch (error) {
      console.error("Password reset completion error:", error);
      return {
        success: false,
        message: "Failed to update password. Please try again."
      };
    }
  }
}