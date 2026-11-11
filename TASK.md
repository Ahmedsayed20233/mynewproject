# Flosy Antigravity — live development backlog

Status recorded 2026-11-11. Owner wants Antigravity to continue the EXISTING project, not recreate it. Study AGENTS.md and docs/ANTIGRAVITY_HANDOFF.md before writing code.

## Current verified baseline
- [x] GitHub Pages site at https://ahmedsayed20233.github.io/mynewproject/ (branch flosy-site).
- [x] Android Safe Automate testing release flosy-android-v3.4.0 on branch flosy-android (versionCode 34, versionName 3.4.0).
- [x] Offline ReceiptML OCR-text postprocessor + 14,000 synthetic examples; Arabic/English Tesseract OCR and native Latin ML Kit.
- [x] Offline VoiceNLU four-class post-transcription classifier + 14,800 synthetic Egyptian utterances; on-device/OS speech recognition, not trained audio STT.
- [x] Opt-in SMS/voice/receipt automatic ledger capture for explicit/high-confidence cases; dedup, undo and manual review on ambiguity.
- [x] Safe Automate queue, no READ_SMS requested by Flosy APK.
- [x] Supabase compare-and-swap sync, optional trusted-device remembered session, backup/privacy controls.
- [x] Gemini Free personal-coach mode through owner-only JWT Supabase Edge Function, 12/day internal limit, topic/rounded ratio only.
- [x] Site financial regressions, browser smoke and GitHub Pages deployment succeeded after receipt/voice v3.4 merge.
- [ ] Real-phone Android camera, image OCR, microphone, Automate sender filtering and backup restoration verified end to end (NOT done).
- [ ] Real-world receipt benchmark and speech-recognition accuracy evaluation (NOT done).
- [ ] Gemini 503 root cause consistently resolved / production free quota verified (NOT established).

## P0 — FIRST SESSION (do these in order)
- [ ] Confirm two active branches and HEADs; do not use historical main. Read both READMEs and Android native source.
- [ ] In Antigravity Project add BOTH Flosy-Web and Flosy-Android checkouts; scan the docs, architecture and test scripts.
- [ ] Run site node tests + syntax checks. Record failures and exact output, no unsupported claims.
- [ ] Run Playwright browser smoke with synthetic state. Record desktop/mobile UI and extraction traces.
- [ ] Run Android Standard and Safe Automate Debug APK builds and inspect declared permissions. Record package ID / signing distinction.
- [ ] Inventory pending open draft PRs (#20, #22, #25, #26, #17); compare their diffs with v3.4 before closing or merging; they may be superseded.
- [ ] Produce a short SYSTEM AUDIT report: architecture, entry points, data flow, security, tests, dependency versions, bottlenecks and risk ranking. Review with owner BEFORE any breaking change.

## P0 — FIRST IMPLEMENTATION SPRINT
- [ ] Add targeted, privacy-safe diagnostics for receipt OCR on-device: what engine ran, language model availability, input rotation/crop, field confidence and why auto-save was refused. Never log a raw financial document.
- [ ] Build multi-store test fixture corpus from *synthetic* and explicitly consented redacted real receipts with separate train/validation/test source groups; prevent store/template leakage.
- [ ] Improve receipt OCR preprocessing (rotation/deskew, perspective correction, blur/contrast, multi-column layout, receipts with RTL and Latin data, multi-page if applicable), then normalized extraction for merchant, timestamp, items, quantities, unit prices, tax, discount, payment method, total and invoice number.
- [ ] Use field-level confidence and arithmetic consistency (sum of item totals, subtotal, VAT, discount, payable vs actually paid, change, refunds, partial payments). Allow auto-post only for validated consistent totals and a selected/unique account.
- [ ] Add negative tests: price vs SKU R.7, invoice number 44668, VAT/discount zero, date 2026/11/08, printed 1,199, split total label, multi-line Arabic name. Test the de-identified ZINC-shaped example in tests/v4.test.cjs, not unredacted image.
- [ ] Improve Egyptian voice amounts (two thousand, thousand fractions, 100s, decimal amounts, spoken date/account) and intent discrimination (expense, income, self-transfer, prospective, negation, failed, question). Voice model sees transcripts only; OS speech-to-text may depend on Google speech service.
- [ ] Ensure voice UI supplies immediate structured transaction preview and a clear error path, with opt-in auto-save and undo. Prevent duplicates between manual, SMS, voice and receipt.
- [ ] Add integration browser tests for ambiguous receipt and voice cases; never silently create transactions.

## P1 — AFTER DEVICE VALIDATION
- [ ] Build an app-facing Capture Diagnostics dashboard (OCR engine, status, confidence, retry, help) and receipt item editing with accessibility.
- [ ] Test Automate sender allowlist against Egyptian bank/invoice SMS formats; OTP/PIN/CVV/failed/pending blocked, AES-GCM queue, no public broad interception, and behavior with app closed (pending until next open).
- [ ] Reconcile multi-source dedup; do not label self-transfers as expense/income.
- [ ] Verify backup/sync restore on a second device and after a TEST APK reinstall only with disposable/synthetic accounts.
- [ ] Diagnose Gemini Free HTTP 503/UNAVAILABLE using sanitized provider HTTP status only, without modifying billing or exposing secrets. Add local fallback/clear messaging; existing assistant receives broad topics only. Do not send raw receipts, bank SMS or audio to Gemini Free.
- [ ] Evaluate whether on-device text-recognition model/quantized vision/layout model improves **measured** real-world quality. Propose budget, memory, latency, APK size and model-license effects; do not assert universal receipt reading.
- [ ] Produce Android v3.5 release candidate only after passing physical-device tests and getting owner sign-off.

## Definition of done for EVERY PR
- [ ] Existing accounting balances, debits/credits, transfers, deleted IDs, dates, rounding and sync invariants preserved.
- [ ] Unit tests / relevant browser smoke pass; no hidden test failures.
- [ ] No production credentials or real financial records in code, CI artifacts, screenshots or logs.
- [ ] App still works in local/offline mode; all new AI calls opt-in and cost-free under existing quota.
- [ ] New features have UI states: loading, failure, retry, low confidence, no permission, no internet, duplication.
- [ ] PR description includes user-visible behavior, evidence, screenshots from synthetic data, risks and rollback.
- [ ] Android release notes do not claim Play approval; signing conflicts and backup steps are documented.

## First Antigravity request
Read docs/ANTIGRAVITY_HANDOFF.md and AGENTS.md, audit both checkouts and run the test commands. Present a 1-page baseline audit plus a prioritized plan. Then implement one smallest valuable P0 improvement with tests on a dedicated branch, propose a PR, and report what remains. Do not touch billing, paid Gemini calls, bank accounts, production database, or user data.
