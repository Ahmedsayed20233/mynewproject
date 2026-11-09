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
