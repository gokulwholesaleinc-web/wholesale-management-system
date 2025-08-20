export function buildAppUrl(pathname: string, query?: Record<string, string>) {
  const base = process.env.APP_URL?.replace(/\/+$/, '') || 'https://shopgokul.com';
  console.log('[URL_DEBUG] APP_URL env var:', process.env.APP_URL);
  console.log('[URL_DEBUG] Using base:', base);
  const url = new URL(pathname.startsWith('/') ? pathname : `/${pathname}`, base);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  console.log('[URL_DEBUG] Final URL:', url.toString());
  return url.toString();
}