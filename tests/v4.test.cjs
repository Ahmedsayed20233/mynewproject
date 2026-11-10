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


test("Due reminders only show unpaid items; request permission is user-driven",()=>{
 const c=context();
 const today=new Date();today.setHours(12,0,0,0);
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const tomorrow=new Date(today);tomorrow.setDate(today.getDate()+1);
 c.window.FLOSY_PHASE1={occurrences:()=>[
  {id:"one",key:"bill/one",date:iso(tomorrow),name:"Internet",amount:500,paid:false,linked:false},
  {id:"two",key:"bill/two",date:iso(tomorrow),name:"Rent",amount:2500,paid:true,linked:false}
 ]};
 load("flosy-v4-reminders.js",c);
 const upcoming=c.window.FLOSY_REMINDERS.upcoming();
 assert.equal(upcoming.length,1);assert.equal(upcoming[0].amount,500);
 assert.match(c.elems["v4-reminders"].innerHTML,/Internet/);
 assert.doesNotMatch(c.elems["v4-reminders"].innerHTML,/Rent/);
});
test("Biometric privacy reveal is explicitly delegated to native Android when available",()=>{
 const js=fs.readFileSync("flosy-v4-family-privacy.js","utf8");
 assert.match(js,/FLOSY_NATIVE_BIOMETRIC_AVAILABLE/);
 assert.match(js,/flosyapp:\/\/biometric-unlock/);
 assert.match(js,/biometricUnlocked/);
});


test("Offline service worker precaches every local script and stylesheet referenced by the active website",()=>{
 const html=fs.readFileSync("index.html","utf8");
 const sw=fs.readFileSync("service-worker.js","utf8");
 const files=[
  ...Array.from(html.matchAll(/<script src="([^"]+)"/g),m=>m[1]),
  ...Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g),m=>m[1])
 ].filter(x=>!/^https?:/i.test(x));
 assert.ok(files.length>=10,"Expected a full offline app shell");
 for(const file of files) assert.ok(sw.includes("./"+file),"Not precached: "+file);
});


test("Egyptian CSV keeps identical same-day purchases as separate real rows",()=>{
 const c=context();load("flosy-v4-bank.js",c);
 const b=c.window.FLOSY_BANK_CSV;
 const rows=[["10/11/2026","CAFÉ", "125.00"],["10/11/2026","CAFÉ", "125.00"]];
 const mapping={date:"0",description:"1",debit:"",credit:"",amount:"2",direction:"",reference:"",positiveMeans:"expense"};
 const result=b.translate(rows,mapping,"bank");
 assert.equal(result.length,2,"Repeated real transactions must not be silently dropped");
 assert.notEqual(result[0].sourceHash,result[1].sourceHash);
 c.data.transactions.push(...result);
 assert.equal(b.translate(rows,mapping,"bank").length,0,"Reimporting the same source is idempotent");
});

test("Egyptian bank reference makes different statements idempotent",()=>{
 const c=context();load("flosy-v4-bank.js",c);
 const b=c.window.FLOSY_BANK_CSV;
 const mapping={date:"0",description:"1",debit:"2",credit:"3",amount:"",direction:"",reference:"4",positiveMeans:""};
 const first=b.translate([["2026-11-10","CIB card", "350","", "TXN-1001"]],mapping,"bank");
 assert.equal(first.length,1);
 c.data.transactions.push(...first);
 const imported=b.translate([["2026-11-10","CIB card","","350","TXN-1001"]],mapping,"bank");
 assert.equal(imported.length,0,"Bank reference wins over changing export narratives/amount columns");
});

test("Egyptian receipt parser reads labeled total and date; never infers from invoice number",()=>{
 const c=context();load("flosy-v4-capture.js",c);
 const p=c.window.FLOSY_CAPTURE.parseReceipt;
 const receipt=p("كافيه الجامعة\\nرقم الفاتورة: 104857\\nالاجمالي 1,234.50\\nالتاريخ: 10/11/2026");
 assert.equal(receipt.amount,1234.5);
 assert.equal(receipt.date,"2026-11-10");
 assert.equal(receipt.source,"receipt_reviewed");
 assert.throws(()=>p("رقم الفاتورة: 99999\\nكافيه الجامعة\\nضريبة 12.50"),/إجمالي/);
});

test("Pearl command center stays in white mode, updates from validated local data, and has real buttons",()=>{
 const c=context();c.window.FLOSY_PHASE1={calculate:()=>({daily:150,days:12})};
 c.window.FLOSY_SYNC_V3={getStatus:()=>({status:"متزامن",revision:7,dirty:false})};
 c.window.FLOSY_REMINDERS={upcoming:()=>[{days:1,paid:false,linked:false}]};
 c.window.FLOSY_BRIDGE.getSession=()=>({user:{id:"dev-user"}});
 load("flosy-v5-command.js",c);
 assert.match(c.elems.flosyV5Command.innerHTML,/١٥٠|150/);
 assert.match(c.elems.flosyV5Command.innerHTML,/إصدار 7/);
 assert.match(c.elems.flosyV5Command.innerHTML,/data-v5-go="v4-bank"/);
 const css=fs.readFileSync("flosy-v5-pearl.css","utf8");
 assert.match(css,/color-scheme:light!important/);
 const index=fs.readFileSync("index.html","utf8");
 assert.ok(index.includes("flosy-v5-pearl.css"));
 assert.ok(index.includes("flosy-v5-command.js"));
});

test("Calendar export contains explicit due dates, not personal amounts or accounts",()=>{
 const c=context();
 c.window.FLOSY_PHASE1={occurrences:()=>[
  {id:"internet",key:"bill/internet/2026-11",date:"2026-11-20",name:"Internet",amount:1250,paid:false,linked:false},
  {id:"paid",key:"bill/paid/2026-11",date:"2026-11-22",name:"Secret",amount:9999,paid:true,linked:false}
 ]};
 load("flosy-v4-reminders.js",c);
 const ics=c.window.FLOSY_REMINDERS.calendarText();
 assert.match(ics,/BEGIN:VCALENDAR/);
 assert.match(ics,/BEGIN:VEVENT/);
 assert.match(ics,/DTSTART;VALUE=DATE:20261120/);
 assert.doesNotMatch(ics,/1250|9999|Secret|Internet/);
});


test("Encrypted off-device backup round-trips and rejects a wrong password without mutation",async()=>{
 const c=context();
 c.ctx.crypto=require("node:crypto").webcrypto;
 c.ctx.TextEncoder=TextEncoder;c.ctx.TextDecoder=TextDecoder;
 c.ctx.atob=atob;c.ctx.btoa=btoa;
 load("flosy-v5-private-backup.js",c);
 const app=c.window.FLOSY_V5_BACKUP;
 const original={accounts:[{id:"bank",opening:1000}],transactions:[{id:"t1",type:"expense",amount:77}],settings:{salary:17000}};
 const encrypted=await app.seal(original,"very-long-private-phrase","the-user");
 assert.equal(encrypted.format,"flosy-aesgcm-v1");
 assert.equal(encrypted.cipher,"AES-256-GCM");
 assert.equal(encrypted.iterations,250000);
 assert.equal(JSON.stringify(encrypted).includes('"salary":17000'),false,"No readable financial amounts in backup");
 const restored=await app.unseal(encrypted,"very-long-private-phrase");
 assert.equal(restored.ownerId,"the-user");
 assert.equal(JSON.stringify(restored.payload),JSON.stringify(original));
 await assert.rejects(app.unseal(encrypted,"incorrect-password"),/كلمة المرور/);
 assert.equal(c.data.transactions.length,0,"Unit test never changes active finance state");
});
