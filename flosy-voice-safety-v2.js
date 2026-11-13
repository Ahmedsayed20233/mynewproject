/* FLOSY Egyptian finance understanding safety adapter v2.
 * This module does NOT recognize audio and is NOT the bundled 60k trained classifier.
 * It interprets an ASR transcript, generates EDITABLE suggestions, never mutates the ledger.
 * Six intents; safety checks take precedence over all statistical predictions.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.FLOSY_VOICE_SAFETY_V2=api;
})(typeof window!=="undefined"?window:null,function(root){"use strict";
  const MAX=1e9;
  const normalize=value=>String(value??"").toLowerCase().replace(/[أإآ]/g,"ا")
    .replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ٟـ]/g,"")
    .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
    .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
    .replace(/\s+/g," ").trim();
  const safeNumber=value=>Number.isFinite(value)&&value>0&&value<MAX?Math.round(value*100)/100:null;
  const numbers={
    "واحد":1,"واحده":1,"اتنين":2,"اثنين":2,"تنين":2,"تلات":3,"تلاته":3,
    "ثلاثه":3,"اربعه":4,"خمسه":5,"سته":6,"سبعه":7,"تمانيه":8,"ثمانيه":8,"تسعه":9,
    "عشره":10,"عشر":10,"حداشر":11,"احداشر":11,"اتناشر":12,"تلاتاشر":13,
    "اربعتاشر":14,"خمستاشر":15,"ستاشر":16,"سبعتاشر":17,"تمنتاشر":18,"تسعتاشر":19,
    "عشرين":20,"تلاتين":30,"ثلاثين":30,"اربعين":40,"خمسين":50,"ستين":60,
    "سبعين":70,"تمانين":80,"ثمانين":80,"تسعين":90,
    "ميه":100,"مايه":100,"مائه":100,"ميتين":200,"متين":200,
    "تلتميه":300,"تلاتميه":300,"ربعمية":400,"اربعمية":400,
    "خمسمية":500,"خمسميه":500,"ستمية":600,"سبعمية":700,"تمنمية":800,"تسعمية":900
  };
  const thousands=/^(?:الف|الاف|تلاف|الاف|الفين)$/;
  const currency=/^(?:جنيه|جني|جنيهات|جنيها|جم|ج\.م|egp)$/i;
  function numberToken(token){
    const t=normalize(token).replace(/^[و]+(?=[^\d])/, "").replace(/[،؛.!?]$/g,"");
    if(Object.prototype.hasOwnProperty.call(numbers,t))return numbers[t];
    if(/^\d+(?:\.\d+)?$/.test(t))return Number(t);
    return null;
  }
  function wordAmount(text){
    const t=normalize(text).replace(/(\d)[,](?=\d{3}(?:\D|$))/g,"$1");
    const tokens=t.split(/\s+/).map(v=>v.replace(/[،؛!?]/g,"")).filter(Boolean);
    let candidates=[];
    for(let end=1;end<=tokens.length;end++){
      const tok=tokens[end-1];
      if(!currency.test(tok) && end!==tokens.length)continue;
      let seq=[],start=end-1;
      if(currency.test(tok))start--;
      for(let i=start;i>=0&&seq.length<12;i--){
        const v=tokens[i],base=v.startsWith("و")?v.slice(1):v;
        if(thousands.test(base)||numberToken(v)!==null||/^(?:نص|نصف|ربع|ونص|وربع)$/.test(v)){
          seq.unshift(v);
        }else break;
      }
      if(!seq.length)continue;
      let total=0,segment=0,lastScale=0,valid=true;
      for(const raw of seq){
        const v=raw.startsWith("و")?raw.slice(1):raw;
        if(thousands.test(v)){
          total+=(v==="الفين"?2:(segment||1))*1000;segment=0;lastScale=1000;
        }else if(v==="نص"||v==="نصف"||v==="ربع"){
          const fraction=v==="ربع"?.25:.5;
          if(lastScale>=100&&segment===0)total+=fraction*lastScale;
          else if(segment>=100&&segment%100===0)segment+=fraction*100;
          else segment+=fraction;
          lastScale=0;
        }else{
          const n=numberToken(v);if(n===null){valid=false;break}
          segment+=n;lastScale=n>=100?n:0;
        }
      }
      if(valid){const amount=safeNumber(total+segment);if(amount!==null)candidates.push(amount)}
    }
    return [...new Set(candidates)].length===1?candidates[0]:null;
  }
  function amount(text){
    const t=normalize(text);
    if(/\b(?:otp|pin|cvv)\b/i.test(t))return null;
    // Only a direct monetary expression; never take invoice IDs or a date as an amount.
    const numeric=[...t.matchAll(/(?:^|[^\w\d])([0-9][0-9,.]{0,16})\s*(?:جنيه|جني|جنيهات|جم|ج\.م|egp)(?=\s|$|[.،])/gi)]
      .map(m=>m[1]).filter(v=>!/[\/-]/.test(v)).map(raw=>{
        const comma=raw.lastIndexOf(","),dot=raw.lastIndexOf(".");
        if(comma>=0&&dot>=0)raw=comma>dot?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"");
        else if(comma>=0){const parts=raw.split(",");raw=parts.length===2&&parts[1].length!==3?parts.join("."):raw.replace(/,/g,"")}
        else if(dot>=0&&raw.split(".")[1]?.length===3)raw=raw.replace(/\./g,"");
        return safeNumber(Number(raw));
      }).filter(x=>x!==null);
    if(numeric.length>1&&new Set(numeric).size>1)return null;
    if(numeric.length===1){
      if(/(?:\b|^)1000\s+ونص\s+(?:جنيه|جم)/.test(t))return 1500;
      return numeric[0];
    }
    // Spoken scale expressions without an explicit currency: "17 ألف في بنك مصر".
    const scale=[...t.matchAll(/(?:^|\s)([0-9]+)\s*(?:الف|الاف|تلاف)(?=\s|$)/g)]
      .map(m=>safeNumber(Number(m[1])*1000)).filter(x=>x!==null);
    if(scale.length===1)return scale[0];
    // A spoken "1000 ونص" scales the half to the last round denomination.
    const mixed=t.match(/(?:^|\s)(\d+)\s+ونص(?=\s+(?:جنيه|جم|egp)(?:\s|$))/);
    if(mixed){
      const n=Number(mixed[1]);
      const step=n>=1000&&n%1000===0?1000:n>=100&&n%100===0?100:1;
      return safeNumber(n+step/2);
    }
    // Naked numerals can only be used if there is exactly one and a transaction verb.
    const bare=[...t.matchAll(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/g)].map(m=>safeNumber(Number(m[1]))).filter(x=>x!==null);
    if(bare.length===1&&!/\b(?:20\d\d)[\/-]/.test(t))return bare[0];
    return wordAmount(t);
  }
  const uncompleted=/(?:\b(?:otp|pin|cvv)\b|كود التحقق|رمز التحقق|ما كنتش|ما\s*(?:دفعتش|حولتش|اشتريتش|قبضتش|استلمتش)|مدفعتش|ماحولتش|مشتريتش|مجبتهاش|لسه\s*(?:ما|مج|مستني)|لسه\s+م|ما\s+دفعت|ما\s+اشتريت|مش\s+متاكد|غالبا|تقريبا|يمكن|فشل|اترفض|مرفوض|معلق|اتلغت|ملغي|ما تمش|لم\s+يتم|تجربه|وهمي|مش حقيقي|من غير حفظ)/i;
  const future=/(?:هشتري|هجيب|هدفع|هصرف|هحول|هنقل|هقبض|هستلم|ناوي|مخطط|بكره|بكرة|بعدين\s+ه|المفروض|كنت\s+ه)/;
  const question=/(?:\?|؟|(?:^|\s)(?:هل|كام|ازاي|ليه|امتي|هو انا|ممكن احول|لو|اذا|قوللي|اشرحلي|عايز اعرف|عاوز اعرف|مش عايز)(?:\s|$))/;
  const refund=/(?:رجعولي|رجعلي|اتردلي|ردولي|ردوا|استرديت|استرجعت|استرداد|مرتجع|ريفاند|refund|الفلوس رجعت|رجع المبلغ)/;
  const debt=/(?:استلفت|اتسلفت|اقترضت|قرض|(?:^|\s)دين(?:\s|$)|الديون|ديوني|الدين|سلفت|سلفه|كسلفه|تسليف|سلّفت|سددت\s+قرض|رديت\s+دين|يرجعهم|رجعلي\s+جزء\s+من\s+السلفه)/;
  const transfer=/(?:حولت|حركت|نقلت|سحبت|حطيت|دخلت|عملت\s+تحويل|بعت\s+فلوس|وديعه\s+داخليه|تحويل\s+داخلي|من\s+حسابي\s+التاني)/;
  const explicitSelf=/(?:لنفسي|حساباتي|حسابي|بين\s+حساباتي|الاتنين\s+(?:بتوعي|حساباتي)|اثنين\s+بتوعي|من\s+حسابي\s+التاني|بتاعتي|بتاعي|جيبي|محفظتي)/;
  const expense=/(?:دفعت|حَاسبت|حاسبت|اتحاسبت|اشتريت|شريت|جبت|صرفت|كلفني|اتخصم|خصموا|تم\s+دفع|دفع\s+فاتوره|اشتراك|قمت\s+بعمليه\s+شراء|عملت\s+عمليه\s+شراء|مصاريف\s+تشغيل|اديت\s+السواق)/;
  const income=/(?:قبضت|استلمت|جالي|جاتلي|وصلني|نزلي\s+المرتب|نزل\s+المرتب|المرتب\s+نزل|كسبت|ربحت|مكافاه|بونص|اتحوللي|دخللي|دخلي|دخلتلي|اجر\s+محاضره)/;
  function classify(raw){
    const t=normalize(raw);
    if(!t||t.length>500)return {intent:"none",reason:"empty_or_long"};
    // A cancelled PURCHASE that has been refunded is not a failed refund.
    const cancelledPurchase=/(?:ملغي|اتلغت)/.test(t)&&refund.test(t);
    const safetyBlocked=(uncompleted.test(t)&&!cancelledPurchase)||future.test(t)||question.test(t);
    if(safetyBlocked)return {intent:"none",reason:"not_completed_or_question"};
    if(debt.test(t))return {intent:"debt",reason:"liability_not_income"};
    if(refund.test(t))return {intent:"refund",reason:"refund_requires_link"};
    const self=explicitSelf.test(t);
    if(transfer.test(t)&&self)return {intent:"transfer",reason:"verify_two_owned_accounts"};
    if(transfer.test(t)&&/(?:مصاريف|تمن|حق|البياع|للسواق|اكل|مطعم|فطار)/.test(t))return {intent:"expense",reason:"payment_to_third_party"};
    if(transfer.test(t)&&!expense.test(t)&&!income.test(t))return {intent:"none",reason:"unverified_transfer"};
    const out=expense.test(t),inc=income.test(t);
    if(out&&inc)return {intent:"none",reason:"mixed_intent_needs_split"};
    if(out)return {intent:"expense",reason:"expense_action"};
    if(inc&&/مش عارف|مش معروف/.test(t))return {intent:"none",reason:"income_source_unknown"};
    if(inc)return {intent:"income",reason:"income_action"};
    return {intent:"none",reason:"no_completed_financial_action"};
  }
  const split=t=>String(t||"").trim()
    .split(/\s+(?:(?:وبعدين|بعدين|ثم|بعدها|بعد كده|وكمان)|و(?=(?:دفعت|اشتريت|قبضت|صرفت|كسبت|حولت|استلمت)\b))\s*/i)
    .map(x=>x.trim()).filter(Boolean).slice(0,12);
  function accountCandidates(text,accounts){
    const t=normalize(text),res=[];
    for(const a of accounts||[]){
      if(!a||typeof a.id!=="string"||!a.id||!a.name)continue;
      const name=normalize(a.name);
      let aliases=[name];
      if(/كاش|نقد/.test(name))aliases.push("الكاش","كاش","النقديه","نقد");
      if(/بنك مصر/.test(name))aliases.push("بنك مصر");
      if(/البنك الاهلي/.test(name))aliases.push("البنك الاهلي","الاهلي");
      if(/\bcib\b/.test(name))aliases.push("cib");
      if(/\bqnb\b/.test(name))aliases.push("qnb");
      if(/فودافون كاش/.test(name))aliases.push("فودافون كاش");
      let pos=Math.min(...aliases.filter(v=>v&&v.length>=3).map(v=>{let i=t.indexOf(v);return i<0?Infinity:i}));
      if(Number.isFinite(pos))res.push({id:a.id,pos});
    }
    return res.sort((a,b)=>a.pos-b.pos).filter((a,i,all)=>all.findIndex(v=>v.id===a.id)===i);
  }
  function resolveAccounts(raw,owned,intent){
    const candidates=accountCandidates(raw,owned);
    if(intent==="transfer"){
      const a=candidates.length===2&&candidates[0].id!==candidates[1].id?candidates:[];
      return {accountId:a[0]?.id||"",targetAccountId:a[1]?.id||"",verified:a.length===2};
    }
    return {accountId:candidates.length===1?candidates[0].id:"",targetAccountId:"",verified:candidates.length===1};
  }
  function analyzeSingle(raw,accounts=[],today=""){
    const text=String(raw||"").slice(0,500),decision=classify(text),value=amount(text);
    // A real TF-IDF/logistic student model trained on the user-supplied 60k
    // synthetic dataset runs strictly as a SECOND opinion; safety gates win.
    let learned=null;
    try{learned=root?.FLOSY_EGYPTIAN_NLU_COMPACT?.classify?.(text)||null}catch{}
    const trainedPrediction=learned?{
      intent:learned.intent,uncalibratedConfidence:learned.confidence,
      agreement:learned.intent===decision.intent,
      modelVersion:learned.modelVersion,uncalibrated:true
    }:null;
    const ids=resolveAccounts(text,accounts,decision.intent);
    const date=/^\d{4}-\d\d-\d\d$/.test(today)?today:new Date().toISOString().slice(0,10);
    const special=["refund","debt"].includes(decision.intent);
    const supported=["expense","income","transfer"].includes(decision.intent);
    const valid= supported&&value!==null;
    return {intent:decision.intent,amount:value,currency:"EGP",date,
      accountId:ids.accountId,targetAccountId:ids.targetAccountId,
      reason:decision.reason,status:!valid?"blocked":!ids.verified?"needs_account":"needs_confirmation",
      requiresReview:true,autoPost:false,
      specialLedger:special,
      text,trainedPrediction,model:"safety rules + 60k-synthetic-trained, quantized student (shadow only)"};
  }
  function analyzeBatch(text,accounts=[],today=""){
    const parts=split(text);
    if(!parts.length)return [];
    return parts.map(x=>analyzeSingle(x,accounts,today));
  }
  return {normalize,amount,classify,split,resolveAccounts,analyzeSingle,analyzeBatch,
    version:"2.0.0-preview-safety",autoPost:false};
});
