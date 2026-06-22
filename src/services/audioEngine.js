/**
 * Centralized Web Audio synthesizer — singleton, class-based.
 * All sound logic lives here; useAudio.js is a thin React adapter.
 */
class AudioEngine {
  constructor() {
    this.ctx      = null
    this.isMuted  = false
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  setMute(state) { this.isMuted = state }
  get muted()    { return this.isMuted  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  _note(freq, delay, dur, shape = 'sine', vol = 0.22) {
    const { ctx: ac } = this
    const T = ac.currentTime
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = shape
    o.frequency.value = freq
    g.gain.setValueAtTime(vol, T + delay)
    g.gain.exponentialRampToValueAtTime(0.001, T + delay + dur)
    o.connect(g); g.connect(ac.destination)
    o.start(T + delay); o.stop(T + delay + dur + 0.05)
  }

  _noise(delay, dur, fStart, fEnd, vol = 0.28) {
    const { ctx: ac } = this
    const T   = ac.currentTime
    const len = Math.ceil(ac.sampleRate * (dur + 0.05))
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src  = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type  = 'bandpass'
    filt.frequency.setValueAtTime(fStart, T + delay)
    filt.frequency.exponentialRampToValueAtTime(fEnd, T + delay + dur * 0.65)
    filt.Q.value = 1.4
    const g = ac.createGain()
    g.gain.setValueAtTime(vol, T + delay)
    g.gain.exponentialRampToValueAtTime(0.001, T + delay + dur)
    src.connect(filt); filt.connect(g); g.connect(ac.destination)
    src.start(T + delay); src.stop(T + delay + dur + 0.05)
  }

  // ── Named sound methods ────────────────────────────────────────────────────

  /** D5 → A5 ascending sweep — general success / standard hit */
  playSuccess() {
    if (this.isMuted) return
    this.init()
    const osc  = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime)          // D5
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3)
    osc.connect(gain); gain.connect(this.ctx.destination)
    osc.start(); osc.stop(this.ctx.currentTime + 0.3)
  }

  /** Sawtooth 180 Hz → 90 Hz womp — zero-hit miss */
  playCelery() {
    if (this.isMuted) return
    this.init()
    // Sproing wobble up then down
    const os = this.ctx.createOscillator(); const gs = this.ctx.createGain()
    os.type = 'sine'
    os.frequency.setValueAtTime(260, this.ctx.currentTime)
    os.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.07)
    os.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.22)
    gs.gain.setValueAtTime(0.26, this.ctx.currentTime)
    gs.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25)
    os.connect(gs); gs.connect(this.ctx.destination)
    os.start(); os.stop(this.ctx.currentTime + 0.28)
    // Womp 1 — sawtooth descent
    const osc  = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, this.ctx.currentTime + 0.33)
    osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.73)
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime + 0.33)
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.73)
    osc.connect(gain); gain.connect(this.ctx.destination)
    osc.start(this.ctx.currentTime + 0.33)
    osc.stop(this.ctx.currentTime + 0.74)
    // Womp 2 — deeper, slower descent
    const ow2 = this.ctx.createOscillator(); const gw2 = this.ctx.createGain()
    ow2.type = 'sawtooth'
    ow2.frequency.setValueAtTime(310, this.ctx.currentTime + 0.78)
    ow2.frequency.exponentialRampToValueAtTime(68, this.ctx.currentTime + 1.24)
    gw2.gain.setValueAtTime(0.25, this.ctx.currentTime + 0.78)
    gw2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.27)
    ow2.connect(gw2); gw2.connect(this.ctx.destination)
    ow2.start(this.ctx.currentTime + 0.78); ow2.stop(this.ctx.currentTime + 1.30)
  }

  /** Quick low-to-high whoosh — UI tab navigation */
  playNav() {
    this.init()
    const { ctx: ac } = this; const T = ac.currentTime
    const o = ac.createOscillator(); const g = ac.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(160, T)
    o.frequency.exponentialRampToValueAtTime(940, T + 0.10)
    g.gain.setValueAtTime(0.10, T); g.gain.exponentialRampToValueAtTime(0.001, T + 0.12)
    o.connect(g); g.connect(ac.destination); o.start(T); o.stop(T + 0.14)
    this._noise(0, 0.08, 1200, 4000, 0.06)
  }

  /** Crisp bell chime — standard zone hit */
  playHit() {
    this.init()
    ;[[1319, 'sine', 0.26, 0.55], [2637, 'triangle', 0.13, 0.38], [3956, 'triangle', 0.06, 0.28]]
      .forEach(([freq, shape, vol, dur]) => this._note(freq, 0, dur, shape, vol))
  }

  /** Crackling noise burst + sub kick — 5+ hits */
  playFire() {
    this.init()
    const { ctx: ac } = this; const T = ac.currentTime
    this._noise(0,    0.22, 600,  4000, 0.38)
    this._noise(0.01, 0.10, 2500, 9000, 0.18)
    const o = ac.createOscillator(); const g = ac.createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(130, T); o.frequency.exponentialRampToValueAtTime(38, T + 0.2)
    g.gain.setValueAtTime(0.32, T); g.gain.exponentialRampToValueAtTime(0.001, T + 0.22)
    o.connect(g); g.connect(ac.destination); o.start(T); o.stop(T + 0.24)
    this._note(1047, 0.04, 0.22, 'sine', 0.12)
    this._note(1319, 0.12, 0.18, 'sine', 0.09)
  }

  /** Warm ascending chime — gentle nudge on 0-hit set */
  playIce() {
    this.init()
    // G4 → B4 → D5 → G5 soft ascending chime
    ;[[392, 0.00, 0.22], [494, 0.11, 0.22], [587, 0.22, 0.24], [784, 0.34, 0.38]]
      .forEach(([freq, delay, dur]) => this._note(freq, delay, dur, 'sine', 0.13))
    // Gentle shimmer overtone
    this._note(1568, 0.36, 0.30, 'triangle', 0.04)
  }

  /** Snappy ascending arpeggio — badge unlock */
  playBadge() {
    this.init()
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => this._note(f, i * 0.10, 0.26, 'sine', 0.17))
  }

  /** Heroic C4→C6 fanfare — level up */
  playLevelUp() {
    this.init()
    const melody = [262, 330, 392, 523, 659, 784, 1047]
    melody.forEach((freq, i) => {
      this._note(freq, i * 0.10, 0.38, 'sine', 0.22)
      this._note(freq * 2, i * 0.10, 0.24, 'triangle', 0.09)
    })
    ;[523, 659, 784, 1047].forEach((f, k) => this._note(f, 0.76, 0.60, 'sine', [0.20, 0.17, 0.13, 0.10][k]))
    this._note(2093, 0.80, 0.45, 'triangle', 0.07)
    this._noise(0.76, 0.35, 2000, 8000, 0.04)
  }

  /** Celebration sparkle */
  playConfetti() {
    this.init()
    ;[523, 659, 784, 1047].forEach((f, i) => this._note(f, i * 0.07, 0.22, 'sine', 0.16))
  }

  // ── MP3 file player — for pre-recorded sound assets in /public ───────────
  playMp3(path, volume = 0.9) {
    if (this.isMuted) return
    try {
      const audio = new Audio(path)
      audio.volume = volume
      audio.play().catch(() => {})
    } catch {}
  }

  /** Cinematic impact sting — fires when a new badge achievement unlocks */
  playBadgeUnlock() {
    this.playMp3('/movie-trailer-epic-impact.mp3', 0.8)
  }

  /** Melodic flute chime — fires on streak freeze use or cosmetic equip */
  playUtilitySuccess() {
    this.playMp3('/melodical-flute-music-notification.mp3', 0.85)
  }

  /** Fire whoosh — fires when a valid session ends and the streak increments */
  playStreakIgnite() {
    this.playMp3('/short-fire-whoosh.mp3', 0.9)
  }

  /** Streak broken sting — fires when the broken-streak modal initializes */
  playStreakBroken() {
    this.playMp3('/streak-broken.mp3', 0.9)
  }

  /** Sad trombone taunt — fires on opponent's loss screen or as a shop preview */
  playTauntTrombone() {
    this.playMp3('/sad-game-over-trombone.mp3', 0.85)
  }

  /** Mail received chime — fires once when a rage bait or compliment envelope appears */
  playMailReceived() {
    this.playMp3('/mail-received.mp3', 0.88)
  }

  /** Quest spin — fires when the daily quest lever is pulled */
  playQuestSpin() {
    this.playMp3('/store-spin.mp3', 0.85)
  }

  /** Explosive reveal sting — fires when a rage bait envelope is opened */
  playRageBaitReveal() {
    this.playMp3('/rage-bait-explode.mp3', 0.9)
  }

  /** Sparkle shine — fires when a compliment envelope is opened */
  playComplimentReveal() {
    this.playMp3('/compliment-shine.mp3', 0.9)
  }

  /** Sword swish — fires when a versus challenge is successfully dispatched */
  playChallengeSent() {
    this.playMp3('/swift-sword-strike.mp3', 0.88)
  }

  /** Alert chime — fires when it's your turn in a PUCK game */
  playYourTurn() {
    this.init()
    // Quick ascending arpeggio: snappy and attention-grabbing
    ;[523, 659, 784, 1047].forEach((f, i) => this._note(f, i * 0.08, 0.20, 'sine', 0.18))
  }

  // ── Universal dispatcher (maps legacy type strings) ────────────────────────
  play(type) {
    if (this.isMuted) return
    try {
      switch (type) {
        case 'nav':      return this.playNav()
        case 'hit':      return this.playHit()
        case 'success':  return this.playSuccess()
        case 'fire':     return this.playFire()
        case 'ice':      return this.playIce()
        case 'badge':    return this.playBadge()
        case 'levelup':  return this.playLevelUp()
        case 'confetti': return this.playConfetti()
        case 'celery':   return this.playCelery()
      }
    } catch {}
  }
}

export const audioEngine = new AudioEngine()
