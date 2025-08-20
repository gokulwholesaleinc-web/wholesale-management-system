// Minimal offline queue for POS tickets (no external deps)
// Uses IndexedDB if available via simple fallback to localStorage.

export type QueuedTicket = {
  ticketId: string;                 // pos-<ts>-<rand>
  payload: any;                     // sale data (lines, customer, tender, etc.)
  createdAt: number;                // ms
  status: 'pending' | 'synced' | 'error';
  lastError?: string;
  invoiceNo?: number;               // filled after sync
  invoiceId?: string;               // server id after sync
};

const KEY = 'pos_offline_queue_v1';

function readAll(): QueuedTicket[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeAll(list: QueuedTicket[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addTicket(ticket: Omit<QueuedTicket, 'status' | 'createdAt'>) {
  const list = readAll();
  list.unshift({ ...ticket, status: 'pending', createdAt: Date.now() });
  writeAll(list);
}

export function listPending(): QueuedTicket[] { return readAll().filter(t => t.status === 'pending'); }
export function listAll(): QueuedTicket[] { return readAll(); }

export function markSynced(ticketId: string, invoiceNo: number, invoiceId: string) {
  const list = readAll();
  const i = list.findIndex(t => t.ticketId === ticketId);
  if (i >= 0) { list[i].status = 'synced'; list[i].invoiceNo = invoiceNo; list[i].invoiceId = invoiceId; }
  writeAll(list);
}

export function markError(ticketId: string, message: string) {
  const list = readAll();
  const i = list.findIndex(t => t.ticketId === ticketId);
  if (i >= 0) { list[i].status = 'error'; list[i].lastError = message; }
  writeAll(list);
}

export function generateTicketId() {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}