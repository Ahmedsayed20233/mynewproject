"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright"),{spawn}=require("node:child_process");
const {setTimeout:pause}=require("node:timers/promises"),fs=require("node:fs");
const BASE="http://127.0.0.1:8177";
(async()=>{
 const server=spawn("python3",["-m","http.server","8177","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser;
 try{
  for(let i=0;i<130;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE &&
   window.FLOSY_CUSTOMER_UX_V397 && !document.getElementById("flosyLoading"),null,{timeout:50000});
  const baseline=await page.evaluate(()=>({accounts:window.FLOSY_UNIFIED.state().accounts.length,transactions:window.FLOSY_UNIFIED.state().transactions.length}));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(1));
  assert.ok(await page.locator("#flosyWelcomeV397").isVisible());
  assert.equal(await page.locator("#flosyWelcomeV397 [data-onboard-step]").count(),4);
  await page.locator('#flosyWizardFormV397 [name="accountName"]').fill("الكاش");
  await page.locator('#flosyWizardFormV397 [name="opening"]').fill("18000");
  await page.locator("#flosyWelcomeV397 [data-wizard-next]").click();
  await page.locator('#flosyWizardFormV397 [name="salary"]').fill("20000");
  await page.locator('#flosyWizardFormV397 [name="essentials"]').fill("5000");
  await page.locator('#flosyWizardFormV397 [name="discretionary"]').fill("2500");
  await page.locator("#flosyWelcomeV397 [data-wizard-next]").click();
  await page.locator('#flosyWizardFormV397 [name="fixed"]').fill("3500");
  await page.locator('#flosyWizardFormV397 [name="buffer"]').fill("1000");
  await page.locator("#flosyWelcomeV397 [data-wizard-next]").click();
  assert.ok((await page.locator("#flosyWizardSummaryV397").innerText()).includes("٢٠٬٠٠٠"));
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  await page.screenshot({path:"tests/_artifacts/flosy-v397-onboarding.png"});
  await page.locator("#flosyWizardFormV397 [data-wizard-save]").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),2);
  const p=await page.evaluate(()=>({s:window.FLOSY_UNIFIED.state(),
    ready:window.FLOSY_FINANCE_ENGINE.plan(window.FLOSY_UNIFIED.state()).ready}));
  assert.equal(p.s.accounts.length,baseline.accounts+1);
  const newAccount=p.s.accounts.find(x=>x.name==="الكاش"&&x.opening===18000);
  assert.ok(newAccount,"onboarding should create real cash account");
  assert.equal(p.s.settings.financeProfileV393.monthlySalary,20000);
  assert.equal(p.s.settings.financeProfileV393.monthlyCommitments[0].amount,3500);
  assert.equal(p.ready,true);
  await page.locator("#flosySafeExplainV397 summary").click();
  assert.ok(await page.locator("#flosySafeExplainV397 button").isVisible());
  await page.screenshot({path:"tests/_artifacts/flosy-v397-home-safe.png"});
  await page.evaluate(()=>window.FLOSY_UNIFIED.openAccountDialog());
  assert.ok(await page.locator("#flosyAccountDialogV397").isVisible());
  await page.locator('#flosyAccountFormV397 [name="name"]').fill("المحفظة");
  await page.locator('#flosyAccountFormV397 [name="type"]').selectOption("wallet");
  await page.locator('#flosyAccountFormV397 [name="opening"]').fill("1200");
  await page.locator("#flosyAccountFormV397").evaluate(f=>f.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().accounts.length),baseline.accounts+2);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().accounts.at(-1).type),"wallet");
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(5));
  assert.ok(await page.locator(".fx-quickchips").isVisible());
  await page.locator('[data-fx-quick="قهوة"]').click();
  assert.equal(await page.locator("#fxDescription").inputValue(),"قهوة");
  assert.equal(await page.locator('#flosyNewTxForm [name="type"]').inputValue(),"expense");
  assert.ok(await page.locator("#fxSelectedCategory").isVisible());
  assert.equal(await page.locator("#fxCategoryDetails").getAttribute("open"),null);
  await page.locator('#flosyNewTxForm [name="amount"]').fill("45");
  await page.locator('#flosyNewTxForm [name="accountId"]').selectOption(newAccount.id);
  await page.locator("#flosyNewTxForm").evaluate(f=>f.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),baseline.transactions+1);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(5));
  await page.locator('[data-fx-repeat="latest"]').click();
  assert.equal(await page.locator('#flosyNewTxForm [name="amount"]').inputValue(),"45");
  assert.equal(await page.locator("#flosyNewTxForm").getAttribute("data-repeat-mode"),"true");
  await page.locator("#flosyNewTxForm").evaluate(f=>f.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),baseline.transactions+2,
   "explicit repeat should add a second real customer-confirmed expense");
  await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;
   window.FLOSY_CAPTURE_REVIEW_V2.open({kind:"voice",accounts:a.accounts(),
    save:rows=>(window.__v397Reviewed=rows,rows),
    items:[
     {intent:"expense",amount:120,date:"2026-11-14",description:"بنزين",text:"دفعت 120 جنيه بنزين"},
     {intent:"refund",amount:200,date:"2026-11-14",description:"رد سلفة",text:"ردلي السلفة"},
     {intent:"income",amount:500,date:"2026-11-14",description:"دخل",text:"قبضت 500 جنيه"}
    ]});
  });
  assert.ok(await page.locator("#flosyReviewOverlayV2").isVisible());
  assert.equal(await page.locator('#flosyV2Form [type="submit"]').isEnabled(),true);
  await page.locator('#flosyV2Form [name="include-2"]').uncheck();
  await page.locator('#flosyV2Form [name="account-0"]').selectOption(newAccount.id);
  await page.locator('#flosyV2Form [type="submit"]').click();
  assert.equal(await page.evaluate(()=>window.__v397Reviewed.length),1);
  assert.equal(await page.evaluate(()=>window.__v397Reviewed[0].type),"expense");
  await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;
   window.FLOSY_CAPTURE_REVIEW_V2.open({kind:"receipt",accounts:a.accounts(),
    save:rows=>(window.__v397Receipt=rows,rows),
    items:[{intent:"expense",amount:130,date:"2026-11-14",description:"بقالة",
     receiptDetails:{items:[{name:"سكر",quantity:2,unitPrice:50,total:100}],
      tax:30,discount:0,arithmeticConsistent:true}}]});
  });
  await page.locator('[name="account-0"]').selectOption(newAccount.id);
  assert.ok(await page.locator(".flosy-v2-items").isVisible());
  await page.locator('[name="receipt-price-0-0"]').fill("60");
  assert.equal(await page.locator('[data-receipt-calc="0"]').getAttribute("data-valid"),"false");
  await page.locator('[name="amount-0"]').fill("150");
  assert.equal(await page.locator('[data-receipt-calc="0"]').getAttribute("data-valid"),"true");
  await page.locator('#flosyV2Form [type="submit"]').click();
  assert.equal(await page.evaluate(()=>window.__v397Receipt[0].receiptDetails.itemsSum),120);
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),baseline.transactions+2);
  assert.equal(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/.test(e)).length,0,errors.join(" | "));
  console.log("PASS v3.9.7: onboarding, cash plan, wallet account, quick entry, intentional repeat, partial voice review, OCR line edits");
 }catch(e){console.error(e);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();
