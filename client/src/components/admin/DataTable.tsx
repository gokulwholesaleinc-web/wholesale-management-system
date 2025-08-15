import React from 'react';

export function DataTable({ columns, rows }: { columns: { key: string; label: string }[]; rows: any[] }) {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${columns.length}, 1fr)`, backgroundColor:'#f9fafb' }}>
        {columns.map(c=> <div key={c.key} style={{ padding:12, color:'#374151', textOverflow:'ellipsis', overflow:'hidden' }}>{c.label}</div>)}
      </div>
      {rows.map((r,i)=>(
        <div key={i} style={{ display:'grid', gridTemplateColumns:`repeat(${columns.length}, 1fr)`, borderTop: i ? '1px solid #e5e7eb' : '' }}>
          {columns.map(c=> <div key={c.key} style={{ padding:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[c.key]}</div>)}
        </div>
      ))}
      {!rows.length && <div style={{ padding:12, color:'#6b7280' }}>No data</div>}
    </div>
  );
}