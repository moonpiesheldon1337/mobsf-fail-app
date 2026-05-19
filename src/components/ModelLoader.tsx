import { useEffect, useState } from 'react'
import type * as webllm from '@mlc-ai/web-llm'
import type { ModelKey } from '../lib/webllm'
import {
  getStorageEstimate,
  clearAllModelCache,
  isQuotaError,
  isRateLimitError,
  isBlockedError,
  type StorageInfo,
} from '../lib/storage'

interface Props {
  modelKey: ModelKey
  onModelKeyChange: (k: ModelKey) => void
  status: 'idle' | 'loading' | 'ready' | 'error'
  progress: webllm.InitProgressReport | null
  onLoad: () => void
  error?: string | null
}

const MODELS: ModelKey[] = ['fast (1B)', 'balanced (3B)']

const MODEL_SIZE_MB: Record<ModelKey, number> = {
  'fast (1B)': 1200,
  'balanced (3B)': 2000,
}

type ErrorKind = 'quota' | 'rate_limit' | 'blocked' | 'webgpu' | 'network' | 'unknown'

function classifyError(message: string): ErrorKind {
  if (!message) return 'unknown'
  const err = { message }
  if (isQuotaError(err)) return 'quota'
  if (isRateLimitError(err)) return 'rate_limit'
  if (isBlockedError(err)) return 'blocked'
  const lower = message.toLowerCase()
  if (lower.includes('webgpu')) return 'webgpu'
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('net::')) {
    return 'network'
  }
  return 'unknown'
}

export function ModelLoader({
  modelKey,
  onModelKeyChange,
  status,
  progress,
  onLoad,
  error,
}: Props) {
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [clearing, setClearing] = useState(false)

  const refreshStorage = async () => {
    setStorage(await getStorageEstimate())
  }

  useEffect(() => {
    refreshStorage()
  }, [status])

  const handleClearCache = async () => {
    if (clearing) return
    const ok = window.confirm(
      'Delete all cached model weights for this site? You will need to redownload any model on next use.'
    )
    if (!ok) return
    setClearing(true)
    try {
      await clearAllModelCache()
      await refreshStorage()
    } finally {
      setClearing(false)
    }
  }

  const errorKind: ErrorKind | null =
    status === 'error' && error ? classifyError(error) : null

  return (
    <div className="border border-ink-800 rounded-lg p-5 bg-ink-900/50">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs uppercase tracking-wider text-ink-500 font-mono mb-1">
            model
          </div>
          <select
            value={modelKey}
            onChange={(e) => onModelKeyChange(e.target.value as ModelKey)}
            disabled={status === 'loading'}
            className="w-full bg-ink-950 border border-ink-700 rounded px-3 py-2
                       text-ink-100 font-mono text-sm focus:outline-none
                       focus:border-[var(--color-accent)] disabled:opacity-50"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m} · ~{MODEL_SIZE_MB[m]}MB
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onLoad}
          disabled={status === 'loading' || status === 'ready'}
          className="px-5 py-2 rounded font-mono text-sm font-medium
                     bg-[var(--color-accent)] text-ink-950
                     hover:bg-[var(--color-accent-dim)]
                     disabled:bg-ink-800 disabled:text-ink-500
                     disabled:cursor-not-allowed transition-colors"
        >
          {status === 'ready'
            ? '✓ model loaded'
            : status === 'loading'
            ? 'loading…'
            : 'load model'}
        </button>
      </div>

      {status === 'loading' && progress && (
        <div className="mt-4">
          <div className="text-xs font-mono text-ink-400 mb-2">
            {progress.text}
          </div>
          <div className="w-full h-1.5 bg-ink-800 rounded overflow-hidden">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${(progress.progress ?? 0) * 100}%` }}
            />
          </div>
        </div>
      )}

      {errorKind && (
        <div className="mt-4 px-3 py-3 rounded border border-red-500/40 bg-red-500/5">
          <ErrorPanel kind={errorKind} message={error ?? ''} onClear={handleClearCache} clearing={clearing} />
        </div>
      )}

      {status === 'idle' && (
        <div className="mt-3 text-xs text-ink-500 font-mono">
          First load downloads the model and caches it locally. Requires
          WebGPU (Chrome, Edge, Brave, Safari 18+).
        </div>
      )}

      {storage && (
        <div className="mt-4 pt-4 border-t border-ink-800/60 flex items-center justify-between gap-3 text-[11px] font-mono text-ink-500">
          <div>
            site storage: {storage.usedMB}MB of {storage.quotaMB}MB used ({storage.percentUsed}%)
            {storage.persistent ? (
              <span className="ml-2 text-[var(--color-accent)]">· persistent ✓</span>
            ) : (
              <span className="ml-2 text-amber-400/80">· best-effort (auto-evictable)</span>
            )}
          </div>
          {storage.usedMB > 0 && (
            <button
              onClick={handleClearCache}
              disabled={clearing || status === 'loading'}
              className="text-ink-400 hover:text-ink-100 underline underline-offset-2 disabled:opacity-50"
            >
              {clearing ? 'clearing…' : 'clear cached models'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ErrorPanel({
  kind,
  message,
  onClear,
  clearing,
}: {
  kind: ErrorKind
  message: string
  onClear: () => void
  clearing: boolean
}) {
  if (kind === 'quota') {
    return (
      <>
        <div className="text-sm text-red-300 font-mono mb-2">Browser storage quota hit.</div>
        <div className="text-xs text-ink-300 font-mono leading-relaxed mb-3">
          The browser refused to keep writing model shards. Even when storage
          shows plenty of headroom, Chrome can gate writes on{' '}
          <span className="text-ink-100">localhost</span> at a much lower
          ceiling than the optimistic quota. The app now requests persistent
          storage automatically — if it still fails, try one of these:
        </div>
        <ul className="text-xs text-ink-300 font-mono leading-relaxed mb-3 list-disc list-inside space-y-1">
          <li>Clear the cache below and reload, then try <span className="text-ink-100">load model</span> again.</li>
          <li>Open this page in an <span className="text-ink-100">Incognito</span> window — clean storage namespace.</li>
          <li>Try <span className="text-ink-100">Brave</span> or <span className="text-ink-100">Edge</span> — same engine, different quota policies.</li>
          <li>Deploy to GitHub Pages and use the HTTPS URL — production origins don't have this issue.</li>
        </ul>
        <ClearButton onClear={onClear} clearing={clearing} />
        <RawError message={message} />
      </>
    )
  }
  if (kind === 'rate_limit') {
    return (
      <>
        <div className="text-sm text-red-300 font-mono mb-2">Rate limited by the model CDN.</div>
        <div className="text-xs text-ink-300 font-mono leading-relaxed mb-3">
          Hugging Face is throttling anonymous downloads from this IP, usually
          because of repeated attempts. Wait 5–10 minutes and try again. If it
          keeps happening, switching networks (mobile hotspot, VPN) gives you a
          fresh IP.
        </div>
        <RawError message={message} />
      </>
    )
  }
  if (kind === 'blocked') {
    return (
      <>
        <div className="text-sm text-red-300 font-mono mb-2">Request blocked by a browser extension.</div>
        <div className="text-xs text-ink-300 font-mono leading-relaxed mb-3">
          An ad blocker or privacy extension is blocking requests to the model
          CDN (huggingface.co). Disable AdGuard, uBlock Origin, Privacy Badger,
          Ghostery, or similar for this page, or open the app in an Incognito
          window where extensions are off by default.
        </div>
        <RawError message={message} />
      </>
    )
  }
  if (kind === 'webgpu') {
    return (
      <>
        <div className="text-sm text-red-300 font-mono mb-2">WebGPU not available.</div>
        <div className="text-xs text-ink-300 font-mono leading-relaxed mb-3">
          This browser does not expose WebGPU. Use Chrome, Edge, Brave, Opera,
          or Safari 18+. Firefox needs <span className="text-ink-100">dom.webgpu.enabled</span> in
          {' '}<span className="text-ink-100">about:config</span>.
        </div>
        <RawError message={message} />
      </>
    )
  }
  if (kind === 'network') {
    return (
      <>
        <div className="text-sm text-red-300 font-mono mb-2">Network error.</div>
        <div className="text-xs text-ink-300 font-mono leading-relaxed mb-3">
          The model download failed at the network layer. Possibilities: your
          connection dropped, a firewall is blocking huggingface.co, or the CDN
          is briefly unavailable. Open DevTools → Network, retry the load, and
          look for failed requests.
        </div>
        <RawError message={message} />
      </>
    )
  }
  // unknown
  return (
    <>
      <div className="text-sm text-red-300 font-mono mb-2">Model load failed.</div>
      <div className="text-xs text-ink-300 font-mono leading-relaxed mb-3">
        The model could not be loaded. The full error is below — if it mentions
        a URL, copy that URL into a new tab to see what your browser is actually
        getting back. Open DevTools (F12) → Network tab and reload to see the
        underlying HTTP responses.
      </div>
      <RawError message={message} />
    </>
  )
}

function RawError({ message }: { message: string }) {
  if (!message) return null
  return (
    <details className="mt-3">
      <summary className="text-[11px] font-mono text-ink-500 cursor-pointer hover:text-ink-300">
        show raw error
      </summary>
      <pre className="mt-2 text-[11px] font-mono text-ink-400 bg-ink-950/60 border border-ink-800 rounded p-2 whitespace-pre-wrap break-all">
        {message}
      </pre>
    </details>
  )
}

function ClearButton({ onClear, clearing }: { onClear: () => void; clearing: boolean }) {
  return (
    <button
      onClick={onClear}
      disabled={clearing}
      className="px-3 py-1.5 rounded font-mono text-xs border border-red-400/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
    >
      {clearing ? 'clearing…' : 'clear all model caches'}
    </button>
  )
}
