# Flosy v3.9.3 — One Finance Data Model, Connected UI, and Evidence-Based Guidance

## Scope and actual completion
The v3.9.3 founder-testing iteration inherits v3.9.2 professional Android PDF/Excel native Save As, Cairo financial voice action lexicon, daily opt-in local notifications, searchable service catalog, named Flosy AI guidance and explicit opt-in "Roast Me".

A single canonical state continues to be owned by `index.html?flosy_core=1` / `FLOSY_BRIDGE.getState()` / `FLOSY_BRIDGE.mutate()`. The new finance engine is **read-only computation** on that state. It **does not** invent account balances, traded securities, user salary, liabilities or expected yields.

### Canonical data paths
| Feature | Reads | Writes | Canonical destination |
|---|---|---|---|
| Profile | `settings.financeProfileV393` | monthlySalary, regular income, fixed commitments, essential/discretionary spending, emergency cash, reserves, risk/horizon | `settings.financeProfileV393` |
| Budget | `transactions`, `settings.categoryBudgets`, profile | user-defined per-category limits | `settings.categoryBudgets` |
| Obligations/debt | profile fixed commitments + `liabilities` | new debt / monthly payment or separate fixed bills; avoids linked duplicate | `liabilities`; `settings.financeProfileV393.monthlyCommitments` |
| Wealth | `accounts` + `transactions` + `trades` + `prices` + `assets` − `liabilities` | manually valued assets; Thndr trade/price editing preserved in original portfolio module | canonical ledger, assets, investments |
| Zakat | current ledger cash + explicitly marked eligible assets − user-specified deductible debt | 21-karat gold price/date, completed lunar year, deductible debt | `settings.financeProfileV393` |
| Family | `settings.familyMembersV393`, `transactions.familyMemberId` | family member and actual account-paid expenses | canonical transactions |
| Friends' debts | `settings.friendSplitsV393` | nominal split receivables, settled explicitly | one ledger-backed local sub-workflow (not a second bank balance) |
| Voice and receipt | native STT/OCR, Egyptian phrase parser, selected account | validated automatic transaction | `transactions` |
| Reports | one unified ledger | Android SAF PDF/Excel local files | local files; no server upload |

Legacy `v4-wealth`, `wealth`, `plan`, `smart`, `goals` are navigation aliases to their one unified screen, **not duplicate data engines**. Distinct advanced modules (Thndr trade import/valuation, bills editor, bank CSV, family collaboration/RLS, secure backup) remain available as subtools.

## Financial decision model
For a user with known recurring monthly earnings `I`, fixed scheduled obligations `F`, basic variable living cost `E`, discretionary planned spending `D`, and minimum buffer `B`:

`livingCost = F + E`

`monthlySurplus = max(0, I - F - E - D - B)`

`emergencyTarget = livingCost × desiredMonths` (default 3, configurable 3–12)

`emergencyGap = max(0, emergencyTarget - currentEmergencyCash)`

`suggestedEmergency = min(monthlySurplus, emergencyGap)`

`suggestedNewInvestment = 0` until the emergency gap is covered; also `0` when a user flags high-interest debt or recorded monthly debt service exceeds the **configurable advisory screen** of 40% recurring earnings. Otherwise, `max(0, monthlySurplus)` is an **upper scenario**, not an automatic instruction.

**Important:** This is a transparent conservative **decision-support heuristic**, not a trained financial planner, not a scientific universal 40% rule, and not personalized regulated advice. It requires a confirmed user's salary and recurring obligations. Do not generate a numeric investing amount without them. User supplies liquidity horizon and risk tolerance. Do not hardcode bank/deposit rates, gold prices or offer risk-free ROI.

The actual transactions in the current month are never simply added again to scheduled commitments in the baseline forecast, avoiding double counting. A real purchase must reduce the canonical account balance once.

### Scientific/regulatory references
- [FINRA — emergency fund, 3–6 months of living expenses](https://syndication.finra.org/content/start-your-financial-road-trip-emergency-fund). That is a **rule of thumb**, flexible with job stability and liquidity needs, not a mandatory ratio.
- [CFPB — essential guide to emergency savings](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/). Dedicated emergency cash, accessibility, budgeting and automation.
- [Investor.gov / SEC — asset allocation & diversification](https://www.investor.gov/introduction-investing/getting-started/asset-allocation). Time horizon and ability/willingness to accept risk govern allocation; never treat stocks, bonds or deposits as interchangeable.
- [CBE Treasury bill auctions](https://www.cbe.org.eg/en/auctions/egp-t-bills) and [CBE auction FAQ](https://www.cbe.org.eg/en/auctions/auctions-overview). Individuals submit Treasury bill purchases via a registered Egyptian bank; check the actual offer, tenor, fees and tax treatment. Live yields are **not** used in calculations.
- [Egyptian Dar al-Ifta Fatwa 7506, February 22, 2023](https://www.dar-alifta.org/ar/Fatwa/Details/18349/). Cash zakat nisab set to the value of **85 grams of 21-karat gold**, full lunar year, eligible wealth, obligations and **2.5%**. Gold prices and completion of the lunar year are explicit inputs. Type of debt and whether assets qualify require user verification / religious guidance.

### Zakat equations and limitations
`cashBalance = Σ(account.opening + verifiedIncome − verifiedExpenses ± transfers ± investment trades)`

`eligibleAssets = Σ(asset.currentValue where asset.zakatEligible === true)`

`zakatBase = max(0, cashBalance + eligibleAssets − userConfirmedDeductibleDebt)`

`nisab = 85 × userEnteredEgyptian21KPricePerGram`

When `zakatBase ≥ nisab` and user confirms the lunar year: `estimatedZakat = 0.025 × zakatBase`.

This is a **tentative calculation** for cash-like balances and marked assets, not an automatic legal/religious determination. Savings certificates, stocks, jewelry, outstanding debts, and changing valuation dates may need different jurisprudential treatment. The engine avoids guessing the spot gold price; the entered date is recorded for inspection.

## UX structure
1. **Home:** available funds / monthly safe-to-spend guidance, recent transactions, daily named AI insight.
2. **Accounts & Wealth (page 3):** one net-worth overview, real current balances and Thndr positions from the same trades/prices state, manually valued separate assets, links to debts and zakat.
3. **Transactions (pages 4/5):** click one transaction for full description, account, classification, date, source, receipt items; edit and deletion use canonical ledger and sync tombstones. Create Egyptian custom categories with label/group/icon/color for expense, income and obligations.
4. **Planning (page 17):** one profile, linked monthly commitments, evidence-based surplus/emergency/investment scenario, official sources.
5. **Budget (page 11):** categories from the same transactions and user category limits.
6. **Intelligence center (page 14):** trends, potential duplicates, overspending/commitment warnings and direct route to plan and AI.
7. **Zakat (page 13):** calculation from current wealth with explicit price and lunar year.
8. **Family and friends' debts (pages 19/10):** one actual-expense ledger plus family tags and optional sharing; separate receivables for bill-splitting. A split is *not* an automatic second expense and a settlement does not secretly credit a bank account.

## Native Android reports and reminders
The new Android Java `FlosyPdfExporter` creates A4 multipage Arabic right-to-left reports locally; `FlosyReportBridge` receives bounded JSON/chunks and XLSX from the hosted UI, validates bytes, launches Android `ACTION_CREATE_DOCUMENT`, and reports success or error. Excel has styled worksheets, frozen headers, right-to-left reading direction and currency formatting. The UI does not pretend that a WebView print prompt is a PDF download.

Notification permission and scheduling is opt-in: due bills and a generic 9 a.m. notification prompting the user to open Flosy for the named insight. Do not claim Android sends truly personalized AI content in the background without connected user data and system permission.

## QA and constraints
Node accounting/NLU/zakat/projections tests, Playwright Chromium flows (forms, custom categories, detailed transactions, salary plan, Thndr, zakat, family, themes and simulated native PDF/XLSX chunk transfers), signed Android CI artifact and permission verification are the acceptance gates.

**Known limitations**: no physical phone camera/audio/notification delivery measurement; no new speech acoustic model nor independently fine-tuned LLM; external fund or broker quotes are not streamed; no global cross-device conflict resolution proven; the APK WebView requires connectivity and compatible speech/Tesseract components for some operations. APK debug signatures are not guaranteed to support over-install; keep prior APK until backup and restore are verified. Not Google Play-certified.