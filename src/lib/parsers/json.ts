import type { MobSFFinding, AppMetadata, Severity } from '../../types'
import type { ParseResult } from './text'

/**
 * Parses a MobSF Community Edition JSON report into a normalized flat
 * list of findings, plus app metadata for the header.
 *
 * Defensive against MobSF schema drift (v3.7 → v4.5).
 */
export function parseMobSFJSON(text: string): ParseResult {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      'Not valid JSON. Drop the MobSF JSON report (Download → Report JSON).'
    )
  }

  const looksLikeMobSF =
    'package_name' in data ||
    'app_name' in data ||
    'code_analysis' in data ||
    'manifest_analysis' in data
  if (!looksLikeMobSF) {
    throw new Error(
      'This does not look like a MobSF JSON report. Expected fields not found.'
    )
  }

  const metadata: AppMetadata = {
    appName: str(data.app_name),
    packageName: str(data.package_name),
    versionName: str(data.version_name),
    fileName: str(data.file_name) || str(data.title),
    appType: str(data.app_type) || 'unknown',
    mobsfVersion: str(data.version),
  }

  const findings: MobSFFinding[] = []
  findings.push(...parseCodeAnalysis(data))
  findings.push(...parseManifest(data))
  findings.push(...parseNetworkSecurity(data))
  findings.push(...parsePermissions(data))
  findings.push(...parseSecrets(data))
  findings.push(...parseTrackers(data))
  findings.push(...parseBinaryAnalysis(data))
  findings.push(...parseCertificate(data))

  return { metadata, findings }
}

function parseCodeAnalysis(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const findings = data?.code_analysis?.findings ?? data?.code_analysis
  if (!findings || typeof findings !== 'object') return out

  for (const [ruleId, raw] of Object.entries(findings)) {
    const r = raw as any
    if (!r || typeof r !== 'object') continue
    const md = r.metadata ?? r
    const severity = normalizeSeverity(md.severity)
    if (!severity) continue

    const files = r.files ?? {}
    const fileList = Object.keys(files)
    const firstFile = fileList[0]
    const evidence =
      fileList.length === 0
        ? ''
        : fileList.length === 1
        ? `${firstFile} (lines ${files[firstFile]})`
        : `${fileList.length} files: ${fileList.slice(0, 3).join(', ')}${fileList.length > 3 ? '…' : ''}`

    out.push({
      id: `code:${ruleId}`,
      category: 'code_analysis',
      ruleId,
      title: ruleId.replace(/_/g, ' '),
      description: str(md.description) || ruleId,
      severity,
      cwe: str(md.cwe) || undefined,
      owaspMobile: str(md['owasp-mobile']) || undefined,
      masvs: str(md.masvs) || undefined,
      cvss: typeof md.cvss === 'number' ? md.cvss : undefined,
      evidence,
      fileLocation: firstFile,
    })
  }
  return out
}

function parseManifest(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const list =
    data?.manifest_analysis?.manifest_findings ??
    data?.manifest_analysis ??
    []
  if (!Array.isArray(list)) return out

  list.forEach((m: any, idx: number) => {
    const severity = normalizeSeverity(m.severity)
    if (!severity) return
    out.push({
      id: `manifest:${m.rule ?? idx}`,
      category: 'manifest',
      ruleId: str(m.rule) || `manifest_${idx}`,
      title: str(m.title) || str(m.rule) || 'Manifest issue',
      description: str(m.description),
      severity,
      evidence: str(m.component) || str(m.name),
    })
  })
  return out
}

function parseNetworkSecurity(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const list =
    data?.network_security?.network_findings ??
    data?.network_security ??
    []
  if (!Array.isArray(list)) return out

  list.forEach((n: any, idx: number) => {
    const severity = normalizeSeverity(n.severity)
    if (!severity) return
    const scope = Array.isArray(n.scope) ? n.scope.join(', ') : str(n.scope)
    out.push({
      id: `nsc:${idx}`,
      category: 'network_security',
      ruleId: str(n.scope?.[0]) || `nsc_${idx}`,
      title: 'Network Security Config: ' + (str(n.description).slice(0, 80) || 'issue'),
      description: str(n.description),
      severity,
      evidence: scope,
    })
  })
  return out
}

function parsePermissions(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const perms = data?.permissions ?? {}
  if (!perms || typeof perms !== 'object') return out

  for (const [permName, raw] of Object.entries(perms)) {
    const p = raw as any
    if (!p || typeof p !== 'object') continue
    const status = str(p.status).toLowerCase()
    if (status !== 'dangerous' && status !== 'signature') continue
    out.push({
      id: `perm:${permName}`,
      category: 'permissions',
      ruleId: permName,
      title: permName,
      description: str(p.description) || str(p.info),
      severity: status === 'dangerous' ? 'warning' : 'info',
      evidence: `Status: ${status} · ${str(p.info)}`,
    })
  }
  return out
}

function parseSecrets(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const secrets = data?.secrets ?? []
  if (!Array.isArray(secrets)) return out

  secrets.forEach((s: any, idx: number) => {
    const text = typeof s === 'string' ? s : (s?.value ?? s?.secret ?? '')
    if (!text) return
    out.push({
      id: `secret:${idx}`,
      category: 'secrets',
      ruleId: 'hardcoded_secret',
      title: 'Possible hardcoded secret',
      description: 'A string matched a known secret/key pattern.',
      severity: 'warning',
      evidence: typeof text === 'string' ? text.slice(0, 300) : JSON.stringify(text).slice(0, 300),
    })
  })
  return out
}

function parseTrackers(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const list = data?.trackers?.trackers ?? []
  if (!Array.isArray(list)) return out

  list.forEach((t: any, idx: number) => {
    const name = str(t.name) || `tracker_${idx}`
    out.push({
      id: `tracker:${name}`,
      category: 'trackers',
      ruleId: name,
      title: `Tracker detected: ${name}`,
      description: str(t.categories) || str(t.code_signature) || '',
      severity: 'info',
      evidence: str(t.url) || str(t.code_signature),
    })
  })
  return out
}

function parseBinaryAnalysis(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const list = data?.binary_analysis ?? []
  if (!Array.isArray(list)) return out

  list.forEach((b: any) => {
    const lib = str(b.name)
    const checks = ['nx', 'stack_canary', 'relro', 'rpath', 'runpath', 'fortify', 'symbol']
    for (const c of checks) {
      const v = b[c]
      if (!v) continue
      const sev = normalizeSeverity(v.severity)
      if (!sev || sev === 'info') continue
      out.push({
        id: `binary:${lib}:${c}`,
        category: 'binary_analysis',
        ruleId: `binary_${c}`,
        title: `${c.toUpperCase()} check failed`,
        description: str(v.description),
        severity: sev,
        evidence: lib,
      })
    }
  })
  return out
}

function parseCertificate(data: any): MobSFFinding[] {
  const out: MobSFFinding[] = []
  const list = data?.certificate_analysis?.certificate_findings ?? []
  if (!Array.isArray(list)) return out

  list.forEach((c: any, idx: number) => {
    const severity = normalizeSeverity(c[0])
    if (!severity) return
    out.push({
      id: `cert:${idx}`,
      category: 'certificate',
      ruleId: `cert_${idx}`,
      title: str(c[1]) || 'Certificate issue',
      description: str(c[2]),
      severity,
      evidence: '',
    })
  })
  return out
}

function normalizeSeverity(s: unknown): Severity | null {
  if (typeof s !== 'string') return null
  const lc = s.toLowerCase().trim()
  if (lc === 'high' || lc === 'critical') return 'high'
  if (lc === 'warning' || lc === 'medium' || lc === 'low') return 'warning'
  if (lc === 'info' || lc === 'informational') return 'info'
  return null
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  return String(v)
}
