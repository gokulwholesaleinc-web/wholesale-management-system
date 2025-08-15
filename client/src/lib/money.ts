// Single money formatter (use everywhere)
export function fmtUSD(n: number | null | undefined) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

// (Optional) cents helpers if/when you migrate to fixed point
// export const toCents = (n: number) => Math.round(n * 100);
// export const fromCents = (c: number) => c / 100;