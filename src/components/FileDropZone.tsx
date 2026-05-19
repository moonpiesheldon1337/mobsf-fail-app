import { useCallback, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  busy?: boolean
}

const ACCEPTED_EXTS = ['.json', '.pdf', '.html', '.htm']

export function FileDropZone({ onFile, busy }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const lower = file.name.toLowerCase()
      const ok = ACCEPTED_EXTS.some((ext) => lower.endsWith(ext))
      if (!ok) {
        setError('Please drop a MobSF JSON, PDF, or HTML report.')
        return
      }
      onFile(file)
    },
    [onFile]
  )

  return (
    <div className="w-full">
      <label
        onDragEnter={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (busy) return
          const file = e.dataTransfer.files?.[0]
          if (file) handleFile(file)
        }}
        className={[
          'flex flex-col items-center justify-center w-full',
          'border-2 border-dashed rounded-lg',
          'px-8 py-16 transition-all',
          busy ? 'cursor-wait opacity-60' : 'cursor-pointer',
          dragging
            ? 'border-[var(--color-accent)] bg-[rgba(163,230,53,0.05)]'
            : 'border-ink-700 hover:border-ink-600 hover:bg-ink-900/40',
        ].join(' ')}
      >
        <div className="text-ink-400 text-sm font-mono mb-2">
          {busy ? '$ parsing…' : '$ drop mobsf-report.{json,pdf,html} here'}
        </div>
        <div className="text-ink-500 text-xs text-center">
          {busy
            ? 'extracting findings from your report'
            : 'or click to select · everything stays in your browser'}
        </div>
        {!busy && (
          <div className="text-ink-600 text-[10px] font-mono mt-3">
            json (best) · html (good) · pdf (lossy, no file paths)
          </div>
        )}
        <input
          type="file"
          accept=".json,.pdf,.html,.htm,application/json,application/pdf,text/html"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </label>
      {error && (
        <div className="mt-3 text-sm text-red-400 font-mono">{error}</div>
      )}
    </div>
  )
}
