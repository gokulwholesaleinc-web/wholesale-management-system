import { Request } from 'express';

/**
 * Extract the real client IP address from various headers
 * Handles proxy scenarios and Replit deployment environments
 */
export function getClientIP(req: Request): string {
  // Check various headers in order of preference
  let clientIP = '';
  
  // 1. X-Forwarded-For header (most common for proxied requests)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // We want the first (original client) IP
    const forwardedIPs = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIP = forwardedIPs.split(',')[0].trim();
    if (firstIP && !isPrivateIP(firstIP)) {
      clientIP = firstIP;
    }
  }
  
  // 2. X-Real-IP header (used by some proxies)
  if (!clientIP) {
    const xRealIP = req.headers['x-real-ip'];
    if (xRealIP && typeof xRealIP === 'string' && !isPrivateIP(xRealIP)) {
      clientIP = xRealIP;
    }
  }
  
  // 3. CF-Connecting-IP (Cloudflare)
  if (!clientIP) {
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP && typeof cfIP === 'string' && !isPrivateIP(cfIP)) {
      clientIP = cfIP;
    }
  }
  
  // 4. X-Client-IP header
  if (!clientIP) {
    const xClientIP = req.headers['x-client-ip'];
    if (xClientIP && typeof xClientIP === 'string' && !isPrivateIP(xClientIP)) {
      clientIP = xClientIP;
    }
  }
  
  // 5. Fall back to req.ip (Express with trust proxy)
  if (!clientIP) {
    const reqIP = req.ip;
    if (reqIP && !isPrivateIP(reqIP)) {
      clientIP = reqIP;
    }
  }
  
  // 6. Fall back to socket connection info
  if (!clientIP) {
    const socketIP = req.connection?.remoteAddress || req.socket?.remoteAddress;
    if (socketIP && !isPrivateIP(socketIP)) {
      clientIP = socketIP;
    }
  }
  
  // 7. For development/local testing, try to get a real IP anyway
  if (!clientIP || isPrivateIP(clientIP)) {
    // In development, we can try to get the real IP using an external service
    // For now, we'll return a placeholder that the location service can handle
    return getDevModeRealIP(req);
  }
  
  return clientIP || 'unknown';
}

/**
 * Check if an IP address is private/local
 */
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown') {
    return true;
  }

  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  // Check for private IPv4 ranges
  const privateRanges = [
    /^10\./,                                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,         // 172.16.0.0/12  
    /^192\.168\./,                             // 192.168.0.0/16
    /^169\.254\./,                             // Link-local 169.254.0.0/16
    /^127\./,                                  // Loopback 127.0.0.0/8
    /^0\.0\.0\.0$/,                           // Invalid
    /^::1$/,                                   // IPv6 localhost
    /^fe80:/,                                  // IPv6 link-local
    /^fc00:/,                                  // IPv6 unique local
    /^fd00:/                                   // IPv6 unique local
  ];

  return privateRanges.some(range => range.test(cleanIP));
}

/**
 * For development mode, try to get a real public IP
 * This helps with testing geolocation features locally
 */
function getDevModeRealIP(req: Request): string {
  // Check if we're in development and if the user might be accessing via a public URL
  const host = req.headers.host;
  const userAgent = req.headers['user-agent'] || '';
  
  // If accessing via Replit's public URL, we might get a real IP from headers
  if (host && host.includes('.replit.dev')) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const forwardedIPs = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      const ips = forwardedIPs.split(',').map(ip => ip.trim());
      
      // Look for the first public IP in the chain
      for (const ip of ips) {
        if (!isPrivateIP(ip)) {
          return ip;
        }
      }
    }
  }
  
  // For local development, return a special marker that the location service can handle
  return 'dev-local';
}

/**
 * Get a human-readable description of the IP source for debugging
 */
export function getIPSource(req: Request): string {
  const sources = [];
  
  if (req.headers['x-forwarded-for']) sources.push('X-Forwarded-For');
  if (req.headers['x-real-ip']) sources.push('X-Real-IP');
  if (req.headers['cf-connecting-ip']) sources.push('Cloudflare');
  if (req.ip) sources.push('Express req.ip');
  if (req.connection?.remoteAddress) sources.push('Socket');
  
  return sources.length > 0 ? sources.join(', ') : 'Unknown';
}