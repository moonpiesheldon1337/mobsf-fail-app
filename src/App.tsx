import { useCallback, useState } from 'react'
import type * as webllm from '@mlc-ai/web-llm'
import type { AnalyzedFinding, AppMetadata, Verdict } from './types'
import { parseMobSFReport, type SourceFormat } from './lib/parsers'
import { ensureEngine, analyzeFinding, type ModelKey } from './lib/webllm'
import { toCSV, toMarkdownReport, downloadBlob } from './lib/exporters'
import { FileDropZone } from './components/FileDropZone'
import { ModelLoader } from './components/ModelLoader'
import { FindingsTable } from './components/FindingsTable'
import { FindingDetail } from './components/FindingDetail'

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

const EMPTY_METADATA: AppMetadata = {
  appName: '',
  packageName: '',
  versionName: '',
  fileName: '',
  appType: '',
  mobsfVersion: '',
}

export default function App() {
  const [findings, setFindings] = useState<AnalyzedFinding[]>([])
  const [metadata, setMetadata] = useState<AppMetadata>(EMPTY_METADATA)
  const [filename, setFilename] = useState<string>('')
  const [sourceFormat, setSourceFormat] = useState<SourceFormat | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  const [modelKey, setModelKey] = useState<ModelKey>('fast (1B)')
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [modelProgress, setModelProgress] = useState<webllm.InitProgressReport | null>(null)
  const [modelError, setModelError] = useState<string | null>(null)
  const [engine, setEngine] = useState<webllm.MLCEngineInterface | null>(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    setSelectedId(null)
    setParsing(true)
    try {
      const { findings: parsed, metadata: meta, source } = await parseMobSFReport(file)
      setFindings(parsed.map((f) => ({ ...f, status: 'pending' })))
      setMetadata(meta)
      setFilename(file.name)
      setSourceFormat(source)
    } catch (e) {
      setParseError((e as Error).message)
      setFindings([])
      setMetadata(EMPTY_METADATA)
      setSourceFormat(null)
    } finally {
      setParsing(false)
    }
  }, [])

  const handleLoadModel = useCallback(async () => {
    setModelStatus('loading')
    setModelError(null)
    try {
      const eng = await ensureEngine(modelKey, (p) => setModelProgress(p))
      setEngine(eng)
      setModelStatus('ready')
    } catch (e) {
      setModelStatus('error')
      setModelError((e as Error).message)
    }
  }, [modelKey])

  const handleAnalyze = useCallback(async () => {
    if (!engine || analyzing) return
    setAnalyzing(true)
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i]
      if (f.status === 'done') continue

      setFindings((prev) =>
        prev.map((x, idx) => (idx === i ? { ...x, status: 'analyzing' } : x))
      )

      try {
        const verdict = await analyzeFinding(engine, f, metadata)
        setFindings((prev) =>
          prev.map((x, idx) =>
            idx === i ? { ...x, status: 'done', verdict } : x
          )
        )
      } catch (e) {
        setFindings((prev) =>
          prev.map((x, idx) =>
            idx === i
              ? { ...x, status: 'error', error: (e as Error).message }
              : x
          )
        )
      }
    }
    setAnalyzing(false)
  }, [engine, analyzing, findings, metadata])

  const handleOverride = useCallback((id: string, verdict: Verdict | undefined) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, userOverride: verdict } : f))
    )
  }, [])

  const handleReset = useCallback(() => {
    setFindings([])
    setMetadata(EMPTY_METADATA)
    setFilename('')
    setSourceFormat(null)
    setSelectedId(null)
    setParseError(null)
  }, [])

  const exportBase = () => {
    if (metadata.packageName) return metadata.packageName
    return (filename || 'mobsf-triage').replace(/\.(json|pdf|html?|htm)$/i, '')
  }

  const handleExportCSV = useCallback(() => {
    downloadBlob(`${exportBase()}-triage.csv`, toCSV(findings), 'text/csv')
  }, [findings, metadata, filename])

  const handleExportMarkdown = useCallback(() => {
    downloadBlob(
      `${exportBase()}-report.md`,
      toMarkdownReport(findings, metadata),
      'text/markdown'
    )
  }, [findings, metadata, filename])

  const selected = selectedId ? findings.find((f) => f.id === selectedId) ?? null : null
  const doneCount = findings.filter((f) => f.status === 'done').length

  return (
    <div className="min-h-full">
      <header className="border-b border-ink-800 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-mono text-lg text-[var(--color-accent)]">
              mobsf-fail<span className="caret text-ink-400">█</span>
            </h1>
            <div className="text-xs font-mono text-ink-500 hidden sm:block">
              in-browser FP triage for MobSF · no uploads · no API keys
            </div>
          </div>
          <a
            href="https://github.com/moonpiesheldon1337/mobsf-fail-app"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-ink-400 hover:text-ink-100"
          >
            github →
          </a>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {findings.length === 0 ? (
          <div className="max-w-2xl mx-auto py-12">
            <div className="mb-8">
              <h2 className="text-2xl font-medium text-ink-100 mb-2">
                Make MobSF reports actually usable.
              </h2>
              <p className="text-ink-400 leading-relaxed">
                Drop a MobSF Community Edition report — JSON, PDF, or HTML.
                A local LLM (running on your GPU via WebGPU) triages each
                finding, separating real issues from noise like Stripe
                publishable keys flagged as "secrets", launcher activities
                flagged as "exported", and MD5 hashes used for cache keys
                flagged as "weak crypto". Export a clean Markdown report
                you can hand to a client.
              </p>
            </div>
            <FileDropZone onFile={handleFile} busy={parsing} />
            {parseError && (
              <div className="mt-4 px-4 py-3 rounded border border-red-500/30 bg-red-500/10 text-sm text-red-300 font-mono">
                {parseError}
              </div>
            )}
            <div className="mt-8 text-xs font-mono text-ink-500 space-y-1">
              <div>· Export from MobSF: scan an APK → top right → Download → Report JSON / PDF / HTML</div>
              <div>· JSON gives the richest data (file paths, CWE tags, CVSS). PDF loses some of that.</div>
              <div>· Word/.docx reports are not natively produced by MobSF — convert to PDF first.</div>
              <div>· Requires a browser with WebGPU: Chrome, Edge, Brave, or Safari 18+.</div>
              <div>· Nothing leaves your browser. Open DevTools → Network to verify.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-100">
                  {metadata.appName || metadata.packageName || filename}
                </div>
                <div className="text-xs font-mono text-ink-500 mt-0.5">
                  {metadata.packageName && <span>{metadata.packageName} · </span>}
                  {metadata.versionName && <span>v{metadata.versionName} · </span>}
                  <span>{findings.length} findings · {doneCount} analyzed</span>
                  {sourceFormat && (
                    <span className="ml-2 inline-block px-1.5 py-0.5 rounded border border-ink-800 text-ink-400 uppercase tracking-wider text-[10px]">
                      from {sourceFormat}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleExportMarkdown}
                  disabled={doneCount === 0}
                  className="px-3 py-1.5 rounded font-mono text-xs border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[rgba(163,230,53,0.08)] disabled:opacity-40 disabled:cursor-not-allowed disabled:border-ink-700 disabled:text-ink-500"
                >
                  export report (.md)
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={doneCount === 0}
                  className="px-3 py-1.5 rounded font-mono text-xs border border-ink-700 text-ink-200 hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  export CSV
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded font-mono text-xs border border-ink-800 text-ink-400 hover:bg-ink-900"
                >
                  new file
                </button>
              </div>
            </div>

            {(sourceFormat === 'pdf' || sourceFormat === 'html') && (
              <div className="mb-6 px-4 py-3 rounded border border-amber-500/30 bg-amber-500/5 text-xs font-mono text-amber-300/90">
                Parsed from {sourceFormat.toUpperCase()}. File paths, line numbers, and CWE/MASVS
                tags are not in this format — only the JSON export preserves them.
                Triage quality is otherwise unaffected.
              </div>
            )}

            <div className="mb-6">
              <ModelLoader
                modelKey={modelKey}
                onModelKeyChange={setModelKey}
                status={modelStatus}
                progress={modelProgress}
                onLoad={handleLoadModel}
                error={modelError}
              />
            </div>

            {modelStatus === 'ready' && (
              <div className="mb-6">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || doneCount === findings.length}
                  className="px-5 py-2 rounded font-mono text-sm font-medium
                             bg-[var(--color-accent)] text-ink-950
                             hover:bg-[var(--color-accent-dim)]
                             disabled:bg-ink-800 disabled:text-ink-500
                             disabled:cursor-not-allowed transition-colors"
                >
                  {analyzing
                    ? `analyzing… ${doneCount}/${findings.length}`
                    : doneCount === findings.length
                    ? '✓ analysis complete'
                    : doneCount > 0
                    ? `resume analysis (${findings.length - doneCount} left)`
                    : `analyze ${findings.length} findings`}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">
              <FindingsTable
                findings={findings}
                onSelect={setSelectedId}
                selectedId={selectedId}
              />
              <div className="min-h-[400px]">
                {selected ? (
                  <FindingDetail
                    finding={selected}
                    onClose={() => setSelectedId(null)}
                    onOverride={handleOverride}
                  />
                ) : (
                  <div className="border border-dashed border-ink-800 rounded-lg p-8 text-center text-ink-500 font-mono text-xs">
                    select a finding to see details and AI reasoning
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-ink-800 mt-16 px-6 py-6">
        <div className="max-w-[1600px] mx-auto flex flex-wrap justify-between gap-2 text-xs font-mono text-ink-500">
          <span>built with web-llm · runs on your GPU · MIT</span>
          <span>contribute prompts at github.com/moonpiesheldon1337/mobsf-fail-app</span>
        </div>
      </footer>
    </div>
  )
}
