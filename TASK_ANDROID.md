# Android P0 test and release checklist for Antigravity

- [ ] Open both Flosy-Web (flosy-site) and Flosy-Android (flosy-android) in the same Antigravity Project.
- [ ] Read Flosy-Web/docs/ANTIGRAVITY_HANDOFF.md and Flosy-Web/TASK.md.
- [ ] Confirm MainActivity HOME URL matches public hosted app and loads latest cache assets.
- [ ] Verify JDK17/Android SDK35/Gradle8.11.1 toolchain and build both flavors.
- [ ] Extract and report actual declared Android permissions for both APKs, including RECORD_AUDIO; confirm no restricted SMS/notification-listener permissions.
- [ ] On disposable test device, verify app first launch, WebView local persistence, Supabase auth refresh, navigation, camera/gallery receipt capture, Arabic/English OCR/Tesseract weights, high/low-confidence review.
- [ ] Verify Egyptian Arabic speech recognition availability and fallback; distinguish OS/cloud transcription from local VoiceNLU classifier and log only sanitized diagnostics.
- [ ] Verify only the paired/allowlisted Automate messages are ingested, encrypted, and deduplicated; OTP/PIN/CVV and failed transactions never auto-book; no closed-app ledger guarantee.
- [ ] Verify data backup & restore using synthetic accounts on a second device. Never uninstall an occupied app without owner-approved verified backup.
- [ ] Run full website and Android CI, collect synthetic screenshots, document limitations and owner sign-off.
- [ ] Do NOT publish new APK release or modify project billing without explicit owner approval.
