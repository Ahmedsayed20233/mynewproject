# Flosy v3.9.3 — Unified Finance & Intelligent UX

## One canonical ledger and no duplicate product routes
The public `flosy.html` remains the **only user-facing app**; `index.html?flosy_core=1` is the canonical finance engine via a same-origin iframe. Every form writes through `FLOSY_BRIDGE.mutate`, while actual family expenses use `FLOSY_UNIFIED.postBatch`. There are no separate Ultra / Pro accounts and no fake designer balances.

- 3: accounts **and net worth**; integrated wealth + manually valued assets.
- 4: transaction history, editable details, deletion.
- 5: fast capture and custom icon/color expense and income categories.
- 8: one themed Flosy AI, voice, graphs, "Roast Me".
- 10: loans/installments and friends' shared bill tracker.
- 11: category budgets from the real transaction ledger and predictable earnings.
- 13: zakat estimate, based on account cash and *marked eligible* assets.
- 14: actionable financial insight hub and exception detection.
- 15: Android PDF/Excel save via native Storage Access Framework (SAF), with output confirmation.
- 17: financial profile + monthly plan (salary, recurring income, commitments, essentials, discretionary spending, liquidity buffer, emergency fund, risk, horizon).
- 19: household members with expenses posted into the **same ledger**.
- 16: searchable services with a single canonical entry per function. Duplicated `plan`, `recurring`, `v4-wealth` and `smart` links are removed as separate main destinations. Legacy specialist tools still exist when not redundant.

### Workflow examples
1. Record "اشتريت عربية" with a vehicle icon (or add custom category).
2. Actual expense updates account balance, report, monthly budget, wealth and insights; clicking the row opens its data and Edit/Delete operations.
3. Record a monthly car payment as a liability monthly installment. Its *planned amount* affects the monthly forecast but does not create a second actual expense until a real payment is entered.
4. Assign an actual family expense to a named member. This is still one transaction, not a separate family wallet with mirrored charges.
5. Zakat checks the same cash balance and only assets the user marks eligible.

## Calculation framework and citations

### Emergency fund and monthly spending plan
**Sources**:
- FINRA: [Prepare for financial hardship](https://syndication.finra.org/content/how-prepare-and-survive-financial-hardship) — a practical target is **3–6 months of living expenses**, adjusted for circumstances.
- CFPB: [An essential guide to building an emergency fund](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) — automatically set aside savings when able; avoid overdrafts and monitor progress.

`Monthly recurring income = configured salary + configured recurring additional income`.

`Projected essentials = scheduled monthly commitments + essential variable living costs`.

`Free margin = recurring income – projected essentials`.

`New savings/investment envelope = max(0, Free margin – safety buffer – selected discretionary budget)`.

`Emergency target = projected essentials × chosen emergency months (3–12; default 3)`.

`Emergency gap = max(0, emergency target – declared available emergency cash)`.

**Rule-based prioritization**: If salary or essential costs are missing, **no investment amount is computed**. If an expensive outstanding debt is declared, or the emergency gap remains open, new investment proposal is **zero** until the basic liquidity goal is met. Beyond those checks, the remainder is shown as an **upper conditional candidate**, not an instruction or a guaranteed return. It is not a regulated product recommendation and does not move money automatically. The current Safe-to-Spend calculation uses only the user's chosen **discretionary budget**; it does not treat emergency savings or investment funds as freely spendable.

Scheduled bills are **forecast entries**, not actual expenses. They are **never added a second time** to already-paid transactions when computing actual monthly expense. Linked liability installment amounts are counted **once** by canonical ID.

### Investment channels and risk
**Sources**:
- US SEC / Investor.gov: [Asset allocation and diversification](https://www.investor.gov/introduction-investing/getting-started/asset-allocation) — asset mix depends on investment horizon and risk tolerance.
- Central Bank of Egypt: [EGP treasury bills](https://www.cbe.org.eg/ar/auctions/egp-t-bills), [Treasury-bill FAQ](https://www.cbe.org.eg/ar/contact-us/website-faqs). Individuals typically purchase treasury bills through participating banks and must verify current rates, terms, tax, liquidity and fees.

Eligible, clearly differentiated **types** that Flosy may help evaluate: cash equivalents, accessible bank saving accounts, treasury bills, diversified local income funds and (for suitable longer horizons) equity funds or diversified exchange-traded securities. The current software **does not fetch live regulated quotations**, so it never presents static October/November government bond rates as current prices, does not promise returns and does not submit investment orders. The user sees official information links and must assess product-specific risk, currency exposure, minimum purchase and provider.

### Zakat
**Source**: [Egyptian Dar al-Ifta cash zakat, fatwa no. 7506](https://www.dar-alifta.org/ar/Fatwa/Details/18349/): the reference described in that fatwa is equivalent to **85 grams of 21-carat gold**, after a full **lunar year**, at **2.5%**, subject to eligibility, basic needs and appropriate debt considerations.

`Zakat cash = current cash balances from same canonical ledger`.

`Zakat base = max(0, cash + explicitly-zakat-eligible manually registered assets – user-entered deductible debt)`.

`Nisab = 85 × 21K gold gram price in EGP entered with date by the user`.

`Provisional amount = 2.5% × Zakat base`; **estimated due** is shown only after user confirms a complete lunar year and the calculated base reaches nisab. Otherwise the screen clearly says what is missing. The app does not invent a market gold price or decide religious eligibility of all asset classes on behalf of the user. Investment shares and gold jewelry require individual review; this is a **calculation aid**, not a fatwa.

### Intelligent features and boundaries
- Automatic insights: top spending categories, a real month-over-month comparison, cashflow shortages, high recorded installment pressure (a review threshold, not a law), repeated transactions with matching amount/date/description.
- Custom categories: label, type (expense/income/obligation), curated icon, hex color and group, saved in `settings.customCategoriesV393`.
- Family expenses: single canonical transaction with `familyMemberId`.
- Friends bill split: **receivable tracking only**, not a payment until an actual refund is posted.
- Flosy AI: Egyptian Arabic voice plus explainable local analysis, daily named suggestions and optional light-hearted Roast Me. This **is not a newly trained on-device foundation LLM**. The prior acoustic speech recognition engine is the device service; the added dialect finance lexicon is rule enrichment over the existing synthetic-text classifier, not retraining on customer recordings.
- Notifications: opt-in local bill reminders and daily 9AM app-opening prompts. These do not synchronize in real time while the app is fully closed; Android may delay scheduling. No SMS or notification-reader permissions.

## Reports
- Android: PDF byte payload transferred to native `FlosyPdfExporter` (A4 Arabic RTL using Android `StaticLayout`, dynamic page breaks) and Excel OpenXML bytes to `FlosyReportBridge`, both saved through a real Android `ACTION_CREATE_DOCUMENT` picker. No public Downloads path assumed and no PDF third-party API.
- Excel: five formatted sheets, RTL columns, frozen filter headers, EGP number format and colored tab/headers. Reports use the exact same ledger and user-selected date range.
- Browser: professionally formatted A4 HTML print view and local XLSX download.
- The Android implementation and GitHub build do **not** prove pixel-perfect quality on all real devices: user needs to verify Arabic shaping, multi-page financial reports, TTS/STT permissions, camera, and actual saved file opening with a PDF/Excel reader.

## Data portability and risk
The test APK uses a **new package ID** to avoid debug-signature conflicts between builds, so **older APK local storage does not migrate automatically**. Preserve the previous install, export/backup, restore/sync, and check reconciled balances before deleting anything. No bank-message permissions are added. Security-sensitive checks (account, amount, duplicate posting, report file integrity) are retained.
