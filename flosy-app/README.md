# فلوسي | Flosy Finance Dashboard

A responsive, Arabic (RTL) personal finance dashboard built with **Google Apps Script** + **Google Sheets**. No paid database or hosting required when deployed as an Apps Script web app.

## Features
- Private, account-scoped Google Sheets storage (existing spreadsheet, no new subscription)
- Monthly expense and income tracking, internal transfers and withdrawals
- Six-month cash-flow chart and grouped spending chart
- Monthly budget monitoring and overspend indicators
- Emergency fund, reserve, savings goals, investment contributions
- Market valuation snapshots, recurring bills, rules-based insights
- Exportable CSV transactions and JSON backups
- RTL desktop/mobile responsive UI

## Spreadsheet
Connected by default to the user's pre-existing Google Spreadsheet. The `Code.gs` file contains `CONFIG.spreadsheetId` — change this when deploying in another account. The app reads the existing `المعاملات` and `الإعدادات` tabs and automatically adds tables `الأهداف`, `الفواتير المتكررة`, `تقييمات الاستثمار` on first use.

## First deployment (Google Apps Script)
1. Open the Spreadsheet, then **Extensions → Apps Script**.
2. Replace the contents of `Code.gs` with this repository's `Code.gs`.
3. Add a file **+ → HTML → Index**, and paste the contents of `Index.html`.
4. **Deploy → New deployment → Web app**.
5. Set **Execute as: Me** and **Who has access: Only myself** (where available); authorize requested Spreadsheet permissions.
6. Open the deployment URL ending in `/exec`; use the app on your phone and optionally pin to Home Screen.
7. To publish later changes, **Deploy → Manage deployments → Edit → New version → Deploy**.

**Important:** A Google Apps Script web app must be deployed from the owner's Google account; this repository alone does not make the app publicly live. Never deploy the script as accessible to Anyone while executing as the owner, because that could allow other visitors to read and alter your financial data.

## Browser preview
Open `Index.html` directly. It detects the absence of `google.script.run` and uses `localStorage` only for testing. The UI clearly labels local demo mode; preview entries **will not sync** to Google Sheets. Do not use the preview to store irreplaceable records.

## Financial data design
- `دخل` and `مصروف` are external cash flows.
- `طوارئ`, `استثمار`, and `احتياطي` are internal allocations, **not expenses**.
- `سحب ...` reverses an allocation; avoid double counting when recording actual spending.
- Saved investment contributions are **not** market value; enter market valuations separately.
- Financial insight messages are simple rule-based tips, **not** AI advice or a formal financial-health score.

## Security and limitations
- Do not enter card numbers, credentials, or sensitive IDs in descriptions.
- Apps Script account permission and deployment privacy are essential.
- No bank/SMS integration, brokerage price feeds, or automatic transactions.
- No push notifications; bill reminders appear only inside the app.
- Export backups periodically; backend modifies the spreadsheet on first launch to add IDs/tables.
- Expenses begin at zero until they are entered; the initial 17,000 EGP income and 9,000 EGP expense amount are **planned values**, not fabricated actual transactions.

## Local verification
- Run `node --check` on the script extracted from `Index.html`.
- All client-side finances are calculated locally from data returned by the Apps Script backend; backend validates inputs and uses a script lock for writes.

License: for the owner's personal use.