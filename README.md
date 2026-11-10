# فلوسي | Flosy Personal Finance

## Flosy Studio v9 — personalized home and one-tap actions

This release compares two user-supplied finance-app screenshot packages (24 screens) to identify usability gaps, **without copying their brands, assets or source code**. See [Arabic reference analysis](docs/Flosy_Reference_Upgrade_AR.md).

- **One-tap mobile quick-add bottom sheet:** choose expense, income, a *recorded* transfer between owned accounts, monthly budget, Egyptian voice capture or receipt OCR. Expense/income/transfer reopen the **same existing Flosy ledger form**; no second accounting system.
- **Improved transaction form:** explicit optional time and note, correct local date, and confirmation when an apparently duplicate transaction is entered (genuinely repeated purchases remain possible).
- **Customizable home widgets:** account balances from the actual `FLOSY_PRO.rowsForAccounts` engine; hypothetical spending-opportunity cards; 30-day money in/out (transfers excluded); onboarding actions. Widget visibility and order survive cloud backup in `state.studio`.
- **Professional settings shortcuts:** accounts, categorization rules, import, privacy.
- **Original white-only RTL design:** contrast-safe responsive cards and accessible keyboard/mobile launcher, without changing the rest of the Pearl app.
- **No imaginary provider offers, net-worth history or bank connectivity.** 10% savings opportunities are transparent examples, not claims of guaranteed savings.
- Browser E2E and financial regression tests should pass before merging. Actual Android camera/microphone and two-device synchronization still require device-level QA.


## Flosy Pearl — 10 November 2026 (current website release)

**Live website:** https://ahmedsayed20233.github.io/mynewproject/

**Theme:** white-only, Arabic RTL, Egypt-first **Flosy Pearl**. New daily command panel surfaces *additional* safe-to-spend cash, urgent obligations and the actual Supabase revision status; it does **not** claim access to your bank account.

| Priority | Feature | Implemented in code | Operational limits |
| --- | --- | --- | --- |
| P0 | Reliable Cloud Sync | Supabase v3 compare-and-swap revisions, backup snapshots, conflicts + local pending records, all-or-nothing app shell precache and user-initiated encrypted AES-256-GCM off-device backup | No guarantee against loss of an off-device backup or forgotten passphrase; Android offline/restore still needs physical-device tests |
| P0 | Safe to Spend | Daily safe *discretionary* amount after scheduled bills, debt installments, spending budget, reserve and buffer | Only as correct as recorded balances and liabilities; planned salary is never treated as received cash |
| P0 | Smart Transaction Import | Manual SMS preview, separate SMS Beta APK, bank CSV column mapping for Egyptian statements, optional bank reference and legacy fingerprint compatibility, row-level approval | No official bank connection; CSV formats and SMS wording vary; user confirmation and reconciliation mandatory |
| P1 | Voice Expense | Egyptian Arabic browser/native speech and manual text fallback, review before posting | Depends on Android/recognizer and user-approved input |
| P1 | Bills / Installments | Recurring bills, one-time dues, debt repayment caps, in-app reminder and opt-in ICS calendar export for 90 days | The app does not schedule guaranteed notifications when closed; calendar app controls alarms |
| P1 | Wealth | Manual Thndr holdings, gold, currency, certificates, gam3eya, real estate, liabilities | No live official bank/Thndr/FX/gold feed; prices may become stale |
| P1 | Crisis Simulator | Income disruption, inflation, medical outlay and emergency-fund reconstruction math | Illustrative scenario, not an outcome prediction |
| P1 | Cash Flow Forecast | 7/14/30/60/90 day cash-flow outlook and lowest-point scenario | Assumes user-supplied pay/expense pattern; not a bank statement |
| P2 | Family Budgets | Separate RLS-backed household entries, owner/member/viewer and expiring invitation codes | Requires a second account for end-to-end human QA; not shared full personal ledgers |
| P2 | Receipt OCR | On-device OCR with Arabic and English language packs; labeled totals and receipt dates, user review | First use needs OCR download; inaccurate receipts require manual correction |
| P2 | AI Coach 2.0 | Authenticated Supabase function, opt-in aggregate summary, server-only OpenAI key, response cost/usage quota | **Not active until project owner configures a paid OpenAI API key in Edge Function secrets.** Cannot borrow ChatGPT Plus |
| P2 | Privacy Center | Balance concealment, Android biometric control, device log, session control, deletion RPC and encrypted backup | UI masking isn't encryption-at-rest; Supabase leaked-password protection and independent security audit remain pending |

### Encrypted backup — explicit recovery

1. Open **مركز الخصوصية → نسخة احتياطية مشفرة** in Chrome or a compatible browser; use a 10+ character passphrase.
2. Download `.flosyenc` and keep it **outside the phone** (e.g. a secure separate device); Flosy does not know, store or recover the password.
3. To restore, sign in to the **same Flosy account**, choose the encrypted file, enter the password, type `RESTORE` and explicitly confirm the cloud revision-safe replacement.
4. Verify **actual balances, transaction counts and payments** on a second device before uninstalling an APK. The cloud snapshot is in the same Supabase project, not independent off-site disaster recovery.

### Release checks and constraints

- Node GitHub Actions financial / parser / cryptographic backup / offline-cache tests must be green on the release commit.
- Production Supabase tables and the original private financial ledger have not been changed by this website code release.
- Full Android device QA, store signing, policy-approved SMS distribution, receipt recognizer device behavior and a two-user family-budget trial are separate acceptance gates.
- Never disable Play Protect to sideload the SMS Beta, never upload OTP, full account identifiers or API secrets to the public GitHub repo.

---


A mobile-friendly Arabic (RTL) personal finance dashboard for managing income, expenses, monthly budgets, an emergency fund and investment contributions.

## Status — November 9, 2026

- The source code is committed in branch `flosy-site`.
- An automatic GitHub Pages deploy workflow is present in `.github/workflows/publish-flosy.yml`.
- The first deployment attempt **failed at Configure Pages because GitHub Pages is not yet enabled on this repository**. This is a repository setting, not a build failure.
- Supabase setup SQL is included as `schema.sql` but **a Supabase cloud project/database has not yet been provisioned**.

## Enable hosting (one-time, account owner)

1. Visit https://github.com/Ahmedsayed20233/mynewproject/settings/pages
2. Under **Build and deployment → Source** select **GitHub Actions** and save.
3. Re-run the **Publish Flosy Website** job in [Actions](https://github.com/Ahmedsayed20233/mynewproject/actions/workflows/publish-flosy.yml) (or ask ChatGPT to rerun after you enable Pages).
4. Confirm successful deployment using the URL shown by GitHub Pages; expected default URL is `https://ahmedsayed20233.github.io/mynewproject/` (unverified / inactive until deploy succeeds).

**Safety:** GitHub Pages hosts the HTML publicly, but transaction data must **not** be committed into the public repository.

## Configure a free database (Supabase)

1. Create a Supabase Free project at https://supabase.com/dashboard (account ownership and approval required).
2. Go to its SQL Editor and run [schema.sql](schema.sql).
3. Supabase Project Settings / Connect: copy the `https://<project-ref>.supabase.co` project URL and its **publishable / anon** key.
4. Open Flosy → **الإعدادات** → fill in project URL & publishable key → save.
5. Sign up using your own email/password, confirm email if requested, then sign in. Use the built-in **مزامنة الآن** action.
6. Each account's row is restricted by PostgreSQL RLS policies (`auth.uid() = user_id`).

Never enter a `service_role` or `secret` key in client-side web settings, or commit credentials to GitHub.

## Financial defaults

Planned net income EGP 17,000, rent EGP 2,500, bills EGP 500, living expenses EGP 6,000, emergency fund target EGP 54,000. New users start with no actual transactions. Edit settings freely.

## Local mode and limitations

- Until Supabase is configured, data persists only inside the same browser's localStorage.
- Data may be lost if browser storage is cleared; export JSON backups using Settings.
- CSV export and JSON backup/restore supported.
- Cloud sync currently merges transactions by ID, so deleting a transaction on one device may not delete an older cloud copy. Avoid editing on multiple devices concurrently until conflicts and deletion sync are improved.
- Supabase session currently needs fresh sign-in after token expiry. No bank import, live market quote feed, or existing Google Sheets integration in this edition.
- Financial indicators are educational and are not investment advice, a credit score, or guaranteed forecasts.

## Files
- `index.html`: frontend
- `manifest.webmanifest`, `icon.svg`: app presentation
- `schema.sql`: PostgreSQL table + RLS
- `.github/workflows/publish-flosy.yml`: automated GitHub Pages deployment

<!-- GitHub Pages redeploy trigger, 2026-11-09 -->


## Flosy 1.2 — All My Money + Thndr (manual tracking)

The newest site provides four additional tabs: **All My Money (wealth)**, **Thndr Portfolio**, **24-Month Plan**, and **Crisis Protection**, in addition to existing transactions, budgets, goals, PDF reports, and Supabase sync.

### What is tracked
- Cash / wallet / bank / emergency reserve / irregular reserve / Thndr uninvested cash.
- Income, expenses, and transfers with **from and to account**. Internal transfers affect balances without counting as consumption.
- Manual Thndr executed buy/sell and opening holdings for CI30, T70, savings funds, gold grams, and custom symbols. Fees, weighted-average cost basis, quantity, realized and unrealized gains, and editable market prices.
- Other manually valued assets, debts, and an estimated net worth = all cash account balances + Thndr holdings at **entered** prices + other assets – debts.
- An editable 24-month plan with introductory emergency-fund funding, later investing, portfolio target weights, and progress from recorded transfers.
- Financial crisis scenarios: expense inflation +15%, portfolio -25%, cash coverage months, budget overruns and stale-price warnings.
- Printable reports include a **current-value** snapshot of accounts and holdings in addition to the selected-period cash-flow report.
- Account **Reconcile** adjusts the opening baseline to match your actual bank statement without creating an artificial expense.

### IMPORTANT: migration from earlier Flosy versions
1. Open Settings and export a **JSON backup** of your existing Flosy data before making changes.
2. Sign in to your existing Flosy account and manually sync to Supabase.
3. Go to **All My Money → Accounts** and enter or reconcile the *current* balance for each real cash account. Old transactions without linked accounts are intentionally **not** applied retroactively, to prevent double counting when you enter current balances.
4. Record all **new** income / expense / transfer transactions using their actual source and destination accounts. A transfer to Thndr is an internal move, NOT a spending category.
5. In **Thndr Portfolio**, add existing holdings as **Opening holdings** (this does not deduct cash); future executed orders as Buy/Sell, including actual fees. Update prices yourself from the broker.
6. Keep a separate backup. The cross-device sync merges rows by ID and deletion tombstones, but concurrent offline changes to a single record/settings can still conflict; compare your data after syncing and avoid editing the same item simultaneously on two devices.

### Not automatic brokerage access
**This application does not connect to Thndr, banks, electronic wallets, market price feeds, or execute trades.** No live balances or order book information is available. All linked amounts are user-entered and not investment advice.

### Data security
The same Supabase \`flosy_data\` JSONB table and ownership-based Row-Level Security apply to the new fields: data never belongs in the public GitHub repo. Only the publishable Supabase key is shipped; never expose a service_role/secret key. The app keeps a local browser copy; uninstalling the Android app or clearing WebView data can destroy that local copy. Sync and export backups before uninstalling.


### Expense categories update (2026-11-10)
The New Transaction form now supports **الهدايا** as a standalone expense category, and separate optional expense subcategory selectors for: **طعام ومشروبات** → فطار، غداء، عشاء، مطعم، كافية الجامعة، أخرى; **ترفيه** → القهوة، كافية الجامعة، أخرى. A subcategory is required when either parent is selected. Existing records remain readable, and grouped expense budgets remain based on the parent category. The itemized expense report, printed PDF and CSV export include the subcategory. This is a live website update; the Android WebView app uses the same published site and does not need to be reinstalled. Restart the app if its cached page is stale.


## Flosy 2.0 Beta — November 10, 2026

**Live:** https://ahmedsayed20233.github.io/mynewproject/
**Android:** GitHub Releases → \`flosy-android-v2.0.0\` debug APK.

### What is implemented
- New personal-finance command center with a separate premium light layout (optional dark mode), cash-flow trends, budget utilization, net worth and recommendations derived from your entered records.
- Manual recurring bills and due-date calendar. Bills are **never charged automatically**.
- Flexible expenses budget, optional indicative month-to-month rollover, and deterministic budget alerts.
- User-defined text-based categorization rules for imported transaction descriptions.
- Privacy-first transaction import: a selected text message from Android's Share menu or manual paste; a limited bank CSV template; user must review date, amount, type, account, category and description **before** any saving.
- Transaction fingerprints for message import; duplicate checks for existing imported transactions and within one CSV batch.
- New append-only \`flosy_backups\` table in Supabase, protected by user-owned RLS. Synchronization takes snapshots of the old and new data, and the new Recovery page lists and restores snapshots after explicit confirmation. Previous cloud record was also snapshotted once before redesign.
- Existing accounts, Thndr holdings entered manually, 24-month planning, expense subcategories, and printable reports remain available.
- Android v2.0.0 can receive explicitly shared text via ACTION_SEND without requesting READ_SMS or access to the full SMS inbox.

### What is NOT implemented
- Automatic access to all phone SMS / inbox scanning; READ_SMS is sensitive, subject to policy exception review, and is **not** requested.
- Automatic bank, wallet, credit-card or Thndr synchronization, direct trading, live market prices.
- A third-party LLM or autonomous AI that reads your financial data; the insights are deterministic local calculations.
- Household collaboration with multi-user access, subscription paywalls/payment gateways, receipt OCR, iOS native app, background push notifications, real-time data aggregation, or regulated financial advice.
- Production-grade disaster recovery, independent security certification, or tested multi-device conflict resolution.

### Safeguards, limitations and upgrade steps
1. Before uninstalling any prior APK, sign in and confirm successful cloud sync, then export JSON to a **separate location**; reinstallation clears Android WebView local data.
2. A snapshot in the same Supabase project protects against application mistakes but is NOT an independent offsite disaster recovery copy. Free-plan platform backups differ from paid plans.
3. The opt-in SMS parser only handles selected message shapes and can misunderstand amounts/direction. **Always review** every proposed transaction; do not paste OTPs, PINs, full card numbers or passwords.
4. Only import CSV in template \`date,description,amount,type\`, up to 500 rows / 500KB per batch. The app rejects unsupported formats.
5. Debug APK is not Play Store signed; its certificate may change on rebuild. Back up before uninstalling old versions.
6. Supabase security advisor still indicates **Leaked Password Protection Disabled**; enable it if the project plan/features allow in Auth security settings, and complete a security review before public launch.

### Recommended next stages
P0: real-device and two-device synchronization tests, backups/restore and failure simulations.
P1: bank-specific CSV templates, more robust consent-driven statement import, reconciliation and categorization.
P2: detailed rollover per category, cash-flow forecasts, automatic recurring detection.
P3: optional opt-in AI insights, secure family permissions, payment support, authorized bank/broker APIs, after legal/security due diligence.


## Flosy Android 2.1.0: opt-in SMS and ChatGPT-powered assistant

This release offers **two APK variants**:
- **Standard** (\`com.flosy.finance\`): no READ_SMS permission. User can explicitly share a single banking message to Flosy through Android's Share menu. Recommended for ordinary testing.
- **SMS Beta** (\`com.flosy.finance.sms\`): a *separate install* that requests READ_SMS permission **only after a user taps the Scan button and confirms a prominent disclosure**. The scan is limited to the most recent 45 days, a maximum of 350 inspected messages and 35 possible financial matches. OTP-like messages are filtered, long identifier numbers are redacted, and results remain only in the app view until the user explicitly selects and approves a transaction. No background receiver, no automatic uploading of raw SMS, no Android SMS write/send capabilities. Permission can be revoked in Android Settings.

**IMPORTANT:** Apps installed by sideloading that request READ_SMS may be blocked by Google Play Protect. Do not disable or bypass device protections. To distribute through Google Play, obtain policy approval for the allowed SMS-based money-management use case and provide the necessary disclosure, privacy policy, and permission declaration. Source: https://support.google.com/googleplay/android-developer/answer/10208820

### Flosy AI setup
A Supabase Edge Function named \`flosy-ai\` is deployed at \`https://vzuitcaarklesgehznha.supabase.co/functions/v1/flosy-ai\`.
Its source is maintained in \`supabase/functions/flosy-ai/index.ts\`.

1. Create an OpenAI API project and API key at https://platform.openai.com/api-keys. This is **separate** from ChatGPT Plus or Pro and incurs API costs.
2. Visit the Supabase project's **Edge Functions → Secrets** and add:
   - Name: \`OPENAI_API_KEY\`
   - Value: your OpenAI API project key (paste **only** in the Supabase Secrets dashboard, never in GitHub or chat).
   - Optional: \`OPENAI_MODEL\` = \`gpt-6-luna\` (cost-conscious; default).
3. Log in to Flosy, choose **Flosy AI**, and send a short question. Include the financial aggregate only if you consent by checking the box.
4. The backend verifies the user's Supabase login even though the function is configured with \`verify_jwt=false\`; then it enforces an approx. 15 requests/day/user limit using the private \`flosy_ai_usage\` database table. The upstream OpenAI request uses \`store:false\`.

No OpenAI secret appears in the GitHub Pages code or APK. The chatbot is **not** your ChatGPT conversation account and has no access to ChatGPT history, bank accounts, full SMS inbox, or Thndr. It receives a short, user-approved prompt and optionally a high-level summary from already-synced Supabase data; it never receives raw SMS or account credentials. Until an owner configures \`OPENAI_API_KEY\`, it deliberately returns a visible configuration error instead of a simulated AI response.

**Test and privacy notes:** Automatic SMS scanning is restricted and not assured to work on all Android devices. SMS filtering is heuristic; a message can be falsely categorized or omitted. Never auto-create transactions from scan results. Avoid entering verification codes or full financial credentials. Before replacing the old APK, sync successfully and export JSON; standard and SMS APKs have **separate on-device storage**, though they can sign in to the same Supabase cloud account.


## Flosy Phase 1 implementation — 10 Nov 2026

Status: **beta web release** deployed to GitHub Pages. Android APK uses the live web page, but **no new native APK package** is necessary for this set of web/database changes. Full on-device test not completed.

### Database integrity and recovery
- Supabase flosy_state_v3: independent, RLS-owner-scoped account record, revision counter, JSONB full financial payload.
- flosy_cas_save_v3(expected_revision,payload): atomic compare-and-swap. Rejects a stale writer. Every successful commit adds a history snapshot to the append-only flosy_backups table in the same Postgres transaction.
- Existing flosy_data remains unchanged, and its starting contents were copied without replacing to v3. A pre_phase1_20261110 backup was recorded first.
- The app keeps a local last-successful checkpoint and indicates sync status; network errors leave unsynced records on-device.
- Fresh-device login adopts the existing cloud ledger, while unsynced local and remote records union-merge by ID. Switching accounts preserves a separate local backup.
- The Recovery Center and signed-in JSON import use revision CAS instead of the old blind REST upsert.
- Flosy AI now reads the v3 ledger for optional user-consented aggregate summaries.

### Safe to Spend and 90-day forecast
- Dashboard and the الآمن للصرف والتوقعات page show cash balances, excluding emergency, reserve and Thndr investment accounts.
- Safe discretionary cash = eligible cash minus unpaid scheduled commitments, remaining fixed-budget requirement, remaining living budget and a user-defined safety buffer.
- Scheduled commitments come from existing recurring bills, debt installments and newly entered one-time expenses.
- A salary-date setting changes the daily Safe to Spend calculation. Forecast salary is an optional *assumption*, not a confirmed income.
- Debts cap the forecast installments at the unpaid principal. Marking bills paid does not transfer money or record an expense.
- 90-day forecast: checkpoints at day 7/14/30/60/90; evenly distributed budget estimates, not guaranteed bank balances.

### Verified tests
- tests/phase1.test.cjs: 12 Node tests including first-device login, concurrent sync merge, offline failure safety, debt caps and budget constraints.
- Database rollback tests: old revision rejected; correct revision atomically saved with backup; unrelated user cannot read or update the ledger.
- Original live account data remained unchanged after the rollback tests.

### Remaining limitations
- GitHub Pages requires internet to start; background offline page loading on a freshly restarted APK is not yet verified.
- Android native device QA, destructive restore drills and multi-phone authentication tests still need manual acceptance testing.
- Supabase history is not independent offsite disaster recovery; export a JSON copy before uninstalling the APK.
- The existing Supabase Auth security advisor still warns that leaked-password protection is disabled.
- SMS permission beta and AI API activation remain separate development tracks; do not confuse them with this financial-data phase.

**Live website**: https://ahmedsayed20233.github.io/mynewproject/


## Flosy 4 White Edition — Egyptian-market competitive release (2026-11-10)

**Live web:** https://ahmedsayed20233.github.io/mynewproject/
**Android:** GitHub release flosy-android-v2.2.0, Standard and SMS Beta versions.
**Design:** White-mode-only, ivory canvas, ocean teal buttons, muted navy text, gentle peach accent. Responsive desktop/mobile grid and revised bottom taskbar.

| Priority | Capability actually implemented | Important limitations |
|---|---|---|
| P0 | Revision-safe Supabase sync, local pending records, snapshots, recovery, JSON export, service-worker offline shell | Offline operation depends on the app having been opened and cached; sync and restore need real-phone testing |
| P0 | Safe to Spend daily with salary date, cash segregation and earmarked Visa balance | Depends on accurate user-recorded balances and obligations |
| P0 | Egyptian financial SMS review, optional Android SMS Beta, bank CSV column mapping, duplicate checks | Parsers are heuristic; manual confirmation required; no official bank integration |
| P1 | Egyptian Arabic voice expense parsing, native Android speech capture and browser Web Speech | Availability and transcription accuracy depend on phone/service/language |
| P1 | Recurring bills, installment schedule, one-off commitments, due-date tracker, voluntary foreground notifications | No guaranteed system notifications when the app is closed; no autopay |
| P1 | Egyptian assets: gold, currencies, certificates, gam'eya, property, debt and manually entered Thndr holdings | No live Thndr/bank/FX/gold feeds; valuations manually entered |
| P1 | Job-loss/inflation/medical expense crisis simulator | Illustrative scenario, not a prediction |
| P1 | 7/14/30/60/90-day cash-flow outlook | Forecast uses salary and expense assumptions, not actual future debits |
| P2 | RLS-protected family budgets with owner/member/viewer roles, expiring one-time codes | Only shared **household entries**, not personal full ledger access; users must test with second account |
| P2 | On-device receipt OCR using lazy-loaded Tesseract.js and Arabic/English language packs | Requires network for OCR library; local OCR only; confirm totals and merchant |
| P2 | OpenAI-backed Flosy financial coach, server-only API key, opt-in aggregate summary, atomic usage quota | Requires the project's own paid OPENAI_API_KEY; cannot work by borrowing ChatGPT Plus account |
| P2 | Privacy center: mask balances, per-device list, session logout, JSON export, authenticated data deletion; Android optional biometric unlock on API 28+ | Masking/biometric reveal are **visual-only controls**, not at-rest encryption |

### Native installation safety
- **Standard** Android APK does **not** request READ_SMS. Sharing selected finance messages works without that permission.
- **SMS Beta** is a separate Android application ID; READ_SMS is requested after explicit permission and consent. Google Play policy exception approval is needed before normal store distribution. Do not disable Play Protect to sideload it.
- Before uninstalling an old APK or switching between flavors, sign in, confirm the cloud indicator says synchronized, and save an off-device JSON export. Android uninstalls typically clear WebView local storage.
- Debug-signed APKs are test builds, not production Play Store packages. An installed beta may require uninstalling if a future debug signing key changes.

### Technical QA evidence
- Automated GitHub Actions: Node test suites for v3 cloud synchronization/conflicts, financial math, SMS/csv parsing, OCR extraction proposal, wealth scenarios, white-only design, and due-date reminders.
- Supabase transactional RLS test: simulated owner can create and invite to a household; unrelated user cannot read the household or member list. The test transaction was rolled back.
- Android GitHub Action builds both Standard/SMS flavors for v2.2.0 successfully. Actual biometric hardware, SMS access, file chooser, voice transcription and OCR need QA on a physical Android phone.
- Data retention warning: a cloud snapshot in the **same** Supabase project is not an independent off-site disaster recovery backup.
- Remaining security advisor findings include disabled leaked-password protection in Supabase Auth and warnings around intentionally restricted SECURITY DEFINER routines; review all privileged RPCs before public rollout.
- The AI provider key is never embedded in public GitHub Pages or the APK. Do not put it in GitHub, screenshots, or chat messages.
