import { useEffect } from 'react'
import { useApp } from './store'

/** Seconds the arrow keys move the playhead per press. */
const STEP = 5

/**
 * Keyboard shortcuts for playback and selection.
 *
 * Scrubbing a replay is a two-handed job -- one hand on the map, one on the
 * clock -- so the transport is reachable without going back to the controls.
 *
 * Bound on the window rather than on a focused element so they work wherever
 * the pointer happens to be, with typing in a field excluded.
 */
export function useKeyboard(duration: number | null): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const { time, playing, setTime, setPlaying, setSelectedPlayer } = useApp.getState()

      switch (event.key) {
        case ' ':
          if (duration === null) return
          event.preventDefault()
          // Replay from the top rather than sitting stuck at the end.
          if (!playing && time >= duration) setTime(0)
          setPlaying(!playing)
          return

        case 'ArrowLeft':
          if (duration === null) return
          event.preventDefault()
          setPlaying(false)
          setTime(Math.max(0, time - STEP))
          return

        case 'ArrowRight':
          if (duration === null) return
          event.preventDefault()
          setPlaying(false)
          setTime(Math.min(duration, time + STEP))
          return

        case 'Escape':
          setSelectedPlayer(null)
          return

        default:
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [duration])
}
