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
 * Both are reset when the viewport crosses the breakpoint, and only then --
 * anything the reader opens or closes afterwards stands until the width
 * changes again.
 *
 * The reset is driven from the media query listener rather than from an effect
 * watching a derived boolean, so state is written in response to the external
 * event rather than during a render the change already triggered.
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

    // The window can be resized between the first render and this effect
    // running, so reconcile once before listening. Comparing inside the updater
    // keeps the check off the current value and makes it a no-op when nothing
    // has moved.
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
