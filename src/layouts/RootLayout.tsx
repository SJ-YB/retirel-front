import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { useIsMobile } from '../hooks/useIsMobile'

interface NavItem {
  key: string
  label: string
  icon: IconName
  mobileLabel?: string
}

const NAV_ITEMS: NavItem[] = [
  { key: '/', label: 'Dashboard', icon: 'dashboard', mobileLabel: 'Home' },
  { key: '/accounts', label: 'Accounts', icon: 'accounts' },
  { key: '/transactions', label: 'Transactions', icon: 'transactions', mobileLabel: 'Txns' },
  { key: '/assets', label: 'Assets', icon: 'assets' },
]

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        padding: '28px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-2)',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 44,
          paddingLeft: 4,
        }}
      >
        <div className="wordmark" style={{ fontSize: 30 }}>
          Retirel
        </div>
        <div className="label-caps" style={{ color: 'var(--text-muted)', fontSize: 9 }}>
          V.1
        </div>
      </div>

      <div className="label-caps" style={{ padding: '0 12px 10px' }}>
        Overview
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.key === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.key)
          return (
            <div
              key={item.key}
              className={'nav-link' + (isActive ? ' active' : '')}
              onClick={() => navigate(item.key)}
            >
              <span className="nav-ico">
                <Icon name={item.icon} size={16} />
              </span>
              <span>{item.label}</span>
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 8px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontFamily: 'var(--serif)',
            fontStyle: 'italic',
          }}
        >
          R
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>Retirel Couple</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
            우리 부부 · 2 members
          </div>
        </div>
      </div>
    </aside>
  )
}

function MobileHeader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="wordmark" style={{ fontSize: 22 }}>
        Retirel
      </div>
      <button className="btn" style={{ padding: 8, borderRadius: 8 }} type="button">
        <Icon name="refresh" size={14} />
      </button>
    </div>
  )
}

function MobileTabbar() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        padding: '8px 10px 14px',
        background: 'rgba(11,18,32,0.96)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.key === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.key)
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 4px',
              minHeight: 48,
              color: isActive ? 'var(--accent)' : 'var(--text-3)',
              borderRadius: 8,
            }}
          >
            <Icon name={item.icon} size={18} />
            <span style={{ fontSize: 10, letterSpacing: '0.04em' }}>
              {item.mobileLabel ?? item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function RootLayout() {
  const isMobile = useIsMobile()
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {!isMobile && <Sidebar />}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && <MobileHeader />}
        <Outlet />
        {isMobile && <div style={{ height: 80 }} />}
      </main>
      {isMobile && <MobileTabbar />}
    </div>
  )
}

export default RootLayout
