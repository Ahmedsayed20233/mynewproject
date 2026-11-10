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
  const details=await page.locator("#v4-capture-review").innerText();
  assert.match(details,/125/,"Expected parsed total review");
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
