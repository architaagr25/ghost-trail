import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Search } from 'lucide-react'
import type { MatchSummary } from '../lib/types'
import { ALL } from '../lib/filters'
import { formatClock, formatMatchTime } from '../lib/format'

/**
 * Rendering every match at once is wasted work on a map with hundreds of them,
 * and a list that long is not browsable anyway. Past this the search box is the
 * way through, and the footer says so.
 */
const VISIBLE_LIMIT = 100

/**
 * Picks one match out of the hundreds on a map.
 *
 * A plain dropdown does not work at this length, so this one has a search box
 * and shows each match with the detail needed to choose between them -- when it
 * ran, how long it lasted, and how many humans, bots and kills it held. Match
 * ids are opaque UUIDs; nobody picks a match by id alone.
 */
export function MatchPicker({
  matches,
  value,
  onChange,
}: {
  matches: MatchSummary[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return matches
    return matches.filter(
      (match) =>
        match.id.toLowerCase().includes(needle) ||
        formatMatchTime(match.start).toLowerCase().includes(needle),
    )
  }, [matches, query])

  const active = matches.find((match) => match.id === value)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <Popover.Trigger
        aria-label="Match"
        className="flex w-full items-center justify-between gap-2 rounded border border-edge bg-panel-raised px-3 py-2.5 text-left text-xs text-ink transition hover:border-edge-bright focus:outline-none focus-visible:border-signal-dim"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search size={13} className="shrink-0 text-ink-faint" />
          <span className="truncate">
            {active ? formatMatchTime(active.start) : `All matches (${matches.length})`}
          </span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-ink-faint" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded border border-edge-bright bg-panel shadow-xl"
        >
          <div className="border-b border-edge p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by time or match id"
              className="w-full rounded bg-panel-raised px-2.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange(ALL)
                setOpen(false)
              }}
              className="w-full rounded px-2.5 py-2 text-left text-xs text-ink-dim transition hover:bg-panel-raised"
            >
              All matches
              <span className="ml-2 text-[10px] text-ink-faint">{matches.length}</span>
            </button>

            {filtered.slice(0, VISIBLE_LIMIT).map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => {
                  onChange(match.id)
                  setOpen(false)
                }}
                className={`w-full rounded px-2.5 py-2 text-left transition hover:bg-panel-raised ${
                  match.id === value ? 'text-signal' : 'text-ink-dim'
                }`}
              >
                <span className="flex items-center justify-between text-xs">
                  {formatMatchTime(match.start)}
                  <span className="text-[10px] text-ink-faint">{formatClock(match.duration)}</span>
                </span>
                <span className="mt-0.5 block text-[10px] text-ink-faint">
                  {match.humans}H · {match.bots}B · {match.kills} kills
                </span>
              </button>
            ))}

            {!filtered.length && (
              <p className="px-2.5 py-4 text-center text-[11px] text-ink-faint">No matches found</p>
            )}

            {filtered.length > VISIBLE_LIMIT && (
              <p className="px-2.5 py-2 text-center text-[10px] text-ink-faint">
                Showing {VISIBLE_LIMIT} of {filtered.length}. Search to narrow.
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
