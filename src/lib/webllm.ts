import * as webllm from '@mlc-ai/web-llm'
import type { MobSFFinding, AppMetadata, AIVerdict } from '../types'
import { buildPrompt } from './prompts'

// Two model choices, both Llama 3.2 family for consistent prompt behavior.
// JSON-mode (response_format) is intentionally NOT used because WebLLM's
// XGrammar binding throws "Cannot pass non-string to std::string" with these
// models. Instead we rely on the strict-JSON instruction in the system prompt
// and parseVerdict() to extract the JSON robustly from whatever comes back.
export const MODELS = {
  'fast (1B)': 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'balanced (3B)': 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
} as const

export type ModelKey = keyof typeof MODELS

let engine: webllm.MLCEngineInterface | null = null
let loadedModel: string | null = null

export async function ensureEngine(
  modelKey: ModelKey,
  onProgress: (report: webllm.InitProgressReport) => void
): Promise<webllm.MLCEngineInterface> {
  const modelId = MODELS[modelKey]
  if (engine && loadedModel === modelId) return engine

  if (engine) {
    await engine.unload()
    engine = null
    loadedModel = null
  }

  try {
    engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: onProgress,
    })
    loadedModel = modelId
    return engine
  } catch (e) {
    const err = e as Error
    const enriched = new Error(err.message || String(e))
    enriched.name = err.name || 'ModelLoadError'
    throw enriched
  }
}

export async function analyzeFinding(
  eng: webllm.MLCEngineInterface,
  finding: MobSFFinding,
  metadata: AppMetadata
): Promise<AIVerdict> {
  const { system, user } = buildPrompt(finding, metadata)

  const reply = await eng.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
    max_tokens: 300,
    // No response_format — XGrammar binding is broken for Llama-3.2 models.
    // parseVerdict below handles markdown fences, preambles, and bad JSON.
  })

  const content = reply.choices[0]?.message?.content ?? ''
  return parseVerdict(content, finding)
}

function parseVerdict(raw: string, finding: MobSFFinding): AIVerdict {
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Find the first balanced {...} block, even if there's chatty preamble.
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }

  try {
    const parsed = JSON.parse(cleaned) as Partial<AIVerdict>
    const score = clampInt(parsed.fp_score, 0, 100, defaultScore(finding))
    const verdict =
      parsed.verdict === 'true_positive' ||
      parsed.verdict === 'likely_fp' ||
      parsed.verdict === 'needs_review'
        ? parsed.verdict
        : score >= 70 ? 'likely_fp' : score <= 30 ? 'true_positive' : 'needs_review'
    return {
      fp_score: score,
      verdict,
      reason: (parsed.reason ?? 'No reasoning returned.').toString().slice(0, 280),
    }
  } catch {
    return {
      fp_score: defaultScore(finding),
      verdict: 'needs_review',
      reason: 'Model output could not be parsed as JSON. Manual review required.',
    }
  }
}

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function defaultScore(f: MobSFFinding): number {
  if (f.severity === 'high') return 25
  if (f.severity === 'warning') return 45
  return 65
}
