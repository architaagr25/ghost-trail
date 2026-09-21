/** Seconds since match start as m:ss. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Journey identifiers are either a UUID for a human or a short numeric id for a
 * bot. Full UUIDs are too long to read in a panel, so humans are shown by their
 * leading block, which is unique across the 245 humans in the data.
 */
export function shortId(userId: string): string {
  return userId.includes('-') ? userId.split('-')[0] : userId
}
