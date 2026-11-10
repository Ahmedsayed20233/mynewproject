"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
function context(overrides={}){
 const data={settings:{salary:17000,rent:2500,bills:500,living:6000,emergencyTarget:60000},
  accounts:[{id:"bank",name:"الفيزا",opening:20000},{id:"wallet",name:"كاش",opening:0},{id:"emergency",name:"الطوارئ",opening:30000}],
  transactions:[],trades:[],assets:[],liabilities:[],v4:{crisis:{incomeLostMonths:3,inflationPct:15,medicalCost:0,extraRent:0}},...overrides};
 const elems={},listeners={};const E=id=>elems[id]||(elems[id]={id,innerHTML:"",value:"",style:{},files:[],options:[],
  classList:{toggle(){}},addEventListener(){},querySelector(){return null}});
 const document={getElementById:E,addEventListener:(type,fn)=>{listeners[type]=fn},body:{classList:{toggle(){}}},head:{appendChild(){}}};
 const window={FLOSY_BRIDGE:{getState:()=>data,getSession:()=>null,persistInitial(){},render(){},goto(){},
   mutate:fn=>fn(data),toast(){},getCloud(){},cloudApi(){}},
  FLOSY_PRO:{rowsForAccounts:()=>({bank:20000,wallet:0,emergency:30000}),metrics:()=>({cash:50000,portfolio:{market:10000},debt:0})},
  addEventListener(){}};
 const memory={};const localStorage={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=String(v),removeItem:k=>delete memory[k]};
 const ctx={window,document,localStorage,sessionStorage:localStorage,navigator:{userAgent:"Chrome",clipboard:{writeText:async()=>{}}},crypto:{randomUUID:()=>Math.random().toString(36)},
  console,Date,Intl,Math,Number,Map,Set,Promise,URL,Blob,confirm:()=>true,alert(){},prompt:()=>null,fetch:async()=>({}),
  FormData:class {constructor(x){this.x=x}get(k){return this.x[k]||null}}};
 return {ctx,window,data,elems,events:listeners};
}
function load(file,scope){
 vm.runInNewContext(fs.readFileSync(file,"utf8"),scope.ctx,{filename:file,timeout:1500});
}
test("V4 modules are valid JS and launch with offline, empty, unsaved financial state",()=>{
 for(const file of ["flosy-v4-capture.js","flosy-v4-bank.js","flosy-v4-wealth.js","flosy-v4-family-privacy.js"]){
  const c=context();load(file,c);assert.ok(Object.keys(c.window).some(x=>x.startsWith("FLOSY_")));
 }
});
test("Bank SMS CIB parses currency before value, merchant category and no OTP",()=>{
 const c=context();load("flosy-v4-capture.js",c);
 const sms=c.window.FLOSY_CAPTURE.parseBankSMS("CIB: Card debited EGP 1,234.50 for PURCHASE at Starbucks");
 assert.equal(sms.type,"expense");assert.equal(sms.amount,1234.5);assert.equal(sms.category,"ترفيه");
 assert.throws(()=>c.window.FLOSY_CAPTURE.parseBankSMS("OTP 9523: paid EGP 120"));
});
test("Egyptian spoken phrase preserves amount and coffee classification",()=>{
 const c=context();load("flosy-v4-capture.js",c);
 const r=c.window.FLOSY_CAPTURE.parseVoice("دفعت ٧٥ جنيه على القهوة من الفيزا");
 assert.equal(r.amount,75);assert.equal(r.category,"ترفيه");assert.equal(r.type,"expense");
 assert.equal(r.accountId,"bank");
});
test("Receipt OCR proposal handles a currency-bearing TOTAL line",()=>{
 const c=context();load("flosy-v4-capture.js",c);
 const r=c.window.FLOSY_CAPTURE.parseReceipt("CAFE CAMPUS\nTOTAL: EGP 125.00\nThank you");
 assert.equal(r.amount,125);assert.equal(r.type,"expense");
});
test("Bank CSV quoted cells and separate debit/credit columns parse exactly once",()=>{
 const c=context();load("flosy-v4-bank.js",c);
 const b=c.window.FLOSY_BANK_CSV,rows=b.csvRecords('date,description,debit,credit\n2026-11-09,"Cafe, Campus",125,\n2026-11-10,Salary,,17000');
 assert.equal(rows[1][1],"Cafe, Campus");
 const result=b.translate(rows.slice(1),{date:"0",description:"1",debit:"2",credit:"3",amount:"",direction:"",positiveMeans:""},"bank");
 assert.equal(result.length,2);assert.equal(result[0].amount,125);assert.equal(result[0].type,"expense");
 assert.equal(result[1].amount,17000);assert.equal(result[1].type,"income");
});
test("A single positive CSV amount is rejected without explicit sign convention",()=>{
 const c=context();load("flosy-v4-bank.js",c);
 const f=c.window.FLOSY_BANK_CSV.translate;
 assert.throws(()=>f([["2026-11-10","250"]],{date:"0",description:"",debit:"",credit:"",amount:"1",direction:"",positiveMeans:""},"bank"));
 const a=f([["2026-11-10","250"]],{date:"0",description:"",debit:"",credit:"",amount:"1",direction:"",positiveMeans:"expense"},"bank");
 assert.equal(a[0].type,"expense");
});
test("Egyptian wealth net worth includes assets at manual EGP values but deducts debts",()=>{
 const c=context({assets:[{id:"g1",assetKind:"gold",value:12000}],liabilities:[{id:"d1",balance:3000}]});
 load("flosy-v4-wealth.js",c);const r=c.window.FLOSY_V4_WEALTH.wealthSummary();
 assert.equal(r.manual,12000);assert.equal(r.debt,3000);assert.equal(r.net,69000);
});
test("Crisis simulator handles inflation and income-loss months, without fake investment return",()=>{
 const c=context();load("flosy-v4-wealth.js",c);
 const p=c.window.FLOSY_V4_WEALTH.simulate({incomeLostMonths:3,inflationPct:15,medicalCost:5000,extraRent:500});
 assert.ok(p.newExpense>9000);assert.ok(p.need>30000);
 assert.equal(p.savings,8000);assert.ok(p.shortfall>0);
});
test("White design is exclusive with hidden theme toggle, attached new pages and offline shell",()=>{
 const html=fs.readFileSync("index.html","utf8");
 const css=fs.readFileSync("flosy-v4-white.css","utf8");
 const sw=fs.readFileSync("service-worker.js","utf8");
 assert.match(html,/<body class="light">/);
 assert.match(html,/flosy-v4-white\.css/);
 assert.doesNotMatch(html,/classList\.toggle\('light'\)/);
 for(const id of ["v4-capture","v4-bank","v4-wealth","v4-crisis","v4-family","v4-privacy"])
  assert.match(html,new RegExp('id="page-'+id+'"'));
 assert.match(css,/#themeBtn\{display:none!important\}/);
 assert.match(sw,/url\.origin!==self\.location\.origin/);
});
