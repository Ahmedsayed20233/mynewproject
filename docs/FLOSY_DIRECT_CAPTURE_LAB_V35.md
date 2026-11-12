# Flosy Direct Capture Lab v3.5.0 — without Automate

This is an isolated, debug-signed Android test variant, not Play-approved. Package ID: com.flosy.finance.direct.

- On-device NotificationListenerService: receives financial app notifications only after owner explicitly grants access in Android settings; exact app package allowlist is empty by default.
- SMS_RECEIVED receiver: receives only new SMS from explicit bank sender allowlist when Android grants hard-restricted RECEIVE_SMS. No READ_SMS/INBOX or SEND_SMS.
- Native settings provide opt-in, sender/package lists, permission status, disable and clear encrypted candidate queue.
- Reuses current AutoRelayStore AES-GCM and secret exclusion, cross-source dedup and existing website transaction validation. Does not auto-post ambiguous, failed or secret-containing events.
- The hosted Flosy web interface must expose the Direct Capture settings button to use native integration.

TEST on a physical device: permission grant/denial, received multipart SMS, financial/OTP/pending/reversed notifications, duplicate same purchase in SMS and app, two bank accounts, app reboot, Android battery limits, queue restore and user revocation.

Google Play may grant SMS-based money-management exceptions only after Play Console declaration and approval. Android installers may refuse RECEIVE_SMS even for a user-authorized MVP. Do not bypass Play Protect. This is not official InstaPay/bank API access.
Official source: https://support.google.com/googleplay/android-developer/answer/10208820
