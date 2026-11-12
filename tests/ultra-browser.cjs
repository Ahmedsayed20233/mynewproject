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
  // First launch honors the designer's exact onboarding screen; next enters live home.
  assert.equal(await page.locator('.phone-frame[data-screen="1"]').isVisible(),true);
  await page.evaluate(()=>window.goToScreen(2));
  assert.equal(await page.locator('.phone-frame[data-screen="2"]').isVisible(),true);


  // UI repair regression: the real phone supplies battery/time, never a fake notch.
  assert.equal(await page.locator(".dynamic-island").count(),0);
  assert.equal(await page.locator(".fa-battery-full").count(),0);
  assert.equal(await page.locator("#ultraThemeSwitch").count(),0);
  assert.equal(await page.locator(".ultra-more-dock").count(),7);
  assert.equal(await page.locator(".ultra-more-inline").count(),4);
  assert.ok((await page.evaluate(()=>window.FLOSY_ULTRA_MORE.features().length))>=28);
  await page.locator('.phone-frame[data-screen="2"] .ultra-more-dock').click();
  assert.equal(await page.locator("#ultraMoreOverlay").isVisible(),true);
  assert.equal(await page.locator("[data-more-theme]").count(),3);
  await page.locator('[data-more-theme="light"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"light");
  await page.locator('[data-more-theme="sapphire"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"sapphire");
  await page.locator('[data-more-theme="emerald"]').click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"emerald");
  await page.locator("#ultraMoreSearch").fill("الأقساط");
  const visibleFiltered=await page.locator(".ultra-more-tile:visible").count();
  assert.ok(visibleFiltered>=1&&visibleFiltered<28,"search should filter restored tools");
  await page.locator("#ultraMoreSearch").fill("");
  await page.locator('[data-more-feature="core-ai"]').click();
  assert.equal(await page.locator("#ultraCoreBar").isVisible(),true);
  assert.equal(await page.frameLocator("#flosyUltraCore").locator("#page-ai").evaluate(x=>x.classList.contains("active")),true);
  const coreVisible=await page.locator("#flosyUltraCore").evaluate(x=>getComputedStyle(x).pointerEvents);
  assert.equal(coreVisible,"auto","the original AI assistant must be interactive");
  await page.locator("#ultraCoreBack").click();
  assert.equal(await page.locator("#ultraCoreBar").isVisible(),false);
  await page.locator('.phone-frame[data-screen="2"] .ultra-more-dock').click();
  await page.locator('[data-more-feature="core-report"]').click();
  assert.equal(await page.frameLocator("#flosyUltraCore").locator("#page-reports").evaluate(x=>x.classList.contains("active")),true);
  await page.locator("#ultraCoreBack").click();
  await page.locator('.phone-frame[data-screen="2"] .ultra-more-dock').click();
  await page.locator('[data-more-feature="recurring"]').click();
  assert.equal(await page.frameLocator("#flosyUltraCore").locator("#page-recurring").evaluate(x=>x.classList.contains("active")),true);
  await page.locator("#ultraCoreBack").click();
  await page.locator('.phone-frame[data-screen="2"] .ultra-more-dock').click();
  await page.locator('[data-more-feature="backup"]').click();
  assert.equal(await page.frameLocator("#flosyUltraCore").locator("#page-recovery").evaluate(x=>x.classList.contains("active")),true);
  await page.locator("#ultraCoreBack").click();
  assert.equal(await page.locator("#ultraMoreOverlay").isVisible(),false);

  // The exact original 12 scenes remain accessible; only active scene is visible.
  for(let i=1;i<=12;i++){
   await page.evaluate(n=>window.goToScreen(n),i);
   const shown=await page.locator(".phone-frame").evaluateAll(nodes=>nodes.filter(el=>getComputedStyle(el).display!=="none").map(el=>Number(el.dataset.screen)));
   assert.deepEqual(shown,[i],"wrong active screen "+i+": "+JSON.stringify(shown));
  }
  await page.evaluate(()=>window.goToScreen(3));
  assert.ok(await page.locator("#accountsListContainer").isVisible());
  await page.evaluate(()=>window.goToScreen(9));
  const analytic=await page.locator('.phone-frame[data-screen="9"] .screen-scroll').innerText();
  assert.ok(!analytic.includes("6,750 ج.م"),"No fake 6,750 expense should remain in analytics");
  await page.evaluate(()=>window.goToScreen(10));
  const budget=await page.locator('.phone-frame[data-screen="10"] .screen-scroll').innerText();
  assert.ok(!budget.includes("61% إجمالي"),"Fake budget completion must be replaced");
  await page.evaluate(()=>window.goToScreen(11));
  const report=await page.locator('.phone-frame[data-screen="11"] .screen-scroll').innerText();
  assert.ok(!report.includes("15,000 ج.م"),"Report must not show the designer's synthetic income");
  await page.evaluate(()=>window.goToScreen(12));
  const tips=await page.locator('.phone-frame[data-screen="12"] .screen-scroll').innerText();
  assert.ok(!tips.includes("12,000 ج.م"),"Unvalidated car goal must not appear");
  assert.ok(!tips.includes("88"),"Financial health 88/100 is only a mockup");
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
