"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const gate=require("../flosy-voice-safety-v2.js");
const preview=require("../flosy-capture-review-v2.js");
const accounts=[{id:"cash",name:"الكاش"},{id:"bm",name:"بنك مصر"},{id:"cib",name:"CIB"}];
test("synthetic Egyptian hard cases: six intents and no fabricated transfer",()=>{
 const cases=[
 ["دفعت 70 جنيه قهوة","expense"],["حاسبت مية ونص جنيه فطار","expense"],
 ["اشتريت شنطة ب ٤٥٠ جنيه","expense"],["اتخصم مني ٣٥٠ جنيه على اشتراك النت","expense"],
 ["اديت السواق خمسين جنيه","expense"],["تخصموا مصاريف تشغيل 120 جنيه","expense"],
 ["قبضت ١٧٠٠٠ جنيه مرتبي","income"],["نزلي المرتب عشرين الف جنيه","income"],
 ["وصلني 300 جنيه أجرة محاضرة","income"],["كسبت 750 جنيه شغل حر","income"],
 ["حولت 1000 جنيه من كاش لبنك مصر حسابي","transfer"],
 ["نقلت 350 من حساب الأهلي لحساب CIB بتاعي","transfer"],
 ["سحبت خمسمية جنيه من البنك وحطيتهم في جيبي كاش","transfer"],
 ["عملت تحويل من حسابي الشخصي لمحفظتي ب 1000 جنيه","transfer"],
 ["رجعلي 500 جنيه من الطلب اللي لغيتة","refund"],
 ["استرديت رسوم 75 جنيه اتخصمت بالغلط","refund"],
 ["استلفت 2000 جنيه من صاحبي","debt"],["سلفت محمد 1000 جنيه","debt"],
 ["بعت لصاحبي ألف جنيه عشان يرجعهم","debt"],
 ["وصلني 500 جنيه من محمد عشان أسدد ديوني","debt"],
 ["ما دفعتش 100 جنيه","none"],["هشتري موبايل بخمسة الاف جنيه بكرة","none"],
 ["لسه مجاليش الراتب","none"],["لو صرفت 200 جنيه هيفضل كام؟","none"],
 ["التحويل بقيمة 300 جنيه فشل","none"],["ماحولتش ولا جنيه","none"],
 ["قوللي صرفت كام الشهر ده","none"],["OTP 123456 لتنفيذ تحويل 1000 جنيه","none"],
 ["غالبا قبضت 1500 جنيه مش متأكد","none"],
 ["حوّلت ١٥٠ جنيه لمحمد مصاريف أكل","expense"],
 ["عملت تحويل 600 جنيه للبياع تمن المنتج","expense"],
 ["جالي تحويل 1000 جنيه من حسابي التاني","transfer"],
 ["دخلت ألف جنيه من بنك مصر لفودافون كاش بتاعتي","transfer"],
 ["حولت مبلغ 300 جنيه لخالد","none"],["سحبت 1000 جنيه","none"],
 ["دفعت 100 جنيه وبعدين قبضت 500 جنيه","none"]
 ];
 for(const [text,intent] of cases)assert.equal(gate.classify(text).intent,intent,text);
});
test("currency, Persian/Arabic digits and Egyptian spoken fractions are correct",()=>{
 for(const [input,expected] of [
 ["دفعت ٧٥ جنيه",75],["اشتريت شنطة ب ۴۵۰ جنيه",450],
 ["حاسبت مية ونص جنيه فطار",150],["دفعت 100 ونص جنيه",150],
 ["دفعت ألف ونص جنيه",1500],["دفعت 1000 ونص جنيه",1500],
 ["دفعت ألف ومتين جنيه",1200],["دفعت اتنين ونص جنيه",2.5],
 ["قبضت المرتب 17 ألف في بنك مصر",17000],["قبضت عشرين الف جنيه",20000],
 ["دفعت 1,234.50 جنيه",1234.5]]){
  assert.equal(gate.amount(input),expected,input);
 }
});
test("voice creates proposals without a write, and splits independent actions",()=>{
 const items=gate.analyzeBatch("دفعت 100 جنيه وبعدين قبضت 500 جنيه",accounts,"2026-11-13");
 assert.equal(items.length,2);
 assert.deepEqual(items.map(x=>x.intent),["expense","income"]);
 assert.equal(items[0].amount,100);
 assert.equal(items[1].amount,500);
 for(const row of items){assert.equal(row.autoPost,false);assert.equal(row.requiresReview,true)}
 assert.equal(gate.autoPost,false);assert.equal(preview.autoPost,false);
});
test("external recipient is never assumed to be a second owned account",()=>{
 const external=gate.analyzeSingle("حولت مبلغ 300 جنيه لخالد",accounts,"2026-11-13");
 assert.equal(external.intent,"none");
 const internal=gate.analyzeSingle("حولت 500 جنيه من الكاش لبنك مصر حسابي",accounts,"2026-11-13");
 assert.equal(internal.intent,"transfer");assert.equal(internal.accountId,"cash");
 assert.equal(internal.targetAccountId,"bm");assert.equal(internal.autoPost,false);
 const unknown=gate.analyzeSingle("نقلت 100 جنيه بين حساباتي",accounts,"2026-11-13");
 assert.equal(unknown.accountId,"");assert.equal(unknown.targetAccountId,"");
});
test("preview checks amount, date, account ownership and transfer invariants",()=>{
 const items=gate.analyzeBatch("حولت 500 جنيه من الكاش لبنك مصر حسابي",accounts,"2026-11-13");
 const fields={"amount-0":"500","date-0":"2026-11-13","account-0":"cash",
  "target-0":"bm","description-0":"نقلت للادخار"};
 const [tx]=preview.prepareRows(items,fields,accounts);
 assert.equal(tx.type,"transfer");assert.equal(tx.amount,500);
 assert.equal(tx.accountId,"cash");assert.equal(tx.targetAccountId,"bm");
 assert.ok(/^flosy-capture-v2-/.test(tx.sourceHash));
 assert.equal(tx.rawTranscript,undefined);assert.equal(tx.text,undefined);
 assert.throws(()=>preview.prepareRows(items,{...fields,"target-0":"cash"},accounts),/حسابين مختلفين/);
 assert.throws(()=>preview.prepareRows(items,{...fields,"target-0":"other"},accounts),/حسابين مختلفين/);
 assert.throws(()=>preview.prepareRows(items,{...fields,"amount-0":"-1"},accounts),/راجع مبلغ/);
 assert.throws(()=>preview.prepareRows(items,{...fields,"date-0":"2026-02-30"},accounts),/راجع مبلغ/);
});
test("refund, debt, negation and failed transfers cannot post as income/expense",()=>{
 for(const t of ["رجعولي 150 جنيه من طلب ملغي","استلفت ألفين جنيه",
  "ما دفعتش 200 جنيه","التحويل فشل"]){
  const items=gate.analyzeBatch(t,accounts,"2026-11-13");
  assert.throws(()=>preview.prepareRows(items,{"amount-0":"200","date-0":"2026-11-13",
    "account-0":"cash","description-0":"عملية"},accounts),/مساراً خاصاً/);
 }
});
test("message feature gate, offline shell and confirmation scripts ship as one version",()=>{
 const html=fs.readFileSync("index.html","utf8");
 const unified=fs.readFileSync("flosy.html","utf8");
 const sw=fs.readFileSync("service-worker.js","utf8");
 const capture=fs.readFileSync("flosy-unified.js","utf8");
 const relay=fs.readFileSync("flosy-automate-relay.js","utf8");
 assert.match(html,/FINANCIAL_MESSAGE_IMPORT_ENABLED:false/);
 assert.match(relay,/FINANCIAL_MESSAGE_IMPORT_ENABLED===true/);
 for(const t of ["flosy-voice-safety-v2.js","flosy-capture-review-v2.js"])
  assert.match(sw,new RegExp(t.replace(/\./g,"\\.")));
 assert.match(unified,/flosy-capture-review-v2\.js/);
 assert.match(capture,/flosy39_voice_confirmed/);
 assert.match(capture,/flosy39_receipt_confirmed/);
 assert.doesNotMatch(capture,/postBatch\(rows,"flosy39_voice_auto"\)/);
 assert.doesNotMatch(capture,/postBatch\(rows,"flosy39_receipt_auto"\)/);
});
