"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const W={},ctx={window:W,console,Math,Date};
for(const name of ["flosy-receipt-ml.js","flosy-receipt-trained-v398.js",
 "flosy-receipt-intelligence-v398.js","flosy-receipt-coru-model-v310.js",
 "flosy-receipt-egypt-v310.js"])
 vm.runInNewContext(fs.readFileSync(name,"utf8"),ctx,{filename:name});
const C=W.FLOSY_CORU_IE_V310,EG=W.FLOSY_RECEIPT_EGYPT_V310,ML=W.FLOSY_RECEIPT_ML;
test("actual CORU trained evidence is in the deployed browser model",()=>{
 assert.equal(C.version,"3.10.0");
 assert.equal(C.kind,"coru-ie-char-trigram-naive-bayes-and-lexicon");
 assert.equal(C.trainingRecords,6947);
 assert.equal(C.keptClasses,21);
 assert.equal(C.grams.length,1200);
 assert.equal(C.lexicon.length,2600);
 assert.ok(C.test.unseenName.count>=1200);
 assert.ok(C.test.unseenName.accuracy>.75);
 for(const split of ["train","val","test"])
  assert.match(C.sha256BySplit[split],/^[a-f0-9]{64}$/);
 assert.equal(ML.__flosyV398,true);
 assert.equal(ML.__flosyEgyptV310,true);
 assert.equal(EG.trained,true);
});
test("CORU real-item lexicon helps spelling but never silently rewrites text",()=>{
 const first=C.lexicon.find(a=>a[0].length>6);
 assert.ok(first,"Model must contain usable real item names");
 const suggestion=EG.findItem(first[0]);
 assert.ok(suggestion?.similarity>=.99);
 assert.equal(suggestion.name,first[0]);
 assert.equal(EG.findItem("رقم حساب 123456789"),null);
 assert.equal(EG.findItem(""),null);
});
test("Arabic-Indic receipt money and European decimal separators can be read",()=>{
 const text=EG.decimalText("المطلوب ١٬٢٥٠٫٥٠ جنيه\nالمدفوع: 1.250,50");
 assert.match(text,/1,250.50/);
 assert.match(text,/1250.50/);
 const result=ML.extract("سوبر ماركت الخير\nDate: 2026-11-14\nالإجمالي ١٬٢٥٠٫٥٠ جنيه\nنقدي");
 assert.equal(result.amount,1250.50);
 assert.equal(result.modelVersion,"3.10.0");
 assert.equal(result.autoQuality,false);
});
test("verified quantity x unit prices help list Egyptian items",()=>{
 const p=EG.parseItemRows("سوبرماركت النور\nMilk 2 x 35.00 = 70.00\nBread 1 20 20\nالإجمالي: 90.00",{
  merchant:"سوبرماركت النور"});
 assert.equal(p.length,2);
 assert.equal(p[0].quantity,2);assert.equal(p[0].unitPrice,35);
 assert.equal(p[0].total,70);
 assert.equal(p[1].total,20);
 assert.equal(p[0].extractionRule,"explicit_qty_times_unit");
});
test("receipt total remains separate from paid/tendered/change",()=>{
 const p=ML.extract("سوبر ماركت النور\nDate: 2026-11-14\nMilk 2 x 35.00 = 70.00\nBread 1 15 15\nالإجمالي 85\nالمدفوع 100\nالباقي 15\nنقدي");
 assert.equal(p.amount,85,"Never use customer cash tendered as expense");
 assert.equal(p.autoQuality,false,"No automatic posting from OCR");
 assert.ok(Array.isArray(p.items));
 assert.equal(p.coruModel.kind,C.kind);
 assert.equal(p.coruModel.testAccuracy,C.test.unseenName.accuracy);
});
test("ambiguous printed totals, date/phone identifiers and incomplete items stay review-only",()=>{
 const ambiguous=ML.extract("مطعم مصري\nDate: 14/11/2026\nالإجمالي 85\nNet Total 95\nفاتورة رقم 12345678");
 assert.equal(ambiguous.autoQuality,false);
 assert.ok(ambiguous.extractionWarnings.some(x=>x.includes("أرقام الإجمالي مختلفة")));
 const rows=EG.parseItemRows("رقم الفاتورة 12345678\nالتاريخ 2026-11-14\nPhone 01012345678\nالمدفوع 100\nالباقي 15");
 assert.equal(rows.length,0);
});
test("Flosy review offers optional corrections but no automatic posting",()=>{
 const html=fs.readFileSync("flosy-capture-review-v2.js","utf8"),
 site=fs.readFileSync("flosy.html","utf8"),
 core=fs.readFileSync("index.html","utf8"),
 worker=fs.readFileSync("service-worker.js","utf8"),
 ux=fs.readFileSync("flosy-ux-v391.js","utf8");
 assert.ok(html.includes("data-coru-apply"));
 assert.ok(html.includes("flosy-v310-coru-provenance"));
 assert.ok(core.includes('src="flosy-receipt-coru-model-v310.js?v=3100"'));
 assert.ok(core.includes('src="flosy-receipt-egypt-v310.js?v=3100"'));
 assert.ok(site.includes("flosy-capture-review-v2.js?v=3100"));
 assert.ok(worker.includes("flosy-receipt-coru-model-v310.js"));
 assert.ok(ux.includes("flosyV310ReceiptPreview"));
 assert.ok(!ux.includes("fr.readAsDataURL(file)"));
});
