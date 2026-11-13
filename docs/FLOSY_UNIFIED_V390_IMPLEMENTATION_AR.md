# Flosy v3.9.0 — Unified Flosy 20-screen application

## Design source, fidelity and scope
Primary source: user-provided **flosy_pro (2).html**, imported into `flosy.html` without redesigning its original 20 screen skeleton, Cairo/Readex typography, sizes (366×790 designer reference), four named theme token families and screen flow.

Theme 1 — `clean-light` / النهاري المريح: `#F8FAFC` / `#059669`.
Theme 2 — `emerald-dark` / الزمردي الفاخر: `#0B1324` / `#10B981`.
Theme 3 — `calm-light` / التركواز الهادئ: `#F4F7F9` / `#0D9488`.
Theme 4 — `serene-dark` / الليلي الهادئ: `#0B111E` / `#14B8A6`.

The original HTML was a clickable 20-screen mock with fictitious financial figures, fake biometric responses, sample account balances and simulated WhatsApp/price offers. `flosy-unified-pages.js` replaces mock financial body content on all 20 screens with live views backed by one canonical account ledger and does not post example transactions. `flosy-unified.css` adapts this to fullscreen Android without a fake notch, 9:41, battery or floating color selector.

## Unified feature flows
1. Welcome; 2. Home: real balances, income/expenses, Safe-to-Spend; 3. wallets; 4. recorded transactions/search/icons; 5. manual expense/income/transfer; 6. receipt camera/recognition; 7. Egyptian voice and multi-clause commands; 8. one AI voice/chat/affordability; 9. obligations/associations; 10. debts and bill splitting; 11. budgets and category plans; 12. saving goals tied to a named account; 13. 2.5% zakat estimator; 14. graphical analytics; 15. PDF/Excel reporting; 16. unified feature/settings hub, theme controls, default account; 17. user-supplied yield-scenario calculator; 18. cash calendar; 19. family budgeting; 20. invoice-item price history.

The hub opens the canonical existing finance modules: Thndr portfolio, 24-month plan, crises, privacy, secure backup, bank CSV import, recurring bills and settings. The old module remains internally loaded from `index.html?flosy_core=1`, but uses the same ledger, applies the selected four-theme tokens via `styleCore()`, and returns via a neutral **«رجوع»** rather than **«عودة إلى Ultra»**. The public root `index.html` redirects to `flosy.html` so there is one normal app entry, not ordinary/Ultra/Pro switches.

## Auto-post finance rules
- Manual, voice and receipt posting all call `FLOSY_BRIDGE.mutate` and `flosy-unified.js::postBatch`.
- Valid amount, recognized direction, date, and a known account are required; transfers require two different account IDs.
- Voice classification uses the existing Egyptian Arabic NLU (not a new speech foundation model); multiple clauses can be posted in one atomic ledger mutation.
- Item-specific icons are persisted with records; e.g. «اشتريت عربية» gets a car icon, while petrol, food, medical bills, tuition, gifts, clothes, gold and utilities have distinct icons.
- Native Android OCR comes from the existing ML Kit Latin text recognizer. Arabic-only, poorly lit or conflicting receipts can be rejected until the text is clear. We do **not** claim a newly trained full-Arabic OCR model.
- Automatic posting occurs with usable data, without a separate confirmation dialog. Duplicate source fingerprints and near-term duplicate rows are blocked; a 16-second Undo reverses the newly posted entry via the canonical deletion tracker.
- Missing account/amount and contradictory receipt totals never generate speculative charges. Excluding these basic integrity controls was not accepted because users rely on the resulting account balance.
- The original mock Android SMS/notification import remains excluded from this founder-test APK. Importing self-selected CSV statement files is available.

## Flosy AI
One user-visible AI screen accepts text, Android `ar-EG` speech recognition, native Android `TextToSpeech` or browser speech, and optionally continuous back-and-forth voice. It draws local SVG bar/donut/line charts based on `FLOSY_LOCAL_ANALYTICS.query` and `FLOSY_UNIFIED_AI.chartHtml`, reads real ledger balances and recurring obligations, and can post spoken expenses via the same capture route.

**This implementation is not a trained new LLM**. The user-facing assistant is explainable local analytics + deterministic semantic routing. There is no user-facing ChatGPT/Gemini selection and no provider API call from the new unified runtime. The old API-bearing module is kept for archived QA only behind `?flosy_test_ai=1`, and is not loaded by the production `?flosy_core=1` ledger iframe. For a future genuine local LLM, a licensed weights model, mobile runtime, tool-calling validation, dialogue benchmarks and device memory/performance tests are required.

## Data movement
All variants on the same web origin share the canonical browser local ledger (subject to original Flosy cloud sync). The new Android founder-test APK uses a distinct application ID to avoid broken sideload update signatures. **Local data from previous APK package IDs will not automatically migrate**. Use backup/sync and verify restoration before uninstalling old versions. This APK is debug-signed for founder testing, not a Play-certified release.

## Verification boundaries
Node financial, OCR parsing and PWA tests; Playwright screenshot/browser checks for 20 routes, all four themes, posted spending, per-item car icon, undo, AI and original reports; Android build / package / permission / signing verification in CI. These tests **do not certify** physical-device camera capture quality, speech fluency, play-protect installation, real-world financial correctness on arbitrary statements, or tax/zakat obligations. Third-party font/CDN CSS may need internet on initial load; offline pixel fidelity is not guaranteed.
