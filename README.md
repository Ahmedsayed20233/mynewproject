# فلوسي | Flosy Personal Finance

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
