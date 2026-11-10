# Flosy v10 — Four corrective patches (10 November 2026)

## Patch 1 — Balance blur resolved
**Root cause:** the old privacy module used a `visibilitychange` event to persist `flosy_v4_hide_balances=1` every time the app switched away. Returning from camera, speech service, Android permissions or app switcher then left all monetary numbers blurred.

**Now:** only explicit user action changes this setting. The daily home has a visible **إخفاء الأرقام / إظهار الأرقام** toggle; the Privacy Center retains biometric unlock where available. When masking is off, amounts have no filter/opacity. Existing intentionally hidden state remains hidden until the owner explicitly reveals it: we must not disclose a hidden user's finances without their consent.

## Patch 2 — Owner-approved SMS and InstaPay import
- **Standard APK / website:** manually paste SMS or share a transaction message through Android Sharesheet. No SMS permission on Standard or in browser.
- **SMS Beta APK only:** optional `READ_SMS` permission declared in `android/app/src/sms/AndroidManifest.xml`; dual consent: checkbox inside Flosy and Android permission/confirmation dialogue. Only the latest 45 days and a bounded set of likely financial messages are scanned on button tap.
- **InstaPay notifications (SMS Beta):** a separate Android notification-access permission, disclosed and granted only in the system Settings, is needed. `InstaPayNotificationReader` ignores incoming notifications and retrieves **currently active** alerts from `com.egyptianbanks.instapay` only when the owner taps Scan. It never buffers, persists or sends raw notifications.
- OTP, security codes, failed/pending operations and card/account number sequences are blocked or redacted. All money movements become previews; the owner selects the account, amount, date, category and confirms. Fingerprints reduce duplicates, but a real bank statement reconciliation is still important.
- If notification access is not granted, or InstaPay hides its active notification content, use **copy/paste, Android Share, or bank SMS**. Flosy does not have an official InstaPay transaction API.
- Android special notification access can technically grant broader system privileges; Flosy software filters to InstaPay, never automatically stores notifications. Revoke via Settings at any time.

**Distribution:** Google Play restricts `READ_SMS` even for money-management apps, and requires disclosure/review/permission declaration. SMS Beta must not be represented as approved for Play Store. Standard stays permission-light. Do not instruct users to bypass Play Protect.

## Patch 3 — A single professional capture page
- Two primary cards: microphone (Egyptian Arabic) and camera/receipt.
- One OCR text editor, optional manual amount/merchant fallback, copy/export.
- One **approve transaction** section; no automatic transaction saves.
- Redundant SMS/CSV cards removed from capture and linked to the dedicated Import Center.
- Stronger mobile RTL layout, bigger touch areas, status feedback and white-only scheme.
- On Android, bundled SpeechRecognizer and ML Kit require phone-level permission and model/device tests. Browser Arabic OCR relies on Tesseract language assets when available.

## Patch 4 — General for every new user
- Financial defaults for **salary, rent, bills, living expenses, emergency target and investment goals** all start at **0**, not a developer's original 17,000/2,500/60,000 example.
- New advanced plan has zero monetary targets and allocations; no imagined 20,000 opening Visa balance or arbitrary 8,000 monthly surplus.
- Recurring flexible-budget start value is 0, and any real user must configure their own money, banks and goals.
- **Crucial:** all previously saved user figures, accounts, transactions, and investment settings are preserved. A past unsafe heuristic that automatically changed a user-specified investment target was removed.
- Flosy remains **Egypt-first (EGP)** as required by its current accounting engine; monetary entries themselves are not pre-personalized. Currency conversion or multi-currency ledgers would need separate design and auditing rather than misleading label changes.

## Validation gates
- Node finance, security, parse, offline cache and regression tests.
- Real Chromium smoke: new user zeros, privacy hide/reveal, single capture layout, SMS/notification bridge cannot scan without owner checkbox, selected InstaPay preview never posts automatically.
- Android Gradle builds for both Standard and SMS Beta; flavor-specific protected permission verification.
- Physical Android test: microphone, gallery, camera, SMS scan and notification grant/revocation, online/offline, reinstall/restore. CI success cannot prove actual device permission behavior.
