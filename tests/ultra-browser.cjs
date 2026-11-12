"use strict";
/* Real Chromium acceptance checks for designer-supplied 12-screen HTML.
 * All financial data is synthetic and stays on a local HTTP server.
 */
const {spawn}=require("node:child_process"),fs=require("node:fs"),assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {setTimeout:delay}=require("node:timers/promises");
const ORIGIN="http://127.0.0.1:8127";
(async()=>{
 const server=spawn("python3",["-m","http.server","8127","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser,page;
 try{
  for(let i=0;i<60;i++){try{const r=await fetch(ORIGIN+"/flosy-ultra.html");if(r.ok)break}catch{}
   await delay(130)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:356,height:760},acceptDownloads:true,serviceWorkers:"block"});
  page=await context.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  // External Tailwind script is a required design asset: let it load online.
  await page.goto(ORIGIN+"/flosy-ultra.html",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>!!window.FLOSY_ULTRA_CORE?.FLOSY_BRIDGE&&document.body.classList.contains("ultra-ready"),{timeout:45000});
  assert.equal(await page.locator(".phone-frame").count(),12);
  const initial=await page.evaluate(()=>({
   live:document.body.classList.contains("ultra-live"),theme:document.documentElement.dataset.theme,
   safe:document.getElementById("homeSafeBalance")?.textContent,
   app:window.FLOSY_ULTRA?.getSummary()?.total,
   core:window.FLOSY_ULTRA_CORE?.FLOSY_BRIDGE?.getState().transactions?.length,
   width:document.documentElement.scrollWidth
  }));
  assert.equal(initial.live,true);
  assert.equal(initial.theme,"emerald");
  assert.equal(initial.app,0);
  assert.ok(!String(initial.safe).includes("8,250"),"Design sample balances must not appear as real");
  assert.ok(initial.width<=358,"Ultra mobile body should not overflow viewport "+JSON.stringify(initial));
  assert.equal(await page.locator('.phone-frame[data-screen="2"]').isVisible(),true);

  // The exact original 12 scenes remain accessible; only active scene is visible.
  for(let i=1;i<=12;i++){
   await page.evaluate(n=>window.goToScreen(n),i);
   const shown=await page.locator(".phone-frame").evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=="none").map(el=>Number(el.dataset.screen)));
   assert.deepEqual(shown,[i],"wrong active screen "+i+": "+JSON.stringify(shown));
  }
  await page.evaluate(()=>window.goToScreen(3));
  assert.ok(await page.locator("#accountsListContainer").isVisible());
  const before=await page.evaluate(()=>window.FLOSY_ULTRA_CORE.FLOSY_BRIDGE.getState().transactions.length);
  await page.evaluate(()=>window.goToScreen(5));
  await page.locator("#inputTxAmount").fill("75");
  await page.locator("#inputTxNote").fill("ULTRA_BROWSER_QA_EXPENSE");
  await page.locator('.phone-frame[data-screen="5"] button[onclick="saveCustomTransaction()"]').click();
  await page.waitForFunction(()=>window.FLOSY_ULTRA_CORE.FLOSY_BRIDGE.getState().transactions
   .some(x=>x.description==="ULTRA_BROWSER_QA_EXPENSE"),{timeout:10000});
  const row=await page.evaluate(()=>window.FLOSY_ULTRA_CORE.FLOSY_BRIDGE.getState().transactions
   .find(x=>x.description==="ULTRA_BROWSER_QA_EXPENSE"));
  assert.equal(row.amount,75);assert.equal(row.type,"expense");
  const after=await page.evaluate(()=>window.FLOSY_ULTRA_CORE.FLOSY_BRIDGE.getState().transactions.length);
  assert.equal(after,before+1,"Only one canonical ledger row may be created");

  // Original visual samples (e.g. scanned receipt for 280 EGP) must never book money.
  await page.evaluate(()=>window.goToScreen(6));
  await page.locator('.phone-frame[data-screen="6"] button[onclick="captureReceiptTransaction()"]').click();
  await delay(150);
  const afterReceipt=await page.evaluate(()=>window.FLOSY_ULTRA_CORE.FLOSY_BRIDGE.getState().transactions.length);
  assert.equal(afterReceipt,after);
  // Local Egyptian AI answer uses the newly recorded ledger, not hardcoded advice.
  await page.evaluate(()=>window.goToScreen(8));
  const reply=await page.evaluate(()=>window.FLOSY_ULTRA_AI.ask("صرفت كام الشهر ده؟"));
  assert.ok(typeof reply==="string"&&reply.length>20);
  assert.ok(await page.locator("#flosyUltraAvatar").isVisible());
  assert.ok(await page.locator("#flosyAiMic").isVisible());

  fs.mkdirSync("tests/_artifacts",{recursive:true});
  for(const [theme,filename] of [["emerald","ultra-emerald-356.png"],["light","ultra-daylight-356.png"],["sapphire","ultra-sapphire-356.png"]]){
   await page.evaluate(t=>{window.FLOSY_ULTRA.theme(t);window.goToScreen(2)},theme);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   await page.screenshot({path:"tests/_artifacts/"+filename,fullPage:false});
  }
  // A fresh screenshot of the AI character is useful for actual device design review.
  await page.evaluate(()=>window.goToScreen(8));
  await page.screenshot({path:"tests/_artifacts/ultra-ai-avatar-356.png"});
  assert.ok(!errors.some(x=>/ReferenceError|SyntaxError|TypeError/.test(x)),
   "Unhandled Ultra errors: "+errors.join(" | "));
  console.log("PASS: original 12 views, 3 exact themes, synthetic real-ledger save, receipt non-posting, Egyptian AI voice UI");
 }catch(error){
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  if(page)await page.screenshot({path:"tests/_artifacts/ultra-failure.png"}).catch(()=>{});
  console.error(error);process.exitCode=1;
 }finally{
  if(browser)await browser.close();
  server.kill();
 }
})();
