// Synthesized arcade sounds via Web Audio API — no external files required.

function tone(freq, dur, type = 'sine', vol = 0.25, ctx) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + dur)
}

function makeCtx() {
  return new (window.AudioContext || window.webkitAudioContext)()
}

// 0-2 hits — short low buzz: "nope / miss"
function playBuzz() {
  try {
    const ctx = makeCtx()
    tone(130, 0.12, 'sawtooth', 0.25, ctx)
    setTimeout(() => { tone(110, 0.18, 'sawtooth', 0.2, ctx) }, 100)
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

// 3-4 hits — clean double ping: "decent / good"
function playPing() {
  try {
    const ctx = makeCtx()
    tone(660, 0.12, 'sine', 0.25, ctx)
    setTimeout(() => { tone(880, 0.14, 'sine', 0.22, ctx) }, 90)
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

// 5 hits — ascending victory arpeggio: "perfect / goal horn"
function playGoalHorn() {
  try {
    const ctx = makeCtx()
    const notes = [440, 554, 659, 880]
    notes.forEach((f, i) => {
      setTimeout(() => tone(f, i === notes.length - 1 ? 0.5 : 0.12, 'sine', 0.3, ctx), i * 100)
    })
    setTimeout(() => ctx.close(), 1000)
  } catch {}
}

/**
 * Play a score-selection sound cue based on how many pucks were hit.
 * 0–2 → buzz  |  3–4 → ping  |  5 → goal horn
 */
export function playScoreSound(hits) {
  if (hits <= 2)  return playBuzz()
  if (hits <= 4)  return playPing()
  return playGoalHorn()
}

/**
 * Classic cash-register cha-ching — fires when a quest reward is claimed.
 * "Cha" = quick ascending strike; "Ching" = bright sustained ring + coin jingle.
 */
export function playCashRegister() {
  try {
    const ctx = makeCtx()
    // "Cha" — sharp drawer strike
    tone(900,  0.07, 'square',   0.20, ctx)
    setTimeout(() => tone(1100, 0.06, 'square',   0.17, ctx), 65)
    // "Ching" — bright metallic ring
    setTimeout(() => tone(2200, 0.04, 'square',   0.22, ctx), 125)
    setTimeout(() => tone(1760, 0.30, 'sine',     0.28, ctx), 135)
    setTimeout(() => tone(2640, 0.12, 'triangle', 0.14, ctx), 190)
    // Coin jingle decay
    setTimeout(() => tone(2200, 0.10, 'triangle', 0.11, ctx), 290)
    setTimeout(() => tone(1980, 0.10, 'triangle', 0.08, ctx), 360)
    setTimeout(() => ctx.close(), 900)
  } catch {}
}
