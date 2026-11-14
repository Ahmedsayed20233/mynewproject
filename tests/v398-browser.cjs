"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
const {spawn}=require("node:child_process"),{setTimeout:pause}=require("node:timers/promises");
const BASE="http://127.0.0.1:8178";
(async()=>{
 const server=spawn("python3",["-m","http.server","8178","--bind","127.0.0.1"],{stdio:"ignore"});
 let browser;
 try{
  for(let i=0;i<120;i++){try{if((await fetch(BASE+"/flosy.html")).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await page.goto(BASE+"/flosy.html",{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>!!window.FLOSY_UNIFIED?.core?.()?.FLOSY_BRIDGE&&
    !!window.FLOSY_NEEDS_V398&&!!window.FLOSY_NEEDS_UI_V398&&!document.getElementById("flosyLoading"),
    null,{timeout:60000});
  const setup=await page.evaluate(()=>{
   const app=window.FLOSY_UNIFIED,ledger=app.core().FLOSY_BRIDGE;
   const aid=app.accounts()[0]?.id;
   if(!aid)throw Error("No QA account available");
   const d=new Date(),today=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),
     String(d.getDate()).padStart(2,"0")].join("-");
   ledger.mutate(s=>{
    s.transactions.push(
      {id:"qa398rent",type:"expense",amount:1700,accountId:aid,date:today,description:"إيجار الشقة",category:"إيجار"},
      {id:"qa398coffee",type:"expense",amount:90,accountId:aid,date:today,description:"قهوة كافيه",category:"قهوة"},
      {id:"qa398movie",type:"expense",amount:120,accountId:aid,date:today,description:"سينما",category:"ترفيه"}
    );
   });
   app.go(4);return {aid,today};
  });
  assert.ok(await page.locator(".needs-v398-card").isVisible());
  assert.equal(await page.locator('[data-needs-tier]').count(),3);
  assert.equal(await page.locator('[data-necessity-id="qa398movie"]').count(),1);
  assert.equal(await page.locator('[data-necessity-id="qa398movie"]').inputValue(),"optional");
  assert.equal(await page.locator('[data-necessity-id="qa398rent"]').inputValue(),"essential");
  await page.locator('[data-necessity-id="qa398coffee"]').selectOption("optional");
  const updated=await page.evaluate(()=>window.FLOSY_UNIFIED.state().transactions.find(x=>x.id==="qa398coffee"));
  assert.equal(updated.necessity,"optional");
  assert.equal(updated.amount,90);
  fs.mkdirSync("tests/_artifacts",{recursive:true});
  await page.screenshot({path:"tests/_artifacts/flosy-v398-needs.png"});
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(8));
  const ai=await page.evaluate(()=>window.FLOSY_UNIFIED_AI.ask("قسم مصاريفي إلى مهم وفي المنتصف وغير مهم"));
  assert.equal(ai.intent,"spending-priorities");
  assert.ok(ai.text.includes("مهم"));
  assert.ok(ai.chart?.data?.length===3);
  const parser=await page.evaluate(()=>{
   const c=window.FLOSY_UNIFIED.core();
   const info=c.FLOSY_CAPTURE.parseReceipt("سوبر ماركت الخير\nDate: 2026-11-14\nالإجمالي: 125.50 EGP\nنقدي");
   const sources=c.FLOSY_REPAIR.chooseBestReceiptText([
    "المحل\nرقم طلب 958231\nشكرا",
    "سوبر ماركت الخير\nالإجمالي 125.50 جنيه\nالتاريخ 2026-11-14"]);
   return {info,source:sources,ranker:c.FLOSY_RECEIPT_TRAINED_V398};
  });
  assert.equal(parser.info.amount,125.5);
  assert.equal(parser.info.autoQuality,false);
  assert.equal(parser.info.receiptDetails.needsReview,true);
  assert.equal(parser.ranker.receiptCount,100);
  assert.ok(parser.source.includes("125.50"));
  assert.ok(!parser.source.includes("958231"));
  await page.evaluate(({aid,today})=>{
   window.__qa398Review=null;
   window.FLOSY_CAPTURE_REVIEW_V2.open({kind:"receipt",
    accounts:window.FLOSY_UNIFIED.accounts(),save:rows=>(window.__qa398Review=rows,rows),
    items:[{intent:"expense",amount:80,date:today,accountId:aid,description:"وصل ناقص",
      receiptDetails:{merchant:"بقالة",items:[],tax:0,discount:0,
       extractionWarnings:["الأصناف لم تُقرأ بثقة"],arithmeticConsistent:false}}]});
  },setup);
  assert.ok(await page.locator(".flosy-v398-warnings").isVisible());
  await page.locator('[data-add-receipt-item="0"]').click();
  await page.locator('[name="receipt-name-0-0"]').fill("لبن");
  await page.locator('[name="receipt-qty-0-0"]').fill("2");
  await page.locator('[name="receipt-price-0-0"]').fill("40");
  assert.equal(await page.locator('[data-receipt-calc="0"]').getAttribute("data-valid"),"true");
  await page.locator("#flosyV2Form").evaluate(form=>form.requestSubmit());
  const out=await page.evaluate(()=>window.__qa398Review);
  assert.equal(out[0].receiptDetails.items[0].name,"لبن");
  assert.equal(out[0].receiptDetails.itemsSum,80);
  await page.evaluate(({aid,today})=>{
   window.__qa398TotalOnly=null;
   window.FLOSY_CAPTURE_REVIEW_V2.open({kind:"receipt",
    accounts:window.FLOSY_UNIFIED.accounts(),save:rows=>(window.__qa398TotalOnly=rows,rows),
    items:[{intent:"expense",amount:75,date:today,accountId:aid,description:"وصل أصنافه مش كاملة",
      receiptDetails:{items:[{name:"خطأ OCR",quantity:1,unitPrice:30,total:30}],
       extractionWarnings:["مجموع الأصناف لا يطابق الإجمالي"],arithmeticContradiction:true}}]});
  },setup);
  await page.locator('[name="receipt-skip-items-0"]').check();
  await page.locator("#flosyV2Form").evaluate(form=>form.requestSubmit());
  const only=await page.evaluate(()=>window.__qa398TotalOnly);
  assert.equal(only[0].amount,75);
  assert.deepEqual(only[0].receiptDetails.items,[]);
  await page.evaluate(()=>window.FLOSY_UNIFIED.go(2));
  assert.ok(await page.locator("#flosyNeedsHomeV398").isVisible());
  assert.equal(errors.filter(e=>/TypeError|ReferenceError|SyntaxError/.test(e)).length,0,errors.join(" | "));
  console.log("PASS Flosy 3.9.8: transaction importance + owner override + AI response + 100-receipt model + OCR variant choice + manual receipt rescue");
 }catch(err){console.error(err);process.exitCode=1}
 finally{if(browser)await browser.close();server.kill()}
})();
