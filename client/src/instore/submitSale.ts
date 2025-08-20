// client/src/instore/submitSale.ts
import { addTicket, generateTicketId, listPending, markSynced, markError } from './posQueue';

export async function submitSaleOrQueue(sale: any) {
  // Attach a client ticketId up front (also used as Idempotency-Key)
  const ticketId = generateTicketId();
  const payload = { ...sale, ticketId };

  if (navigator.onLine) {
    const res = await postSale(payload, ticketId);
    if (res.ok) return res.data; // { invoice: {...}, ticketId }
    // if server fails while online, fall back to queue
  }

  // Offline or server unreachable → queue
  addTicket({ ticketId, payload });
  return { queued: true, ticketId };
}

export async function syncQueuedSales() {
  const pending = listPending().sort((a, b) => a.createdAt - b.createdAt);
  for (const t of pending) {
    const res = await postSale(t.payload, t.ticketId);
    if (res.ok) {
      markSynced(t.ticketId, res.data.invoice.invoice_no, res.data.invoice.id);
    } else {
      markError(t.ticketId, res.error || 'sync failed');
      // stop early on network error; next online event will retry
      if (res.network) break;
    }
  }
}

async function postSale(body: any, ticketId: string): Promise<{ ok: true; data: any } | { ok: false; error?: string; network?: boolean }> {
  try {
    const r = await fetch('/api/pos/sale', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Idempotency-Key': ticketId,
        'Authorization': `Bearer ${localStorage.getItem('staffToken')}`
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) return { ok: false, error: await r.text() };
    const data = await r.json();
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e), network: true };
  }
}

// auto-resync on connectivity regained
window.addEventListener('online', () => { 
  syncQueuedSales().catch(console.error); 
});

// Export for manual sync triggers
export { syncQueuedSales };