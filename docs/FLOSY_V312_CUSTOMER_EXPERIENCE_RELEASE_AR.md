# Flosy v3.12.0 — Customer Experience Simplification

**14 November 2026** · Owner-only MVP / Founder Test

## Goal

The previous UX had too many routes for everyday spending. This release reduces the steps for common tasks, while preserving the existing single owner-scoped ledger, receipt/voice safeguards, reports, and optional expert workspaces.

## Implemented

1. **Simplified Home dashboard** (`flosy-customer-v312.js`): current real account balance (when accounts exist); an explicitly labeled **daily** Safe to Spend value (or "not calculated" when profile is incomplete); registered monthly income, expense and net cash flow; last three non-deleted entries; nearest real upcoming reminder when present; and direct shortcuts to reports, chat, voice and receipt OCR. No fabricated examples or fake financial performance.
2. **Five-tab navigation**: Home, Transactions, Add, Flosy AI, More. The central Add tab opens a touch-friendly Quick Add dialog, rather than forcing a long form. All major screens keep the same nav.
3. **One-step Quick Add**: amount-first expense/income/transfer; common Egypt spending chips (coffee, breakfast, transportation, supermarket); suggested category from description; last preferred account and today prefilled; optional date/category in collapsible details; validates account IDs and distinct transfer endpoints; one real `FLOSY_UNIFIED.postBatch` write and 16-second existing Undo control. If no account, offers a button to create one. Errors appear inline.
4. **Voice and receipt**: clearer in-place correction instructions for wrongly transcribed voice and receipt amounts; duplicate OCR text editor moved into expandable section; owner confirmation remains required when uncertain. Selected photo can be displayed while receipt-review overlay is open, without keeping photos on servers or saving model guesses as transactions.
5. **Flosy AI coach** (`flosy-ai-coach-v312.js`): deterministic **data-grounded** Egyptian Arabic explanations for "why spending increased", same elapsed days this month vs last month, top five posted expenses with dates, hypothetical 10% discretionary-spending savings, daily Safe to Spend explanations, contextual follow-up prompts. All computed from posted transactions; pending, reversed, deleted, transfer entries excluded from spending; no invented values. Not a generative LLM or newly trained ASR model.
6. **Reports**: current-month preview and PDF/Excel/CSV buttons first, date/account/category/type controls in expandable advanced section. Original v3.11 multi-sheet real XLSX, RTL native PDF and Arabic CSV exporters preserved; no fake download success.
7. **UI design**: coherent RTL mobile hierarchy, accessible action sizes 44px+, high-contrast safe-to-spend card, light/dark theme coverage, modal focus management and Escape dismissal, reduced-motion option.
8. **Advanced manual workflow** preserved for power users. Time and extra note grouped as optional. No new duplicate data storage.

## Safety and boundaries

- Income, expense and transfer have distinct types. Internal transfers do not count toward expenses or income.
- For voice and receipts, direct posting is restricted to existing explicit safeguards; this version simplifies review rather than claiming newly trained camera or speech recognition.
- Existing SMS/notification import remains disabled, as previously requested.
- Financial suggestions are scenarios, not guaranteed investment results.
- This release does not add a new LLM provider, OCR image fine-tuning, or production authentication changes.

## Validation

- `tests/v312-customer.test.cjs`: deterministic financial intelligence and non-fabrication tests.
- `tests/v312-browser.cjs`: Chromium 390px mobile acceptance test checks real expense save and Undo, navigation, live reports and real UTF-8 CSV + OpenXML XLSX, browser print-to-PDF, AI, receipts route and dark mode.
- Existing v3.10 receipt/v3.11 reports and financial safety suites continue to run.
- Android `versionCode 55`, `versionName 3.12.0`, founder-test package `com.flosy.finance.unified.v3120`; no automatic local-data migration from previous package identifiers.
- Android uses the updated GitHub Pages UI; publishing website changes first is mandatory.
- No real-device video, performance metrics or native SAF acceptance has been established. These remain a founder QA requirement.

## Walkthrough

1. Open **Home** to see the safe daily amount and the current balance.
2. Tap the middle **Add** navigation item; choose expense/income/transfer, type amount and optional description, and tap **Save**.
3. Verify the transaction appears and the 16-second **Undo** action works.
4. Open **Voice** or **Receipts** if desired and review uncertain amounts.
5. Open **Reports**; download the current month's PDF, XLSX or CSV, or expand **Customize**.
6. Ask Flosy AI e.g., **«ليه مصاريفي زادت الشهر ده؟»**.

## Sources

- Repository https://github.com/Ahmedsayed20233/mynewproject
- Web app https://ahmedsayed20233.github.io/mynewproject/flosy.html
- Previous v3.11 report notes: `docs/FLOSY_V311_PRO_REPORTS_RELEASE_AR.md`
