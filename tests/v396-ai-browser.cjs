"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const {spawn}=require("node:child_process"),{setTimeout:pause}=require("node:timers/promises");
const fs=require("node:fs");
const BASE="http://127.0.0.1:8176";
(async()=>{
 const server=spawn("python3",["-m","http.server","8176","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser;
 try{
  for(let i=0;i<120;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>!!window.FLOSY_AI_EXPERIENCE_V396 &&
    !!window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE &&
    !document.getElementById("flosyLoading"),null,{timeout:50000});
  await page.evaluate(()=>{
   const api=window.FLOSY_UNIFIED;
   api.core().FLOSY_BRIDGE.mutate(s=>{
    s.accounts.push({id:"qa-ai-cash",name:"كاش تجريبي",type:"cash",opening:25000});
    s.settings=s.settings||{};s.settings.flosyFirstName="عميل";
    s.settings.financeProfileV393={monthlySalary:20000,recurringExtraIncome:0,
      essentialVariableSpend:5500,monthlyDiscretionarySpend:3000,minimumMonthlyBuffer:1000,
      emergencyCash:1000,emergencyMonths:4,investmentHorizonMonths:36,
      monthlyCommitments:[{id:"rent",name:"إيجار",amount:3000,kind:"rent-fixed"}]};
    s.transactions.push({id:"qa-ai-e",type:"expense",amount:340,date:new Date().toISOString().slice(0,10),
      accountId:"qa-ai-cash",description:"قهوة تجريبية",category:"قهوة وكافيهات"});
   });
   window.__aiCalls=[];
   api.startVoice=forAI=>{window.__aiCalls.push(["voice",forAI]);return true};
   api.startReceipt=mode=>{window.__aiCalls.push(["receipt",mode]);return true};
   api.go(8);
  });
  assert.ok(await page.locator(".faix-topbar").isVisible());
  assert.ok(await page.locator(".faix-robot img").isVisible());
  assert.ok((await page.locator(".faix-welcome").innerText()).includes("عميل"));
  assert.ok(await page.locator("#flosyAiInputV396").isVisible());
  assert.equal(await page.locator("[data-ai-tab]").count(),3);
  assert.equal(await page.locator(".faix-chips button").count(),4);
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  await page.screenshot({path:"tests/_artifacts/flosy-ai-v396-chat.png"});
  await page.locator('[data-ai-question="Roast Me"]').click();
  assert.ok((await page.locator("#flosyAiStream").innerText()).length>15);
  const count=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length);
  await page.locator('[data-ai-tab="actions"]').click();
  assert.equal(await page.locator('.faix-actions-grid > button').count(),4);
  await page.screenshot({path:"tests/_artifacts/flosy-ai-v396-actions.png"});
  await page.locator('[data-ai-action="budget"]').click();
  const budget=await page.locator("#faixActionResult").innerText();
  assert.ok(budget.includes("20")||budget.includes("٢٠"),"Budget should reflect real configured salary");
  assert.ok(budget.includes("الطوارئ"),"budget actual: "+budget);
  await page.locator('[data-ai-action="crisis"]').click();
  assert.ok((await page.locator("#faixActionResult").innerText()).includes("صندوق الطوارئ"));
  await page.locator('[data-ai-intent="transfer"]').click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),5);
  assert.equal(await page.locator('.phone-frame[data-screen="5"] select[name="type"]').inputValue(),"transfer");
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),count,
    "Category selection must not post money");
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  await page.locator('[data-ai-tab="actions"]').click();
  await page.locator('.faix-actions-grid [data-ai-action="voice"]').click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),7);
  assert.deepEqual(await page.evaluate(()=>window.__aiCalls.at(-1)),["voice",false]);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  await page.locator('[data-ai-tab="actions"]').click();
  await page.locator('.faix-actions-grid [data-ai-action="receipt"]').click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),6);
  assert.deepEqual(await page.evaluate(()=>window.__aiCalls.at(-1)),["receipt","camera"]);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  await page.locator('[data-ai-tab="insights"]').click();
  assert.ok(await page.locator(".faix-safecard").isVisible());
  assert.ok((await page.locator("#faixInsights").innerText()).includes("قهوة"));
  await page.screenshot({path:"tests/_artifacts/flosy-ai-v396-insights.png"});
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length),count);
  assert.equal(errors.filter(x=>/TypeError|ReferenceError|SyntaxError/.test(x)).length,0,errors.join(" | "));
  console.log("PASS v3.9.6: AI robot/chat, 4 real actions, local budgeting/crisis, voice/OCR routing, safe classification, 3 tabs, real-data insights");
 }catch(err){console.error(err);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();
