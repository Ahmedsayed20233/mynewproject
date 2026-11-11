# Flosy Android — agent instructions (Antigravity)

This folder is the **flosy-android** branch of https://github.com/Ahmedsayed20233/mynewproject. It is NOT the canonical website source, even though it includes a historical index.html and README.md.

First open the sibling **Flosy-Web** checkout from **flosy-site** branch. Read:
- Flosy-Web/AGENTS.md
- Flosy-Web/TASK.md
- Flosy-Web/docs/ANTIGRAVITY_HANDOFF.md

The current Android branch builds v3.4.0 and its WebView loads the LIVE hosted Flosy site at https://ahmedsayed20233.github.io/mynewproject/; the ReceiptML and VoiceNLU JavaScript files are served by the web branch. **Do not copy the old Android-branch index.html onto the current website** or attempt to develop its obsolete embedded UI.

## Android work area
- android/app/src/main/java/com/flosy/finance/MainActivity.java: trusted WebView, voice microphone and ar-EG system STT, receipt camera/image, native Latin ML Kit OCR, JS native bridge.
- AutoRelayReceiver.java and AutoRelayStore.java in same package: paired sender-allowlisted Automate SMS relay, encrypted AES-GCM queue and OTP/PIN/CVV filtering.
- android/app/src/main/AndroidManifest.xml: permissions and exported receivers.
- android/app/build.gradle: Android versionName 3.4.0, versionCode 34, flavors standard and sms (sms = Safe Automate testing application ID variant; not a READ_SMS requesting app).
- .github/workflows/build-flosy-apk.yml: version guard, permission safety checks, both debug variants and release artifact publishing.

## Safety and workflow
- Use a separate feature branch with a PR **based on flosy-android**. Never push directly to the release branch.
- Do not add READ_SMS, RECEIVE_SMS, SEND_SMS, unrestricted accessibility/notification listener, or Play Protect bypass methods. The user configures Automate separately.
- Do not hardcode Gemini/Supabase secret keys, actual phone messages, pairing token, account identifiers, real photos, personal financial data, or keystores.
- Do not uninstall an existing APK to fix a debug signing conflict until the owner has VERIFIED backups and understood potential data loss.
- Run: gradle -p android --no-daemon --stacktrace assembleStandardDebug assembleSmsDebug
- Require JDK 17, Android SDK 35 and Gradle 8.11.1 (CI installs them). Validate both APK permissions and app IDs after build.
- Actual phone OCR and speech recognition, app lifecycle, offline service worker, permissions, queue and backup recovery remain **unverified**. Real-device testing is a P0 priority.
- Never claim the two synthetic models are image/audio foundation models. Android speech service does transcription, web ReceiptML/VoiceNLU understand OCR/transcript text.
- Do not merge stale open draft PRs (#20/#22/#25) without auditing which patches were already integrated via subsequent native release merges.

## First Android task
Read both branches; build a reproducible Android v3.4.0 debug APK; verify native WebView bridge and permission boundaries; produce an owner-facing audit and a shortlist of reproducible on-device receipt/speech problems. Improve only one small native issue with tests and PR after audit.
