"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const {spawn}=require("node:child_process"),{setTimeout:pause}=require("node:timers/promises");
const BASE="http://127.0.0.1:8152";
(async()=>{
 const server=spawn("python3",["-m","http.server","8152","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser,page;
 try{
  for(let i=0;i<100;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>!!window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE&&
    !!window.FLOSY_SERVICES_V392&&!document.getElementById("flosyLoading"),null,{timeout:45000});
  await page.evaluate(()=>{
   const api=window.FLOSY_UNIFIED,ledger=api.core().FLOSY_BRIDGE;
   ledger.mutate(s=>{
    s.accounts.push({id:"qa-v392-cash",name:"الكاش",type:"cash",opening:9000});
    s.settings=s.settings||{};s.settings.flosyFirstName="أحمد";
    s.transactions.push({id:"qa-v392-e1",type:"expense",date:"2026-11-13",category:"قهوة وكافيهات",
      amount:75,accountId:"qa-v392-cash",description:"قهوة الصبح"});
    s.transactions.push({id:"qa-v392-i1",type:"income",date:"2026-11-13",category:"مرتب",
      amount:1000,accountId:"qa-v392-cash",description:"مرتب"});
   });
   window.__msgs=[];
   window.FLOSY_NATIVE_ANDROID=true;
   window.FLOSY_NATIVE_BRIDGE_AVAILABLE=true;
   window.FlosyNative={postMessage:x=>window.__msgs.push(JSON.parse(x))};
   api.go(15);
  });
  await page.locator("#flosyReportFrom").fill("2026-11-01");
  await page.locator("#flosyReportTo").fill("2026-11-13");
  await page.locator('[data-kind="pdf"]').click();
  const pdf=await page.evaluate(()=>{
   const msgs=window.__msgs.filter(x=>x.action.startsWith("pdf-"));
   return {first:msgs[0],last:msgs.at(-1),chunks:msgs.filter(x=>x.action==="pdf-chunk")
    .map(x=>x.data)};
  });
  assert.equal(pdf.first.action,"pdf-start");
  assert.equal(pdf.first.filename,"Flosy-2026-11-01-2026-11-13.pdf");
  assert.equal(pdf.last.action,"pdf-finish");
  const document=JSON.parse(Buffer.concat(pdf.chunks.map(s=>Buffer.from(s,"base64"))).toString("utf8"));
  assert.equal(document.rows.length,2);
  assert.equal(document.expense,7500);
  assert.ok((await page.locator("#flosyReportStatus").innerText()).includes("PDF"));
  await page.locator('[data-kind="excel"]').click();
  const xl=await page.evaluate(()=>{
   const msgs=window.__msgs.filter(x=>x.action.startsWith("xlsx-"));
   return {first:msgs[0],last:msgs.at(-1),chunks:msgs.filter(x=>x.action==="xlsx-chunk").map(x=>x.data)};
  });
  assert.equal(xl.first.filename,"Flosy-2026-11-01-2026-11-13.xlsx");
  assert.equal(xl.last.action,"xlsx-finish");
  const archive=Buffer.concat(xl.chunks.map(x=>Buffer.from(x,"base64")));
  assert.equal(archive.readUInt32LE(0),0x04034b50);
  assert.ok(archive.includes(Buffer.from("xl/styles.xml")));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  const advice=await page.evaluate(()=>window.FLOSY_UNIFIED_AI.ask("نصيحة اليوم"));
  assert.equal(advice.intent,"daily-advice");
  assert.ok(advice.text.includes("أحمد"));
  const roast=await page.evaluate(()=>window.FLOSY_UNIFIED_AI.ask("Roast Me"));
  assert.equal(roast.intent,"roast");
  assert.ok(roast.text.includes("قهوة"));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(16));
  assert.deepEqual(await page.evaluate(()=>window.FLOSY_SCREEN_MAP_V395.audit()),
    {screens:20,primary:8,details:10,advanced:9});
  assert.equal(await page.locator(".service-v392-item[data-service-primary]").count(),8);
  assert.equal(await page.locator(".service-v392-item[data-service-detail]").count(),10);
  assert.equal(await page.locator(".service-v392-item[data-service-advanced]").count(),9);
  assert.equal(await page.locator(".service-v392-item:visible").count(),8);
  await page.locator("#servicesV392Search").fill("تقاريري");
  assert.equal(await page.locator(".service-v392-item:visible").count(),1);
  await page.locator("#servicesV392Search").fill("تقويم السيولة");
  assert.ok(await page.locator('[data-service-detail][data-flosy-screen="18"]').isVisible(),
    "Search should show internal calendar");
  await page.locator('[data-service-detail][data-flosy-screen="18"]').click();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.getCurrentScreen()),18);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(16));
  await page.locator("#servicesV392Search").fill("");
  await page.locator('[data-sfilter="ai"]').click();
  assert.ok((await page.locator(".service-v392-item[data-service-primary]:visible").count())>=2);
  await page.locator('[data-sfilter="all"]').click();
  await page.locator('[data-notify-action="daily"]').click();
  assert.ok(await page.evaluate(()=>window.__msgs.some(m=>m.action==="notifications-daily-enable")));
  await page.evaluate(()=>window.FLOSY_NOTIFY_V392.nativeStatus({enabled:true,dailyEnabled:true,permission:"granted"}));
  assert.ok((await page.locator("#flosyNotificationStatus").innerText()).includes("مفعّلة"));
  await page.locator(".service-v392-fold:has(#flosyFirstNameForm) > summary").click();
  await page.locator("#flosyFirstNameForm input[name=firstName]").fill("محمود");
  await page.locator("#flosyFirstNameForm").evaluate(e=>e.requestSubmit());
  assert.equal(await page.evaluate(()=>window.FLOSY_COPILOT.name(window.FLOSY_UNIFIED.state())),"محمود");
  for(const theme of ["clean-light","emerald-dark","calm-light","serene-dark"]){
   await page.evaluate(t=>window.FLOSY_UNIFIED.applyTheme(t),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
  }
  assert.equal(errors.filter(x=>/SyntaxError|ReferenceError|TypeError/.test(x)).length,0,errors.join(" | "));
  console.log("PASS: PDF/Excel native chunks, real ledger, named AI/Roast Me, eight workspaces with nested tools, notifications & 4 themes");
 }catch(err){console.error(err);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();
