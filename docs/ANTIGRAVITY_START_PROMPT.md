# Prompt to paste into Google Antigravity (Flosy continuation)

You are continuing the EXISTING Flosy personal-finance product, not starting a new app.

The Antigravity Project should have two folders checked out from the same GitHub repository:
1. Flosy-Web = branch flosy-site (current production public website).
2. Flosy-Android = branch flosy-android (current Android APK v3.4.0).
The GitHub default main branch is NOT the current application.

FIRST read Flosy-Web/AGENTS.md, Flosy-Web/TASK.md and Flosy-Web/docs/ANTIGRAVITY_HANDOFF.md, plus Flosy-Android/AGENTS.md and Flosy-Android/TASK_ANDROID.md. Then inspect the actual code, commits and current CI state to verify every claim. Do not rewrite the app or copy the Android branch's obsolete HTML into the website.

Our current baseline: Arabic RTL and offline-first Flosy; Supabase free sync/backup and login; Automate encrypted allowlisted SMS queue; optional auto-save for clear SMS/voice/receipt transactions; ReceiptML with trained **synthetic** OCR-text line scoring plus Tesseract Arabic+English / ML Kit Latin; VoiceNLU with trained **synthetic** Egyptian-Arabic transcript intent and number words; Gemini API Free only for sanitized personal-coach topics, NOT raw bank SMS/audio/receipts. Current v3.4 APK is debug-signed and not Play-approved. No real phone field-validation has been established.

Please act in stages:
A. Perform read-only architecture/security/test audit across BOTH branches. Run Node test suites, browser smoke, and Android build. Give me actual PASS/FAIL evidence and a concise prioritized findings report.
B. Improve receipt reading as P0: correct Arabic and English merchant/item/quantity/unit price/tax/discount/grand total/payment and date even on crumpled receipts; build a diverse privacy-safe benchmark; treat uncertainty with review instead of wrong auto-booking.
C. Improve voice as P0: Egyptian colloquial numbers, date, category, account, income vs expense vs own-account transfer, negation and future-tense safety; test on actual Android STT output with informed permission and no raw private recordings.
D. Validate Automate SMS/OTP filtering, encrypted relay, duplicate prevention, and cross-channel ledger consistency.
E. Diagnose Gemini 503 only with sanitized response statuses and existing Free Tier. NEVER enable billing or export confidential data.

Financial safety rules: no real-user data deletion, no live DB schema changes, no provider key exposure, no Play Protect bypass, no restricted SMS permissions, no paid APIs, no guessing a transaction's amount/account. Site and Android have different PR base branches. Before writing production code, present a clear plan; then implement the smallest verified P0 fix in a new branch with tests, and open a PR for my review. Never claim an image/audio model was trained on real receipts/voice; synthetic training is not universal accuracy.

Report: exact files changed, tests with outputs, synthetic screenshots, PR links, remaining limitations, next 3 tasks. Ask before any release, production deployment, third-party data transfer, or irreversible operation. Continue working from the current repo, not scratch.
