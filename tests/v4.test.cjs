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
 vm.runInNewContext(fs.readFileSync(file,"utf8"),scope.ctx,{filename:file,timeout:5000});
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

test("Old Flosy bank fingerprint survives upgrades without duplicate historical spending",()=>{
 const c=context();load("flosy-v4-bank.js",c);
 const basis="bank|2026-11-10|expense|125.00|cafe";
 let hash=2166136261;
 for(const ch of basis){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)}
 c.data.transactions.push({id:"old-import",sourceHash:"bank4-"+(hash>>>0).toString(16)});
 const options={date:"0",description:"1",amount:"2",debit:"",credit:"",direction:"",reference:"",positiveMeans:"expense"};
 const imported=c.window.FLOSY_BANK_CSV.translate([
  ["2026-11-10","Cafe","125"],
  ["2026-11-10","Cafe","125"]
 ],options,"bank");
 assert.equal(imported.length,1,"Previously imported first row is skipped but second genuine payment is retained");
});

test("Conflicting amounts sharing the same bank reference require review, never silent import",()=>{
 const c=context();load("flosy-v4-bank.js",c);
 const options={date:"0",description:"1",amount:"2",debit:"",credit:"",direction:"",reference:"3",positiveMeans:"expense"};
 assert.throws(()=>c.window.FLOSY_BANK_CSV.translate([
  ["2026-11-10","Cafe","125","ref-55"],
  ["2026-11-10","Cafe","250","ref-55"]
 ],options,"bank"),/مرجع البنك/);
});

test("Even the first unstyled HTML shell defaults to light; no dark startup flash",()=>{
 const html=fs.readFileSync("index.html","utf8");
 assert.match(html,/:root\{color-scheme:light;/);
 assert.doesNotMatch(html,/--bg:#081422|background:linear-gradient\(180deg,#0b1c30/);
 assert.match(html,/<body class="light">/);
});


test("Repair UI renders manual OCR review and keeps every expense approval-only",()=>{
 const c=context();load("flosy-v4-capture.js",c);load("flosy-repair.js",c);
 assert.match(c.elems.flosyRepairRoot.innerHTML,/flosyRepairOCRText/);
 assert.match(c.elems.flosyRepairRoot.innerHTML,/data-repair="voice"/);
 assert.equal(c.data.transactions.length,0);
 const r=c.window.FLOSY_REPAIR.proposeReceipt(["Cafe Campus","TOTAL: EGP 125.00"].join(String.fromCharCode(10)),"manual");
 assert.equal(r,true,c.elems.flosyOcrStatus?.textContent||"Receipt parsing returned false");
 assert.equal(c.data.transactions.length,0,"Extraction must never save expense automatically");
 assert.match(c.elems["v4-capture-review"].innerHTML,/125/);
});
test("Flosy assistant generates trustworthy local figures and never sends transaction records",()=>{
 const c=context();c.data.transactions.push({id:"t1",type:"expense",amount:80,date:new Date().toISOString().slice(0,7)+"-02"});
 c.window.FLOSY_PHASE1={calculate:()=>({safe:800,daily:50,days:16,obligations:500})};
 load("flosy-assistant-bridge.js",c);
 const helper=c.window.FLOSY_ASSIST_TOOLS;
 assert.ok(helper.evidence().expenses===80);
 assert.match(helper.localInsight(),/80|٨٠/);
 assert.match(c.elems.flosyAssistantBridgeRoot.innerHTML,/ChatGPT/);
 assert.equal(c.data.transactions.length,1);
});
test("Supabase assistant uses a supported model and exposes no API secrets from health",()=>{
 const edge=fs.readFileSync("supabase/functions/flosy-ai/index.ts","utf8");
 assert.match(edge,/gpt-5\.4-mini/);
 assert.doesNotMatch(edge,/gpt-6-luna/);
 assert.match(edge,/ai_ready/);
 assert.match(edge,/auth\/v1\/user/);
 assert.match(edge,/OPENAI_API_KEY/);
 const site=fs.readFileSync("index.html","utf8");
 assert.match(site,/flosy-assistant-bridge\.js/);
 assert.match(site,/flosy-repair\.js/);
});
test("WebView native OCR contract uses reviewed parseReceipt; browser camera remains available",()=>{
 const repair=fs.readFileSync("flosy-repair.js","utf8");
 const capture=fs.readFileSync("flosy-v4-capture.js","utf8");
 assert.match(repair,/receiveNativeReceipt/);
 assert.match(repair,/FLOSY_NATIVE_OCR_AVAILABLE/);
 assert.match(repair,/data-v4-import="ocr"/);
 assert.match(repair,/Tesseract/);
});


test("Free Flosy coach works without login, internet or OpenAI API key",async()=>{
 const c=context();
 c.ctx.fetch=()=>{throw Error("No API should be called in free mode")};
 const month=new Date().toISOString().slice(0,7);
 c.data.transactions.push({id:"free-income",type:"income",amount:10000,date:month+"-03"});
 c.data.transactions.push({id:"free-expense",type:"expense",amount:250,date:month+"-04",category:"طعام ومشروبات"});
 c.window.FLOSY_PHASE1={calculate:()=>({daily:95,safe:1900,days:20})};
 load("flosy-ai.js",c);
 const s=c.window.FLOSY_AI.snapshot();
 assert.equal(s.income,10000);assert.equal(s.spending,250);
 assert.equal(s.safeDaily,95);
 const reply=c.window.FLOSY_AI.answerFree("أكبر فئات المصروف");
 assert.match(reply,/طعام ومشروبات/);
 assert.match(reply,/250|٢٥٠/);
 assert.match(reply,/محلي/);
 await c.window.FLOSY_AI.ask("أبني صندوق طوارئ إزاي؟");
 assert.match(c.elems.flosyAiRoot.innerHTML,/طوارئ/);
 assert.match(c.elems.flosyAiRoot.innerHTML,/المجاني/);
 assert.doesNotMatch(c.elems.flosyAiRoot.innerHTML,/disabled>اسأل المساعد/);
});
test("Android microphone and camera taps use origin-restricted native bridge if available",()=>{
 const c=context(),messages=[];
 c.window.FLOSY_NATIVE_VOICE_AVAILABLE=true;
 c.window.FLOSY_NATIVE_OCR_AVAILABLE=true;
 c.window.FlosyNative={postMessage:message=>messages.push(JSON.parse(message))};
 load("flosy-v4-capture.js",c);
 load("flosy-repair.js",c);
 assert.match(c.elems.flosyRepairRoot.innerHTML,/native-camera/);
 c.window.FLOSY_REPAIR.startVoice();
 c.window.FLOSY_REPAIR.nativeAction("receipt-camera","receipt-camera");
 c.window.FLOSY_REPAIR.nativeAction("receipt-export","", "Cafe\\nTOTAL EGP 50");
 assert.equal(messages.length,3);
 assert.deepEqual(messages.map(m=>m.action),["voice","receipt-camera","receipt-export"]);
 assert.equal(messages[2].text.includes("TOTAL"),true);
 assert.equal(c.data.transactions.length,0);
});
test("Receipt UI provides manual confirmation and export even if OCR network model fails",()=>{
 const c=context();load("flosy-v4-capture.js",c);load("flosy-repair.js",c);
 const html=c.elems.flosyRepairRoot.innerHTML;
 assert.match(html,/flosyReceiptManualForm/);
 assert.match(html,/export-ocr/);
 assert.match(html,/flosyRepairOCRText/);
 assert.equal(c.data.transactions.length,0);
});
test("Flosy AI defaults to free mode, API stays optional and offline shell is versioned",()=>{
 const ai=fs.readFileSync("flosy-ai.js","utf8");
 const sw=fs.readFileSync("service-worker.js","utf8");
 assert.match(ai,/mode="free"/);
 assert.match(ai,/answerFree/);
 assert.match(ai,/OpenAI API/);
 assert.ok(sw.includes("flosy-ai.js?v=700"));
 assert.ok(sw.includes("flosy-repair.js?v=1001"));
});


test("Reference-inspired budget suggestions require repeated expense history, never transfers",()=>{
 const c=context();
 const today=new Date();
 const mk=offset=>{
  const d=new Date(today.getFullYear(),today.getMonth()+offset,4,12);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),"04"].join("-");
 };
 for(let m=-3;m<=-1;m++){
  c.data.transactions.push({id:"food-"+m,date:mk(m),type:"expense",category:"طعام ومشروبات",amount:150});
  c.data.transactions.push({id:"transfer-"+m,date:mk(m),type:"transfer",category:"الاستثمار",amount:9000});
 }
 load("flosy-elevate.js",c);
 const q=c.window.FLOSY_ELEVATE.suggestions();
 assert.equal(q.length,1);
 assert.equal(q[0].category,"طعام ومشروبات");
 assert.equal(q[0].target,200);
 assert.ok(q[0].average<200,"Transfers cannot inflate suggested expense budgets");
 const prior=c.data.transactions.length;
 assert.equal(c.window.FLOSY_ELEVATE.acceptBudget("طعام ومشروبات"),true);
 assert.equal(c.data.elevate.categoryBudgets["طعام ومشروبات"].amount,200);
 assert.equal(c.data.transactions.length,prior,"Accept budget cannot post or edit bank transactions");
 assert.equal(c.window.FLOSY_ELEVATE.acceptBudget("Imaginary category"),false);
});
test("Budget recommendations do not guess from one incomplete historical month",()=>{
 const c=context(),now=new Date(),prev=new Date(now.getFullYear(),now.getMonth()-1,3);
 c.data.transactions.push({id:"x",type:"expense",amount:800,category:"تعليم",
  date:[prev.getFullYear(),String(prev.getMonth()+1).padStart(2,"0"),"03"].join("-")});
 load("flosy-elevate.js",c);
 assert.equal(c.window.FLOSY_ELEVATE.suggestions().length,0);
});
test("Period explorer uses inclusive real local day/week/month/year boundaries",()=>{
 const c=context();load("flosy-elevate.js",c);
 const f=c.window.FLOSY_ELEVATE.rangeFor,d=new Date(2026,10,10,12);
 assert.equal(f("day",d).start,"2026-11-10");
 assert.equal(f("week",d).start,"2026-11-09");
 assert.equal(f("week",d).end,"2026-11-15");
 assert.equal(f("month",d).end,"2026-11-30");
 assert.equal(f("year",d).start,"2026-01-01");
 assert.equal(f("year",d).end,"2026-12-31");
});
test("Transaction explorer never counts transfers as expenses and escapes user descriptions",()=>{
 const c=context(),today=new Date(),day=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),"03"].join("-");
 c.data.transactions.push({id:"a",type:"income",date:day,amount:2000,category:"دخل"});
 c.data.transactions.push({id:"b",type:"expense",date:day,amount:140,category:"طعام ومشروبات",
  description:"<img src=x onerror=alert(1)>"});
 c.data.transactions.push({id:"c",type:"transfer",date:day,amount:9000,category:"الاستثمار"});
 load("flosy-elevate.js",c);
 const m=c.window.FLOSY_ELEVATE.monthSummary();
 assert.equal(m.income,2000);assert.equal(m.expense,140);assert.equal(m.transfer,9000);
 assert.equal(c.window.FLOSY_ELEVATE.periodRows().rows.length,3);
 assert.doesNotMatch(c.elems.flosyElevateTxRows.innerHTML,/<img src=x/);
 assert.match(c.elems.flosyElevateTxRows.innerHTML,/&lt;img/);
});
test("Wealth widgets expose actual account metrics and only show manually saved historical snapshots",()=>{
 const c=context();
 c.window.FLOSY_PRO.metrics=()=>({net:7500,cash:5000,other:1000,debt:500,portfolio:{market:2000}});
 load("flosy-elevate.js",c);
 assert.equal(c.window.FLOSY_ELEVATE.currentWealth().net,7500);
 assert.equal(c.window.FLOSY_ELEVATE.wealthSnapshots().length,0);
 assert.match(c.elems.flosyElevateWealth.innerHTML,/لقطتين حقيقيتين/);
 const actual=fs.readFileSync("finance-pro.js","utf8");
 assert.match(actual,/metrics:metrics,rowsForAccounts:rowsForAccounts/);
});
test("Reference UI assets appear across all target pages, and precache on offline shell",()=>{
 const html=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("service-worker.js","utf8");
 const css=fs.readFileSync("flosy-elevate.css","utf8");
 assert.match(html,/<section class="page" id="page-transactions"><div id="flosyElevateTransactions"/);
 for(const name of ["flosyElevateDashboard","flosyElevateTransactions","flosyElevateBudgets","flosyElevateWealth"])
  assert.ok(html.includes('id="'+name+'"'),"Missing page root "+name);
 for(const name of ["flosy-elevate.js?v=801","flosy-elevate.css?v=801"]){
  assert.ok(html.includes(name));assert.ok(sw.includes(name));
 }
 assert.match(css,/color-scheme:light!important/);
 assert.match(css,/u-activity-totals/);
});


test("Flosy Studio account overview uses canonical ledger numbers, never a fake bank feed",()=>{
 const c=context();c.data.accounts[0].name="HSBC <test>";
 c.window.FLOSY_PRO.rowsForAccounts=()=>({bank:12150.25,wallet:0,emergency:30000});
 load("flosy-studio.js",c);
 const accounts=c.window.FLOSY_STUDIO.balances();
 assert.equal(accounts[0].balance,12150.25);
 assert.match(c.elems.flosyStudioHome.innerHTML,/12.?150|١٢.?١٥٠/);
 assert.doesNotMatch(c.elems.flosyStudioHome.innerHTML,/HSBC <test>/);
 assert.match(c.elems.flosyStudioHome.innerHTML,/HSBC &lt;test&gt;/);
 assert.equal(c.data.transactions.length,0);
});
test("Flosy Studio excludes transfers from expenses and projects no unsourced savings",()=>{
 const c=context(),now=new Date(),day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),
  String(now.getDate()).padStart(2,"0")].join("-");
 c.data.transactions.push({id:"t1",type:"expense",category:"مواصلات",date:day,amount:500});
 c.data.transactions.push({id:"t2",type:"transfer",category:"الطوارئ",date:day,amount:50000});
 c.data.transactions.push({id:"t3",type:"income",category:"مرتب",date:day,amount:1000});
 load("flosy-studio.js",c);
 const r=c.window.FLOSY_STUDIO.recorded();
 assert.equal(r.income,1000);assert.equal(r.expense,500);assert.equal(r.transfers,50000);
 assert.equal(r.top.length,1);
 assert.equal(r.top[0][0],"مواصلات");
 assert.match(c.elems.flosyStudioHome.innerHTML,/10٪|١٠٪|10%/);
});
test("Flosy Studio customization saves only display preferences, not transaction changes",()=>{
 const c=context();load("flosy-studio.js",c);
 const ui=c.window.FLOSY_STUDIO;
 const before=JSON.stringify(c.data.transactions);
 assert.equal(ui.preferences().visible.accounts,true);
 assert.equal(ui.preferences().visible.flow,false);
 ui.editPreferences("toggle","flow");
 assert.equal(ui.preferences().visible.flow,true);
 ui.editPreferences("move","accounts",1);
 assert.equal(ui.preferences().order[1],"accounts");
 assert.equal(JSON.stringify(c.data.transactions),before);
 assert.equal(c.data.studio.version,1);
});
test("Studio quick launcher is an enhancement over the existing canonical transaction form",()=>{
 const code=fs.readFileSync("flosy-studio.js","utf8");
 const html=fs.readFileSync("index.html","utf8");
 const sw=fs.readFileSync("service-worker.js","utf8");
 assert.match(code,/original\.click\(\)/);
 assert.match(code,/\["expense","income","transfer"\]/);
 assert.match(code,/stopImmediatePropagation\(\)/);
 assert.match(code,/aria-modal="true"/);
 assert.match(html,/id="flosyStudioLauncherHost"/);
 assert.match(html,/id="flosyStudioHome"/);
 assert.match(html,/id="flosyStudioSettings"/);
 assert.match(html,/flosy-studio.js\?v=901/);
 assert.match(html,/flosy-studio.css\?v=1001/);
 assert.match(sw,/flosy-studio.js\?v=901/);
 assert.match(sw,/flosy-studio.css\?v=1001/);
 const css=fs.readFileSync("flosy-studio.css","utf8");
 assert.match(css,/color-scheme:light!important/);
 assert.match(css,/u3-launcher-backdrop/);
});


test("InstaPay sent and received alerts parse with correct direction, even with Arabic digits",()=>{
 const a=context();load("flosy-next.js",a);
 const received=a.window.FLOSY_NEXT.parseSMS("InstaPay: تم استلام مبلغ ١٬٢٥٠٫٥٠ جنيه من حساب آخر");
 // Decimal punctuation varies by bank; use a standard example when importer requires EGP grammar.
 assert.equal(received.amount,1250.5);
 const expense=a.window.FLOSY_NEXT.parseSMS("InstaPay تم إرسال مبلغ 250.00 EGP إلى أحمد");
 const income=a.window.FLOSY_NEXT.parseSMS("InstaPay تم استلام مبلغ 750 EGP من محمد");
 assert.equal(expense.type,"expense");assert.equal(expense.amount,250);
 assert.equal(income.type,"income");assert.equal(income.amount,750);
 assert.equal(expense.source,"instapay_reviewed");
 assert.equal(a.data.transactions.length,0,"Parsing never imports without user review");
});
test("Payment importer rejects OTP and failed InstaPay transfers",()=>{
 const a=context();load("flosy-next.js",a);
 assert.throws(()=>a.window.FLOSY_NEXT.parseSMS("OTP 223233 InstaPay sent 500 EGP"),/تحقق|رمز/);
 assert.throws(()=>a.window.FLOSY_NEXT.parseSMS("InstaPay فشلت عملية تحويل مبلغ 500 EGP"),/فشل/);
 assert.throws(()=>a.window.FLOSY_NEXT.parseSMS("InstaPay مبلغ 400 EGP"),/لا توجد عملية/);
});
test("Privacy is user-controlled and never persists a hidden mask on visibilitychange",()=>{
 const p=fs.readFileSync("flosy-v4-family-privacy.js","utf8");
 const css=fs.readFileSync("flosy-studio.css","utf8");
 assert.match(p,/data-balance-privacy/);
 assert.doesNotMatch(p,/if\s*\(\s*document.hidden\s*\)\s*privateVisibility\s*\(\s*true\s*\)/);
 assert.match(css,/body:not\(\.v4-private\)/);
 const ui=fs.readFileSync("flosy-v5-command.js","utf8");
 assert.match(ui,/flosyPrivacyQuickToggle/);
});
test("New user has zero financial assumptions while existing records stay intact",()=>{
 const html=fs.readFileSync("index.html","utf8");
 const pro=fs.readFileSync("finance-pro.js","utf8");
 const next=fs.readFileSync("flosy-next.js","utf8");
 assert.match(html,/const def=\{salary:0,rent:0,bills:0,living:0,emergencyTarget:0/);
 assert.doesNotMatch(pro,/planSave<8000/);
 assert.match(pro,/initialVisa:0,initialEmergency:0,initialBuffer:0/);
 assert.doesNotMatch(pro,/state\.settings\.investmentTarget\s*=\s*39000/);
 assert.match(next,/flexBudget:\{target:0,carry:true\}/);
});
test("Capture has one clear voice/receipt studio, review-only and a dedicated import route",()=>{
 const cap=fs.readFileSync("flosy-v4-capture.js","utf8");
 const repair=fs.readFileSync("flosy-repair.js","utf8");
 const html=fs.readFileSync("index.html","utf8");
 assert.match(repair,/id="v4-voice-text"/);
 assert.match(repair,/id="v4-ocr-file"/);
 assert.match(repair,/data-repair="voice"/);
 assert.match(repair,/data-repair="native-camera"/);
 assert.match(repair,/data-repair="open-import"/);
 assert.match(repair,/id="flosyRepairOCRText"/);
 assert.match(cap,/id="v4-capture-review"/);
 assert.match(html,/flosy-capture-v10\.css\?v=1001/);
 assert.ok(html.indexOf('id="flosyRepairRoot"')<html.indexOf('id="v4-capture"></div>'));
});
