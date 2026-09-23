import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render crashes so a failure shows something readable instead of a
 * blank page.
 *
 * The canvas layers run a lot of arithmetic over data loaded at runtime, and an
 * unhandled throw inside a React render unmounts the whole tree by design. Left
 * uncaught the analyst gets a white screen with the cause only in the console.
 *
 * Still a class component: error boundaries have no hook equivalent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Ghost Trail crashed while rendering:', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid h-full place-items-center bg-void px-8">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-alert/40 text-alert">
            <TriangleAlert size={17} />
          </div>
          <p className="label-lg text-alert">Something broke</p>
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">{error.message}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded border border-edge px-3.5 py-2 label text-ink-dim transition hover:border-edge-bright hover:text-ink"
          >
            <RotateCcw size={13} />
            Reload
          </button>
        </div>
      </div>
    )
  }
}
