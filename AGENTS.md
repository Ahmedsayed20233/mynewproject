# Flosy — instructions for Antigravity and other coding agents

**IMPORTANT: READ docs/ANTIGRAVITY_HANDOFF.md AND TASK.md FIRST.** Do not start from GitHub's default main branch: it is not the current Flosy product.

## Project identity and active branches
- One GitHub repository: https://github.com/Ahmedsayed20233/mynewproject
- flosy-site: active, deployed public GitHub Pages app and its offline JavaScript AI/financial engines. Site: https://ahmedsayed20233.github.io/mynewproject/
- flosy-android: independent active Android Gradle project, latest published debug APK v3.4.0. Native WebView opens the hosted flosy-site; the web scripts are not bundled into the APK.
- GitHub default main is historical. DO NOT develop against main, overwrite or rebase the site and Android branches into one branch.
- Use two working directories/worktrees and a single Antigravity Project with both folders. Create dedicated feature branches and submit pull requests separately to the appropriate base.

## Non-negotiable engineering guardrails
1. This is a **personal finance app**. Never delete, reset, overwrite, migrate or exfiltrate real user transactions. No production SQL writes or Supabase schema deployment without owner's approval and verified backups.
2. **Never request/commit/log** bank SMS contents, OTP, PIN, CVV, card/account numbers, Gemini keys, Supabase service-role secrets, pairing tokens, real receipt images or unredacted transcripts. Use synthetic test data only. The Supabase publishable key and public site URL are not confidential, but service-role/API secrets are.
3. No new fees, paid API billing, subscriptions, hosted LLM contracts, or automatic usage upgrades. Gemini API is a separate Free Tier from the owner's Google AI Pro subscription; keep the paid fallback disabled.
4. No unrestricted READ_SMS / RECEIVE_SMS / SEND_SMS / Accessibility Service / notification listener Android permissions. Bank messages are relayed by the independently permissioned Automate app, with sender allowlist, encrypted queue and secret filtering. Do NOT bypass Google Play Protect.
5. Classifier/model output is **never** permission to write the ledger. Require validated amount, transaction direction, explicit/unique account, valid date, no failed/pending/OTP marker, user opt-in for auto-record, and cross-source dedup. Internal transfers must never be treated as expenses.
6. Preserve offline-first architecture, Arabic RTL, mobile accessibility, white theme, Supabase RLS, compare-and-swap sync revisions and backups. A voice or receipt failure must not corrupt the ledger.
7. Existing ReceiptML/VoiceNLU training was SYNTHETIC ONLY. Do not advertise universal OCR or real-world model accuracy without a consented, de-identified multi-store/device benchmark.
8. Read all changed files, create a plan and baseline tests first. Work in small auditable PRs; request approval for backend/live-data/deployment/release/security-sensitive changes.
9. Signoff needs Node financial regression, Playwright Chromium smoke, Android build permission guards, and explicit accounting invariants before claiming the feature is ready.

## High-priority next task
Open TASK.md. Begin with **P0 repository audit, reproducible tests and real-device receipt/voice failure diagnosis**, not a rewrite. Fix highest-impact bugs with unit/browser tests before proposing a new model. Report exact files changed, checks passing/failing, and open risks.

## Practical checks
- Website checks (from flosy-site checkout):
  node --test tests/phase1.test.cjs tests/v4.test.cjs tests/offline-cache.test.cjs
  node --check flosy-receipt-ml.js
  node --check flosy-voice-nlu.js
  node --check flosy-v4-capture.js
- Browser smoke: install Playwright Chromium as described in .github/workflows/flosy-browser-smoke.yml, then node tests/browser-smoke.cjs.
- Android checks (from flosy-android checkout, JDK 17 / Android SDK 35 / Gradle 8.11.1):
  gradle -p android --no-daemon --stacktrace assembleStandardDebug assembleSmsDebug
- CI is the source of truth for current runner tools and permission checks.

Do NOT claim Antigravity is connected to the owner's local machine until both folders have actually been added to an Antigravity Project and the repo can be indexed. Documentation here is a HANDOFF, not remote control over that machine.
