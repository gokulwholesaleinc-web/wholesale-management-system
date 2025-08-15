/**
 * Normalized Role Management System
 * Addresses inconsistent role flag handling across admin pages
 */

export type UserRole = 'admin' | 'employee' | 'customer';

export interface NormalizedUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  customerLevel: number;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normalize user role flags from various formats into consistent roles array
 */
export function normalizeUserRoles(user: any): NormalizedUser {
  const roles: UserRole[] = [];
  
  // Check for admin role (handle both camelCase and snake_case)
  if (user.isAdmin || user.is_admin) {
    roles.push('admin');
  }
  
  // Check for employee role (handle both camelCase and snake_case)
  if (user.isEmployee || user.is_employee) {
    roles.push('employee');
  }
  
  // If no staff roles, default to customer
  if (roles.length === 0) {
    roles.push('customer');
  }
  
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    company: user.company,
    customerLevel: user.customerLevel || 1,
    roles,
    isActive: user.isActive !== false, // Default to active unless explicitly false
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Check if user has specific role
 */
export function hasRole(user: NormalizedUser, role: UserRole): boolean {
  return user.roles.includes(role);
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: NormalizedUser | any): boolean {
  if ('roles' in user) {
    return user.roles.includes('admin');
  }
  // Legacy support for direct flags
  return user.isAdmin || user.is_admin || false;
}

/**
 * Check if user has staff privileges (admin or employee)
 */
export function isStaff(user: NormalizedUser | any): boolean {
  if ('roles' in user) {
    return user.roles.includes('admin') || user.roles.includes('employee');
  }
  // Legacy support for direct flags
  return user.isAdmin || user.is_admin || user.isEmployee || user.is_employee || false;
}

/**
 * Get user's primary role (highest privilege)
 */
export function getPrimaryRole(user: NormalizedUser): UserRole {
  if (user.roles.includes('admin')) return 'admin';
  if (user.roles.includes('employee')) return 'employee';
  return 'customer';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin': return 'Administrator';
    case 'employee': return 'Employee';
    case 'customer': return 'Customer';
    default: return 'Unknown';
  }
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'admin': return 'bg-red-100 text-red-800';
    case 'employee': return 'bg-blue-100 text-blue-800';
    case 'customer': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Server-side role validation middleware helper
 */
export function validateUserRoles(user: any): {
  isValid: boolean;
  normalizedUser: NormalizedUser;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!user) {
    errors.push('User object is required');
    return { isValid: false, normalizedUser: null as any, errors };
  }
  
  if (!user.id) {
    errors.push('User ID is required');
  }
  
  if (!user.username) {
    errors.push('Username is required');
  }
  
  const normalizedUser = normalizeUserRoles(user);
  
  return {
    isValid: errors.length === 0,
    normalizedUser,
    errors
  };
}