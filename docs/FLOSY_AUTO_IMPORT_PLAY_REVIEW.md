# Flosy Play-approved Automatic SMS & Notification Import — Submission/QA Checklist

**Status:** candidate for Google Play SMS permission review — **NOT Play-approved**, **NOT distributed for sideloading**.
**Build variant:** `auto` under `android/app/src/auto`; isolated from Standard/Safe Import.
**Current target:** `com.flosy.finance.auto` (temporary candidate package; choose final package before Play registration and signing).

## Required Play approval
Google Play policies recognize **SMS-based money management**, including budgeting apps, as a potential exception that can request `READ_SMS`/`RECEIVE_SMS`, subject to case-by-case review and completed Permissions Declaration Form:
https://support.google.com/googleplay/android-developer/answer/10208820

Google Play Protect automatically blocks Internet-sideloaded APKs requesting high-risk `READ_SMS`, `RECEIVE_SMS`, notification listener or Accessibility permissions in protected markets. User consent, a self-signed APK, or changing installer app **does not override this**:
https://developers.google.com/android/play-protect/warning-dev-guidance

**Do not bypass Play Protect, do not distribute the auto flavor as APK before approval, do not change package identity to circumvent a security decision.**

## App flow after approval
1. Install reviewed, properly signed Auto variant from Google Play.
2. Open Flosy > Import Transactions > Automatic Import.
3. Select exact alphanumeric sender IDs seen on your bank SMS, e.g. fill **your actual sender IDs**; the examples in UI are not verified IDs.
4. Optional: choose financial app package IDs; verified InstaPay Egypt Android package is `com.egyptianbanks.instapay`.
5. Explicit in-app consent about broad OS permissions and on-device filtering. `READ_SMS`/`RECEIVE_SMS` are then requested using Android runtime permissions.
6. For notifications, user opens Android's Notification Access Settings via app disclosure and grants Flosy access separately; may revoke independently.
7. New incoming matching bank SMS enter local encrypted queue via `SMS_RECEIVED_ACTION`. InstaPay notifications enter via `NotificationListenerService` after user access.
8. Optional explicit scan of bank SMS from **past 30 days**, max 400 inspected / 60 queued, only exact sender allowlist.
9. Flosy shows queued candidates **without creating ledger entries**. Each needs amount, account, date and classification review and explicit Save.
10. On confirmed Save, selected queue item is removed. Stop erases pending queue and in-app monitoring; OS permission revocation remains a separate user control.

## Privacy/Security
- `android.app.NotificationListenerService` has technically broad notification access. The code reads message content **only after package-name allowlist match**; no general notification history is stored.
- Default app source list is empty except verified InstaPay package. No financial SMS sender is trusted by default; the owner must choose exact sender IDs.
- OTP, PIN, CVV, failed/pending transfers and non-financial items are not saved.
- Redact 12–19 digit IDs, Egyptian phone numbers and emails before queuing.
- Pending candidates encrypted with Android Keystore AES-256-GCM; no plaintext fallback; cap 60 and 30-day retention.
- Financial messages and notifications are **never** uploaded to Supabase, OpenAI or ads services; only the user-confirmed structured finance record flows into Flosy's normal ledger/backup.
- No bypass of Android's installation protections. No accessibility/screen scraping, root or ADB installation path.
- App's backup of local encrypted pending data is disabled. Losing the Android Keystore makes old encrypted candidates unrecoverable; this is intentional.

## Play Console preparation (human steps)
- Enroll app/package in the developer's Play Console account, complete identity/payment verification, privacy policy, Data Safety declaration and Financial Features declaration.
- Configure Play App Signing and private upload signing via a secure CI secret or Play Console; **never commit keystore or passwords to GitHub**.
- Submit signed `.aab` plus completed **SMS/Call Log permissions declaration** explaining why automatic financial budgeting imports are core functionality. Supply demo, account access/test instructions, and a video showing consent, selective import, no OTP, revocation and offline-only candidate storage.
- Follow any regional policy requirements. Approval is at Google's discretion. A review decision may require modifications.
- Test with Google Play internal/closed testing after Play accepts the upload, and with the same permissions/device/locale for real Android QA.

## Required QA not yet certified by CI
- Xiaomi/Redmi, Samsung and Pixel on Android 12–16; screen-lock, OS background restrictions, multi-SIM and sender IDs.
- SMS at app closed/background, multipart messages, duplicate messages, amount & currency grammar, incorrect/unknown sender, OTP, canceled and pending transfers.
- InstaPay notifications with notification access off/on, app-level privacy mode, current notification format changes.
- Queue encryption, key invalidation, 30-day expiry, repeated same-amount transfers, cloud sync not receiving raw text.
- Explicit Play Protect assessment for **Google Play-distributed approved** release and revocation behavior.
- Verify that Standard and Safe Import APKs remain free of SMS and notification listener permissions via compiled APK manifest test.

**Release gating:** Passing GitHub Actions validates compilation/manifest scope only. This does not imply Google Play approval, successful installation on the owner's phone, or full device QA.
