"use strict";
const assert=require("node:assert/strict"),{spawn}=require("node:child_process");
const {chromium}=require("playwright"),{setTimeout:pause}=require("node:timers/promises");
const BASE="http://127.0.0.1:8141";
(async()=>{
 const server=spawn("python3",["-m","http.server","8141","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser,page;
 try{
  for(let i=0;i<90;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}
   await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  page=await context.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(String(e.message)));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>!!window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE
    &&!!window.FLOSY_UX_V391&&!document.getElementById("flosyLoading"),null,{timeout:45000});
  const setup=await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;
   const C=a.core().FLOSY_BRIDGE;
   C.mutate(s=>{
    s.accounts.push({id:"qa-cash-391",name:"الكاش",opening:500000,type:"cash"});
    s.accounts.push({id:"qa-bank-391",name:"البنك",opening:100000,type:"bank"});
   });
   a.setDefaultAccount("qa-cash-391");
   a.go(5);
   return {categories:window.FLOSY_CATEGORIES.all.length,features:window.FLOSY_UX_V391.activeScreens};
  });
  assert.ok(setup.categories>=40);
  assert.deepEqual(setup.features,[4,5,6,7,8]);
  assert.ok((await page.locator(".fx-category-grid button").count())>=30);
  await page.locator("#fxDescription").fill("اشتريت عربية");
  assert.equal(await page.locator('#flosyNewTxForm [name=category]').inputValue(),"شراء سيارة");
  await page.locator('#flosyNewTxForm [name=amount]').fill("50000");
  await page.locator('#flosyNewTxForm [name=accountId]').selectOption("qa-cash-391");
  await page.locator("#flosyNewTxForm").evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),1);
  const car=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions[0]);
  assert.equal(car.category,"شراء سيارة");
  assert.equal(car.icon,"fa-car-side");
  assert.equal(car.categoryColor,"#2563EB");
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.summary().total),550000);
  // Search and account / category filters, edit and delete, accounting recompute.
  await page.locator("#flosyTxSearch").fill("عربية");
  assert.equal(await page.locator(".fx-transaction").count(),1);
  await page.locator("#fxFiltersToggle").click();
  await page.locator("#fxAccountFilter").selectOption("qa-bank-391");
  assert.equal(await page.locator(".fx-transaction").count(),0);
  await page.locator("#fxAccountFilter").selectOption("qa-cash-391");
  assert.equal(await page.locator(".fx-transaction").count(),1);
  await page.locator("[data-fx-edit]").first().click();
  await page.locator('#fxEditForm [name=amount]').fill("45000");
  await page.locator("#fxEditForm").evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions[0].amount),45000);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.summary().total),555000);
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("[data-fx-delete]").first().click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),0);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.summary().total),600000);
  // Voice: no ledger effect until an explicit human confirmation.
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(7));
  await page.evaluate(()=>window.FLOSY_CAPTURE.receiveNativeVoice("دفعت 75 جنيه قهوة من الكاش"));
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),0);
  assert.equal(await page.locator("#flosyReviewOverlayV2").count(),1);
  await page.locator('#flosyV2Form [name="account-0"]').selectOption("qa-cash-391");
  await page.locator("#flosyV2Form").evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),1);
  const savedVoice=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions[0]);
  assert.equal(savedVoice.accountId,"qa-cash-391");
  assert.equal(savedVoice.category,"قهوة وكافيهات");
  assert.equal(savedVoice.icon,"fa-mug-hot");
  await page.evaluate(()=>window.FLOSY_CAPTURE.receiveNativeVoice("دفعت 75 جنيه قهوة من الكاش"));
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),1);
  await page.locator("[data-v2-cancel]").first().click();
  // Bilingual OCR extracted text is preview-only before the owner chooses an account.
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(6));
  const receipt="CAFE CAMPUS\nDate: 13/11/2026\nTOTAL: EGP 125.00";
  await page.evaluate(async receipt=>{
    window.FLOSY_UNIFIED.core().FLOSY_REPAIR.extractForUnified=async()=>receipt;
    await window.FLOSY_REPAIR.receiveNativeReceiptImage("data:image/jpeg;base64,/9j/2w==","");
  },receipt);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),1);
  assert.equal(await page.locator("#flosyReviewOverlayV2").count(),1);
  await page.locator('#flosyV2Form [name="account-0"]').selectOption("qa-cash-391");
  await page.locator("#flosyV2Form").evaluate(el=>el.requestSubmit());
  const savedReceipt=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.find(x=>x.amount===125));
  assert.equal(savedReceipt.accountId,"qa-cash-391");
  assert.equal(savedReceipt.source,"flosy39_receipt_confirmed");
  // Typed voice / OCR paste never navigate away before human confirmation.
  const beforeTyped=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(7));
  await page.locator('#flosyVoiceTypedForm [name="spoken"]').fill("دفعت 45 جنيه فطار من الكاش");
  await page.locator("#flosyVoiceTypedForm").evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),7);
  assert.equal(await page.locator("#flosyReviewOverlayV2").count(),1);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),beforeTyped);
  await page.locator("[data-v2-cancel]").first().click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),7);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(6));
  await page.locator("#flosyReceiptPaste").fill("TEST CAFE\nDate: 13/11/2026\nTOTAL: EGP 149.00");
  await page.locator("#flosyReceiptSave").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),6);
  assert.equal(await page.locator("#flosyReviewOverlayV2").count(),1);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),beforeTyped);
  await page.locator("[data-v2-cancel]").first().click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),6);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(5));
  assert.ok((await page.locator(".fx-category-group-label").count())>=8,"grouped category table");
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  assert.equal(await page.locator(".fx-ai-hero").isVisible(),true);
  await page.locator("#flosyAiUnifiedInput").fill("ارسم فئات المصروفات");
  await page.locator("#flosyAiUnifiedForm").evaluate(el=>el.requestSubmit());
  assert.ok((await page.locator(".flosy-ai-chart svg").count())>=1);
  for(const theme of ["clean-light","emerald-dark","calm-light","serene-dark"]){
   await page.evaluate(t=>window.FLOSY_UNIFIED.applyTheme(t),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   await page.evaluate(()=>window.FLOSY_UNIFIED.openFeature("settings","الإعدادات"));
   assert.equal(await page.frameLocator("#flosyCoreFrame").locator("html").getAttribute("data-theme"),theme);
   assert.equal(await page.frameLocator("#flosyCoreFrame").locator("#flosyLegacyTheme391").count(),1);
   await page.locator("#flosyLegacyBack").click();
  }
  assert.ok(!errors.some(x=>/TypeError|ReferenceError|SyntaxError/.test(x)),errors.join(" | "));
  console.log("PASS: v3.9.1 category auto-icons, edit/delete, live balances, confirmed voice/OCR review and 4-theme settings");
 }catch(err){console.error(err);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();
