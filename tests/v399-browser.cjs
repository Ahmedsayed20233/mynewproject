"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const {spawn}=require("node:child_process"),{setTimeout:pause}=require("node:timers/promises");
const BASE="http://127.0.0.1:8189";
(async()=>{
 const server=spawn("python3",["-m","http.server","8189","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser;
 try{
  for(let i=0;i<120;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await pause(100);}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.FLOSY_EXPERIENCE_V399&&window.FLOSY_AI_BRAIN_V399&&
    window.FLOSY_UNIFIED?.core()?.FLOSY_BRIDGE&&!document.getElementById("flosyLoading"),null,{timeout:60000});
  await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;
   a.go(2);window.__testTheme="emerald-dark";a.applyTheme(window.__testTheme);
   const bank=a.accounts().find(x=>x.name==="صندوق الندى");
   if(!bank)a.createAccount({name:"صندوق الندى",opening:5000,type:"cash"});
   a.go(2);
  });
  assert.equal(await page.locator('.phone-frame.flosy-active .flosy-nav399 button').count(),5);
  assert.ok(await page.locator(".flosy-v399-home-capture").isVisible());
  const newCapture=page.locator('.flosy-v399-home-capture [data-flosy-screen="7"]');
  await newCapture.click();
  assert.ok(await page.locator(".flosy-v399-voice-opt input").isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"emerald-dark");
  await page.locator(".flosy-v399-voice-opt input").check();
  assert.equal(await page.evaluate(()=>window.FLOSY_UNIFIED.voiceAutoEnabled()),true);
  const state=await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED,ledger=a.core().FLOSY_BRIDGE;
   const count=a.state().transactions.length;
   // Unclear speech must never mutate ledger, but must open editable correction.
   const parsed=a.fromVoiceText("هشتري حاجة 75 جنيه بكرة");
   return {count,after:a.state().transactions.length,blocked:parsed[0].intent};
  });
  assert.equal(state.after,state.count);
  assert.ok(await page.locator("#flosyV399CorrectedVoice").isVisible());
  await page.locator("#flosyV399CorrectedVoice").fill("دفعت 75 جنيه قهوة من صندوق الندى");
  await page.locator("[data-v399-reanalyse]").click();
  assert.ok(await page.locator("#flosyV2Form").isVisible());
  assert.ok(await page.locator("#flosyV399CorrectedVoice").isVisible());
  await page.locator("[data-v2-cancel]").first().click();
  const direct=await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED,script="دفعت 75 جنيه قهوة من صندوق الندى";
   const before=a.state().transactions.length;
   const analyses=window.FLOSY_VOICE_SAFETY_V2.analyzeBatch(script,a.accounts(),a.date());
   const gate=window.FLOSY_VOICE_AUTO_V399.decide(analyses,{enabled:true,accounts:a.accounts(),today:a.date()});
   return {gate,analysis:analyses[0],before};
  });
  assert.equal(direct.gate.accepted,true,JSON.stringify(direct));
  const persisted=await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;
   const sample="دفعت 75 جنيه قهوة من صندوق الندى";
   const booked=a.fromVoiceText(sample);
   return {newCount:a.state().transactions.length,direct:booked.autoSaved?.length||0,
    added:a.state().transactions.at(-1)};
  });
  assert.equal(persisted.direct,1,"Clear owner-opted speech should save to canonical ledger");
  assert.equal(persisted.newCount,direct.before+1);
  assert.equal(persisted.added.amount,75);
  assert.ok(persisted.added.source.includes("voice_auto"));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(7));
  const savedNow=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.length);
  assert.equal(savedNow,direct.before+1);
  const dup=await page.evaluate(()=>{
   try{window.FLOSY_UNIFIED.fromVoiceText("دفعت 75 جنيه قهوة من صندوق الندى");return false}
   catch{return true}
  });
  assert.equal(dup,true,"same speech callback in 5m should not deduct a second time");

  const q=await page.evaluate(()=>{
   const a=window.FLOSY_UNIFIED;
   a.go(8);
   const got=window.FLOSY_UNIFIED_AI.respond("ازاي أسجل عملية بالصوت؟");
   return {intent:got.intent,links:got.actions?.map(z=>z.screen)||[]};
  });
  assert.equal(q.intent,"v399-help-capture");
  assert.ok(q.links.includes(7));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(4));
  assert.equal(await page.locator('.phone-frame.flosy-active .flosy-nav399 [aria-current="page"]').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"emerald-dark");
  await page.evaluate(()=>window.FLOSY_UNIFIED.applyTheme("clean-light"));
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(2));
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),"clean-light");
  assert.ok(await page.locator(".phone-frame.flosy-active .flosy-v399-home-capture .flosy-v399-capture").isVisible());
  assert.equal(errors.filter(x=>/TypeError|ReferenceError|SyntaxError/.test(x)).length,0,errors.join(" | "));
  console.log("PASS Flosy v3.9.9: shared navigation, theme persistence, opt-in voice, repair, grounded AI routes");
 }catch(e){console.error(e);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill();}
})();