"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {chromium}=require("playwright"),{spawn}=require("node:child_process");
const {setTimeout:wait}=require("node:timers/promises"),BASE="http://127.0.0.1:8194";
(async()=>{
 let browser;const server=spawn("python3",["-m","http.server","8194","--bind","127.0.0.1"],{stdio:"ignore"});
 try{
  let online=false;
  for(let i=0;i<130;i++){try{online=(await fetch(BASE+"/flosy.html")).ok;if(online)break}catch{}await wait(100)}
  assert.ok(online,"http server unavailable");
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.stack||e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.FLOSY_UNIFIED?.core()?.FLOSY_BRIDGE&&
   window.FLOSY_CUSTOMER_V312&&window.FLOSY_CUSTOMER_COACH_V312?.install,null,{timeout:75000});
  await page.evaluate(()=>{
   try{localStorage.setItem("flosy_onboarding_39","yes")}catch{}
   const a=window.FLOSY_UNIFIED;
   if(!a.accounts().length)a.core().FLOSY_BRIDGE.mutate(s=>{
    s.accounts=[...(s.accounts||[]),{id:"cx312-cash",name:"الكاش",opening:7000,type:"cash",createdAt:"2026-11-14T12:00:00Z"}];
   });
   a.go(2);
  });
  await page.waitForSelector(".cx312-home .cx312-safe",{timeout:25000});
  assert.ok(await page.locator(".cx312-home").isVisible());
  assert.equal(await page.locator('.phone-frame.flosy-active .flosy-nav399 button').count(),5);
  await page.locator('.phone-frame.flosy-active .flosy-nav399 button[data-ux312-quick="expense"]').click();
  await page.waitForSelector("#cx312QuickForm");
  assert.ok(await page.locator('.cx312-overlay[aria-modal="true"]').isVisible());
  await page.locator('[data-ux312-preset="قهوة"]').click();
  await page.locator('#cx312QuickForm input[name="amount"]').fill("75");
  await page.locator("#cx312QuickSave").click();
  await page.waitForSelector("#cx312Overlay",{state:"detached",timeout:12000});
  const posted=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.filter(x=>x.source==="flosy312_quick_add"));
  assert.equal(posted.length,1);assert.equal(posted[0].type,"expense");
  assert.equal(posted[0].amount,75);
  assert.ok(posted[0].description.includes("قهوة"));
  assert.ok(await page.locator("#flosyUndoBox").isVisible());
  await page.locator("#flosyUndoButton").click();
  const undone=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.filter(x=>x.source==="flosy312_quick_add"));
  assert.equal(undone.length,0,"undo must revert an actual ledger mutation");
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(15));
  await page.waitForSelector("#cx312ReportAdvanced",{timeout:16000});
  assert.equal(await page.locator("#cx312ReportAdvanced").getAttribute("open"),null);
  await page.locator("#cx312ReportAdvanced summary").click();
  await page.locator("#flosyReportFrom").fill("2026-11-01");
  await page.locator("#flosyReportTo").fill("2026-11-14");
  await page.locator("#flosyReportTo").dispatchEvent("change");
  const [csv]=await Promise.all([page.waitForEvent("download"),page.locator('.report311-files [data-kind="csv"]').click()]);
  assert.ok(csv.suggestedFilename().endsWith(".csv"));
  const bytes=fs.readFileSync(await csv.path());assert.equal(bytes[0],0xef);
  const [excel]=await Promise.all([page.waitForEvent("download"),page.locator('.report311-files [data-kind="excel"]').click()]);
  assert.ok(excel.suggestedFilename().endsWith(".xlsx"));
  assert.equal(fs.readFileSync(await excel.path()).subarray(0,2).toString(),"PK");
  await page.evaluate(()=>window.print=()=>window.__cx312Printed=true);
  await page.locator('.report311-files [data-kind="pdf"]').click();
  assert.equal(await page.evaluate(()=>window.__cx312Printed),true);
  assert.ok(await page.locator("#flosyUnifiedPrint .flosy-report-pro").count());
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  await page.waitForSelector(".cx312-ai-prompts");
  const ai=await page.evaluate(()=>window.FLOSY_AI_BRAIN_V399.answer("إزاي أوفر الشهر الجاي؟",
     window.FLOSY_UNIFIED.state(),window.FLOSY_UNIFIED.summary(),new Date(2026,10,14)));
  assert.ok(ai&&typeof ai.text==="string"&&ai.text.length>15);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(6));
  assert.ok(await page.locator("button[data-flosy-action='receipt'][data-mode='camera']").count());
  assert.ok(await page.locator("details.cx312-optional summary").filter({hasText:"نص الفاتورة"}).count());
  await page.evaluate(()=>window.FLOSY_UNIFIED.applyTheme("serene-dark"));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(2));
  assert.equal(await page.locator("html").getAttribute("data-theme"),"serene-dark");
  await page.locator(".cx312-home").screenshot({path:"tests/_artifacts/flosy-v312-home-390px.png"});
  assert.equal(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)).length,0,errors.join(" | "));
  console.log("PASS v3.12 home, five tabs, real quick expense, undo, CSV/XLSX/PDF, AI, OCR route and theme");
 }catch(e){console.error(e);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();