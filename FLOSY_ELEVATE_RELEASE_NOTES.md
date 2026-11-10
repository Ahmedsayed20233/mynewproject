# Flosy Elevate — reference-inspired product upgrade
**Date:** 10 November 2026 · **Release:** website enhancement (no APK rebuild required)

## Design benchmark and what was kept original
The product owner supplied two ZIP archives containing 24 **screenshots**, not app code or assets. The screenshots were inspected privately. They showed two broad, independently useful patterns:

1. **A light wallet/wealth/assistant experience:** combined balance and spending context, next-best-action nudges, account panels, net-worth performance, simple spending cards, and clear privacy/settings groups.
2. **A dark transaction/budget app:** Day/Week/Month/Year activity tabs, clear income/expense/transfer separation, grouped chronological transactions, explicit transaction composition, and category budget suggestions.

**Flosy retains its own original white-only Egyptian design, typography, colors, logo, text and UX code.** We did not import any third-party screenshot, asset, source code, brand name or unlicensed design element into the public repository.

## Gap assessment and implemented improvements

| Benchmark observation | Flosy previously | Flosy Elevate implementation |
| --- | --- | --- |
| Intelligent next steps / 'needs an answer' | Financial warnings in Flosy Next | Dedicated, navigable next-best-actions based on missing inputs, due obligations, cloud setup and concentrated spending |
| Month-over-month spending context | Dashboard charts and raw totals | Concise, immediately scannable monthly change, actual income and top spending category at the top |
| Suggested category budgets | Broad core budget and flex budget | User-approved category-level recommendations based on up to three fully completed months and at least two verified appearances; never silently set a budget |
| Clear transaction browsing by timeframe | One all-time filterable table | Interactive Day/Week/Month/Year date navigator, account/type/search filters, grouped activity and separate totals. Original full table and CSV export remain available in an expandable disclosure |
| Net-worth timeline with period switching | Current wealth valuation; no reliable historical snapshots | Opt-in, dated current valuation snapshots; 1M/3M/1Y/all chart only after two real snapshots. No made-up price or asset history |
| Strong white-only mobile UI | Flosy Pearl base theme | Original responsive cards, focus states, accessible 44px controls and new clear actions |
| Fully valued wealth totals | Existing wealth widgets did not receive exported finance metrics | Expose existing `FLOSY_PRO.metrics` and `rowsForAccounts` to dependent modules |
| Robust list of transactions | Legacy view assumed `createdAt` on all transactions | Sort tolerates imported entries missing timestamps without crashing entire Flosy dashboard |

## Trust and financial correctness
- Expense categories are inferred **only from recorded expense transactions**. Internal transfers are not additional spending.
- Suggestions are **not** active until manually accepted. The category ceilings are monitoring limits, **not** a second deduction from Safe to Spend or the top-level budget.
- Insufficient historical data intentionally yields no suggestion, not a fabricated estimate.
- Net worth uses Flosy's existing cash, manually priced investment assets, other holdings and liabilities. Historical wealth is displayed **only from explicit real user-recorded snapshots**.
- No new key, API endpoint, background job, paid integration, financial action or auto-posting is introduced.
- All input values are escaped in generated HTML. Account data stays with existing on-device storage and revision-safe cloud pathways.
- Previously supported screens, OCR, voice, OpenAI-optional assistant, CSV import and family settings remain available.

## Release checks
- Run `node --test tests/phase1.test.cjs tests/v4.test.cjs tests/offline-cache.test.cjs`.
- Run the real Chromium UI suite `node tests/browser-smoke.cjs` (Playwright, served on local HTTP).
- Confirm unit and browser CI gates are green before merging to `flosy-site`; confirm GitHub Pages deployment.
- Before claiming a consumer release, conduct Android physical-device tests on RTL and narrow screens, cloud conflict/recovery on two phones, import a real Egyptian bank statement using redacted synthetic data and test on-device microphone and camera.

## Explicit non-features
No unverified merchant offers are shown, because there are no verified commercial partnerships. There is no direct live integration to Egyptian banks, Thndr, gold market data or ChatGPT paid account. None is implied by the new design.
