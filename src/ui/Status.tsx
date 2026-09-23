/**
 * The in-between screens: loading, nothing found, something broke.
 *
 * All three share a shape so they read as one kind of message, and each says
 * what to do next -- a bare "no results" leaves you guessing which control
 * caused it.
 */
export function StatusPanel({
  icon,
  title,
  hint,
  tone = 'quiet',
  action,
}: {
  icon?: React.ReactNode
  title: string
  hint?: string
  tone?: 'quiet' | 'alert'
  /** A way out of the state, for the ones the reader can recover from. */
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="grid h-full place-items-center px-8">
      <div className="max-w-xs text-center">
        {icon && (
          <div
            className={`mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border ${
              tone === 'alert' ? 'border-alert/40 text-alert' : 'border-edge text-ink-faint'
            }`}
          >
            {icon}
          </div>
        )}
        <p
          className={`label-lg ${
            tone === 'alert' ? 'text-alert' : 'text-ink-dim'
          }`}
        >
          {title}
        </p>
        {hint && <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{hint}</p>}

        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-5 rounded border border-edge px-3.5 py-2 label text-ink-dim transition hover:border-edge-bright hover:text-ink"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * A sweep rather than a spinner. This is a fetch and a parse of a few hundred
 * kilobytes -- short enough that a spinner would make more of the wait than it
 * deserves.
 */
export function Loading({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="text-center">
        <div className="mx-auto h-0.5 w-24 overflow-hidden rounded bg-edge">
          <div className="h-full w-1/3 animate-[sweep_1.1s_ease-in-out_infinite] rounded bg-signal" />
        </div>
        <p className="mt-3 label text-ink-faint">{label}</p>
      </div>
    </div>
  )
}
