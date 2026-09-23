import { useEffect } from 'react'
import { useApp } from './store'

/**
 * Advances the playhead while playback is running.
 *
 * rAF against wall-clock deltas rather than a fixed interval, so a slow frame
 * does not slow the match down and a backgrounded tab pauses instead of jumping
 * forward on return. Time is read from the store inside the loop rather than
 * closed over, so the effect does not restart on every tick.
 */
export function usePlayback(duration: number | null): void {
  const playing = useApp((state) => state.playing)
  const speed = useApp((state) => state.speed)

  useEffect(() => {
    if (!playing || duration === null) return

    let frame = 0
    let previous = performance.now()

    function tick(now: number) {
      const elapsed = (now - previous) / 1000
      previous = now

      const { time, setTime, setPlaying } = useApp.getState()
      const next = time + elapsed * speed

      // Stop cleanly on the last second rather than running past the end.
      if (next >= duration!) {
        setTime(duration!)
        setPlaying(false)
        return
      }

      setTime(next)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, duration])
}
