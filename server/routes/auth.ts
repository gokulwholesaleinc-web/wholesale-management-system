import { Router } from "express";
import { storage } from "../storage";
import { createAuthToken, requireAuth } from "../simpleAuth";
import bcrypt from "bcrypt";

const authRoutes = Router();

export default authRoutes;

// Login endpoint - SINGLE IMPLEMENTATION
authRoutes.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      // Log failed login attempt  
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
      await storage.logActivity(
        'unknown',
        username,
        'failed_login',
        `Failed login attempt for username: ${username}`,
        'authentication',
        null,
        Array.isArray(clientIp) ? clientIp[0] : (clientIp || 'Unknown')
      );
      return res.status(401).json({ message: 'Incorrect username or password' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      // Log failed login attempt
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
      await storage.logActivity(
        user.id,
        user.username,
        'failed_login',
        `Failed login attempt with incorrect password for user: ${user.username}`,
        'authentication',
        null,
        Array.isArray(clientIp) ? clientIp[0] : (clientIp || 'Unknown')
      );
      return res.status(401).json({ message: 'Incorrect username or password' });
    }
    
    // Update last login timestamp
    await storage.updateUserLastLogin(user.id);
    
    // Log successful login activity
    const userType = user.isAdmin ? 'Admin' : user.isEmployee ? 'Staff' : 'Customer';
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
    await storage.logActivity(
      user.id,
      user.username,
      'login',
      `${userType} ${user.username} logged in successfully`,
      'authentication',
      null,
      Array.isArray(clientIp) ? clientIp[0] : (clientIp || 'Unknown')
    );
    
    const token = createAuthToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        isEmployee: user.isEmployee
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Logout endpoint
authRoutes.post('/logout', requireAuth, async (req: any, res) => {
  try {
    // Log logout activity
    const user = req.user;
    if (user) {
      const userType = user.isAdmin ? 'Admin' : user.isEmployee ? 'Staff' : 'Customer';
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
      await storage.logActivity(
        user.id,
        user.username,
        'logout',
        `${userType} ${user.username} logged out`,
        'authentication',
        null,
        Array.isArray(clientIp) ? clientIp[0] : (clientIp || 'Unknown')
      );
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ message: 'Logged out successfully' });
  }
});

// Get current user
authRoutes.get('/me', requireAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      isEmployee: user.isEmployee
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user information' });
  }
});