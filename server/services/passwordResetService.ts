import { storage } from "../storage";
import { emailService } from "./emailService";
import { smsService } from "./smsService";
import { hashPassword } from "../helpers/bcrypt-helper";
import { createRawToken, hashToken, DEFAULT_RESET_TTL_MS } from "../utils/resetToken";
import { buildFrontendUrl } from "../config/url";
const NEUTRAL_MSG = {
  success: true,
  message: "If an account exists for that identifier, a reset link has been sent.",
};

type Channel = "email" | "sms" | "auto";

export class PasswordResetService {
  /** Public API — called by controller */
  static async initiatePasswordReset(identifier: string, channel: Channel = "auto") {
    try {
      // Try to resolve a user without leaking which identifier is valid.
      const user =
        (await storage.getUserByEmail(identifier)) ||
        (await storage.getUserByUsername(identifier)) ||
        (await storage.getUserByPhone(normalizePhone(identifier)));

      if (!user) {
        // Neutral response — do not hint whether identifier exists
        return NEUTRAL_MSG;
      }

      // Create single-use, short-lived token
      const raw = createRawToken(32);
      const tokenHash = hashToken(raw);
      const expiresAt = new Date(Date.now() + DEFAULT_RESET_TTL_MS);

      await storage.createPasswordResetToken(user.id, tokenHash, expiresAt);
      if (storage.invalidateOtherResetTokensForUser) {
        await storage.invalidateOtherResetTokensForUser(user.id, tokenHash);
      }

      const resetLink = buildFrontendUrl("/reset-password", { token: raw });
      
      // Debug logging to verify correct URL generation  
      console.log("[RESET] sending URL ->", resetLink);

      // Decide delivery channel
      const canEmail = !!user.email;
      const canSms = !!user.phone; // expect E.164 (+1555…)
      const finalChannel = resolveChannel(channel, { canEmail, canSms });

      console.log("[RESET] User capabilities:", { 
        userId: user.id, 
        username: user.username,
        hasEmail: canEmail, 
        hasSms: canSms, 
        phone: user.phone ? `${user.phone.substring(0, 3)}***${user.phone.substring(user.phone.length - 4)}` : null,
        requestedChannel: channel,
        finalChannel 
      });

      // Fire-and-forget delivery (but await so errors are caught)
      if (finalChannel === "email" && canEmail && user.email) {
        console.log("[RESET] Sending email to:", user.email.replace(/(.{2}).*(@.*)/, '$1***$2'));
        await emailService.send({
          to: user.email,
          subject: "Password Reset",
          html: this.buildEmailHtml(user.firstName || user.username || "User", resetLink, expiresAt),
          text: this.buildEmailText(resetLink, expiresAt),
          disableTracking: true, // Prevent SendGrid click tracking from corrupting reset links
        });
        console.log("[RESET] Email sent successfully");
      } else if (finalChannel === "sms" && canSms && user.phone) {
        console.log("[RESET] Sending SMS to:", user.phone.replace(/(.{3}).*(.{4})/, '$1***$2'));
        try {
          const smsResult = await smsService.send({
            to: user.phone,
            body: this.buildSmsText(resetLink, expiresAt),
          });
          console.log("[RESET] SMS sent successfully:", { messageId: smsResult.messageId });
        } catch (smsError) {
          console.error("[RESET] SMS sending failed:", smsError);
          throw smsError;
        }
      } else {
        console.log("[RESET] No delivery channel available:", { finalChannel, canEmail, canSms });
        // If user lacks chosen channel, still return neutral message
        return NEUTRAL_MSG;
      }

      return NEUTRAL_MSG;
    } catch (err) {
      console.error("initiatePasswordReset error:", err);
      return NEUTRAL_MSG;
    }
  }

  static async validateToken(rawToken: string) {
    try {
      const tokenHash = hashToken(rawToken);
      const record = await storage.getValidPasswordResetByHash(tokenHash);
      if (!record) {
        return { valid: false, reason: "invalid_or_expired" };
      }
      return { valid: true, userId: record.user_id };
    } catch (e) {
      console.error("validateToken error:", e);
      return { valid: false, reason: "invalid_or_expired" };
    }
  }

  static async completeReset(rawToken: string, newPassword: string) {
    try {
      const tokenHash = hashToken(rawToken);
      const record = await storage.getValidPasswordResetByHash(tokenHash);
      if (!record) {
        return { success: false, message: "Invalid or expired link." };
      }

      // Update password
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser({ id: record.user_id, passwordHash });

      // Invalidate token
      await storage.markPasswordResetUsed(tokenHash);

      // Optional: invalidate any other active tokens for this user
      if (storage.invalidateOtherResetTokensForUser) {
        await storage.invalidateOtherResetTokensForUser(record.user_id, tokenHash);
      }

      return { success: true, message: "Password updated. You can now log in." };
    } catch (e) {
      console.error("completeReset error:", e);
      return { success: false, message: "Unable to complete reset. Try again." };
    }
  }

  private static buildEmailHtml(name: string, link: string, expiresAt: Date) {
    // Format expiration time more clearly - show minutes from now
    const now = new Date();
    const minutesUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 1000));
    const expiryText = `in ${minutesUntilExpiry} minutes (at ${expiresAt.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })})`;
    
    // Extract token from link for fallback
    const token = link.split('token=')[1];
    
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2>Password reset requested</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to continue.</p>
        <p style="font-weight:bold;margin-bottom:16px">Copy and paste this link in your browser:</p>
        <p style="background:#f3f4f6;padding:16px;border-radius:8px;word-break:break-all;font-family:monospace;font-size:14px;border:1px solid #d1d5db">${link}</p>
        <p>This link expires <b>${expiryText}</b> and can be used once.</p>
        
        <div style="margin-top:24px;padding:16px;background:#f3f4f6;border-radius:8px;font-size:14px">
          <p style="margin:0 0 8px 0;font-weight:bold">If the button doesn't work, copy this token:</p>
          <code style="background:#e5e7eb;padding:8px;border-radius:4px;display:block;word-break:break-all;margin:8px 0">${token}</code>
          <p style="margin:8px 0 0 0;font-size:12px;color:#666">Go to <a href="${buildFrontendUrl("/reset-password")}">${buildFrontendUrl("/reset-password")}</a> and paste the token above.</p>
        </div>
        
        <p style="margin-top:20px">If you didn't request this, you can ignore this email.</p>
      </div>
    `;
  }

  private static buildEmailText(link: string, expiresAt: Date) {
    const now = new Date();
    const minutesUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 1000));
    
    return `Password Reset

We received a request to reset your password.
Reset link (expires in ${minutesUntilExpiry} minutes):
${link}

If you didn't request this, ignore this email.`;
  }

  private static buildSmsText(link: string, expiresAt: Date) {
    const now = new Date();
    const minutesUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (60 * 1000));
    
    return `Gokul Wholesale: Password reset link (expires in ${minutesUntilExpiry} min): ${link}`;
  }
}

/** Helpers */
function resolveChannel(requested: Channel, caps: { canEmail: boolean; canSms: boolean }): Channel {
  if (requested === "email") return "email";
  if (requested === "sms") return "sms";
  // auto: prefer email if available/verified; else SMS
  if (caps.canEmail) return "email";
  if (caps.canSms) return "sms";
  // fallback (will result in neutral response)
  return "email";
}

// VERY basic phone normalizer; prefer storing E.164 server-side on profile edit
function normalizePhone(s: string) {
  return s.trim();
}