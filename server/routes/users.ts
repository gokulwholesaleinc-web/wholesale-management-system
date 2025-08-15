import { Router } from "express";
import { storage } from "../storage";
import { requireAdmin, requireAuth } from "../simpleAuth";
import { db } from '../db';
import { deliveryAddresses } from '../../..../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Get all users - admin only
router.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Create a new user - admin only
router.post("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { username, password, isAdmin, isEmployee, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    // Check if user with that username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    // Create the user (password will be hashed inside createCustomerUser)
    const newUser = await storage.createCustomerUser({
      id: `user-${Date.now()}`, // Generate unique ID
      username,
      password, // This will be hashed inside createCustomerUser
      firstName,
      lastName,
      isAdmin: !!isAdmin,
      isEmployee: !!isEmployee
    });
    
    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// Update a user - admin only (supports both PATCH and PUT)
const updateUserHandler = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Admin user update request:', { id, updateData });
    
    // Verify user exists
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update user with all provided fields
    const updatedUser = await storage.updateUser({
      id,
      ...updateData
    });
    
    console.log('User updated successfully:', updatedUser.id);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
};

router.patch("/admin/users/:id", requireAdmin, updateUserHandler);
router.put("/admin/users/:id", requireAdmin, updateUserHandler);

// Get user addresses endpoint
router.get("/users/:userId/addresses", requireAuth, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { userId } = req.params;
    const requestingUserId = req.user?.claims?.sub || req.user?.id;
    
    console.log('User addresses request:', { userId, requestingUserId });
    
    // Check if user is admin or requesting their own addresses
    const requestingUser = await storage.getUser(requestingUserId);
    const isAdmin = requestingUser?.isAdmin || requestingUser?.isEmployee;
    
    if (!isAdmin && requestingUserId !== userId) {
      return res.status(403).json({ message: "Unauthorized to access these addresses" });
    }
    
    // Get addresses for the user
    const addresses = await db.select()
      .from(deliveryAddresses)
      .where(eq(deliveryAddresses.userId, userId));
    
    console.log(`Found ${addresses.length} addresses for user ${userId}`);
    res.json(addresses || []);
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    res.status(500).json({ message: "Failed to fetch user addresses" });
  }
});

// Customer can update their own profile
router.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address, company } = req.body;
    
    // Get authentication token from various possible sources
    const authHeader = req.headers.authorization || req.headers['x-auth-token'];
    let token = null;
    
    // Handle Bearer token format
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // Handle direct token format
    else if (typeof authHeader === 'string') {
      token = authHeader;
    }
    // Handle array format (unlikely but for safety)
    else if (Array.isArray(authHeader) && authHeader.length > 0) {
      const firstAuth = authHeader[0];
      if (firstAuth && typeof firstAuth === 'string') {
        if (firstAuth.startsWith('Bearer ')) {
          token = firstAuth.split(' ')[1];
        } else {
          token = firstAuth;
        }
      }
    }
      
    console.log(`Processing profile update request for user ${id}, auth token present: ${!!token}`);
    
    // For admin users, allow profile updates without strict validation
    const isAdminToken = token && (token.includes('admin') || token.startsWith('admin-token-'));
    
    // Verify user exists
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // If this is not an admin token, perform additional security checks
    if (!isAdminToken) {
      // Get the authenticated user from the token
      // Simplified authentication check - in production, use a proper token verification
      if (!token) {
        console.log('No authentication token provided for profile update');
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // For token-only authentication, we'll consider it valid if the token matches the user ID pattern
      // This is a simplified approach - in production, use proper JWT verification
      const tokenMatchesUserId = token.includes(id) || token.includes(user.username || '');
      const isUserEditingSelf = tokenMatchesUserId || (req.user?.id === id);
      
      // Extract user ID from token or from session (simplified)
      const requestUserId = req.user?.id || null;
      
      if (requestUserId && requestUserId !== id && !isUserEditingSelf) {
        console.log(`User ${requestUserId} attempted to update profile for ${id}`);
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      console.log(`User ${id} authorized to update their own profile`);
    } else {
      console.log('Admin token detected, bypassing user ID check');
    }
    
    console.log(`Processing profile update for user ${id}:`, {
      firstName: firstName || "(unchanged)",
      lastName: lastName || "(unchanged)",
      email: email || "(unchanged)",
      phone: phone || "(unchanged)",
      company: company || "(unchanged)",
      address: address || "(unchanged)"
    });
    
    // Update user profile details
    const updatedUser = await storage.updateUser({
      id,
      firstName: firstName !== undefined ? firstName : user.firstName,
      lastName: lastName !== undefined ? lastName : user.lastName,
      email: email !== undefined ? email : user.email,
      phone: phone !== undefined ? phone : user.phone,
      address: address !== undefined ? address : user.address,
      company: company !== undefined ? company : user.company,
      // Preserve admin/employee status
      isAdmin: user.isAdmin,
      isEmployee: user.isEmployee
    });
    
    // Log this activity - with simplified parameters matching current schema
    try {
      await storage.addActivityLog({
        userId: id,
        // Include username if available to improve log readability
        username: user.username || undefined,
        action: 'UPDATE_PROFILE',
        details: `Profile updated: ${firstName ? 'Name, ' : ''}${email ? 'Email, ' : ''}${company ? 'Company, ' : ''}${phone ? 'Phone, ' : ''}${address ? 'Address' : ''}`,
        targetId: id,
        targetType: 'user',
        timestamp: new Date()
        // Remove ipAddress which was causing the schema mismatch
      });
    } catch (logError) {
      // Don't let activity logging prevent the profile update
      console.warn("Could not log profile update activity:", logError);
      // Continue with the response regardless of logging success
    }
    
    console.log(`Profile updated successfully for user ${id}`);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Reset user password - admin only
router.post("/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    
    // Verify user exists
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update password (will be hashed inside updateUser)
    await storage.updateUser({
      id,
      password
    });
    
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

// Delete user - admin only
router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting the admin account
    if (id === 'admin-user' || id === 'admin' || id === 'admin_49rzcl0p') {
      return res.status(403).json({ message: "Cannot delete the main admin account" });
    }
    
    // Verify user exists
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Delete the user
    await storage.deleteUser(id);
    
    console.log(`User ${id} deleted successfully`);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;