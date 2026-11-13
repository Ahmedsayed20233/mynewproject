"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const CP=require("../flosy-copilot-v392.js");
const source=fs.readFileSync("flosy-voice-nlu.js","utf8");
const world={window:{},Math,Date,Intl};vm.createContext(world);vm.runInContext(source,world);
const model=world.window.FLOSY_VOICE_NLU;
const reportWorld={window:{},Math,Date,Intl,Number,Map,Set,TextEncoder,Uint8Array};
vm.createContext(reportWorld);vm.runInContext(fs.readFileSync("flosy-report-kit.js","utf8"),reportWorld);
const kit=reportWorld.window.FLOSY_REPORT_KIT;
const date=new Date(2026,10,13);
const state={settings:{flosyFirstName:"أحمد"},accounts:[{id:"cash",name:"الكاش"}],transactions:[
 {id:"e1",type:"expense",category:"قهوة وكافيهات",description:"قهوة",amount:140,date:"2026-11-13",accountId:"cash"},
 {id:"e2",type:"expense",category:"قهوة وكافيهات",description:"كافيه",amount:260,date:"2026-11-10",accountId:"cash"},
 {id:"i1",type:"income",category:"مرتب",amount:2500,date:"2026-11-10",accountId:"cash"},
 {id:"eold",type:"expense",amount:9000,date:"2026-10-29",accountId:"cash"}
]};
test("Egyptian action lexicon recognizes completed expenses and income",()=>{
 const expected=[
  ["دفعت 75 جنيه قهوة","expense"],["اشتريت عربية ب 200000 جنيه","expense"],
  ["قمت بعملية شراء بقيمة 1200 جنيه","expense"],["حاسبت على الأكل 150 جنيه","expense"],
  ["صرفت 500 جنيه على صيانة","expense"],
  ["دخلي النهاردة كان 2000 جنيه","income"],
  ["كسبت 700 جنيه من مشروع","income"],
  ["قبضت 2500 جنيه مرتب","income"]
 ];
 for(const [input,type] of expected){
  const result=model.classify(input);
  assert.equal(result.intent,type,JSON.stringify({input,result}));
  assert.equal(result.reliable,true,input);
 }
});
test("questions, future plans and negations cannot post",()=>{
 for(const x of ["ما دفعتش 75 جنيه","هشتري حاجة ب 100 جنيه","لو دفعت 60 جنيه","دفعت كام جنيه؟"]){
  assert.equal(model.classify(x).intent,"none",x);
 }
});
test("spoken Egyptian numerals retain cents/large amounts",()=>{
 assert.equal(model.spokenAmount("دفعت ميتين وخمسين جنيه"),250);
 assert.equal(model.spokenAmount("كسبت الفين جنيه"),2000);
});
test("daily suggestions use real ledger and saved account first name",()=>{
 const ans=CP.dailyAdvice(state,date);
 assert.match(ans.title,/أحمد/);
 assert.ok(ans.message.length>35);
 assert.equal(CP.ledger(state,date).spend,400);
 assert.equal(CP.ledger(state,date).income,2500);
 assert.equal(CP.ledger(state,date).todaySpend,140);
 assert.equal(CP.answer("Roast Me",state,date).intent,"roast");
 assert.match(CP.roast(state,date).text,/أحمد/);
 assert.match(CP.answer("نصيحة اليوم",state,date).text,/أحمد/);
 assert.doesNotMatch(CP.roast({transactions:[]},date).text,/140|400/);
});
test("real office workbook has design styles, frozen headers and formatted numeric cells",()=>{
 const r=kit.build(state,{start:"2026-11-01",end:"2026-11-13"});
 const bytes=Buffer.from(kit.xlsxBytes(r)),str=bytes.toString("utf8");
 assert.equal(bytes.readUInt32LE(0),0x04034b50);
 assert.ok(str.includes("xl/styles.xml"),"must contain styles");
 assert.ok(str.includes("FF0D716F"),"must have branded theme color");
 assert.ok(str.includes('ySplit="1"'),"filter header freeze pane");
 assert.ok(str.includes("<autoFilter"),"column filtering");
 assert.ok(str.includes('numFmtId="164"'),"currency formatting");
 assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
});
test("new PDF and Excel links are bound to native file-chunk workflow",()=>{
 const js=fs.readFileSync("flosy-report-pro.js","utf8");
 const shell=fs.readFileSync("flosy.html","utf8");
 const css=fs.readFileSync("flosy-report-pro.css","utf8");
 const services=fs.readFileSync("flosy-services-v392.js","utf8");
 for(const token of ["pdf-start","xlsx-start"])assert.ok(js.includes(token)||js.includes('kind+"-start"'));
 for(const token of ["FLOSY_REPORT_PRO","flosyReportStatus","flosy-report-pro.js?v=3921",
  "flosy-copilot-v392.js?v=3920","flosy-services-v392.js?v=3920"])
  assert.ok(js.includes(token)||shell.includes(token)||services.includes(token),token);
 assert.match(css,/@page\{size:A4/);
 assert.match(services,/notifications-daily-enable/);
 assert.match(services,/data-sfilter/);
 assert.match(services,/flosyFirstNameForm/);
});
