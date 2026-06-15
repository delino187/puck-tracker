import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore.js'

function applyTheme(isOutside) {
  document.documentElement.classList.toggle('dark', !isOutside)
}

// Apply the persisted theme synchronously at import time to prevent a flash of
// the wrong theme on first paint. Zustand rehydrates from localStorage
// synchronously, so getState() already has the correct value here.
applyTheme(useAppStore.getState().settings.isOutsideMode)

export function useTheme() {
  const isOutsideMode   = useAppStore(state => state.settings.isOutsideMode)
  const toggleOutsideFn = useAppStore(state => state.toggleOutsideMode)

  useEffect(() => { applyTheme(isOutsideMode) }, [isOutsideMode])

  return {
    theme:             isOutsideMode ? 'outside' : 'dark',
    toggleOutsideMode: toggleOutsideFn,
    isOutside:         isOutsideMode,
  }
}
