# Flosy Customer-First implementation status — 13 Nov 2026

Base: `flosy-site` / `flosy-android`. All values in tests are synthetic. No deployment or claim of a public launch.

## Implemented in this website branch (pending CI and mobile QA)
- F-01: one stable five-destination primary dock: Home, Transactions, Add, Plan, More; all 20 existing advanced screens remain reachable. Existing actions use the canonical ledger.
- F-03: faster expense creation; optional description; previously used account after confirmed save; Arabic-Indic, Persian and Western decimal amount parsing; full category picker collapsed by default; auto-category remains. Up to three recent expense/income entries are shown as click-to-prefill shortcuts **without posting**.
- F-02/F-06: progressive three-step setup if account, profile or first transaction is missing. Safe to Spend is withheld rather than displaying unverified forecasts as spendable cash; link to financial profile for explanation.
- F-09 staged: `flosy-import-staged.js` can parse test examples into inert candidates with explicit account and date requirements; secrets, failed transfers and incomplete events are rejected. `ingest()` always returns disabled. NO SMS/notification subscriptions, data persistence, auto-post, bridge invocation, or native permissions.
- UI in services displays **غير مفعل** for SMS / app-notification import. This is deliberate and irreversible from settings in this build.
- Automated tests cover blocked/preview outcomes, no auto-save and several money-entry edge cases.

## Not yet complete / not verified
Full F-02 onboarding validation, F-04 ledger reconciliation across all sources, F-05 authenticated sync/offline restore, F-07 real-device voice, F-08 real-device OCR, F-10 AI completeness, F-11 delivery of reminders, F-12 complete finance profiles, F-13 PDF and XLSX native tests, F-14 recurring obligations, F-15 performance and physical-device E2E, and F-16/17/18 advanced features, themes and accessibility remain acceptance-gated. Existing implementation is not equivalent to passing acceptance.

## Acceptance and release gates
1. Review canonical ledger transfers, duplicate handling, and user-separated storage before any import activation.
2. Run `node --test tests/*.test.cjs`, browser smoke and Android instrumentation/device verification.
3. For future message import, require separate user consent, bank allowlists, restricted-permission policy review, encrypted minimal queue, cross-source dedupe, user-visible review and rollback.
4. Verify real device camera, voice STT, PDF/XLSX open/save, crash recovery, backups, and offline->online sync on disposable accounts.
5. Keep branch unmerged until approval; do not publish APK or request SMS/notification access as part of this change.
