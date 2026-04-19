import type { CSSProperties } from 'react'

export type IconName =
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'assets'
  | 'plus'
  | 'export'
  | 'upload'
  | 'search'
  | 'close'
  | 'refresh'
  | 'calendar'
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'deposit'
  | 'withdraw'
  | 'short'
  | 'fee'
  | 'chevron-right'
  | 'chevron-down'
  | 'user'
  | 'csv'
  | 'menu'
  | 'home'
  | 'spark-up'
  | 'spark-down'
  | 'plan'

interface IconProps {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
  style?: CSSProperties
}

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.5, style }: IconProps) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...svgProps}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      )
    case 'accounts':
      return (
        <svg {...svgProps}>
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </svg>
      )
    case 'transactions':
      return (
        <svg {...svgProps}>
          <path d="M7 7h12l-3-3M17 17H5l3 3" />
        </svg>
      )
    case 'assets':
      return (
        <svg {...svgProps}>
          <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...svgProps}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'export':
      return (
        <svg {...svgProps}>
          <path d="M12 3v12M8 7l4-4 4 4" />
          <path d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...svgProps}>
          <path d="M12 16V4M8 8l4-4 4 4" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
      )
    case 'search':
      return (
        <svg {...svgProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'close':
      return (
        <svg {...svgProps}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...svgProps}>
          <path d="M3 12a9 9 0 0115-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 01-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...svgProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      )
    case 'buy':
      return (
        <svg {...svgProps}>
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      )
    case 'sell':
      return (
        <svg {...svgProps}>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      )
    case 'dividend':
      return (
        <svg {...svgProps}>
          <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
    case 'interest':
      return (
        <svg {...svgProps}>
          <path d="M5 19L19 5M8 8a2 2 0 110-4 2 2 0 010 4zM16 20a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      )
    case 'deposit':
      return (
        <svg {...svgProps}>
          <rect x="3" y="10" width="18" height="10" rx="1" />
          <path d="M7 10V7a5 5 0 0110 0v3" />
        </svg>
      )
    case 'withdraw':
      return (
        <svg {...svgProps}>
          <rect x="3" y="4" width="18" height="10" rx="1" />
          <path d="M7 14v3a5 5 0 0010 0v-3" />
        </svg>
      )
    case 'short':
      return (
        <svg {...svgProps}>
          <path d="M4 20l8-8 4 4 4-4" />
          <path d="M16 16h4v-4" />
        </svg>
      )
    case 'fee':
      return (
        <svg {...svgProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 12h10" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg {...svgProps}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg {...svgProps}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      )
    case 'user':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
      )
    case 'csv':
      return (
        <svg {...svgProps}>
          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
          <path d="M14 3v5h5" />
        </svg>
      )
    case 'menu':
      return (
        <svg {...svgProps}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )
    case 'home':
      return (
        <svg {...svgProps}>
          <path d="M3 12l9-8 9 8v8a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-8z" />
        </svg>
      )
    case 'spark-up':
      return (
        <svg {...svgProps}>
          <path d="M3 17l4-5 4 2 5-7 5 4" />
        </svg>
      )
    case 'spark-down':
      return (
        <svg {...svgProps}>
          <path d="M3 7l4 5 4-2 5 7 5-4" />
        </svg>
      )
    case 'plan':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

export default Icon
