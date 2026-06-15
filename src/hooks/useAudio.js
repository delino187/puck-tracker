/**
 * React adapter — delegates all sound synthesis to audioEngine singleton.
 * Components call play('hit'), play('fire'), etc. exactly as before.
 */
import { useCallback } from 'react'
import { audioEngine } from '../services/audioEngine.js'

export function useAudio() {
  return useCallback((type) => audioEngine.play(type), [])
}

// Expose the singleton so non-React modules can call it directly
export { audioEngine }
