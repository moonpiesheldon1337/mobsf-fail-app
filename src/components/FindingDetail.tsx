import type { AnalyzedFinding, Verdict } from '../types'

interface Props {
  finding: AnalyzedFinding | null
  onClose: () => void
  onOverride: (id: string, verdict: Verdict | undefined) => void
}

export function FindingDetail({ finding, onClose, onOverride }: Props) {
  if (!finding) return null
  const effective = finding.userOverride ?? finding.verdict?.verdict
  return (
    <div className="border border-ink-800 rounded-lg bg-ink-900/50 p-5 h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="text-xs font-mono text-ink-500 uppercase tracking-wider">
            {finding.category.replace(/_/g, ' ')}
          </div>
          <h2 className="text-lg font-medium text-ink-100 mt-1 break-words">
            {finding.title}
          </h2>
          <div className="text-xs font-mono text-ink-500 mt-1">
            {finding.ruleId}
          </div>
        </div>
        <button onClick={onClose} className="text-ink-500 hover:text-ink-200 font-mono text-xs shrink-0">
          close ✕
        </button>
      </div>

      {finding.verdict && (
        <div className="mb-5 p-3 rounded border border-ink-800 bg-ink-950/60">
          <div className="flex items-baseline gap-3 mb-2">
            <div className="text-2xl font-mono font-semibold text-[var(--color-accent)]">
              {finding.verdict.fp_score}
            </div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-500">
              fp probability
            </div>
          </div>
          <div className="text-sm text-ink-200 leading-relaxed">
            {finding.verdict.reason}
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">
          override verdict
        </div>
        <div className="flex flex-wrap gap-2">
          {(['true_positive', 'needs_review', 'likely_fp'] as Verdict[]).map((v) => (
            <button
              key={v}
              onClick={() =>
                onOverride(finding.id, finding.userOverride === v ? undefined : v)
              }
              className={[
                'px-3 py-1 rounded font-mono text-xs border transition-colors',
                finding.userOverride === v
                  ? 'bg-[var(--color-accent)] text-ink-950 border-[var(--color-accent)]'
                  : effective === v
                  ? 'bg-ink-800 text-ink-200 border-ink-700'
                  : 'bg-ink-900 text-ink-400 border-ink-800 hover:border-ink-700',
              ].join(' ')}
            >
              {v.replace('_', ' ')}
            </button>
          ))}
        </div>
        {finding.userOverride && (
          <div className="text-xs text-ink-500 font-mono mt-2">
            human override active
          </div>
        )}
      </div>

      <Section title="metadata">
        <KV k="severity" v={finding.severity} />
        {finding.cwe && <KV k="cwe" v={finding.cwe} />}
        {finding.owaspMobile && <KV k="owasp" v={finding.owaspMobile} />}
        {finding.masvs && <KV k="masvs" v={finding.masvs} />}
        {finding.cvss !== undefined && <KV k="cvss" v={String(finding.cvss)} />}
      </Section>

      <Section title="description">
        <p className="text-sm text-ink-300 leading-relaxed whitespace-pre-wrap">
          {finding.description || '(no description provided)'}
        </p>
      </Section>

      <Section title="evidence">
        <pre className="text-xs font-mono text-ink-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-ink-950/60 border border-ink-800 rounded p-3">
          {finding.evidence || '(no evidence captured)'}
        </pre>
      </Section>

      {finding.fileLocation && (
        <Section title="file">
          <code className="text-xs font-mono text-ink-200 break-all">
            {finding.fileLocation}
          </code>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-mono uppercase tracking-wider text-ink-500 mb-2">{title}</div>
      <div>{children}</div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 text-xs font-mono py-0.5">
      <span className="text-ink-500 w-20">{k}</span>
      <span className="text-ink-200 break-all">{v}</span>
    </div>
  )
}
