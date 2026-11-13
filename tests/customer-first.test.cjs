"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"..","flosy-ux-v391.js"),"utf8");
const K={normalize:s=>String(s||"").toLowerCase(),forType:()=>[],groups:()=>[]};
const win={FLOSY_UNIFIED_PAGES:{render(){}},FLOSY_CATEGORIES:K};
vm.runInNewContext(src,{window:win,document:{}},{filename:"flosy-ux-v391.js"});
const amount=win.FLOSY_UX_V391.parseEgyptianMoney;
test("fast entry accepts Arabic, Persian and Western numeral cents",()=>{
 assert.equal(amount("٧٥٫٥٠"),75.5);
 assert.equal(amount("۴۰"),40);
 assert.equal(amount("1,500.50"),1500.5);
 assert.equal(amount("75,50"),75.5);
 assert.equal(amount("0.05"),0.05);
});
test("fast entry rejects negative or ambiguous precision",()=>{
 for(const x of ["-10","10.567","one hundred","1,23,4","","1e5"]){
  assert.ok(Number.isNaN(amount(x)),x);
 }
});

test("quick repeat suggestions use only canonical expense/income, not transfers",()=>{
 win.FLOSY_UNIFIED={state:()=>({transactions:[
  {type:"transfer",amount:1000,accountId:"a",description:"مبلغ من حساب لحساب",date:"2026-11-13"},
  {type:"expense",amount:75.50,accountId:"a",category:"قهوة",description:"قهوة",date:"2026-11-13"}
 ]}),accounts:()=>[{id:"a"}]};
 win.FLOSY_ULTRA_DATA={cleanTx:s=>s.transactions};
 const templates=win.FLOSY_UX_V391.quickTemplates();
 assert.equal(templates.length,1);
 assert.equal(templates[0].amount,75.5);
 assert.equal(templates[0].type,"expense");
});
