"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const gate=require("../flosy-voice-safety-v2.js");
const auto=require("../flosy-voice-auto-v399.js");
const brain=require("../flosy-ai-brain-v399.js");
const today="2026-11-14",now=Date.parse("2026-11-14T14:00:00Z");
const accounts=[{id:"cash-1",name:"الكاش"},{id:"bank-1",name:"بنك مصر"}];
const parse=t=>gate.analyzeBatch(t,accounts,today);
const decide=(t,enabled=true)=>auto.decide(parse(t),{enabled,accounts,today,now,maxAmount:5000});
test("opt-in is required; unambiguous real-account voice expense books a proposed row",()=>{
 const q="دفعت 75 جنيه قهوة من الكاش";
 assert.equal(decide(q,false).accepted,false);
 const r=decide(q);assert.equal(r.accepted,true);
 assert.equal(r.rows[0].type,"expense");assert.equal(r.rows[0].amount,75);
 assert.equal(r.rows[0].accountId,"cash-1");
 assert.equal(r.rows[0].date,today);
 assert.ok(r.rows[0].sourceHash.startsWith("flosy39-voice399-"));
 assert.equal(decide(q).rows[0].sourceHash,r.rows[0].sourceHash,"same 5-minute window dedups callbacks");
});
test("voice income allowed when actual owner account spoken",()=>{
 const r=decide("قبضت 4200 جنيه من بنك مصر");
 assert.equal(r.accepted,true);
 assert.equal(r.rows[0].type,"income");
 assert.equal(r.rows[0].amount,4200);
 assert.equal(r.rows[0].accountId,"bank-1");
});
test("no silent post for question, negation, future, debt, transfer, fuzzy money, dates, big amounts",()=>{
 for(const q of [
  "هل دفعت 75 جنيه قهوة من الكاش؟",
  "ما دفعتش 75 جنيه قهوة من الكاش",
  "هشتري حاجة ب 75 جنيه من الكاش",
  "دفعت تقريبا 75 جنيه قهوة من الكاش",
  "دفعت 6000 جنيه قهوة من الكاش",
  "دفعت 75 جنيه قهوة امبارح من الكاش",
  "دفعت 75 جنيه قهوة",
  "دفعت 75 جنيه قهوة من حساب مجهول",
  "دفعت 75 قهوة من الكاش",
  "حولت 75 جنيه من الكاش لبنك مصر",
  "استلفت 75 جنيه من الكاش",
  "صرفت 75 جنيه قهوة من الكاش وبعدين دفعت 35 جنيه بنزين من الكاش"
 ]){assert.equal(decide(q).accepted,false,q);}
});
test("manual repair is reachable even for blocked voice transcripts",()=>{
 const c=fs.readFileSync("flosy-capture-review-v2.js","utf8");
 for(const marker of ["flosyV399CorrectedVoice","data-v399-reanalyse","data-v399-manual","analyzeBatch(corrected"])
  assert.ok(c.includes(marker),marker);
 const app=fs.readFileSync("flosy-unified.js","utf8");
 assert.ok(app.includes("voiceAutoEnabled"));
 assert.ok(app.includes('postBatch(result.rows,"flosy39_voice_auto")'));
 assert.ok(app.includes("items.needsReview=true"));
});
const finance={
 transactions:[
 {id:"a",type:"expense",date:"2026-11-02",category:"مواصلات",description:"تاكسي",amount:80},
 {id:"b",type:"expense",date:"2026-11-03",category:"قهوة",description:"قهوة",amount:40},
 {id:"c",type:"expense",date:"2026-11-04",category:"إيجار",description:"إيجار",amount:1500},
 {id:"d",type:"income",date:"2026-11-04",description:"مرتب",amount:4000},
 {id:"e",type:"transfer",date:"2026-11-05",amount:900,description:"تحويل"},
 {id:"f",type:"expense",date:"2026-11-06",category:"قهوة",amount:1500,status:"pending"},
 {id:"g",type:"expense",date:"2026-10-22",category:"مواصلات",description:"بنزين",amount:120},
 {id:"h",type:"expense",date:"2026-10-23",category:"أكل",description:"فطار",amount:100}
 ]};
const at=new Date("2026-11-14T12:00:00");
test("Flosy AI answers spending from recorded posted data, excluding transfers and pending",()=>{
 brain.reset();const r=brain.answer("فلوسي راحت فين الشهر ده؟",finance,{},at);
 assert.equal(r.intent,"v399-spending");
 assert.ok(r.text.includes("1٬620")||r.text.includes("١٬٦٢٠")||r.text.includes("1620")||r.text.includes("١٦٢٠"),r.text);
 assert.equal(r.chart.chart_type,"donut");
 assert.equal(r.actions[0].screen,4);
});
test("Flosy AI keeps follow-up context and compares only actual month records",()=>{
 brain.reset();brain.answer("صرفت كام الشهر ده",finance,{},at);
 const follow=brain.answer("والشهر اللي فات؟",finance,{},at);
 assert.equal(follow.intent,"v399-spending");
 assert.ok(follow.text.includes("220")||follow.text.includes("٢٢٠"),follow.text);
 const compare=brain.answer("قارن مصاريف الشهر ده بالشهر اللي فات",finance,{},at);
 assert.equal(compare.intent,"v399-compare");
 assert.equal(compare.chart.chart_type,"bar");
 assert.ok(compare.text.includes("الشهر السابق"));
});
test("AI addresses colloquial categories and doesn't hallucinate missing data",()=>{
 const r=brain.answer("صرفت كام مواصلات الشهر ده",finance,{},at);
 assert.equal(r.intent,"v399-category");
 assert.ok(r.text.includes("80")||r.text.includes("٨٠"));
 const empty=brain.answer("صرفت كام النهاردة؟",{transactions:[]},{},at);
 assert.equal(empty.intent,"v399-spending");
 assert.ok(empty.text.includes("مش لاقي"));
});
test("AI respects last week, last 7 days, 3 months and income in Arabic",()=>{
 assert.equal(brain.range(brain.normalize("آخر 3 شهور"),at).from,"2026-09-01");
 assert.equal(brain.range(brain.normalize("الأسبوع اللي فات"),at).from,"2026-10-31");
 assert.equal(brain.range(brain.normalize("آخر 7 أيام"),at).from,"2026-11-08");
 const income=brain.answer("دخلي كام الشهر ده",finance,{},at);
 assert.equal(income.intent,"v399-income");
 assert.ok(income.text.includes("4000")||income.text.includes("٤٬٠٠٠"));
 const recent=brain.answer("اخر عملياتي",finance,{},at);
 assert.equal(recent.intent,"v399-recent");
 assert.ok(recent.actions.some(x=>x.screen===4));
});
test("category comparison isolates only matching expense records",()=>{
 const c=brain.answer("قارن مصاريف المواصلات الشهر ده بالشهر اللي فات",finance,{},at);
 assert.equal(c.intent,"v399-compare");
 assert.ok(c.text.includes("مواصلات"));
 assert.equal(c.chart.data[0].value_minor,12000);
 assert.equal(c.chart.data[1].value_minor,8000);
});
test("unified capture and theme boot are present in website and cache",()=>{
 const html=fs.readFileSync("flosy.html","utf8");
 const worker=fs.readFileSync("service-worker.js","utf8");
 for(const file of ["flosy-ai-brain-v399.js","flosy-voice-auto-v399.js",
  "flosy-experience-v399.js","flosy-experience-v399.css"]){
  assert.ok(html.includes(file+"?v=3990"),file+" HTML");
  assert.ok(worker.includes(file+"?v=3990"),file+" cache");
 }
 assert.match(html,/flosy_theme_unified_v39/);
 const app=fs.readFileSync("flosy-experience-v399.js","utf8");
 assert.ok(app.includes("flosy-nav399"));
 assert.ok(app.includes("flosy-v399-voice-opt"));
 assert.ok(app.includes('data-flosy-screen="6"'));
});
