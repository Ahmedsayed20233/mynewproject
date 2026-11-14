"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
const {spawn}=require("node:child_process"),{setTimeout:wait}=require("node:timers/promises");
const BASE="http://127.0.0.1:8193";
(async()=>{
 const srv=spawn("python3",["-m","http.server","8193","--bind","127.0.0.1"],{stdio:"ignore"});let browser;
 try{
  for(let i=0;i<120;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await wait(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",acceptDownloads:true});
  const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.FLOSY_UNIFIED?.core()?.FLOSY_BRIDGE&&
   window.FLOSY_REPORT_PLUS_V311&&window.FLOSY_REPORT_PRO&&!document.getElementById("flosyLoading"),null,{timeout:60000});
  await page.evaluate(()=>{
   const u=window.FLOSY_UNIFIED,bridge=u.core().FLOSY_BRIDGE;
   const aid=u.accounts()[0]?.id;
   if(!aid)throw Error("No seeded QA account");
   bridge.mutate(s=>{
    s.transactions=s.transactions||[];
    s.transactions.push(
     {id:"v311-a",date:"2026-11-02",type:"income",amount:4000,accountId:aid,category:"مرتب",description:"راتب اختبار"},
     {id:"v311-b",date:"2026-11-03",type:"expense",amount:700,accountId:aid,category:"طعام",description:"مصروفات المنزل"},
     {id:"v311-c",date:"2026-11-04",type:"expense",amount:90,accountId:aid,category:"مواصلات",description:"بنزين"},
     {id:"v311-d",date:"2026-11-05",type:"transfer",amount:500,accountId:aid,category:"تحويل",description:"تحويل داخلي"},
     {id:"v311-e",date:"2026-11-06",type:"expense",amount:90000,accountId:aid,category:"طعام",status:"pending",description:"معلقة"}
    );
   });
   u.go(15);
  });
  await page.waitForSelector("#flosyReportLivePreview .report311-kpis",{timeout:20000});
  assert.ok(await page.locator('.flosy-report-ui-v311').isVisible());
  assert.equal(await page.locator('.report311-files button').count(),3);
  if(await page.locator("#cx312ReportAdvanced").count())await page.locator("#cx312ReportAdvanced summary").click();
  await page.locator("#flosyReportFrom").fill("2026-11-01");
  await page.locator("#flosyReportTo").fill("2026-11-14");
  await page.locator("#flosyReportTo").dispatchEvent("change");
  const report=await page.evaluate(()=>window.FLOSY_REPORT_PRO.build(window.FLOSY_REPORT_PLUS_V311.currentFilters()));
  assert.ok(report.rows.some(r=>r.id==="v311-a"));
  assert.ok(!report.rows.some(r=>r.id==="v311-e"));
  assert.ok(report.timeline.length>=1);
  const [csv]=await Promise.all([page.waitForEvent("download"),page.locator('.report311-files [data-kind="csv"]').click()]);
  assert.ok(csv.suggestedFilename().endsWith(".csv"));
  const csvBytes=fs.readFileSync(await csv.path());assert.equal(csvBytes[0],0xef);
  assert.ok(csvBytes.toString("utf8").includes("مصروفات المنزل"));
  const [excel]=await Promise.all([page.waitForEvent("download"),page.locator('.report311-files [data-kind="excel"]').click()]);
  assert.ok(excel.suggestedFilename().endsWith(".xlsx"));
  const workbook=fs.readFileSync(await excel.path());
  assert.equal(workbook.subarray(0,2).toString(),"PK");
  assert.ok(workbook.toString("latin1").includes("sheet8.xml"));
  await page.evaluate(()=>window.print=()=>window.__v311Printed=true);
  await page.locator('.report311-files [data-kind="pdf"]').click();
  assert.equal(await page.evaluate(()=>window.__v311Printed),true);
  assert.ok(await page.locator("#flosyUnifiedPrint .flosy-report-pro").count());
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  await page.screenshot({path:"tests/_artifacts/flosy-v311-reports-mobile.png"});
  await page.locator('[data-report-preset="week"]').click();
  assert.equal(await page.locator('[data-report-preset="week"]').getAttribute("aria-pressed"),"true");
  await page.locator("#flosyReportType").selectOption("expense");
  assert.ok(await page.locator("#flosyReportLivePreview").textContent());
  assert.equal(errors.filter(e=>/SyntaxError|ReferenceError|TypeError/.test(e)).length,0,errors.join(" | "));
  console.log("PASS Flosy v3.11 reports: dashboard, periods, posted ledger, real CSV and XLSX, browser PDF print");
 }catch(e){console.error(e);process.exitCode=1}
 finally{if(browser)await browser.close();srv.kill()}
})();