import { useMemo, useState } from 'react'
import type { AnalyzedFinding, Verdict, Category } from '../types'

interface Props {
  findings: AnalyzedFinding[]
  onSelect: (id: string) => void
  selectedId: string | null
}

type Filter = 'all' | 'true_positive' | 'needs_review' | 'likely_fp' | 'pending'

const SEVERITY_COLOR: Record<string, string> = {
  high: 'text-red-400 border-red-400/40 bg-red-400/10',
  warning: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  info: 'text-sky-300 border-sky-300/40 bg-sky-300/10',
}

const VERDICT_PILL: Record<Verdict | 'pending', string> = {
  true_positive: 'bg-red-500/15 text-red-400 border-red-500/30',
  needs_review: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  likely_fp: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pending: 'bg-ink-800 text-ink-500 border-ink-700',
}

const VERDICT_LABEL: Record<Verdict | 'pending', string> = {
  true_positive: 'real',
  needs_review: 'review',
  likely_fp: 'false-pos',
  pending: '—',
}

const CATEGORY_LABEL: Record<Category, string> = {
  code_analysis: 'code',
  manifest: 'manifest',
  network_security: 'NSC',
  permissions: 'perm',
  secrets: 'secret',
  trackers: 'tracker',
  binary_analysis: 'binary',
  certificate: 'cert',
  urls_emails: 'urls',
  generic: 'other',
}

export function FindingsTable({ findings, onSelect, selectedId }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')

  const stats = useMemo(() => {
    const s = { total: findings.length, tp: 0, nr: 0, fp: 0, pending: 0 }
    for (const f of findings) {
      const v = f.userOverride ?? f.verdict?.verdict
      if (!v) s.pending++
      else if (v === 'true_positive') s.tp++
      else if (v === 'needs_review') s.nr++
      else if (v === 'likely_fp') s.fp++
    }
    return s
  }, [findings])

  const categories = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {}
    for (const f of findings) counts[f.category] = (counts[f.category] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1]! - a[1]!) as [Category, number][]
  }, [findings])

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
      if (filter === 'all') return true
      const v = f.userOverride ?? f.verdict?.verdict
      if (filter === 'pending') return !v
      return v === filter
    })
  }, [findings, filter, categoryFilter])

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`all · ${stats.total}`} />
        <FilterChip active={filter === 'true_positive'} onClick={() => setFilter('true_positive')} label={`real · ${stats.tp}`} tone="red" />
        <FilterChip active={filter === 'needs_review'} onClick={() => setFilter('needs_review')} label={`review · ${stats.nr}`} tone="amber" />
        <FilterChip active={filter === 'likely_fp'} onClick={() => setFilter('likely_fp')} label={`false-pos · ${stats.fp}`} tone="emerald" />
        {stats.pending > 0 && (
          <FilterChip active={filter === 'pending'} onClick={() => setFilter('pending')} label={`pending · ${stats.pending}`} />
        )}
      </div>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <CategoryChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} label="all categories" />
          {categories.map(([cat, count]) => (
            <CategoryChip
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              label={`${CATEGORY_LABEL[cat]} · ${count}`}
            />
          ))}
        </div>
      )}

      <div className="border border-ink-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-900 border-b border-ink-800 text-left">
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-500">verdict</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-500">fp</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-500">sev</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-500">cat</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-500">rule</th>
                <th className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink-500">evidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const v = f.userOverride ?? f.verdict?.verdict ?? 'pending'
                const isSelected = f.id === selectedId
                return (
                  <tr
                    key={f.id}
                    onClick={() => onSelect(f.id)}
                    className={[
                      'border-b border-ink-900 cursor-pointer transition-colors',
                      isSelected ? 'bg-ink-900' : 'hover:bg-ink-900/60',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {f.status === 'analyzing' ? (
                        <span className="text-xs font-mono text-[var(--color-accent)]">analyzing<span className="caret">█</span></span>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${VERDICT_PILL[v]}`}>
                          {VERDICT_LABEL[v]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-300">
                      {f.verdict ? `${f.verdict.fp_score}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${SEVERITY_COLOR[f.severity] ?? ''}`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-400">
                      {CATEGORY_LABEL[f.category]}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-200 max-w-[260px] truncate">
                      {f.ruleId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500 max-w-[300px] truncate">
                      {f.evidence}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-ink-500 font-mono text-sm">
              no findings match this filter
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  tone?: 'red' | 'amber' | 'emerald'
}) {
  const toneClass = active
    ? tone === 'red'
      ? 'bg-red-500/20 text-red-300 border-red-500/40'
      : tone === 'amber'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : tone === 'emerald'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : 'bg-ink-700 text-ink-100 border-ink-600'
    : 'bg-ink-900 text-ink-400 border-ink-800 hover:border-ink-700'
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded font-mono text-xs border transition-colors ${toneClass}`}
    >
      {label}
    </button>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-0.5 rounded font-mono text-[11px] border transition-colors',
        active
          ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[rgba(163,230,53,0.05)]'
          : 'border-ink-800 text-ink-500 hover:border-ink-700 hover:text-ink-300',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
