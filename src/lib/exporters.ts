import type { AnalyzedFinding, AppMetadata } from '../types'

export function toCSV(findings: AnalyzedFinding[]): string {
  const header = [
    'category',
    'rule_id',
    'title',
    'severity',
    'cwe',
    'masvs',
    'fp_score',
    'verdict',
    'reason',
    'user_override',
    'evidence',
  ]
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = findings.map((f) =>
    [
      f.category,
      f.ruleId,
      f.title,
      f.severity,
      f.cwe ?? '',
      f.masvs ?? '',
      f.verdict?.fp_score ?? '',
      f.verdict?.verdict ?? '',
      f.verdict?.reason ?? '',
      f.userOverride ?? '',
      f.evidence.replace(/\n/g, ' '),
    ]
      .map((v) => escape(String(v ?? '')))
      .join(',')
  )
  return [header.join(','), ...rows].join('\n')
}

/**
 * Generate a Markdown report containing ONLY findings that are not
 * marked as false positives — the user can drop this straight into a
 * client deliverable, paste into Word, or convert with pandoc.
 */
export function toMarkdownReport(
  findings: AnalyzedFinding[],
  meta: AppMetadata
): string {
  const kept = findings.filter((f) => {
    const v = f.userOverride ?? f.verdict?.verdict
    return v !== 'likely_fp'
  })

  const realFindings = kept.filter(
    (f) => (f.userOverride ?? f.verdict?.verdict) === 'true_positive'
  )
  const reviewFindings = kept.filter(
    (f) => (f.userOverride ?? f.verdict?.verdict) === 'needs_review'
  )
  const unanalyzed = kept.filter((f) => !f.verdict && !f.userOverride)

  const lines: string[] = []
  lines.push(`# Mobile App Security Assessment — ${meta.appName || meta.packageName || 'Unknown App'}`)
  lines.push('')
  lines.push('## Application metadata')
  lines.push('')
  lines.push(`- **App name:** ${meta.appName || '—'}`)
  lines.push(`- **Package name:** ${meta.packageName || '—'}`)
  lines.push(`- **Version:** ${meta.versionName || '—'}`)
  lines.push(`- **File:** ${meta.fileName || '—'}`)
  lines.push(`- **Analyzer:** MobSF ${meta.mobsfVersion || ''} (triaged by mobsf-fail-app)`)
  lines.push('')
  lines.push(`## Triage summary`)
  lines.push('')
  lines.push(`- Total findings imported: **${findings.length}**`)
  lines.push(`- Confirmed / true positives: **${realFindings.length}**`)
  lines.push(`- Needs manual review: **${reviewFindings.length}**`)
  lines.push(`- False positives removed: **${findings.length - kept.length}**`)
  if (unanalyzed.length) {
    lines.push(`- Not yet analyzed: **${unanalyzed.length}**`)
  }
  lines.push('')

  if (realFindings.length > 0) {
    lines.push('## Confirmed findings')
    lines.push('')
    realFindings.forEach((f, i) => writeFinding(lines, f, i + 1))
  }

  if (reviewFindings.length > 0) {
    lines.push('## Findings requiring manual review')
    lines.push('')
    reviewFindings.forEach((f, i) => writeFinding(lines, f, i + 1))
  }

  return lines.join('\n')
}

function writeFinding(out: string[], f: AnalyzedFinding, n: number) {
  out.push(`### ${n}. ${f.title}`)
  out.push('')
  out.push(`- **Category:** ${f.category}`)
  out.push(`- **Severity:** ${f.severity}`)
  if (f.cwe) out.push(`- **CWE:** ${f.cwe}`)
  if (f.owaspMobile) out.push(`- **OWASP Mobile:** ${f.owaspMobile}`)
  if (f.masvs) out.push(`- **MASVS:** ${f.masvs}`)
  out.push('')
  if (f.description) {
    out.push(f.description)
    out.push('')
  }
  if (f.evidence) {
    out.push('**Evidence:**')
    out.push('')
    out.push('```')
    out.push(f.evidence)
    out.push('```')
    out.push('')
  }
  if (f.verdict?.reason) {
    out.push(`> _Triage note:_ ${f.verdict.reason}`)
    out.push('')
  }
}

export function downloadBlob(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
