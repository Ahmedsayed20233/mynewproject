"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const scope={window:{},TextEncoder,Uint8Array,Intl,Math,Date,Number,Map,Set};
vm.createContext(scope);
vm.runInContext(fs.readFileSync("flosy-report-kit.js","utf8"),scope);
const kit=scope.window.FLOSY_REPORT_KIT;
const state={accounts:[{id:"a1",name:"CIB 1234"},{id:"a2",name:"Wallet"}],transactions:[
 {id:"e1",type:"expense",date:"2026-11-01",category:"قهوة",description:"coffee",amount:50,accountId:"a1"},
 {id:"e2",type:"expense",date:"2026-11-02",category:"مواصلات",amount:200,accountId:"a2"},
 {id:"i1",type:"income",date:"2026-11-03",amount:1000,accountId:"a1"},
 {id:"t1",type:"transfer",date:"2026-11-03",amount:500,accountId:"a1"},
 {id:"p",type:"expense",date:"2026-11-04",amount:900,status:"pending"},
 {id:"f",type:"expense",date:"2026-11-04",amount:800,status:"failed"},
 {id:"rev",type:"expense",date:"2026-11-04",amount:800,status:"reversed"},
 {id:"del",type:"expense",date:"2026-11-04",amount:700,deleted:true},
 {id:"bad",type:"expense",date:"2026-11-04",amount:"NaN"},
 {id:"older",type:"expense",date:"2026-10-30",amount:1900},
]};
const range={start:"2026-11-01",end:"2026-11-12"};
test("summaries exclude incomplete/invalid events and internal transfers from spend",()=>{
 const x=kit.build(state,range);
 assert.equal(x.expense,25000);assert.equal(x.income,100000);assert.equal(x.transfers,50000);
 assert.equal(x.net,75000);assert.equal(x.rows.length,4);assert.equal(x.rejected,5);
 assert.equal(x.accounts.length,2);
 assert.equal(x.categories[0].name,"مواصلات");
 assert.equal(x.categories[1].icon,"☕");
});
test("report chart and suggestions contain only scoped ledger aggregates",()=>{
 const html=kit.printAppendix(state,range);
 assert.match(html,/8\. تحليلات/);assert.match(html,/مواصلات/);assert.match(html,/10٪/);
 assert.doesNotMatch(html,/undefined|NaN/);
 assert.ok(kit.build(state,range).advice.some(x=>x.includes("ليست توصيات شراء")));
});
test("exports a real Office OpenXML archive containing five worksheets",()=>{
 const bytes=kit.xlsxBytes(kit.build(state,range)),buffer=Buffer.from(bytes);
 assert.equal(buffer.readUInt32LE(0),0x04034b50);
 assert.ok(buffer.includes(Buffer.from("[Content_Types].xml")));
 assert.ok(buffer.includes(Buffer.from("xl/workbook.xml")));
 assert.ok(buffer.includes(Buffer.from("xl/worksheets/sheet5.xml")));
 assert.ok(buffer.includes(Buffer.from("مواصلات")));
 assert.ok(buffer.includes(Buffer.from("1000")));
 assert.equal(buffer.readUInt32LE(buffer.length-22),0x06054b50);
});
test("Excel formula-looking user strings are inline text, never executable formulas",()=>{
 const x=kit.build({transactions:[{date:"2026-11-03",type:"expense",amount:5,description:"=HYPERLINK(1,2)",category:"<script>alert(1)</script>"}]},range);
 const bytes=kit.xlsxBytes(x),content=Buffer.from(bytes).toString("utf8");
 assert.ok(content.includes("=HYPERLINK(1,2)"));
 assert.ok(!content.includes("<f>"));
 assert.ok(content.includes("&lt;script&gt;"));
});
test("empty reports and malformed dates fail safely",()=>{
 assert.equal(kit.build({transactions:[]},range).rows.length,0);
 assert.throws(()=>kit.build({}, {start:"2026-11-13",end:"2026-11-12"}),/فترة/);
});
