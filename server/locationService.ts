/**
 * Location Service - IP to Geographic Location
 * Converts IP addresses to human-readable location information
 */

interface LocationData {
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

interface FormattedLocation {
  formatted: string;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
}

/**
 * Get location information from IP address using ip-api.com (free service)
 * Rate limit: 1000 requests per minute for free usage
 */
async function getLocationFromIP(ip: string): Promise<LocationData | null> {
  try {
    // Skip local/private IP addresses
    if (!ip || ip === 'unknown' || isPrivateIP(ip)) {
      return null;
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city,
        region: data.regionName,
        country: data.country,
        postal: data.zip,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp
      };
    }

    console.warn(`Location lookup failed for IP ${ip}:`, data.message);
    return null;
  } catch (error) {
    console.error(`Error looking up location for IP ${ip}:`, error);
    return null;
  }
}

/**
 * Check if IP address is private/local
 */
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }

  // Check for private IPv4 ranges
  const privateRanges = [
    /^10\./,           // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./,     // 192.168.0.0/16
    /^169\.254\./,     // Link-local
    /^::1$/,           // IPv6 localhost
    /^fe80:/           // IPv6 link-local
  ];

  return privateRanges.some(range => range.test(ip));
}

/**
 * Format location data into human-readable string
 */
function formatLocation(location: LocationData): FormattedLocation {
  const parts: string[] = [];
  
  if (location.city) {
    parts.push(location.city);
  }
  
  if (location.region && location.region !== location.city) {
    parts.push(location.region);
  }
  
  if (location.country) {
    parts.push(location.country);
  }

  let formatted = parts.length > 0 ? parts.join(', ') : 'Unknown Location';
  
  // Add postal code if available
  if (location.postal) {
    formatted += ` ${location.postal}`;
  }

  return {
    formatted,
    city: location.city,
    region: location.region,
    country: location.country,
    postal: location.postal
  };
}

/**
 * Get formatted location string from IP address
 */
export async function getLocationString(ip: string): Promise<string> {
  try {
    // Handle special development case
    if (ip === 'dev-local') {
      return 'Development Environment';
    }
    
    // Handle local/development scenarios
    if (!ip || ip === 'unknown' || isPrivateIP(ip)) {
      return 'Local Server or Network';
    }

    console.log(`🌍 Looking up location for IP: ${ip}`);
    const locationData = await getLocationFromIP(ip);
    
    if (!locationData) {
      console.log(`❌ No location data found for IP: ${ip}`);
      return 'Unknown Location';
    }

    const formatted = formatLocation(locationData);
    console.log(`✅ Location found for IP ${ip}: ${formatted.formatted}`);
    return formatted.formatted;
    
  } catch (error) {
    console.error('Error getting location string:', error);
    return 'Unknown Location';
  }
}

/**
 * Get detailed location information from IP address
 */
export async function getDetailedLocation(ip: string): Promise<FormattedLocation | null> {
  try {
    // Handle special development case
    if (ip === 'dev-local') {
      return {
        formatted: 'Development Environment',
        city: undefined,
        region: undefined,
        country: undefined,
        postal: undefined
      };
    }
    
    if (!ip || ip === 'unknown' || isPrivateIP(ip)) {
      return {
        formatted: 'Local Server or Network',
        city: undefined,
        region: undefined,
        country: undefined,
        postal: undefined
      };
    }

    const locationData = await getLocationFromIP(ip);
    
    if (!locationData) {
      return {
        formatted: 'Unknown Location',
        city: undefined,
        region: undefined,
        country: undefined,
        postal: undefined
      };
    }

    return formatLocation(locationData);
    
  } catch (error) {
    console.error('Error getting detailed location:', error);
    return null;
  }
}

export default {
  getLocationString,
  getDetailedLocation
};