import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3, Blocks, BriefcaseBusiness, ChevronDown, CircleHelp, FilePlus2, FolderKanban,
  LayoutDashboard, LogOut, Menu, Moon, ScanText, ShieldCheck, Sun, Wifi, WifiOff, X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from './Logo'

function useClickAway(active: boolean, onAway: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active) return
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onAway()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onAway()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [active, onAway])
  return ref
}

const roleLabel = { lawyer: 'Advocate workspace', paralegal: 'Legal aid workspace', claimant: 'My justice workspace' } as const

function AccountMenu({ variant, dark, setDark }: { variant: 'sidebar' | 'topbar'; dark: boolean; setDark: (value: boolean) => void }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useClickAway(open, () => setOpen(false))

  return (
    <div className="account-menu" ref={ref}>
      <button
        type="button"
        className={variant === 'sidebar' ? 'account-menu-trigger workspace-pill' : 'account-menu-trigger icon-button'}
        aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
      >
        {variant === 'sidebar'
          ? <><span className="avatar avatar-small">{user?.initials}</span><span><small>{user ? roleLabel[user.role] : ''}</small><strong>{user?.name}</strong></span><ChevronDown size={16} aria-hidden="true" /></>
          : <span className="avatar">{user?.initials}</span>}
      </button>
      {open && (
        <div className={`account-menu-panel ${variant === 'topbar' ? 'align-right' : ''}`} role="menu">
          <div className="account-menu-user"><strong>{user?.name}</strong><small>{user?.email}</small></div>
          <button role="menuitem" className="account-menu-item" onClick={() => setDark(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Light mode' : 'Dark mode'}</button>
          <button role="menuitem" className="account-menu-item danger" onClick={logout}><LogOut size={16} /> Log out</button>
        </div>
      )}
    </div>
  )
}

function HelpMenu() {
  const [open, setOpen] = useState(false)
  const ref = useClickAway(open, () => setOpen(false))
  return (
    <div className="account-menu" ref={ref}>
      <button type="button" className="icon-button" aria-haspopup="menu" aria-expanded={open} aria-label="Help" onClick={() => setOpen((value) => !value)}><CircleHelp /></button>
      {open && (
        <div className="help-panel" role="menu">
          <h3>Getting around Katiba OS</h3>
          <ul>
            <li>Use the sidebar to switch between your workspace sections.</li>
            <li>Your account menu (avatar, top right) has dark mode and log out.</li>
            <li>Drafts save automatically and work offline.</li>
            <li>Every AI output is a draft — a named human reviews before anything is filed.</li>
          </ul>
        </div>
      )}
    </div>
  )
}

const claimantNav = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/cases/case-amina', label: 'My case', icon: FolderKanban },
  { to: '/app/new', label: 'Start a claim', icon: FilePlus2 },
  { to: '/app/platform', label: 'Katiba engines', icon: Blocks },
  { to: '/app/security', label: 'Privacy', icon: ShieldCheck },
]

const paralegalNav = [
  { to: '/app/review', label: 'Review queue', icon: BriefcaseBusiness, end: true },
  { to: '/app/cases/case-amina', label: 'Case workspace', icon: FolderKanban },
  { to: '/app/analytics', label: 'Impact', icon: BarChart3 },
  { to: '/app/contracts', label: 'Contract engine', icon: ScanText },
  { to: '/app/platform', label: 'Platform', icon: Blocks },
  { to: '/app/security', label: 'Security', icon: ShieldCheck },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [online, setOnline] = useState(navigator.onLine)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(localStorage.getItem('katiba_os_theme') === 'dark')
  const nav = user?.role === 'claimant' ? claimantNav : paralegalNav

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('katiba_os_theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {!online && <div className="offline-banner" role="status"><WifiOff size={16} /> Offline mode — your draft is saved on this device.</div>}

      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-head">
          <NavLink to={user?.role === 'claimant' ? '/app' : '/app/review'} aria-label="Katiba OS home"><Logo /></NavLink>
          <button className="icon-button sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
        </div>

        <AccountMenu variant="sidebar" dark={dark} setDark={setDark} />

        <nav className="side-nav">
          <p className="nav-eyebrow">Workspace</p>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon size={20} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-trust">
          <span className="trust-icon"><ShieldCheck size={19} /></span>
          <div><strong>Private by design</strong><small>Access-controlled · consent-based · auditable</small></div>
        </div>
        <div className="sidebar-actions">
          <button className="nav-link" onClick={() => setDark(!dark)}>{dark ? <Sun size={20} /> : <Moon size={20} />}<span>{dark ? 'Light mode' : 'Dark mode'}</span></button>
          <button className="nav-link" onClick={logout}><LogOut size={20} /><span>Leave demo</span></button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu overlay" />}

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
            <div className="mobile-logo"><Logo /></div>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${online ? 'online' : ''}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? 'Synced' : 'Offline'}</span>
            <HelpMenu />
            <AccountMenu variant="topbar" dark={dark} setDark={setDark} />
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}><Outlet /></main>

        <nav className="bottom-nav" aria-label="Mobile navigation">
          {nav.slice(0, 4).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? 'bottom-link active' : 'bottom-link'}>
              <Icon size={21} /><span>{label.replace('Start a claim', 'New claim').replace('Case workspace', 'Case')}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{copy && <p>{copy}</p>}</div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  return <span className={`status-pill status-${status}`}><span />{label}</span>
}

export function ReadinessRing({ value, size = 'large' }: { value: number; size?: 'small' | 'large' }) {
  return (
    <div className={`readiness-ring ${size}`} style={{ '--progress': `${value * 3.6}deg` } as React.CSSProperties} aria-label={`${value}% case readiness`}>
      <div><strong>{value}%</strong>{size === 'large' && <small>ready</small>}</div>
    </div>
  )
}
