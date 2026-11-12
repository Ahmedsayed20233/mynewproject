# Flosy Founder MVP v3.6.2 — without message import

This APK is a dedicated experimental build for the Flosy founder. It is **not** a public launch, and it has no externally validated traction.

## What works (subject to device-level testing)
- Manual expense, income and account-to-account transfer entry
- Account balances, Safe to Spend and budgets
- Receipt capture / OCR parsing, and Egyptian-Arabic voice entry using Android's installed speech service
- Local financial insights, chart-based assistant, daily/monthly/other report periods
- PDF printing and native Excel (.xlsx) export
- Existing Flosy cloud sync settings and encrypted backups

The website is loaded from GitHub Pages and needs internet for first-time/recent updates. The AI assistant is not yet a fully trained on-device LLM.

## What is intentionally unavailable
- Reading or importing SMS messages
- Reading financial or InstaPay notifications
- Background import, notification service, SmsReceiver and Automate broadcast relay
- External text message share-to-Flosy intent
- The `page-import` section is hidden only inside the MVP APK's WebView

## Android packaging and install checks
- APK id: `com.flosy.finance.mvp` (independent installation, no conflict with `com.flosy.finance.direct` or `com.flosy.finance.notify`)
- `minSdk 24`, `targetSdk 35`, test version `3.6.2`
- The merged APK manifest is checked with `aapt dump xmltree`, and is rejected if it contains `AutoRelayReceiver`, `DirectSmsReceiver`, `DirectNotificationListener`, `SMS_RECEIVED`, or an `ACTION_SEND` receiver.
- `aapt dump permissions` is checked and rejected if it contains SMS, call-log or notification-listener permissions.
- Debug signing is checked with `apksigner verify`; ZIP integrity is checked with `unzip -t`.
- A Play Protect block may still occur for reasons unrelated to SMS; a successful GitHub build is not an on-device installation guarantee.

## Installing for a fresh MVP test
1. Back up any existing Flosy data and confirm cloud sync if already in use.
2. Download the APK from the GitHub Release `flosy-mvp-v3.6.2`.
3. Install normally if Android allows it. Do not disable or bypass Play Protect.
4. Find **فلوسي MVP** on your phone; it has separate local app data and will not automatically inherit previous installs' transactions.
5. Start with a sample cash account, add one expense manually, record a voice expense, scan a receipt, and test PDF/Excel from Reports.
6. If blocked even without SMS permissions, record the exact Android/Play Protect message and device model, and use the website/PWA until we can diagnose the actual reason.

## Development tracking
`flosy-android` contains the Android source. `flosy-site` contains the hosted Flosy website. This variant does **not** modify the shared website, and cannot affect other Flosy APKs.
