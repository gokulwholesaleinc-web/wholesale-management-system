import bcrypt from 'bcrypt';

/**
 * Hash a password using bcrypt
 * @param password Plain text password to hash
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 * @param plainPassword Plain text password to verify
 * @param hashedPassword Hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}