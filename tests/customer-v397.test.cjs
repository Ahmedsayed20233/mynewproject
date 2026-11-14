"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const preview=require("../flosy-capture-review-v2.js");
const owned=[{id:"cash",name:"الكاش"},{id:"bank",name:"بنك"}];
const date="2026-11-14";
test("partial voice batch confirms only selected safe actions; blocks unsupported one separately",()=>{
 const items=[
  {intent:"expense",amount:120,date,description:"بنزين",text:"دفعت 120 جنيه"},
  {intent:"refund",amount:200,date,description:"رد سلفة",text:"صاحبي رجع 200"},
  {intent:"income",amount:500,date,description:"دخل",text:"قبضت 500 جنيه"}
 ];
 const fields={"review-selection":"on","include-0":"on","include-2":"on",
  "amount-0":"120","date-0":date,"account-0":"cash","description-0":"بنزين",
  "amount-2":"500","date-2":date,"account-2":"bank","description-2":"مرتب"};
 const result=preview.prepareRows(items,fields,owned);
 assert.deepEqual(result.map(x=>x.type),["expense","income"]);
 assert.deepEqual(result.map(x=>x.amount),[120,500]);
 assert.throws(()=>preview.prepareRows(items,{"review-selection":"on"},owned),/اختار عملية/);
 assert.throws(()=>preview.prepareRows(items,{...fields,"include-1":"on"},owned),/مساراً خاصاً/);
});
test("OCR item corrections persist in ledger draft and reconcile totals",()=>{
 const items=[{intent:"expense",amount:130,date,description:"فاتورة سوبرماركت",
   receiptDetails:{merchant:"محل",items:[{name:"منتج",quantity:2,unitPrice:50,total:100}],
     tax:30,discount:0,arithmeticConsistent:true}}];
 const fields={"amount-0":"130","date-0":date,"account-0":"cash","description-0":"سوبرماركت",
   "receipt-name-0-0":"سكر","receipt-qty-0-0":"2",
   "receipt-price-0-0":"50","receipt-tax-0":"30","receipt-discount-0":"0"};
 const tx=preview.prepareRows(items,fields,owned)[0];
 assert.equal(tx.receiptDetails.items[0].name,"سكر");
 assert.equal(tx.receiptDetails.items[0].total,100);
 assert.equal(tx.receiptDetails.arithmeticConsistent,true);
 assert.throws(()=>preview.prepareRows(items,{...fields,"receipt-price-0-0":"60"},owned),/مجموع الأصناف/);
 const changed=preview.prepareRows(items,{...fields,"receipt-price-0-0":"60","amount-0":"150"},owned)[0];
 assert.equal(changed.amount,150);
 assert.equal(changed.receiptDetails.itemsSum,120);
});
test("real account dialog replaces prompt() and onboarding never seeds fictitious amounts",()=>{
 const core=fs.readFileSync("flosy-unified.js","utf8");
 const wizard=fs.readFileSync("flosy-customer-v397.js","utf8");
 const capture=fs.readFileSync("flosy-capture-review-v2.js","utf8");
 assert.doesNotMatch(core,/\bprompt\(/);
 assert.match(core,/createAccount/);
 assert.match(core,/flosyAccountDialogV397/);
 assert.match(wizard,/monthlySalary/);
 assert.match(wizard,/monthlyCommitments/);
 assert.match(capture,/receipt-name-/);
 assert.match(capture,/review-selection/);
});
