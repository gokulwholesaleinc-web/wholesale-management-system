import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { storage } from '../storage';

const router = Router();

// In-memory OTP storage (in production, use Redis or database)
const otpSessions = new Map<string, {
  staffId: string;
  contactMethod: 'email' | 'sms';
  contactValue: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}>();

// Staff OTP request schema
const sendOTPSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
  contactMethod: z.enum(['email', 'sms']),
  contactValue: z.string().min(1, "Contact information is required")
});

// OTP verification schema
const verifyOTPSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  code: z.string().length(6, "Code must be 6 digits")
});

// Generate 6-digit OTP
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Generate session ID
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Send OTP for staff authentication
router.post('/send-otp', validateRequest(sendOTPSchema), async (req, res) => {
  try {
    const { staffId, contactMethod, contactValue } = req.body;

    // Verify staff exists and has permission
    const staff = await storage.getStaffByIdOrUsername(staffId);
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials"
      });
    }

    // Verify contact information matches staff record
    let contactMatches = false;
    if (contactMethod === 'email' && staff.email === contactValue) {
      contactMatches = true;
    } else if (contactMethod === 'sms' && (staff.cellPhone === contactValue || staff.phone === contactValue)) {
      contactMatches = true;
    }

    if (!contactMatches) {
      return res.status(401).json({
        success: false,
        message: "Contact information does not match staff records"
      });
    }

    // Generate OTP and session
    const code = generateOTP();
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP session
    otpSessions.set(sessionId, {
      staffId,
      contactMethod,
      contactValue,
      code,
      expiresAt,
      attempts: 0
    });

    // Send OTP via appropriate method
    if (contactMethod === 'email') {
      // Email OTP
      try {
        const emailService = await import('../services/emailService');
        await emailService.sendStaffOTPEmail(contactValue, code, staff.username || staffId);
      } catch (error) {
        console.error('Failed to send OTP email:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to send verification email"
        });
      }
    } else {
      // SMS OTP
      try {
        const smsService = await import('../services/smsService');
        await smsService.sendStaffOTPSMS(contactValue, code, staff.username || staffId);
      } catch (error) {
        console.error('Failed to send OTP SMS:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to send verification SMS"
        });
      }
    }

    // Log the authentication attempt
    console.log(`Staff OTP sent for ${staffId} via ${contactMethod} to ${contactValue.slice(0, 3)}***`);

    res.json({
      success: true,
      message: `Verification code sent to your ${contactMethod}`,
      sessionId
    });

  } catch (error) {
    console.error('Staff OTP send error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Verify OTP and authenticate staff
router.post('/verify-otp', validateRequest(verifyOTPSchema), async (req, res) => {
  try {
    const { sessionId, code } = req.body;

    // Get OTP session
    const session = otpSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired session"
      });
    }

    // Check expiration
    if (new Date() > session.expiresAt) {
      otpSessions.delete(sessionId);
      return res.status(400).json({
        success: false,
        message: "Verification code has expired"
      });
    }

    // Check attempts limit
    if (session.attempts >= 3) {
      otpSessions.delete(sessionId);
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new code."
      });
    }

    // Verify code
    if (session.code !== code) {
      session.attempts++;
      return res.status(400).json({
        success: false,
        message: "Invalid verification code"
      });
    }

    // Get staff details
    const staff = await storage.getStaffByIdOrUsername(session.staffId);
    if (!staff) {
      otpSessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: "Staff account not found"
      });
    }

    // Generate staff JWT token
    const tokenData = {
      id: staff.id,
      username: staff.username,
      role: staff.role,
      permissions: staff.permissions || [],
      type: 'staff',
      isStaff: true,
      isAdmin: staff.role === 'admin',
      isEmployee: staff.role === 'employee'
    };

    // Create JWT token (you might want to use a proper JWT library)
    const token = `staff-${staff.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    
    // Store token in staff token store (implement this in storage)
    await storage.createStaffSession(staff.id, token, {
      loginMethod: 'otp',
      contactMethod: session.contactMethod,
      loginAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    });

    // Clean up OTP session
    otpSessions.delete(sessionId);

    // Log successful authentication
    console.log(`Staff ${staff.username} successfully authenticated via ${session.contactMethod}`);

    res.json({
      success: true,
      message: "Authentication successful",
      token,
      user: {
        id: staff.id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        isStaff: true,
        isAdmin: staff.role === 'admin',
        isEmployee: staff.role === 'employee'
      }
    });

  } catch (error) {
    console.error('Staff OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Remove staff session
      await storage.removeStaffSession(token);
    }

    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error('Staff logout error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Get current staff user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const session = await storage.getStaffSession(token);
    
    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const staff = await storage.getStaffById(session.staffId);
    if (!staff) {
      return res.status(401).json({ success: false, message: "Staff not found" });
    }

    res.json({
      success: true,
      user: {
        id: staff.id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        permissions: staff.permissions,
        isStaff: true,
        isAdmin: staff.role === 'admin',
        isEmployee: staff.role === 'employee'
      }
    });

  } catch (error) {
    console.error('Staff auth check error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

export default router;