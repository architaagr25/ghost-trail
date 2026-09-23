export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="label text-ink-faint">{label}</p>
      {children}
    </div>
  )
}
