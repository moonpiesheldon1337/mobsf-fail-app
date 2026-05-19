# mobsf-fail launch kit

Use this as the public launch plan for mobsf-fail. The goal is not to spam links; it is to start useful conversations with mobile security, AppSec, and open-source communities.

## Core positioning

MobSF is great, but Community Edition reports are noisy. mobsf-fail is a local browser tool that turns MobSF JSON, PDF, or HTML exports into a prioritized review queue and clean Markdown/CSV output.

One-line pitch:

> Local-first triage for noisy MobSF reports: JSON/PDF/HTML in, prioritized findings and Markdown/CSV out.

Do not call it an "AI scanner." It is a triage assistant for reports MobSF already produced.

## Primary links

- Repo: https://github.com/moonpiesheldon1337/mobsf-fail-app
- Live app: https://moonpiesheldon1337.github.io/mobsf-fail-app/
- Sample input: `public/sample-mobsf-report.json`

## Launch checklist

- Verify the live app loads in Chrome and Edge.
- Verify the sample report imports successfully.
- Verify Markdown and CSV export work from the sample report.
- Add a real demo GIF to the README once the asset exists.
- Add GitHub topics: `mobsf`, `mobile-security`, `android-security`, `appsec`, `static-analysis`, `webllm`, `webgpu`, `devsecops`.
- Pin the repository on the GitHub profile for launch week.

## Reddit guidance

Reddit works best when the post is useful even if nobody clicks. Ask for feedback, be transparent that you built it, and avoid posting the same link everywhere on the same day.

Recommended subreddits:

- `r/netsecstudents`
- `r/cybersecurity`
- `r/AskNetsec`
- `r/androiddev`
- `r/ReverseEngineering`
- `r/opensource`
- `r/github`

Before posting, check each subreddit sidebar and recent posts. If self-promotion is restricted, ask the mods first or use the weekly promotion thread.

### Reddit title options

```text
I built a local browser tool to triage noisy MobSF reports
```

```text
MobSF gives me 200 findings, so I built a tool to find the 20 worth reviewing
```

```text
Open-source MobSF report triage tool: JSON/PDF/HTML in, Markdown report out
```

### Reddit post body

```md
Hey folks, I built an open-source tool for people who use MobSF Community Edition.

MobSF is great, but the exported reports can be noisy. This tool lets you drop a MobSF JSON, PDF, or HTML report into the browser, runs local WebLLM/WebGPU triage, and labels findings as likely false positive, needs review, or likely real.

Repo:
https://github.com/moonpiesheldon1337/mobsf-fail-app

Live demo:
https://moonpiesheldon1337.github.io/mobsf-fail-app/

Why I made it:
- MobSF reports often have 100-300 findings
- many are context-dependent false positives
- client-ready report cleanup takes too long
- I wanted something local: no uploads, no API keys, no server

Would love feedback from mobile/AppSec folks on:
- false-positive heuristics
- missing MobSF categories
- whether the Markdown export fits real pentest workflows
```

### Short comment reply

```md
Totally fair question. It is not a scanner and does not replace manual review. It only triages findings MobSF already produced, with the goal of pushing obvious false positives down and making the needs-review bucket smaller. Everything runs locally in the browser; the only network call after app load is the one-time model download.
```

## Hacker News

Use Show HN only if the live app can be tried without setup.

Title:

```text
Show HN: mobsf-fail - Local browser triage for noisy MobSF reports
```

Post comment:

```md
I built mobsf-fail because MobSF Community Edition reports are useful but often noisy. The app runs entirely in the browser: drop a MobSF JSON/PDF/HTML export, it parses the findings locally, runs WebLLM/WebGPU triage locally, and exports Markdown or CSV.

It is not a scanner and not a replacement for human review. The goal is to reduce the first-pass triage burden before report writing or ticket creation.

I would especially appreciate feedback from mobile security folks on the false-positive heuristics and categories worth adding next.
```

## LinkedIn

```text
I built a small open-source tool for mobile AppSec teams using MobSF Community Edition.

MobSF is excellent, but the exported reports can be noisy: hundreds of findings, many context-dependent, and a lot of manual cleanup before anything is client-ready.

mobsf-fail runs locally in the browser. Drop a MobSF JSON, PDF, or HTML report, triage findings with local WebLLM/WebGPU, and export Markdown or CSV for review.

No uploads. No API keys. No server-side report processing.

Repo: https://github.com/moonpiesheldon1337/mobsf-fail-app
Live app: https://moonpiesheldon1337.github.io/mobsf-fail-app/

Feedback from mobile pentesters, AppSec engineers, and DevSecOps folks would be very welcome.
```

## Dev.to or blog outline

Title:

```text
Triage MobSF false positives locally with WebLLM
```

Outline:

1. MobSF is valuable, but reports are noisy.
2. False positives are context-dependent, not always rule failures.
3. Why local-first matters for pentest reports.
4. How mobsf-fail parses JSON, PDF, and HTML exports.
5. How category-specific prompts work.
6. What the tool does not do.
7. Try it with the sample report.

## Launch cadence

Day 1:
Post to LinkedIn and one smaller feedback-friendly subreddit.

Day 2:
Reply to every substantive comment. File issues for good feature requests.

Day 3:
Post Show HN if the demo is stable and sample flow works.

Day 4-7:
Write the technical blog post using real feedback from the first posts. Share that article once, not everywhere.

## Success metrics

- GitHub stars are nice, but useful feedback matters more.
- Track issues opened, categories requested, and whether people try the sample report.
- Convert repeated feedback into GitHub issues labeled `good first issue`, `prompt`, `parser`, or `docs`.
