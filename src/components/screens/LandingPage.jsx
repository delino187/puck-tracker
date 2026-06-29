// Purely presentational — hardcoded mock UI previews with zero DB / auth
// dependencies. Import and drop into HomeScreen below the CTA buttons.

// ── Shared micro-components ────────────────────────────────────────────────────

function Pill({ label, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: `${color}14`,
      border: `1px solid ${color}40`,
      borderRadius: 6, padding: '2px 9px', marginBottom: 12,
      fontFamily: "'Barlow Condensed',sans-serif",
      fontSize: 9, fontWeight: 800, letterSpacing: '0.16em',
      color, textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

function CardTitle({ children }) {
  return (
    <div style={{
      fontFamily: "'Bangers',sans-serif",
      fontSize: 22, letterSpacing: '0.04em',
      color: '#f1f5f9', lineHeight: 1.1,
      marginTop: 14, marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

function Caption({ children }) {
  return (
    <div style={{
      fontFamily: 'Barlow,sans-serif',
      fontSize: 13, color: '#64748b', lineHeight: 1.55,
    }}>
      {children}
    </div>
  )
}

const CARD = {
  background: 'rgba(6,13,26,0.80)',
  border: '1px solid #1e3a5f',
  borderRadius: 16,
  padding: '16px',
  marginBottom: 14,
  overflow: 'hidden',
}

// ── Card 1: Accuracy & Stats Tracker ──────────────────────────────────────────

function StatsTrackerCard() {
  // r=36  →  circumference = 2π·36 ≈ 226.19
  const C = 226.19

  return (
    <div style={CARD}>
      <Pill label="Accuracy & Stats Tracker" color="#3b82f6" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

        {/* Progress ring */}
        <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
          <svg viewBox="0 0 88 88" width="88" height="88">
            <defs>
              <linearGradient id="lp-ring-fire" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle cx="44" cy="44" r="36" fill="none" stroke="#1e3a5f" strokeWidth="6" />
            {/* Progress — full ring (goal exceeded) */}
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke="url(#lp-ring-fire)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={0}
              transform="rotate(-90 44 44)"
              style={{ filter: 'drop-shadow(0 0 5px #f9731655)' }}
            />
          </svg>
          {/* Center label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 26, color: '#f97316', lineHeight: 1 }}>133</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>/ 100</div>
          </div>
        </div>

        {/* Stats column */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 11, fontWeight: 800, color: '#f97316',
            letterSpacing: '0.08em', marginBottom: 8,
          }}>
            🔥 GOAL CRUSHED — you're locked in!
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
            {[['133', 'TODAY'], ['68%', 'ACC'], ['12d 🔥', 'STREAK']].map(([val, lbl]) => (
              <div key={lbl} style={{
                background: '#0a0f1a', borderRadius: 8,
                padding: '6px 3px', textAlign: 'center',
                border: '1px solid #1e3a5f',
              }}>
                <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 15, color: '#f1f5f9', lineHeight: 1 }}>{val}</div>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 7, fontWeight: 800, color: '#06b6d4', letterSpacing: '0.08em', marginTop: 2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CardTitle>Track Every Snipe.</CardTitle>
      <Caption>Set custom volume targets, log reps instantly, and visualize your training consistency.</Caption>
    </div>
  )
}

// ── Card 2: Dynamic Quests ─────────────────────────────────────────────────────

function QuestsCard() {
  return (
    <div style={CARD}>
      <Pill label="Dynamic Quests" color="#22c55e" />

      {/* Mock quest row */}
      <div style={{
        background: '#060d1a', borderRadius: 12,
        padding: '12px 14px',
        border: '1px solid #22c55e2e',
        boxShadow: '0 0 12px #22c55e08',
      }}>
        {/* Quest header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🎯</span>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 13, fontWeight: 800, letterSpacing: '0.03em',
              color: '#f1f5f9', lineHeight: 1.25,
            }}>
              Hit 25 Top Lefts this Week
            </div>
          </div>
          {/* Reward badge */}
          <div style={{
            background: '#0a1f0e', border: '1px solid #22c55e55',
            borderRadius: 8, padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 3,
            marginLeft: 8, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10 }}>💎</span>
            <span style={{ fontFamily: "'Bangers',sans-serif", fontSize: 14, color: '#22c55e' }}>100</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: '0.1em' }}>PROGRESS</span>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#475569' }}>0 / 25</span>
        </div>
        <div style={{ height: 5, background: '#1e3a5f', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          {/* 0% progress intentionally — shows fresh quest state */}
          <div style={{ height: '100%', width: '0%', background: 'linear-gradient(90deg,#22c55e,#34d399)', borderRadius: 3 }} />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            background: '#0f2e1a', border: '1px solid #22c55e44',
            borderRadius: 6, padding: '2px 8px',
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 8, fontWeight: 800, color: '#22c55e', letterSpacing: '0.14em',
          }}>
            COMMON
          </div>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, color: '#334155' }}>
            · Resets Monday
          </span>
        </div>
      </div>

      <CardTitle>Crush Weekly Challenges.</CardTitle>
      <Caption>Complete balanced accuracy and volume objectives to stack up your diamond vault.</Caption>
    </div>
  )
}

// ── Card 3: Head-to-Head VS Mode ───────────────────────────────────────────────

function VersusCard() {
  const p1Letters = ['P', null, null, null]
  const p2Letters = [null, null, null, null]

  return (
    <div style={CARD}>
      <Pill label="Head-to-Head" color="#ef4444" />

      {/* Mock P-U-C-K game layout */}
      <div style={{
        background: '#060d1a', borderRadius: 12,
        border: '1px solid #ef444420',
        overflow: 'hidden',
      }}>
        {/* Neon accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg,#7f1d1d,#ef4444,#f97316)' }} />

        <div style={{ padding: '11px 12px' }}>
          {/* Game badge row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
            <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 24, letterSpacing: '0.06em', color: '#ef4444', textShadow: '0 0 12px #ef444450', lineHeight: 1 }}>
              P-U-C-K
            </div>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <div style={{ background: '#ef4444', borderRadius: 6, padding: '2px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
                1 ACTIVE
              </div>
            </div>
          </div>

          {/* Player columns */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', marginBottom: 9 }}>
            {/* Player 1 — setter */}
            <div style={{ flex: 1, background: '#1a0608', borderRadius: 9, padding: '8px 10px', border: '1px solid #ef444430' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 3 }}>PLAYER 1</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 11, color: '#ef4444', letterSpacing: '0.04em', marginBottom: 5 }}>SETTER ▶</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {p1Letters.map((l, i) => (
                  <div key={i} style={{
                    width: 17, height: 17, borderRadius: 4,
                    background: l ? '#ef4444' : '#0a0f1a',
                    border: `1px solid ${l ? '#ef4444' : '#1e3a5f'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Bangers',sans-serif", fontSize: 10, color: '#fff',
                  }}>
                    {l ?? ''}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', fontFamily: "'Bangers',sans-serif", fontSize: 13, color: '#334155', padding: '0 1px' }}>VS</div>

            {/* Player 2 — waiting */}
            <div style={{ flex: 1, background: '#0a0f1a', borderRadius: 9, padding: '8px 10px', border: '1px solid #1e3a5f' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 3 }}>PLAYER 2</div>
              <div style={{ fontFamily: "'Bangers',sans-serif", fontSize: 11, color: '#334155', letterSpacing: '0.04em', marginBottom: 5 }}>WAITING…</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {p2Letters.map((_, i) => (
                  <div key={i} style={{
                    width: 17, height: 17, borderRadius: 4,
                    background: '#0a0f1a', border: '1px solid #1e3a5f',
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Round detail chips */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['ZONE: TOP LEFT', 'TRICK: BACKHAND'].map(t => (
              <div key={t} style={{
                background: '#1a0608', border: '1px solid #ef444422',
                borderRadius: 5, padding: '2px 7px',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 9, fontWeight: 700, color: '#ef4444', letterSpacing: '0.06em',
              }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <CardTitle>Battle Your Crew.</CardTitle>
      <Caption>Challenge friends to quick versus matches or competitive games of PUCK. Submit your turns and climb the leaderboards together.</Caption>
    </div>
  )
}

// ── Card 4: Locker Room Shop ───────────────────────────────────────────────────

function ShopCard() {
  const waveHeights = [4, 9, 6, 13, 5, 11, 7, 10, 4, 12, 6, 9, 5, 11, 7]

  return (
    <div style={CARD}>
      <Pill label="Locker Room Shop" color="#a855f7" />

      {/* Mock shop item */}
      <div style={{
        background: '#060d1a', borderRadius: 12,
        padding: '12px 14px',
        border: '1px solid #a855f730',
        boxShadow: '0 0 12px #a855f70a',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Item icon tile */}
          <div style={{
            width: 54, height: 54, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg,#2e1065,#4c1d95)',
            border: '2px solid #a855f755',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
            boxShadow: '0 0 18px #a855f730',
          }}>
            🎺
          </div>

          {/* Item meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Bangers',sans-serif",
              fontSize: 19, letterSpacing: '0.04em',
              color: '#f1f5f9', lineHeight: 1, marginBottom: 3,
            }}>
              SAD TROMBONE
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 10, color: '#64748b',
              letterSpacing: '0.03em', marginBottom: 7,
            }}>
              Audio Taunt · Plays on opponent loss
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* EQUIPPED badge */}
              <div style={{
                background: '#052e16', border: '1px solid #22c55e66',
                borderRadius: 6, padding: '2px 8px',
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 9, fontWeight: 800, color: '#22c55e', letterSpacing: '0.12em',
              }}>
                ✓ EQUIPPED
              </div>
              {/* Struck-through price */}
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontSize: 11, color: '#1e3a5f',
                letterSpacing: '0.04em', textDecoration: 'line-through',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                150 💎
              </div>
            </div>
          </div>
        </div>

        {/* Fake audio waveform */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontSize: 8, fontWeight: 800, color: '#22c55e',
            letterSpacing: '0.1em', marginRight: 5,
          }}>
            ▶ NOW PLAYING
          </div>
          {waveHeights.map((h, i) => (
            <div
              key={i}
              style={{
                width: 3, height: h, borderRadius: 2,
                background: `hsl(${142 + i * 4},65%,${44 + (i % 3) * 9}%)`,
                opacity: 0.75 + (i % 4) * 0.06,
              }}
            />
          ))}
        </div>
      </div>

      <CardTitle>Unlock Premium Taunts.</CardTitle>
      <Caption>Spend your hard-earned diamonds on audio effects that play automatically when your opponent loses a challenge.</Caption>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ marginTop: 40, paddingBottom: 12 }}>

      {/* Section divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,#3b82f666)' }} />
        <div style={{
          fontFamily: "'Bangers',sans-serif",
          fontSize: 34, letterSpacing: '0.14em', lineHeight: 1,
          color: '#f1f5f9', textTransform: 'uppercase',
          textShadow: '0 2px 0 #1d4ed8, 0 0 28px #60a5fa55',
          padding: '0 2px',
        }}>
          HOW IT WORKS
        </div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,#3b82f666,transparent)' }} />
      </div>

      <StatsTrackerCard />
      <QuestsCard />
      <VersusCard />
      <ShopCard />
    </div>
  )
}
