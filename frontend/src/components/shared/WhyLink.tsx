import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import type { WhyResponse } from '../../types'
import { getWhy } from '../../api/client'

interface WhyLinkProps {
  beliefId: string
}

export default function WhyLink({ beliefId }: WhyLinkProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<WhyResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    if (!open && !data) {
      setLoading(true)
      try {
        const d = await getWhy(beliefId)
        setData(d)
      } catch {
        // silently fail; show error in panel
      } finally {
        setLoading(false)
      }
    }
    setOpen(o => !o)
  }

  return (
    <span className="inline-flex items-center">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-[var(--primary)] text-xs hover:underline"
        aria-label="Why do you know this?"
      >
        <HelpCircle size={12} />
        Why?
      </button>

      {open && (
        <div className="
          fixed inset-0 z-50 flex items-start justify-end p-4
        " onClick={() => setOpen(false)}>
          <div
            className="card w-96 max-h-[80vh] overflow-y-auto mt-16 mr-2 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-[var(--text)]">
              Why do I know this?
            </h3>

            {loading && (
              <p className="text-[var(--muted)] text-sm">Loading…</p>
            )}

            {data && (
              <>
                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Belief</p>
                  <p className="text-sm text-[var(--text)] font-medium">{data.belief_label}</p>
                  <p className="text-xs text-[var(--muted)] mt-1 font-mono">
                    Value: {JSON.stringify(data.value)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Sources Used</p>
                  <div className="space-y-1">
                    {data.sources_used.map(s => (
                      <div key={s.id} className="bg-[var(--elevated)] rounded p-2">
                        <p className="text-sm font-medium text-[var(--text)]">{s.label}</p>
                        <p className="text-xs text-[var(--muted)]">{s.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Permission Trail</p>
                  <ul className="space-y-0.5">
                    {data.permission_trail.map((p, i) => (
                      <li key={i} className="text-xs text-[var(--success)] flex items-start gap-1">
                        <span>✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {data.raw_data_snippet.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Raw Data (sample)</p>
                    <pre className="text-xs text-[var(--muted)] bg-[var(--elevated)] rounded p-2 overflow-x-auto">
                      {JSON.stringify(data.raw_data_snippet.slice(0, 3), null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setOpen(false)}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
