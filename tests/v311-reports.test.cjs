"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const root={},context={window:root,TextEncoder,Intl,Number,Map,Set,Date,Math,Uint8Array,Array};
vm.runInNewContext(fs.readFileSync("flosy-report-kit.js","utf8"),context,{filename:"flosy-report-kit.js"});
const kit=root.FLOSY_REPORT_KIT,report=require("../flosy-report-plus-v311.js");
const state={
 accounts:[{id:"cash",name:"الكاش"},{id:"bank",name:"بنك مصر"}],
 transactions:[
 {id:"r1",type:"income",date:"2026-11-01",amount:5000,accountId:"bank",category:"مرتب",description:"مرتب شهري"},
 {id:"r2",type:"expense",date:"2026-11-02",amount:800,accountId:"cash",category:"طعام",description:"سوبرماركت"},
 {id:"r3",type:"expense",date:"2026-11-04",amount:100,accountId:"bank",category:"مواصلات",description:"بنزين"},
 {id:"r4",type:"transfer",date:"2026-11-05",amount:1000,accountId:"bank",targetAccountId:"cash",category:"تحويل"},
 {id:"r5",type:"expense",date:"2026-11-06",amount:10000,accountId:"bank",category:"طعام",description:"فشل",status:"failed"},
 {id:"r6",type:"expense",date:"2026-11-07",amount:6000,accountId:"bank",category:"طعام",description:"معلق",status:"pending"},
 {id:"r7",type:"expense",date:"2026-10-18",amount:600,accountId:"cash",category:"طعام",description:"تاريخ سابق"},
 {id:"r8",type:"expense",date:"2026-11-08",amount:70,accountId:"cash",category:"ترفيه",description:"=HYPERLINK(\"https://evil.example\")"},
 {id:"r9",type:"expense",date:"2026-11-11",amount:30,accountId:"cash",category:"طعام",description:"استرداد",status:"reversed"}
 ],
 settings:{categoryBudgets:[{name:"طعام",limit:1000},{name:"مواصلات",limit:250}]}
};
const options={start:"2026-11-01",end:"2026-11-14",type:"all",accountId:"all",category:"all"};
test("Presets are calendar aware, not fixed 30-day guesses",()=>{
 assert.deepEqual(report.rangeFor("month","2026-11-14"),{start:"2026-11-01",end:"2026-11-14"});
 assert.deepEqual(report.rangeFor("week","2026-11-14"),{start:"2026-11-08",end:"2026-11-14"});
 assert.deepEqual(report.rangeFor("quarter","2026-11-14"),{start:"2026-09-01",end:"2026-11-14"});
 assert.deepEqual(report.rangeFor("lastyear","2026-11-14"),{start:"2025-01-01",end:"2025-12-31"});
 assert.deepEqual(report.rangeFor("all","2026-11-14",state.transactions),{start:"2026-10-18",end:"2026-11-14"});
});
test("Validates real dates and rejects invalid filter types",()=>{
 for(const o of [{...options,start:"2026-02-30"},{...options,start:"2026-12-01"},
  {...options,type:"unsafe"}])assert.throws(()=>report.validate(o));
});
test("Only actual posted ledger records enter income, expenses and transfer",()=>{
 const r=report.build(state,options,kit);
 assert.equal(r.income,500000);
 assert.equal(r.expense,97000);
 assert.equal(r.transfers,100000);
 assert.equal(r.net,403000);
 assert.equal(r.rows.length,5);
 assert.equal(r.categories[0].name,"طعام");
 assert.equal(r.savingsRatioPrecise,80.6);
 assert.equal(r.timeline.length,1);
 assert.equal(r.timeline[0].expense,97000);
 assert.equal(r.budgets.length,2);
 assert.equal(r.budgets[0].spent,80000);
});
test("Account/category/type filters and prior period comparison never mix money",()=>{
 const only=report.build(state,{...options,accountId:"cash",category:"طعام",type:"expense"},kit);
 assert.equal(only.expense,80000);
 assert.equal(only.income,0);
 assert.equal(only.transfers,0);
 assert.equal(only.rows.length,1);
 assert.equal(only.comparison.expense,0);
 const sum=report.build(state,{...options,start:"2026-10-18",end:"2026-11-14"},kit);
 assert.equal(sum.timeline.length,2);
 assert.equal(sum.comparison.previousCount,0);
});
test("CSV UTF8-BOM, Arabic columns, quoting, and Excel formula injection protection",()=>{
 const r=report.build(state,options,kit);
 const csv=report.csvText(r),bytes=report.csvBytes(r);
 assert.equal(bytes[0],0xef);assert.equal(bytes[1],0xbb);assert.equal(bytes[2],0xbf);
 assert.ok(csv.includes('"التاريخ","النوع","الفئة"'));
 assert.ok(csv.includes("'=HYPERLINK"));
 assert.ok(!csv.includes('"=HYPERLINK'));
 assert.equal(csv.split("\r\n").filter(Boolean).length,6);
});
test("XLSX truly contains formatted eight-sheet OpenXML workbook, not CSV with renamed extension",()=>{
 const r=report.build(state,options,kit),buffer=kit.xlsxBytes(r);
 assert.equal(buffer[0],0x50);assert.equal(buffer[1],0x4b);
 const s=Buffer.from(buffer).toString("latin1");
 for(const k of ["xl/workbook.xml","xl/worksheets/sheet1.xml","xl/worksheets/sheet6.xml",
   "xl/worksheets/sheet7.xml","xl/worksheets/sheet8.xml"])assert.ok(s.includes(k),k);
 assert.ok(buffer.length>4000);
});
test("Report UI has real PDF, Excel, CSV actions and interactive preview; no fake success toast",()=>{
 const ui=report.controls(state,"2026-11-14");
 assert.ok(ui.includes('data-kind="pdf"'));
 assert.ok(ui.includes('data-kind="excel"'));
 assert.ok(ui.includes('data-kind="csv"'));
 assert.ok(ui.includes("flosyReportAccount"));
 assert.ok(ui.includes("flosyReportCategory"));
 assert.ok(report.preview(report.build(state,options,kit)).includes("مقارنة بالفترة السابقة"));
 const html=fs.readFileSync("flosy.html","utf8"),
 pro=fs.readFileSync("flosy-report-pro.js","utf8"),
 worker=fs.readFileSync("service-worker.js","utf8");
 assert.ok(!html.includes("showToast('تم تصدير التقرير الرسمي"));
 assert.ok(pro.includes('transfer("csv",bytes,filename)'));
 assert.ok(worker.includes("flosy-report-plus-v311.js?v=3110"));
 assert.ok(html.includes("flosy-report-plus-v311.js?v=3110"));
});
