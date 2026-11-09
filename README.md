# فلوسي — Personal Finance Dashboard
Arabic RTL, responsive personal-finance dashboard, built around a planned EGP 17,000 income and EGP 9,000 monthly budget. No personal transaction records are bundled.
## Features
Income/expense/transfers, customizable budgets, savings goals, emergency fund, reports, charts, monthly filtering, dark/light mode, mobile layout, JSON backup/import, CSV export, and optional Supabase account sync.
## Hosting
Configure GitHub Pages to publish from the `flosy-site` branch, root folder. The website is public, but financial records stay in your own browser until cloud sync is configured.
## Cloud database
Create your own free Supabase project, run `schema.sql` in the SQL editor, then enter your project URL and **publishable/anon** key under Settings. Sign up, confirm email when required, and sign in. Row-level security restricts each user's data to their own account. NEVER use service_role key on the web.
## Limitations
Until configured, data is browser-local and can be lost when browser data is cleared. Export a backup. Cloud sync is a basic single-record sync; concurrent changes may conflict, and deletion propagation across devices is limited. No live bank connection, no live investment market quotes, and no automatic Google Sheets sync. Financial-health number is illustrative, not a credit score.
