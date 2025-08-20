export function buildAppUrl(pathname: string, query?: Record<string, string>) {
  const base = process.env.APP_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
  const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, base);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}