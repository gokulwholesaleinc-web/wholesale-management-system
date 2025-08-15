import React, { useState } from 'react';
import {
  useAdminOverview, useAdminUsers, useAdminRoles, useAdminKeys, useAdminFlags, useAdminJobs, useAudit,
  useInviteUser, useCreateKey, useSetFlag
} from '../hooks/useAdmin';
import { DataTable } from '../components/admin/DataTable';

type Tab = 'overview'|'users'|'keys'|'flags'|'jobs'|'audit'|'settings';

export default function EnterpriseAdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Enterprise Admin Dashboard</h2>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {(['overview','users','keys','flags','jobs','audit','settings'] as Tab[]).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #e5e7eb', background: tab===t ? '#111827' : 'white', color: tab===t ? 'white' : 'black' }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {tab==='overview' && <OverviewTab/>}
      {tab==='users' && <UsersTab/>}
      {tab==='keys' && <KeysTab/>}
      {tab==='flags' && <FlagsTab/>}
      {tab==='jobs' && <JobsTab/>}
      {tab==='audit' && <AuditTab/>}
      {tab==='settings' && <SettingsTab/>}
    </div>
  );
}

function OverviewTab() {
  const { data } = useAdminOverview();
  const cards = data?.data?.cards ?? [];
  const health = data?.data?.health ?? { ok: false };
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:12 }}>
        {cards.map((c:any,i:number)=>(
          <div key={i} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
            <div style={{ color:'#6b7280', fontSize:12 }}>{c.label}</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
        <div style={{ fontWeight:700, marginBottom:6 }}>System Health</div>
        <div>Status: {health.ok ? 'Healthy' : 'Issues'}</div>
        <div>Version: {health.version}</div>
        <div>Time: {health.time}</div>
        {health.pos && (
          <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #e5e7eb' }}>
            <div style={{ fontWeight:600, fontSize:12, color:'#6b7280' }}>POS SYSTEM</div>
            <div>Store: {health.pos.store_id}</div>
            <div>Register: {health.pos.register_id}</div>
            <div>Hardware: {health.pos.hardware_status}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab() {
  const { data: users } = useAdminUsers();
  const { data: roles } = useAdminRoles();
  const invite = useInviteUser();
  const [form, setForm] = useState({ email:'', name:'', roles:['VIEWER'] as string[] });

  return (
    <div style={{ display:'grid', gap:12 }}>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Invite User</div>
        <div style={{ display:'flex', gap:8 }}>
          <input placeholder="email" value={form.email} onChange={e=>setForm(s=>({...s,email:e.target.value}))} style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}/>
          <input placeholder="name" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}/>
          <select value={form.roles[0]} onChange={e=>setForm(s=>({...s, roles:[e.target.value]}))} style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}>
            {roles?.data?.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={()=> invite.mutate(form)} style={{ padding:'8px 12px', borderRadius:8, background:'#111827', color:'white' }}>Invite</button>
        </div>
      </div>

      <div>
        <DataTable
          columns={[{key:'email',label:'Email'},{key:'name',label:'Name'},{key:'roles',label:'Roles'},{key:'suspended',label:'Suspended'},{key:'last_login',label:'Last Login'}]}
          rows={(users?.data||[]).map((u:any)=>({ ...u, roles: u.roles.join(', ') }))}
        />
      </div>
    </div>
  );
}

function KeysTab() {
  const { data: keys } = useAdminKeys();
  const create = useCreateKey();
  const [name, setName] = useState('Backend integration');
  const [scopes, setScopes] = useState('read');

  return (
    <div style={{ display:'grid', gap:12 }}>
      <div style={{ display:'flex', gap:8 }}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Key name" style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}/>
        <input value={scopes} onChange={e=>setScopes(e.target.value)} placeholder="scopes (csv)" style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}/>
        <button onClick={()=> create.mutate({ name, scopes: scopes.split(',').map(s=>s.trim()).filter(Boolean) })} style={{ padding:'8px 12px', borderRadius:8, background:'#111827', color:'white' }}>Create</button>
      </div>
      <DataTable
        columns={[{key:'name',label:'Name'},{key:'scopes',label:'Scopes'},{key:'token_prefix',label:'Token'},{key:'created_at',label:'Created'},{key:'revoked',label:'Revoked'}]}
        rows={(keys?.data||[]).map((k:any)=>({ ...k, scopes: k.scopes.join(' ') }))}
      />
    </div>
  );
}

function FlagsTab() {
  const { data: flags } = useAdminFlags();
  return (
    <div>
      <DataTable
        columns={[{key:'key',label:'Flag'},{key:'on',label:'On'},{key:'note',label:'Note'},{key:'targeting',label:'Targeting'}]}
        rows={(flags?.data||[]).map((f:any)=>({ ...f, targeting: JSON.stringify(f.targeting||{}) }))}
      />
      <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>Toggle flags via API call from your UI controls as needed.</div>
    </div>
  );
}

function JobsTab() {
  const { data: jobs } = useAdminJobs();
  return (
    <div>
      <DataTable
        columns={[{key:'id',label:'ID'},{key:'type',label:'Type'},{key:'status',label:'Status'},{key:'attempts',label:'Attempts'},{key:'updated_at',label:'Updated'}]}
        rows={jobs?.data||[]}
      />
    </div>
  );
}

function AuditTab() {
  const [q,setQ]=useState('');
  const { data } = useAudit({ q });
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search audit (actor/type/resource)" style={{ padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}/>
      </div>
      <DataTable
        columns={[{key:'at',label:'Time'},{key:'actor_email',label:'Actor'},{key:'type',label:'Event'},{key:'resource',label:'Resource'}]}
        rows={data?.data||[]}
      />
    </div>
  );
}

function SettingsTab() {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:12 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>Admin Settings</div>
      <div style={{ color:'#6b7280' }}>Wire environment variables like <code>ADMIN_REQUIRE_2FA</code> and <code>ADMIN_ALLOWED_EMAILS</code> into your real auth later.</div>
    </div>
  );
}