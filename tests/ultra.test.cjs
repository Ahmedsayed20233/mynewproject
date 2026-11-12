"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const U=require("../flosy-ultra-data.js");
const html=fs.readFileSync("flosy-ultra.html","utf8");
const css=fs.readFileSync("flosy-ultra-live.css","utf8");
const ui=fs.readFileSync("flosy-ultra-live.js","utf8");
const ai=fs.readFileSync("flosy-ultra-ai.js","utf8");
const xml=fs.readFileSync("service-worker.js","utf8");

test("all 12 original designer frames preserved, in RTL, on exact reference scale",()=>{
 assert.match(html,/lang="ar" dir="rtl"/);
 const screens=[...html.matchAll(/class="phone-frame"\s+data-screen="(\d{1,2})"/g)].map(x=>Number(x[1]));
 assert.deepEqual(screens,Array.from({length:12},(_,i)=>i+1));
 assert.match(html,/width:\s*356px/);assert.match(html,/height:\s*760px/);
 assert.match(html,/border-radius:\s*46px/);assert.match(css,/--ultra-screen-pad:16px/);
 assert.match(html,/font-variant-numeric:\s*tabular-nums/);
});

test("all three original color token families are unchanged",()=>{
 for(const [theme,colors] of [
  ["emerald",["#0B1324","#10B981","#0EA5E9","#F59E0B"]],
  ["light",["#F8FAFC","#059669","#0284C7"]],
  ["sapphire",["#0C142C","#38BDF8","#FBBF24"]]
 ]){
  assert.ok(html.includes('[data-theme="'+theme+'"]'),theme);
  for(const c of colors)assert.ok(html.includes(c),theme+" "+c);
 }
 assert.match(ui,/flosy_ultra_theme_v1/);
 assert.match(ui,/ultra-theme/);
});

test("invalid and unposted ledger transactions never appear as spend",()=>{
 const state={accounts:[{id:"cash",name:"كاش",opening:1000}],
  transactions:[
   {date:"2026-11-12",type:"expense",amount:140,category:"مواصلات",accountId:"cash"},
   {date:"2026-11-12",type:"expense",amount:600,category:"مطعم ووجبات",status:"pending",accountId:"cash"},
   {date:"2026-11-12",type:"transfer",amount:200,category:"حساب",accountId:"cash"},
   {date:"2026-11-12",type:"income",amount:1000,category:"مرتب",accountId:"cash"},
   {date:"2026-11-12",type:"expense",amount:-90,accountId:"cash"}
  ]};
 const r=U.summary(state,{start:"2026-11-01",end:"2026-11-30"},{cash:1660},{safe:220,daily:22});
 assert.equal(r.expense,140);assert.equal(r.income,1000);
 assert.equal(r.net,860);assert.equal(r.safe,220);assert.equal(r.daily,22);
 assert.equal(r.total,1660);assert.equal(r.transactions.length,3);
 assert.equal(r.categories[0].name,"المواصلات");
});

test("no user accounts means no fabricated 42,600 EGP wealth",()=>{
 const r=U.summary({accounts:[],transactions:[],settings:{}},U.periodRange("month"),{},{});
 assert.equal(r.total,0);assert.equal(r.hasAccounts,false);
 assert.equal(r.income,0);assert.equal(r.expense,0);
 assert.equal(r.savings,null);
 assert.match(U.answer("صرف كام؟",r),/حساب/);
});

test("budget category limits are distinct from real spending",()=>{
 const state={settings:{categoryBudgets:[{name:"المواصلات",limit:800}]},accounts:[],transactions:[
  {type:"expense",category:"مواصلات",amount:480,date:"2026-11-12"}]};
 const r=U.summary(state,{start:"2026-11-01",end:"2026-11-30"});
 const cards=U.budgetCards(r,state),transport=cards.find(c=>c.name==="المواصلات");
 assert.equal(transport.spent,480);assert.equal(transport.budget,800);
 assert.equal(transport.remaining,320);assert.equal(transport.ratio,60);
 assert.equal(cards.find(c=>c.name==="الترفيه").configured,false);
});

test("Egyptian voice AI does not claim a trained offline LLM",()=>{
 assert.match(ai,/ar-EG/);assert.match(ai,/ultra-ai-speak/);
 assert.match(ai,/flosy-ultra-avatar.svg/);
 assert.match(ai,/w\.FLOSY_ULTRA_AI/);
 assert.match(ui,/receiveNativeVoice/);
 assert.match(ui,/receiveNativeReceipt/);
 assert.match(ui,/confirm|مراجعة/);
 assert.ok(!/new NotificationListenerService|READ_SMS|RECEIVE_SMS/.test(ai));
});

test("client shell caches HTML and all local Ultra components",()=>{
 for(const f of ["flosy-ultra.html","flosy-ultra-live.css","flosy-ultra-data.js",
  "flosy-ultra-ai.js","flosy-ultra-live.js","flosy-ultra-avatar.svg","flosy-ultra.webmanifest"])
  assert.ok(xml.includes(f),f);
 assert.match(xml,/fallback=url\.pathname\.endsWith\("\/flosy-ultra\.html"\)/);
});

test("production actions replace all original dangerous mock ledger writers",()=>{
 for(const k of ["saveCustomTransaction","addNewDemoAccount","addNewDemoBudget",
  "addVoiceTransaction","captureReceiptTransaction","sendAiMessage"])
  assert.ok(ui.includes("w."+k),k);
 assert.match(ui,/C\.mutate/);
 assert.match(ui,/sourceHash/);
 assert.match(ui,/setDisplayMode\("interactive"\)/);
 assert.match(ui,/transactions/);
 assert.match(ui,/notifications-sync/);
});
