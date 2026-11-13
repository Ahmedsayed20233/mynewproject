"use strict";
const {chromium}=require("playwright"),fs=require("node:fs"),assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const {setTimeout:pause}=require("node:timers/promises");
const root="http://127.0.0.1:8139";
(async()=>{
 const server=spawn("python3",["-m","http.server","8139","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser,page;
 try{
  for(let i=0;i<80;i++){try{if((await fetch(root+"/flosy.html")).ok)break}catch{}
   await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  page=await context.newPage();
  const fatal=[];page.on("pageerror",e=>fatal.push(String(e.message)));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
  await page.goto(root+"/flosy.html",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>!!window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE&&!document.getElementById("flosyLoading"),null,{timeout:50000});
  assert.equal(await page.locator(".phone-frame").count(),20);
  assert.equal(await page.locator(".dynamic-island").count(),0);
  assert.equal(await page.locator(".fa-battery-full").count(),0);
  assert.ok((await page.locator(".phone-frame.flosy-active").count())===1);
  const values=await page.evaluate(()=>({
   screen:window.FLOSY_UNIFIED.getCurrentScreen(),
   accounts:window.FLOSY_UNIFIED.state().accounts?.length,
   total:window.FLOSY_UNIFIED.summary().total,
   width:document.documentElement.scrollWidth}));
  assert.equal(values.screen,1);
  assert.ok(values.width<=392,"horizontal overflow "+JSON.stringify(values));
  await page.locator("#flosyStartButton").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),2);
  await page.evaluate(()=>{
   const C=window.FLOSY_UNIFIED.core().FLOSY_BRIDGE;
   C.mutate(s=>{
     s.accounts.push({id:"qa-cash",name:"الكاش",opening:300000,type:"cash"});
   });
   window.FLOSY_UNIFIED.setDefaultAccount("qa-cash");
   window.FLOSY_UNIFIED.renderAll();
  });
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(5));
  await page.locator("#flosyNewTxForm [name=amount]").fill("250");
  await page.locator("#flosyNewTxForm [name=description]").fill("اشتريت بنزين للعربية");
  await page.locator("#flosyNewTxForm").evaluate(el=>el.requestSubmit());
  await page.waitForFunction(()=>window.FLOSY_UNIFIED.state().transactions?.some(x=>x.description==="اشتريت بنزين للعربية"),null,{timeout:10000});
  const booked=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.find(x=>x.description==="اشتريت بنزين للعربية"));
  assert.equal(booked.icon,"fa-gas-pump");
  assert.equal(booked.amount,250);
  const balance=await page.evaluate(()=>window.FLOSY_UNIFIED.summary().total);
  assert.equal(balance,299750);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(4));
  assert.ok((await page.locator("#flosyLiveTransactionList").innerText()).includes("اشتريت بنزين للعربية"));
  await page.locator("#flosyTxSearch").fill("بنزين");
  assert.ok((await page.locator("#flosyLiveTransactionList .fx-transaction").count())===1);
  await page.locator("#flosyUndoButton").click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.some(x=>x.description==="اشتريت بنزين للعربية")),false);
  // Each of 20 designer screens navigates in-place without a separate Ultra/pro shell.
  for(let i=1;i<=20;i++){
   await page.evaluate(id=>window.FLOSY_UNIFIED.go(id),i);
   assert.equal(await page.locator(".phone-frame.flosy-active").count(),1);
   assert.equal(await page.locator(".phone-frame.flosy-active").getAttribute("data-screen"),String(i));
   assert.ok(await page.locator(".phone-frame.flosy-active .flosy-real").count()>0);
  }
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(16));
  assert.equal(await page.locator("[data-theme-select]").count(),4);
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  for(const [theme,img] of [["clean-light","unified-clean-light.png"],
     ["emerald-dark","unified-emerald-dark.png"],
     ["calm-light","unified-calm-light.png"],
     ["serene-dark","unified-serene-dark.png"]]){
   await page.locator('[data-theme-select="'+theme+'"]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   await page.evaluate(()=>window.FLOSY_UNIFIED.go(2));
   await page.screenshot({path:"tests/_artifacts/"+img});
   await page.evaluate(()=>window.FLOSY_UNIFIED.go(16));
  }
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  assert.ok(await page.locator("#flosyAiUnifiedInput").isVisible());
  const reply=await page.evaluate(()=>window.FLOSY_UNIFIED_AI.ask("صرفت كام الشهر ده؟"));
  assert.ok(typeof reply.text==="string"&&reply.text.length>10);
  // Legacy advanced reports and settings must inherit the same theme.
  await page.evaluate(()=>window.FLOSY_UNIFIED.openFeature("reports","التقارير"));
  assert.equal(await page.locator("#flosyLegacyPanel").evaluate(x=>x.classList.contains("open")),true);
  assert.equal(await page.frameLocator("#flosyCoreFrame").locator("#page-reports").evaluate(x=>x.classList.contains("active")),true);
  const coreTheme=await page.frameLocator("#flosyCoreFrame").locator("html").getAttribute("data-theme");
  assert.equal(coreTheme,"serene-dark");
  await page.locator("#flosyLegacyBack").click();
  assert.equal(await page.locator("#flosyLegacyPanel").evaluate(x=>x.classList.contains("open")),false);
  assert.ok(!fatal.some(x=>/ReferenceError|TypeError|SyntaxError/.test(x)),"fatal JS errors: "+fatal.join(" | "));
  console.log("PASS: 20 original screens, four themes, real ledger capture & undo, AI and unified reports");
 }catch(err){
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  if(page)await page.screenshot({path:"tests/_artifacts/unified-failure.png"}).catch(()=>{});
  console.error(err);process.exitCode=1;
 }finally{if(browser)await browser.close();server.kill();}
})();
