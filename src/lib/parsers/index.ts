import type { ParseResult } from './text'
import { parseMobSFJSON } from './json'
import { parseMobSFPDF } from './pdf'
import { parseMobSFHTML } from './html'

export type { ParseResult }

export type SourceFormat = 'json' | 'pdf' | 'html'

/**
 * Routes a dropped file to the right parser based on extension and a quick
 * content sniff. Returns the format used so the UI can flag PDF/HTML imports
 * as lossy compared to JSON.
 */
export async function parseMobSFReport(
  file: File
): Promise<ParseResult & { source: SourceFormat }> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.json')) {
    const text = await file.text()
    return { ...parseMobSFJSON(text), source: 'json' }
  }

  if (name.endsWith('.pdf')) {
    return { ...(await parseMobSFPDF(file)), source: 'pdf' }
  }

  if (name.endsWith('.html') || name.endsWith('.htm')) {
    const text = await file.text()
    return { ...parseMobSFHTML(text), source: 'html' }
  }

  // Fallback: try to sniff the content
  const head = await readFirstBytes(file, 8)
  if (head.startsWith('%PDF')) {
    return { ...(await parseMobSFPDF(file)), source: 'pdf' }
  }
  const text = await file.text()
  const trimmed = text.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return { ...parseMobSFJSON(text), source: 'json' }
  }
  if (/<html|<!doctype html/i.test(trimmed.slice(0, 200))) {
    return { ...parseMobSFHTML(text), source: 'html' }
  }

  throw new Error(
    'Unrecognized file type. Drop a MobSF JSON, PDF, or HTML report.'
  )
}

async function readFirstBytes(file: File, n: number): Promise<string> {
  const slice = file.slice(0, n)
  return await slice.text()
}
