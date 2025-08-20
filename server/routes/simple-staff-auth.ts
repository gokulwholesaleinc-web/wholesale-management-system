import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';

const router = Router();

// Simple validation middleware
const validateBody = (schema: z.ZodSchema) => (req: any, res: any, next: any) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid request data" });
  }
};

// In-memory OTP storage
const otpSessions = new Map<string, {
  staffId: string;
  contactMethod: 'email' | 'sms';
  contactValue: string;
  code: string;
  expiresAt: Date;
  attempts: number;
}>();

// Staff sessions storage
const staffSessions = new Map<string, {
  staffId: string;
  username: string;
  role: string;
  expiresAt: Date;
}>();

// Schemas
const sendOTPSchema = z.object({
  staffId: z.string().min(1),
  contactMethod: z.enum(['email', 'sms']),
  contactValue: z.string().min(1)
});

const verifyOTPSchema = z.object({
  sessionId: z.string().min(1),
  code: z.string().length(6)
});

// Generate 6-digit OTP
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Generate session ID
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Mock staff database (replace with real database lookup)
const mockStaff = [
  {
    id: 'staff001',
    username: 'admin',
    email: 'admin@shopgokul.com',
    phone: '+16306478042',
    role: 'admin'
  },
  {
    id: 'staff002',
    username: 'manager',
    email: 'manager@shopgokul.com',
    phone: '+16306478042',
    role: 'manager'
  },
  {
    id: 'staff003',
    username: 'cashier',
    email: 'cashier@shopgokul.com',
    phone: '+16306478042',
    role: 'employee'
  }
];

// Send OTP
router.post('/send-otp', validateBody(sendOTPSchema), async (req, res) => {
  try {
    const { staffId, contactMethod, contactValue } = req.body;

    // Find staff member
    const staff = mockStaff.find(s => s.id === staffId || s.username === staffId);
    if (!staff) {
      return res.status(401).json({
        success: false,
        message: "Invalid staff credentials"
      });
    }

    // Verify contact information
    let contactMatches = false;
    if (contactMethod === 'email' && staff.email === contactValue) {
      contactMatches = true;
    } else if (contactMethod === 'sms' && staff.phone === contactValue) {
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

    // For demo purposes, log the OTP (in production, send via email/SMS)
    console.log(`🔐 Staff OTP for ${staffId}: ${code} (expires in 5 minutes)`);
    console.log(`📧 Would send to ${contactMethod}: ${contactValue}`);

    res.json({
      success: true,
      message: `Verification code sent to your ${contactMethod}`,
      sessionId,
      // FOR DEMO ONLY - remove in production
      devOTP: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('Staff OTP send error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Verify OTP
router.post('/verify-otp', validateBody(verifyOTPSchema), async (req, res) => {
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

    // Find staff details
    const staff = mockStaff.find(s => s.id === session.staffId || s.username === session.staffId);
    if (!staff) {
      otpSessions.delete(sessionId);
      return res.status(401).json({
        success: false,
        message: "Staff account not found"
      });
    }

    // Generate staff token
    const token = `staff-${staff.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    
    // Store staff session
    staffSessions.set(token, {
      staffId: staff.id,
      username: staff.username,
      role: staff.role,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    });

    // Clean up OTP session
    otpSessions.delete(sessionId);

    console.log(`✅ Staff ${staff.username} successfully authenticated`);

    res.json({
      success: true,
      message: "Authentication successful",
      token,
      user: {
        id: staff.id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
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

// Get current staff user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const session = staffSessions.get(token);
    
    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const staff = mockStaff.find(s => s.id === session.staffId);
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

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      staffSessions.delete(token);
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

// Verify staff token endpoint
router.get('/verify-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Check if token exists in our sessions
    const session = staffSessions.get(token);
    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Find staff details
    const staff = mockStaff.find(s => s.id === session.staffId);
    if (!staff) {
      return res.status(401).json({ success: false, message: 'Staff not found' });
    }

    res.json({ 
      success: true, 
      message: 'Token valid', 
      user: {
        id: staff.id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        isStaff: true,
        isAdmin: staff.role === 'admin',
        isEmployee: staff.role === 'employee'
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;