// Express router implementing secure tokenized, single-use password reset.
// Supports Email and optional SMS channel. Uses PUBLIC_BASE_URL for links.

import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { storage } from '../storage';

const router = Router();

// Token helpers
const TOKEN_BYTES = 32;               // 256-bit
const TOKEN_TTL_MINUTES = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '30', 10);

function createResetToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url'); // URL-safe
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

// Compose reset URL
function resetUrl(token: string) {
  const base = process.env.PUBLIC_BASE_URL!.replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

// Email template
function resetEmailTemplate(link: string, minutes: number) {
  const subject = 'Password Reset Request';
  const text = `We received a request to reset your password.

Use the link below to set a new password. This link expires in ${minutes} minutes.

${link}

If you did not request a password reset, you can safely ignore this message.`;

  const html = `
  <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto;">
    <h2 style="margin-bottom: 8px;">Password Reset Request</h2>
    <p style="color:#444;margin:0 0 16px;">We received a request to reset your password. The link below expires in <b>${minutes} minutes</b>.</p>
    <p style="margin: 16px 0;">
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">
        Set New Password
      </a>
    </p>
    <p style="color:#555;margin:16px 0;">If the button doesn't work, copy and paste this URL:</p>
    <code style="display:block;white-space:break-spaces;background:#f6f8fa;padding:12px;border-radius:8px;color:#111">${link}</code>
    <p style="color:#777;margin-top:16px;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
  `;
  return { subject, text, html };
}

// SMS template
function resetSmsTemplate(link: string, minutes: number) {
  return `Reset your password (expires in ${minutes}m): ${link} Reply STOP to opt out.`;
}

// POST /auth/forgot-password
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, phone, channel = 'email' } = (req.body ?? {}) as {
      emailOrUsername?: string;
      phone?: string;
      channel?: 'email' | 'sms' | 'both';
    };

    // Look up user without leaking enumeration info
    let user: any = null;
    if (emailOrUsername) {
      user = await storage.getUserByEmail(emailOrUsername.trim().toLowerCase());
      if (!user) user = await storage.getUserByUsername(emailOrUsername.trim());
    } else if (phone) {
      user = await storage.getUserByPhone(phone.trim());
    }

    // Always respond success (prevents enumeration), but only proceed internally if user exists
    if (!user) {
      await wait(150); // Simulate latency
      return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // Create reset token & persist hash
    const { token, tokenHash, expiresAt } = createResetToken();
    await storage.createPasswordResetToken(String(user.id), tokenHash, expiresAt);

    const link = resetUrl(token);

    // Send via requested channels
    if (channel === 'email' || channel === 'both') {
      if (!user.email) {
        console.warn('[forgot-password] user has no email on file', { userId: user.id });
      } else {
        const { subject, text, html } = resetEmailTemplate(link, TOKEN_TTL_MINUTES);
        await emailService.send({ to: user.email, subject, text, html });
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (!user.phone) {
        console.warn('[forgot-password] user has no phone on file', { userId: user.id });
      } else {
        const message = resetSmsTemplate(link, TOKEN_TTL_MINUTES);
        await smsService.send({ to: user.phone, message });
      }
    }

    return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  } catch (err: any) {
    console.error('[forgot-password] error', { message: err?.message });
    return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  }
});

// POST /auth/reset-password
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = (req.body ?? {}) as { token?: string; newPassword?: string };

    if (!token || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: 'Invalid input.' });
    }

    const tokenHash = hashToken(token);
    const record = await storage.getValidPasswordResetByHash(tokenHash);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Update password and mark token used
    await storage.updateUserPassword(String(record.user_id), newPassword);
    await storage.markPasswordResetUsed(tokenHash);

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('[reset-password] error', { message: err?.message });
    return res.status(500).json({ success: false, message: 'Unable to reset password right now.' });
  }
});

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default router;