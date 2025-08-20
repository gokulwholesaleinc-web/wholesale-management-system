// Express router implementing secure tokenized, single-use password reset.
// Supports Email and optional SMS channel. Uses PUBLIC_BASE_URL for links.

import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { storage } from '../storage';
import { passwordResetEmailTemplates, passwordResetSmsTemplates, detectUserLanguage, getTemplate } from '../../shared/multilingual-templates';

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

// Multilingual email template
function resetEmailTemplate(link: string, minutes: number, language: string = 'en') {
  const data = { link, minutes };
  const subject = getTemplate(passwordResetEmailTemplates.subject, language as any);
  const html = getTemplate(passwordResetEmailTemplates.html(data), language as any);
  const text = getTemplate(passwordResetEmailTemplates.text(data), language as any);
  return { subject, text, html };
}

// Multilingual SMS template
function resetSmsTemplate(link: string, minutes: number, language: string = 'en') {
  const data = { link, minutes };
  return getTemplate(passwordResetSmsTemplates.message(data), language as any);
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

    // Password reset always uses English for security consistency
    console.log(`🔐 [Password Reset] Sending password reset in English for security consistency`);

    // Send via requested channels in English
    if (channel === 'email' || channel === 'both') {
      if (!user.email) {
        console.warn('[forgot-password] user has no email on file', { userId: user.id });
      } else {
        const { subject, text, html } = resetEmailTemplate(link, TOKEN_TTL_MINUTES, 'en');
        await emailService.send({ to: user.email, subject, text, html });
        console.log(`📧 [Password Reset] Email sent in English to ${user.email}`);
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (!user.phone) {
        console.warn('[forgot-password] user has no phone on file', { userId: user.id });
      } else {
        const message = resetSmsTemplate(link, TOKEN_TTL_MINUTES, 'en');
        await smsService.send({ to: user.phone, message });
        console.log(`📱 [Password Reset] SMS sent in English to ${user.phone?.slice(-4)}`);
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