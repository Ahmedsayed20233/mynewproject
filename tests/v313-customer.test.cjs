"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const js=fs.readFileSync("flosy-customer-v313.js","utf8"),css=fs.readFileSync("flosy-customer-v313.css","utf8");
function harness(){
 const s={accounts:[{id:"cash",name:"الكاش",opening:900}],deletedIds:["transactions/deleted"],transactions:[
  {id:"old",type:"expense",amount:35,date:"2026-11-08",description:"فطار",accountId:"cash",createdAt:"2026-11-08T12:00:00Z"},
  {id:"latest",type:"expense",amount:55,date:"2026-11-13",description:"قهوة",category:"قهوة",accountId:"cash",createdAt:"2026-11-13T12:00:00Z"},
  {id:"deleted",type:"expense",amount:999,date:"2026-11-14",description:"deleted",accountId:"cash",createdAt:"2026-11-14T14:00:00Z"},
  {id:"pending",type:"expense",amount:12000,date:"2026-11-14",description:"pending",accountId:"cash",status:"pending",createdAt:"2026-11-14T18:00:00Z"},
  {id:"income",type:"income",amount:70000,date:"2026-11-14",description:"salary",accountId:"cash",createdAt:"2026-11-14T18:00:00Z"}
 ]};
 const document={addEventListener(){},querySelector(){return null},getElementById(){return null},body:{classList:{add(){}}}};
 const window={FLOSY_UNIFIED_PAGES:{render(){}},FLOSY_CUSTOMER_V312:{openSheet(){},clearSheet(){}},
  FLOSY_UNIFIED:{state:()=>s,accounts:()=>s.accounts,date:()=>"2026-11-14"}};
 vm.runInNewContext(js,{window,document,Intl,Set,Date,Number,Math,String,Object,JSON,Array,Error});
 return{v313:window.FLOSY_CUSTOMER_V313,s};
}
test("last expense ignores deleted, pending, incoming and preserves canonical ledger",()=>{
 const {v313,s}=harness();
 assert.equal(v313.latestExpense().id,"latest");
 assert.equal(s.transactions.length,5);
});
test("financial preview uses only entered amount, owned account, real description",()=>{
 const {v313}=harness();
 const form={elements:{
  amount:{value:"75"},type:{value:"expense"},description:{value:"قهوة"},
  accountId:{value:"cash"},targetAccountId:{value:""},category:{value:"قهوة"}
 }};
 const preview=v313.formatPreview(form);
 assert.ok(preview.includes("قهوة")&&preview.includes("الكاش"));
 assert.ok(preview.includes("75")||preview.includes("٧٥"));
 form.elements.amount.value="";
 assert.ok(v313.formatPreview(form).includes("اكتب المبلغ"));
});
test("form and safety guards require explicit account data and descriptions",()=>{
 const quick=fs.readFileSync("flosy-customer-v312.js","utf8");
 assert.ok(quick.includes("enteredDescription"));
 assert.ok(quick.includes('type==="expense"&&!enteredDescription'));
 assert.ok(quick.includes("flosy391_manual_repeat"));
 assert.ok(js.includes("a.createAccount("));
 assert.ok(js.includes("data-cx313-repeat"));
 assert.ok(js.includes("flosy_ai_feedback_v313"));
 assert.ok(js.includes("FLOSY_HANDLE_BACK"));
 assert.ok(js.includes('id==="receipt"')===false);
});
test("v313 is loaded on site and in offline cache with versioned independent CSS",()=>{
 const html=fs.readFileSync("flosy.html","utf8"),sw=fs.readFileSync("service-worker.js","utf8");
 for(const key of ["flosy-customer-v313.js?v=3130","flosy-customer-v313.css?v=3130"]){
  assert.ok(html.includes(key));assert.ok(sw.includes("./"+key));
 }
 assert.match(sw,/flosy-unified-v313-usability-sprint/);
 assert.match(css,/\.cx313-quickstart/);
 assert.match(css,/\.cx313-home-rail/);
 assert.match(css,/\.cx313-quick-preview/);
});
