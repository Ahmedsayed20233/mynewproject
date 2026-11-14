"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const N=require("../flosy-needs-v398.js");
const W={},ctx={window:W,console,setTimeout,clearTimeout};
for(const file of ["flosy-receipt-ml.js","flosy-receipt-trained-v398.js",
    "flosy-receipt-intelligence-v398.js"])
 vm.runInNewContext(fs.readFileSync(file,"utf8"),ctx,{filename:file});
const I=W.FLOSY_RECEIPT_INTEL_V398,ML=W.FLOSY_RECEIPT_ML,model=W.FLOSY_RECEIPT_TRAINED_V398;
test("real Arabic receipt ranker is genuinely trained and evaluated on independent receipts",()=>{
 assert.equal(model.kind,"real-ararec-total-region-ranker");
 assert.equal(model.receiptCount,100);
 assert.equal(model.trainReceiptCount,80);
 assert.equal(model.heldOutReceiptCount,20);
 assert.equal(model.heldOut.count,329);
 assert.ok(model.heldOut.positives>=20);
 assert.ok(model.heldOut.precision>0&&model.heldOut.precision<1);
 assert.ok(model.heldOut.top1>0.5);
 assert.equal(model.weights.length,model.features.length);
 assert.equal(I.modelAvailable,true);
 assert.equal(ML.__flosyV398,true);
});
test("Arabic receipt total extraction remains review-first, with model evidence attached",()=>{
 const p=ML.extract("سوبر ماركت أبو علي\nالتاريخ: 2026/11/14\nقهوة 20\nالإجمالي: 125.50 ج.م\nنقدي");
 assert.equal(p.amount,125.5);
 assert.equal(p.autoQuality,false);
 assert.equal(p.requiresOwnerReview,true);
 assert.equal(p.modelVersion,"3.9.8");
 assert.equal(p.learnedTotalRankKind,"real-ararec-ocr-text-ranker");
 assert.ok(p.learnedTotalRankScore>=0&&p.learnedTotalRankScore<=1);
});
test("Arabic digits and OCR split-total fallback recognized without invoice-ID hallucination",()=>{
 const legacy={extract(){throw new Error("old parser failed")}};
 const a=I.enrich("مخبز مصري\nالإجمالي\n٣٥٫٥٠",legacy);
 assert.equal(a.amount,35.5);
 assert.equal(a.autoQuality,false);
 assert.ok(a.extractionWarnings.some(x=>x.includes("مراجعة")));
 assert.throws(()=>I.enrich("Order No: 98765432\nDate: 14/11/2026",legacy),/إجمالي/);
});
test("conflicting printed totals make the receipt ambiguous, never auto-post",()=>{
 const fake={extract:()=>({amount:55,merchant:"مطعم",date:"2026-11-14",items:[],
    evidence:"net_total",confidence:.93,autoQuality:true})};
 const a=I.enrich("المطعم\nالإجمالي 55\nNet Total 65",fake);
 assert.equal(a.autoQuality,false);
 assert.equal(a.confidence,.55);
 assert.ok(a.extractionWarnings.some(x=>x.includes("مختلفة")));
 assert.equal(a.totalAlternatives.length,2);
});
test("priority tiers are suggestions with separate neutral income and transfer handling",()=>{
 assert.equal(N.suggest({type:"expense",amount:100,category:"إيجار"}).tier,"essential");
 assert.equal(N.suggest({type:"expense",amount:50,description:"قهوة كافيه"}).tier,"flexible");
 assert.equal(N.suggest({type:"expense",amount:30,description:"Netflix اشتراك ترفيه"}).tier,"optional");
 assert.equal(N.suggest({type:"income",amount:2000,description:"مرتب"}).tier,"excluded");
 assert.equal(N.suggest({type:"transfer",amount:2000,description:"تحويل داخلي"}).tier,"excluded");
 assert.equal(N.suggest({type:"expense",amount:55,description:"مستلزمات"},
    {necessityRules:{"":"essential"}}).tier,"essential");
});
test("owner correction is persisted, recalculates monthly tiers, and never changes money",()=>{
 const state={transactions:[
  {id:"rent",type:"expense",date:"2026-11-14",amount:1500,category:"إيجار"},
  {id:"coffee",type:"expense",date:"2026-11-14",amount:70,description:"قهوة"},
  {id:"play",type:"expense",date:"2026-11-14",amount:100,description:"اشتراك Netflix"},
  {id:"income",type:"income",date:"2026-11-14",amount:4000,description:"مرتب"},
  {id:"transfer",type:"transfer",date:"2026-11-14",amount:300,description:"تحويل داخلي"}
 ],settings:{}};
 const before=JSON.parse(JSON.stringify(state.transactions));
 const v=N.summarize(state,"month",new Date("2026-11-14T12:00:00"));
 assert.equal(v.total,1670);
 assert.equal(v.totals.essential,1500);
 assert.equal(v.totals.flexible,70);
 assert.equal(v.totals.optional,100);
 assert.equal(v.count,3);
 assert.equal(N.change("coffee","optional",cb=>cb(state)),true);
 const updated=N.summarize(state,"month",new Date("2026-11-14T12:00:00"));
 assert.equal(updated.totals.optional,170);
 assert.equal(updated.totals.flexible,0);
 assert.deepEqual(state.transactions.map(x=>x.amount),before.map(x=>x.amount));
 assert.throws(()=>N.change("income","optional",cb=>cb(state)),/ليست مصروف/);
 assert.throws(()=>N.change("play","unknown",cb=>cb(state)),/غير صالح/);
});
test("OCR UI always offers explicit missing-item rescue and warnings",()=>{
 const review=fs.readFileSync("flosy-capture-review-v2.js","utf8");
 assert.match(review,/data-add-receipt-item/);
 assert.match(review,/data-skip-receipt-items/);
 assert.match(review,/extractionWarnings/);
 assert.match(review,/receipt-name-/);
 const repair=fs.readFileSync("flosy-repair.js","utf8");
 assert.match(repair,/chooseBestReceiptText/);
 assert.match(repair,/return chooseBestReceiptText\(outputs\)/);
 assert.doesNotMatch(repair,/return outputs\.join\("\\n"\)/);
});
