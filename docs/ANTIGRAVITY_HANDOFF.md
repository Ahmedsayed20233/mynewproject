# Flosy v3.4 -> Google Antigravity: engineering handoff

Last verified: 2026-11-11. For AGENTS.md and current actionable work, see ../AGENTS.md and ../TASK.md.

## 1. What the product is
Flosy is an Egypt-first, Arabic RTL, offline-first personal-finance tracker. The owner wants: bank SMS/InstaPay capture via explicit permission and Automate; clear transactions saved automatically after opt-in; natural Egyptian-Arabic spoken expense/income logging; itemized Arabic/English receipt OCR; account/budget/wealth/bills/installment tracking; safe cloud sync and zero-additional-cost AI assistance. This is a **real-money ledger UI**, not a bank-transfer service. It must NOT create bank transfers or access bank accounts directly.

Public repo: https://github.com/Ahmedsayed20233/mynewproject
Live web app: https://ahmedsayed20233.github.io/mynewproject/
Latest Android release: https://github.com/Ahmedsayed20233/mynewproject/releases/tag/flosy-android-v3.4.0
Website merge: https://github.com/Ahmedsayed20233/mynewproject/pull/31
Android merge: https://github.com/Ahmedsayed20233/mynewproject/pull/32

DO NOT start from the GitHub default branch main. That branch predates the active app. The code is intentionally split:
- flosy-site: hosted site, PWA, all shared web logic, static JS, tests, Supabase Edge Function source.
- flosy-android: Android Gradle project wrapping LIVE hosted site with WebView and native phone integrations. Updating website script files is normally enough for the current APK WebView when online, but native Java/manifest/build changes require a new APK.
The branches have different content; do not merge flosy-site into flosy-android wholesale or vice versa.

## 2. Actual baseline / what is DONE
### Frontend and accounting
- flosy-site is the source for index.html and browser modules. Public white/pearl RTL UI with account ledger, expenses/income, internal transfers, reminders, budgets, installment handling, safe-to-spend, wealth assets, synchronization and privacy features.
- flosy-sync-v3.js provides Supabase-backed revision-aware sync and conflict logic; user data may also be present in WebView local storage. Restore/backups are sensitive: no automatic resets or migrations.
- flosy-v4-capture.js is the canonical voice/receipt transaction proposal and auto-record path; it invokes ledger mutation only after explicit validation and opt-in, account checks and dedup. flosy-next.js parses financial SMS with secret filtering. flosy-automate-relay.js bridges the pending SMS queue.
- Clear transactions may be posted after opt-in; ambiguous inputs go to review. Undo last auto-capture is available. Actual 2-device recovery and broad hardware QA NOT established.

### ReceiptML and OCR (site v3.4)
- flosy-repair.js handles image selection, OCR scheduling, status messages and proposals.
- flosy-receipt-ml.js postprocesses OCR TEXT: merchant, line items, unit price/qty, sale date/time, receipt number, cash/card, subtotal/tax/discount/total/payment. A logistic line scorer was trained on 14,000 SYNTHETIC examples. It is NOT a vision model, not universal receipt reading, and cannot fix all low-quality OCR.
- Android native Java uses Google's ML Kit Latin on chosen receipt photos and passes a downscaled image to the trusted WebView. The web layer attempts Tesseract Arabic+English locally, including a second contrast pass. OCR language weights may require an initial internet download.
- The de-identified ZINC-shaped regression fixture expects merchant ZINC, date 2026-11-08, sale no. 44668, cash, shoe, quantity 1 and 1,199 EGP. Real uploaded image was not included in the public repo; DO NOT seek or commit unredacted receipts.
- Details render under the transaction's expandable itemized receipt view. Correctness depends on multi-column layout and field confidence; real-world tests still needed.

### VoiceNLU (site v3.4)
- Native Android SpeechRecognizer requests ar-EG, prefers on-device service when available; can fall back to OS recognition which may require a network connection.
- flosy-voice-nlu.js is a transcript-level 4-class logistic classifier (expense/income/internal transfer/nontransaction) trained on 14,800 SYNTHETIC phrases. It is NOT an acoustic or speech-to-text model.
- Understands colloquial amount words, approximate temporal labels (today/yesterday), categories, income/expense direction. Rejects future plans, negations, OTP and self-transfers as expenses. Fails closed on ambiguous account/amount.
- Reproducible synthetic training scripts: tools/train_voice_intent_model.py and tools/train_receipt_amount_ranker.py. Synthetic benchmark scores must never be presented as real-device accuracy.

### SMS / Automate / native security
- The Android APK's Safe Automate flavor is an additional applicationId variant and requires separately configured Automate to relay user-authorized, allowlisted sender messages or supported notifications.
- Android queue encrypted with AndroidKeyStore AES-GCM; OTP/PIN/CVV excluded. Flosy does not request restricted READ_SMS, RECEIVE_SMS, SEND_SMS, accessibility or notification-listener permissions.
- Android receipt/speech Java: android/app/src/main/java/com/flosy/finance/MainActivity.java and receiver/store source in the same folder.
- The SMS queue may accumulate while the Flosy app is not foregrounded; Flosy should not claim immediate ledger posting in the background without empirical verification.
- Old open PR #20 / #22 / #25 are historical drafts whose changes may have reached flosy-android through later branch merges. Inspect diff and Git history BEFORE merging/closing any old PR.

### AI and Supabase
- Supabase Free project supports auth, RLS and Edge Functions. Owner's Gemini API key is stored as an Edge Function Secret, NEVER in the repository/web/APK.
- supabase/functions/flosy-gemini-parse/index.ts: owner-only Supabase JWT, GEMINI_API_KEY + FLOSY_GEMINI_OWNER_UID + GEMINI_ENABLED environment secrets; 12/day internal atomic quota, currently configured model name gemini-3.5-flash-lite at this snapshot. Model access/rates can change; verify actual Free Tier, no billing upgrades.
- Gemini AI coach on the web sends only broad sanitized intent/topic and rounded percentage-band aggregates; it does NOT receive raw receipt photos, recordings, bank SMS or exact user financial records. Gemini is not yet the main receipt/voice/SMS model.
- User reported Google HTTP 503 / UNAVAILABLE and session-not-found errors; sanitized upstream diagnostics and opt-in persistent-login fix were deployed. DO NOT claim Gemini end-to-end is reliably working without an authorized owner test.
- No new paid subscriptions, no direct Gmail/Google AI Pro account-token hacks, no API-key leakage.

## 3. Significant files and where to start
Website (flosy-site checkout):
- index.html: shared app shell, login, ledger row/details, script order.
- flosy-assistant-bridge.js: stable web/app state bridge.
- flosy-v4-capture.js: voice/receipt transaction parsing, validation, posting, dedup, review.
- flosy-repair.js: OCR, voice/receipt UI and native receipt callbacks.
- flosy-receipt-ml.js: trained synthetic text-line score and structured field extraction.
- flosy-voice-nlu.js: transcript intent/amount/verb logic.
- flosy-next.js and flosy-automate-relay.js: SMS and encrypted relay intake.
- flosy-ai.js and supabase/functions/flosy-gemini-parse/index.ts: AI coach and Supabase proxy.
- flosy-sync-v3.js and flosy-v5-private-backup.js: revision sync/backup.
- tests/v4.test.cjs, tests/phase1.test.cjs, tests/offline-cache.test.cjs and tests/browser-smoke.cjs.
- service-worker.js: cache and offline assets; bump version when changing JavaScript.

Android (flosy-android checkout):
- android/app/src/main/java/com/flosy/finance/MainActivity.java: WebView, permission flow, local speech, receipt photo and secure origin-scoped bridge.
- android/app/src/main/java/com/flosy/finance/AutoRelayReceiver.java and AutoRelayStore.java: authorized Automate ingestion and encryption/secret filters.
- android/app/src/main/AndroidManifest.xml, android/app/build.gradle: Android permissions and version/flavors.
- .github/workflows/build-flosy-apk.yml: JDK17, Gradle8.11.1, SDK35, debug APK build, inspection and release.

## 4. Set up a Windows Antigravity Project with both source branches
Use a NEW directory for Flosy, not another battery/BMS repository. The parent below is a suggestion if it exists; adapt it for the owner's PC:

PowerShell:
    cd "D:\EPE\PostGrad\AI projects"
    git clone --branch flosy-site https://github.com/Ahmedsayed20233/mynewproject.git Flosy-Web
    cd .\Flosy-Web
    git fetch origin
    git switch -c antigravity/site-v35
    git worktree add -b antigravity/android-v35 ..\Flosy-Android origin/flosy-android
    git status
    git -C ..\Flosy-Android status

In Antigravity 2.0: New Project > Add Folder > add Flosy-Web AND Flosy-Android > Create. Read THIS file in the web folder. Use Local Mode for first read-only audit; use a new worktree/feature branch for risky changes. Do not let the agent modify unrelated PC folders. Antigravity desktop login via the app's supported personal-account method does not require placing the Flosy Gemini API key into the IDE.

Never push directly to deployed flosy-site or release-producing flosy-android. Raise separate PRs against the matching base; obtain owner approval for merge/deploy or production database access.

## 5. Run the SAME checks as current GitHub Actions
Website:
    node --check flosy-receipt-ml.js
    node --check flosy-voice-nlu.js
    node --check flosy-v4-capture.js
    node --test tests/phase1.test.cjs tests/v4.test.cjs tests/offline-cache.test.cjs

Browser integration:
    npm install --no-save playwright@1.58.0
    npx playwright install chromium
    node tests/browser-smoke.cjs
Read .github/workflows/flosy-browser-smoke.yml for runner environment; do not claim all real photos/phones are covered by synthetic browser tests.

Android (from Flosy-Android root):
    gradle -p android --no-daemon --stacktrace assembleStandardDebug assembleSmsDebug
Read .github/workflows/build-flosy-apk.yml for exact dependencies and safety checks. Do not download external signing keystores or require Play Protect bypass. Current v3.4 APK is DEBUG-SIGNED test build; changing signatures can prevent updating an already installed package and uninstalling may wipe WebView local data. Backup and verify cloud sync first.

## 6. First three engineering deliverables expected from Antigravity
1. BASELINE.md or a brief PR comment mapping the two branches, Git history, entry points, major financial/security risks and **actual** test outputs (including any failed tests). No code rewrites.
2. One small tested P0 PR to improve receipt extraction robustness and its manual-review/auto-book confidence (avoid false 1,199 vs 44668 or total vs VAT). Include synthetic regression tests and real-device test checklist.
3. A second tested P0 PR improving Egyptian voice numeric expressions and direction/negation/internal transfer classification, and user-friendly transcript editing/undo. Keep speech services and NLU clearly distinguished.

After those, plan multi-device backup/restore testing and SMS/Automate cross-source duplicate safety. Ask owner before storing consented anonymized real-world training examples or changing financial cloud schema.

## 7. Things not yet done and common mistakes
- Do NOT treat these synthetic classifiers as strong production-trained image/audio models. Their input is OCR/transcription text, and field-level accuracy must be measured on real, diverse data.
- Do NOT assume any receipt always has a payment method, a merchant name, or a printable invoice number.
- Do NOT auto-book a partial payment, refund, internal transfer, invoice ID, OTP or a promised future expense.
- Do NOT write to the production Supabase database in an attempt to solve a test failure.
- Do NOT roll Android native code into a public website branch by copying it, nor overwrite Flosy-Web with stale Android branch index.html.
- Do NOT alter Play Protect, sign-in credentials, quota billing or user balances without explicit owner consent.

## 8. Handoff output format
When finished with each task, report: implemented files; intent and user-visible change; test commands and PASS/FAIL; screenshots with synthetic content; artifacts and GitHub PR links; outstanding risk; exact next task. Keep Flosy usable without Gemini; prefer offline, private, verifiable behavior over flashy AI claims.
