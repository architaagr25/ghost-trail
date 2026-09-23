import { useEffect, useState } from 'react'

interface RailLayout {
  /** True when there is room for both rails beside the map. */
  wide: boolean
  filtersOpen: boolean
  detailsOpen: boolean
  setFiltersOpen: (open: boolean) => void
  setDetailsOpen: (open: boolean) => void
}

/**
 * Open state for the two side rails, seeded from the viewport width.
 *
 * They reset when the viewport crosses the breakpoint and only then -- anything
 * opened or closed by hand stands until the width changes again.
 *
 * Driven from the media query listener rather than an effect watching a derived
 * boolean, so the write happens in response to the event rather than during a
 * render that event already triggered.
 */
export function useRailLayout(query: string): RailLayout {
  const [layout, setLayout] = useState(() => {
    const wide = typeof window !== 'undefined' && window.matchMedia(query).matches
    return { wide, filtersOpen: wide, detailsOpen: wide }
  })

  useEffect(() => {
    const list = window.matchMedia(query)
    const apply = (wide: boolean) =>
      setLayout((current) =>
        current.wide === wide ? current : { wide, filtersOpen: wide, detailsOpen: wide },
      )

    // The window can be resized between the first render and this effect, so
    // reconcile once before listening. Comparing inside the updater keeps it a
    // no-op when nothing has moved.
    apply(list.matches)

    const onChange = () => apply(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return {
    ...layout,
    setFiltersOpen: (open) => setLayout((current) => ({ ...current, filtersOpen: open })),
    setDetailsOpen: (open) => setLayout((current) => ({ ...current, detailsOpen: open })),
  }
}
