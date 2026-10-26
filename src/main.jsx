import React, { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import './index.css'

const SUPABASE_URL = 'https://uresunvtcxlqlqmdgkqk.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZXN1bnZ0Y3hscWxxbWRna3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzM2NTQsImV4cCI6MjA5OTUwOTY1NH0.tRazSefG8I3l49lJYwqTu_7cDgx07D16UoMHZsfgv0A'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'sportspulse' },
  auth: { storage: window.sessionStorage, autoRefreshToken: true }
})

const initials = (name = '') => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—'
const timeAgo = (d) => { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const h = Math.floor(diff / 3600000); if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago` }
const fmtKES = (n) => `KES ${(n || 0).toLocaleString()}`

const STATUS_COLORS = {
  pending: 'badge-amber', rejected: 'badge-red', active: 'badge-green', injured: 'badge-red', suspended: 'badge-amber', on_loan: 'badge-blue', inactive: 'badge-gray',
  upcoming: 'badge-gray', live: 'badge-green', completed: 'badge-blue', postponed: 'badge-amber', cancelled: 'badge-red',
  present: 'badge-green', absent: 'badge-red', late: 'badge-amber', excused: 'badge-blue',
  paid: 'badge-green', unpaid: 'badge-red', partial: 'badge-amber', waived: 'badge-gray',
}

function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px' }}>
      <div style={{ width: 28, height: 28, border: '3px solid rgba(26,75,219,0.2)', borderTopColor: '#1a4bdb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const DOC_TYPES = [
  { key: 'birth_certificate', label: 'Birth certificate' },
  { key: 'parent_id', label: 'Parent / Guardian ID' },
  { key: 'medical_clearance', label: 'Medical clearance' },
  { key: 'academic_record', label: 'Academic records' },
  { key: 'contract', label: 'Contract', staffOnly: true },
]
const DOC_LABELS = { birth_certificate: 'Birth certificate', parent_id: 'Parent ID', contract: 'Contract', medical_clearance: 'Medical clearance', academic_record: 'Academic records', photo_id: 'Photo ID', other: 'Other' }
const MAX_DOC = 5 * 1024 * 1024
const MAX_PHOTO = 3 * 1024 * 1024
const DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp']

// Returns an error string, or '' if the file is fine.
const checkFile = (file, kind) => {
  if (!file) return 'No file chosen'
  const okTypes = kind === 'photo' ? PHOTO_MIME : DOC_MIME
  const max = kind === 'photo' ? MAX_PHOTO : MAX_DOC
  if (!okTypes.includes(file.type)) return kind === 'photo' ? 'Photo must be a JPG, PNG or WebP image' : 'Document must be a PDF, JPG or PNG'
  if (file.size > max) return `File is too large (max ${max / 1024 / 1024} MB)`
  return ''
}
const fileExt = (file) => (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'

// Upload a private document and record it. Returns an error message or ''.
async function uploadPlayerDoc({ clubId, playerId, docType, file }) {
  const bad = checkFile(file, 'doc'); if (bad) return bad
  const path = `${playerId}/${Date.now()}-${docType}.${fileExt(file)}`
  const { error: upErr } = await supabase.storage.from('sportspulse-docs').upload(path, file, { contentType: file.type })
  if (upErr) return upErr.message
  const { error: dbErr } = await supabase.from('player_documents').insert({ player_id: playerId, club_id: clubId, doc_type: docType, file_url: path, file_name: file.name.slice(0, 120) })
  return dbErr ? dbErr.message : ''
}

// Upload a player photo to the public bucket. Returns { url, error }.
async function uploadPlayerPhoto({ playerId, file }) {
  const bad = checkFile(file, 'photo'); if (bad) return { error: bad }
  const path = `players/${playerId}/${Date.now()}.${fileExt(file)}`
  const { error } = await supabase.storage.from('sportspulse').upload(path, file, { contentType: file.type })
  if (error) return { error: error.message }
  return { url: supabase.storage.from('sportspulse').getPublicUrl(path).data.publicUrl }
}

// Documents are private: open them through a short-lived signed link.
async function openDocument(doc) {
  if (/^https?:/.test(doc.file_url)) { window.open(doc.file_url, '_blank', 'noopener'); return }
  const { data, error } = await supabase.storage.from('sportspulse-docs').createSignedUrl(doc.file_url, 120)
  if (error || !data?.signedUrl) { alert('Could not open this document: ' + (error?.message || 'unknown error')); return }
  window.open(data.signedUrl, '_blank', 'noopener')
}

function Note({ kind = 'info', children, style }) {
  const c = { info: ['rgba(26,75,219,0.12)', 'rgba(26,75,219,0.4)'], warn: ['rgba(245,158,11,0.12)', 'rgba(245,158,11,0.45)'], error: ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.45)'], ok: ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.4)'] }[kind]
  return <div style={{ background: c[0], border: `0.5px solid ${c[1]}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5, ...style }}>{children}</div>
}

const CLUB_SLUG = 'btb'

function Login() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isSignup = mode === 'signup'

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (isSignup) {
      if (form.full_name.trim().length < 2) { setError('Please enter your full name'); return }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
      if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    }
    setLoading(true)
    if (isSignup) {
      const { data, error: err } = await supabase.auth.signUp({
        email: form.email.trim(), password: form.password,
        options: { data: { full_name: form.full_name.trim(), phone: form.phone.trim() } }
      })
      if (err) { setError(err.message); setLoading(false); return }
      // If email confirmation is switched on there is no session yet.
      if (!data.session) setNotice('Account created. Check your email to confirm your address, then sign in.')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (err) { setError(err.message); setLoading(false); return }
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-crest">BTB</div>
        <div className="login-title">Beyond the Ball</div>
        <div className="login-sub">{isSignup ? 'Parent & guardian registration' : 'Sports Academy Platform'}</div>
        {error && <div className="login-error">{error}</div>}
        {notice && <Note kind="ok" style={{ marginBottom: 12 }}>{notice}</Note>}
        <form onSubmit={submit}>
          {isSignup && (
            <>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Your full name</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Parent / guardian name" required maxLength={100} />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Phone (WhatsApp)</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07XX XXX XXX" maxLength={20} />
              </div>
            </>
          )}
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" required />
          </div>
          <div className="form-group" style={{ marginBottom: isSignup ? 12 : 20 }}>
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required autoComplete={isSignup ? 'new-password' : 'current-password'} />
          </div>
          {isSignup && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create parent account' : 'Sign in'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          {isSignup ? 'Already registered? ' : 'New parent or guardian? '}
          <button type="button" onClick={() => { setMode(isSignup ? 'signin' : 'signup'); setError(''); setNotice('') }} style={{ background: 'none', border: 'none', color: 'var(--btb-gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
            {isSignup ? 'Sign in' : 'Register here'}
          </button>
        </div>
        {isSignup && <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>After signing up you can register your child. The academy reviews every registration before a child joins the squad.</div>}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children, size = '' }) {
  useEffect(() => {
    const close = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-hdr">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ManagerDashboard({ club, profile, setPage }) {
  const [stats, setStats] = useState({ players: 0, members: 0, fees: 0, pending: 0 })
  const [liveFixture, setLiveFixture] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ count: players }, { count: members }, { data: live }, { data: next }, { data: feeData }, { count: pending }] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('club_id', club.id).eq('is_active', true),
        supabase.from('fan_members').select('*', { count: 'exact', head: true }).eq('club_id', club.id).eq('is_active', true),
        supabase.from('fixtures').select('*').eq('club_id', club.id).eq('status', 'live').limit(1),
        supabase.from('fixtures').select('*').eq('club_id', club.id).eq('status', 'upcoming').order('match_date', { ascending: true }).limit(3),
        supabase.from('fees').select('amount,paid_amount').eq('club_id', club.id).eq('status', 'unpaid'),
        supabase.from('players').select('*', { count: 'exact', head: true }).eq('club_id', club.id).eq('status', 'pending')
      ])
      const pendingFees = (feeData || []).reduce((s, f) => s + (f.amount - (f.paid_amount || 0)), 0)
      setStats({ players: players || 0, members: members || 0, fees: pendingFees, pending: pending || 0 })
      setLiveFixture(live?.[0] || null)
      setUpcoming(next || [])
      setLoading(false)
    }
    load()
  }, [club.id])

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr">
        <div>
          <div className="page-title">Good day, {profile.full_name.split(' ')[0]}</div>
          <div className="page-sub">{club.name} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      {stats.pending > 0 && (
        <Note kind="warn" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span><strong>{stats.pending}</strong> player registration{stats.pending === 1 ? '' : 's'} waiting for approval</span>
          <button className="btn btn-primary btn-sm" onClick={() => setPage('approvals')}>Review</button>
        </Note>
      )}
      {liveFixture && (
        <div className="alert alert-green" style={{ marginBottom: 16 }}>
          <div className="live-pulse"></div>
          <strong>Match in progress</strong> — {club.short_name} vs {liveFixture.opponent} · {liveFixture.minute}'
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Squad players</div><div className="stat-value">{stats.players}</div><div className="stat-change neutral">Active</div></div>
        <div className="stat-card"><div className="stat-label">Fan members</div><div className="stat-value">{stats.members}</div><div className="stat-change neutral">Registered</div></div>
        <div className="stat-card"><div className="stat-label">Upcoming</div><div className="stat-value">{upcoming.length}</div><div className="stat-change neutral">Scheduled</div></div>
        <div className="stat-card"><div className="stat-label">Pending fees</div><div className="stat-value" style={{ fontSize: 18 }}>{fmtKES(stats.fees)}</div><div className="stat-change down">Uncollected</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Upcoming fixtures</div></div>
          {upcoming.length === 0
            ? <div className="empty" style={{ padding: 24 }}><div className="empty-sub">No upcoming fixtures</div></div>
            : upcoming.map(f => (
              <div key={f.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{f.opponent}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(f.match_date)} · {fmtTime(f.match_date)}</div></div>
                <span className={`badge ${f.is_home ? 'badge-blue' : 'badge-gray'}`}>{f.is_home ? 'Home' : 'Away'}</span>
              </div>
            ))}
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Quick actions</div></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Approvals', page: 'approvals' },
              { label: 'Register player', page: 'squad' },
              { label: 'Add fixture', page: 'fixtures' },
              { label: 'Manage fees', page: 'fees' },
              { label: 'View analytics', page: 'analytics' }
            ].map(a => (
              <button key={a.label} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => setPage(a.page)}>{a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SquadPage({ club, userRole }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').eq('club_id', club.id).not('status', 'in', '(pending,rejected)').order('squad_number', { ascending: true })
    setPlayers(data || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  const filtered = players.filter(p => {
    const matchPos = filter === 'All' || p.position === filter
    const matchSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase())
    return matchPos && matchSearch
  })

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Squad</div><div className="page-sub">{players.filter(p => p.is_active).length} active players</div></div>
        {(userRole === 'manager' || userRole === 'coach') && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Register player</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="filter-pills">
        {['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map(p => (
          <button key={p} className={`pill ${filter === p ? 'active' : ''}`} onClick={() => setFilter(p)}>
            {p === 'Goalkeeper' ? 'GK' : p === 'Defender' ? 'DEF' : p === 'Midfielder' ? 'MID' : p === 'Forward' ? 'FWD' : p}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="empty"><div className="empty-title">No players found</div><div className="empty-sub">{userRole === 'manager' ? 'Register your first player to get started' : 'No players match your search'}</div></div>
        : (
          <div className="player-grid">
            {filtered.map(p => (
              <div key={p.id} className="player-card" onClick={() => setSelected(p)}>
                <div className="player-card-img">
                  {p.photo_url ? <img src={p.photo_url} alt={p.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }}>👤</div>}
                  <div className="player-card-num">{p.squad_number}</div>
                  <div className="player-card-status" style={{ background: p.status === 'active' ? 'var(--green)' : p.status === 'injured' ? 'var(--red)' : 'var(--amber)' }}></div>
                </div>
                <div className="player-card-body">
                  <div className="player-card-name">{p.full_name}</div>
                  <div className="player-card-pos">{p.position_detail || p.position || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      {showAdd && <PlayerRegistrationModal mode="staff" club={club} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {selected && <PlayerDetailModal player={selected} club={club} userRole={userRole} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); load() }} />}
    </div>
  )
}

// mode = 'staff' (manager/coach registers a player straight into the squad)
//      = 'parent' (a parent registers their child; it waits for approval)
function PlayerRegistrationModal({ club, profile, mode = 'staff', onClose, onSaved }) {
  const isParent = mode === 'parent'
  const [tab, setTab] = useState('personal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [relationship, setRelationship] = useState('mother')
  const [form, setForm] = useState({ full_name: '', date_of_birth: '', nationality: 'Kenyan', id_number: '', squad_number: '', position: '', position_detail: '', dominant_foot: 'Right', height_cm: '', weight_kg: '', school_name: '', school_grade: '', home_address: '', contract_start: '', contract_end: '' })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [files, setFiles] = useState({})
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const docTypes = DOC_TYPES.filter(d => !(isParent && d.staffOnly))

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  const pickPhoto = (e) => {
    const f = e.target.files[0]; if (!f) return
    const bad = checkFile(f, 'photo'); if (bad) { setError(bad); return }
    setError(''); setPhoto(f); setPhotoPreview(URL.createObjectURL(f))
  }
  const pickDoc = (e, key) => {
    const f = e.target.files[0]; if (!f) return
    const bad = checkFile(f, 'doc'); if (bad) { setError(`${DOC_LABELS[key]}: ${bad}`); return }
    setError(''); setFiles(prev => ({ ...prev, [key]: f }))
  }

  const save = async () => {
    if (form.full_name.trim().length < 2) { setError('Full name is required'); setTab('personal'); return }
    if (isParent && !form.date_of_birth) { setError('Date of birth is required'); setTab('personal'); return }
    setSaving(true); setError(''); setWarning('')

    // 1. create the player record
    let playerId
    if (isParent) {
      const { data, error: err } = await supabase.rpc('register_child', { p: form, p_relationship: relationship })
      if (err) { setError(err.message); setSaving(false); return }
      playerId = data
    } else {
      playerId = crypto.randomUUID()
      const { error: err } = await supabase.from('players').insert({
        id: playerId, club_id: club.id, full_name: form.full_name.trim(), date_of_birth: form.date_of_birth || null,
        nationality: form.nationality || null, id_number: form.id_number || null,
        squad_number: form.squad_number ? parseInt(form.squad_number) : null, position: form.position || null,
        position_detail: form.position_detail || null, dominant_foot: form.dominant_foot || null,
        height_cm: form.height_cm ? parseInt(form.height_cm) : null, weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
        school_name: form.school_name || null, school_grade: form.school_grade || null, home_address: form.home_address || null,
        contract_start: form.contract_start || null, contract_end: form.contract_end || null, status: 'active', is_active: true,
      })
      if (err) { setError(err.message); setSaving(false); return }
    }

    // 2. upload photo and documents (the record already exists, so failures here are not fatal)
    const problems = []
    if (photo) {
      const { url, error: pe } = await uploadPlayerPhoto({ playerId, file: photo })
      if (pe) problems.push('photo: ' + pe)
      else await supabase.from('players').update({ photo_url: url }).eq('id', playerId)
    }
    for (const d of docTypes) {
      if (!files[d.key]) continue
      const msg = await uploadPlayerDoc({ clubId: club.id, playerId, docType: d.key, file: files[d.key] })
      if (msg) problems.push(`${d.label}: ${msg}`)
    }
    setSaving(false)
    if (problems.length) {
      setWarning(`${form.full_name} was registered, but some files did not upload (${problems.join('; ')}). You can add them again from the child's profile.`)
      return
    }
    onSaved()
  }

  if (warning) return (
    <Modal title="Saved with a warning" onClose={onSaved}>
      <div className="modal-body"><Note kind="warn">{warning}</Note></div>
      <div className="modal-footer"><button className="btn btn-primary" onClick={onSaved}>OK</button></div>
    </Modal>
  )

  const tabs = [{ k: 'personal', l: 'Personal' }, { k: 'playing', l: 'Playing' }, { k: 'academy', l: 'School' }, { k: 'documents', l: 'Documents' }]

  return (
    <Modal title={isParent ? 'Register your child' : 'Register new player'} onClose={onClose} size="modal-lg">
      <div className="modal-body">
        {isParent && <Note kind="info" style={{ marginBottom: 12 }}>The academy will review this registration before your child joins the squad. You can follow its status on your dashboard.</Note>}
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="tabs no-scroll" style={{ marginBottom: 20 }}>
          {tabs.map(t => <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>)}
        </div>
        {tab === 'personal' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-card2)', border: '0.5px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {photoPreview ? <img src={photoPreview} alt="Player" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, color: 'var(--text-dim)' }}>👤</span>}
              </div>
              <div>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {photo ? 'Change photo' : 'Add photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={pickPhoto} />
                </label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG or WebP, up to 3 MB</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>{isParent ? "Child's full name *" : 'Full name *'}</label><input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. John Kamau Mwangi" maxLength={100} /></div>
              <div className="form-group"><label>Date of birth{isParent ? ' *' : ''}</label><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
              <div className="form-group"><label>Nationality</label><input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. Kenyan" /></div>
              <div className="form-group"><label>Birth cert / ID number</label><input value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="Birth certificate or ID number" /></div>
              {isParent && (
                <div className="form-group"><label>Your relationship</label>
                  <select value={relationship} onChange={e => setRelationship(e.target.value)}>
                    {['mother', 'father', 'guardian', 'other'].map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === 'playing' && (
          <div className="form-grid">
            {!isParent && <div className="form-group"><label>Squad number</label><input type="number" min="0" max="99" value={form.squad_number} onChange={e => set('squad_number', e.target.value)} placeholder="e.g. 10" /></div>}
            <div className="form-group"><label>Position</label><select value={form.position} onChange={e => set('position', e.target.value)}><option value="">Select</option>{['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="form-group"><label>Position detail</label><input value={form.position_detail} onChange={e => set('position_detail', e.target.value)} placeholder="e.g. Centre Back, Right Wing" /></div>
            <div className="form-group"><label>Dominant foot</label><select value={form.dominant_foot} onChange={e => set('dominant_foot', e.target.value)}>{['Right', 'Left', 'Both'].map(f => <option key={f}>{f}</option>)}</select></div>
            <div className="form-group"><label>Height (cm)</label><input type="number" value={form.height_cm} onChange={e => set('height_cm', e.target.value)} placeholder="150" /></div>
            <div className="form-group"><label>Weight (kg)</label><input type="number" value={form.weight_kg} onChange={e => set('weight_kg', e.target.value)} placeholder="40" /></div>
            {!isParent && <div className="form-group"><label>Contract start</label><input type="date" value={form.contract_start} onChange={e => set('contract_start', e.target.value)} /></div>}
            {!isParent && <div className="form-group"><label>Contract end</label><input type="date" value={form.contract_end} onChange={e => set('contract_end', e.target.value)} /></div>}
          </div>
        )}
        {tab === 'academy' && (
          <div className="form-grid">
            <div className="form-group"><label>School name</label><input value={form.school_name} onChange={e => set('school_name', e.target.value)} placeholder="e.g. Nyeri Primary School" /></div>
            <div className="form-group"><label>Grade / class</label><input value={form.school_grade} onChange={e => set('school_grade', e.target.value)} placeholder="e.g. Grade 7" /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Home address</label><textarea value={form.home_address} onChange={e => set('home_address', e.target.value)} placeholder="Estate / village, town" /></div>
          </div>
        )}
        {tab === 'documents' && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>PDF, JPG or PNG, up to 5 MB each. Documents are stored privately and only the academy and you can open them.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {docTypes.map(({ key, label }) => {
                const f = files[key]
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                      {f && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {f.name}</div>}
                    </div>
                    <label className={`btn btn-sm ${f ? 'btn-ghost' : 'btn-primary'}`} style={{ cursor: 'pointer' }}>
                      {f ? 'Replace' : 'Choose file'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={e => pickDoc(e, key)} />
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : isParent ? 'Submit for approval' : 'Register player'}</button>
      </div>
    </Modal>
  )
}

function PlayerDetailModal({ player, club, userRole, onClose, onUpdated }) {
  const [tab, setTab] = useState('profile')
  const [docs, setDocs] = useState([])
  const [goals, setGoals] = useState({ goals: 0, assists: 0, matches: 0, rating: null })
  const [newType, setNewType] = useState('birth_certificate')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState(null)
  const isParent = userRole === 'parent'
  const isStaff = userRole === 'manager' || userRole === 'coach'

  const loadDocs = useCallback(async () => {
    const { data } = await supabase.from('player_documents').select('*').eq('player_id', player.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }, [player.id])

  useEffect(() => {
    const load = async () => {
      const [, { data: s }] = await Promise.all([
        loadDocs(),
        supabase.from('player_match_stats').select('*').eq('player_id', player.id)
      ])
      const ms = s || []
      setGoals({
        goals: ms.reduce((a, b) => a + (b.goals || 0), 0),
        assists: ms.reduce((a, b) => a + (b.assists || 0), 0),
        matches: ms.filter(m => m.started).length,
        rating: ms.filter(m => m.rating).length > 0 ? (ms.reduce((a, b) => a + (parseFloat(b.rating) || 0), 0) / ms.filter(m => m.rating).length).toFixed(1) : null
      })
    }
    load()
  }, [player.id, loadDocs])

  const addDoc = async (e) => {
    const file = e.target.files[0]; e.target.value = ''
    if (!file) return
    setUploading(true); setMsg(null)
    const err = await uploadPlayerDoc({ clubId: player.club_id || club.id, playerId: player.id, docType: newType, file })
    setUploading(false)
    if (err) setMsg({ kind: 'error', text: 'Upload failed: ' + err })
    else { setMsg({ kind: 'ok', text: 'Document uploaded' }); loadDocs() }
  }

  const resubmit = async () => {
    const { error } = await supabase.from('players').update({ status: 'pending' }).eq('id', player.id)
    if (error) { setMsg({ kind: 'error', text: error.message }); return }
    onUpdated && onUpdated()
  }

  return (
    <Modal title={player.full_name} onClose={onClose} size="modal-lg">
      <div className="modal-body">
        {player.status === 'pending' && <Note kind="info" style={{ marginBottom: 14 }}>Awaiting approval by the academy.</Note>}
        {player.status === 'rejected' && (
          <Note kind="error" style={{ marginBottom: 14 }}>
            <strong>Registration not approved.</strong>{player.rejection_note ? ` Reason: ${player.rejection_note}` : ''}
            {isParent && <div style={{ marginTop: 8 }}>Upload any missing documents on the Documents tab, then <button className="btn btn-primary btn-sm" onClick={resubmit}>Resubmit for review</button></div>}
          </Note>
        )}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-card2)', border: '0.5px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {player.photo_url ? <img src={player.photo_url} alt={player.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 26 }}>👤</span>}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{player.full_name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {player.squad_number && <span className="badge badge-blue">#{player.squad_number}</span>}
              {player.position && <span className="badge badge-gray">{player.position_detail || player.position}</span>}
              <span className={`badge ${STATUS_COLORS[player.status] || 'badge-gray'}`}>{player.status}</span>
            </div>
          </div>
        </div>
        {player.status !== 'pending' && player.status !== 'rejected' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
            {[{ l: 'Goals', v: goals.goals }, { l: 'Assists', v: goals.assists }, { l: 'Matches', v: goals.matches }, { l: 'Rating', v: goals.rating || '—' }].map(s => (
              <div key={s.l} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: 10, textAlign: 'center', border: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--btb-gold)' }}>{s.v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
        <div className="tabs no-scroll">
          {[{ k: 'profile', l: 'Profile' }, { k: 'academy', l: 'School' }, { k: 'documents', l: `Documents (${docs.length})` }].map(t => (
            <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[{ l: 'Date of birth', v: player.date_of_birth ? new Date(player.date_of_birth).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : null }, { l: 'Nationality', v: player.nationality }, { l: 'ID number', v: player.id_number }, { l: 'Dominant foot', v: player.dominant_foot }, { l: 'Height', v: player.height_cm ? `${player.height_cm} cm` : null }, { l: 'Weight', v: player.weight_kg ? `${player.weight_kg} kg` : null }, ...(isStaff ? [{ l: 'Contract start', v: player.contract_start ? fmtDate(player.contract_start) : null }, { l: 'Contract end', v: player.contract_end ? fmtDate(player.contract_end) : null }] : [])].map(({ l, v }) => (
              <div key={l}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, color: v ? 'var(--text)' : 'var(--text-dim)' }}>{v || '—'}</div></div>
            ))}
          </div>
        )}
        {tab === 'academy' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[{ l: 'School', v: player.school_name }, { l: 'Grade / class', v: player.school_grade }, { l: 'Home address', v: player.home_address, full: true }].map(({ l, v, full }) => (
              <div key={l} style={{ gridColumn: full ? '1 / -1' : 'auto' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, color: v ? 'var(--text)' : 'var(--text-dim)' }}>{v || '—'}</div></div>
            ))}
          </div>
        )}
        {tab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msg && <Note kind={msg.kind}>{msg.text}</Note>}
            {docs.length === 0
              ? <div className="empty" style={{ padding: 24 }}><div className="empty-sub">No documents uploaded</div></div>
              : docs.map(doc => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>{doc.file_name && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => openDocument(doc)}>View</button>
                </div>
              ))}
            {(isParent || isStaff) && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <select value={newType} onChange={e => setNewType(e.target.value)} style={{ flex: 1, minWidth: 140 }}>
                  {DOC_TYPES.filter(d => !(isParent && d.staffOnly)).map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                  {uploading ? 'Uploading...' : '+ Add document'}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={addDoc} disabled={uploading} />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function FixturesPage({ club, userRole }) {
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('fixtures').select('*').eq('club_id', club.id).order('match_date', { ascending: false })
    setFixtures(data || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const ch = supabase.channel('fixtures-rt').on('postgres_changes', { event: 'UPDATE', schema: 'sportspulse', table: 'fixtures', filter: `club_id=eq.${club.id}` }, payload => {
      setFixtures(prev => prev.map(f => f.id === payload.new.id ? payload.new : f))
    }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [club.id])

  const filtered = fixtures.filter(f => filter === 'all' || (filter === 'upcoming' && f.status === 'upcoming') || (filter === 'live' && f.status === 'live') || (filter === 'results' && f.status === 'completed'))

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Fixtures & Results</div><div className="page-sub">2024/25 season</div></div>
        {(userRole === 'manager' || userRole === 'coach') && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add fixture</button>
        )}
      </div>
      <div className="filter-pills">
        {[{ k: 'all', l: 'All' }, { k: 'live', l: 'Live' }, { k: 'upcoming', l: 'Upcoming' }, { k: 'results', l: 'Results' }].map(({ k, l }) => (
          <button key={k} className={`pill ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="empty"><div className="empty-title">No fixtures</div><div className="empty-sub">{userRole === 'manager' ? 'Add your first fixture to get started' : 'No fixtures scheduled'}</div></div>
        : (
          <div>
            {filtered.map(f => {
              const isLive = f.status === 'live', isResult = f.status === 'completed'
              const homeTeam = f.is_home ? club.short_name : f.opponent
              const awayTeam = f.is_home ? f.opponent : club.short_name
              return (
                <div key={f.id} className={`fixture-item ${isLive ? 'live' : ''}`}>
                  <div className="fixture-date">
                    {isLive && <div className="live-pulse"></div>}
                    {isLive ? `Live · ${f.minute || 0}'` : `${fmtDate(f.match_date)} · ${isResult ? 'FT' : fmtTime(f.match_date)}`}
                    {f.competition && <span className={`badge ${STATUS_COLORS[f.status] || 'badge-gray'}`} style={{ marginLeft: 8 }}>{f.competition}</span>}
                  </div>
                  <div className="fixture-teams">
                    <div className="fixture-team">{homeTeam}</div>
                    <div className={`fixture-score ${isLive ? 'live' : ''}`}>
                      <div className="score-num">{isResult || isLive ? `${f.home_score ?? 0}–${f.away_score ?? 0}` : 'VS'}</div>
                      <div className={`score-label ${isLive ? 'live' : ''}`}>{isLive ? 'Live' : isResult ? 'FT' : f.is_home ? 'Home' : 'Away'}</div>
                    </div>
                    <div className="fixture-team away">{awayTeam}</div>
                  </div>
                  {f.venue && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>📍 {f.venue}</div>}
                </div>
              )
            })}
          </div>
        )}
      {showAdd && <AddFixtureModal club={club} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddFixtureModal({ club, onClose, onSaved }) {
  const [form, setForm] = useState({ opponent: '', competition: 'KPL', match_date: '', match_time: '15:00', venue: '', is_home: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!form.opponent || !form.match_date) { setError('Opponent and date are required'); return }
    setSaving(true)
    const match_date = new Date(`${form.match_date}T${form.match_time}:00`).toISOString()
    const { error: err } = await supabase.from('fixtures').insert({ club_id: club.id, opponent: form.opponent, competition: form.competition, match_date, venue: form.venue || null, is_home: form.is_home, status: 'upcoming' })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <Modal title="Add fixture" onClose={onClose}>
      <div className="modal-body">
        {error && <div className="alert alert-red">{error}</div>}
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Opponent *</label><input value={form.opponent} onChange={e => set('opponent', e.target.value)} placeholder="e.g. Nyeri United FC" /></div>
          <div className="form-group"><label>Competition</label><select value={form.competition} onChange={e => set('competition', e.target.value)}>{['KPL', 'FKF Cup', 'Super Cup', 'Friendly', 'Regional League', 'Academy League', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="form-group"><label>Home / Away</label><select value={String(form.is_home)} onChange={e => set('is_home', e.target.value === 'true')}><option value="true">Home</option><option value="false">Away</option></select></div>
          <div className="form-group"><label>Date *</label><input type="date" value={form.match_date} onChange={e => set('match_date', e.target.value)} /></div>
          <div className="form-group"><label>Kick-off time</label><input type="time" value={form.match_time} onChange={e => set('match_time', e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Venue</label><input value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. PCEA Primary Pitch, Nyeri" /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save fixture'}</button>
      </div>
    </Modal>
  )
}

function MatchCentrePage({ club }) {
  const [fixtures, setFixtures] = useState([])
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [logForm, setLogForm] = useState({ event_type: 'goal', minute: '', player_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from('fixtures').select('*').eq('club_id', club.id).in('status', ['live', 'upcoming']).order('match_date', { ascending: true }).limit(5),
        supabase.from('players').select('id,full_name,squad_number,position').eq('club_id', club.id).eq('is_active', true).order('squad_number', { ascending: true })
      ])
      setFixtures(f || [])
      setPlayers(p || [])
      const live = (f || []).find(x => x.status === 'live') || (f || [])[0]
      if (live) {
        setSelected(live)
        const { data: evts } = await supabase.from('match_events').select('*, player:players(full_name,squad_number)').eq('fixture_id', live.id).order('minute', { ascending: false })
        setEvents(evts || [])
      }
      setLoading(false)
    }
    load()
  }, [club.id])

  useEffect(() => {
    if (!selected) return
    const ch = supabase.channel('match-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'sportspulse', table: 'match_events', filter: `fixture_id=eq.${selected.id}` }, async payload => {
        const { data } = await supabase.from('match_events').select('*, player:players(full_name,squad_number)').eq('id', payload.new.id).single()
        setEvents(prev => [data, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'sportspulse', table: 'fixtures', filter: `id=eq.${selected.id}` }, payload => {
        setSelected(payload.new)
        setFixtures(prev => prev.map(f => f.id === payload.new.id ? payload.new : f))
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [selected?.id])

  const startMatch = async () => { if (!selected) return; await supabase.from('fixtures').update({ status: 'live', minute: 1, home_score: 0, away_score: 0 }).eq('id', selected.id) }
  const endMatch = async () => { if (!selected) return; await supabase.from('fixtures').update({ status: 'completed' }).eq('id', selected.id) }

  const logEvent = async () => {
    if (!selected || !logForm.minute) return
    setSaving(true)
    await supabase.from('match_events').insert({ fixture_id: selected.id, club_id: club.id, event_type: logForm.event_type, minute: parseInt(logForm.minute), player_id: logForm.player_id || null })
    if (logForm.event_type === 'goal' && selected.is_home) await supabase.from('fixtures').update({ home_score: (selected.home_score || 0) + 1, minute: parseInt(logForm.minute) }).eq('id', selected.id)
    if (logForm.event_type === 'goal' && !selected.is_home) await supabase.from('fixtures').update({ away_score: (selected.away_score || 0) + 1, minute: parseInt(logForm.minute) }).eq('id', selected.id)
    setLogForm(prev => ({ ...prev, minute: '', player_id: '' }))
    setSaving(false)
  }

  const eventIcon = { goal: '⚽', yellow_card: '🟨', red_card: '🟥', substitution: '🔄', penalty: '⚽', own_goal: '⚽' }

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Match centre</div><div className="page-sub">{selected ? `${club.short_name} vs ${selected.opponent}` : 'No active match'}</div></div>
        <div className="page-actions">
          {selected?.status === 'upcoming' && <button className="btn btn-primary" onClick={startMatch}>▶ Start match</button>}
          {selected?.status === 'live' && <button className="btn btn-danger" onClick={endMatch}>■ End match</button>}
        </div>
      </div>
      {fixtures.length > 1 && (
        <div className="filter-pills" style={{ marginBottom: 20 }}>
          {fixtures.map(f => (
            <button key={f.id} className={`pill ${selected?.id === f.id ? 'active' : ''}`} onClick={async () => { setSelected(f); const { data } = await supabase.from('match_events').select('*, player:players(full_name,squad_number)').eq('fixture_id', f.id).order('minute', { ascending: false }); setEvents(data || []) }}>
              {f.opponent} · {fmtDate(f.match_date)}
            </button>
          ))}
        </div>
      )}
      {!selected
        ? <div className="empty"><div className="empty-title">No upcoming or live matches</div><div className="empty-sub">Add a fixture first to use the match centre</div></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
            <div>
              <div className="match-hero">
                <div className="match-hero-label">
                  {selected.status === 'live' && <div className="live-pulse"></div>}
                  {selected.competition} · {fmtDate(selected.match_date)} · {selected.venue || 'Venue TBC'}
                </div>
                <div className="match-hero-teams">
                  <div className="match-hero-team"><div className="match-hero-team-name">{selected.is_home ? club.name : selected.opponent}</div><div className="match-hero-team-sub">Home</div></div>
                  <div><div className="match-hero-score">{selected.home_score ?? 0} – {selected.away_score ?? 0}</div><div className="match-hero-minute">{selected.status === 'live' ? `${selected.minute}'` : selected.status.toUpperCase()}</div></div>
                  <div className="match-hero-team"><div className="match-hero-team-name">{selected.is_home ? selected.opponent : club.name}</div><div className="match-hero-team-sub">Away</div></div>
                </div>
                {selected.status === 'live' && (
                  <div className="match-hero-actions">
                    {[{ type: 'goal', label: '⚽ Goal' }, { type: 'yellow_card', label: '🟨 Yellow' }, { type: 'red_card', label: '🟥 Red' }, { type: 'substitution', label: '🔄 Sub' }].map(a => (
                      <button key={a.type} className="match-action-btn" onClick={() => setLogForm(prev => ({ ...prev, event_type: a.type }))}>{a.label}</button>
                    ))}
                  </div>
                )}
              </div>
              {selected.status === 'live' && (
                <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                    <div className="form-group"><label>Event</label><select value={logForm.event_type} onChange={e => setLogForm(p => ({ ...p, event_type: e.target.value }))}><option value="goal">Goal</option><option value="yellow_card">Yellow card</option><option value="red_card">Red card</option><option value="substitution">Substitution</option><option value="penalty">Penalty</option></select></div>
                    <div className="form-group"><label>Minute *</label><input type="number" min="1" max="120" placeholder="e.g. 23" value={logForm.minute} onChange={e => setLogForm(p => ({ ...p, minute: e.target.value }))} /></div>
                    <div className="form-group"><label>Player</label><select value={logForm.player_id} onChange={e => setLogForm(p => ({ ...p, player_id: e.target.value }))}><option value="">Select player</option>{players.map(p => <option key={p.id} value={p.id}>{p.squad_number} – {p.full_name}</option>)}</select></div>
                    <button className="btn btn-primary" onClick={logEvent} disabled={saving || !logForm.minute}>+ Log</button>
                  </div>
                </div>
              )}
              <div className="card">
                <div className="card-hdr"><div className="card-title">Match events</div></div>
                {events.length === 0
                  ? <div className="empty" style={{ padding: 24 }}><div className="empty-sub">No events logged yet</div></div>
                  : events.map(evt => (
                    <div key={evt.id} className="activity-item" style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 14 }}>{eventIcon[evt.event_type] || '📋'}</span>
                      <div className="activity-text"><strong>{evt.minute}'</strong> {evt.event_type.replace('_', ' ')}{evt.player && <> — <strong>{evt.player.full_name}</strong></>}</div>
                    </div>
                  ))}
              </div>
            </div>
            <div className="card" style={{ height: 'fit-content' }}>
              <div className="card-hdr"><div className="card-title">Squad</div></div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{ width: 20, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{p.squad_number}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{p.full_name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.position?.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

function TrainingPage({ club, userRole }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('training_sessions').select('*').eq('club_id', club.id).order('session_date', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Training</div><div className="page-sub">Session schedule and attendance</div></div>
        {(userRole === 'manager' || userRole === 'coach') && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add session</button>}
      </div>
      {sessions.length === 0
        ? <div className="empty"><div className="empty-title">No training sessions</div><div className="empty-sub">Schedule your first training session</div></div>
        : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Session</th><th>Type</th><th>Duration</th><th>Venue</th></tr></thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td>{fmtDateTime(s.session_date)}</td>
                      <td><strong>{s.title}</strong>{s.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.notes}</div>}</td>
                      <td><span className="badge badge-blue">{s.session_type}</span></td>
                      <td>{s.duration_mins} min</td>
                      <td>{s.venue || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      {showAdd && <AddTrainingModal club={club} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddTrainingModal({ club, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', session_type: 'general', session_date: '', session_time: '09:00', duration_mins: 90, venue: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!form.title || !form.session_date) return
    setSaving(true)
    const session_date = new Date(`${form.session_date}T${form.session_time}:00`).toISOString()
    await supabase.from('training_sessions').insert({ club_id: club.id, title: form.title, session_type: form.session_type, session_date, duration_mins: form.duration_mins, venue: form.venue || null, notes: form.notes || null })
    setSaving(false); onSaved()
  }

  return (
    <Modal title="Add training session" onClose={onClose}>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Session title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Pre-match tactical session" /></div>
          <div className="form-group"><label>Type</label><select value={form.session_type} onChange={e => set('session_type', e.target.value)}>{['general', 'tactical', 'physical', 'technical', 'recovery', 'match_prep'].map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label>Duration (min)</label><input type="number" value={form.duration_mins} onChange={e => set('duration_mins', parseInt(e.target.value))} /></div>
          <div className="form-group"><label>Date *</label><input type="date" value={form.session_date} onChange={e => set('session_date', e.target.value)} /></div>
          <div className="form-group"><label>Time</label><input type="time" value={form.session_time} onChange={e => set('session_time', e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Venue</label><input value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. PCEA Primary Pitch" /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Session objectives..." /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save session'}</button>
      </div>
    </Modal>
  )
}

function FeesPage({ club }) {
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [players, setPlayers] = useState([])

  const load = useCallback(async () => {
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from('fees').select('*, player:players(full_name,squad_number)').eq('club_id', club.id).order('created_at', { ascending: false }),
      supabase.from('players').select('id,full_name,squad_number').eq('club_id', club.id).eq('is_active', true)
    ])
    setFees(f || [])
    setPlayers(p || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  const totalPending = fees.filter(f => f.status !== 'paid' && f.status !== 'waived').reduce((s, f) => s + (f.amount - (f.paid_amount || 0)), 0)
  const totalCollected = fees.reduce((s, f) => s + (f.paid_amount || 0), 0)

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Fee management</div><div className="page-sub">Academy program fees</div></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add fee</button>
      </div>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value" style={{ fontSize: 18 }}>{fmtKES(totalPending)}</div><div className="stat-change down">Outstanding</div></div>
        <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value" style={{ fontSize: 18 }}>{fmtKES(totalCollected)}</div><div className="stat-change up">Received</div></div>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Player</th><th>Description</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {fees.length === 0
                ? <tr><td colSpan={6}><div className="empty"><div className="empty-sub">No fees recorded yet</div></div></td></tr>
                : fees.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar avatar-sm">{initials(f.player?.full_name)}</div>
                        <div><div style={{ fontWeight: 600, fontSize: 13 }}>{f.player?.full_name || '—'}</div>{f.term && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.term}</div>}</div>
                      </div>
                    </td>
                    <td>{f.description}</td>
                    <td>{fmtKES(f.amount)}</td>
                    <td>{fmtKES(f.paid_amount)}</td>
                    <td>{fmtDate(f.due_date)}</td>
                    <td><span className={`badge ${STATUS_COLORS[f.status] || 'badge-gray'}`}>{f.status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && <AddFeeModal club={club} players={players} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddFeeModal({ club, players, onClose, onSaved }) {
  const [form, setForm] = useState({ player_id: '', description: '', amount: '', due_date: '', term: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!form.player_id || !form.description || !form.amount) return
    setSaving(true)
    await supabase.from('fees').insert({ club_id: club.id, player_id: form.player_id, description: form.description, amount: parseInt(form.amount), due_date: form.due_date || null, term: form.term || null, status: 'unpaid' })
    setSaving(false); onSaved()
  }

  return (
    <Modal title="Add fee" onClose={onClose}>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Player *</label><select value={form.player_id} onChange={e => set('player_id', e.target.value)}><option value="">Select player</option>{players.map(p => <option key={p.id} value={p.id}>{p.squad_number ? `#${p.squad_number} ` : ''}{p.full_name}</option>)}</select></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description *</label><input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Term 2 academy fee" /></div>
          <div className="form-group"><label>Amount (KES) *</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 5000" /></div>
          <div className="form-group"><label>Term</label><input value={form.term} onChange={e => set('term', e.target.value)} placeholder="e.g. Term 2, 2025" /></div>
          <div className="form-group"><label>Due date</label><input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save fee'}</button>
      </div>
    </Modal>
  )
}

function MessagesPage({ profile, clubId }) {
  const [messages, setMessages] = useState([])
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)
  const canSend = profile.role === 'manager' || profile.role === 'coach'

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_from_profile_id_fkey(full_name)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(50)
    setMessages(data || [])
    setLoading(false)
  }, [clubId])

  useEffect(() => { load() }, [load])

  const toLabel = (m) => m.to_profile_id ? 'Direct message' : (!m.to_role || m.to_role === 'all') ? 'Everyone' : m.to_role === 'parent' ? 'Parents' : m.to_role === 'player' ? 'Players' : m.to_role === 'coach' ? 'Coaches' : m.to_role

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Messages</div><div className="page-sub">Club communications</div></div>
        {canSend && <button className="btn btn-primary" onClick={() => setShowCompose(true)}>+ Compose</button>}
      </div>
      <div className="card">
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div> :
          messages.length === 0 ? <div className="empty" style={{ padding: 32 }}><div className="empty-sub">No messages yet</div></div> :
          messages.map(m => (
            <div key={m.id} style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.subject}</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(m.created_at)}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.body}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>From: {m.sender?.full_name || 'Academy'}{canSend ? ` · To: ${toLabel(m)}` : ''}</div>
            </div>
          ))
        }
      </div>
      {showCompose && <ComposeModal clubId={clubId} senderId={profile.id} onClose={() => { setShowCompose(false); load() }} />}
    </div>
  )
}

function ComposeModal({ clubId, senderId, onClose }) {
  const [form, setForm] = useState({ subject: '', body: '', to_role: 'all' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const send = async () => {
    if (!form.subject.trim() || !form.body.trim()) { setError('Subject and message are required'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('messages').insert({
      club_id: clubId, from_profile_id: senderId, subject: form.subject.trim(), body: form.body.trim(),
      to_role: form.to_role === 'all' ? null : form.to_role,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onClose()
  }

  return (
    <Modal title="Compose message" onClose={onClose}>
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Subject *</label><input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Training cancelled this Friday" /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Send to</label><select value={form.to_role} onChange={e => set('to_role', e.target.value)}><option value="all">Everyone</option><option value="player">Players only</option><option value="parent">Parents only</option><option value="coach">Coaches only</option></select></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Message *</label><textarea value={form.body} onChange={e => set('body', e.target.value)} placeholder="Write your message here..." rows={5} style={{ resize: 'vertical' }} /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={send} disabled={saving}>{saving ? 'Sending...' : 'Send message'}</button>
      </div>
    </Modal>
  )
}

function AnalyticsPage({ clubId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [statsRes, fixturesRes] = await Promise.all([
        supabase.from('player_match_stats').select('*, players(full_name)'),
        supabase.from('fixtures').select('*').eq('club_id', clubId),
      ])
      const stats = statsRes.data || []
      const fixtures = fixturesRes.data || []
      const scorerMap = {}
      stats.forEach(s => {
        if (!s.players) return
        const name = s.players.full_name
        scorerMap[name] = (scorerMap[name] || 0) + (s.goals || 0)
      })
      const topScorers = Object.entries(scorerMap).map(([name, goals]) => ({ name, goals })).sort((a, b) => b.goals - a.goals).slice(0, 8)
      const completed = fixtures.filter(f => f.status === 'completed')
      const wins = completed.filter(f => f.is_home ? f.home_score > f.away_score : f.away_score > f.home_score).length
      const draws = completed.filter(f => f.home_score === f.away_score).length
      const losses = completed.length - wins - draws
      const goalsFor = completed.reduce((a, f) => a + (f.is_home ? (f.home_score || 0) : (f.away_score || 0)), 0)
      const goalsAgainst = completed.reduce((a, f) => a + (f.is_home ? (f.away_score || 0) : (f.home_score || 0)), 0)
      setData({ topScorers, wins, draws, losses, played: completed.length, goalsFor, goalsAgainst })
      setLoading(false)
    }
    load()
  }, [clubId])

  if (loading) return <Spinner />

  const maxGoals = data.topScorers[0]?.goals || 1

  return (
    <div className="page">
      <div className="page-hdr"><div className="page-title">Analytics</div><div className="page-sub">Season performance overview</div></div>
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Played</div><div className="stat-value">{data.played}</div></div>
        <div className="stat-card"><div className="stat-label">Won</div><div className="stat-value" style={{ color: 'var(--green)' }}>{data.wins}</div></div>
        <div className="stat-card"><div className="stat-label">Drawn</div><div className="stat-value" style={{ color: '#888' }}>{data.draws}</div></div>
        <div className="stat-card"><div className="stat-label">Lost</div><div className="stat-value" style={{ color: 'var(--red)' }}>{data.losses}</div></div>
        <div className="stat-card"><div className="stat-label">Win Rate</div><div className="stat-value">{data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0}%</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Top Scorers</div></div>
          {data.topScorers.length === 0 ? <div className="empty" style={{ padding: 24 }}><div className="empty-sub">No goal data yet</div></div> : (
            <div style={{ padding: '0.5rem 0' }}>
              {data.topScorers.map((s, i) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: i < data.topScorers.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ width: 20, textAlign: 'center', fontWeight: 700, color: i === 0 ? 'var(--btb-gold)' : 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ height: 5, background: 'var(--bg-card2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(s.goals / maxGoals) * 100}%`, background: i === 0 ? 'var(--btb-gold)' : 'var(--btb-blue)', borderRadius: 3 }} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{s.goals}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Goals</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16 }}>
            <div className="stat-card"><div className="stat-label">Scored</div><div className="stat-value" style={{ color: 'var(--green)' }}>{data.goalsFor}</div></div>
            <div className="stat-card"><div className="stat-label">Conceded</div><div className="stat-value" style={{ color: 'var(--red)' }}>{data.goalsAgainst}</div></div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Goal Difference</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: data.goalsFor >= data.goalsAgainst ? 'var(--green)' : 'var(--red)' }}>
              {data.goalsFor >= data.goalsAgainst ? '+' : ''}{data.goalsFor - data.goalsAgainst}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FanApp({ club }) {
  const [tab, setTab] = useState('home')
  const [fixtures, setFixtures] = useState([])
  const [players, setPlayers] = useState([])
  const [liveMatch, setLiveMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [fixRes, playRes, liveRes] = await Promise.all([
        supabase.from('fixtures').select('*').eq('club_id', club.id).order('match_date', { ascending: false }).limit(20),
        supabase.from('squad_public').select('id,full_name,position,squad_number,photo_url').order('squad_number'),
        supabase.from('fixtures').select('*, match_events(*)').eq('club_id', club.id).eq('status', 'live').maybeSingle(),
      ])
      setFixtures(fixRes.data || [])
      setPlayers(playRes.data || [])
      setLiveMatch(liveRes.data)
      setLoading(false)
    }
    load()
    const channel = supabase.channel('fan-live')
      .on('postgres_changes', { event: '*', schema: 'sportspulse', table: 'fixtures', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [club.id])

  const upcoming = fixtures.filter(f => f.status === 'upcoming').sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
  const past = fixtures.filter(f => f.status === 'completed').sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
  const lastResult = past[0]
  const tabs = [{ id: 'home', label: '🏠 Home' }, { id: 'fixtures', label: '📅 Fixtures' }, { id: 'squad', label: '👥 Squad' }, { id: 'tickets', label: '🎟 Tickets' }]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text)' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a4bdb, #0f2d8a)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--btb-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#000' }}>BTB</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Beyond the Ball</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>Fan Zone · Nyeri, Kenya</div>
        </div>
        {liveMatch && <div style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>● LIVE</div>}
      </div>
      <div style={{ padding: '1rem 1.25rem', paddingBottom: '5rem' }}>
        {loading ? <Spinner /> : (
          <>
            {tab === 'home' && (
              <div>
                {liveMatch && (
                  <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', border: '2px solid #1a4bdb', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#ef4444', marginBottom: 8 }}>● LIVE MATCH</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>BTB <span style={{ color: 'var(--btb-gold)' }}>{liveMatch.home_score ?? 0} — {liveMatch.away_score ?? 0}</span> {liveMatch.opponent}</div>
                  </div>
                )}
                {!liveMatch && upcoming[0] && (
                  <div style={{ background: 'linear-gradient(135deg, #0d1b3e, #1a2744)', border: '1px solid rgba(26,75,219,0.4)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--btb-gold)', marginBottom: 8 }}>NEXT MATCH</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>BTB vs {upcoming[0].opponent}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fmtDate(upcoming[0].match_date)} · {upcoming[0].is_home ? 'PCEA Primary Pitch' : 'Away'}</div>
                  </div>
                )}
                {lastResult && (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>LAST RESULT</div>
                    <div style={{ fontWeight: 700 }}>BTB {lastResult.home_score} — {lastResult.away_score} {lastResult.opponent}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(lastResult.match_date)}</div>
                  </div>
                )}
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>ABOUT BTB</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>Beyond the Ball Sports Academy is a youth football academy based in Nyeri, Kenya, dedicated to developing the next generation of Kenyan football talent. Founded in 2022.</p>
                </div>
              </div>
            )}
            {tab === 'fixtures' && (
              <div>
                {upcoming.length > 0 && <><div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>UPCOMING</div>{upcoming.map(f => (<div key={f.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 10 }}><div style={{ fontWeight: 700, marginBottom: 4 }}>BTB vs {f.opponent}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(f.match_date)} · {f.is_home ? 'PCEA Primary Pitch, Nyeri' : f.venue || 'Away'}</div></div>))}</>}
                {past.length > 0 && <><div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 10px' }}>RESULTS</div>{past.slice(0, 10).map(f => { const won = f.is_home ? f.home_score > f.away_score : f.away_score > f.home_score; const drew = f.home_score === f.away_score; return (<div key={f.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 14, marginBottom: 8, borderLeft: `3px solid ${drew ? '#888' : won ? '#22c55e' : '#ef4444'}` }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>BTB {f.home_score} — {f.away_score} {f.opponent}</span><span style={{ color: drew ? '#888' : won ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>{drew ? 'D' : won ? 'W' : 'L'}</span></div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{fmtDate(f.match_date)}</div></div>) })}</>}
                {fixtures.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>No fixtures yet</p>}
              </div>
            )}
            {tab === 'squad' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {players.map(p => (
                  <div key={p.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                    {p.photo_url ? <img src={p.photo_url} alt={p.full_name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '2px solid #1a4bdb' }} /> : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(26,75,219,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.25rem', fontWeight: 700, color: '#1a4bdb' }}>{p.squad_number || initials(p.full_name)}</div>}
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.position || 'Player'}</div>
                  </div>
                ))}
                {players.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>Squad not published</div>}
              </div>
            )}
            {tab === 'tickets' && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎟</div>
                <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Match Day Tickets</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.875rem' }}>Pay via M-Pesa to secure your seat at the next BTB home match.</p>
                {upcoming[0] ? (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>BTB vs {upcoming[0].opponent}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{fmtDate(upcoming[0].match_date)} · PCEA Primary Pitch</div>
                    <a href={`https://wa.me/254${(club.whatsapp_number || '').replace(/^0/, '')}?text=I'd like to buy a ticket for the BTB vs ${upcoming[0].opponent} match`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#25D366', color: '#fff', fontWeight: 700, padding: '12px 32px', borderRadius: 8, textDecoration: 'none' }}>💬 Buy via WhatsApp</a>
                  </div>
                ) : <p style={{ color: 'var(--text-muted)' }}>No upcoming home matches</p>}
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-nav)', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 200 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', color: tab === t.id ? 'var(--btb-gold)' : 'var(--text-muted)', fontSize: '0.65rem', fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: '1.1rem' }}>{t.label.split(' ')[0]}</span>
            <span>{t.label.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ParentDashboard({ club, profile, setPage }) {
  const [children, setChildren] = useState([])
  const [fees, setFees] = useState([])
  const [next, setNext] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const [{ data: links }, { data: f }, { data: fx }] = await Promise.all([
      supabase.from('parent_player_links').select('relationship, player:players(*)').eq('parent_profile_id', profile.id),
      supabase.from('fees').select('*, player:players(full_name)').order('due_date', { ascending: true }),
      supabase.from('fixtures').select('*').eq('club_id', club.id).eq('status', 'upcoming').order('match_date', { ascending: true }).limit(3),
    ])
    setChildren((links || []).map(l => ({ ...l.player, relationship: l.relationship })).filter(p => p && p.id))
    setFees(f || [])
    setNext(fx || [])
    setLoading(false)
  }, [profile.id, club.id])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />

  const owing = fees.filter(f => f.status !== 'paid' && f.status !== 'waived')
  const owed = owing.reduce((s, f) => s + (f.amount - (f.paid_amount || 0)), 0)
  const statusText = { pending: 'Awaiting approval', rejected: 'Needs attention', active: 'In the squad', injured: 'Injured', suspended: 'Suspended', on_loan: 'On loan', inactive: 'Inactive' }

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Hello, {profile.full_name.split(' ')[0]}</div><div className="page-sub">{club.name} · Parent portal</div></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add child</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hdr"><div className="card-title">My children</div></div>
        {children.length === 0
          ? <div className="empty" style={{ padding: 28 }}>
              <div className="empty-title">No children registered yet</div>
              <div className="empty-sub" style={{ marginBottom: 12 }}>Register your child to start the academy approval process.</div>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Register your child</button>
            </div>
          : children.map(c => (
            <div key={c.id} onClick={() => setSelected(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }}>
              <div className="avatar">{c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(c.full_name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.squad_number ? `#${c.squad_number} · ` : ''}{c.position_detail || c.position || 'Position not set'}</div>
              </div>
              <span className={`badge ${STATUS_COLORS[c.status] || 'badge-gray'}`}>{statusText[c.status] || c.status}</span>
            </div>
          ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Fees</div></div>
          <div className="card-body">
            {fees.length === 0 ? <div className="empty-sub">No fees yet</div> : (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, color: owed > 0 ? 'var(--red)' : 'var(--green)' }}>{fmtKES(owed)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{owed > 0 ? 'Outstanding' : 'All paid up'}</div>
                {owing.slice(0, 4).map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderTop: '0.5px solid var(--border)' }}>
                    <span>{f.player?.full_name?.split(' ')[0]} · {f.description}</span>
                    <span>{fmtKES(f.amount - (f.paid_amount || 0))}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Next fixtures</div></div>
          <div className="card-body">
            {next.length === 0 ? <div className="empty-sub">No upcoming fixtures</div> : next.map(f => (
              <div key={f.id} style={{ padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{f.opponent}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(f.match_date)} · {fmtTime(f.match_date)}</div>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setPage('fixtures')}>All fixtures</button>
          </div>
        </div>
      </div>

      {showAdd && <PlayerRegistrationModal mode="parent" club={club} profile={profile} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {selected && <PlayerDetailModal player={selected} club={club} userRole="parent" onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); load() }} />}
    </div>
  )
}

function ApprovalsPage({ club, profile, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [squadNo, setSquadNo] = useState({})
  const [rejecting, setRejecting] = useState(null)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('players')
      .select('*, links:parent_player_links(relationship, parent:profiles!parent_player_links_parent_profile_id_fkey(full_name, phone, email))')
      .eq('club_id', club.id).eq('status', 'pending').order('created_at', { ascending: true })
    if (err) setError(err.message)
    setItems(data || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  const approve = async (p) => {
    setBusy(p.id); setError('')
    const sq = squadNo[p.id]
    const { error: err } = await supabase.from('players').update({
      status: 'active', is_active: true, squad_number: sq ? parseInt(sq) : null,
      reviewed_by: profile.id, reviewed_at: new Date().toISOString(), rejection_note: null,
    }).eq('id', p.id)
    setBusy('')
    if (err) { setError(err.message.includes('duplicate') ? 'That squad number is already taken' : err.message); return }
    load(); onChanged && onChanged()
  }

  const reject = async (p) => {
    if (note.trim().length < 3) { setError('Please give the parent a short reason'); return }
    setBusy(p.id); setError('')
    const { error: err } = await supabase.from('players').update({
      status: 'rejected', is_active: false, rejection_note: note.trim(),
      reviewed_by: profile.id, reviewed_at: new Date().toISOString(),
    }).eq('id', p.id)
    setBusy('')
    if (err) { setError(err.message); return }
    setRejecting(null); setNote(''); load(); onChanged && onChanged()
  }

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr"><div><div className="page-title">Approvals</div><div className="page-sub">{items.length} registration{items.length === 1 ? '' : 's'} waiting for review</div></div></div>
      {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
      {items.length === 0
        ? <div className="empty"><div className="empty-title">All caught up</div><div className="empty-sub">New parent registrations will appear here</div></div>
        : items.map(p => {
          const link = p.links?.[0]; const par = link?.parent
          return (
            <div key={p.id} className="card" style={{ marginBottom: 12 }}>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="avatar">{p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(p.full_name)}</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.date_of_birth ? `Born ${new Date(p.date_of_birth).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No date of birth'}
                      {p.position ? ` · ${p.position}` : ''}{p.school_name ? ` · ${p.school_name}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {par ? `${link.relationship}: ${par.full_name}${par.phone ? ' · ' + par.phone : ''}${par.email ? ' · ' + par.email : ''}` : 'Parent details unavailable'}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(p)}>Review details & documents</button>
                </div>
                {rejecting === p.id ? (
                  <div style={{ marginTop: 12 }}>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Reason shown to the parent, e.g. Please upload a clear birth certificate" rows={2} style={{ width: '100%' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn btn-primary btn-sm" disabled={busy === p.id} onClick={() => reject(p)}>Send rejection</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setRejecting(null); setNote(''); setError('') }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" min="0" max="99" placeholder="Squad #" value={squadNo[p.id] || ''} onChange={e => setSquadNo(s => ({ ...s, [p.id]: e.target.value }))} style={{ width: 100 }} />
                    <button className="btn btn-primary btn-sm" disabled={busy === p.id} onClick={() => approve(p)}>{busy === p.id ? 'Saving...' : '✓ Approve'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setRejecting(p.id); setNote(''); setError('') }}>Reject</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      {selected && <PlayerDetailModal player={selected} club={club} userRole="manager" onClose={() => setSelected(null)} />}
    </div>
  )
}

function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) { setProfile(null); setClub(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) { setLoading(false); return }
    async function loadProfile() {
      let { data: prof } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle()
      if (!prof) {
        // First sign-in after parent sign-up: create the parent profile from the sign-up details.
        const meta = session.user.user_metadata || {}
        const { error: regErr } = await supabase.rpc('register_parent', { p_club_slug: CLUB_SLUG, p_full_name: meta.full_name || '', p_phone: meta.phone || null })
        if (regErr) setProfileError(regErr.message)
        else ({ data: prof } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle())
      }
      if (prof) {
        setProfile(prof)
        const { data: cl } = await supabase.from('clubs').select('*').eq('id', prof.club_id).single()
        setClub(cl)
        setPage(prof.role === 'parent' ? 'parent-dashboard' : prof.role === 'player' ? 'fixtures' : 'dashboard')
      }
      setLoading(false)
    }
    loadProfile()
  }, [session])

  if (session === undefined || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--btb-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#000' }}>BTB</div>
      <Spinner />
      <p style={{ color: 'var(--text-muted)' }}>Loading SportsPulse...</p>
    </div>
  )

  if (!session) return <Login />
  if (!profile || !club) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      {profileError ? <Note kind="error" style={{ maxWidth: 360 }}>We could not set up your account: {profileError}</Note> : <><Spinner /><p style={{ color: 'var(--text-muted)' }}>Loading profile...</p></>}
      <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )

  if (profile.role === 'fan') return <FanApp club={club} />

  const navItems = {
    manager: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'approvals', label: 'Approvals', icon: '✅' },
      { id: 'squad', label: 'Squad', icon: '👥' },
      { id: 'fixtures', label: 'Fixtures', icon: '📅' },
      { id: 'match-centre', label: 'Match Centre', icon: '⚽' },
      { id: 'training', label: 'Training', icon: '🏃' },
      { id: 'fees', label: 'Fees', icon: '💰' },
      { id: 'messages', label: 'Messages', icon: '💬' },
      { id: 'analytics', label: 'Analytics', icon: '📊' },
    ],
    coach: [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'squad', label: 'Squad', icon: '👥' },
      { id: 'fixtures', label: 'Fixtures', icon: '📅' },
      { id: 'match-centre', label: 'Match Centre', icon: '⚽' },
      { id: 'training', label: 'Training', icon: '🏃' },
      { id: 'messages', label: 'Messages', icon: '💬' },
    ],
    player: [
      { id: 'fixtures', label: 'Fixtures', icon: '📅' },
      { id: 'training', label: 'Training', icon: '🏃' },
      { id: 'messages', label: 'Messages', icon: '💬' },
    ],
    parent: [
      { id: 'parent-dashboard', label: 'My Children', icon: '👨‍👧' },
      { id: 'fixtures', label: 'Fixtures', icon: '📅' },
      { id: 'messages', label: 'Messages', icon: '💬' },
    ],
  }

  const items = navItems[profile.role] || navItems.player

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <ManagerDashboard profile={profile} club={club} setPage={setPage} />
      case 'parent-dashboard': return <ParentDashboard profile={profile} club={club} setPage={setPage} />
      case 'approvals': return profile.role !== 'manager' ? null : <ApprovalsPage profile={profile} club={club} />
      case 'squad': return <SquadPage userRole={profile.role} club={club} />
      case 'fixtures': return <FixturesPage userRole={profile.role} club={club} />
      case 'match-centre': return <MatchCentrePage club={club} />
      case 'training': return <TrainingPage userRole={profile.role} club={club} />
      case 'fees': return profile.role === 'manager' ? <FeesPage club={club} /> : null
      case 'messages': return <MessagesPage profile={profile} clubId={club.id} />
      case 'analytics': return <AnalyticsPage clubId={club.id} />
      default: return profile.role === 'parent' ? <ParentDashboard profile={profile} club={club} setPage={setPage} /> : <ManagerDashboard profile={profile} club={club} setPage={setPage} />
    }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); sessionStorage.clear() }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-badge">BTB</div>
            <div>
              <div className="logo-name">Beyond the Ball</div>
              <div className="logo-sub">SportsPulse</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {items.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setSidebarOpen(false) }}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials(profile.full_name)}</div>
            <div>
              <div className="user-name">{profile.full_name}</div>
              <div className="user-role">{profile.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={handleSignOut} style={{ width: '100%', marginTop: 12, fontSize: '0.8rem', justifyContent: 'center' }}>Sign out</button>
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="main-content">
        <header className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{items.find(i => i.id === page)?.label || 'Dashboard'}</div>
          <div style={{ width: 32 }} />
        </header>
        <div className="content-area">{renderPage()}</div>
      </div>
      <nav className="bottom-nav">
        {items.slice(0, 5).map(item => (
          <button key={item.id} className={`bottom-nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
