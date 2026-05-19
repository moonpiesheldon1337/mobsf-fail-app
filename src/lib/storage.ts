import * as webllm from '@mlc-ai/web-llm'
import { MODELS, type ModelKey } from './webllm'

export interface StorageInfo {
  usedMB: number
  quotaMB: number
  percentUsed: number
  persistent: boolean
}

export async function getStorageEstimate(): Promise<StorageInfo | null> {
  if (!navigator.storage?.estimate) return null
  try {
    const est = await navigator.storage.estimate()
    const used = est.usage ?? 0
    const quota = est.quota ?? 0
    const persistent = navigator.storage.persisted
      ? await navigator.storage.persisted()
      : false
    return {
      usedMB: Math.round(used / 1024 / 1024),
      quotaMB: Math.round(quota / 1024 / 1024),
      percentUsed: quota > 0 ? Math.round((used / quota) * 100) : 0,
      persistent,
    }
  } catch {
    return null
  }
}

/**
 * Requests persistent storage from the browser. On localhost and in some
 * production scenarios Chrome assigns "best-effort" storage that has a much
 * smaller real-world write ceiling than the optimistic quota reported by
 * navigator.storage.estimate(). Persistent storage gets the full quota and
 * is not subject to background eviction.
 *
 * Returns true if persistent storage is active (either already, or newly
 * granted). Returns false if denied or unsupported — the caller should
 * proceed anyway.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/**
 * Nukes ALL cached model data, including caches that don't match our
 * naming heuristics. The previous version only matched webllm/mlc/tvm
 * which missed some entries.
 */
export async function clearAllModelCache(): Promise<void> {
  // Per-model deletion via WebLLM's own API
  for (const modelId of Object.values(MODELS)) {
    try {
      await webllm.deleteModelAllInfoInCache(modelId as ModelKey)
    } catch {
      // ignore — model may not be cached
    }
  }

  // Nuke every CacheStorage entry for this origin (WebLLM uses several)
  try {
    if ('caches' in self) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // ignore
  }

  // Delete WebLLM's IndexedDB databases too (it uses IDB for some metadata)
  try {
    const idb = self.indexedDB as IDBFactory & {
      databases?: () => Promise<{ name?: string }[]>
    }
    if (idb?.databases) {
      const dbs = await idb.databases()
      for (const db of dbs) {
        if (!db.name) continue
        if (/webllm|mlc|tvm|model/i.test(db.name)) {
          await new Promise<void>((resolve) => {
            const req = idb.deleteDatabase(db.name!)
            req.onsuccess = () => resolve()
            req.onerror = () => resolve()
            req.onblocked = () => resolve()
          })
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Detects browser storage quota errors. Catches both:
 * - DOMException with name "QuotaExceededError" (the formal contract)
 * - bare "Quota exceeded." message (Chromium's stringified form)
 *
 * Stays specific enough not to match "rate limit exceeded".
 */
export function isQuotaError(err: unknown): boolean {
  if (!err) return false
  const e = err as { name?: string; message?: string }
  if (e.name === 'QuotaExceededError') return true
  const msg = (e.message ?? String(err)).toLowerCase()
  return (
    msg.includes('quotaexceedederror') ||
    msg.includes('quota exceeded') ||
    msg.includes('storage quota') ||
    (msg.includes('storage') && msg.includes('full')) ||
    (msg.includes('disk') && msg.includes('full')) ||
    msg.includes('not enough space')
  )
}

export function isRateLimitError(err: unknown): boolean {
  if (!err) return false
  const e = err as { message?: string }
  const msg = (e.message ?? String(err)).toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('rate_limit')
  )
}

export function isBlockedError(err: unknown): boolean {
  if (!err) return false
  const e = err as { message?: string }
  const msg = (e.message ?? String(err)).toLowerCase()
  return (
    msg.includes('err_blocked_by_client') ||
    msg.includes('blocked_by_client') ||
    msg.includes('net::err_blocked')
  )
}
