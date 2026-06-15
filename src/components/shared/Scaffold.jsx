import { ChevronLeft } from 'lucide-react'
import GlobalStyles from './GlobalStyles.jsx'
import { APP_BG } from '../../styles.js'

export default function Scaffold({ children, onBack, title }) {
  return (
    <div style={APP_BG}>
      <GlobalStyles />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px' }}>
        <button
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            marginBottom: 14, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14,
          }}
          onClick={onBack}
        >
          <ChevronLeft size={17} /> Back
        </button>
        {title && (
          <div
            style={{
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900,
              fontSize: 26, marginBottom: 18, color: 'var(--text-1)',
            }}
          >
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
