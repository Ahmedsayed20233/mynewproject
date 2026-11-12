"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("flosy-account-router.js","utf8");
const context={window:{},Number,String,Map,Set,RegExp};
vm.createContext(context);vm.runInContext(source,context);
const R=context.window.FLOSY_ACCOUNT_ROUTER;
const accounts=[
 {id:"cib1",name:"الحساب الجاري CIB",bankName:"CIB",last4:"1234"},
 {id:"cib2",name:"CIB بطاقة",bankName:"CIB",last4:"5678"},
 {id:"nbe",name:"البنك الأهلي",bankName:"NBE",last4:"2222"}
];
test("SMS masked last4 routes unambiguously within same bank",()=>{
 const r=R.match(accounts,{sender:"CIB",text:"تم خصم مبلغ 80 جنيه من بطاقة ****١٢٣٤"});
 assert.equal(r.id,"cib1");assert.equal(r.reason,"last4");
});
test("ambiguous institution stops ledger write",()=>{
 assert.equal(R.match(accounts,{sender:"CIB",text:"تم خصم مبلغ 50 جنيه"}).id,"");
});
test("unique bank sender routes to dedicated bank",()=>{
 assert.equal(R.match(accounts,{sender:"NBE",text:"تم إيداع مبلغ 180 جنيه"}).id,"nbe");
});
test("bank and last four conflict rejects possible fraud or OCR error",()=>{
 const r=R.match(accounts,{sender:"CIB",text:"تم خصم 80 جنيه من بطاقة ****2222"});
 assert.equal(r.id,"");assert.equal(r.reason,"bank-last4-conflict");
});
test("unknown or multiple masked cards never guess",()=>{
 assert.equal(R.match(accounts,{sender:"CIB",text:"البطاقة ****9999"}).id,"");
 assert.equal(R.match(accounts,{sender:"CIB",text:"البطاقة ****1234، الحساب ****5678"}).id,"");
});
test("default selection can route only absent conflicting hints",()=>{
 assert.equal(R.match(accounts,{text:"تم سحب 50 جنيه",defaultAccountId:"cib2"}).id,"cib2");
 assert.equal(R.match(accounts,{sender:"NBE",defaultAccountId:"cib2"}).id,"nbe");
 assert.equal(R.match(accounts,{sender:"HSBC",defaultAccountId:"cib2"}).id,"");
});
test("single-owner ledger account routes cautiously",()=>{
 assert.equal(R.match([accounts[0]],{text:"تم سحب 50 جنيه"}).id,"cib1");
});
test("account chooser is wired into the two SMS import paths and keeps sender",()=>{
 const cap=fs.readFileSync("flosy-v4-capture.js","utf8");
 const next=fs.readFileSync("flosy-next.js","utf8");
 assert.match(cap,/FLOSY_ACCOUNT_ROUTER\?\.match\(cash\(\)/);
 assert.match(next,/FLOSY_ACCOUNT_ROUTER\?\.match\(C\.getState\(\)\.accounts/);
 assert.match(next,/sender:String\(x\.sender\|\|""\)/);
 assert.doesNotMatch(cap,/accountId:cash\(\)\[0\]\?\.id/);
});
test("context icons use actual transaction descriptions",()=>{
 const kit=fs.readFileSync("flosy-report-kit.js","utf8"),ele=fs.readFileSync("flosy-elevate.js","utf8");
 assert.match(kit,/iconFor:icon/);assert.match(ele,/FLOSY_REPORT_KIT\?\.iconFor/);
});
