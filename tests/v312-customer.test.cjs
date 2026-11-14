"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const coach=require("../flosy-ai-coach-v312.js"),brain=require("../flosy-ai-brain-v399.js");
const at=new Date(2026,10,14,12,0);
const data={transactions:[
 {id:"octFood",type:"expense",amount:130,date:"2026-10-05",category:"طعام",description:"فطار"},
 {id:"octTaxi",type:"expense",amount:60,date:"2026-10-09",category:"مواصلات",description:"مواصلات"},
 {id:"novFood",type:"expense",amount:290,date:"2026-11-05",category:"طعام",description:"سوبرماركت"},
 {id:"novTaxi",type:"expense",amount:100,date:"2026-11-08",category:"مواصلات",description:"أوبر"},
 {id:"novCoffee",type:"expense",amount:75,date:"2026-11-13",category:"قهوة",description:"قهوة"},
 {id:"novPending",type:"expense",amount:50000,date:"2026-11-10",category:"طعام",status:"pending"},
 {id:"novTransfer",type:"transfer",amount:9000,date:"2026-11-11",category:"تحويل"},
 {id:"novIncome",type:"income",amount:4000,date:"2026-11-01",category:"مرتب"},
 {id:"oldOutside",type:"expense",amount:900,date:"2026-10-24",category:"طعام"}
]};
test("AI explains actual same-day-month spending differences and ignores transfers and pending",()=>{
 const a=coach.answer("ليه مصاريفي زادت الشهر ده؟",data,{},at,brain,()=>null);
 assert.equal(a.intent,"v312-why-spending");
 assert.ok(a.text.includes("465 ج.م")||a.text.includes("٤٦٥"));
 assert.ok(a.text.includes("190 ج.م")||a.text.includes("١٩٠"));
 assert.ok(a.text.includes("طعام"));
 assert.ok(!a.text.includes("50,000"));
});
test("AI shows up to five posted expenses with dates, no guessed income",()=>{
 const r=coach.answer("إيه أكبر 5 مصروفات الشهر ده؟",data,{},at,brain,()=>null);
 assert.equal(r.intent,"v312-top-five");assert.ok(r.text.includes("سوبرماركت"));
 assert.ok(r.text.includes("2026-11-05"));assert.ok(!r.text.includes("50000"));
});
test("AI saving suggestions mark ten percent as scenario and do not claim mandatory",()=>{
 const r=coach.answer("إزاي أوفر الشهر الجاي؟",data,{},at,brain,()=>null);
 assert.equal(r.intent,"v312-plan");assert.ok(r.text.includes("10٪"));
 assert.ok(r.text.includes("افتراضي"));assert.ok(r.text.includes("الالتزامات"));
});
test("AI daily safe spending never treats missing profiles as available salary",()=>{
 const missing=coach.answer("أقدر أصرف كام النهارده؟",data,{safe:9000,daily:null},at,brain,()=>null);
 assert.ok(missing.text.includes("مش محسوب"));
 const good=coach.answer("أقدر أصرف كام النهارده؟",data,{safe:1000,daily:85},at,brain,()=>null);
 assert.ok(good.text.includes("85")||good.text.includes("٨٥"));
 assert.ok(good.text.includes("تقدير"));
});
test("AI falls back to original response for unrelated questions",()=>{
 const r=coach.answer("اختبار غير مدعوم",data,{},at,brain,()=>({intent:"legacy",text:"original"}));
 assert.equal(r.intent,"legacy");
});
test("UX source keeps one ledger and five main tabs; voice, receipt and reports are live routes",()=>{
 const code=fs.readFileSync("flosy-customer-v312.js","utf8"),
 html=fs.readFileSync("flosy.html","utf8"),sw=fs.readFileSync("service-worker.js","utf8");
 assert.ok(code.includes("api.postBatch(")||code.includes("a.postBatch("));
 assert.ok(code.includes("const original=P.render"));
 assert.ok(code.includes('data-ux312-quick="expense"'));
 assert.ok(code.includes('data-ux312-quick="transfer"'));
 assert.ok(code.includes("data-ux312-open-screen"));
 assert.ok(code.includes("flosyReportStatus")||code.includes(".report311-presets"));
 for(const u of ["flosy-customer-v312.js?v=3130","flosy-customer-v312.css?v=3120","flosy-ai-coach-v312.js?v=3120"]){
  assert.ok(html.includes(u));assert.ok(sw.includes("./"+u));
 }
});
test("Home design does not show fabricated money; UI uses live ledger only",()=>{
 const w={FLOSY_UNIFIED_PAGES:{render:()=>{}},FLOSY_UNIFIED:{
  money:n=>n.toFixed(0)+" ج.م",summary:()=>({hasAccounts:false,income:0,expense:0,total:0,daily:null}),
  date:()=>"2026-11-14",state:()=>({transactions:[]}),accounts:()=>[],defaultAccount:()=>"",
  core:()=>({})},FLOSY_ULTRA_DATA:{cleanTx:()=>[]}},
 doc={addEventListener:()=>{},querySelector:()=>null};
 vm.runInNewContext(fs.readFileSync("flosy-customer-v312.js","utf8"),{window:w,document:doc});
 const markup=w.FLOSY_CUSTOMER_V312.homeMarkup();
 assert.ok(markup.includes("لم يُحسب بعد"));
 assert.ok(markup.includes("أضف حسابك الأول"));
 assert.ok(markup.includes("cx312-add-rail"));
 assert.ok(!markup.includes("15,000 ج.م"));
 const quick=w.FLOSY_CUSTOMER_V312.formMarkup();
 assert.ok(quick.includes("إضافة حساب"));
});
