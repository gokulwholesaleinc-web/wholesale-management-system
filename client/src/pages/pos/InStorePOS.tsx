import React, { useEffect, useMemo, useRef, useState } from 'react';

type Item = { sku: string; name: string; qty: number; unit_price: number; line_tax_rate: number; il_otp_cents?: number };

// Hardware integration bridge
declare global {
  interface Window {
    POSBridge?: {
      printText(text: string): void;
      openDrawer(): void;
    };
    MMFB?: {
      printReceiptText(text: string): void;
      kickCashDrawer(): void;
    };
  }
}

// Initialize POSBridge adapter if not already present
if (!window.POSBridge) {
  window.POSBridge = {
    printText(text: string) {
      if (window.MMFB?.printReceiptText) return window.MMFB.printReceiptText(text);
      console.warn('No printer bridge; skipped print');
    },
    openDrawer() {
      if (window.MMFB?.kickCashDrawer) return window.MMFB.kickCashDrawer();
      console.warn('No cash drawer bridge; skipped');
    }
  };
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`/api/pos-api${path}`, { 
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Use existing auth
    }, 
    ...init 
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Simple offline queue (localStorage)
const QUEUE_KEY = 'pos_queue_v1';
function enqueue(payload: any) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  q.push(payload);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
async function flushQueue() {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  const keep: any[] = [];
  for (const p of q) {
    try { await api('/sale', { method: 'POST', body: JSON.stringify(p) }); }
    catch { keep.push(p); }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(keep));
}

export default function InStorePOS() {
  const [items, setItems] = useState<Item[]>([]);
  const [discount, setDiscount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [taxOther, setTaxOther] = useState(0);
  const [taxOtp, setTaxOtp] = useState(0);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  // Hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setItems([]); setDiscount(0); setMessage('New sale'); }
      if (e.key === 'F2') { e.preventDefault(); document.getElementById('pay-btn')?.dispatchEvent(new MouseEvent('click')); }
      if (e.key === 'Delete') { e.preventDefault(); setItems(prev => prev.slice(0, -1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Recalc totals via API preview
  useEffect(() => {
    const run = async () => {
      if (items.length === 0) {
        setSubtotal(0); setTaxOther(0); setTaxOtp(0); setTotal(0);
        return;
      }
      const body = { items, discount };
      try {
        const { data } = await api('/preview', { method: 'POST', body: JSON.stringify(body) });
        setSubtotal(data.subtotal); setTaxOther(data.tax_other); setTaxOtp(data.tax_il_otp); setTotal(data.total);
      } catch (error) {
        console.error('Error calculating totals:', error);
      }
    };
    run();
  }, [items, discount]);

  // Auto-flush queued sales when online
  useEffect(() => {
    const on = async () => { try { await flushQueue(); setMessage('Queued sales synced'); } catch {} };
    window.addEventListener('online', on);
    on();
    return () => window.removeEventListener('online', on);
  }, []);

  async function addSku(sku: string) {
    try {
      const { data } = await api(`/sku/${encodeURIComponent(sku)}`);
      setItems(prev => {
        const i = prev.findIndex(p => p.sku === data.sku);
        if (i >= 0) { const cp = [...prev]; cp[i] = { ...cp[i], qty: cp[i].qty + 1 }; return cp; }
        return [...prev, { sku: data.sku, name: data.name, qty: 1, unit_price: data.unit_price, line_tax_rate: data.line_tax_rate, il_otp_cents: data.is_il_otp_item ? Math.round(data.unit_price * 0.45) : undefined }];
      });
      setMessage(null);
    } catch {
      setMessage(`SKU ${sku} not found`);
    }
  }

  function onScanKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && input.trim()) {
      addSku(input.trim());
      setInput('');
    }
  }

  async function pay(type: 'CASH'|'CARD') {
    const payload = {
      store_id: 'ITASCA', // Use environment variables on server side
      register_id: 'REG-01',
      cashier_id: 'CASHIER-1',
      items,
      discount,
      tenders: [{ type, amount: total }],
      note: ''
    };
    try {
      const { data } = await api('/sale', { method: 'POST', body: JSON.stringify(payload) });
      
      // Build professional receipt using POSBridge
      const receiptLines = [
        'GOKUL WHOLESALE',
        '1141 W Bryn Mawr Ave, Itasca IL 60143',
        'Phone: 630-540-9910',
        'www.shopgokul.com',
        '------------------------------------------',
        `SALE ${data.id}`,
        new Date(data.created_at).toLocaleString(),
        `Register: ${data.register_id} | Cashier: ${data.cashier_id}`,
        '------------------------------------------',
        ...data.items.flatMap((it:any)=>[
          `${it.name}`,
          `  ${it.sku}  x${it.qty}  @$${(it.unit_price/100).toFixed(2)}   $${((it.unit_price*it.qty)/100).toFixed(2)}`
        ]),
        '------------------------------------------',
        `Subtotal                 $${(data.subtotal/100).toFixed(2)}`,
        data.tax_il_otp > 0 ? `45% IL TOBACCO TAX PAID  $${(data.tax_il_otp/100).toFixed(2)}` : null,
        data.tax_other > 0 ? `Other Taxes              $${(data.tax_other/100).toFixed(2)}` : null,
        data.discount > 0 ? `Discount                -$${(data.discount/100).toFixed(2)}` : null,
        '------------------------------------------',
        `TOTAL                    $${(data.total/100).toFixed(2)}`,
        `${type}                  $${(data.tenders[0]?.amount/100 || 0).toFixed(2)}`,
        data.change_due > 0 ? `CHANGE                   $${(data.change_due/100).toFixed(2)}` : null,
        '',
        'Thank you for your business!',
        data.tax_il_otp > 0 ? 'IL Tobacco Tax Notice: This sale includes' : null,
        data.tax_il_otp > 0 ? '45% Illinois Other Tobacco Products tax.' : null,
        ''
      ].filter(Boolean);

      // Print receipt using hardware bridge
      window.POSBridge?.printText(receiptLines.join('\n'));
      
      // Open cash drawer for cash payments
      if (type === 'CASH') {
        window.POSBridge?.openDrawer();
      }
      
      setItems([]); setDiscount(0); 
      const changeMsg = data.change_due > 0 ? ` - Change: $${(data.change_due/100).toFixed(2)}` : '';
      setMessage(`Sale ${data.id} completed${changeMsg}`);
    } catch (err:any) {
      // offline or server error → queue
      enqueue(payload);
      setItems([]); setDiscount(0);
      setMessage('No network; queued sale for sync');
    }
  }

  const balanceColor = total > 0 ? '#111827' : '#ef4444';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, padding: 12, minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <div>
        <div style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 16, color: '#111827' }}>Gokul Wholesale - In-Store POS</h2>
          <div style={{ display:'flex', gap:8 }}>
            <input
              ref={scanRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={onScanKey}
              placeholder="Scan barcode or type SKU then Enter"
              autoFocus
              style={{ flex:1, padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize: 14 }}
            />
            <button onClick={()=>{ if(input.trim()) { addSku(input.trim()); setInput(''); } }}
              style={{ padding:'10px 16px', borderRadius:8, border:'1px solid #e5e7eb', backgroundColor: '#f9fafb', cursor: 'pointer' }}>Add</button>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 100px 60px', fontWeight:700, background:'#f9fafb', padding:'12px 16px', borderBottom: '1px solid #e5e7eb' }}>
            <div>Item</div><div>Qty</div><div>Unit</div><div></div>
          </div>
          {items.map((it,idx)=>(
            <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 70px 100px 60px', padding:'12px 16px', borderBottom:'1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontWeight:600, fontSize: 14 }}>{it.name}</div>
                <div style={{ fontSize:12, color:'#6b7280' }}>
                  {it.sku}
                  {(it.sku.startsWith('TOB') || it.sku.includes('ECIG')) && 
                    <span style={{ marginLeft: 8, fontSize: 10, backgroundColor: '#dc2626', color: 'white', padding: '2px 4px', borderRadius: 3 }}>IL-OTP</span>
                  }
                </div>
              </div>
              <input type="number" min={1} value={it.qty} onChange={e=>{
                const qty = Math.max(1, parseInt(e.target.value||'1',10));
                setItems(prev=>prev.map((p,i)=> i===idx ? { ...p, qty } : p));
              }} style={{ width:60, padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:6, fontSize: 14 }}/>
              <div style={{ fontSize: 14 }}>${(it.unit_price/100).toFixed(2)}</div>
              <button onClick={()=> setItems(prev=> prev.filter((_,i)=>i!==idx))}
                style={{ border:'1px solid #dc2626', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius:6, padding:'4px 8px', cursor: 'pointer', fontSize: 12 }}>Del</button>
            </div>
          ))}
          {!items.length && (
            <div style={{ padding: 24, color:'#6b7280', textAlign: 'center', fontSize: 14 }}>
              Scan items to begin a sale
              <div style={{ fontSize: 12, marginTop: 4 }}>F1: New Sale | F2: Pay | Delete: Remove Last Item</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div style={{ backgroundColor: 'white', border:'1px solid #e5e7eb', borderRadius:12, padding:16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap: '8px 16px', fontSize: 14 }}>
            <div>Subtotal</div><div>${(subtotal/100).toFixed(2)}</div>
            <div style={{ color: taxOtp > 0 ? '#dc2626' : '#6b7280', fontWeight: taxOtp > 0 ? 600 : 400 }}>
              45% IL TOBACCO TAX PAID
            </div>
            <div style={{ color: taxOtp > 0 ? '#dc2626' : '#6b7280', fontWeight: taxOtp > 0 ? 600 : 400 }}>
              ${(taxOtp/100).toFixed(2)}
            </div>
            <div>Other Taxes</div><div>${(taxOther/100).toFixed(2)}</div>
            <div>Discount</div>
            <div>
              <input type="number" min={0} value={discount} onChange={e=>setDiscount(Math.max(0, parseInt(e.target.value||'0',10)))} 
                style={{ width:80, padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:6, fontSize: 14 }}/>
            </div>
            <div style={{ fontWeight:800, fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>TOTAL</div>
            <div style={{ fontWeight:800, color: balanceColor, fontSize: 16, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>${(total/100).toFixed(2)}</div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:16 }}>
            <button 
              id="pay-btn" 
              onClick={()=>pay('CASH')} 
              disabled={items.length === 0}
              style={{ 
                flex:1, 
                padding:'12px', 
                borderRadius:8, 
                background: items.length === 0 ? '#d1d5db' : '#111827', 
                color:'white', 
                border: 'none',
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}>
              Cash (F2)
            </button>
            <button 
              onClick={()=>pay('CARD')} 
              disabled={items.length === 0}
              style={{ 
                flex:1, 
                padding:'12px', 
                borderRadius:8, 
                border:'1px solid #e5e7eb', 
                backgroundColor: items.length === 0 ? '#f9fafb' : 'white',
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}>
              Card
            </button>
          </div>
          <div style={{ marginTop:12, fontSize:12, color:'#6b7280', textAlign: 'center' }}>
            F1: New Sale • F2: Pay • Delete: Remove Last Item
          </div>
        </div>

        {message && (
          <div style={{ 
            marginTop:12, 
            padding:12, 
            background: message.includes('completed') ? '#f0fdf4' : '#f3f4f6', 
            border: `1px solid ${message.includes('completed') ? '#bbf7d0' : '#e5e7eb'}`, 
            borderRadius:8,
            fontSize: 14,
            color: message.includes('completed') ? '#166534' : '#374151'
          }}>
            {message}
          </div>
        )}

        {/* Hardware Controls */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.POSBridge?.openDrawer()}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Open Drawer
          </button>
          <button
            onClick={() => window.POSBridge?.printText('*** TEST PRINT ***\nGokul Wholesale\nPrinter Test\n\n')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Test Print
          </button>
        </div>

        {/* Queue status */}
        <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
          Store: ITASCA | Register: REG-01
          <br />
          Queue: {JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length} pending
          <br />
          Hardware: {window.POSBridge ? '✓' : '✗'} | Bridge: {window.MMFB ? '✓' : '✗'}
        </div>
      </div>
    </div>
  );
}