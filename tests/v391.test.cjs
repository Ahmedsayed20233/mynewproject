"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const categories=require("../flosy-categories-v391.js");
const ux=fs.readFileSync("flosy-ux-v391.js","utf8");
const core=fs.readFileSync("flosy-unified.js","utf8");
const repair=fs.readFileSync("flosy-repair.js","utf8");
const html=fs.readFileSync("flosy.html","utf8");
const css=fs.readFileSync("flosy-ux-v391.css","utf8");
const theme=fs.readFileSync("flosy-legacy-theme-v391.css","utf8");
test("curated category catalog has 40 labels, ten semantic groups and unique IDs",()=>{
 assert.ok(categories.all.length>=40,"expected 40+");
 assert.ok(categories.groups("expense").length>=8);
 assert.equal(new Set(categories.all.map(x=>x.id)).size,categories.all.length);
 for(const c of categories.all){
  assert.match(c.icon,/^fa-[a-z-]+$/);
  assert.match(c.color,/^#[A-Fa-f0-9]{6}$/);
  assert.ok(c.label.length>=3);
 }
});
test("specific item icons override generic spending descriptions",()=>{
 assert.equal(categories.classify("اشتريت عربية 200 ألف").icon,"fa-car-side");
 assert.equal(categories.classify("دفعت بنزين للعربية 500 جنيه").icon,"fa-gas-pump");
 assert.equal(categories.classify("دفعت 70 جنيه قهوة").icon,"fa-mug-hot");
 assert.equal(categories.classify("اشتريت أدوية من الصيدلية").icon,"fa-prescription-bottle-medical");
 assert.equal(categories.classify("حجزت كشف عند دكتور").icon,"fa-stethoscope");
 assert.equal(categories.classify("دفعت فواتير الكهرباء").icon,"fa-bolt");
 assert.equal(categories.classify("دفعت رسوم المدرسة").icon,"fa-graduation-cap");
 assert.equal(categories.classify("اشتريت هدية").icon,"fa-gift");
 assert.equal(categories.classify("دفعت 100 جنيه زكاة").icon,"fa-hand-holding-heart");
 assert.equal(categories.classify("قبضت مرتبي", "income").icon,"fa-money-bill-wave");
 assert.equal(categories.resolve("مطاعم ووجبات","اشتريت بنزين","expense",{preferDescription:true}).id,"fuel");
 assert.equal(categories.resolve("مطاعم ووجبات","اشتريت بنزين","expense").id,"food");
});
test("the full unified UI has accounts, category search and editable transaction filters",()=>{
 for(const s of ["flosyNewTxForm","flosyTxSearch","fxAdvancedFilters","fxAccountFilter",
  "fxCategoryFilter","fxEditDialog","fxSort","fxLoadMore","fxRecordsSummary","data-fx-entry-type",
  "fxCategoryGrid","flosyCaptureStatus","flosyReceiptStatus","flosyReceiptFile"])
   assert.ok(ux.includes(s),"missing "+s);
 assert.match(ux,/FLOSY_UNIFIED_PAGES/);
 assert.match(ux,/FLOSY_BRIDGE\.mutate/);
 assert.match(ux,/transactions\/"/);
 assert.match(css,/var\(--bg-surface\)/);
 assert.match(css,/var\(--primary\)/);
});
test("receipt data URL and gallery file are accepted for bilingual OCR extraction",()=>{
 assert.match(repair,/extractForUnified/);
 assert.match(repair,/createWorker\(\["ara","eng"\]\)/);
 assert.match(repair,/imageDataUrl\.arrayBuffer/);
 assert.match(repair,/readMultipleOCR\(worker,imageDataUrl\)/);
 assert.match(core,/receiveNativeReceiptImage:nativeReceiptImage/);
 assert.match(core,/receiptBusy/);
 assert.match(core,/FLOSY_CAPTURE=\{receiveNativeVoice:nativeVoice/);
 assert.match(core,/flosyapp:\/\/voice-expense/);
});
test("all four finance themes reach legacy settings/report/budget extensions",()=>{
 for(const k of ["clean-light","emerald-dark","calm-light","serene-dark"])
  assert.ok(html.includes(k));
 assert.match(core,/flosy-legacy-theme-v391\.css/);
 for(const section of [".f10-card",".v4-surface",".report-paper",".f2-card",".modal",
  "html[data-theme] input","html[data-theme] textarea"])
  assert.ok(theme.includes(section),section);
});
test("no separate old assistant choice appears in new experience",()=>{
 const ai=fs.readFileSync("flosy-unified-ai.js","utf8");
 assert.doesNotMatch(ai,/fetch\("https:\/\/(?:api\.openai|generativelanguage)/);
 assert.doesNotMatch(ux,/ChatGPT|Gemini/);
});
