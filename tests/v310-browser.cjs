"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
const {spawn}=require("node:child_process"),{setTimeout:pause}=require("node:timers/promises");
const BASE="http://127.0.0.1:8191";
(async()=>{
 const server=spawn("python3",["-m","http.server","8191","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser;
 try{
  for(let i=0;i<120;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.FLOSY_UNIFIED?.core()?.FLOSY_BRIDGE&&
   window.FLOSY_UNIFIED.core()?.FLOSY_RECEIPT_EGYPT_V310?.trained&&
   !document.getElementById("flosyLoading"),null,{timeout:60000});
  const baseline=await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;a.go(6);
   const core=a.core(),r=core.FLOSY_CAPTURE.parseReceipt(
    "سوبر ماركت النور\nDate: 2026-11-14\nMilk 2 x 35.00 = 70.00\nالإجمالي: 70.00 جنيه\nنقدي");
   // Mock only OCR text extraction, not the financial parser or review UI.
   core.FLOSY_REPAIR.extractForUnified=async file=>{
    if(!file||typeof file.arrayBuffer!=="function")throw Error("Expected real browser File input");
    return "سوبر ماركت النور\nDate: 2026-11-14\nMilk 2 x 35.00 = 70.00\nالإجمالي: 70.00 جنيه\nنقدي";
   };
   return {total:r.amount,count:a.state().transactions.length,details:r.receiptDetails};
  });
  assert.equal(baseline.total,70);
  assert.equal(baseline.details.modelVersion,"3.10.0");
  assert.equal(baseline.details.coruModel.source,"CORU-IE train.csv");
  assert.equal(baseline.details.coruModel.testAccuracy,.8277);
  assert.equal(baseline.details.needsReview,true);
  assert.ok(await page.locator("#flosyReceiptFile").isVisible());
  // 1x1 local synthetic image exercises gallery import without external OCR provider.
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jSioAAAAASUVORK5CYII=","base64");
  await page.locator("#flosyReceiptFile").setInputFiles({
   name:"synthetic-receipt.png",mimeType:"image/png",buffer:png});
  await page.locator("#flosyV2Form").waitFor({state:"visible",timeout:10000});
  assert.ok(await page.locator("#flosyV310ReceiptPreview").isVisible());
  assert.ok(await page.locator(".flosy-v310-coru-provenance").isVisible());
  const after=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length);
  assert.equal(after,baseline.count,"OCR did not post a transaction without owner confirmation");
  assert.equal(await page.locator('[name="amount-0"]').inputValue(),"70");
  assert.ok(await page.locator(".flosy-v398-line-items input").count()>=3);
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  await page.screenshot({path:"tests/_artifacts/flosy-v310-receipt-review.png"});
  const but=page.locator("[data-coru-apply]").first();
  if(await but.count()){
   const target=await but.getAttribute("data-coru-target");
   await but.click();
   assert.ok((await page.locator('[name="'+target+'"]').inputValue()).length>0);
  }
  await page.locator("[data-v2-cancel]").first().click();
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(6));
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"clean-light");
  assert.equal(errors.filter(s=>/ReferenceError|SyntaxError|TypeError/.test(s)).length,0,errors.join(" | "));
  console.log("PASS Flosy v3.10 CORU trained data, image gallery file preview, bilingual OCR bridge, owner-reviewed ledger");
 }catch(err){console.error(err);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();