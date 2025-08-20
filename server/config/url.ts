function mustGet(name: string) {
  const v = process.env[name];
  if (!v) {
    // In prod, fail fast so you never send localhost links
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[CONFIG] Missing ${name}`);
    }
  }
  return v;
}

/** Frontend app URL (where the reset page lives) */
export function frontendUrl(): string {
  // Use FRONTEND_PUBLIC_URL if you host FE separately (Vercel, Netlify, etc.)
  // Otherwise APP_URL can be your single canonical domain.
  const base =
    mustGet('FRONTEND_PUBLIC_URL') ||
    mustGet('APP_URL') ||
    'https://shopgokul.com';

  // Normalize and enforce https in prod
  const u = new URL(base);
  if (process.env.NODE_ENV === 'production' && u.protocol !== 'https:') {
    u.protocol = 'https:';
    u.port = ''; // avoid accidental :3000 in prod
  }
  return u.origin; // no trailing slash
}

/** Build a URL under the FE site */
export function buildFrontendUrl(pathname: string, query?: Record<string, string>) {
  const base = frontendUrl();
  const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, base);
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

// Legacy alias for backward compatibility
export const buildAppUrl = buildFrontendUrl;