"use strict";
// Browser smoke tests exercise the real DOM, not mocked getElementById().
// Only synthetic, local financial state. No login, API key or real account.
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const fs=require("node:fs");
const {chromium}=require("playwright");
const {setTimeout:pause}=require("node:timers/promises");
const ORIGIN="http://127.0.0.1:8123";
async function startLocal(){
 const child=spawn("python3",["-m","http.server","8123","--bind","127.0.0.1"],{stdio:"ignore"});
 for(let i=0;i<50;i++){
  try{const r=await fetch(ORIGIN+"/index.html");if(r.ok)return child}catch{}
  await pause(120);
 }
 child.kill();throw Error("Unable to launch local site");
}
(async()=>{
 const server=await startLocal();
 let browser,page;
 try{
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({acceptDownloads:true,serviceWorkers:"block"});
  page=await context.newPage();
  // Never send test data to remote API services.
  await page.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/,route=>route.abort());
  await page.goto(ORIGIN+"/index.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.FLOSY_AI&&window.FLOSY_REPAIR&&window.FLOSY_BRIDGE,{timeout:10000});

  // v10 new profiles use neutral settings; no owner's 17k salary/20k initial Visa.
  const blank=await page.evaluate(()=>{
   const s=window.FLOSY_BRIDGE.getState();
   return {salary:s.settings.salary,rent:s.settings.rent,target:s.settings.emergencyTarget,
    initialVisa:s.plan?.initialVisa};
  });
  assert.equal(blank.salary,0);
  assert.equal(blank.rent,0);
  assert.equal(blank.target,0);
  assert.equal(blank.initialVisa,0);
  // A persisted privacy mask is always reversible through an explicit, visible action.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("dashboard"));
  const hide=page.locator("#flosyPrivacyQuickToggle");
  assert.ok(await hide.isVisible());
  await hide.click();
  assert.equal(await page.evaluate(()=>document.body.classList.contains("v4-private")),true);
  await hide.click();
  assert.equal(await page.evaluate(()=>document.body.classList.contains("v4-private")),false);
  // Receipt and voice have one polished studio with no duplicate SMS/CSV cards.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("v4-capture"));
  assert.ok(await page.locator("#flosyRepairRoot .f10-card.voice").isVisible());
  assert.ok(await page.locator("#flosyRepairRoot .f10-card.receipt").isVisible());
  assert.equal(await page.locator("#flosyRepairRoot #v4-voice-text").count(),1);
  assert.equal(await page.locator("#v4-capture-review").count(),1);
  // A real Android chooser shares only the user-selected message with Flosy.
  // The old direct inbox and notification-scan buttons must not appear.
  await page.evaluate(()=>{
    window.FLOSY_NATIVE_SMS_AVAILABLE=true; // simulate a stale legacy wrapper
    window.FLOSY_NEXT.render();
    window.FLOSY_BRIDGE.goto("import");
  });
  assert.equal(await page.locator('[data-f2="scan-sms-inbox"],[data-f2="instapay-notifications"]').count(),0);
  const beforeShared=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length);
  await page.evaluate(()=>window.FLOSY_NEXT.receiveSharedText(
    "InstaPay تم استلام مبلغ 500 EGP من محمد"));
  await page.locator('#f2SMSForm button[type="submit"]').click();
  assert.equal(await page.locator('#f2ReviewForm').count(),1);
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeShared,
    "Sharing a message cannot create a transaction without explicit review");
  // Synthetic Egyptian instant transfer wording: amount is 1.00 EGP,
  // never the masked account, reference or bank hotline.
  await page.evaluate(()=>window.FLOSY_NEXT.receiveSharedText(
    "تم تنفيذ تحويل لحظي من حسابكم رقم 0000 بمبلغ 1.00 جم إلى عميل رقم مرجعي 123456789012 يوم 11-11 الساعة 14:23"));
  await page.locator('#f2SMSForm button[type="submit"]').click();
  assert.equal(await page.locator('#f2ReviewForm').count(),1);
  assert.equal(await page.locator('#f2ReviewForm [name="amount"]').inputValue(),"1");
  assert.equal(await page.locator('#f2ReviewForm [name="type"]').inputValue(),"expense");
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeShared,
    "An imported instant transfer is never committed without review");
  console.log("PASS: Egyptian instant transfer detection and safe draft for review");

  console.log("PASS: neutral setup, privacy and permission-light shared-message review");

  // v28: Auto-import controls are invisible on normal web / safe Android wrapper.
  assert.equal(await page.locator("#flosyAutoImportRoot .flosy-auto-panel").count(),0);
  // Simulate only an authorized native wrapper; no real SMS/notifications accessed.
  await page.evaluate(()=>{
    window.FLOSY_NATIVE_AUTO_IMPORT_AVAILABLE=true;
    window.__autoRequests=[];
    window.FlosyNative={postMessage:msg=>window.__autoRequests.push(JSON.parse(msg))};
    window.FLOSY_AUTO_IMPORT.render();
  });
  assert.ok(await page.locator("#flosyAutoImportRoot .flosy-auto-consent").isVisible());
  await page.locator('[data-auto-action="enable"]').click();
  assert.equal(await page.evaluate(()=>window.__autoRequests.length),0,
   "Native automatic import must not start without explicit consent");
  await page.locator("#flosyAutoSenders").fill("CIB, NBE");
  await page.locator("#flosyAutoConsent").check();
  await page.locator('[data-auto-action="enable"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__autoRequests.map(x=>x.action)),
    ["auto-configure","auto-enable"]);
  await page.evaluate(()=>window.FLOSY_AUTO_IMPORT.nativeStatus({
   enabled:true,smsGranted:true,notificationGranted:false,
   senders:"CIB,NBE",apps:"",pending:1
  }));
  assert.match(await page.locator("#flosyAutoImportRoot").innerText(),/معاملات في انتظار المراجعة/);
  const beforeAuto=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length);
  await page.evaluate(()=>window.FLOSY_AUTO_IMPORT.nativeQueue([
   {id:"ab".repeat(16),source:"sms",date:Date.now(),
    text:"تم خصم مبلغ 250 EGP مقابل شراء"}
  ]));
  await page.locator('[data-f2="sms-select:0"]').click();
  assert.ok(await page.locator("#f2ReviewForm").isVisible());
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeAuto,
   "Auto-import is a review queue, never a silent finance ledger write");
  await page.evaluate(()=>{
    window.FLOSY_NATIVE_AUTO_IMPORT_AVAILABLE=false;
    window.FLOSY_AUTO_IMPORT.render();
  });
  console.log("PASS: Play-variant opt-in, allowlist, queue review and safe invisible default");

  // Free Automate relay must never request SMS/notification access in Flosy itself.
  assert.equal(await page.locator("#flosyAutomateRelayRoot .f29-panel").count(),0);
  await page.evaluate(()=>{
    window.FLOSY_NATIVE_RELAY_AVAILABLE=true;
    window.__relayCalls=[];
    window.FlosyNative={postMessage:msg=>window.__relayCalls.push(JSON.parse(msg))};
    window.FLOSY_AUTOMATE_RELAY.render();
  });
  assert.ok(await page.locator("#flosyAutomateRelayRoot .f29-panel").count()===1);
  await page.locator('#flosyAutomateRelayRoot [data-f29="pair"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__relayCalls.map(x=>x.action)),["relay-pair"]);
  await page.evaluate(()=>window.FLOSY_AUTOMATE_RELAY.nativePair({token:"a".repeat(48)}));
  assert.match(await page.locator("#flosyRelayToken").innerText(),/^a{48}$/);
  await page.evaluate(()=>window.FLOSY_AUTOMATE_RELAY.nativeStatus({
   paired:true,senders:"CIB,NBE",apps:"",pending:1,packageName:"com.flosy.finance",lastDeliveryCode:"invalid_pair_token",lastDeliveryAt:Date.now()
  }));
  assert.match(await page.locator("#flosyAutomateRelayRoot").innerText(),/رمز الاقتران غير مطابق/);
  const beforeRelay=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length);
  await page.evaluate(()=>window.FLOSY_AUTOMATE_RELAY.nativePending({items:[{
   id:"ab".repeat(16),source:"sms",date:Date.now(),text:"CIB تم خصم مبلغ 250 EGP مقابل شراء"
  }]}));
  assert.ok(await page.locator("#f2ReviewForm").count()===0);
  await page.locator('[data-f2="sms-select:0"]').click();
  assert.ok(await page.locator("#f2ReviewForm").isVisible());
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeRelay,
   "Free Automate import must remain review-only");
  await page.evaluate(()=>{
   window.FLOSY_NATIVE_RELAY_AVAILABLE=false;
   window.FLOSY_AUTOMATE_RELAY.render();
  });
  console.log("PASS: free Automate native pair and SMS queue, still no automatic ledger writes");

  // 1) Free assistant really allows asking without signing into Supabase.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("ai"));
  const freeOption=await page.locator("#flosyAiMode").inputValue();
  assert.equal(freeOption,"free","Free assistant must be selected by default");
  await page.locator("#flosyAiQuestion").fill("إزاي أجهز صندوق الطوارئ؟");
  await page.locator("#flosyAiForm button[type=submit]").click();
  const reply=await page.locator("#flosyAiMessages").innerText();
  assert.match(reply,/صندوق الطوارئ|تغطية 3 أشهر/);
  assert.match(reply,/Flosy المحلي|مساعد فلوسي المحلي المجاني/);


  // Personal Gemini integration: mock the network and verify that NO raw
  // financial question is transmitted to the Free-tier proxy.
  const geminiRequests=[];
  await page.route("https://vzuitcaarklesgehznha.supabase.co/functions/v1/flosy-gemini-parse",async route=>{
    geminiRequests.push(route.request().postDataJSON());
    await route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify({answer:"نصيحة عامة لا تشمل أرصدة حسابات.",source:"gemini_free_tier"})});
  });
  await page.evaluate(()=>{
    const b=window.FLOSY_BRIDGE;
    window.__geminiTestSession={getSession:b.getSession,ensureSession:b.ensureSession};
    b.getSession=()=>({access_token:"synthetic-session-token"});
    b.ensureSession=async()=>true;
  });
  await page.evaluate(()=>window.FLOSY_AI.render());
  assert.ok(await page.locator('#flosyAiMode option[value="gemini"]').count()===1);
  await page.locator("#flosyAiMode").selectOption("gemini");
  await page.locator("#flosyAiConsent").check();
  const privateQuestion="اعمل خطة ميزانية ورقم حسابي PRIVATE_ACCOUNT_9999999 ورصيدي 12457 جنيه";
  await page.locator("#flosyAiQuestion").fill(privateQuestion);
  await page.locator("#flosyAiForm button[type=submit]").click();
  await page.waitForFunction(()=>document.querySelector("#flosyAiMessages")?.textContent?.includes("نصيحة عامة"));
  assert.equal(geminiRequests.length,1);
  assert.deepEqual(Object.keys(geminiRequests[0]).sort(),["intent","task"]);
  assert.equal(geminiRequests[0].task,"coach");
  assert.ok(!JSON.stringify(geminiRequests[0]).includes("PRIVATE_ACCOUNT"));
  const botReply=await page.locator("#flosyAiMessages").innerText();
  assert.match(botReply,/Gemini Free/);
  await page.locator("#flosyAiMode").selectOption("free");
  await page.evaluate(()=>{
    const b=window.FLOSY_BRIDGE,orig=window.__geminiTestSession;
    b.getSession=orig.getSession;b.ensureSession=orig.ensureSession;
    delete window.__geminiTestSession;
  });
  console.log("PASS: Gemini Free topic-only request, explicit consent and local finance arithmetic");
  // Gemini Free must offer a visible route to sign-in (instead of a dead-end error).
  await page.locator("#flosyAiMode").selectOption("gemini");
  assert.ok(await page.locator('[data-ai-login="1"]').isVisible(),
    "Gemini must show Flosy sign-in CTA to guests");
  await page.locator('[data-ai-login="1"]').click();
  assert.equal(await page.locator("#page-settings").isVisible(),true);
  assert.equal(await page.locator("#flosyRememberSession").isVisible(),true);
  assert.equal(await page.locator("#flosyRememberSession").isChecked(),false,
    "Remember-login must be opt-in on shared devices");
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("ai"));
  await page.locator("#flosyAiMode").selectOption("free");

  // 2) Receipt text should become a reviewed draft, never a saved transaction.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("v4-capture"));
  const before=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length);
  await page.locator("#flosyRepairOCRText").fill("CAFE CAMPUS\nTOTAL: EGP 125.00");
  await page.locator("#flosyRepairOCRForm button[type=submit]").click();
  const parsedAmount=await page.locator('#v4-capture-confirm input[name="amount"]').inputValue();
  assert.equal(Number(parsedAmount),125,"Expected OCR amount to appear in review input");
  const after=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length);
  assert.equal(after,before,"Receipt OCR text cannot create an unapproved transaction");

  // 3) Android secure bridge contract should get native voice and camera actions.
  await page.evaluate(()=>{
   window.__capturedActions=[];
   window.FLOSY_NATIVE_VOICE_AVAILABLE=true;
   window.FLOSY_NATIVE_OCR_AVAILABLE=true;
   window.FlosyNative={postMessage:m=>window.__capturedActions.push(JSON.parse(m))};
   window.FLOSY_REPAIR.render();
  });
  await page.locator('button[data-repair="voice"]').click();
  await page.locator('button[data-repair="native-camera"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__capturedActions.map(x=>x.action)),
   ["voice","receipt-camera"]);

  // 4) Receipt export uses the protected native bridge (no network).
  await page.locator("#flosyRepairOCRText").fill("CAFE CAMPUS\nTOTAL: EGP 125.00");
  await page.locator('button[data-repair="export-ocr"]').click();
  assert.equal(await page.evaluate(()=>window.__capturedActions.at(-1).action),"receipt-export");
  assert.match(await page.evaluate(()=>window.__capturedActions.at(-1).text),/TOTAL/);
  console.log("PASS: free AI chat, receipt review, native voice/camera and export button");
  // 5) Real budget proposal acceptance and rich transaction explorer with synthetic transactions.
  await page.evaluate(()=>{
    const today=new Date(),monthDate=offset=>{
      const d=new Date(today.getFullYear(),today.getMonth()+offset,4);
      return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),"04"].join("-");
    };
    const rows=[];
    for(const offset of [-3,-2,-1])
      rows.push({id:"sample-food-"+offset,type:"expense",amount:150,date:monthDate(offset),
       category:"طعام ومشروبات",description:"Food sample"});
    rows.push({id:"sample-income",type:"income",amount:1200,date:monthDate(0),
      category:"دخل",description:"Sample Salary"});
    rows.push({id:"sample-expense",type:"expense",amount:600,date:monthDate(0),
      category:"طعام ومشروبات",description:"EXACT_MARKER merchant"});
    rows.push({id:"sample-transfer",type:"transfer",amount:7000,date:monthDate(0),
      category:"الطوارئ",description:"Internal transfer"});
    window.FLOSY_BRIDGE.mutate(s=>s.transactions.push(...rows));
  });
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("budget"));
  assert.equal(await page.locator('#flosyElevateBudgets button[data-u-accept="طعام ومشروبات"]').count(),1,
   "Budget suggestion should appear after 3 completed months");
  await page.locator('#flosyElevateBudgets button[data-u-accept="طعام ومشروبات"]').click();
  const activeBudget=await page.evaluate(()=>
   window.FLOSY_BRIDGE.getState().elevate?.categoryBudgets?.["طعام ومشروبات"]?.amount);
  assert.equal(activeBudget,200,"Suggested category budget must be explicit and conservative");
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("transactions"));
  assert.equal(await page.locator("#flosyElevateTransactions").count(),1);
  assert.equal(await page.locator('button[data-u-period="month"]').count(),1);
  await page.locator("#flosyElevateSearch").fill("EXACT_MARKER");
  const searched=await page.evaluate(()=>window.FLOSY_ELEVATE.periodRows().rows);
  assert.equal(searched.length,1);
  assert.equal(searched[0].amount,600);
  await page.locator("#flosyElevateSearch").fill("");
  const totals=await page.evaluate(()=>window.FLOSY_ELEVATE.monthSummary());
  assert.equal(totals.expense,600);
  assert.equal(totals.transfer,7000);
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("wealth"));
  assert.ok(await page.locator("#flosyElevateWealth").isVisible());
  const wealth=await page.evaluate(()=>window.FLOSY_ELEVATE.currentWealth());
  assert.equal(typeof wealth?.net,"number","Wealth must use actual finance metrics");
  await page.locator("button[data-u-snapshot]").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_ELEVATE.wealthSnapshots().length),1);
  assert.equal(await page.locator("#flosyElevateWealth .u-trend-chart").count(),0,
   "No fictitious historical wealth chart with one snapshot");
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("dashboard"));
  assert.ok(await page.locator("#flosyElevateDashboard").isVisible());
  const toggle=page.locator("#flosyElevateToggle");
  assert.equal(await toggle.count(),1);
  assert.equal(await page.locator("#page-dashboard").evaluate(x=>x.classList.contains("u-advanced-hidden")),true);
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"),"true");
  assert.ok(await page.locator("#recentTable").isVisible());
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"),"false");

  // 6) Studio quick-add uses canonical transaction modal, not a second ledger.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("dashboard"));
  await page.waitForFunction(()=>!!window.FLOSY_STUDIO);
  assert.ok(await page.locator("#flosyStudioHome .u3-account-row").count()>0);
  const beforeStudio=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length);
  await page.locator("#flosyStudioHome [data-u3-customize]").click();
  assert.equal(await page.locator("#flosyStudioCustomization").isVisible(),true);
  await page.locator('input[data-u3-visible="flow"]').check();
  const visibility=await page.evaluate(()=>window.FLOSY_STUDIO.preferences().visible.flow);
  assert.equal(visibility,true,"New income/expense widget preference should persist in financial backup");
  assert.equal(await page.locator('#flosyStudioHome [data-u3-widget="flow"]').count(),1);
  // Configuring UI cannot alter financial balances, even if cloud state is synced.
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeStudio);
  await page.locator('[data-u3-customize-close]').click();
  await page.locator('#flosyStudioHome [data-u3-launch]').click();
  assert.equal(await page.locator('#flosyStudioLauncher').isVisible(),true);
  assert.equal(await page.locator('#flosyStudioLauncher [role="dialog"]').getAttribute("aria-modal"),"true");
  await page.locator('#flosyStudioLauncher [data-u3-option="expense"]').click();
  assert.equal(await page.locator("#modalback").evaluate(el=>el.classList.contains("open")),true);
  assert.equal(await page.locator("#formType").inputValue(),"expense");
  await page.locator("#closeModal").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeStudio);
  await page.locator("#flosyStudioHome [data-u3-launch]").click();
  await page.locator('#flosyStudioLauncher [data-u3-option="transfer"]').click();
  assert.equal(await page.locator("#formType").inputValue(),"transfer");
  await page.locator("#cancelModal").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions.length),beforeStudio);
  // Save one synthetic income with optional time/note via the existing canonical form.
  await page.locator("#flosyStudioHome [data-u3-launch]").click();
  await page.locator('#flosyStudioLauncher [data-u3-option="income"]').click();
  await page.locator('#txnForm input[name="amount"]').fill("817.50");
  await page.locator('#txnForm input[name="description"]').fill("STUDIO_TEST_INCOME");
  await page.locator('#txnForm input[name="time"]').fill("12:34");
  await page.locator('#txnForm textarea[name="note"]').fill("Studio test note");
  await page.locator('#txnForm button[type="submit"]').click();
  const recordedByStudio=await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions
   .filter(t=>t.description==="STUDIO_TEST_INCOME"));
  assert.equal(recordedByStudio.length,1,"Quick-add income must be saved only once");
  assert.equal(recordedByStudio[0].amount,817.50);
  assert.equal(recordedByStudio[0].time,"12:34");
  assert.equal(recordedByStudio[0].note,"Studio test note");
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("transactions"));
  const seenNote=await page.locator('#flosyElevateTxRows .u3-transaction-note').allTextContents();
  assert.ok(seenNote.some(x=>x.includes("Studio test note")));
  // Reopening the same details should detect possible duplicates instead of silent double-logging.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("dashboard"));
  await page.locator("#flosyStudioHome [data-u3-launch]").click();
  await page.locator('#flosyStudioLauncher [data-u3-option="income"]').click();
  await page.locator('#txnForm input[name="amount"]').fill("817.50");
  await page.locator('#txnForm input[name="description"]').fill("STUDIO_TEST_INCOME");
  let warning=false;
  page.once("dialog",async dialog=>{warning=true;await dialog.dismiss()});
  await page.locator('#txnForm button[type="submit"]').click();
  assert.equal(warning,true,"A duplicate manual entry requires explicit review");
  assert.equal(await page.evaluate(()=>window.FLOSY_BRIDGE.getState().transactions
   .filter(t=>t.description==="STUDIO_TEST_INCOME").length),1);
  await page.locator("#cancelModal").click();
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("settings"));
  assert.ok(await page.locator("#flosyStudioSettings .u3-setting-link").count()>=4);
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("dashboard"));
  console.log("PASS: Studio widget controls, account balance preview, and canonical quick-add sheet");

  // AutoCapture v3.1: all data below is synthetic; no real finance identifiers.
  const autoTests=await page.evaluate(()=>{
   const C=window.FLOSY_BRIDGE,cap=window.FLOSY_CAPTURE,N=window.FLOSY_NEXT;
   const st=C.getState(),accounts=st.accounts||[];
   if(!accounts.length){
    C.mutate(s=>s.accounts.push({id:"test-auto-cash",name:"Test Cash",type:"cash",balance:0}));
   }
   const account=C.getState().accounts[0].id;
   cap.setAutoAccount(account);
   cap.setAuto("voice",true);
   cap.setAuto("receipt",true);
   cap.setAuto("sms",true);
   const before=C.getState().transactions.length;
   const wordVoice=cap.parseVoice("دفعت مية وخمسين جنيه قهوة");
   const voice=cap.parseVoice("دفعت 63 جنيه قهوة");
   const savedVoice=cap.autoRecord(voice,"voice");
   const afterVoice=C.getState().transactions.length;
   const receipt=cap.parseReceipt(["متجر التجربة","Date: 10/11/2026","Grand Total","125.00"].join(String.fromCharCode(10)));
   const savedReceipt=cap.autoRecord(receipt,"receipt");
   const afterReceipt=C.getState().transactions.length;
   const smsText="تم تنفيذ تحويل لحظي من حسابكم رقم 0000 بمبلغ 1.00 جم إلى عميل رقم مرجعي 123456789321 يوم 11-11 الساعة 14:23";
   const smsResult=N.receiveScannedSMS([{id:"cd".repeat(16),source:"sms",date:Date.now(),text:smsText}]);
   const afterSMS=C.getState().transactions.length;
   const otpResult=N.receiveScannedSMS([{id:"ef".repeat(16),source:"sms",date:Date.now(),text:"OTP 654321 تم خصم مبلغ 100 EGP"}]);
   const afterOTP=C.getState().transactions.length;
   cap.undoLastAuto();
   const afterUndo=C.getState().transactions.length;
   cap.setAuto("sms",false);cap.setAuto("voice",false);cap.setAuto("receipt",false);
   return {before,savedVoice,afterVoice,savedReceipt,afterReceipt,smsResult,afterSMS,otpResult,afterOTP,afterUndo,
    receiptAmount:receipt.amount,receiptAutoQuality:receipt.autoQuality,receiptEvidence:receipt.receiptDetails?.evidence,receiptConfidence:receipt.receiptDetails?.confidence,receiptMerchant:receipt.receiptDetails?.merchant,receiptAccount:receipt.accountId,voiceAmount:voice.amount,wordVoiceAmount:wordVoice.amount,autoAccount:account};
  });
  assert.equal(autoTests.savedVoice,true,"Explicit spoken expense should auto-save after opt-in");
  assert.equal(autoTests.afterVoice,autoTests.before+1);
  assert.equal(autoTests.voiceAmount,63);
  assert.equal(autoTests.wordVoiceAmount,150,"Egyptian spoken number words must parse");
  console.log("Receipt auto-capture diagnostic (synthetic only)",JSON.stringify(autoTests));
  assert.equal(autoTests.savedReceipt,true,"Clearly dated labeled receipt should auto-save");
  assert.equal(autoTests.receiptAmount,125);
  assert.equal(autoTests.afterReceipt,autoTests.before+2);
  assert.equal(autoTests.smsResult.saved,1,"Recognized instant transfer should auto-save");
  assert.equal(autoTests.afterSMS,autoTests.before+3);
  assert.equal(autoTests.otpResult.saved,0,"OTP must never auto-book");
  assert.equal(autoTests.afterOTP,autoTests.afterSMS);
  assert.equal(autoTests.afterUndo,autoTests.before+2,"Last auto-recorded transaction must be reversible");
  console.log("PASS: opted-in auto-save voice, split-line receipt, instant transfer SMS, OTP rejection and undo");

  fs.mkdirSync("tests/_artifacts",{recursive:true});
  await page.screenshot({path:"tests/_artifacts/elevate-dashboard.png",fullPage:true});
  // Mobile RTL smoke test: all new cards must fit a 390px Android viewport.
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(100);
  const mobile=await page.evaluate(()=>{
    const boxes=[...document.querySelectorAll("#flosyElevateDashboard .u-panel,#flosyElevateDashboard .u-snapshot")];
    return boxes.map(x=>({width:x.getBoundingClientRect().width,
      left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right}));
  });
  assert.ok(mobile.length>0);
  assert.ok(mobile.every(x=>x.left>=-2&&x.right<=392),
   "Reference-inspired mobile cards should remain within 390px viewport: "+JSON.stringify(mobile));
  const studioMobile=await page.evaluate(()=>[...document.querySelectorAll(
    "#flosyStudioHome .u3-panel,#flosyStudioHome .u3-homehead")]
    .map(x=>({left:x.getBoundingClientRect().left,right:x.getBoundingClientRect().right})));
  assert.ok(studioMobile.length>0 && studioMobile.every(x=>x.left>=-2&&x.right<=392),
    "Studio mobile white cards overflow: "+JSON.stringify(studioMobile));
  await page.locator("#dockAdd").click();
  assert.equal(await page.locator("#flosyStudioLauncher").isVisible(),true);
  assert.equal(await page.locator(".mobile-dock").evaluate(x=>getComputedStyle(x).display),"none",
    "Mobile navigation must never obscure the quick-add sheet");
  await page.locator('#flosyStudioLauncher [data-u3-option="receipt"]').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#flosyStudioLauncher [data-u3-option="receipt"]').isVisible(),true,
    "Last receipt action must remain tappable on narrow phones");
  await page.screenshot({path:"tests/_artifacts/flosy-studio-mobile-quick-add.png",fullPage:false});
  await page.locator("#flosyStudioLauncher [data-u3-close]").click();
  assert.equal(await page.locator("#flosyStudioLauncher").isVisible(),false);

  await page.screenshot({path:"tests/_artifacts/elevate-mobile-390px.png",fullPage:true});
  console.log("PASS: historical budgets, transaction explorer, real wealth journal and premium dashboard");

 }catch(error){
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  if(page)await page.screenshot({path:"tests/_artifacts/browser-smoke-failed.png",fullPage:true}).catch(()=>{});
  console.error(error);
  process.exitCode=1;
 }finally{
  if(browser)await browser.close();
  server.kill();
 }
})();
