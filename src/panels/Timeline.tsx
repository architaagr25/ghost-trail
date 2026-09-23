import * as Slider from '@radix-ui/react-slider'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { SPEEDS, useApp } from '../state/store'
import type { Selection } from '../lib/filters'
import { formatClock } from '../lib/format'
import { EVENT_COLOR, cssColor } from '../map/style'

/**
 * Above this many events the tick marks stop being individually readable and
 * become a solid bar, so only a sample is drawn. They are a guide to where the
 * action is, not a count.
 */
const MAX_TICKS = 400

/**
 * The match clock and transport.
 *
 * A scrubber alone tells you nothing about where to scrub to, so the track is
 * marked with every event in the match, coloured by type. Combat and looting
 * come in bursts, and the marks make those bursts visible before you go looking
 * for them -- you can see a firefight at 4:20 and jump straight to it.
 *
 * Only meaningful for a single match: with several selected there is no shared
 * clock to scrub along, so the bar says so instead of showing a misleading one.
 */
export function Timeline({ selection }: { selection: Selection }) {
  const time = useApp((state) => state.time)
  const playing = useApp((state) => state.playing)
  const speed = useApp((state) => state.speed)
  const setTime = useApp((state) => state.setTime)
  const setPlaying = useApp((state) => state.setPlaying)
  const setSpeed = useApp((state) => state.setSpeed)
  const match = selection.match

  if (!match) {
    return (
      <footer className="flex h-16 items-center justify-center border-t border-edge bg-panel px-6">
        <p className="label text-ink-faint">
          {selection.matches.length
            ? `Select a single match to play it back — ${selection.matches.length} in view`
            : 'No matches in view'}
        </p>
      </footer>
    )
  }

  const duration = Math.max(match.duration, 1)
  const atEnd = time >= duration
  const ticks =
    selection.events.length > MAX_TICKS
      ? selection.events.filter(
          (_, index) => index % Math.ceil(selection.events.length / MAX_TICKS) === 0,
        )
      : selection.events

  function togglePlay() {
    // Pressing play at the end replays rather than doing nothing.
    if (!playing && atEnd) setTime(0)
    setPlaying(!playing)
  }

  return (
    <footer className="flex h-16 items-center gap-3 border-t border-edge bg-panel px-4 sm:gap-4 sm:px-6">
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-signal-dim text-signal transition hover:bg-panel-raised"
      >
        {playing ? <Pause size={15} /> : atEnd ? <RotateCcw size={15} /> : <Play size={15} />}
      </button>

      <p className="w-20 shrink-0 numeric text-xs text-ink sm:w-24 sm:text-sm">
        {formatClock(time)}
        <span className="text-ink-faint"> / {formatClock(duration)}</span>
      </p>

      <div className="relative min-w-0 flex-1">
        {/* Event marks sit behind the track so the thumb stays readable. */}
        <div className="pointer-events-none absolute inset-x-0 top-1 h-3">
          {ticks.map((event, index) => (
            <span
              key={`${event.m}-${event.p}-${event.t}-${index}`}
              className="absolute top-0 h-3 w-px opacity-70"
              style={{
                left: `${(Math.min(event.t, duration) / duration) * 100}%`,
                background: cssColor(EVENT_COLOR[event.c]),
              }}
            />
          ))}
        </div>

        <Slider.Root
          value={[Math.min(time, duration)]}
          min={0}
          max={duration}
          step={1}
          onValueChange={([next]) => {
            // Scrubbing takes over from playback rather than fighting it.
            setPlaying(false)
            setTime(next)
          }}
          aria-label="Match time"
          className="relative flex h-6 w-full touch-none select-none items-center"
        >
          <Slider.Track className="relative h-0.5 w-full grow rounded bg-edge-bright">
            <Slider.Range className="absolute h-full rounded bg-signal" />
          </Slider.Track>
          <Slider.Thumb className="block h-3.5 w-3.5 rounded-full border-2 border-void bg-signal shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-dim" />
        </Slider.Root>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSpeed(option)}
            aria-pressed={option === speed}
            // The extremes fold away first on a narrow window. They are the
            // least used, and a wrapped transport bar is worse than a shorter
            // set of speeds.
            className={`rounded px-2 py-1 text-[11px] numeric transition ${
              option === 0.5 || option === 8 ? 'hidden lg:block' : ''
            } ${
              option === speed
                ? 'bg-panel-raised text-signal'
                : 'text-ink-faint hover:text-ink-dim'
            }`}
          >
            {option}x
          </button>
        ))}
      </div>
    </footer>
  )
}
