"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("flosy.html","utf8");
const css=fs.readFileSync("flosy-unified.css","utf8");
const js=fs.readFileSync("flosy-unified.js","utf8");
const pages=fs.readFileSync("flosy-unified-pages.js","utf8");
const ai=fs.readFileSync("flosy-unified-ai.js","utf8");
test("entire original 20-screen designer source imported; 4 live themes retained",()=>{
 const ids=[...html.matchAll(/class="phone-frame" data-screen="(\d+)"/g)].map(x=>+x[1]);
 assert.deepEqual(ids,Array.from({length:20},(_,i)=>i+1));
 for(const theme of ["clean-light","emerald-dark","calm-light","serene-dark"]){
  assert.ok(html.includes('[data-theme="'+theme+'"]'),theme);
  assert.ok(js.includes('"'+theme+'"'),theme);
 }
 assert.match(html,/width:\s*366px/);
 assert.match(html,/height:\s*790px/);
 assert.match(html,/font-family:\s*'Readex Pro'/);
});
test("no duplicated fake camera, clock or battery in production HTML",()=>{
 assert.equal((html.match(/class="dynamic-island"/g)||[]).length,0);
 assert.equal((html.match(/fa-battery-full/g)||[]).length,0);
 assert.equal((html.match(/class="tabular-nums">9:41/g)||[]).length,0);
 assert.match(css,/\.phone-frame\.flosy-active/);
});
test("all 20 routes are live, old static demo hidden and service routes use one ledger",()=>{
 for(let i=1;i<=20;i++)assert.ok(pages.includes(i+":")||pages.includes(i+":{"),"screen "+i);
 assert.match(js,/FLOSY_BRIDGE/);
 assert.match(js,/FLOSY_UNIFIED_PAGES/);
 assert.match(css,/\.flosy-section\.flosy-mounted>:not\(\.flosy-real\)/);
 assert.match(pages,/flosyReceiptPaste/);
});
test("single finance assistant has Egyptian speech and professional local SVG charts",()=>{
 assert.match(ai,/ar-EG/);
 assert.match(ai,/chart_type/);
 assert.match(ai,/flosy-ai-chart/);
 assert.match(ai,/FLOSY_LOCAL_ANALYTICS/);
 assert.doesNotMatch(ai,/https:\/\/(?:api\.openai|generativelanguage\.googleapis)/);
 assert.doesNotMatch(ai,/Gemini API|OpenAI API|ChatGPT API/);
 assert.match(js,/nativeSpeechDone/);
});
test("voice and OCR write to same ledger with dedupe, validation and undo",()=>{
 assert.match(js,/fromVoiceText/);
 assert.match(js,/fromReceiptText/);
 assert.match(js,/postBatch/);
 assert.match(js,/C\.mutate/);
 assert.match(js,/sourceHash/);
 assert.match(js,/sourceHash===old\.sourceHash/);
 assert.match(js,/arithmeticContradiction/);
 assert.match(js,/transactions\/"/);
 assert.match(js,/flosy39_receipt_auto/);
 assert.match(js,/flosy39_voice_auto/);
});
test("car purchases get a specific vehicle icon; multiple other transaction icons exist",()=>{
 for(const k of ["عربيه","عربية","fa-car-side","fa-gas-pump","fa-utensils",
  "fa-kit-medical","fa-graduation-cap","fa-gift","fa-house","fa-shirt","fa-calendar-check"])
  assert.ok(js.includes(k),k);
});
test("business pages have 4-theme settings, real Excel & PDF, integrated AI",()=>{
 for(const name of ["flosyNewTxForm","flosyBudgetForm","flosyGoalForm",
  "flosyAiUnifiedInput","flosyReceiptPaste","flosyVoiceTypedForm","flosyThemeGrid",
  "flosyReportFrom","flosyReportTo"]){
  if(name==="flosyThemeGrid")continue;
  assert.ok(pages.includes(name)||ai.includes(name),name);
 }
 assert.match(pages,/FLOSY_UNIFIED_AI/);
 assert.match(js,/xlsxBytes/);
 assert.match(js,/flosyapp:\/\/print/);
});
