/** Seconds since match start as m:ss. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Humans carry a UUID, bots a short numeric id. A full UUID is unreadable in a
 * panel, so humans show their leading block -- unique across all 245 of them.
 */
export function shortId(userId: string): string {
  return userId.includes('-') ? userId.split('-')[0] : userId
}

/** Epoch seconds as a short local date and time, for labelling matches. */
export function formatMatchTime(start: number): string {
  return new Date(start * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A YYYY-MM-DD date as a short readable label. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
