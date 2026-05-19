# 📱 mobsf-fail

> **Triage MobSF Community Edition reports in your browser. JSON, PDF, or HTML. Turn 200 findings into 20. No uploads, no API keys, no cost.**

A static web app that takes a [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) Community Edition report — in **JSON, PDF, or HTML** — runs each finding through a local LLM (via [WebLLM](https://github.com/mlc-ai/web-llm) and your GPU), and tells you how likely each one is to be a false positive — with reasoning. Export a clean Markdown report you can hand to a client.

The whole thing runs in your browser. Your APK's findings never touch a server. After the app loads, the only remote request is the one-time WebLLM model download; report parsing and triage run locally.

**👉 Try it:** [moonpiesheldon1337.github.io/mobsf-fail-app](https://moonpiesheldon1337.github.io/mobsf-fail-app/)

Have 30 seconds? Open the live demo and drop `public/sample-mobsf-report.json` to test the flow end-to-end without a real engagement.

---

## Who this is for

- Mobile pentesters turning noisy MobSF exports into client-ready findings.
- AppSec teams that need a local-first triage step before report writing or ticket creation.
- Solo developers and security students who want to understand which MobSF findings need human attention.
- DevSecOps teams experimenting with MobSF in CI/CD and needing reviewable Markdown or CSV output.

## Why this exists

MobSF is the standard for mobile app static analysis. It's also famously noisy. A typical APK scan produces 100–300 findings, and a significant fraction are false positives:

- **"Hardcoded API key"** that's actually a Stripe **publishable** key (designed to be in the client).
- **"App uses MD5"** in a non-security context like cache key generation.
- **"Activity is exported"** on `MainActivity` because it's the launcher activity — by design.
- **"App logs information"** firing on every `Log.d()` call in a 50k-LOC codebase.
- **"Cleartext traffic permitted"** scoped to `10.0.2.2` (the Android emulator).
- **"Dangerous permission"** for `CAMERA` on a camera app.

MobSF Community Edition exports reports (PDF, JSON, HTML — all of it works). The problem is that the saved report is **unusable for client delivery without hours of manual triage**. That's what this tool fixes.

## Supported input formats

| Format | Quality | What you keep | What you lose |
|---|---|---|---|
| **JSON** | Best | Everything: file paths, line numbers, CWE/MASVS tags, CVSS scores | — |
| **HTML** | Good | Findings, severities, descriptions, components | File paths, CWE/MASVS for some rules |
| **PDF** | Lossy but workable | Findings, severities, descriptions, components | File paths, line numbers, CWE/MASVS for some rules |

**If you have the JSON export, use it.** PDF/HTML support exists because in practice you often receive a teammate's saved PDF and don't have access to re-run the scan. Triage quality is essentially the same; the report exporter just won't link to specific files when the source didn't carry them.

**What about .doc/.docx?** MobSF does not natively export Word documents. If someone has a Word file, it was made via "Save as Word" from the PDF — convert it back to PDF (most word processors do this) and drop that.

## How it works

```
MobSF report → parse client-side (JSON / PDF.js / DOMParser)
                                │
                                ▼
                  categorize each finding
                                │
                                ▼
              category-specific FP prompt
                                │
                                ▼
         local LLM via WebLLM (your GPU)
                                │
                                ▼
   { fp_score: 0-100, verdict, reason } per finding
                                │
                                ▼
   sortable / filterable table → export CSV or Markdown report
```

The prompts encode senior mobile-pentester FP heuristics per category. They live in `src/lib/prompts/` and are the actual product value. The LLM is just the language layer that applies the rules to your specific evidence.

## Categories covered

| Category | What it covers | FP rate in MobSF |
|---|---|---|
| `code_analysis` | Logging, crypto, WebView, raw SQL, hardcoded patterns | High |
| `manifest` | Exported components, allowBackup, debuggable, deep links | High |
| `permissions` | Dangerous permissions vs app's apparent purpose | Very high |
| `secrets` | Hardcoded keys, tokens, credentials | Very high |
| `network_security` | NSC cleartext, trustUserCerts, pinning | Medium |
| Other | Trackers, binary, certificate | Falls through to generic |

PRs adding specialized prompts for the remaining categories are welcome.

## Requirements

- A browser with **WebGPU**: Chrome, Edge, Brave, Opera, or Safari 18+. Firefox needs `dom.webgpu.enabled` in `about:config`.
- A modern GPU (integrated graphics work, just slower).
- ~700MB–2GB disk space for the model cache (one-time download).

## Local development

```bash
git clone https://github.com/moonpiesheldon1337/mobsf-fail-app.git
cd mobsf-fail-app
npm install
npm run dev
```

Open http://localhost:5173 and drop `public/sample-mobsf-report.json` to test the flow end-to-end without a real engagement.

## Deploying your own copy

1. Fork this repo.
2. In your fork, edit `vite.config.ts` and change `REPO_BASE` to `/your-repo-name/`.
3. In **Settings → Pages**, set the source to **GitHub Actions**.
4. Push to `main`. The included workflow builds and deploys automatically.

## Output

Two export formats once analysis is done:

- **`<package>-report.md`** — a Markdown pentest-report draft containing **only** confirmed and review-needed findings, with metadata, descriptions, evidence blocks, and per-finding triage notes. Convert to DOCX/PDF with pandoc, or paste straight into your report template.
- **`<package>-triage.csv`** — full findings table with verdicts and reasoning, for spreadsheet review or import into a vuln tracker.

## Adding a new category prompt

The prompts in `src/lib/prompts/` are where the real product value lives. To add a new category:

1. Add a new file `src/lib/prompts/<category>.ts` with a `<category>System` constant (the FP heuristics) and `<category>User(finding)` function. Use the existing files as templates.
2. Wire it up in `src/lib/prompts/index.ts`.
3. If it's a new category not produced by the parser, also add it to `Category` in `src/types.ts` and update the relevant parser.

Good targets for contribution: trackers, certificate analysis, binary analysis, URLs/emails extraction.

## Parser architecture

```
src/lib/parsers/
├── index.ts   ← entry point, dispatches by file type
├── json.ts    ← MobSF JSON schema (defensive across v3.7–v4.5)
├── pdf.ts     ← pdfjs-dist text extraction → text parser
├── html.ts    ← DOMParser walk → text parser
└── text.ts    ← shared text → findings (used by pdf + html)
```

PDF and HTML reports are both rendered from the same MobSF Jinja template, so once the text is extracted from each, the same regex-based section parser handles them. This keeps the format-specific code small.

## What this is not

- **Not a replacement for human review.** It's a triage aid. Always sanity-check the `needs_review` bucket, and spot-check a sample of the `likely_fp` bucket before exporting.
- **Not a scanner.** It only operates on findings MobSF already produced.
- **Not connected to anything.** No telemetry, no analytics, no cloud calls. Open DevTools → Network and verify.

## Privacy

Everything happens in your browser. The MobSF report you drop is parsed by JavaScript locally — JSON in pure JS, PDF via WebAssembly (pdfjs-dist), HTML via the browser's own DOMParser. The model runs on your GPU via WebGPU. No finding, file path, or app metadata is ever sent to a server.

The only network requests this app makes:
1. Loading the app itself from GitHub Pages.
2. Downloading the model weights from the WebLLM CDN on first use. After that, the model is cached and works fully offline.

## License

MIT. Use it, fork it, sell pentests with it.

## Troubleshooting

**"Quota exceeded" when loading a model.**
Browser storage is full for this origin. This usually happens after
switching between large models — partial caches add up. Two fixes:
either use the in-app **clear cached models** button at the bottom of
the model panel, or in DevTools: Application → Storage → Clear site
data. Then load the `fast (1B)` model first, which fits in ~700MB.

**"WebGPU not available".**
The 1B model needs a GPU and a browser that exposes WebGPU. Use
Chrome, Edge, Brave, Opera, or Safari 18+. Firefox needs the
`dom.webgpu.enabled` preference set in `about:config`.

**Model load is slow or stalls partway.**
The MLC CDN occasionally throttles. Refresh the page and try again —
the partial download resumes from where it left off because the
chunks are cached individually.

**PDF parsed but found 0 findings.**
The PDF probably isn't a MobSF report, or it's a custom export
template. Try the JSON or HTML export instead; both are more reliable.

## Credits

- [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) for making in-browser inference real.
- [pdfjs-dist](https://github.com/mozilla/pdfjs-dist) for browser PDF parsing.
- [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) for the scanner this tool exists to triage.
