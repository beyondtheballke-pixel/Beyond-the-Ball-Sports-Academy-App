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
const NAIROBI = 'Africa/Nairobi'
const todayNairobi = () => new Date().toLocaleDateString('en-CA', { timeZone: NAIROBI })
const asDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(d + 'T12:00:00Z') : new Date(d)
const fmtDate = (d) => d ? asDate(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: NAIROBI }) : '—'
const fmtFullDate = (d) => d ? asDate(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: NAIROBI }) : '—'
// exact age in whole years, by Nairobi calendar date
const exactAge = (dob) => {
  if (!dob) return null
  const [y, m, d] = String(dob).slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = todayNairobi().split('-').map(Number)
  let a = ty - y; if (tm < m || (tm === m && td < d)) a--
  return a
}
const fmtTime = (d) => { if (!d) return '—'; const t = new Date(d); return nairobiTime(t) === '00:00' ? 'Time TBA' : t.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: NAIROBI }) }
const fmtDateTime = (d) => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—'
const timeAgo = (d) => { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const h = Math.floor(diff / 3600000); if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago` }
const LOGO = '/bb-logo.jpg'

// Turn raw database / network errors into something a parent can act on.
function friendly(msg) {
  const m = String(msg || '')
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'No internet connection. Check your data or Wi-Fi and try again.'
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password. Use "Forgot password?" if you cannot remember it.'
  if (/already registered|already been registered/i.test(m)) return 'This email is already registered. Please sign in instead.'
  if (/rate limit|too many requests|security purposes/i.test(m)) return 'Too many attempts. Please wait a minute and try again.'
  if (/row-level security|permission denied|not allowed/i.test(m)) return 'You do not have permission to do that.'
  if (/duplicate key|already exists/i.test(m)) return 'That already exists.'
  if (/violates (check|foreign key|not-null)|constraint|relation ".*" does not exist|column ".*" does not exist/i.test(m)) return 'Something in the form is not valid. Please check your entries and try again.'
  if (/jwt|token.*expired|session/i.test(m)) return 'Your session has expired. Please sign in again.'
  return m
}

// Make the app installable (Add to Home screen) without touching index.html.
if (typeof document !== 'undefined' && !document.getElementById('sp-pwa')) {
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); el.setAttribute('data-sp', '1'); document.head.appendChild(el) }
  add('link', { id: 'sp-pwa', rel: 'manifest', href: '/manifest.webmanifest' })
  add('link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' })
  add('link', { rel: 'icon', type: 'image/png', href: '/icon-192.png' })
  add('link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' })
  add('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' })
  add('meta', { name: 'theme-color', content: '#0a0f1e' })
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' })
  add('meta', { name: 'apple-mobile-web-app-title', content: 'BTB Academy' })
}

// Mobile layout fixes: solid (non-see-through) menus and room above the bottom bar
if (typeof document !== 'undefined' && !document.getElementById('sp-mobile-fix')) {
  const st = document.createElement('style'); st.id = 'sp-mobile-fix'
  st.textContent = `
  .sidebar { background: #0a0f1e !important; opacity: 1 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; z-index: 1001 !important; overflow-y: auto; }
  .sidebar-overlay { z-index: 1000 !important; background: rgba(0,0,0,0.65) !important; }
  .mobile-header { background: #0a0f1e !important; opacity: 1 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; z-index: 900 !important; }
  .bottom-nav { background: #0a0f1e !important; opacity: 1 !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; z-index: 900 !important; overflow-x: auto; padding-bottom: env(safe-area-inset-bottom); border-top: 1px solid rgba(255,255,255,0.12); }
  .bottom-nav-item { flex: 0 0 auto; min-width: 64px; }
  @media (max-width: 900px) { .page { padding-bottom: calc(96px + env(safe-area-inset-bottom)) !important; } }
  .modal-overlay, .modal-backdrop { z-index: 1100 !important; }
  .modal { background: #111830; opacity: 1 !important; }
  :root { --text-muted: #a9b4cc; --text-dim: #8591ad; }
  body { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  .nav-icon, .bottom-nav-icon { display: inline-flex; align-items: center; justify-content: center; font-size: 0; }
  .nav-icon svg, .bottom-nav-icon svg { display: block; }
  .rc { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--bg-card, #111830); border: 1px solid var(--border, rgba(255,255,255,0.09)); border-radius: 12px; margin-bottom: 10px; flex-wrap: wrap; }
  .rc-time { min-width: 62px; text-align: center; }
  .rc-time b { display: block; font-size: 18px; font-weight: 700; }
  .rc-time span { font-size: 11px; color: var(--text-muted); }
  .rc-main { flex: 1 1 200px; min-width: 0; }
  .rc-title { font-weight: 600; font-size: 15px; }
  .rc-sub { font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.4; }
  .rc-side { text-align: right; min-width: 90px; }
  .rc-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; border: 1px solid currentColor; }
  .tag i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; display: inline-block; }
  .day-hdr { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-muted); margin: 20px 4px 8px; }
  .skel { background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04)); background-size: 200% 100%; animation: spShimmer 1.2s infinite; border-radius: 12px; height: 70px; margin-bottom: 10px; }
  @keyframes spShimmer { to { background-position: -200% 0; } }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .tile { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; text-align: left; padding: 16px; border-radius: 14px; cursor: pointer; background: var(--bg-card, #111830); border: 1px solid var(--border, rgba(255,255,255,0.09)); color: var(--text, #fff); font-family: inherit; }
  .tile.hot { border-color: var(--btb-gold, #e0b43c); background: rgba(224,180,60,0.08); }
  .tile-ico { color: var(--text-muted); }
  .tile.hot .tile-ico { color: var(--btb-gold, #e0b43c); }
  .tile-val { font-size: 24px; font-weight: 700; line-height: 1.1; margin-top: 6px; }
  .tile-lbl { font-size: 12px; color: var(--text-muted); }
  .bottom-nav-item { min-height: 56px; }
  @media (max-width: 900px) { .btn { min-height: 42px; } .btn-sm { min-height: 38px; } input, select, textarea { font-size: 16px; } }
  @media (min-width: 901px) {
    .app-shell { display: flex !important; min-height: 100vh; }
    .sidebar { position: sticky !important; top: 0; left: auto; height: 100vh; flex: 0 0 260px; width: 260px; transform: none !important; display: flex; flex-direction: column; overflow: hidden; }
    .sidebar-nav { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
    .sidebar-footer { flex: 0 0 auto; }
    .main-content { margin-left: 0 !important; flex: 1 1 auto; min-width: 0; }
    .content-area { max-width: 1240px; margin-left: auto; margin-right: auto; }
  }
  body, button, input, select, textarea, td, th { letter-spacing: normal; font-kerning: normal; }
  .avatar { overflow: hidden; flex-shrink: 0; }
  .avatar img { max-width: 100%; max-height: 100%; object-fit: cover; }
  `
  document.head.appendChild(st)
}

const HOLIDAY_FORMATS = [['Under 9', '5v5'], ['Under 11', '7v7'], ['Under 13', '9v9'], ['Under 15', '11v11']]
const oursTheirs = (f) => f.is_home ? [f.home_score ?? 0, f.away_score ?? 0] : [f.away_score ?? 0, f.home_score ?? 0]
const AGE_GROUPS = ['U7', 'U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Open']
const FORMAT_OF = Object.fromEntries(HOLIDAY_FORMATS.map(([a, f]) => ['U' + a.replace('Under ', ''), f]))
// Age is counted as at 31 December of this year (year-of-birth rule). A manager can override the group.
const autoAgeGroup = (dob) => {
  if (!dob) return ''
  const a = exactAge(dob)
  return a <= 6 ? 'U7' : a <= 8 ? 'U9' : a <= 10 ? 'U11' : a <= 12 ? 'U13' : a <= 14 ? 'U15' : a <= 16 ? 'U17' : a <= 18 ? 'U19' : 'Open'
}
const ageGroupOf = (p) => p?.age_group_override || autoAgeGroup(p?.date_of_birth)
const nairobiDate = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
const nairobiTime = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' })
const venueOf = (f) => f.venue || (f.is_home ? 'Venue to be announced' : 'Away')
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

const CLUB_SLUG = (import.meta.env && import.meta.env.VITE_CLUB_SLUG) || 'btb'

function Login() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', password: '', confirm: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [coachMode, setCoachMode] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setNotice('')
    if (isForgot) {
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Enter the email you registered with'); return }
      setLoading(true)
      const { error: err } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: window.location.origin })
      setLoading(false)
      if (err) setError(friendly(err.message))
      else setNotice('If that email is registered, a reset link is on its way. Open it on this phone, then choose a new password. Check your spam folder too.')
      return
    }
    if (isSignup) {
      if (coachMode && form.code.trim().length < 8) { setError('Enter the invite code from the academy manager'); return }
      if (form.full_name.trim().length < 2) { setError('Please enter your full name'); return }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
      if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    }
    setLoading(true)
    if (isSignup) {
      const { data, error: err } = await supabase.auth.signUp({
        email: form.email.trim(), password: form.password,
        options: { data: { full_name: form.full_name.trim(), phone: form.phone.trim(), invite_code: coachMode ? form.code.trim().toUpperCase() : '' } }
      })
      if (err) { setError(friendly(err.message)); setLoading(false); return }
      // If email confirmation is switched on there is no session yet.
      if (!data.session) setNotice('Account created. Check your email to confirm your address, then sign in.')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (err) { setError(friendly(err.message)); setLoading(false); return }
    }
    setLoading(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src={LOGO} alt="Beyond the Ball" style={{ width: 96, height: 96, borderRadius: 16, margin: '0 auto 12px', display: 'block' }} />
        <div className="login-title">Beyond the Ball</div>
        <div className="login-sub">{isForgot ? 'Reset your password' : isSignup ? (coachMode ? 'Coach registration' : 'Parent & guardian registration') : 'Sports Academy Platform'}</div>
        {error && <div className="login-error">{error}</div>}
        {notice && <Note kind="ok" style={{ marginBottom: 12 }}>{notice}</Note>}
        <form onSubmit={submit}>
          {isSignup && (
            <>
              {coachMode && <div className="form-group" style={{ marginBottom: 12 }}><label>Invite code</label><input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="BTB-XXXXXXXX" autoCapitalize="characters" /></div>}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Parent / guardian's full name</label>
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
          {!isForgot && <div className="form-group" style={{ marginBottom: isSignup ? 12 : 20 }}>
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required autoComplete={isSignup ? 'new-password' : 'current-password'} />
          </div>}
          {isSignup && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" required autoComplete="new-password" />
            </div>
          )}
          {mode === 'signin' && <div style={{ textAlign: 'right', marginTop: -10, marginBottom: 14 }}><button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice('') }} style={{ background: 'none', border: 'none', color: 'var(--btb-gold)', cursor: 'pointer', fontSize: 12, padding: 0 }}>Forgot password?</button></div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Please wait...' : isForgot ? 'Send reset link' : isSignup ? (coachMode ? 'Create coach account' : 'Create parent account') : 'Sign in'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          {isForgot ? 'Remembered it? ' : isSignup ? 'Already registered? ' : 'New parent or guardian? '}
          <button type="button" onClick={() => { setMode(isSignup || isForgot ? 'signin' : 'signup'); setError(''); setNotice('') }} style={{ background: 'none', border: 'none', color: 'var(--btb-gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
            {isSignup || isForgot ? 'Sign in' : 'Register here'}
          </button>
        </div>
        {isSignup && <label style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}><input type="checkbox" style={{ width: 'auto' }} checked={coachMode} onChange={e => setCoachMode(e.target.checked)} /> I'm a coach with an invite code</label>}
        {isSignup && !coachMode && <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-dim)' }}>After signing up you can register your child. The academy reviews every registration before a child joins the squad.</div>}
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
      <AttentionTiles club={club} pending={stats.pending} setPage={setPage} />
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
  const [centerFilter, setCenterFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [centers, setCenters] = useState([])
  const [search, setSearch] = useState('')
  const [showCount, setShowCount] = useState(60)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('players').select('*').eq('club_id', club.id).not('status', 'in', '(pending,rejected)').order('squad_number', { ascending: true })
    setPlayers(data || [])
    const { data: cs } = await supabase.from('training_centers').select('id,name').eq('club_id', club.id)
    setCenters(cs || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  const filtered = players.filter(p => {
    const matchPos = filter === 'All' || p.position === filter
    const matchSearch = !search || p.full_name.toLowerCase().includes(search.toLowerCase())
    const matchCenter = centerFilter === 'all' || p.training_center_id === centerFilter || p.attends_both
    const matchAge = ageFilter === 'all' || ageGroupOf(p) === ageFilter
    return matchPos && matchSearch && matchCenter && matchAge
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
          placeholder="Search players..." value={search} onChange={e => { setSearch(e.target.value); setShowCount(60) }} />
      </div>
      {centers.length > 0 && (
        <div className="filter-pills">
          <button className={`pill ${centerFilter === 'all' ? 'active' : ''}`} onClick={() => setCenterFilter('all')}>All centres</button>
          {centers.map(c => <button key={c.id} className={`pill ${centerFilter === c.id ? 'active' : ''}`} onClick={() => setCenterFilter(c.id)}>{c.name.split(' ')[0]}</button>)}
        </div>
      )}
      <div className="filter-pills">
        <button className={`pill ${ageFilter === 'all' ? 'active' : ''}`} onClick={() => setAgeFilter('all')}>All ages</button>
        {AGE_GROUPS.filter(g => players.some(p => ageGroupOf(p) === g)).map(g => <button key={g} className={`pill ${ageFilter === g ? 'active' : ''}`} onClick={() => setAgeFilter(g)}>{g} ({players.filter(p => ageGroupOf(p) === g).length})</button>)}
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
            {filtered.slice(0, showCount).map(p => (
              <div key={p.id} className="player-card" onClick={() => setSelected(p)}>
                <div className="player-card-img">
                  {p.photo_url ? <img src={p.photo_url} alt={p.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }}>👤</div>}
                  <div className="player-card-num">{p.squad_number}</div>
                  <div className="player-card-status" style={{ background: p.status === 'active' ? 'var(--green)' : p.status === 'injured' ? 'var(--red)' : 'var(--amber)' }}></div>
                </div>
                <div className="player-card-body">
                  <div className="player-card-name">{p.full_name}</div>
                  <div className="player-card-pos">{ageGroupOf(p) ? ageGroupOf(p) + ' · ' : ''}{p.position_detail || p.position || '—'}</div>
                  {p.sponsored && <div style={{ fontSize: 10, color: 'var(--btb-gold)', marginTop: 2 }}>Sponsored</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      {filtered.length > showCount && <div style={{ textAlign: 'center', margin: '12px 0' }}><button className="btn btn-ghost" onClick={() => setShowCount(c => c + 60)}>Show more ({filtered.length - showCount} left)</button></div>}
      {showAdd && <PlayerRegistrationModal club={club} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {selected && <PlayerDetailModal player={selected} club={club} userRole={userRole} onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); load() }} />}
    </div>
  )
}

// mode = 'staff' (manager/coach registers a player straight into the squad)
//      = 'parent' (a parent registers their child; it waits for approval)
function PlayerRegistrationModal({ club, onClose, onSaved }) {
  const isParent = false
  const [tab, setTab] = useState('personal')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [relationship, setRelationship] = useState('mother')
  const [form, setForm] = useState({ full_name: '', date_of_birth: '', nationality: 'Kenyan', squad_number: '', position: '', position_detail: '', dominant_foot: 'Right', height_cm: '', weight_kg: '', school_name: '', school_grade: '', home_address: '', contract_start: '', contract_end: '', training_center_id: '', sponsored: false })
  const [centers, setCenters] = useState([])
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [files, setFiles] = useState({})
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const docTypes = DOC_TYPES.filter(d => !(isParent && d.staffOnly))

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => { supabase.from('training_centers').select('id,name').eq('club_id', club.id).eq('is_active', true).order('name').then(({ data }) => setCenters(data || [])) }, [club.id])

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
      if (err) { setError(friendly(err.message)); setSaving(false); return }
      playerId = data
    } else {
      playerId = crypto.randomUUID()
      const { error: err } = await supabase.from('players').insert({
        id: playerId, club_id: club.id, full_name: form.full_name.trim(), date_of_birth: form.date_of_birth || null,
        nationality: form.nationality || null,
        squad_number: form.squad_number ? parseInt(form.squad_number) : null, position: form.position || null,
        position_detail: form.position_detail || null, dominant_foot: form.dominant_foot || null,
        height_cm: form.height_cm ? parseInt(form.height_cm) : null, weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
        school_name: form.school_name || null, school_grade: form.school_grade || null, home_address: form.home_address || null,
        contract_start: form.contract_start || null, contract_end: form.contract_end || null, status: 'active', is_active: true,
        training_center_id: form.training_center_id || null, sponsored: !!form.sponsored,
      })
      if (err) { setError(friendly(err.message)); setSaving(false); return }
      if ((club.registration_fee ?? 0) > 0) {
        await supabase.from('fees').insert({ club_id: club.id, player_id: playerId, description: 'Registration fee (includes two sets of kits)', amount: club.registration_fee, due_date: nairobiDate(Date.now() + 14 * 864e5), status: form.sponsored ? 'waived' : 'unpaid', term: 'Registration', fee_type: 'registration' })
      }
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
              <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>{isParent ? "Player's full name *" : 'Player full name *'}</label><input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. John Kamau Mwangi" maxLength={100} /></div>
              <div className="form-group"><label>Date of birth{isParent ? ' *' : ''}</label><input type="date" max={todayNairobi()} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
              <div className="form-group"><label>Nationality</label><input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. Kenyan" /></div>
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
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Training centre</label><select value={form.training_center_id} onChange={e => set('training_center_id', e.target.value)}><option value="">Select a centre</option>{centers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={form.sponsored} onChange={e => set('sponsored', e.target.checked)} /> Sponsored player (fees waived)</label>
            <div className="form-group"><label>School name</label><input value={form.school_name} onChange={e => set('school_name', e.target.value)} placeholder="e.g. Nyeri Primary School" /></div>
            <div className="form-group"><label>Grade / class</label><input value={form.school_grade} onChange={e => set('school_grade', e.target.value)} placeholder="e.g. Grade 7" /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Home address</label><textarea value={form.home_address} onChange={e => set('home_address', e.target.value)} placeholder="Estate / village, town" /></div>
          </div>
        )}
        {editing && <EditChildModal player={player} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onUpdated && onUpdated() }} />}
        {tab === 'pricing' && <PlayerPricing player={player} club={club} onSaved={() => onUpdated && onUpdated()} />}
        {tab === 'attendance' && <PlayerAttendance player={player} />}
        {tab === 'media' && <PlayerMedia player={player} club={club} canEdit={isStaff} />}
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
  const [centerName, setCenterName] = useState('')
  const [newType, setNewType] = useState('birth_certificate')
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState(null)
  const isParent = userRole === 'parent'
  const isStaff = userRole === 'manager' || userRole === 'coach'
  const [editing, setEditing] = useState(false)

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

  useEffect(() => { if (player.training_center_id) supabase.from('training_centers').select('name').eq('id', player.training_center_id).maybeSingle().then(({ data }) => setCenterName(player.attends_both ? 'Both centres' : (data?.name || ''))) }, [player.training_center_id, player.attends_both])

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
    if (error) { setMsg({ kind: 'error', text: friendly(error.message) }); return }
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
          {[{ k: 'profile', l: 'Profile' }, { k: 'academy', l: 'School' }, { k: 'documents', l: `Documents (${docs.length})` }, ...(player.links?.[0]?.parent ? [{ k: 'family', l: 'Family' }] : []), ...((isStaff || isParent) && player.status === 'active' ? [{ k: 'attendance', l: 'Attendance' }, { k: 'media', l: 'Media' }] : []), ...(userRole === 'manager' && player.status !== 'pending' ? [{ k: 'pricing', l: 'Fees' }] : [])].map(t => (
            <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>
        {(isParent || isStaff) && (tab === 'profile' || tab === 'academy') && <div style={{ textAlign: 'right', marginBottom: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit details</button></div>}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[{ l: 'Date of birth', v: player.date_of_birth ? `${fmtFullDate(player.date_of_birth)} (age ${exactAge(player.date_of_birth)})` : null }, { l: 'Nationality', v: player.nationality }, { l: 'Age group', v: ageGroupOf(player) }, { l: 'Training centre', v: centerName }, ...(isStaff && player.sponsored ? [{ l: 'Sponsorship', v: player.sponsorship_note || 'Sponsored (fees waived)' }] : []), { l: 'Dominant foot', v: player.dominant_foot }, { l: 'Height', v: player.height_cm ? `${player.height_cm} cm` : null }, { l: 'Weight', v: player.weight_kg ? `${player.weight_kg} kg` : null }, ...(isStaff ? [{ l: 'Contract start', v: player.contract_start ? fmtDate(player.contract_start) : null }, { l: 'Contract end', v: player.contract_end ? fmtDate(player.contract_end) : null }] : [])].map(({ l, v }) => (
              <div key={l}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, color: v ? 'var(--text)' : 'var(--text-dim)' }}>{v || '—'}</div></div>
            ))}
          </div>
        )}
        {tab === 'academy' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[{ l: 'School', v: player.school_name }, { l: 'Grade / class', v: player.school_grade }, { l: 'Home address', v: player.home_address, full: true }, ...(isStaff || isParent ? [{ l: 'Medical conditions', v: player.medical_conditions, full: true }, { l: 'Allergies', v: player.allergies, full: true }] : [])].map(({ l, v, full }) => (
              <div key={l} style={{ gridColumn: full ? '1 / -1' : 'auto' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, color: v ? 'var(--text)' : 'var(--text-dim)' }}>{v || '—'}</div></div>
            ))}
          </div>
        )}
        {tab === 'family' && player.links?.[0]?.parent && (() => { const pr = player.links[0].parent; return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[{ l: `Parent / guardian (${player.links[0].relationship})`, v: pr.full_name, full: true }, { l: 'Phone', v: [pr.phone, pr.alt_phone].filter(Boolean).join(' / ') }, { l: 'Email', v: pr.email }, { l: 'Lives at', v: pr.residence, full: true }, { l: 'Alternative contact', v: pr.alt_contact_name ? `${pr.alt_contact_name} (${pr.alt_contact_relationship})` : null }, { l: 'Alternative contact phone', v: pr.alt_contact_phone }].map(({ l, v, full }) => (
              <div key={l} style={{ gridColumn: full ? '1 / -1' : 'auto' }}><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>{l}</div><div style={{ fontSize: 13, color: v ? 'var(--text)' : 'var(--text-dim)' }}>{v || '—'}</div></div>
            ))}
          </div>) })()}
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

function FixturesPage({ club, userRole, profile: profileF }) {
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [squads, setSquads] = useState([])
  const [squadFx, setSquadFx] = useState(null)
  const isStaffF = userRole === 'manager' || userRole === 'coach'

  const load = useCallback(async () => {
    const { data } = await supabase.from('fixtures').select('*').eq('club_id', club.id).order('match_date', { ascending: false })
    const { data: sq } = await supabase.from('match_squad').select('fixture_id,role,player:players(full_name)').eq('club_id', club.id)
    setSquads(sq || [])
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
        <div><div className="page-title">Fixtures & Results</div><div className="page-sub">Matches and results</div></div>
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
                  {!isStaffF && squads.filter(x => x.fixture_id === f.id).map((x, i) => <div key={i} style={{ fontSize: 12, marginTop: 6, color: x.role === 'unavailable' ? 'var(--red)' : 'var(--green)' }}>⚽ {x.player?.full_name?.split(' ')[0]}: {x.role === 'starter' ? 'in the starting team' : x.role === 'sub' ? 'on the bench' : 'not available'}</div>)}
                  {isStaffF && f.status !== 'completed' && <div style={{ marginTop: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => setSquadFx(f)}>Squad ({squads.filter(x => x.fixture_id === f.id && x.role !== 'unavailable').length})</button></div>}
                  {isStaffF && f.status === 'completed' && <div style={{ marginTop: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => setSquadFx(f)}>Squad & notes</button></div>}
                </div>
              )
            })}
          </div>
        )}
      {squadFx && <MatchSquadModal club={club} fixture={squadFx} profile={profileF} onClose={() => setSquadFx(null)} onSaved={() => { setSquadFx(null); load() }} />}
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
    if (err) { setError(friendly(err.message)); setSaving(false); return }
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

const MATCH_ACTIONS = [
  { type: 'goal', label: 'Goal', icon: '⚽', hint: 'BTB scored' },
  { type: 'opponent_goal', label: 'Opponent goal', icon: '🥅', hint: 'They scored' },
  { type: 'penalty', label: 'Penalty scored', icon: '🎯', hint: 'BTB penalty goal' },
  { type: 'penalty_missed', label: 'Penalty missed', icon: '❌', hint: 'Saved or missed' },
  { type: 'yellow_card', label: 'Yellow card', icon: '🟨', hint: '' },
  { type: 'red_card', label: 'Red card', icon: '🟥', hint: '' },
  { type: 'substitution', label: 'Substitution', icon: '🔄', hint: '' },
  { type: 'own_goal', label: 'Own goal', icon: '😬', hint: 'Counts for opponent' },
  { type: 'injury', label: 'Injury', icon: '🩹', hint: '' },
  { type: 'note', label: 'Note', icon: '📝', hint: 'Anything else' },
]
const EVENT_ICON = Object.fromEntries(MATCH_ACTIONS.map(a => [a.type, a.icon]))

function MatchCentrePage({ club, userRole }) {
  const [fixtures, setFixtures] = useState([])
  const [selected, setSelected] = useState(null)
  const [events, setEvents] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState(null)
  const [form, setForm] = useState({ minute: '', player_id: '', assist_id: '', off_id: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [koTime, setKoTime] = useState('')
  const [now, setNow] = useState(Date.now())
  const isManager = userRole === 'manager'
  const canLog = userRole === 'manager' || userRole === 'coach'

  const loadEvents = useCallback(async (fid) => {
    const { data } = await supabase.from('match_events')
      .select('*, player:players!match_events_player_id_fkey(full_name,squad_number), assist:players!match_events_assist_player_id_fkey(full_name), off:players!match_events_player_off_id_fkey(full_name)')
      .eq('fixture_id', fid).order('minute', { ascending: false }).order('created_at', { ascending: false })
    setEvents(data || [])
  }, [])

  const refresh = useCallback(async (fid) => {
    const [{ data: f }, { data: one }] = await Promise.all([
      supabase.from('fixtures').select('*').eq('club_id', club.id).order('match_date', { ascending: true }),
      fid ? supabase.from('fixtures').select('*').eq('id', fid).maybeSingle() : Promise.resolve({ data: null }),
    ])
    setFixtures(f || [])
    if (one) setSelected(one)
    if (fid) await loadEvents(fid)
  }, [club.id, loadEvents])

  useEffect(() => {
    const init = async () => {
      const [{ data: f }, { data: p }] = await Promise.all([
        supabase.from('fixtures').select('*').eq('club_id', club.id).order('match_date', { ascending: true }),
        supabase.from('players').select('id,full_name,squad_number,position').eq('club_id', club.id).eq('is_active', true).order('squad_number', { ascending: true }),
      ])
      setFixtures(f || []); setPlayers(p || [])
      const list = f || []
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
      const pick = list.find(x => x.status === 'live') || list.find(x => x.status === 'upcoming' && new Date(x.match_date) >= startOfToday - 864e5) || list[list.length - 1]
      if (pick) { setSelected(pick); await loadEvents(pick.id) }
      setLoading(false)
    }
    init()
  }, [club.id, loadEvents])

  useEffect(() => {
    if (!selected?.id) return
    const fid = selected.id
    const ch = supabase.channel('match-rt-' + fid)
      .on('postgres_changes', { event: '*', schema: 'sportspulse', table: 'match_events', filter: `fixture_id=eq.${fid}` }, () => refresh(fid))
      .on('postgres_changes', { event: 'UPDATE', schema: 'sportspulse', table: 'fixtures', filter: `id=eq.${fid}` }, () => refresh(fid))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [selected?.id, refresh])

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(t) }, [])
  useEffect(() => { setKoTime(selected && nairobiTime(selected.match_date) !== '00:00' ? nairobiTime(selected.match_date) : '') }, [selected?.id, selected?.match_date])

  const choose = async (f) => { setSelected(f); setAction(null); setMsg(null); await loadEvents(f.id) }
  const setStatus = async (patch, ok) => {
    const { error } = await supabase.from('fixtures').update(patch).eq('id', selected.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { setMsg(ok ? { kind: 'ok', text: ok } : null); await refresh(selected.id) }
  }
  const koUnset = selected ? nairobiTime(selected.match_date) === '00:00' : true
  const koMs = selected ? new Date(selected.match_date).getTime() : 0
  const windowState = koUnset ? 'unset' : now < koMs - 30 * 60000 ? 'early' : now > koMs + 4 * 3600000 ? 'late' : 'ok'
  const liveMinute = selected?.status === 'live' ? (selected.started_at ? Math.max(1, Math.min(130, Math.floor((now - new Date(selected.started_at).getTime()) / 60000) + 1)) : (selected.minute || 1)) : null

  const saveKickoff = async () => {
    if (!/^\d{2}:\d{2}$/.test(koTime) || koTime === '00:00') { setMsg({ kind: 'error', text: 'Enter the kick-off time' }); return }
    const iso = new Date(`${nairobiDate(selected.match_date)}T${koTime}:00+03:00`).toISOString()
    await setStatus({ match_date: iso }, `Kick-off set to ${koTime}`)
  }
  const startMatch = async (force = false) => {
    const text = force
      ? `Start the match against ${selected.opponent} now, outside the normal kick-off window?`
      : `Start the match against ${selected.opponent} now? The match clock starts at 1'.`
    if (!confirm(text)) return
    const { error } = await supabase.rpc('start_match', { p_fixture: selected.id, p_force: force })
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { setMsg({ kind: 'ok', text: 'Match started' }); await refresh(selected.id) }
  }
  const cancelStart = async () => {
    const n = events.length
    if (!confirm(`Cancel this match start? The match goes back to Upcoming${n ? ` and its ${n} logged event${n === 1 ? '' : 's'} will be deleted` : ''}. Use this only if the match was started by mistake.`)) return
    const { error } = await supabase.rpc('cancel_match_start', { p_fixture: selected.id })
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { setMsg({ kind: 'ok', text: 'Match start cancelled. It is back to Upcoming.' }); setAction(null); await refresh(selected.id) }
  }
  const endMatch = () => { if (confirm('End the match? You can still add or remove events afterwards.')) setStatus({ status: 'completed' }, 'Match ended') }
  const reopenMatch = () => { if (confirm('Put this match back to live?')) setStatus({ status: 'live' }, 'Match is live again') }
  const resetMatch = async () => {
    if (!confirm(`Reset the match against ${selected.opponent}? This deletes its score and all events and puts it back to Upcoming.`)) return
    const { error } = await supabase.rpc('reset_fixture', { p_fixture: selected.id })
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { setMsg({ kind: 'ok', text: 'Match reset to upcoming' }); setAction(null); await refresh(selected.id) }
  }

  const openAction = (a) => { setAction(a); setMsg(null); setForm({ minute: liveMinute ? String(liveMinute) : (selected.minute ? String(selected.minute) : ''), player_id: '', assist_id: '', off_id: '', notes: '' }) }

  const needsPlayer = (t) => ['goal', 'penalty', 'penalty_missed', 'yellow_card', 'red_card', 'substitution', 'injury'].includes(t)
  const playerLabel = (t) => t === 'substitution' ? 'Player coming ON' : t === 'own_goal' ? 'Player (optional)' : 'Player'
  const logEvent = async () => {
    const t = action.type
    const minute = parseInt(form.minute)
    if (!minute || minute < 1 || minute > 130) { setMsg({ kind: 'error', text: 'Enter the minute (1 to 130)' }); return }
    if (needsPlayer(t) && !form.player_id) { setMsg({ kind: 'error', text: 'Choose the player' }); return }
    if (t === 'substitution' && !form.off_id) { setMsg({ kind: 'error', text: 'Choose the player coming OFF' }); return }
    if (t === 'substitution' && form.off_id === form.player_id) { setMsg({ kind: 'error', text: 'On and off players must be different' }); return }
    if (t === 'note' && !form.notes.trim()) { setMsg({ kind: 'error', text: 'Write the note' }); return }
    if ((t === 'goal' || t === 'penalty') && form.assist_id && form.assist_id === form.player_id) { setMsg({ kind: 'error', text: 'The scorer cannot assist their own goal' }); return }
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('match_events').insert({
      fixture_id: selected.id, club_id: club.id, event_type: t, minute,
      player_id: form.player_id || null,
      assist_player_id: (t === 'goal' || t === 'penalty') && form.assist_id ? form.assist_id : null,
      player_off_id: t === 'substitution' ? form.off_id : null,
      notes: form.notes.trim() || null,
    })
    if (!error && selected.status === 'live') await supabase.from('fixtures').update({ minute }).eq('id', selected.id)
    setSaving(false)
    if (error) { setMsg({ kind: 'error', text: friendly(error.message) }); return }
    setMsg({ kind: 'ok', text: `${a_label(t)} logged at ${minute}'` })
    setAction(null)
    await refresh(selected.id)
  }
  const a_label = (t) => MATCH_ACTIONS.find(a => a.type === t)?.label || t
  const removeEvent = async (evt) => {
    if (!confirm(`Remove "${a_label(evt.event_type)}" at ${evt.minute}'?`)) return
    const { error } = await supabase.from('match_events').delete().eq('id', evt.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else await refresh(selected.id)
  }

  const describe = (e) => {
    const who = e.player?.full_name
    switch (e.event_type) {
      case 'goal': return <>Goal{who && <> — <strong>{who}</strong></>}{e.assist?.full_name && <> (assist {e.assist.full_name})</>}</>
      case 'penalty': return <>Penalty scored{who && <> — <strong>{who}</strong></>}</>
      case 'penalty_missed': return <>Penalty missed{who && <> — <strong>{who}</strong></>}</>
      case 'opponent_goal': return <>Goal for {selected.opponent}{e.notes && <> ({e.notes})</>}</>
      case 'own_goal': return <>Own goal{who && <> — <strong>{who}</strong></>}</>
      case 'yellow_card': return <>Yellow card{who && <> — <strong>{who}</strong></>}</>
      case 'red_card': return <>Red card{who && <> — <strong>{who}</strong></>}</>
      case 'substitution': return <>Substitution — <strong>{who}</strong> on, <strong>{e.off?.full_name}</strong> off</>
      case 'injury': return <>Injury{who && <> — <strong>{who}</strong></>}{e.notes && <> ({e.notes})</>}</>
      default: return <>{e.notes || e.event_type}</>
    }
  }

  if (loading) return <Spinner />
  const st = selected?.status
  const ours = selected ? (selected.is_home ? selected.home_score : selected.away_score) : 0
  const theirs = selected ? (selected.is_home ? selected.away_score : selected.home_score) : 0
  const playerSelect = (key, label) => (
    <div className="form-group"><label>{label}</label><select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}><option value="">Select player</option>{players.map(p => <option key={p.id} value={p.id}>{p.squad_number ? `${p.squad_number} – ` : ''}{p.full_name}</option>)}</select></div>
  )

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Match centre</div><div className="page-sub">{selected ? `${club.short_name || 'BTB'} vs ${selected.opponent}` : 'No matches'}</div></div>
        {canLog && selected && (
          <div className="page-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {st === 'upcoming' && windowState === 'ok' && <button className="btn btn-primary" onClick={() => startMatch(false)}>▶ Start match</button>}
            {st === 'upcoming' && windowState !== 'ok' && isManager && windowState !== 'unset' && <button className="btn btn-ghost" onClick={() => startMatch(true)}>▶ Start anyway</button>}
            {st === 'live' && <button className="btn btn-danger" onClick={endMatch}>■ End match</button>}
            {st === 'live' && <button className="btn btn-ghost" onClick={cancelStart}>Cancel start</button>}
            {st === 'completed' && <button className="btn btn-ghost" onClick={reopenMatch}>↩ Reopen</button>}
            {isManager && st !== 'upcoming' && <button className="btn btn-ghost" onClick={resetMatch}>Reset match</button>}
          </div>
        )}
      </div>
      {msg && <Note kind={msg.kind} style={{ marginBottom: 12 }}>{msg.text}</Note>}
      {fixtures.length > 0 && (
        <div className="filter-pills" style={{ marginBottom: 20, overflowX: 'auto' }}>
          {fixtures.map(f => (
            <button key={f.id} className={`pill ${selected?.id === f.id ? 'active' : ''}`} onClick={() => choose(f)}>
              {f.status === 'live' ? '● ' : ''}{f.opponent.length > 18 ? f.opponent.slice(0, 16) + '…' : f.opponent} · {fmtDate(f.match_date)}
            </button>
          ))}
        </div>
      )}
      {!selected
        ? <div className="empty"><div className="empty-title">No matches yet</div><div className="empty-sub">Add a fixture first to use the match centre</div></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
              <div className="match-hero">
                <div className="match-hero-label">
                  {st === 'live' && <div className="live-pulse"></div>}
                  {selected.competition} · {fmtDate(selected.match_date)} · {venueOf(selected)}
                </div>
                <div className="match-hero-teams">
                  <div className="match-hero-team"><div className="match-hero-team-name">{club.name}</div><div className="match-hero-team-sub">{selected.is_home ? 'Home' : 'Away'}</div></div>
                  <div><div className="match-hero-score">{ours ?? 0} – {theirs ?? 0}</div><div className="match-hero-minute">{st === 'live' ? `${liveMinute}'` : st.toUpperCase()}</div></div>
                  <div className="match-hero-team"><div className="match-hero-team-name">{selected.opponent}</div><div className="match-hero-team-sub">{selected.is_home ? 'Away' : 'Home'}</div></div>
                </div>
              </div>

              {canLog && st === 'upcoming' && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-hdr"><div className="card-title">Kick-off</div></div>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ margin: 0 }}><label>Kick-off time ({fmtDate(selected.match_date)})</label><input type="time" value={koTime} onChange={e => setKoTime(e.target.value)} /></div>
                      <button className="btn btn-ghost" onClick={saveKickoff}>{koUnset ? 'Set kick-off time' : 'Update time'}</button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                      {windowState === 'unset' && 'Set the kick-off time first. The match can then be started from 30 minutes before kick-off.'}
                      {windowState === 'early' && `Kick-off is at ${nairobiTime(selected.match_date)}. The match can be started from ${nairobiTime(koMs - 30 * 60000)}.${isManager ? ' As a manager you can use Start anyway.' : ''}`}
                      {windowState === 'ok' && 'Ready. Press Start match when the whistle blows.'}
                      {windowState === 'late' && `This match was due to kick off at ${nairobiTime(selected.match_date)}, more than 4 hours ago.${isManager ? ' Use Start anyway if it is really being played now.' : ' Ask a manager to start it.'}`}
                    </div>
                  </div>
                </div>
              )}

              {canLog && st !== 'upcoming' && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-hdr"><div className="card-title">Log an action</div></div>
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                      {MATCH_ACTIONS.map(a => (
                        <button key={a.type} onClick={() => openAction(a)} className="btn btn-ghost" style={{ flexDirection: 'column', height: 'auto', padding: '10px 6px', gap: 2, borderColor: action?.type === a.type ? 'var(--btb-gold)' : undefined }}>
                          <span style={{ fontSize: 20 }}>{a.icon}</span><span style={{ fontSize: 12 }}>{a.label}</span>
                        </button>
                      ))}
                    </div>
                    {action && (
                      <div style={{ marginTop: 14, borderTop: '0.5px solid var(--border)', paddingTop: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 10 }}>{action.icon} {action.label}{action.hint ? ` · ${action.hint}` : ''}</div>
                        <div className="form-grid">
                          <div className="form-group"><label>Minute *</label><input type="number" min="1" max="130" value={form.minute} onChange={e => setForm(p => ({ ...p, minute: e.target.value }))} placeholder="e.g. 23" /></div>
                          {(needsPlayer(action.type) || action.type === 'own_goal') && playerSelect('player_id', playerLabel(action.type))}
                          {action.type === 'substitution' && playerSelect('off_id', 'Player coming OFF')}
                          {(action.type === 'goal' || action.type === 'penalty') && playerSelect('assist_id', 'Assist (optional)')}
                          {['opponent_goal', 'injury', 'note', 'red_card', 'yellow_card'].includes(action.type) && (
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>{action.type === 'note' ? 'Note *' : action.type === 'opponent_goal' ? 'Scorer (optional)' : 'Details (optional)'}</label><input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <button className="btn btn-primary" onClick={logEvent} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                          <button className="btn btn-ghost" onClick={() => setAction(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-hdr"><div className="card-title">Match events</div></div>
                {events.length === 0
                  ? <div className="empty" style={{ padding: 24 }}><div className="empty-sub">No events logged yet</div></div>
                  : events.map(evt => (
                    <div key={evt.id} className="activity-item" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14 }}>{EVENT_ICON[evt.event_type] || '📋'}</span>
                      <div className="activity-text" style={{ flex: 1 }}><strong>{evt.minute}'</strong> {describe(evt)}</div>
                      {canLog && <button className="btn btn-ghost btn-sm" onClick={() => removeEvent(evt)} title="Remove this event">✕</button>}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

const waNumber = (phone) => { let n = String(phone || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '254' + n.slice(1); return n }
const waChat = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text || '')}`
const waShare = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
const ABSENCE_REASONS = [['sick', 'Sick / unwell'], ['school', 'School commitment'], ['family', 'Family matter'], ['travel', 'Travelling'], ['injury', 'Injury'], ['other', 'Other']]
const ATT_STATUS = [['present', 'Present', 'var(--green)'], ['late', 'Late', 'var(--amber)'], ['absent', 'Absent', 'var(--red)'], ['excused', 'Excused', 'var(--btb-gold)']]

function AttendanceModal({ club, profile, session, onClose, onSaved }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allCentres, setAllCentres] = useState(false)
  const day = nairobiDate(session.session_date)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      let pq = supabase.from('players').select('id,full_name,squad_number,date_of_birth,age_group_override,training_center_id').eq('club_id', club.id).eq('is_active', true).eq('status', 'active')
      if (session.training_center_id && !allCentres) pq = pq.or(`training_center_id.eq.${session.training_center_id},attends_both.eq.true`)
      const [{ data: pl }, { data: att }, { data: abs }] = await Promise.all([
        pq.order('full_name'),
        supabase.from('training_attendance').select('player_id,status,notes').eq('session_id', session.id),
        supabase.from('absence_reports').select('player_id,reason_type,reason').eq('club_id', club.id).lte('date_from', day).gte('date_to', day),
      ])
      const attMap = Object.fromEntries((att || []).map(a => [a.player_id, a]))
      const absMap = Object.fromEntries((abs || []).map(a => [a.player_id, a]))
      setRows((pl || []).map(p => ({ ...p, status: attMap[p.id]?.status || (absMap[p.id] ? 'excused' : null), saved: !!attMap[p.id], reported: absMap[p.id] || null })))
      setLoading(false)
    }
    load()
  }, [club.id, session.id, session.training_center_id, allCentres, day])

  const setStatus = (id, status) => setRows(r => r.map(p => p.id === id ? { ...p, status: p.status === status ? null : status } : p))
  const markRemaining = (status) => setRows(r => r.map(p => p.status ? p : { ...p, status }))
  const counts = Object.fromEntries(ATT_STATUS.map(([k]) => [k, rows.filter(p => p.status === k).length]))
  const unmarked = rows.filter(p => !p.status).length

  const save = async () => {
    const payload = rows.filter(p => p.status).map(p => ({ session_id: session.id, player_id: p.id, club_id: club.id, status: p.status, marked_by: profile.id, updated_at: new Date().toISOString() }))
    if (payload.length === 0) { setError('Mark at least one player'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('training_attendance').upsert(payload, { onConflict: 'session_id,player_id' })
    setSaving(false)
    if (err && isNetworkError(err.message)) {
      try { const q = JSON.parse(localStorage.getItem('sp-att-queue') || '[]'); q.push(payload); localStorage.setItem('sp-att-queue', JSON.stringify(q)) } catch {}
      onSaved('No signal. Attendance is saved on this phone and will send by itself when you are back online.')
      return
    }
    if (err) { setError(friendly(err.message)); return }
    onSaved()
  }

  return (
    <Modal title={`Attendance · ${session.title.replace('Training · ', '')}`} onClose={onClose} size="modal-lg">
      <div className="modal-body">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{fmtDateTime(session.session_date)} · {session.venue || 'Venue not set'}</div>
        {error && <Note kind="error" style={{ marginBottom: 10 }}>{error}</Note>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => markRemaining('present')}>Everyone else present</button><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tap a name to switch present / absent</span>
          <button className="btn btn-ghost btn-sm" onClick={() => markRemaining('absent')}>All remaining absent</button>
          {session.training_center_id && <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={allCentres} onChange={e => setAllCentres(e.target.checked)} /> Show other centres too</label>}
        </div>
        <div style={{ fontSize: 12, marginBottom: 10 }}>{ATT_STATUS.map(([k, l]) => `${counts[k]} ${l.toLowerCase()}`).join(' · ')} · {unmarked} not marked</div>
        {loading ? <Spinner /> : rows.length === 0 ? <div className="empty"><div className="empty-sub">No active players at this centre yet</div></div> : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {rows.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150, cursor: 'pointer', padding: '6px 0' }} onClick={() => setRows(r => r.map(x => x.id === p.id ? { ...x, status: x.status === 'present' ? 'absent' : 'present' } : x))}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.full_name} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ageGroupOf(p)}</span></div>
                  {p.reported && <div style={{ fontSize: 11, color: 'var(--btb-gold)' }}>Parent reported absence: {ABSENCE_REASONS.find(r => r[0] === p.reported.reason_type)?.[1]}{p.reported.reason ? ` · ${p.reported.reason}` : ''}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {ATT_STATUS.map(([k, l, col]) => <button key={k} onClick={() => setStatus(p.id, k)} className="btn btn-sm" style={{ background: p.status === k ? col : 'transparent', color: p.status === k ? '#000' : 'var(--text-muted)', border: `0.5px solid ${p.status === k ? col : 'var(--border)'}`, padding: '8px 10px', fontSize: 12, minWidth: 44 }}>{l}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading}>{saving ? 'Saving...' : 'Save attendance'}</button>
      </div>
    </Modal>
  )
}

function PlayerAttendance({ player }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.from('training_attendance').select('status, session:training_sessions(title,session_date)').eq('player_id', player.id).then(({ data }) => {
      setRows((data || []).filter(r => r.session).sort((a, b) => new Date(b.session.session_date) - new Date(a.session.session_date)))
    })
  }, [player.id])
  if (!rows) return <Spinner />
  const counted = rows.filter(r => r.status !== 'excused')
  const attended = counted.filter(r => r.status === 'present' || r.status === 'late').length
  const pct = counted.length ? Math.round(attended / counted.length * 100) : null
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {[{ l: 'Attendance', v: pct == null ? '—' : pct + '%' }, ...ATT_STATUS.filter(s => s[0] !== 'late').map(([k, l]) => ({ l, v: rows.filter(r => r.status === k).length }))].map(s => (
          <div key={s.l} style={{ background: 'var(--bg-card2)', borderRadius: 8, padding: 10, textAlign: 'center', border: '0.5px solid var(--border)' }}><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--btb-gold)' }}>{s.v}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.l}</div></div>
        ))}
      </div>
      {rows.length === 0 ? <div className="empty-sub">No attendance recorded yet</div> : rows.slice(0, 15).map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
          <span>{fmtDate(r.session.session_date)} · {r.session.title.replace('Training · ', '')}</span>
          <span className={`badge ${STATUS_COLORS[r.status] || 'badge-gray'}`}>{r.status}</span>
        </div>
      ))}
    </div>
  )
}

function ReportAbsenceModal({ club, profile, kids, onClose, onSaved }) {
  const today = nairobiDate(new Date())
  const [form, setForm] = useState({ player_id: kids[0]?.id || '', date_from: today, date_to: today, reason_type: 'sick', reason: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const minDate = nairobiDate(Date.now() - 7 * 864e5)

  const submit = async () => {
    if (!form.player_id) { setError('Choose the child'); return }
    if (form.date_from < minDate) { setError('You can report absences from the last 7 days onwards'); return }
    if (form.date_to < form.date_from) { setError('The end date cannot be before the start date'); return }
    if (form.reason_type === 'other' && form.reason.trim().length < 3) { setError('Please tell us the reason'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('absence_reports').insert({ club_id: club.id, player_id: form.player_id, reported_by: profile.id, date_from: form.date_from, date_to: form.date_to, reason_type: form.reason_type, reason: form.reason.trim() || null })
    setSaving(false)
    if (err) { setError(friendly(err.message)); return }
    const kid = kids.find(k => k.id === form.player_id)
    const label = ABSENCE_REASONS.find(r => r[0] === form.reason_type)[1]
    setDone({ text: `Hello, this is ${profile.full_name}. ${kid.full_name} will be absent from ${fmtDate(form.date_from)}${form.date_to !== form.date_from ? ' to ' + fmtDate(form.date_to) : ''}. Reason: ${label}${form.reason.trim() ? ' - ' + form.reason.trim() : ''}.` })
  }

  if (done) return (
    <Modal title="Absence reported" onClose={onSaved}>
      <div className="modal-body">
        <Note kind="ok" style={{ marginBottom: 12 }}>The academy has been told. Coaches will see this when they take attendance.</Note>
        {club.whatsapp_number && <a className="btn btn-ghost" href={waChat(club.whatsapp_number, done.text)} target="_blank" rel="noreferrer">Also message the academy on WhatsApp</a>}
      </div>
      <div className="modal-footer"><button className="btn btn-primary" onClick={onSaved}>Done</button></div>
    </Modal>
  )

  return (
    <Modal title="Report an absence" onClose={onClose}>
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Child *</label><select value={form.player_id} onChange={e => set('player_id', e.target.value)}>{kids.map(k => <option key={k.id} value={k.id}>{k.full_name}</option>)}</select></div>
          <div className="form-group"><label>From *</label><input type="date" min={minDate} value={form.date_from} onChange={e => { set('date_from', e.target.value); if (form.date_to < e.target.value) set('date_to', e.target.value) }} /></div>
          <div className="form-group"><label>Until *</label><input type="date" min={form.date_from} value={form.date_to} onChange={e => set('date_to', e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Reason *</label><select value={form.reason_type} onChange={e => set('reason_type', e.target.value)}>{ABSENCE_REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Details{form.reason_type === 'other' ? ' *' : ' (optional)'}</label><textarea rows={3} maxLength={500} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Anything the coaches should know" /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Sending...' : 'Report absence'}</button>
      </div>
    </Modal>
  )
}

function AbsencesPage({ club, profile }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('upcoming')
  const [msg, setMsg] = useState(null)
  const today = nairobiDate(new Date())

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('absence_reports')
      .select('*, player:players(full_name), reporter:profiles!absence_reports_reported_by_fkey(full_name,phone)')
      .eq('club_id', club.id).order('date_from', { ascending: true })
    if (error) setMsg({ kind: 'error', text: friendly(error.message) })
    setRows(data || []); setLoading(false)
  }, [club.id])
  useEffect(() => { load() }, [load])

  const ack = async (r) => {
    const { error } = await supabase.from('absence_reports').update({ status: 'acknowledged', acknowledged_by: profile.id, acknowledged_at: new Date().toISOString() }).eq('id', r.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else load()
  }

  const shown = rows.filter(r => view === 'upcoming' ? r.date_to >= today : r.date_to < today)
  if (view === 'past') shown.reverse()
  if (loading) return <PageSkeleton rows={3} />

  return (
    <div className="page">
      <div className="page-hdr"><div><div className="page-title">Absences</div><div className="page-sub">Reported by parents</div></div></div>
      {msg && <Note kind={msg.kind} style={{ marginBottom: 12 }}>{msg.text}</Note>}
      <div className="filter-pills">{[['upcoming', 'Current & upcoming'], ['past', 'Past']].map(([k, l]) => <button key={k} className={`pill ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>)}</div>
      {shown.length === 0 ? <EmptyState icon="userx" title="No absence reports" sub="When a parent reports an absence it will show here." /> : shown.map(r => (
        <div key={r.id} className="card" style={{ marginBottom: 10 }}>
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700 }}>{r.player?.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(r.date_from)}{r.date_to !== r.date_from ? ` – ${fmtDate(r.date_to)}` : ''} · {ABSENCE_REASONS.find(x => x[0] === r.reason_type)?.[1]}</div>
              {r.reason && <div style={{ fontSize: 13, marginTop: 4 }}>{r.reason}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Reported by {r.reporter?.full_name || 'parent'} · {timeAgo(r.created_at)}</div>
            </div>
            <span className={`badge ${r.status === 'acknowledged' ? 'badge-green' : 'badge-amber'}`}>{r.status === 'acknowledged' ? 'Seen' : 'New'}</span>
            {r.reporter?.phone && <a className="btn btn-ghost btn-sm" href={waChat(r.reporter.phone, `Hello ${r.reporter.full_name}, thank you for letting us know that ${r.player?.full_name} will be absent. - ${club.name}`)} target="_blank" rel="noreferrer">WhatsApp</a>}
            {r.status === 'reported' && <button className="btn btn-primary btn-sm" onClick={() => ack(r)}>Mark seen</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

// Shrink big phone photos before upload so storage and loading stay light.
async function shrinkImage(file, maxSide = 1600) {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height)
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85))
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch { return file }
}

function PlayerMedia({ player, club, profile, canEdit }) {
  const [items, setItems] = useState(null)
  const [urls, setUrls] = useState({})
  const [open, setOpen] = useState(null)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState({ title: '', url: '' })
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)
  const BUCKET = 'sportspulse-media'

  const load = useCallback(async () => {
    const { data } = await supabase.from('player_media').select('*').eq('player_id', player.id).order('created_at', { ascending: false })
    setItems(data || [])
    const paths = (data || []).filter(m => m.file_path).map(m => m.file_path)
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
      setUrls(Object.fromEntries((signed || []).filter(s => s.signedUrl).map(s => [s.path, s.signedUrl])))
    }
  }, [player.id])
  useEffect(() => { load() }, [load])

  const upload = async (e) => {
    const files = Array.from(e.target.files || []); e.target.value = ''
    if (!files.length) return
    setMsg(null); let ok = 0; const bad = []
    for (let i = 0; i < files.length; i++) {
      setBusy(`Uploading ${i + 1} of ${files.length}...`)
      let f = files[i]; const isVideo = f.type.startsWith('video/'); const isImage = f.type.startsWith('image/')
      if (!isVideo && !isImage) { bad.push(`${f.name}: not a photo or video`); continue }
      if (isVideo && f.size > 50 * 1024 * 1024) { bad.push(`${f.name}: video is over 50 MB (upload it to YouTube or Drive and add a link instead)`); continue }
      if (isImage) { if (f.size > 15 * 1024 * 1024) { bad.push(`${f.name}: photo is too large`); continue } f = await shrinkImage(f) }
      const ext = (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
      const path = `${player.id}/${Date.now()}-${i}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type })
      if (upErr) { bad.push(`${f.name}: ${upErr.message}`); continue }
      const { error: dbErr } = await supabase.from('player_media').insert({ club_id: club.id, player_id: player.id, kind: isVideo ? 'video' : 'photo', title: title.trim() || null, file_path: path, uploaded_by: profile?.id || null })
      if (dbErr) { bad.push(`${f.name}: ${dbErr.message}`); await supabase.storage.from(BUCKET).remove([path]); continue }
      ok++
    }
    setBusy(''); setTitle('')
    setMsg(bad.length ? { kind: 'warn', text: `${ok} uploaded. Problems: ${bad.join('; ')}` } : { kind: 'ok', text: `${ok} file${ok === 1 ? '' : 's'} uploaded` })
    load()
  }

  const addLink = async () => {
    if (!/^https:\/\/\S+$/i.test(link.url.trim())) { setMsg({ kind: 'error', text: 'Paste a full link starting with https://' }); return }
    setBusy('Saving link...')
    const { error } = await supabase.from('player_media').insert({ club_id: club.id, player_id: player.id, kind: 'link', title: link.title.trim() || 'Highlights', external_url: link.url.trim(), uploaded_by: profile?.id || null })
    setBusy('')
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { setLink({ title: '', url: '' }); setMsg({ kind: 'ok', text: 'Link added' }); load() }
  }

  const remove = async (m) => {
    if (!confirm('Delete this item? This cannot be undone.')) return
    if (m.file_path) await supabase.storage.from(BUCKET).remove([m.file_path])
    const { error } = await supabase.from('player_media').delete().eq('id', m.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { setOpen(null); load() }
  }

  if (!items) return <Spinner />

  return (
    <div>
      {msg && <Note kind={msg.kind} style={{ marginBottom: 10 }}>{msg.text}</Note>}
      {canEdit && (
        <div style={{ background: 'var(--bg-card2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} maxLength={120} style={{ flex: 1, minWidth: 140 }} />
            <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>{busy.startsWith('Uploading') ? busy : '+ Photos / videos'}<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} onChange={upload} disabled={!!busy} /></label>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 10px' }}>Photos are resized automatically. Videos up to 50 MB. For longer highlights add a YouTube or Drive link below.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="Link title" value={link.title} onChange={e => setLink(l => ({ ...l, title: e.target.value }))} style={{ width: 140 }} />
            <input placeholder="https://youtu.be/..." value={link.url} onChange={e => setLink(l => ({ ...l, url: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
            <button className="btn btn-ghost btn-sm" onClick={addLink} disabled={!!busy}>Add link</button>
          </div>
        </div>
      )}
      {items.length === 0 ? <div className="empty"><div className="empty-sub">No photos or highlights yet</div></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
          {items.map(m => (
            <div key={m.id} onClick={() => setOpen(m)} style={{ position: 'relative', aspectRatio: '1', background: 'var(--bg-card2)', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {m.kind === 'photo' && urls[m.file_path] && <img src={urls[m.file_path]} alt={m.title || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              {m.kind === 'video' && <><video src={urls[m.file_path] ? urls[m.file_path] + '#t=0.5' : undefined} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /><span style={{ position: 'absolute', fontSize: 28, textShadow: '0 0 6px #000' }}>▶</span></>}
              {m.kind === 'link' && <div style={{ textAlign: 'center', padding: 8 }}><div style={{ fontSize: 26 }}>🔗</div><div style={{ fontSize: 11, marginTop: 4 }}>{m.title}</div></div>}
            </div>
          ))}
        </div>
      )}
      {open && (
        <Modal title={open.title || (open.kind === 'link' ? 'Highlights' : open.kind === 'video' ? 'Video' : 'Photo')} onClose={() => setOpen(null)} size="modal-lg">
          <div className="modal-body" style={{ textAlign: 'center' }}>
            {open.kind === 'photo' && <img src={urls[open.file_path]} alt={open.title || ''} style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 8 }} />}
            {open.kind === 'video' && <video src={urls[open.file_path]} controls playsInline style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 8 }} />}
            {open.kind === 'link' && <a className="btn btn-primary" href={open.external_url} target="_blank" rel="noopener noreferrer">Open link ↗</a>}
            {open.caption && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{open.caption}</p>}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>Added {fmtDate(open.created_at)}</div>
            {canEdit && <div style={{ marginTop: 12 }}><button className="btn btn-ghost btn-sm" onClick={() => remove(open)}>Delete</button></div>}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------- Batch 2: printable receipts / statements, CSV export, parent edit screens
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))

function printDoc(title, body) {
  const w = window.open('', '_blank')
  if (!w) { alert('Please allow pop-ups for this site to open the document.'); return }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:720px;margin:0 auto;padding:20px}
  h1{font-size:20px;margin:0}h2{font-size:15px;margin:18px 0 6px}.muted{color:#666;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}th,td{text-align:left;padding:7px 6px;border-bottom:1px solid #ddd}th{background:#f3f3f3}
  .r{text-align:right}.total{font-weight:700}.head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #111;padding-bottom:10px}
  .head img{width:56px;height:56px;border-radius:8px}.np{margin-top:24px}button{padding:10px 18px;font-size:14px}
  @media print{.np{display:none}}</style></head><body>${body}<p class="np"><button onclick="window.print()">Print / Save as PDF</button></p></body></html>`)
  w.document.close()
}

const docHead = (club, title) => `<div class="head"><img src="${window.location.origin}${LOGO}" alt=""><div><h1>${esc(club.name)}</h1><div class="muted">${esc(title)}</div></div></div>`
const feeDate = (f) => new Date(f.updated_at || f.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
const feeBalance = (f) => f.status === 'waived' ? 0 : Math.max(0, (f.amount || 0) - (f.paid_amount || 0))

function printReceipt(fee, club) {
  const no = 'R-' + String(fee.id).slice(0, 8).toUpperCase()
  printDoc('Receipt ' + no, `${docHead(club, 'Payment receipt')}
    <h2>Receipt ${esc(no)}</h2>
    <table><tr><td>Player</td><td class="r">${esc(fee.player?.full_name)}</td></tr>
    <tr><td>For</td><td class="r">${esc(fee.description)}</td></tr>
    <tr><td>Fee amount</td><td class="r">${esc(fmtKES(fee.amount))}</td></tr>
    <tr><td>Amount paid</td><td class="r total">${esc(fmtKES(fee.paid_amount))}</td></tr>
    <tr><td>Balance</td><td class="r">${esc(fmtKES(feeBalance(fee)))}</td></tr>
    <tr><td>Method</td><td class="r">${esc(fee.payment_method || '—')}</td></tr>
    <tr><td>Reference</td><td class="r">${esc(fee.mpesa_ref || '—')}</td></tr>
    <tr><td>Date recorded</td><td class="r">${esc(feeDate(fee))}</td></tr></table>
    <p class="muted">Thank you for being part of ${esc(club.name)}.</p>`)
}

function printStatement(fees, club, who) {
  const rows = [...fees].sort((a, b) => new Date(a.due_date || a.created_at) - new Date(b.due_date || b.created_at))
  const owed = rows.reduce((s, f) => s + feeBalance(f), 0), paid = rows.reduce((s, f) => s + (f.paid_amount || 0), 0)
  printDoc('Fee statement', `${docHead(club, 'Fee statement')}
    <p class="muted">${esc(who)} · generated ${esc(new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
    <table><tr><th>Player</th><th>Item</th><th>Due</th><th class="r">Amount</th><th class="r">Paid</th><th class="r">Balance</th><th>Status</th></tr>
    ${rows.map(f => `<tr><td>${esc(f.player?.full_name)}</td><td>${esc(f.description)}</td><td>${esc(f.due_date ? fmtDate(f.due_date) : '—')}</td><td class="r">${esc(fmtKES(f.amount))}</td><td class="r">${esc(fmtKES(f.paid_amount))}</td><td class="r">${esc(fmtKES(feeBalance(f)))}</td><td>${esc(f.status)}</td></tr>`).join('')}
    <tr class="total"><td colspan="4">Total paid</td><td class="r">${esc(fmtKES(paid))}</td><td class="r">${esc(fmtKES(owed))}</td><td>outstanding</td></tr></table>`)
}

function downloadCsv(filename, rows) {
  const cell = (v) => { let t = String(v ?? ''); if (/^[=+\-@]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"' }
  const blob = new Blob(['﻿' + rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

function EditContactModal({ profile, onClose, onSaved }) {
  const [f, setF] = useState({ full_name: profile.full_name || '', phone: profile.phone || '', alt_phone: profile.alt_phone || '', residence: profile.residence || '', alt_contact_name: profile.alt_contact_name || '', alt_contact_relationship: profile.alt_contact_relationship || '', alt_contact_phone: profile.alt_contact_phone || '' })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const save = async () => {
    setSaving(true); setError('')
    const { error: err } = await supabase.rpc('update_my_contact', { p: f })
    setSaving(false)
    if (err) setError(friendly(err.message)); else onSaved()
  }
  return (
    <Modal title="My contact details" onClose={onClose}>
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="form-grid">
          <FormField label="Parent / guardian's full name *" full><input value={f.full_name} onChange={e => set('full_name', e.target.value)} maxLength={100} /></FormField>
          <FormField label="Phone / WhatsApp *"><input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} /></FormField>
          <FormField label="Second phone number"><input type="tel" value={f.alt_phone} onChange={e => set('alt_phone', e.target.value)} /></FormField>
          <FormField label="Where you live *" full><input value={f.residence} onChange={e => set('residence', e.target.value)} /></FormField>
          <FormField label="Alternative contact's full name *" full><input value={f.alt_contact_name} onChange={e => set('alt_contact_name', e.target.value)} /></FormField>
          <FormField label="Their relationship to the child *"><input value={f.alt_contact_relationship} onChange={e => set('alt_contact_relationship', e.target.value)} /></FormField>
          <FormField label="Their phone number *"><input type="tel" value={f.alt_contact_phone} onChange={e => set('alt_contact_phone', e.target.value)} /></FormField>
        </div>
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </Modal>
  )
}

function EditChildModal({ player, onClose, onSaved }) {
  const [f, setF] = useState({ home_address: player.home_address || '', school_name: player.school_name || '', school_grade: player.school_grade || '', medical_conditions: player.medical_conditions || '', allergies: player.allergies || '', height_cm: player.height_cm ?? '', weight_kg: player.weight_kg ?? '', position_detail: player.position_detail || '', dominant_foot: player.dominant_foot || 'Right' })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const save = async () => {
    setSaving(true); setError('')
    const { error: err } = await supabase.rpc('update_child_details', { p_player: player.id, p: { ...f, height_cm: String(f.height_cm ?? ''), weight_kg: String(f.weight_kg ?? '') } })
    setSaving(false)
    if (err) setError(friendly(err.message)); else onSaved()
  }
  return (
    <Modal title={`Update ${player.full_name.split(' ')[0]}'s details`} onClose={onClose}>
      <div className="modal-body">
        <Note kind="info" style={{ marginBottom: 12 }}>To change the name, date of birth, training centre or fees, please contact the academy.</Note>
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="form-grid">
          <FormField label="Where the child lives *" full><input value={f.home_address} onChange={e => set('home_address', e.target.value)} /></FormField>
          <FormField label="School *"><input value={f.school_name} onChange={e => set('school_name', e.target.value)} /></FormField>
          <FormField label="Grade / class"><input value={f.school_grade} onChange={e => set('school_grade', e.target.value)} /></FormField>
          <FormField label="Medical conditions" full><textarea value={f.medical_conditions} onChange={e => set('medical_conditions', e.target.value)} /></FormField>
          <FormField label="Allergies" full><textarea value={f.allergies} onChange={e => set('allergies', e.target.value)} /></FormField>
          <FormField label="Height (cm)"><input type="number" value={f.height_cm} onChange={e => set('height_cm', e.target.value)} /></FormField>
          <FormField label="Weight (kg)"><input type="number" value={f.weight_kg} onChange={e => set('weight_kg', e.target.value)} /></FormField>
          <FormField label="Position detail"><input value={f.position_detail} onChange={e => set('position_detail', e.target.value)} /></FormField>
          <FormField label="Dominant foot"><select value={f.dominant_foot} onChange={e => set('dominant_foot', e.target.value)}>{['Right', 'Left', 'Both'].map(x => <option key={x}>{x}</option>)}</select></FormField>
        </div>
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </Modal>
  )
}

function FeeOverview({ fees, centers }) {
  const [open, setOpen] = useState(false)
  const real = fees.filter(f => f.status !== 'waived')
  const group = (keyFn) => {
    const m = {}
    real.forEach(f => { const k = keyFn(f); m[k] = m[k] || { billed: 0, paid: 0 }; m[k].billed += f.amount || 0; m[k].paid += f.paid_amount || 0 })
    return Object.entries(m)
  }
  const centreName = (id) => centers.find(c => c.id === id)?.name || 'No centre'
  const byCentre = group(f => centreName(f.player?.training_center_id)).sort()
  const byMonth = group(f => (f.due_date || f.created_at || '').slice(0, 7)).sort((a, b) => b[0].localeCompare(a[0]))
  const Table = ({ title, rows, label }) => (
    <div style={{ flex: 1, minWidth: 260 }}>
      <div style={{ fontWeight: 700, fontSize: 13, margin: '10px 0 6px' }}>{title}</div>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th style={{ textAlign: 'left' }}>{label}</th><th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Collected</th><th style={{ textAlign: 'right' }}>Owed</th></tr></thead>
        <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{fmtKES(v.billed)}</td><td style={{ textAlign: 'right' }}>{fmtKES(v.paid)}</td><td style={{ textAlign: 'right', color: v.billed - v.paid > 0 ? 'var(--red)' : 'var(--green)' }}>{fmtKES(Math.max(0, v.billed - v.paid))}</td></tr>)}</tbody>
      </table>
    </div>
  )
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-hdr" style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}><div className="card-title">Money overview {open ? '▾' : '▸'}</div></div>
      {open && <div className="card-body" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <Table title="By training centre" rows={byCentre} label="Centre" />
        <Table title="By month" rows={byMonth} label="Month" />
      </div>}
    </div>
  )
}

// ---------- Batch 3: offline attendance queue, match squad, error reporting
const isNetworkError = (m) => /failed to fetch|networkerror|load failed|network request failed/i.test(String(m || ''))

async function flushAttendanceQueue() {
  let q = []
  try { q = JSON.parse(localStorage.getItem('sp-att-queue') || '[]') } catch { q = [] }
  if (!q.length) return 0
  const rest = []; let sent = 0
  for (const batch of q) {
    const { error } = await supabase.from('training_attendance').upsert(batch, { onConflict: 'session_id,player_id' })
    if (error && isNetworkError(error.message)) rest.push(batch)
    else if (!error) sent += batch.length
  }
  try { localStorage.setItem('sp-att-queue', JSON.stringify(rest)) } catch {}
  return sent
}

const errCtx = { clubId: null, userId: null, count: 0 }
async function reportClientError(err) {
  try {
    if (!errCtx.userId || errCtx.count >= 5) return
    errCtx.count++
    await supabase.from('app_errors').insert({ club_id: errCtx.clubId, user_id: errCtx.userId, message: String(err?.message || err).slice(0, 900), stack: String(err?.stack || '').slice(0, 3800), page: String(window.location.pathname).slice(0, 250) })
  } catch {}
}
if (typeof window !== 'undefined' && !window.__spErr) {
  window.__spErr = true
  window.addEventListener('error', e => reportClientError(e.error || e.message))
  window.addEventListener('unhandledrejection', e => reportClientError(e.reason))
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { reportClientError(err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', background: '#0a0f1e', color: '#fff' }}>
        <img src={LOGO} alt="" style={{ width: 64, height: 64, borderRadius: 12 }} />
        <h2 style={{ margin: 0 }}>Something went wrong</h2>
        <p style={{ margin: 0, opacity: 0.8, maxWidth: 320 }}>Sorry about that. The academy has been told. Please reload the app and try again.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
}

const SQUAD_ROLES = [['starter', 'Starts', 'var(--green)'], ['sub', 'Bench', 'var(--amber)'], ['unavailable', 'Out', 'var(--red)']]

function MatchSquadModal({ club, fixture, profile, onClose, onSaved }) {
  const [players, setPlayers] = useState([])
  const [roles, setRoles] = useState({})
  const [orig, setOrig] = useState({})
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [age, setAge] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('players').select('id,full_name,squad_number,date_of_birth,age_group_override,position,status').eq('club_id', club.id).eq('is_active', true).in('status', ['active', 'injured']).order('full_name'),
      supabase.from('match_squad').select('player_id,role').eq('fixture_id', fixture.id),
      supabase.from('match_notes').select('notes').eq('fixture_id', fixture.id).maybeSingle(),
    ]).then(([{ data: pl }, { data: sq }, { data: nt }]) => {
      const m = Object.fromEntries((sq || []).map(r => [r.player_id, r.role]))
      setPlayers(pl || []); setRoles(m); setOrig(m); setNotes(nt?.notes || ''); setLoading(false)
    })
  }, [club.id, fixture.id])

  const setRole = (id, r) => setRoles(x => { const n = { ...x }; if (n[id] === r) delete n[id]; else n[id] = r; return n })
  const count = (r) => Object.values(roles).filter(v => v === r).length
  const ages = AGE_GROUPS.filter(g => players.some(p => ageGroupOf(p) === g))
  const shown = players.filter(p => (age === 'all' || ageGroupOf(p) === age) && (!search || p.full_name.toLowerCase().includes(search.toLowerCase())))

  const save = async () => {
    setSaving(true); setError('')
    const upserts = Object.entries(roles).filter(([id, r]) => orig[id] !== r).map(([id, r]) => ({ club_id: club.id, fixture_id: fixture.id, player_id: id, role: r }))
    const removed = Object.keys(orig).filter(id => !roles[id])
    let err = null
    if (upserts.length) ({ error: err } = await supabase.from('match_squad').upsert(upserts, { onConflict: 'fixture_id,player_id' }))
    if (!err && removed.length) ({ error: err } = await supabase.from('match_squad').delete().eq('fixture_id', fixture.id).in('player_id', removed))
    if (!err) ({ error: err } = await supabase.from('match_notes').upsert({ fixture_id: fixture.id, club_id: club.id, notes: notes.trim(), updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'fixture_id' }))
    setSaving(false)
    if (err) setError(friendly(err.message)); else onSaved()
  }

  const nameOf = (id) => players.find(p => p.id === id)?.full_name
  const shareText = () => {
    const list = (r) => Object.entries(roles).filter(([, v]) => v === r).map(([id]) => nameOf(id)).filter(Boolean).sort().join(', ')
    return `⚽ ${club.name} vs ${fixture.opponent}\n${fmtDate(fixture.match_date)} ${fmtTime(fixture.match_date)}${fixture.venue ? '\n📍 ' + fixture.venue : ''}\n\nStarting: ${list('starter') || 'to be confirmed'}\nBench: ${list('sub') || '-'}`
  }

  return (
    <Modal title={`Squad · vs ${fixture.opponent}`} onClose={onClose} size="modal-lg">
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 10 }}>{error}</Note>}
        <div style={{ fontSize: 12, marginBottom: 10 }}>{count('starter')} starting · {count('sub')} on the bench · {count('unavailable')} out</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <select value={age} onChange={e => setAge(e.target.value)} style={{ width: 120 }}><option value="all">All ages</option>{ages.map(g => <option key={g}>{g}</option>)}</select>
        </div>
        {loading ? <Spinner /> : (
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {shown.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140, fontSize: 13, fontWeight: 600 }}>{p.full_name} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ageGroupOf(p)} · {p.position || ''}{p.status === 'injured' ? ' · injured' : ''}</span></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {SQUAD_ROLES.map(([k, l, col]) => <button key={k} onClick={() => setRole(p.id, k)} className="btn btn-sm" style={{ background: roles[p.id] === k ? col : 'transparent', color: roles[p.id] === k ? '#000' : 'var(--text-muted)', border: `0.5px solid ${roles[p.id] === k ? col : 'var(--border)'}`, padding: '6px 10px', fontSize: 12 }}>{l}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Coach notes (private, staff only)</label>
          <textarea rows={3} maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tactics, what went well, who to work with..." />
        </div>
      </div>
      <div className="modal-footer">
        <a className="btn btn-ghost" href={waShare(shareText())} target="_blank" rel="noreferrer">Share squad on WhatsApp</a>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading}>{saving ? 'Saving...' : 'Save squad'}</button>
      </div>
    </Modal>
  )
}

function PlayerPricing({ player, club, onSaved }) {
  const [monthly, setMonthly] = useState(player.custom_monthly_fee ?? '')
  const [apply, setApply] = useState(true)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true); setMsg(null)
    const { data, error } = await supabase.rpc('set_player_price', { p_player: player.id, p_monthly: monthly === '' ? null : parseInt(monthly), p_apply_open: apply })
    setBusy(false)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) })
    else { setMsg({ kind: 'ok', text: `Saved.${apply ? ` ${data} unpaid monthly fee${data === 1 ? '' : 's'} updated.` : ''}` }); onSaved() }
  }
  return (
    <div>
      {msg && <Note kind={msg.kind} style={{ marginBottom: 10 }}>{msg.text}</Note>}
      <div style={{ fontSize: 13, marginBottom: 10 }}>Standard monthly fee is <strong>{fmtKES(club.monthly_fee ?? 2500)}</strong>. Set a custom amount for {player.full_name.split(' ')[0]}, or leave it blank to use the standard fee. To change a single fee, use Edit on the Fees page.</div>
      <FormField label="Custom monthly fee (KES)"><input type="number" min="1" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="Standard fee" /></FormField>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '12px 0' }}><input type="checkbox" style={{ width: 'auto' }} checked={apply} onChange={e => setApply(e.target.checked)} /> Also update monthly fees that are still completely unpaid</label>
      <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save price'}</button>
    </div>
  )
}

function EditFeeModal({ fee, onClose, onSaved }) {
  const [f, setF] = useState({ description: fee.description || '', amount: fee.amount ?? '', due_date: fee.due_date || '', waived: fee.status === 'waived' })
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const paid = fee.paid_amount || 0
  const save = async () => {
    const amt = parseInt(f.amount)
    if (f.description.trim().length < 2) { setError('Enter a description'); return }
    if (isNaN(amt) || amt < 0) { setError('Enter a valid amount'); return }
    if (!f.waived && amt < paid) { setError(`${fmtKES(paid)} has already been paid, so the amount cannot be lower than that`); return }
    const status = f.waived ? 'waived' : paid >= amt && amt > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    setSaving(true); setError('')
    const { error: err } = await supabase.from('fees').update({ description: f.description.trim(), amount: amt, due_date: f.due_date || null, status }).eq('id', fee.id)
    setSaving(false)
    if (err) setError(friendly(err.message)); else onSaved()
  }
  return (
    <Modal title={`Edit fee · ${fee.player?.full_name || ''}`} onClose={onClose}>
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="form-grid">
          <FormField label="Description *" full><input value={f.description} onChange={e => set('description', e.target.value)} maxLength={150} /></FormField>
          <FormField label="Amount (KES) *"><input type="number" min="0" value={f.amount} onChange={e => set('amount', e.target.value)} /></FormField>
          <FormField label="Due date"><input type="date" value={f.due_date} onChange={e => set('due_date', e.target.value)} /></FormField>
        </div>
        {paid > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Already paid: {fmtKES(paid)}</div>}
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 12 }}><input type="checkbox" style={{ width: 'auto' }} checked={f.waived} onChange={e => set('waived', e.target.checked)} /> Waived (sponsored or forgiven)</label>
      </div>
      <div className="modal-footer"><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
    </Modal>
  )
}

// ---------- Design system pieces: icons, empty states, skeletons, attention tiles
const ICON_PATHS = {
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><circle cx="17.5" cy="9" r="2.5" /><path d="M17 14c3 0 4.5 2 4.5 5" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z" /><path d="M12 3v5M20.5 9.5l-5-1M3.5 9.5l5-1M17.5 19l-3.3-4.5M6.5 19l3.3-4.5" /></>,
  pulse: <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />,
  userx: <><circle cx="10" cy="8" r="3.5" /><path d="M3 20c0-3.5 3-6 7-6" /><path d="M15 15l5 5M20 15l-5 5" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16.5" cy="14.5" r="1" /></>,
  message: <path d="M4 5h16v11H9l-5 4z" />,
  chart: <path d="M4 20V11M10 20V4M16 20v-6M22 20H2" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0113 0c0 5.5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6h-5l-1.5 2.5h-5L8 13z" /></>,
}
function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{ICON_PATHS[name]}</svg>
}

const CENTRE_COLORS = ['#5b8cff', '#e0b43c', '#3fb97e', '#b184f5']
const centreColor = (name = '') => { let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 997; return CENTRE_COLORS[h % CENTRE_COLORS.length] }

function EmptyState({ icon = 'inbox', title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
      <div style={{ opacity: 0.6, marginBottom: 10 }}><Icon name={icon} size={36} /></div>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13, marginBottom: action ? 14 : 0 }}>{sub}</div>}
      {action}
    </div>
  )
}

function PageSkeleton({ rows = 5 }) {
  return (
    <div className="page" aria-busy="true">
      <div className="skel" style={{ height: 34, width: 200, marginBottom: 8 }} />
      <div className="skel" style={{ height: 16, width: 280, marginBottom: 22 }} />
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skel" />)}
    </div>
  )
}

function AttentionTiles({ club, pending, setPage }) {
  const [t, setT] = useState(null)
  useEffect(() => {
    const today = todayNairobi()
    const next = nairobiDate(Date.now() + 864e5)
    Promise.all([
      supabase.from('fees').select('amount,paid_amount').eq('club_id', club.id).in('status', ['unpaid', 'partial']).lt('due_date', today),
      supabase.from('training_sessions').select('id', { count: 'exact', head: true }).eq('club_id', club.id).gte('session_date', `${today}T00:00:00+03:00`).lt('session_date', `${next}T00:00:00+03:00`),
      supabase.from('absence_reports').select('id', { count: 'exact', head: true }).eq('club_id', club.id).eq('status', 'reported').gte('date_to', today),
    ]).then(([{ data: f }, { count: s }, { count: a }]) => {
      const od = f || []
      setT({ overdueN: od.length, overdueSum: od.reduce((x, y) => x + (y.amount - (y.paid_amount || 0)), 0), sessions: s || 0, absences: a || 0 })
    })
  }, [club.id])
  const tiles = [
    { icon: 'check', label: 'Registrations to approve', value: pending, page: 'approvals', hot: pending > 0 },
    { icon: 'wallet', label: t ? `Overdue fees (${t.overdueN})` : 'Overdue fees', value: t ? fmtKES(t.overdueSum) : '…', page: 'fees', hot: t && t.overdueN > 0 },
    { icon: 'pulse', label: "Today's training", value: t ? t.sessions : '…', page: 'training', hot: false },
    { icon: 'userx', label: 'New absence reports', value: t ? t.absences : '…', page: 'absences', hot: t && t.absences > 0 },
  ]
  return (
    <div className="tiles">
      {tiles.map(x => (
        <button key={x.label} className={`tile ${x.hot ? 'hot' : ''}`} onClick={() => setPage(x.page)}>
          <span className="tile-ico"><Icon name={x.icon} size={20} /></span>
          <span className="tile-val">{x.value}</span>
          <span className="tile-lbl">{x.label}</span>
        </button>
      ))}
    </div>
  )
}

const dayLabel = (k) => {
  const nice = asDate(k).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: NAIROBI })
  if (k === todayNairobi()) return 'Today · ' + nice
  if (k === nairobiDate(Date.now() + 864e5)) return 'Tomorrow · ' + nice
  return nice
}

function TrainingPage({ club, userRole, profile }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState('upcoming')
  const [attSession, setAttSession] = useState(null)
  const [attMsg, setAttMsg] = useState('')
  const isStaffT = userRole === 'manager' || userRole === 'coach'

  const load = useCallback(async () => {
    const { data } = await supabase.from('training_sessions').select('*').eq('club_id', club.id).order('session_date', { ascending: true })
    setSessions(data || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const shownSessions = sessions.filter(s => view === 'upcoming' ? new Date(s.session_date) >= startOfToday : new Date(s.session_date) < startOfToday)
  if (view === 'past') shownSessions.reverse()

  if (loading) return <PageSkeleton />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Training</div><div className="page-sub">Session schedule and attendance</div></div>
        {(userRole === 'manager' || userRole === 'coach') && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add session</button>}
      </div>
      <div className="filter-pills">{[['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, l]) => <button key={k} className={`pill ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>)}</div>
      {shownSessions.length === 0
        ? <EmptyState icon="calendar" title={view === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'} sub={isStaffT && view === 'upcoming' ? 'Schedule the next training session.' : undefined} action={isStaffT && view === 'upcoming' ? <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add session</button> : null} />
        : (() => {
          const groups = []
          shownSessions.forEach(x => { const k = nairobiDate(x.session_date); let g = groups[groups.length - 1]; if (!g || g.k !== k) { g = { k, items: [] }; groups.push(g) } g.items.push(x) })
          return groups.map(g => (
            <div key={g.k}>
              <div className="day-hdr">{dayLabel(g.k)}</div>
              {g.items.map(x => {
                const tm = nairobiTime(x.session_date)
                const title = x.title.replace(/^Training\s*·\s*/, '') || x.title
                return (
                  <div key={x.id} className="rc">
                    <div className="rc-time"><b>{tm === '00:00' ? 'TBA' : tm}</b><span>{x.duration_mins ? `${x.duration_mins} min` : ''}</span></div>
                    <div className="rc-main">
                      <div className="rc-title">{title}</div>
                      {x.notes && <div className="rc-sub">{x.notes}</div>}
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {x.venue && <span className="tag" style={{ color: centreColor(x.venue) }}><i />{x.venue}</span>}
                        {x.session_type && <span className="tag" style={{ color: 'var(--text-muted)' }}>{String(x.session_type).replace('_', ' ')}</span>}
                      </div>
                    </div>
                    {isStaffT && <button className="btn btn-ghost btn-sm" onClick={() => setAttSession(x)}>Attendance</button>}
                  </div>
                )
              })}
            </div>
          ))
        })()}
      {attMsg && <Note kind="ok" style={{ marginTop: 12 }}>{attMsg}</Note>}
      {attSession && <AttendanceModal club={club} profile={profile} session={attSession} onClose={() => setAttSession(null)} onSaved={(m) => { setAttSession(null); setAttMsg(typeof m === 'string' ? m : 'Attendance saved'); setTimeout(() => setAttMsg(''), 6000) }} />}
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

const FEE_TYPES = [{ key: 'transport', label: 'Transport' }, { key: 'kit', label: 'Kit' }, { key: 'monthly', label: 'Monthly training' }, { key: 'registration', label: 'Registration' }, { key: 'other', label: 'Other' }]

function FeesPage({ club }) {
  const [fees, setFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [players, setPlayers] = useState([])
  const [centers, setCenters] = useState([])
  const [payFee, setPayFee] = useState(null)
  const [editFee, setEditFee] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState({ registration_fee: club.registration_fee ?? 2500, monthly_fee: club.monthly_fee ?? 2500 })
  const [filter, setFilter] = useState('open')
  const [feeSearch, setFeeSearch] = useState('')
  const [feeLimit, setFeeLimit] = useState(50)

  const load = useCallback(async () => {
    const [{ data: f }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('fees').select('*, player:players(full_name,squad_number,sponsored,training_center_id,links:parent_player_links(parent:profiles!parent_player_links_parent_profile_id_fkey(full_name,phone)))').eq('club_id', club.id).order('created_at', { ascending: false }),
      supabase.from('players').select('id,full_name,squad_number,sponsored,training_center_id,attends_both').eq('club_id', club.id).eq('is_active', true).order('full_name'),
      supabase.from('training_centers').select('*').eq('club_id', club.id).eq('is_active', true),
    ])
    setFees(f || []); setPlayers(p || []); setCenters(c || []); setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setBusy(true); setMsg(null)
    const { data, error } = await supabase.rpc('generate_monthly_fees', { p_month: todayNairobi() })
    setBusy(false)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) })
    else { setMsg({ kind: 'ok', text: data === 0 ? 'This month\'s fees were already generated.' : `Created ${data} monthly fee${data === 1 ? '' : 's'} (sponsored players are marked waived).` }); load() }
  }

  const saveSettings = async () => {
    const reg = parseInt(settings.registration_fee), mon = parseInt(settings.monthly_fee)
    if (isNaN(reg) || isNaN(mon) || reg < 0 || mon < 0) { setMsg({ kind: 'error', text: 'Enter valid amounts' }); return }
    const { error } = await supabase.from('clubs').update({ registration_fee: reg, monthly_fee: mon }).eq('id', club.id)
    setMsg(error ? { kind: 'error', text: friendly(error.message) } : { kind: 'ok', text: 'Fee amounts saved. They apply to new registrations and new months.' })
  }

  const waive = async (f) => {
    if (!confirm(`Waive "${f.description}" for ${f.player?.full_name}?`)) return
    const { error } = await supabase.from('fees').update({ status: 'waived' }).eq('id', f.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else load()
  }

  const remindLink = (f) => {
    const par = f.player?.links?.[0]?.parent
    if (!par?.phone) return null
    const due = f.amount - (f.paid_amount || 0)
    return waChat(par.phone, `Hello ${par.full_name.split(' ')[0]}, a friendly reminder from ${club.name}: ${f.description} for ${f.player.full_name} (${fmtKES(due)}${f.due_date ? ', due ' + fmtDate(f.due_date) : ''}) is still outstanding. You can pay via M-Pesa and send us the confirmation message. Thank you!`)
  }
  const open = fees.filter(f => f.status !== 'paid' && f.status !== 'waived')
  const totalPending = open.reduce((s, f) => s + (f.amount - (f.paid_amount || 0)), 0)
  const totalCollected = fees.reduce((s, f) => s + (f.paid_amount || 0), 0)
  const waivedTotal = fees.filter(f => f.status === 'waived').reduce((s, f) => s + f.amount, 0)
  const byStatus = filter === 'open' ? open : filter === 'waived' ? fees.filter(f => f.status === 'waived') : filter === 'paid' ? fees.filter(f => f.status === 'paid') : fees
  const shown = feeSearch ? byStatus.filter(f => (f.player?.full_name || '').toLowerCase().includes(feeSearch.toLowerCase())) : byStatus
  const exportFees = () => downloadCsv('fees.csv', [['Player', 'Centre', 'Description', 'Type', 'Amount', 'Paid', 'Balance', 'Status', 'Due', 'Method', 'Reference'], ...fees.map(f => [f.player?.full_name, centers.find(c => c.id === f.player?.training_center_id)?.name, f.description, f.fee_type, f.amount, f.paid_amount || 0, feeBalance(f), f.status, f.due_date, f.payment_method, f.mpesa_ref])])

  if (loading) return <PageSkeleton />

  return (
    <div className="page">
      <div className="page-hdr">
        <div><div className="page-title">Fee management</div><div className="page-sub">Registration {fmtKES(settings.registration_fee)} · Monthly {fmtKES(settings.monthly_fee)}</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={exportFees}>Export CSV</button>
          <button className="btn btn-ghost" onClick={generate} disabled={busy}>{busy ? 'Working...' : 'Generate this month\'s fees'}</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add fee</button>
        </div>
      </div>
      {msg && <Note kind={msg.kind} style={{ marginBottom: 12 }}>{msg.text}</Note>}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value" style={{ fontSize: 18 }}>{fmtKES(totalPending)}</div><div className="stat-change down">Outstanding</div></div>
        <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value" style={{ fontSize: 18 }}>{fmtKES(totalCollected)}</div><div className="stat-change up">Received</div></div>
        <div className="stat-card"><div className="stat-label">Waived</div><div className="stat-value" style={{ fontSize: 18 }}>{fmtKES(waivedTotal)}</div><div className="stat-change neutral">Sponsorship</div></div>
      </div>
      <FeeOverview fees={fees} centers={centers} />
      <input placeholder="Search by player name..." value={feeSearch} onChange={e => { setFeeSearch(e.target.value); setFeeLimit(50) }} style={{ marginBottom: 12, width: '100%' }} />
      <div className="filter-pills">
        {[['open', 'Outstanding'], ['paid', 'Paid'], ['waived', 'Waived'], ['all', 'All']].map(([k, l]) => <button key={k} className={`pill ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {shown.length === 0
        ? <EmptyState icon="wallet" title="Nothing here" sub={filter === 'open' ? 'No outstanding fees. Everyone is up to date.' : 'No fees match this view.'} />
        : <div style={{ marginBottom: 16 }}>
          {shown.slice(0, feeLimit).map(f => (
            <div key={f.id} className="rc">
              <div className="avatar avatar-sm">{initials(f.player?.full_name)}</div>
              <div className="rc-main">
                <div className="rc-title">{f.player?.full_name || '—'}</div>
                <div className="rc-sub">{f.description}{f.due_date ? ` · due ${fmtDate(f.due_date)}` : ''}{f.player?.sponsored ? ' · Sponsored' : ''}</div>
              </div>
              <div className="rc-side">
                <div style={{ fontWeight: 700 }}>{fmtKES(f.amount)}</div>
                {(f.paid_amount || 0) > 0 && <div className="rc-sub">paid {fmtKES(f.paid_amount)}</div>}
              </div>
              <span className={`badge ${STATUS_COLORS[f.status] || 'badge-gray'}`}>{f.status}</span>
              <div className="rc-actions">
                {f.status !== 'paid' && f.status !== 'waived' && <>
                  <button className="btn btn-primary btn-sm" onClick={() => setPayFee(f)}>Record payment</button>
                  {remindLink(f) && <a className="btn btn-ghost btn-sm" href={remindLink(f)} target="_blank" rel="noreferrer">Remind</a>}
                  <button className="btn btn-ghost btn-sm" onClick={() => waive(f)}>Waive</button>
                </>}
                <button className="btn btn-ghost btn-sm" onClick={() => setEditFee(f)}>Edit</button>
                {(f.paid_amount || 0) > 0 && <button className="btn btn-ghost btn-sm" onClick={() => printReceipt(f, club)}>Receipt</button>}
              </div>
            </div>
          ))}
          {shown.length > feeLimit && <div style={{ textAlign: 'center' }}><button className="btn btn-ghost btn-sm" onClick={() => setFeeLimit(l => l + 50)}>Show more ({shown.length - feeLimit} left)</button></div>}
        </div>}
      <div className="card">
        <div className="card-hdr"><div className="card-title">Fee amounts</div></div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group"><label>Registration fee (KES, includes two kits)</label><input type="number" min="0" value={settings.registration_fee} onChange={e => setSettings(s => ({ ...s, registration_fee: e.target.value }))} /></div>
            <div className="form-group"><label>Monthly training fee (KES)</label><input type="number" min="0" value={settings.monthly_fee} onChange={e => setSettings(s => ({ ...s, monthly_fee: e.target.value }))} /></div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={saveSettings}>Save amounts</button>
        </div>
      </div>
      {showAdd && <AddFeeModal club={club} players={players} centers={centers} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editFee && <EditFeeModal fee={editFee} onClose={() => setEditFee(null)} onSaved={() => { setEditFee(null); load() }} />}
      {payFee && <PaymentModal fee={payFee} onClose={() => setPayFee(null)} onSaved={() => { setPayFee(null); load() }} />}
    </div>
  )
}

function PaymentModal({ fee, onClose, onSaved }) {
  const balance = fee.amount - (fee.paid_amount || 0)
  const [amount, setAmount] = useState(String(balance))
  const [method, setMethod] = useState('mpesa')
  const [ref, setRef] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    const a = parseInt(amount)
    if (!a || a <= 0) { setError('Enter the amount received'); return }
    if (a > balance) { setError(`That is more than the balance of ${fmtKES(balance)}`); return }
    setSaving(true); setError('')
    const paid = (fee.paid_amount || 0) + a
    const { error: err } = await supabase.from('fees').update({ paid_amount: paid, status: paid >= fee.amount ? 'paid' : 'partial', payment_method: method, mpesa_ref: ref.trim() || null }).eq('id', fee.id)
    setSaving(false)
    if (err) { setError(friendly(err.message)); return }
    onSaved()
  }

  return (
    <Modal title="Record payment" onClose={onClose}>
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div style={{ fontSize: 13, marginBottom: 12 }}><strong>{fee.player?.full_name}</strong> · {fee.description}<br /><span style={{ color: 'var(--text-muted)' }}>Balance {fmtKES(balance)}</span></div>
        <div className="form-grid">
          <div className="form-group"><label>Amount received (KES)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="form-group"><label>Method</label><select value={method} onChange={e => setMethod(e.target.value)}><option value="mpesa">M-Pesa</option><option value="cash">Cash</option><option value="bank">Bank</option></select></div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>M-Pesa / receipt reference</label><input value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. SJK3L9XXXX" /></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save payment'}</button>
      </div>
    </Modal>
  )
}

function AddFeeModal({ club, players, centers, onClose, onSaved }) {
  const [form, setForm] = useState({ target: 'player', player_id: '', center_id: '', fee_type: 'transport', description: 'Transport', amount: '', due_date: '', term: '', skip_sponsored: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const chooseType = (t) => { setForm(f => ({ ...f, fee_type: t, description: FEE_TYPES.find(x => x.key === t)?.label || '' })) }

  const save = async () => {
    const amt = parseInt(form.amount)
    if (!form.description.trim() || !amt || amt <= 0) { setError('Description and a valid amount are required'); return }
    let targets = []
    if (form.target === 'player') { if (!form.player_id) { setError('Choose a player'); return } targets = players.filter(p => p.id === form.player_id) }
    else if (form.target === 'center') { if (!form.center_id) { setError('Choose a training centre'); return } targets = players.filter(p => p.training_center_id === form.center_id || p.attends_both) }
    else targets = players
    if (form.target !== 'player' && form.skip_sponsored) targets = targets.filter(p => !p.sponsored)
    if (targets.length === 0) { setError('No players match this selection'); return }
    setSaving(true); setError('')
    const rows = targets.map(p => ({ club_id: club.id, player_id: p.id, description: form.description.trim(), amount: amt, due_date: form.due_date || null, term: form.term || null, status: p.sponsored && form.target === 'player' ? 'unpaid' : 'unpaid', fee_type: form.fee_type }))
    const { error: err } = await supabase.from('fees').insert(rows)
    setSaving(false)
    if (err) { setError(friendly(err.message)); return }
    onSaved()
  }

  return (
    <Modal title="Add fee" onClose={onClose}>
      <div className="modal-body">
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
        <div className="form-grid">
          <div className="form-group"><label>Charge</label><select value={form.fee_type} onChange={e => chooseType(e.target.value)}>{FEE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select></div>
          <div className="form-group"><label>Apply to</label><select value={form.target} onChange={e => set('target', e.target.value)}><option value="player">One player</option><option value="center">Everyone at a training centre</option><option value="all">All active players</option></select></div>
          {form.target === 'player' && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Player *</label><select value={form.player_id} onChange={e => set('player_id', e.target.value)}><option value="">Select player</option>{players.map(p => <option key={p.id} value={p.id}>{p.squad_number ? `#${p.squad_number} ` : ''}{p.full_name}{p.sponsored ? ' (sponsored)' : ''}</option>)}</select></div>}
          {form.target === 'center' && <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Training centre *</label><select value={form.center_id} onChange={e => set('center_id', e.target.value)}><option value="">Select centre</option>{centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          {form.target !== 'player' && <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}><input type="checkbox" style={{ width: 'auto' }} checked={form.skip_sponsored} onChange={e => set('skip_sponsored', e.target.checked)} /> Skip sponsored players</label>}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>Description *</label><input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Transport to away match" /></div>
          <div className="form-group"><label>Amount (KES) *</label><input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="e.g. 500" /></div>
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
    if (err) { setError(friendly(err.message)); return }
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
        <img src={LOGO} alt="BTB" style={{ width: 38, height: 38, borderRadius: 8 }} />
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
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>BTB <span style={{ color: 'var(--btb-gold)' }}>{oursTheirs(liveMatch)[0]} — {oursTheirs(liveMatch)[1]}</span> {liveMatch.opponent}</div>
                  </div>
                )}
                {!liveMatch && upcoming[0] && (
                  <div style={{ background: 'linear-gradient(135deg, #0d1b3e, #1a2744)', border: '1px solid rgba(26,75,219,0.4)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--btb-gold)', marginBottom: 8 }}>NEXT MATCH</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>BTB vs {upcoming[0].opponent}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fmtDate(upcoming[0].match_date)} · {venueOf(upcoming[0])}</div>
                  </div>
                )}
                {lastResult && (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>LAST RESULT</div>
                    <div style={{ fontWeight: 700 }}>BTB {oursTheirs(lastResult)[0]} — {oursTheirs(lastResult)[1]} {lastResult.opponent}</div>
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
                {upcoming.length > 0 && <><div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>UPCOMING</div>{upcoming.map(f => (<div key={f.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 10 }}><div style={{ fontWeight: 700, marginBottom: 4 }}>BTB vs {f.opponent}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(f.match_date)} · {venueOf(f)}</div></div>))}</>}
                {past.length > 0 && <><div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', margin: '16px 0 10px' }}>RESULTS</div>{past.slice(0, 10).map(f => { const [o, t] = oursTheirs(f); const won = o > t; const drew = o === t; return (<div key={f.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 14, marginBottom: 8, borderLeft: `3px solid ${drew ? '#888' : won ? '#22c55e' : '#ef4444'}` }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 700 }}>BTB {o} — {t} {f.opponent}</span><span style={{ color: drew ? '#888' : won ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>{drew ? 'D' : won ? 'W' : 'L'}</span></div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{fmtDate(f.match_date)}</div></div>) })}</>}
                {fixtures.length > 0 && <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px 16px', margin: '16px 0 0' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>HOLIDAY MATCH FORMATS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>{HOLIDAY_FORMATS.map(([a, f]) => <div key={a} style={{ textAlign: 'center' }}><div style={{ fontSize: '0.65rem', color: 'var(--btb-gold)' }}>{a.toUpperCase()}</div><div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{f}</div></div>)}</div>
                </div>}
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
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{fmtDate(upcoming[0].match_date)} · {venueOf(upcoming[0])}</div>
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

const WIZARD_STEPS = ['Parent / guardian', 'Alternative contact', 'Your child', 'Home & school', 'Health & consent', 'Documents', 'Review']
const REQUIRED_DOCS = ['birth_certificate', 'parent_id']
const phoneOk = (v = '') => v.replace(/[^0-9]/g, '').length >= 9

// Step-by-step registration for parents. Each step must be completed before the next opens.
const FormField = ({ label, children, full }) => <div className="form-group" style={full ? { gridColumn: '1 / -1' } : undefined}><label>{label}</label>{children}</div>
const SummaryRow = ({ l, v }) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>{l}</span><span style={{ textAlign: 'right' }}>{v || '—'}</span></div>

function ParentRegistrationWizard({ club, profile, onClose, onSaved }) {
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [relationship, setRelationship] = useState('mother')
  const [g, setG] = useState({
    full_name: profile.full_name || '', phone: profile.phone || '', alt_phone: profile.alt_phone || '',
    residence: profile.residence || '', occupation: profile.occupation || '',
    alt_contact_name: profile.alt_contact_name || '', alt_contact_relationship: profile.alt_contact_relationship || '', alt_contact_phone: profile.alt_contact_phone || '',
  })
  const [c, setC] = useState({ full_name: '', date_of_birth: '', nationality: 'Kenyan', position: '', position_detail: '', dominant_foot: 'Right', height_cm: '', weight_kg: '', home_address: '', school_name: '', school_grade: '', medical_conditions: '', allergies: '', training_center_id: '', attends_both: false })
  const [centers, setCenters] = useState([])
  const [consent, setConsent] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [files, setFiles] = useState({})
  const setGv = (k, v) => setG(p => ({ ...p, [k]: v }))
  const setCv = (k, v) => setC(p => ({ ...p, [k]: v }))
  const docTypes = DOC_TYPES.filter(d => !d.staffOnly)
  const today = todayNairobi()
  const DRAFT_KEY = `sp-draft-${profile.id}`
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      if (d && d.v === 1) { setG(x => ({ ...x, ...d.g })); setC(x => ({ ...x, ...d.c })); setRelationship(d.relationship || 'mother'); setStep(d.step || 0); setMaxStep(d.maxStep || 0); setRestored(true) }
    } catch {}
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, g, c, relationship, step, maxStep })) } catch {} }, 400)
    return () => clearTimeout(t)
  }, [g, c, relationship, step, maxStep])
  const startOver = () => { try { localStorage.removeItem(DRAFT_KEY) } catch {}; onClose() }

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => { supabase.from('training_centers').select('id,name,address').eq('club_id', club.id).eq('is_active', true).order('name').then(({ data }) => setCenters(data || [])) }, [club.id])

  // returns an error message if the step is incomplete
  const validate = (i) => {
    if (i === 0) {
      if (g.full_name.trim().length < 2) return 'Enter your full name'
      if (!phoneOk(g.phone)) return 'Enter a valid phone number'
      if (g.alt_phone && !phoneOk(g.alt_phone)) return 'The second phone number is not valid'
      if (g.residence.trim().length < 3) return 'Enter where you live (estate / village and town)'
    }
    if (i === 1) {
      if (g.alt_contact_name.trim().length < 2) return 'Enter the alternative contact\'s name'
      if (g.alt_contact_relationship.trim().length < 2) return 'Enter how they are related to the child'
      if (!phoneOk(g.alt_contact_phone)) return 'Enter a valid phone number for the alternative contact'
      if (g.alt_contact_phone.replace(/\D/g, '') === g.phone.replace(/\D/g, '')) return 'The alternative contact needs a different phone number from yours'
    }
    if (i === 2) {
      if (c.full_name.trim().length < 2) return 'Enter the child\'s full name'
      if (!c.date_of_birth) return 'Enter the child\'s date of birth'
      if (c.date_of_birth > today) return 'Date of birth cannot be in the future'
      if (!c.position) return 'Choose the child\'s preferred position'
    }
    if (i === 3) {
      if (c.home_address.trim().length < 3) return 'Enter where the child lives'
      if (!c.training_center_id) return 'Choose the training centre your child will attend'
      if (c.school_name.trim().length < 2) return 'Enter the child\'s school'
    }
    if (i === 4) {
      if (!consent) return 'You must tick the consent box to continue'
    }
    if (i === 5) {
      const missing = REQUIRED_DOCS.filter(k => !files[k]).map(k => DOC_LABELS[k])
      if (missing.length) return 'Please upload: ' + missing.join(' and ')
    }
    return ''
  }

  const next = () => {
    const e = validate(step); if (e) { setError(e); return }
    setError(''); const n = step + 1; setStep(n); setMaxStep(m => Math.max(m, n))
  }
  const back = () => { setError(''); setStep(s => Math.max(0, s - 1)) }
  const goTo = (i) => { if (i <= maxStep && i !== step) { setError(''); setStep(i) } }

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

  const submit = async () => {
    for (let i = 0; i < 6; i++) { const e = validate(i); if (e) { setStep(i); setError(e); return } }
    setSaving(true); setError('')
    const { data: playerId, error: err } = await supabase.rpc('register_child', { p: { ...c, consent: 'true' }, g, p_relationship: relationship })
    if (err) { setError(friendly(err.message)); setSaving(false); return }
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    if (c.attends_both) await supabase.rpc('set_attends_both', { p_player: playerId, p_both: true })
    const problems = []
    if (photo) {
      const { url, error: pe } = await uploadPlayerPhoto({ playerId, file: photo })
      if (pe) problems.push('photo: ' + pe); else await supabase.from('players').update({ photo_url: url }).eq('id', playerId)
    }
    for (const d of docTypes) {
      if (!files[d.key]) continue
      const msg = await uploadPlayerDoc({ clubId: club.id, playerId, docType: d.key, file: files[d.key] })
      if (msg) problems.push(`${d.label}: ${msg}`)
    }
    setSaving(false)
    if (problems.length) { setWarning(`${c.full_name} was registered, but some files did not upload (${problems.join('; ')}). Open your child's profile, go to Documents and add them again.`); return }
    onSaved()
  }

  if (warning) return (
    <Modal title="Registered, with a warning" onClose={onSaved}>
      <div className="modal-body"><Note kind="warn">{warning}</Note></div>
      <div className="modal-footer"><button className="btn btn-primary" onClick={onSaved}>OK</button></div>
    </Modal>
  )


  return (
    <Modal title="Register your child" onClose={onClose} size="modal-lg">
      <div className="modal-body">
        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
          {WIZARD_STEPS.map((s, i) => <div key={s} onClick={() => goTo(i)} style={{ flex: 1, height: 5, borderRadius: 3, cursor: i <= maxStep ? 'pointer' : 'default', background: i < step ? 'var(--green)' : i === step ? 'var(--btb-gold)' : 'var(--border)' }} />)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Step {step + 1} of {WIZARD_STEPS.length} · <strong style={{ color: 'var(--text)' }}>{WIZARD_STEPS[step]}</strong></div>
        {restored && <Note kind="info" style={{ marginBottom: 12 }}>We saved your unfinished form. Photos and documents need to be added again. <button type="button" onClick={startOver} style={{ background: 'none', border: 'none', color: 'var(--btb-gold)', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>Start over</button></Note>}
        {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}

        {step === 0 && (
          <div className="form-grid">
            <FormField label="Parent / guardian's full name *" full><input value={g.full_name} onChange={e => setGv('full_name', e.target.value)} maxLength={100} /></FormField>
            <FormField label="Your relationship to the child *"><select value={relationship} onChange={e => setRelationship(e.target.value)}>{['mother', 'father', 'guardian', 'other'].map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}</select></FormField>
            <FormField label="Phone / WhatsApp *"><input type="tel" value={g.phone} onChange={e => setGv('phone', e.target.value)} placeholder="07XX XXX XXX" /></FormField>
            <FormField label="Second phone number"><input type="tel" value={g.alt_phone} onChange={e => setGv('alt_phone', e.target.value)} placeholder="Optional" /></FormField>
            <FormField label="Email"><input value={profile.email || ''} disabled /></FormField>
            <FormField label="Where you live *" full><input value={g.residence} onChange={e => setGv('residence', e.target.value)} placeholder="Estate / village, town" /></FormField>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Someone we can reach if we cannot reach you, for example in an emergency during training or a match.</div>
            <div className="form-grid">
              <FormField label="Alternative contact's full name *" full><input value={g.alt_contact_name} onChange={e => setGv('alt_contact_name', e.target.value)} maxLength={100} /></FormField>
              <FormField label="Relationship to the child *"><input value={g.alt_contact_relationship} onChange={e => setGv('alt_contact_relationship', e.target.value)} placeholder="e.g. Aunt, Grandmother, Neighbour" /></FormField>
              <FormField label="Phone number *"><input type="tel" value={g.alt_contact_phone} onChange={e => setGv('alt_contact_phone', e.target.value)} placeholder="07XX XXX XXX" /></FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-card2)', border: '0.5px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {photoPreview ? <img src={photoPreview} alt="Child" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, color: 'var(--text-dim)' }}>👤</span>}
              </div>
              <div>
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>{photo ? 'Change photo' : 'Add photo (optional)'}<input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={pickPhoto} /></label>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG or WebP, up to 3 MB</div>
              </div>
            </div>
            <div className="form-grid">
              <FormField label="Player's full name (the child) *" full><input value={c.full_name} onChange={e => setCv('full_name', e.target.value)} maxLength={100} /></FormField>
              <FormField label="Date of birth *"><input type="date" max={today} value={c.date_of_birth} onChange={e => setCv('date_of_birth', e.target.value)} />{c.date_of_birth && c.date_of_birth <= today && <div style={{ fontSize: 12, color: 'var(--btb-gold)', marginTop: 4 }}>Age {exactAge(c.date_of_birth)} · Age group: <strong>{autoAgeGroup(c.date_of_birth)}</strong>{FORMAT_OF[autoAgeGroup(c.date_of_birth)] ? ` · ${FORMAT_OF[autoAgeGroup(c.date_of_birth)]} matches` : ''}</div>}</FormField>
              <FormField label="Nationality"><input value={c.nationality} onChange={e => setCv('nationality', e.target.value)} /></FormField>
              <FormField label="Preferred position *"><select value={c.position} onChange={e => setCv('position', e.target.value)}><option value="">Select</option>{['Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map(p => <option key={p}>{p}</option>)}</select></FormField>
              <FormField label="Position detail"><input value={c.position_detail} onChange={e => setCv('position_detail', e.target.value)} placeholder="e.g. Right Wing" /></FormField>
              <FormField label="Dominant foot"><select value={c.dominant_foot} onChange={e => setCv('dominant_foot', e.target.value)}>{['Right', 'Left', 'Both'].map(f => <option key={f}>{f}</option>)}</select></FormField>
              <FormField label="Height (cm)"><input type="number" value={c.height_cm} onChange={e => setCv('height_cm', e.target.value)} /></FormField>
              <FormField label="Weight (kg)"><input type="number" value={c.weight_kg} onChange={e => setCv('weight_kg', e.target.value)} /></FormField>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-grid">
            <FormField label="Training centre *" full>
              <select value={c.attends_both ? 'both' : c.training_center_id} onChange={e => { const v = e.target.value; setC(x => ({ ...x, attends_both: v === 'both', training_center_id: v === 'both' ? (centers[0]?.id || '') : v })) }}><option value="">Select a centre</option>{centers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}{centers.length > 1 && <option value="both">Both centres</option>}</select>
            </FormField>
            <FormField label="Where the child lives *" full>
              <textarea value={c.home_address} onChange={e => setCv('home_address', e.target.value)} placeholder="Estate / village, town, landmark" />
              {g.residence && c.home_address !== g.residence && <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setCv('home_address', g.residence)}>Same as my address</button>}
            </FormField>
            <FormField label="School *"><input value={c.school_name} onChange={e => setCv('school_name', e.target.value)} placeholder="e.g. Nyeri Primary School" /></FormField>
            <FormField label="Grade / class"><input value={c.school_grade} onChange={e => setCv('school_grade', e.target.value)} placeholder="e.g. Grade 7" /></FormField>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="form-grid">
              <FormField label="Medical conditions" full><textarea value={c.medical_conditions} onChange={e => setCv('medical_conditions', e.target.value)} placeholder="Asthma, injuries, anything the coaches should know. Write 'None' if there is nothing." /></FormField>
              <FormField label="Allergies" full><textarea value={c.allergies} onChange={e => setCv('allergies', e.target.value)} placeholder="Food, medicine or other allergies. Write 'None' if there are none." /></FormField>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, background: 'var(--bg-card2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ width: 'auto', marginTop: 3 }} />
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>I confirm the details I have given are correct and that I am the parent or legal guardian of this child. I allow my child to take part in {club.name} training and matches, and I allow the academy to arrange emergency medical treatment and to contact me or my alternative contact if needed. *</span>
            </label>
          </div>
        )}

        {step === 5 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>PDF, JPG or PNG, up to 5 MB each. Stored privately: only the academy and you can open them. Birth certificate and parent ID are required.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {docTypes.map(({ key, label }) => {
                const f = files[key]; const req = REQUIRED_DOCS.includes(key)
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card2)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}{req ? ' *' : ' (optional)'}</div>
                      {f && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✓ {f.name}</div>}
                    </div>
                    <label className={`btn btn-sm ${f ? 'btn-ghost' : 'btn-primary'}`} style={{ cursor: 'pointer' }}>{f ? 'Replace' : 'Choose file'}<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={e => pickDoc(e, key)} /></label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Check everything before you submit. Use Back to change anything.</div>
            <Note kind="info" style={{ marginBottom: 8 }}>Fees: registration {fmtKES(club.registration_fee ?? 2500)} (includes two sets of kits) and {fmtKES(club.monthly_fee ?? 2500)} per month for training. The academy will confirm once your registration is approved.</Note>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--btb-gold)', margin: '8px 0 2px' }}>PARENT / GUARDIAN</div>
            <SummaryRow l="Parent / guardian" v={`${g.full_name} (${relationship})`} /><SummaryRow l="Phone" v={[g.phone, g.alt_phone].filter(Boolean).join(' / ')} /><SummaryRow l="Lives at" v={g.residence} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--btb-gold)', margin: '12px 0 2px' }}>ALTERNATIVE CONTACT</div>
            <SummaryRow l="Alternative contact" v={`${g.alt_contact_name} (${g.alt_contact_relationship})`} /><SummaryRow l="Phone" v={g.alt_contact_phone} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--btb-gold)', margin: '12px 0 2px' }}>CHILD</div>
            <SummaryRow l="Player" v={c.full_name} /><SummaryRow l="Date of birth" v={c.date_of_birth} /><SummaryRow l="Age group" v={autoAgeGroup(c.date_of_birth)} /><SummaryRow l="Position" v={c.position_detail ? `${c.position} (${c.position_detail})` : c.position} />
            <SummaryRow l="Training centre" v={c.attends_both ? 'Both centres' : centers.find(t => t.id === c.training_center_id)?.name} /><SummaryRow l="Lives at" v={c.home_address} /><SummaryRow l="School" v={[c.school_name, c.school_grade].filter(Boolean).join(', ')} />
            <SummaryRow l="Medical" v={c.medical_conditions} /><SummaryRow l="Allergies" v={c.allergies} />
            <SummaryRow l="Documents" v={docTypes.filter(d => files[d.key]).map(d => d.label).join(', ')} />
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={step === 0 ? onClose : back} disabled={saving}>{step === 0 ? 'Cancel' : 'Back'}</button>
        {step < WIZARD_STEPS.length - 1
          ? <button className="btn btn-primary" onClick={next}>Next</button>
          : <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Submitting...' : 'Submit for approval'}</button>}
      </div>
    </Modal>
  )
}

function StaffPage({ club, profile }) {
  const [staff, setStaff] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [fresh, setFresh] = useState(null)
  const [groupUrl, setGroupUrl] = useState(club.whatsapp_group_url || '')
  const [groupMsg, setGroupMsg] = useState(null)
  const saveGroup = async () => {
    const v = groupUrl.trim()
    if (v && !/^https:\/\/chat\.whatsapp\.com\/\S+$/i.test(v)) { setGroupMsg({ kind: 'error', text: 'Paste the invite link, which starts with https://chat.whatsapp.com/' }); return }
    const { error } = await supabase.from('clubs').update({ whatsapp_group_url: v || null }).eq('id', club.id)
    if (error) setGroupMsg({ kind: 'error', text: friendly(error.message) }); else { club.whatsapp_group_url = v || null; setGroupMsg({ kind: 'ok', text: v ? 'Saved. Parents now see a Join WhatsApp button.' : 'Group link removed.' }) }
  }

  const load = useCallback(async () => {
    const [{ data: s }, { data: i }] = await Promise.all([
      supabase.from('profiles').select('*').eq('club_id', club.id).in('role', ['manager', 'coach']).order('role').order('full_name'),
      supabase.from('staff_invites').select('*').eq('club_id', club.id).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
    ])
    setStaff(s || []); setInvites(i || []); setLoading(false)
  }, [club.id])
  useEffect(() => { load() }, [load])

  const shareText = (name, code) => `Hi ${name}, you have been added as a coach at ${club.name}. Open ${window.location.origin}, tap "Register here", tick "I'm a coach with an invite code", and enter this code: ${code}. Use your own email and a password. The code is valid for 14 days.`
  const waLink = (name, phone, code) => {
    let n = (phone || '').replace(/\D/g, '')
    if (n.startsWith('0')) n = '254' + n.slice(1)
    return `https://wa.me/${n}?text=${encodeURIComponent(shareText(name, code))}`
  }

  const invite = async () => {
    if (form.name.trim().length < 2) { setMsg({ kind: 'error', text: 'Enter the coach\'s name' }); return }
    setSaving(true); setMsg(null)
    const { data, error } = await supabase.rpc('create_invite', { p_name: form.name.trim(), p_phone: form.phone.trim() || null })
    setSaving(false)
    if (error) { setMsg({ kind: 'error', text: friendly(error.message) }); return }
    setFresh({ name: form.name.trim(), phone: form.phone.trim(), code: data })
    setForm({ name: '', phone: '' }); load()
  }
  const revoke = async (inv) => {
    if (!confirm(`Cancel the invite for ${inv.full_name}?`)) return
    const { error } = await supabase.from('staff_invites').delete().eq('id', inv.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else { if (fresh?.code === inv.code) setFresh(null); load() }
  }
  const toggle = async (p) => {
    if (!confirm(p.is_active ? `Deactivate ${p.full_name}? They will no longer be able to use the app.` : `Reactivate ${p.full_name}?`)) return
    const { error } = await supabase.from('profiles').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) setMsg({ kind: 'error', text: friendly(error.message) }); else load()
  }
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setMsg({ kind: 'ok', text: 'Copied' }) } catch { setMsg({ kind: 'warn', text: 'Could not copy. Select the text and copy it manually.' }) } }

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr"><div><div className="page-title">Coaches & staff</div><div className="page-sub">Give your coaches access to the app</div></div></div>
      {msg && <Note kind={msg.kind} style={{ marginBottom: 12 }}>{msg.text}</Note>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hdr"><div className="card-title">Team WhatsApp group</div></div>
        <div className="card-body">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>In WhatsApp open the group, then Group info, then Invite via link, and copy the link here.</div>
          {groupMsg && <Note kind={groupMsg.kind} style={{ marginBottom: 8 }}>{groupMsg.text}</Note>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><input style={{ flex: 1, minWidth: 220 }} placeholder="https://chat.whatsapp.com/..." value={groupUrl} onChange={e => setGroupUrl(e.target.value)} /><button className="btn btn-primary" onClick={saveGroup}>Save</button></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hdr"><div className="card-title">Invite a coach</div></div>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group"><label>Coach's name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} /></div>
            <div className="form-group"><label>WhatsApp number</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07XX XXX XXX" /></div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={invite} disabled={saving}>{saving ? 'Creating...' : 'Create invite code'}</button>
          {fresh && (
            <Note kind="ok" style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 6 }}>Invite for <strong>{fresh.name}</strong></div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>{fresh.code}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn-primary btn-sm" href={waLink(fresh.name, fresh.phone, fresh.code)} target="_blank" rel="noreferrer">Send on WhatsApp</a>
                <button className="btn btn-ghost btn-sm" onClick={() => copy(shareText(fresh.name, fresh.code))}>Copy message</button>
              </div>
            </Note>
          )}
        </div>
      </div>

      {invites.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hdr"><div className="card-title">Waiting to join</div></div>
          {invites.map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '0.5px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{i.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.code} · expires {fmtDate(i.expires_at)}</div></div>
              <a className="btn btn-ghost btn-sm" href={waLink(i.full_name, i.phone, i.code)} target="_blank" rel="noreferrer">WhatsApp</a>
              <button className="btn btn-ghost btn-sm" onClick={() => revoke(i)}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-hdr"><div className="card-title">Team</div></div>
        {staff.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid var(--border)', opacity: p.is_active ? 1 : 0.55 }}>
            <div className="avatar">{initials(p.full_name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{p.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{[p.email, p.phone].filter(Boolean).join(' · ')}</div></div>
            <span className={`badge ${p.role === 'manager' ? 'badge-blue' : 'badge-gray'}`}>{p.role}</span>
            {!p.is_active && <span className="badge badge-red">deactivated</span>}
            {p.role === 'coach' && p.id !== profile.id && <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>{p.is_active ? 'Deactivate' : 'Reactivate'}</button>}
          </div>
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
  const [me, setMe] = useState(profile)
  const [showAbs, setShowAbs] = useState(false)
  const [absences, setAbsences] = useState([])
  const [sessions, setSessions] = useState([])
  const [attRows, setAttRows] = useState([])
  const [showContact, setShowContact] = useState(false)

  const load = useCallback(async () => {
    const [{ data: links }, { data: f }, { data: fx }, { data: fresh }, { data: ab }] = await Promise.all([
      supabase.from('parent_player_links').select('relationship, player:players(*)').eq('parent_profile_id', profile.id),
      supabase.from('fees').select('*, player:players(full_name)').order('due_date', { ascending: true }),
      supabase.from('fixtures').select('*').eq('club_id', club.id).eq('status', 'upcoming').order('match_date', { ascending: true }).limit(3),
      supabase.from('profiles').select('*').eq('id', profile.id).maybeSingle(),
      supabase.from('absence_reports').select('*, player:players(full_name)').eq('reported_by', profile.id).gte('date_to', nairobiDate(new Date())).order('date_from'),
    ])
    setAbsences(ab || [])
    if (fresh) setMe(fresh)
    setChildren((links || []).map(l => ({ ...l.player, relationship: l.relationship })).filter(p => p && p.id))
    setFees(f || [])
    setNext(fx || [])
    const kidIds = (links || []).map(l => l.player?.id).filter(Boolean)
    const [{ data: ss }, { data: at }] = await Promise.all([
      supabase.from('training_sessions').select('id,title,session_date,venue,training_center_id').eq('club_id', club.id).gte('session_date', new Date().toISOString()).order('session_date').limit(40),
      kidIds.length ? supabase.from('training_attendance').select('player_id,status').in('player_id', kidIds) : Promise.resolve({ data: [] }),
    ])
    setSessions(ss || []); setAttRows(at || [])
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
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {club.whatsapp_group_url && <a className="btn btn-ghost" href={club.whatsapp_group_url} target="_blank" rel="noopener noreferrer">💬 Join team WhatsApp</a>}
          {children.some(c => c.status === 'active') && <button className="btn btn-ghost" onClick={() => setShowAbs(true)}>Report absence</button>}
          <button className="btn btn-ghost" onClick={() => setShowContact(true)}>My details</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add child</button>
        </div>
      </div>

      {children.some(c => c.status === 'active') && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hdr"><div className="card-title">At a glance</div></div>
          {children.filter(c => c.status === 'active').map(c => {
            const nextS = sessions.find(x => !x.training_center_id || x.training_center_id === c.training_center_id || c.attends_both)
            const mine = attRows.filter(a => a.player_id === c.id && a.status !== 'excused')
            const pct = mine.length ? Math.round(mine.filter(a => a.status === 'present' || a.status === 'late').length / mine.length * 100) : null
            const due = fees.filter(x => x.player_id === c.id && x.status !== 'paid' && x.status !== 'waived').reduce((t, x) => t + (x.amount - (x.paid_amount || 0)), 0)
            return (
              <div key={c.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontWeight: 700 }}>{c.full_name}</div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 6, fontSize: 12 }}>
                  <div><div style={{ color: 'var(--text-muted)' }}>Next training</div><div>{nextS ? `${fmtDateTime(nextS.session_date)}${nextS.venue ? ' · ' + nextS.venue : ''}` : 'None scheduled'}</div></div>
                  <div><div style={{ color: 'var(--text-muted)' }}>Attendance</div><div>{pct == null ? 'No records yet' : pct + '%'}</div></div>
                  <div><div style={{ color: 'var(--text-muted)' }}>Fees due</div><div style={{ color: due > 0 ? 'var(--red)' : 'var(--green)' }}>{due > 0 ? fmtKES(due) : 'All paid'}</div></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
              <div className="avatar" style={{ width: 56, height: 56, minWidth: 56, overflow: 'hidden', flexShrink: 0 }}>{c.photo_url ? <img src={c.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(c.full_name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.squad_number ? `#${c.squad_number} · ` : ''}{c.position_detail || c.position || 'Position not set'}</div>
              </div>
              <span className={`badge ${STATUS_COLORS[c.status] || 'badge-gray'}`}>{statusText[c.status] || c.status}</span>
            </div>
          ))}
      </div>

      {absences.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-hdr"><div className="card-title">Reported absences</div></div>
          {absences.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '0.5px solid var(--border)', fontSize: 13 }}>
              <div style={{ flex: 1 }}><strong>{a.player?.full_name?.split(' ')[0]}</strong> · {fmtDate(a.date_from)}{a.date_to !== a.date_from ? ` – ${fmtDate(a.date_to)}` : ''} · {ABSENCE_REASONS.find(r => r[0] === a.reason_type)?.[1]}</div>
              <span className={`badge ${a.status === 'acknowledged' ? 'badge-green' : 'badge-amber'}`}>{a.status === 'acknowledged' ? 'Seen' : 'Sent'}</span>
              <button className="btn btn-ghost btn-sm" onClick={async () => { if (confirm('Cancel this absence report?')) { await supabase.from('absence_reports').delete().eq('id', a.id); load() } }}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-hdr"><div className="card-title">Holiday match formats</div></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>{HOLIDAY_FORMATS.map(([a, f]) => <div key={a}><div style={{ fontSize: 10, color: 'var(--btb-gold)' }}>{a.toUpperCase()}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{f}</div></div>)}</div>
        </div>
        <div className="card">
          <div className="card-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div className="card-title">Fees</div>{fees.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => printStatement(fees, club, me.full_name)}>Statement</button>}</div>
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

      {showContact && <EditContactModal profile={me} onClose={() => setShowContact(false)} onSaved={() => { setShowContact(false); load() }} />}
      {showAbs && <ReportAbsenceModal club={club} profile={me} kids={children.filter(c => c.status === 'active')} onClose={() => setShowAbs(false)} onSaved={() => { setShowAbs(false); load() }} />}
      {showAdd && <ParentRegistrationWizard club={club} profile={me} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
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
  const [centers, setCenters] = useState([])
  const [opts, setOpts] = useState({})
  const [rejecting, setRejecting] = useState(null)
  const [note, setNote] = useState('')
  const [notify, setNotify] = useState([])

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('players')
      .select('*, links:parent_player_links(relationship, parent:profiles!parent_player_links_parent_profile_id_fkey(full_name, phone, alt_phone, email, residence, occupation, alt_contact_name, alt_contact_relationship, alt_contact_phone))')
      .eq('club_id', club.id).eq('status', 'pending').order('created_at', { ascending: true })
    if (err) setError(friendly(err.message))
    setItems(data || [])
    setLoading(false)
  }, [club.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { supabase.from('training_centers').select('id,name').eq('club_id', club.id).eq('is_active', true).order('name').then(({ data }) => setCenters(data || [])) }, [club.id])
  const optOf = (p) => ({ center: p.training_center_id || '', sponsored: false, note: '', ageGroup: '', regFee: '', monthFee: '', ...(opts[p.id] || {}) })
  const setOpt = (p, k, v) => setOpts(o => ({ ...o, [p.id]: { ...optOf(p), [k]: v } }))

  const approve = async (p) => {
    setBusy(p.id); setError('')
    const sq = squadNo[p.id]; const o = optOf(p)
    if (!o.center) { setBusy(''); setError('Choose a training centre first'); return }
    const { error: err } = await supabase.rpc('approve_player', { p_player: p.id, p_squad_number: sq ? parseInt(sq) : null, p_center: o.center, p_sponsored: o.sponsored, p_note: o.note || null, p_age_group: o.ageGroup || null, p_registration_fee: o.regFee !== '' ? parseInt(o.regFee) : null, p_monthly_fee: o.monthFee !== '' ? parseInt(o.monthFee) : null })
    setBusy('')
    if (err) { setError(err.message.includes('duplicate') ? 'That squad number is already taken' : err.message); return }
    const par = p.links?.[0]?.parent
    if (par?.phone) setNotify(n => [{ id: p.id, who: par.full_name, child: p.full_name, phone: par.phone, text: `Hello ${par.full_name.split(' ')[0]}, good news! ${p.full_name}'s registration at ${club.name} has been approved. Please open the app to see the training schedule and fees: ${window.location.origin}` }, ...n])
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
    if (err) { setError(friendly(err.message)); return }
    const par = p.links?.[0]?.parent
    if (par?.phone) setNotify(n => [{ id: p.id, who: par.full_name, child: p.full_name, phone: par.phone, rejected: true, text: `Hello ${par.full_name.split(' ')[0]}, we could not approve ${p.full_name}'s registration at ${club.name} yet. Reason: ${note.trim()}. Please open the app to check and fix it: ${window.location.origin}` }, ...n])
    setRejecting(null); setNote(''); load(); onChanged && onChanged()
  }

  if (loading) return <Spinner />

  return (
    <div className="page">
      <div className="page-hdr"><div><div className="page-title">Approvals</div><div className="page-sub">{items.length} registration{items.length === 1 ? '' : 's'} waiting for review</div></div></div>
      {error && <Note kind="error" style={{ marginBottom: 12 }}>{error}</Note>}
      {notify.map(n => (
        <Note key={n.id} kind={n.rejected ? 'warn' : 'ok'} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>{n.rejected ? 'Sent back' : 'Approved'}: <strong>{n.child}</strong>. Let {n.who} know:</div>
            <a className="btn btn-primary btn-sm" href={waChat(n.phone, n.text)} target="_blank" rel="noreferrer">Tell parent on WhatsApp</a>
            <button className="btn btn-ghost btn-sm" onClick={() => setNotify(x => x.filter(y => y.id !== n.id))}>Dismiss</button>
          </div>
        </Note>
      ))}
      {items.length === 0
        ? <div className="empty"><div className="empty-title">All caught up</div><div className="empty-sub">New parent registrations will appear here</div></div>
        : items.map(p => {
          const link = p.links?.[0]; const par = link?.parent
          return (
            <div key={p.id} className="card" style={{ marginBottom: 12 }}>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="avatar" style={{ width: 56, height: 56, minWidth: 56, overflow: 'hidden', flexShrink: 0 }}>{p.photo_url ? <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(p.full_name)}</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {p.date_of_birth ? `Born ${fmtFullDate(p.date_of_birth)} · age ${exactAge(p.date_of_birth)} · ${autoAgeGroup(p.date_of_birth)}` : 'No date of birth'}
                      {p.position ? ` · ${p.position}` : ''}{p.school_name ? ` · ${p.school_name}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {par ? `${link.relationship}: ${par.full_name}${par.phone ? ' · ' + par.phone : ''}${par.email ? ' · ' + par.email : ''}` : 'Parent details unavailable'}
                    </div>
                    {par?.alt_contact_name && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Alternative: {par.alt_contact_name} ({par.alt_contact_relationship}) · {par.alt_contact_phone}</div>}
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
                    <select value={optOf(p).center} onChange={e => setOpt(p, 'center', e.target.value)} style={{ minWidth: 180 }}><option value="">Training centre</option>{centers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    <select value={optOf(p).ageGroup} onChange={e => setOpt(p, 'ageGroup', e.target.value)} title="Age group"><option value="">Age group: {autoAgeGroup(p.date_of_birth) || '—'} (auto)</option>{AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select>
                    <input type="number" min="0" max="99" placeholder="Squad #" value={squadNo[p.id] || ''} onChange={e => setSquadNo(s => ({ ...s, [p.id]: e.target.value }))} style={{ width: 90 }} />
                    <input type="number" min="0" placeholder={`Reg. fee (${club.registration_fee ?? 2500})`} value={optOf(p).regFee} onChange={e => setOpt(p, 'regFee', e.target.value)} style={{ width: 130 }} title="Leave blank for the standard registration fee" />
                    <input type="number" min="1" placeholder={`Monthly (${club.monthly_fee ?? 2500})`} value={optOf(p).monthFee} onChange={e => setOpt(p, 'monthFee', e.target.value)} style={{ width: 130 }} title="Leave blank for the standard monthly fee" />
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}><input type="checkbox" style={{ width: 'auto' }} checked={optOf(p).sponsored} onChange={e => setOpt(p, 'sponsored', e.target.checked)} /> Sponsored (waive fees)</label>
                    {optOf(p).sponsored && <input placeholder="Sponsor / note" value={optOf(p).note} onChange={e => setOpt(p, 'note', e.target.value)} style={{ minWidth: 150 }} />}
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

function SetNewPassword({ onDone }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setError('')
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (pw !== pw2) { setError('Passwords do not match'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (err) setError(friendly(err.message)); else onDone()
  }
  return (
    <div className="login-wrap"><div className="login-card">
      <img src={LOGO} alt="Beyond the Ball" style={{ width: 80, height: 80, borderRadius: 14, margin: '0 auto 12px', display: 'block' }} />
      <div className="login-title">Choose a new password</div>
      <div className="login-sub">You are almost done</div>
      {error && <div className="login-error">{error}</div>}
      <form onSubmit={save}>
        <div className="form-group" style={{ marginBottom: 12 }}><label>New password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} required autoComplete="new-password" /></div>
        <div className="form-group" style={{ marginBottom: 20 }}><label>Confirm new password</label><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} required autoComplete="new-password" /></div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
      </form>
    </div></div>
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
  const [retryCode, setRetryCode] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      setSession(session)
      if (!session) { setProfile(null); setClub(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) { setLoading(false); return }
    async function loadProfile() {
      setProfileError('')
      let { data: prof } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle()
      if (!prof) {
        // First sign-in after sign-up: create the profile (parent, or coach when an invite code was given).
        const meta = session.user.user_metadata || {}
        const { error: regErr } = await supabase.rpc('register_account', { p_club_slug: CLUB_SLUG, p_full_name: meta.full_name || '', p_phone: meta.phone || null, p_code: retryCode || meta.invite_code || null })
        if (regErr) setProfileError('We could not set up your account: ' + regErr.message)
        else ({ data: prof } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle())
      }
      if (prof && prof.is_active === false) { setProfileError('Your account has been deactivated. Please contact the academy.'); prof = null }
      if (prof) {
        setProfile(prof)
        const { data: cl } = await supabase.from('clubs').select('*').eq('id', prof.club_id).single()
        setClub(cl)
        setPage(prof.role === 'parent' ? 'parent-dashboard' : prof.role === 'player' ? 'fixtures' : 'dashboard')
      }
      setLoading(false)
    }
    loadProfile()
  }, [session, retryCode])

  useEffect(() => {
    if (!profile) return
    errCtx.clubId = profile.club_id; errCtx.userId = session?.user?.id || null
    if (profile.role === 'manager' || profile.role === 'coach') {
      flushAttendanceQueue()
      const on = () => { flushAttendanceQueue() }
      window.addEventListener('online', on)
      return () => window.removeEventListener('online', on)
    }
  }, [profile, session])

  if (session === undefined || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <img src={LOGO} alt="Beyond the Ball" style={{ width: 72, height: 72, borderRadius: 14 }} />
      <Spinner />
      <p style={{ color: 'var(--text-muted)' }}>Loading SportsPulse...</p>
    </div>
  )

  if (session && recovering) return <SetNewPassword onDone={() => { setRecovering(false); window.history.replaceState(null, '', window.location.pathname) }} />
  if (!session) return <Login />
  if (!profile || !club) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      {profileError ? <Note kind="error" style={{ maxWidth: 360 }}>{profileError}</Note> : <><Spinner /><p style={{ color: 'var(--text-muted)' }}>Loading profile...</p></>}
      {profileError && profileError.includes('invite code') && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder="BTB-XXXXXXXX" />
          <button className="btn btn-primary" onClick={() => { setLoading(true); setRetryCode(codeInput.trim()) }}>Try again</button>
        </div>
      )}
      <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )

  if (profile.role === 'fan') return <FanApp club={club} />

  const navItems = {
    manager: [
      { id: 'dashboard', label: 'Dashboard', icon: <Icon name="home" /> },
      { id: 'approvals', label: 'Approvals', icon: <Icon name="check" /> },
      { id: 'squad', label: 'Squad', icon: <Icon name="users" /> },
      { id: 'fixtures', label: 'Fixtures', icon: <Icon name="calendar" /> },
      { id: 'match-centre', label: 'Match Centre', icon: <Icon name="ball" /> },
      { id: 'training', label: 'Training', icon: <Icon name="pulse" /> },
      { id: 'absences', label: 'Absences', icon: <Icon name="userx" /> },
      { id: 'fees', label: 'Fees', icon: <Icon name="wallet" /> },
      { id: 'messages', label: 'Messages', icon: <Icon name="message" /> },
      { id: 'analytics', label: 'Analytics', icon: <Icon name="chart" /> },
      { id: 'staff', label: 'Coaches', icon: <Icon name="shield" /> },
    ],
    coach: [
      { id: 'dashboard', label: 'Dashboard', icon: <Icon name="home" /> },
      { id: 'squad', label: 'Squad', icon: <Icon name="users" /> },
      { id: 'fixtures', label: 'Fixtures', icon: <Icon name="calendar" /> },
      { id: 'match-centre', label: 'Match Centre', icon: <Icon name="ball" /> },
      { id: 'training', label: 'Training', icon: <Icon name="pulse" /> },
      { id: 'absences', label: 'Absences', icon: <Icon name="userx" /> },
      { id: 'messages', label: 'Messages', icon: <Icon name="message" /> },
    ],
    player: [
      { id: 'fixtures', label: 'Fixtures', icon: <Icon name="calendar" /> },
      { id: 'training', label: 'Training', icon: <Icon name="pulse" /> },
      { id: 'messages', label: 'Messages', icon: <Icon name="message" /> },
    ],
    parent: [
      { id: 'parent-dashboard', label: 'My Children', icon: <Icon name="users" /> },
      { id: 'fixtures', label: 'Fixtures', icon: <Icon name="calendar" /> },
      { id: 'training', label: 'Training', icon: <Icon name="pulse" /> },
      { id: 'messages', label: 'Messages', icon: <Icon name="message" /> },
    ],
  }

  const items = navItems[profile.role] || navItems.player
  const MAIN_IDS = { manager: ['dashboard', 'approvals', 'training', 'fees'], coach: ['dashboard', 'squad', 'training', 'match-centre'], parent: ['parent-dashboard', 'fixtures', 'training', 'messages'] }
  const mainItems = MAIN_IDS[profile.role] ? MAIN_IDS[profile.role].map(id => items.find(i => i.id === id)).filter(Boolean) : items.slice(0, 4)

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <ManagerDashboard profile={profile} club={club} setPage={setPage} />
      case 'parent-dashboard': return <ParentDashboard profile={profile} club={club} setPage={setPage} />
      case 'staff': return profile.role === 'manager' ? <StaffPage club={club} profile={profile} /> : null
      case 'approvals': return profile.role !== 'manager' ? null : <ApprovalsPage profile={profile} club={club} />
      case 'squad': return <SquadPage userRole={profile.role} club={club} />
      case 'fixtures': return <FixturesPage userRole={profile.role} club={club} profile={profile} />
      case 'match-centre': return <MatchCentrePage club={club} userRole={profile.role} />
      case 'training': return <TrainingPage userRole={profile.role} club={club} profile={profile} />
      case 'absences': return profile.role === 'parent' ? null : <AbsencesPage club={club} profile={profile} />
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
            <img src={LOGO} alt="BTB" style={{ width: 40, height: 40, borderRadius: 8 }} />
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
        {mainItems.map(item => (
          <button key={item.id} className={`bottom-nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
        {items.length > mainItems.length && (
          <button className={`bottom-nav-item ${items.some(i => i.id === page) && !mainItems.some(i => i.id === page) ? 'active' : ''}`} onClick={() => setSidebarOpen(true)}>
            <span className="bottom-nav-icon"><Icon name="more" /></span>
            <span className="bottom-nav-label">More</span>
          </button>
        )}
      </nav>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>
)
