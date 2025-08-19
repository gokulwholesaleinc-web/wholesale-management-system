// CSV utility functions for safe export/import
export function escapeCSV(v: unknown): string {
  let s = String(v ?? '');
  // Neutralize Excel formula execution
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  // Escape quotes
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

export function downloadCSV(filename: string, content: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}