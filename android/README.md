# Flosy Android v2.0.0 — فلوسي

Enhanced Android WebView app for the existing published **Flosy** dashboard:
https://ahmedsayed20233.github.io/mynewproject/

- Android 7.0+ (API 24+).
- Java 17, Android Gradle Plugin 8.9.2, Gradle 8.11.1, compile/target SDK 35.
- Does not bundle passwords, service-role keys, or financial user data.
- Supports Android system printing / Save to PDF from detailed Reports.\n- The mobile website now has a 5-control bottom toolbar, prominent Add action and an expanded More panel for budget, goals and settings/sync.\n- Android adds a loading bar, smart Back handling, and clear double-back exit.
- Uses the published website and Supabase project already configured there. Needs internet.
- Same Supabase account as browser. On-device WebView storage is separate from Chrome. Signing in and syncing restores cloud records.
- HTTPS-only remote content; disables mixed content and direct file/content access. Outside links open Android browser.
- Build for personal testing: `gradle -p android assembleDebug` (from repository root).
- APK from CI: Actions → **Build Flosy Android APK** → latest successful run → artifact `Flosy-Android-APK`.
- Debug APK is developer-signed for **testing**. It is **not** a production release signed for distribution via Google Play.
- The built-in site's local JavaScript backup uses blob URLs; this WebView wrapper may not support downloading those backups. For backup exports, open the web site in Chrome.
- Be aware a GitHub Actions debug keystore is generally ephemeral across build runs; installing a later APK may require uninstalling the previous one (back up/sync data first). Production updates need a securely preserved release signing key.

To build in Android Studio, open the `android` folder and run the app.

### v2.0.0 — Complete financial tracking

- The live Flosy app now tracks manually entered cash accounts, investment holdings, other assets, debts, net worth, a 24-month plan, and crisis indicators.
- Enter account opening balances; transactions recorded before account tracking are not assigned retroactively to avoid double counting.
- Record Thndr executed transactions and update current prices yourself. No authenticated Thndr/bank API connection exists; the Android app does not trade or transfer real money.
- Data remain in local WebView storage until cloud synchronization completes. Back up existing data in Settings and verify the Supabase sync before reinstalling.

### v2.0.0 — 20,000 EGP Visa plan
- New first-year plan targets 60,000 EGP emergency and 39,000 EGP contributions to Thndr.
- On **All My Money** use the guided Visa reconciliation button (only when the 20,000 is your OWN available money, not a credit line). A separate confirmation button records a 15,000 EGP real transfer to the emergency account after you actually move it.
- The initial transfer is excluded from the monthly savings plan so it is not double-counted.
- Budget assumes EGP 17,000 monthly salary, 9,000 costs, 8,000 monthly plan; month 1-6: 7,000 emergency + 1,000 irregular; month 7: 3,000 emergency + 4,000 Thndr + 1,000 irregular; months 8-24: 7,000 Thndr + 1,000 irregular.
- The APK uses the live published Flosy site and the same Supabase data, with no direct bank / Thndr access.

### v2.0.0 — Flosy rebuild
- Rebuilt financial command center with new insights, recurring bills, flexible budgeting, rule-driven transaction classification, manual CSV import, explicit SMS text sharing (no READ_SMS permission), and authenticated encrypted-in-transit cloud version snapshots.
- Uses the existing web backend and Supabase RLS. Share one selected banking SMS using Android's Share menu; review suggested amount, type, category and account before saving.
- Cloud restore requires sign-in and a backup available in Supabase. Local data are deleted if the APK app is uninstalled or its data are cleared; export JSON before upgrading.
- No automatic account/broker sync, SMS inbox scraping, family multi-user support, paid subscription system, or remote AI model is currently shipped.
