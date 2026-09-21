import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

export interface Option {
  value: string
  label: string
  /** Secondary text shown to the right, for counts and the like. */
  hint?: string
}

/**
 * A dropdown for short, fixed lists such as maps and dates.
 *
 * Built on Radix so keyboard navigation, focus handling and typeahead come for
 * free. Long lists such as the match picker need search and use their own
 * control instead.
 */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string
  options: Option[]
  onChange: (value: string) => void
  ariaLabel: string
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between gap-2 rounded border border-edge bg-panel-raised px-3 py-2.5 text-left text-xs text-ink transition hover:border-edge-bright focus:outline-none focus-visible:border-signal-dim"
      >
        <RadixSelect.Value />
        <RadixSelect.Icon className="text-ink-faint">
          <ChevronDown size={14} />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded border border-edge-bright bg-panel shadow-xl"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2 text-xs text-ink-dim outline-none data-[highlighted]:bg-panel-raised data-[state=checked]:text-signal"
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <span className="flex items-center gap-2">
                  {option.hint && <span className="text-[10px] text-ink-faint">{option.hint}</span>}
                  <RadixSelect.ItemIndicator>
                    <Check size={12} />
                  </RadixSelect.ItemIndicator>
                </span>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
