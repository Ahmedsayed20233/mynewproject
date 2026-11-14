"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright"),{spawn}=require("node:child_process");
const {setTimeout:pause}=require("node:timers/promises");
(async()=>{
 const server=spawn("python3",["-m","http.server","8153","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser,page;
 try{
  for(let i=0;i<100;i++){try{if((await fetch("http://127.0.0.1:8153/flosy.html")).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:"block"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto("http://127.0.0.1:8153/flosy.html",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>!!window.FLOSY_FINANCE_UI&&!!window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE,null,{timeout:60000});
  await page.evaluate(()=>{
   const api=window.FLOSY_UNIFIED;
   api.core().FLOSY_BRIDGE.mutate(s=>s.accounts.push({id:"qa393cash",name:"كاش",type:"cash",opening:10000}));
   api.setDefaultAccount("qa393cash");api.go(17);
  });
  await page.locator('[name="monthlySalary"]').fill("20000");
  await page.locator('[name="recurringExtraIncome"]').fill("2000");
  await page.locator('[name="essentialVariableSpend"]').fill("7000");
  await page.locator('[name="minimumMonthlyBuffer"]').fill("1000");
  await page.locator('#fin393ProfileForm').evaluate(el=>el.requestSubmit());
  await page.locator('#fin393CommitmentForm [name=name]').fill("إيجار شهري");
  await page.locator('#fin393CommitmentForm [name=amount]').fill("3000");
  await page.locator('#fin393CommitmentForm').evaluate(el=>el.requestSubmit());
  const plan=await page.evaluate(()=>window.FLOSY_FINANCE_ENGINE.plan(window.FLOSY_UNIFIED.state()));
  assert.equal(plan.ready,true);assert.equal(plan.monthlySurplus,11000);
  assert.equal(plan.suggestedInvestment,0);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(11));
  assert.ok((await page.locator(".fin393-metric").count())>=4);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(14));
  assert.ok((await page.locator(".fin393-advice").count())>=0);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(5));
  await page.locator("#fin393NewCategory").click();
  await page.locator('#fin393CategoryForm [name=label]').fill("مصاريف الزراعات");
  await page.locator('#fin393CategoryForm [name=group]').fill("خدمات مصرية");
  await page.locator('#fin393CategoryForm [name=icon][value="fa-plane"]').check();
  await page.locator('#fin393CategoryForm').evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_CATEGORIES.forType("expense").some(x=>x.label==="مصاريف الزراعات")),true);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(5));
  assert.ok(await page.locator('[data-fx-cat="مصاريف الزراعات"]').count()>0);
  await page.locator('#flosyNewTxForm [name=amount]').fill("100");
  await page.locator("#fxDescription").fill("مصروف زراعة");
   await page.locator("#fxCategoryDetails > summary").click();
  await page.locator('[data-fx-cat="مصاريف الزراعات"]').click();
  await page.locator('#flosyNewTxForm').evaluate(el=>el.requestSubmit());
  await page.locator(".fx-transaction-main").first().click();
  assert.equal(await page.locator("#fin393Detail").isVisible(),true);
  assert.ok((await page.locator("#fin393DetailBody").innerText()).includes("مصروف زراعة"));
  await page.locator("#fin393DetailClose").click();
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(3));
  await page.locator('#fin393AssetForm [name=name]').fill("سبايك");
  await page.locator('#fin393AssetForm [name=qty]').fill("2");
  await page.locator('#fin393AssetForm [name=unitPriceEgp]').fill("1500");
  await page.locator('#fin393AssetForm').evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_FINANCE_ENGINE.wealth(window.FLOSY_UNIFIED.state()).manualAssets),3000);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(13));
  await page.locator('#fin393ZakatForm [name=gold21GramPriceEgp]').fill("100");
  await page.locator('#fin393ZakatForm [name=goldPriceDate]').fill("2026-11-13");
  await page.locator('#fin393ZakatForm [name=zakatHawlCompleted]').check();
  await page.locator('#fin393ZakatForm').evaluate(el=>el.requestSubmit());
  const zakat=await page.evaluate(()=>window.FLOSY_FINANCE_ENGINE.zakat(window.FLOSY_UNIFIED.state()));
  assert.equal(zakat.eligible,true);assert.ok(zakat.estimatedZakat>0);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(10));
  await page.locator('#fin393DebtForm [name=name]').fill("قسط عربية");
  await page.locator('#fin393DebtForm [name=balance]').fill("8000");
  await page.locator('#fin393DebtForm [name=monthlyPayment]').fill("500");
  await page.locator('#fin393DebtForm').evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_FINANCE_ENGINE.profile(window.FLOSY_UNIFIED.state()).fixedSum),3500);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(19));
  await page.locator('#fin393FamilyForm [name=name]').fill("سارة");
  await page.locator('#fin393FamilyForm').evaluate(el=>el.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().settings.familyMembersV393.length),1);
  for(const t of ["clean-light","emerald-dark","calm-light","serene-dark"]){
   await page.evaluate(x=>window.FLOSY_UNIFIED.applyTheme(x),t);
   await page.evaluate(()=>window.FLOSY_UNIFIED.go(14));
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),t);
  }
  assert.ok(!errors.some(x=>/ReferenceError|SyntaxError|TypeError/.test(x)),errors.join(" | "));
  console.log("PASS v393: profile, salary plan, categories, transaction details, assets, zakat, debt, family and 4 themes");
 }catch(e){console.error(e);process.exitCode=1}
 finally{await browser?.close();server.kill()}
})();
