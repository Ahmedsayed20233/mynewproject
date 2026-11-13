"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
function loadModel(){
 const c={window:{},console};vm.createContext(c);
 for(const f of ["flosy-nlu-compact-vocab.js","flosy-nlu-compact-weights.js",
                  "flosy-egyptian-nlu-compact-v2.js","flosy-voice-safety-v2.js"])
  vm.runInContext(fs.readFileSync(f,"utf8"),c,{filename:f});
 return c.window;
}
function fnv(s){
 let n=2166136261;
 for(let i=0;i<s.length;i++)n=Math.imul(n^s.charCodeAt(i),16777619)>>>0;
 return n>>>0;
}
test("reproducible learned vocabulary and INT8 weight blobs preserved",()=>{
 const w=loadModel();
 assert.equal(w.FLOSY_NLU_COMPACT_VOCAB.split("|").length,800);
 assert.equal(w.FLOSY_NLU_COMPACT_WEIGHTS64.length,6400);
 assert.equal(fnv(w.FLOSY_NLU_COMPACT_VOCAB),0x933d5444);
 assert.equal(fnv(w.FLOSY_NLU_COMPACT_WEIGHTS64),0xd8cbbc63);
 assert.equal(w.FLOSY_NLU_COMPACT_ERROR,undefined);
 assert.equal(w.FLOSY_EGYPTIAN_NLU_COMPACT.modelInfo.samples,60000);
 assert.equal(w.FLOSY_EGYPTIAN_NLU_COMPACT.modelInfo.trainRows,48000);
 assert.equal(w.FLOSY_EGYPTIAN_NLU_COMPACT.modelInfo.testRows,12000);
});
test("quantized trained model predicts six finance classes on synthetic examples",()=>{
 const ml=loadModel().FLOSY_EGYPTIAN_NLU_COMPACT;
 const cases=[
 ["دفعت 70 جنيه قهوة","expense"],
 ["استلمت مكافاة 400 جنيه من الشغل","income"],
 ["حولت 500 جنيه من البنك للكاش لنفسي","transfer"],
 ["استرداد عملية 200 جنيه","refund"],
 ["استلفت 2000 جنيه من صاحبي","debt"],
 ["ما دفعتش 100 جنيه","none"]
 ];
 for(const [raw,intent] of cases){
  const p=ml.classify(raw);
  assert.equal(p.intent,intent,raw);
  assert.equal(p.uncalibrated,true);
  assert.equal(p.canAutoPost,false);
 }
});
test("trained model never overrides hard accounting safety gates",()=>{
 const w=loadModel(),ml=w.FLOSY_EGYPTIAN_NLU_COMPACT;
 const safe=w.FLOSY_VOICE_SAFETY_V2;
 const bank=[{id:"cash",name:"الكاش"},{id:"bm",name:"بنك مصر"}];
 for(const raw of [
  "هشتري موبايل بكره 500 جنيه",
  "هل نزل المرتب 17000 جنيه",
  "OTP 123456 لتنفيذ تحويل 1000 جنيه",
  "حوّلت 300 جنيه لمحمد",
  "سحبت 1000 جنيه"
 ]){
  const suggestion=ml.classify(raw);
  const parsed=safe.analyzeSingle(raw,bank,"2026-11-14");
  assert.equal(parsed.intent,"none",raw);
  assert.equal(parsed.status,"blocked",raw);
  assert.equal(parsed.autoPost,false);
  assert.ok(parsed.trainedPrediction);
  assert.equal(parsed.trainedPrediction.intent,suggestion.intent);
 }
 for(const raw of ["استلفت 2000 جنيه من صاحبي","رجعلي الفلوس 500 جنيه بسبب مرتجع"]){
  const parsed=safe.analyzeSingle(raw,bank,"2026-11-14");
  assert.ok(["refund","debt"].includes(parsed.intent));
  assert.equal(parsed.status,"blocked");
  assert.equal(parsed.autoPost,false);
 }
 const proposal=safe.analyzeSingle("دفعت 70 جنيه قهوة",bank,"2026-11-14");
 assert.equal(proposal.intent,"expense");
 assert.equal(proposal.trainedPrediction.agreement,true);
 assert.equal(proposal.requiresReview,true);
});
test("browser shell loads model locally and maintains SMS/notification imports disabled",()=>{
 const html=fs.readFileSync("flosy.html","utf8");
 const index=fs.readFileSync("index.html","utf8");
 const sw=fs.readFileSync("service-worker.js","utf8");
 const files=["flosy-nlu-compact-vocab.js","flosy-nlu-compact-weights.js",
              "flosy-egyptian-nlu-compact-v2.js"];
 for(const f of files){
  assert.match(html,new RegExp(f.replace(/\./g,"\\.")));
  assert.match(index,new RegExp(f.replace(/\./g,"\\.")));
  assert.match(sw,new RegExp(f.replace(/\./g,"\\.")));
  assert.ok(fs.statSync(f).size<12000,"keep each student asset small");
 }
 assert.match(index,/FINANCIAL_MESSAGE_IMPORT_ENABLED:false/);
 const overlay=fs.readFileSync("flosy-capture-review-v2.js","utf8");
 assert.match(overlay,/trainedPrediction/);
 assert.doesNotMatch(overlay,/postBatch\(/);
 const model=fs.readFileSync("flosy-egyptian-nlu-compact-v2.js","utf8");
 assert.doesNotMatch(model,/fetch\s*\(|XMLHttpRequest|localStorage|C\.mutate|transactions\.push/);
});


test("all 58 independently authored hard examples: measured ML precision, safety never posts",()=>{
 const rows=fs.readFileSync("tests/fixtures/egyptian-finance-hardcases-58.jsonl","utf8")
  .trim().split("\n").map(JSON.parse);
 assert.equal(rows.length,58);
 const w=loadModel(),ml=w.FLOSY_EGYPTIAN_NLU_COMPACT,safe=w.FLOSY_VOICE_SAFETY_V2;
 let mlCorrect=0,rulesCorrect=0,byClass={};
 for(const row of rows){
  const predicted=ml.classify(row.text);
  const reviewed=safe.analyzeSingle(row.text,[],"2026-11-14");
  if(predicted.intent===row.intent)mlCorrect++;
  if(reviewed.intent===row.intent)rulesCorrect++;
  byClass[row.intent]=byClass[row.intent]||{n:0,mlCorrect:0,safetyCorrect:0};
  byClass[row.intent].n++;
  if(predicted.intent===row.intent)byClass[row.intent].mlCorrect++;
  if(reviewed.intent===row.intent)byClass[row.intent].safetyCorrect++;
  assert.equal(predicted.canAutoPost,false,row.text);
  assert.equal(reviewed.autoPost,false,row.text);
  assert.equal(reviewed.requiresReview,true,row.text);
 }
 console.log("HARDCASES (synthetic text, not real audio):",JSON.stringify({
  n:rows.length,trainedCompactCorrect:mlCorrect,safetyRuleCorrect:rulesCorrect,byClass
 }));
 assert.equal(mlCorrect,42,"trained compact model hard-case result is a fixed development metric");
});
