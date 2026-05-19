import type { ParseResult } from './text'
import { parseMobSFText } from './text'

/**
 * Parse a MobSF HTML report. The HTML and PDF reports share the same
 * Jinja template, so once we extract clean text from the DOM the same
 * text-based parser handles both.
 */
export function parseMobSFHTML(html: string): ParseResult {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  if (doc.querySelector('parsererror')) {
    throw new Error('Could not parse HTML.')
  }

  // Walk the body and reconstruct text with line breaks at block boundaries.
  // innerText would do similar work but is not available in non-rendered DOM.
  const text = walk(doc.body || doc.documentElement)

  const result = parseMobSFText(text)
  if (result.findings.length === 0) {
    throw new Error(
      'HTML parsed but no MobSF findings were detected. ' +
        'Make sure this is a MobSF Community Edition report HTML.'
    )
  }
  return result
}

const BLOCK_TAGS = new Set([
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'tr', 'td', 'th', 'li', 'br', 'section', 'article', 'header', 'footer',
])

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (tag === 'script' || tag === 'style' || tag === 'noscript') return ''

  let out = ''
  for (const child of Array.from(el.childNodes)) {
    out += walk(child)
  }
  if (BLOCK_TAGS.has(tag)) out += '\n'
  return out
}
