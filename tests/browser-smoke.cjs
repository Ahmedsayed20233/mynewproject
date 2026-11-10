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

  // 1) Free assistant really allows asking without signing into Supabase.
  await page.evaluate(()=>window.FLOSY_BRIDGE.goto("ai"));
  const freeOption=await page.locator("#flosyAiMode").inputValue();
  assert.equal(freeOption,"free","Free assistant must be selected by default");
  await page.locator("#flosyAiQuestion").fill("إزاي أجهز صندوق الطوارئ؟");
  await page.locator("#flosyAiForm button[type=submit]").click();
  const reply=await page.locator("#flosyAiMessages").innerText();
  assert.match(reply,/صندوق الطوارئ|تغطية 3 أشهر/);
  assert.match(reply,/Flosy المحلي|مساعد فلوسي المحلي المجاني/);

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
  const activityDiagnostic=await page.evaluate(()=>{
    const el=document.getElementById("flosyElevateTransactions");
    const initial=el?.innerHTML.length??-1;
    let result="ok";
    try{window.FLOSY_ELEVATE.render()}catch(e){result=String(e.stack||e)}
    return {rootExists:!!el,initial,after:el?.innerHTML.length??-1,
      periodButtons:document.querySelectorAll('button[data-u-period]').length,
      module:typeof window.FLOSY_ELEVATE,errors:result};
  });
  console.log("ELEVATE ACTIVITY DIAGNOSTIC",JSON.stringify(activityDiagnostic));
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
