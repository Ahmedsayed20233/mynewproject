/* Flosy 4 — opt-in Egyptian voice, SMS and receipt capture.
   Every extracted value is reviewed and explicitly approved before a transaction is created.
   No raw SMS, audio or receipt image is stored in Flosy's finance record. */
(function(global){
"use strict";
const C=global.FLOSY_BRIDGE;if(!C)return;
const el=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const digits=s=>String(s||"").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\u200e\u200f]/g,"");
const uuid=()=>crypto.randomUUID?crypto.randomUUID():"f4-"+Math.random().toString(36).slice(2);
const today=()=>new Date().toLocaleDateString("en-CA"); // UTC offset may vary in some browsers; dates can be edited.
const dateLocal=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const pretty=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n)+" ج.م";
const cash=()=>C.getState().accounts||[];
const validAmount=x=>Number.isFinite(+x)&&+x>0&&+x<1e9;
let pending=null,staged=[],rawOutput="",notification="",recognition=null,ocrBusy=false;
let lastAutoSaved=null;
const autoPrefs=()=>{
 const p=C.getState().settings?.autoCapture||{};
 return {voice:p.voice===true,sms:p.sms===true,receipt:p.receipt===true,
  accountId:String(p.accountId||"")};
};
const autoEnabled=mode=>autoPrefs()[mode]===true;
function setAuto(mode,on){
 if(!["sms","voice","receipt"].includes(mode))return false;
 C.mutate(state=>{
  state.settings=state.settings||{};
  state.settings.autoCapture={...(state.settings.autoCapture||{}),[mode]:on===true};
 });
 if(mode==="sms"&&on===true&&global.FLOSY_NATIVE_RELAY_AVAILABLE===true)
  global.FLOSY_AUTOMATE_RELAY?.requestPending?.();
 return true;
}
function setAutoAccount(id){
 if(id&& !cash().some(a=>a.id===id))return false;
 C.mutate(state=>{
  state.settings=state.settings||{};
  state.settings.autoCapture={...(state.settings.autoCapture||{}),accountId:String(id||"")};
 });
 return true;
}
const resolvedAccount=preferred=>{
 const accounts=cash().filter(a=>a&&a.id);
 const selected=preferred&&accounts.find(a=>a.id===preferred);
 if(selected)return selected.id;
 const configured=accounts.find(a=>a.id===autoPrefs().accountId);
 return configured?.id||(accounts.length===1?accounts[0].id:"");
};
function autoRecord(d,mode){
 if(!autoEnabled(mode)||!d||d.autoQuality!==true)return false;
 const accountId=resolvedAccount(d.accountId);
 if(!accountId||!validAmount(d.amount)||!["income","expense"].includes(d.type)||
  !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))||!d.description||isDuplicate(d))
  return false;
 const item={...d,accountId};
 delete item.autoQuality;
 item.source=mode+"_auto";
 item.createdAt=new Date().toISOString();item.updatedAt=item.createdAt;
 try{
  C.mutate(state=>state.transactions.push(item));
  lastAutoSaved={id:item.id,mode,amount:item.amount,type:item.type};
  notification="تم تسجيل "+pretty(item.amount)+" تلقائيًا في الحساب المحدد. يمكنك التراجع من هنا.";
  renderReview();
  C.toast("تم تسجيل المعاملة تلقائيًا");
  return true;
 }catch(err){C.toast("تعذر الحفظ التلقائي، افتح المراجعة");return false}
}
function undoLastAuto(){
 const last=lastAutoSaved;
 if(!last)return;
 C.mutate(state=>{
  state.transactions=state.transactions.filter(item=>item.id!==last.id);
  state.deletedIds=Array.isArray(state.deletedIds)?state.deletedIds:[];
  state.deletedIds.push("transactions/"+last.id);
 });
 lastAutoSaved=null;notification="تم التراجع عن آخر معاملة تلقائية.";renderReview();
 C.toast("تم التراجع عن المعاملة");
}

const bankName=s=>{
 const lower=s.toLowerCase();
 return [
 ["CIB",/cib|commercial international bank|التجاري الدولي/],
 ["البنك الأهلي",/nbe|national bank of egypt|البنك الأهلي|البنك الاهلي/],
 ["بنك مصر",/banque misr|bm bank|بنك مصر/],
 ["QNB",/\bqnb\b|قطر الوطني/],
 ["بنك القاهرة",/banque du caire|بنك القاهرة/],
 ["بنك الإسكندرية",/alexbank|بنك الاسكندرية|بنك الإسكندرية/],
 ["InstaPay",/instapay|انستا باي|انستاباي/],
 ["Vodafone Cash",/vodafone cash|فودافون كاش/],
 ["Orange Cash",/orange cash|اورنج كاش/],
 ["e& Cash",/etisalat cash|اتصالات كاش|e& cash/]
 ].find(x=>x[1].test(lower))?.[0]||"رسالة مالية";
};
function amountFrom(s){
 const value=digits(s).replace(/\u00a0/g," ");
 const matches=[
 ...value.matchAll(/(?:بمبلغ|بقيمة|المبلغ|amount|amt)\s*[:\-]?\s*(?:EGP|جنيه|جم|ج\.م)?\s*([0-9][0-9.,]{0,18})/gi),
 ...value.matchAll(/([0-9][0-9.,]{0,18})\s*(?:EGP|جنيه(?:اً|ا)?|جنيهات|جم|ج\.\s*م\.?|L\.E\.?)/gi),
 ...value.matchAll(/(?:EGP|جنيه(?:اً|ا)?|جم|ج\.م|L\.E\.?)\s*[:\-]?\s*([0-9][0-9.,]{0,18})/gi),
 ...value.matchAll(/(?:دفعت|صرفت|اشتريت|حولت|حوّلت|استلمت|قبضت|جالي|دفع|purchase|paid)\s*(?:بـ?|بمبلغ)?\s*([0-9][0-9.,]{0,18})/gi)
 ];
 const m=matches.find(x=>x[1]);if(!m)return null;
 let raw=m[1].trim().replace(/\s/g,"");
 // Numbers 1,234.50 or 1.234,50 or 1,234 (thousands) or 25,5 (decimal).
 const c=raw.lastIndexOf(","),d=raw.lastIndexOf(".");
 if(c>=0&&d>=0)raw=c>d?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"");
 else if(c>=0){const a=raw.split(",");raw=a.length===2&&a[1].length!==3?a.join("."):raw.replace(/,/g,"")}
 else if(d>=0){const a=raw.split(".");if(a.length===2&&a[1].length===3)raw=a.join("")}
 const num=Number(raw);return validAmount(num)?num:null;
}
function cat(text){
 const v=text.toLowerCase();
 if(/قهو|كافيه|cafe|coffee|starbucks/.test(v))return "ترفيه";
 if(/فطار|غداء|غدا|عشاء|مطعم|restaurant|سوبر|grocery|market|food/.test(v))return "طعام ومشروبات";
 if(/انترنت|إنترنت|internet|wifi|adsl|we\s/.test(v))return "فاتورة الإنترنت";
 if(/كهرباء|electric/.test(v))return "فاتورة الكهرباء";
 if(/شحن رصيد|recharge|airtime/.test(v))return "فاتورة شحن رصيد";
 if(/اوبر|أوبر|uber|careem|كريم|مواصلات|تاكسي/.test(v))return "مواصلات";
 if(/هدية|هديه|gift/.test(v))return "الهدايا";
 if(/إيجار|ايجار|rent/.test(v))return "إيجار";
 if(/فاتورة|bill|utilities/.test(v))return "فواتير";
 return "مشتريات";
}
function hash(s){
 let a=2166136261;for(const c of s){a^=c.charCodeAt(0);a=Math.imul(a,16777619)}return (a>>>0).toString(16);
}
function redact(text){
 return String(text).replace(/\b(?:\d[ -]?){12,19}\b/g,"[رقم محجوب]").replace(/\b(?:\d{4}[ -]?){3,4}\b/g,"[رقم محجوب]");
}
function parseBankSMS(source){
 const str=digits(String(source||"").slice(0,5000)),low=str.toLowerCase();
 if(/otp|one.time.password|verification code|security code|رمز\s*(?:تحقق|التحقق|التفعيل)|كود\s*(?:التحقق|التفعيل)|كلمة\s*السر/i.test(str))
  throw Error("هذه رسالة تحقق أو كلمة سر؛ لا يمكن استيرادها.");
 const debit=/(?:خصم|سحب|شراء|دفع|تم\s*التحويل\s*من|debit|withdraw|paid|purchase|spent|payment|pos\s*purchase)/i.test(low);
 const credit=/(?:إيداع|ايداع|استلام|اضافه|إضافة|تم\s*التحويل\s*إلى|credit|received|deposit|salary)/i.test(low);
 if(!debit&&!credit)throw Error("الرسالة لا تحتوي اتجاه معاملة واضح (خصم أو إيداع).");
 const amount=amountFrom(str);if(amount===null)throw Error("لم أجد مبلغًا مؤكدًا بعملة EGP في الرسالة.");
 const dateMatch=str.match(/\b([0-3]?\d)[\/-]([01]?\d)[\/-](20\d{2})\b/);
 let dt=dateLocal();
 if(dateMatch){let d=new Date(+dateMatch[3],+dateMatch[2]-1,+dateMatch[1]);if(d.getDate()===+dateMatch[1]&&d.getMonth()+1===+dateMatch[2])dt=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
 const merchant=bankName(str);
 return {id:uuid(),date:dt,type:debit?"expense":"income",amount,
  category:debit?cat(str):"دخل آخر",subcategory:"",accountId:global.FLOSY_ACCOUNT_ROUTER?.match(cash(),{text:str,defaultAccountId:autoPrefs().accountId})?.id||"",
  description:merchant+" — معاملة رسالة بنكية تحتاج مراجعة",
  sourceHash:"sms4-"+hash(str.trim().replace(/\s+/g," ").toLowerCase()),source:"sms_reviewed",confidence:"مراجعة مطلوبة"};
}
function spokenEgyptianAmount(text){
 const normalized=digits(String(text||"")).replace(/[أإآ]/g,"ا").replace(/ة/g,"ه")
  .replace(/[\u064B-\u065F]/g,"");
 const words={
  "واحد":1,"واحده":1,"اتنين":2,"اثنين":2,"اثنان":2,"تنين":2,"تلاته":3,"ثلاثه":3,
  "اربعه":4,"خمسه":5,"سته":6,"سبعه":7,"تمانيه":8,"ثمانيه":8,"تسعه":9,
  "عشره":10,"عشر":10,"حداشر":11,"احداشر":11,"اتناشر":12,"اثناشر":12,
  "عشرين":20,"تلاتين":30,"ثلاثين":30,"اربعين":40,"خمسين":50,"ستين":60,
  "سبعين":70,"تمانين":80,"ثمانين":80,"تسعين":90,"ميه":100,"مائه":100,
  "ميتين":200,"مئتين":200,"الف":1000,"الفين":2000,"نص":0.5
 };
 const source=normalized.split(/(?:جنيه(?:ات)?|جم|جنيها)/)[0];
 const tokens=source.trim().split(/\s+/).slice(-9);
 let values=[];
 for(let i=tokens.length-1;i>=0;i--){
  const raw=tokens[i],token=Object.prototype.hasOwnProperty.call(words,raw)?raw:
    (raw.startsWith("و")?raw.slice(1):raw);
  if(!Object.prototype.hasOwnProperty.call(words,token))break;
  values.unshift(words[token]);
 }
 if(!values.length)return null;
 const amount=values.reduce((sum,n)=>sum+n,0);
 return validAmount(amount)?amount:null;
}
function parseVoice(text){
 const str=digits(String(text||"").trim());
 const ml=global.FLOSY_VOICE_NLU;
 if(ml?.classify){
  if(/\b(?:OTP|PIN|CVV)\b|رمز.{0,12}(?:التحقق|السري)|كود\s*التحقق/i.test(str))
   throw Error("لا يمكن تسجيل رمز تحقق أو رقم سري.");
  const decision=ml.classify(str);
  if(decision.intent==="transfer")
   throw Error("ده يبدو تحويلًا بين حساباتك؛ سجله من صفحة التحويلات، مش كمصروف أو دخل.");
  if(decision.intent==="none")
   throw Error("الجملة مش معاملة مكتملة. قل «دفعت 75 جنيه قهوة» أو «قبضت 500 جنيه».");
  // Prefer the full currency phrase: numeric-regex extraction would silently
  // truncate "دفعت 1000 ونص جنيه" to 1000 and misbook the transaction.
  const amount=ml.spokenAmount(str)??amountFrom(str)??spokenEgyptianAmount(str);
  if(!validAmount(amount))throw Error("مش قادر أحدد المبلغ بشكل آمن. قل المبلغ بالجنيه.");
  const type=decision.intent==="income"?"income":"expense";
  const category=ml.category(str,type)|| (type==="income"?"دخل آخر":cat(str));
  const now=new Date(),relative=/اول\s*امبارح|أول\s*أمس|قبل\s*امبارح/.test(str)?2:
    /امبارح|أمس/.test(str)?1:0;
  now.setDate(now.getDate()-relative);
  let date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
  // An explicitly spoken full ISO date can be reviewed and used as the date.
  const full=str.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/);
  if(full){const chk=new Date(+full[1],+full[2]-1,+full[3]);if(chk.getFullYear()===+full[1]&&chk.getMonth()+1===+full[2]&&chk.getDate()===+full[3])
   date=[full[1],full[2].padStart(2,"0"),full[3].padStart(2,"0")].join("-")}
  const accounts=cash().filter(x=>x&&x.id);
  const normalized=str.replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").toLowerCase();
  const named=accounts.find(a=>a.name&&normalized.includes(a.name.toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه")));
  const cashMatch=/كاش|نقد|محفظه|محفظة/.test(normalized)?
   accounts.find(a=>/كاش|نقد|cash|محفظة|محفظه/i.test(a.name||"")):null;
  const bankMatch=/فيزا|كارت|بنك|حساب/.test(normalized)?
   accounts.find(a=>/فيزا|كارت|بنك|bank|visa|card|حساب/i.test(a.name||"")):null;
  const accountId=named?.id||cashMatch?.id||bankMatch?.id||resolvedAccount("");
  const fingerprint=str.toLowerCase().replace(/\s+/g," ").trim();
  return {id:uuid(),type,date,amount,category,
   // Do not persist raw transcripts or spoken personal names.
   description:"صوت — "+(type==="income"?"دخل":"مصروف")+" — "+category,
   accountId,subcategory:"",source:"voice_reviewed",
   sourceHash:"voice-nlu-v1-"+hash(fingerprint+"|"+Math.floor(Date.now()/300000)),
   voiceDetails:{intent:decision.intent,confidence:decision.confidence,modelVersion:decision.version},
   autoQuality:decision.reliable===true&&!!accountId};
 }

 if(/\b(?:OTP|PIN|CVV)\b|رمز.{0,12}(?:التحقق|السري)/i.test(str))
  throw Error("لا يمكن تسجيل رموز تحقق بالصوت");
 const amount=amountFrom(str)??spokenEgyptianAmount(str);
 if(!validAmount(amount))throw Error("قول مبلغ واضح، مثال: دفعت 75 جنيه قهوة من الكاش.");
 const out=/دفعت|صرفت|اشتريت|دفعنا|سحبت|حولت|حوّلت|بعت|دفعة|مصروف|خصمت|شراء/.test(str);
 const inc=/استلمت|جالي|وصلني|مرتب|دخلت|قبضت|إيداع|ايداع|تحويل وارد/.test(str);
 if(out&&inc)throw Error("الاتجاه مش واضح: مصروف ولا دخل؟");
 const credit=inc&&!out;
 const ymd=dateLocal(),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 const dt=/امبارح|أمس/.test(str)?[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,"0"),String(yesterday.getDate()).padStart(2,"0")].join("-"):ymd;
 const accounts=cash().filter(x=>x&&x.id);
 const named=accounts.find(a=>a.name&&str.includes(a.name));
 const cashMatch= /كاش|نقد|محفظة/.test(str)?
  accounts.find(a=>/كاش|نقد|cash|محفظة/i.test(a.name||"")):null;
 const bankMatch=/فيزا|كارت|بنك|حساب/.test(str)?
  accounts.find(a=>/فيزا|كارت|بنك|bank|visa|card/i.test(a.name||"")):null;
 const accountId=named?.id||cashMatch?.id||bankMatch?.id||resolvedAccount("");
 const basis=str.toLowerCase().replace(/\s+/g," ").trim();
 const sourceHash="voice-auto-"+hash(basis+"|"+Math.floor(Date.now()/300000));
 return {id:uuid(),type:credit?"income":"expense",date:dt,amount,
  category:credit?"دخل آخر":cat(str),description:"عملية صوتية — "+(credit?"دخل":"مصروف")+" — "+cat(str),
  accountId,subcategory:"",source:"voice_reviewed",sourceHash,autoQuality:(out!==inc)&&!!accountId};
}
function parseReceipt(text){
 const ml=global.FLOSY_RECEIPT_ML;
 if(ml?.extract){
  const info=ml.extract(text);
  const namedCash=cash().filter(a=>a?.id&&/كاش|نقد|cash|محفظة/i.test(a.name||""));
  const namedCard=cash().filter(a=>a?.id&&/فيزا|كارت|بطاقة|visa|card/i.test(a.name||""));
  const matchAccount=info.paymentMethod==="cash"?(namedCash.length===1?namedCash[0]:null):
    info.paymentMethod==="card"?(namedCard.length===1?namedCard[0]:null):null;
  // Prefer the explicitly configured auto account; otherwise use one unique
  // payment-method-matching account. Ambiguous accounts stop auto-save.
  const accountId=resolvedAccount("")||matchAccount?.id||"";
  const normalized=(info.description||"إيصال").toLowerCase();
  const category=/كوتشي|كوئشي|حذاء|جزمة|ملابس|shoe|sneaker|\bZINC\b/i.test(info.description||"")?
     "مشتريات":cat(normalized);
  // Only explicitly extracted document fields, never names, numbers or raw OCR.
  const receiptDetails={
    merchant:info.merchant||null,invoiceNumber:info.receiptNumber||null,
    receiptDate:info.date||null,receiptTime:info.time||null,currency:"EGP",
    paymentMethod:info.paymentMethod||null,items:info.items||[],
    itemsSum:info.itemsSum??null,arithmeticConsistent:Boolean(info.arithmeticConsistent),
    subtotal:info.subtotal,discount:info.discount,tax:info.tax,
    paid:info.paid,change:info.change,confidence:info.confidence,
    evidence:info.evidence,modelVersion:info.modelVersion
  };
  const hashKey=info.receiptNumber?
    String(info.merchant||"").toLowerCase()+"|"+info.receiptNumber+"|"+info.amount:
    String(info.merchant||"").toLowerCase()+"|"+(info.date||"")+"|"+info.amount+
     "|"+String(info.items?.[0]?.name||"").toLowerCase();
  return {id:uuid(),type:"expense",date:info.date||dateLocal(),amount:info.amount,
    category,description:("إيصال — "+info.description).slice(0,150),accountId,
    subcategory:"",source:"receipt_reviewed",receiptDetails,
    sourceHash:"receipt-auto-ml-v1-"+hash(hashKey),
    // Printed payment method is optional when the user explicitly selected a
    // specific auto-capture account. Contradictory totals still require review.
    autoQuality:(info.autoQuality===true||
      (Boolean(accountId)&&Boolean(autoPrefs().accountId)&&
       cash().some(a=>a.id===autoPrefs().accountId)&&
       info.confidence>=0.86&&Boolean(info.merchant)&&Boolean(info.date)&&
       ["net_total","labeled_total","split_total"].includes(info.evidence)))&&
      (info.paid===null||info.paid===undefined||Math.abs(info.paid-info.amount)<=0.02)&&
      (info.arithmeticContradiction!==true)};
 }

 const src=digits(String(text||"").slice(0,12000));
 const lines=src.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean);
 const totalLine=/\bgrand\s*total\b|\btotal\b|\bnet\s*amount\b|\bamount\s*due\b|\bto\s*pay\b|الإجمالي|الاجمالي|إجمالي\s*الفاتورة|المجموع|الصافي|صافى|المستحق|المطلوب|القيمة\s*النهائية/i;
 const excludedLine=/subtotal|sub total|ضريبة|tax|vat|خصم|discount|كاش\s*باك|توفير|باقي|الباقي|change|before\s*tax/i;
 // Only infer the total from an explicitly labeled line, never from the largest
 // numeral (invoice number/phone/loyalty points can be larger than the total).
 const getLineAmount=line=>{
   const withCurrency=amountFrom(line);
   if(withCurrency!==null)return withCurrency;
   const afterLabel=line.replace(/^.*?(?:grand\s*total|total|net\s*amount|to\s*pay|الإجمالي|الاجمالي|إجمالي\s*الفاتورة|المجموع|الصافي|صافى|المستحق|القيمة\s*النهائية|amount\s*due|المطلوب)\s*[:：\-]?\s*/i,"");
   const m=afterLabel.match(/(?:EGP|ج\.م|جم|جنيه)?\s*(\d[\d,.\s]{0,18})/i);
   if(!m)return null;
   let raw=m[1].replace(/\s/g,"").replace(/[,.]$/,"");
   const comma=raw.lastIndexOf(","),dot=raw.lastIndexOf(".");
   if(comma>=0&&dot>=0)raw=comma>dot?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"");
   else if(comma>=0){const parts=raw.split(",");raw=parts.length===2&&parts[1].length!==3?parts.join("."):parts.join("")}
   else if(dot>=0){const parts=raw.split(".");if(parts.length===2&&parts[1].length===3)raw=parts.join("")}
   const n=Number(raw);
   return Number.isFinite(n)&&n>0&&n<1e9?n:null;
 };
 const totals=[];
 for(let i=0;i<lines.length;i++){
  if(!totalLine.test(lines[i])||excludedLine.test(lines[i]))continue;
  totals.push(lines[i]);
  if(i+1<lines.length&&/^(?:EGP|جم|جنيه)?\s*[0-9][0-9,.]*(?:\s*(?:EGP|جم|جنيه))?$/i.test(lines[i+1]))
   totals.push(lines[i]+" "+lines[i+1]);
 }
 const amount=[...totals].reverse().map(getLineAmount).find(x=>x!==null);
 if(amount===undefined||amount===null)throw Error("لم أجد إجمالي فاتورة واضحًا؛ أدخل المبلغ يدويًا بعد مراجعة الإيصال.");
 // Receipt dates are optional; invalid/ambiguous dates remain today's date and
 // must be reviewed in the confirmation form.
 let receiptDate=dateLocal();
 let printedDateFound=false;
 for(const line of lines){
   let found=line.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
   if(found){
     const y=+found[1],m=+found[2],d=+found[3],check=new Date(y,m-1,d);
     if(check.getFullYear()===y&&check.getMonth()+1===m&&check.getDate()===d)
       {receiptDate=[y,String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");printedDateFound=true;break}
   }
   found=line.match(/\b([0-3]?\d)[-\/.]([01]?\d)[-\/.](20\d{2})\b/);
   if(found){
     const y=+found[3],m=+found[2],d=+found[1],check=new Date(y,m-1,d);
     if(check.getFullYear()===y&&check.getMonth()+1===m&&check.getDate()===d)
       {receiptDate=[y,String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");printedDateFound=true;break}
   }
 }
 const merchant=lines.find(x=>x.length>2&&!/\d{5,}/.test(x)&&!totalLine.test(x)&&!/(tax|vat|ضريبة|الهاتف|^date|^time|التاريخ|الوقت|رقم\s*الفاتورة|invoice\s*(?:no|number))/i.test(x))||"إيصال";
 return {id:uuid(),type:"expense",date:receiptDate,amount,category:cat(lines.join(" ")),
  description:"إيصال — "+merchant.slice(0,60),accountId:resolvedAccount(""),subcategory:"",source:"receipt_reviewed",
  sourceHash:"receipt-auto-"+hash(lines.join("|").toLowerCase()),
  autoQuality:totals.length>0&&lines.length>=2&&printedDateFound&&merchant!=="إيصال"&&!!resolvedAccount("")};
}
function isDuplicate(d){
 return (C.getState().transactions||[]).some(x=>
   (d.sourceHash&&x.sourceHash===d.sourceHash)||
   (x.accountId===d.accountId&&x.type===d.type&&x.date===d.date&&+x.amount===+d.amount&&x.description===d.description));
}
function accountOpts(){return cash().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("")}
function categoryOpts(type){let cats=type==="income"?["مرتب","دخل آخر","هدية"]:["طعام ومشروبات","ترفيه","مشتريات","مواصلات","الهدايا","إيجار","فاتورة الإنترنت","فاتورة شحن رصيد","فاتورة الكهرباء","فواتير","صحة","تعليم","معيشة أخرى"];return cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("")}
function draftForm(){
 if(!pending)return '<div class="v4-empty">مفيش معاملة بانتظار المراجعة.</div>';
 return '<form class="v4-form" id="v4-capture-confirm">'+
 '<label>نوع الحركة<select name="type"><option value="expense" '+(pending.type==="expense"?"selected":"")+'>مصروف</option><option value="income" '+(pending.type==="income"?"selected":"")+'>دخل</option></select></label>'+
 '<label>المبلغ بالجنيه<input type="number" name="amount" min=".01" step="any" value="'+esc(pending.amount)+'" required></label>'+
 '<label>التاريخ<input type="date" name="date" value="'+esc(pending.date)+'" required></label>'+
 '<label>الحساب<select name="accountId" required>'+accountOpts()+'</select></label>'+
 '<label>الفئة<select name="category">'+categoryOpts(pending.type)+'</select></label>'+
 '<label class="full">الوصف<input name="description" maxlength="150" value="'+esc(pending.description)+'" required></label>'+
  (pending.receiptDetails?'<div class="full" style="padding:12px;border:1px solid #ddd;border-radius:10px"><strong>تفاصيل الإيصال المستخرجة</strong><p>المتجر: '+esc(pending.receiptDetails.merchant||"غير معروف")+
   ' • رقم الإيصال: '+esc(pending.receiptDetails.invoiceNumber||"غير واضح")+
   ' • طريقة الدفع: '+esc(pending.receiptDetails.paymentMethod==="cash"?"نقدي":pending.receiptDetails.paymentMethod==="card"?"بطاقة":"غير محددة")+
   ' • ثقة القراءة: '+esc(Math.round(Number(pending.receiptDetails.confidence||0)*100))+'%</p>'+
   (pending.receiptDetails.items||[]).map(it=>'<div>الصنف: '+esc(it.name)+' • الكمية: '+esc(it.quantity)+
    (it.unitPrice?' • السعر: '+esc(it.unitPrice):'')+'</div>').join('')+
   '<small>لا يتم حفظ الصورة الأصلية أو بيانات العميل الشخصية.</small></div>':"")+
 '<div class="full v4-chips"><button type="submit" class="v4-btn">تأكيد وحفظ المعاملة</button><button type="button" data-v4-import="discard" class="v4-btn secondary">إلغاء</button></div>'+
 '</form>';
}
function renderReview(){
 const h=el("v4-capture-review");if(!h)return;
 h.innerHTML=draftForm()+(notification?'<div class="v4-note">'+esc(notification)+'</div>':'')+
 (lastAutoSaved?'<button type="button" class="v4-btn secondary" data-v4-import="undo-last">تراجع عن آخر تسجيل تلقائي</button>':'');
 if(pending){
  const a=h.querySelector('select[name=accountId]'),c=h.querySelector('select[name=category]');
  if(a&&cash().some(x=>x.id===pending.accountId))a.value=pending.accountId;
  if(c&&[...c.options].some(x=>x.value===pending.category))c.value=pending.category;
 }
}
function review(d,message){pending=d;staged=[];rawOutput="";notification=message||"راجع كل خانة، ثم وافق على الحفظ.";renderReview()}
function captureForm(){
 return '<section class="f10-review" aria-label="مراجعة المعاملة المالية">'+
  '<div class="f10-review-head"><span class="f10-step">03</span><div><h3>راجع العملية قبل حفظها</h3>'+
  '<p>تقدر تعدّل الحساب والمبلغ والفئة والتاريخ. الحفظ التلقائي للعمليات الواضحة اختياري، والعمليات غير المؤكدة للمراجعة.</p></div></div>'+
  '<div id="v4-capture-review"></div>'+
 '</section>';
}
function render(){
 const node=el("v4-capture");if(!node)return;
 node.innerHTML=captureForm();renderReview();
}
function ocrLibrary(){
 if(global.Tesseract)return Promise.resolve(global.Tesseract);
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
  script.crossOrigin="anonymous";script.referrerPolicy="no-referrer";
  script.onload=()=>global.Tesseract?resolve(global.Tesseract):reject(Error("مكتبة OCR غير متاحة"));
  script.onerror=()=>reject(Error("فشل تنزيل مكتبة OCR؛ تأكد من اتصال الإنترنت"));
  document.head.appendChild(script);
 });
}
async function scanReceipt(){
 if(ocrBusy)return;
 const file=el("v4-ocr-file")?.files?.[0];
 if(!file||!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>8*1024*1024)return C.toast("اختر صورة PNG/JPEG/WebP لا تتجاوز 8 ميجابايت.");
 ocrBusy=true;notification="جارٍ التعرف على الإيصال على جهازك؛ لن تُرفع صورته إلى خادم Flosy.";renderReview();
 let worker=null,url=null;
 try{
  const T=await ocrLibrary();worker=await T.createWorker("ara+eng");
  url=URL.createObjectURL(file);
  const result=await worker.recognize(url);
  const text=result?.data?.text||"";
  rawOutput=redact(text).slice(0,700);
  const proposal=parseReceipt(text);
  review(proposal,"تم قراءة الإيصال. تأكد من السعر والتاريخ والتاجر بنفسك؛ النص المستخرج غير دقيق أحيانًا.");
 }catch(err){pending=null;notification="تعذرت القراءة: "+err.message+"؛ يمكنك تسجيل المصروف من زر إضافة معاملة.";renderReview()}
 finally{if(worker)try{await worker.terminate()}catch{};if(url)URL.revokeObjectURL(url);ocrBusy=false}
}
function startVoice(){
 if(global.FLOSY_NATIVE_VOICE_AVAILABLE){global.location.href="flosyapp://voice-expense";return}
 const Cls=global.SpeechRecognition||global.webkitSpeechRecognition;
 if(!Cls){C.toast("المتصفح لا يدعم التعرف الصوتي. اكتب الجملة في الحقل أدناه.");return}
 try{
  recognition=new Cls();recognition.lang="ar-EG";recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
  recognition.onresult=e=>{const spoken=e.results?.[0]?.[0]?.transcript||"";receiveNativeVoice(spoken)};
  recognition.onerror=e=>C.toast("تعذر التقاط الصوت: "+String(e.error||"راجع إذن الميكروفون"));
  recognition.start();C.toast("اتكلم بالمصري، مثال: دفعت 55 جنيه قهوة");
 }catch(err){C.toast("تعذر بدء الميكروفون: "+err.message)}
}
function receiveNativeVoice(spoken){
 if(typeof spoken!=="string"||spoken.length>320)return;
 const field=el("v4-voice-text")?.elements?.namedItem("spoken");
 if(field)field.value=spoken;
 try{
  const proposed=parseVoice(spoken);
  if(!autoRecord(proposed,"voice"))review(proposed,"لم تتوفر ثقة كافية للحفظ التلقائي؛ راجع النص والمبلغ والحساب.");
  if(global.FLOSY_REPAIR?.nativeVoiceResult)global.FLOSY_REPAIR.nativeVoiceResult(spoken);
 }catch(e){
  if(global.FLOSY_REPAIR?.nativeVoiceError)global.FLOSY_REPAIR.nativeVoiceError(e.message);
  C.toast(e.message);
 }
}
function handleConfirmation(form){
 if(!pending)return C.toast("لا يوجد تحليل بانتظار الموافقة");
 const x=new FormData(form),d={...pending};
 d.type=String(x.get("type"));d.amount=Number(x.get("amount"));d.date=String(x.get("date")||"");
 d.accountId=String(x.get("accountId")||"");d.category=String(x.get("category")||"");
 d.description=String(x.get("description")||"").trim().slice(0,150);
 if(!["expense","income"].includes(d.type)||!validAmount(d.amount)||!cash().some(a=>a.id===d.accountId)||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!d.description)return C.toast("راجع المبلغ والتاريخ والحساب والوصف");
 if(isDuplicate(d))return C.toast("العملية موجودة بالفعل؛ لن نكررها.");
 d.createdAt=new Date().toISOString();d.updatedAt=d.createdAt;
 C.mutate(s=>s.transactions.push(d));pending=null;
 notification="تم تسجيل المعاملة بعد موافقتك، وأُرسلت للمزامنة عند توافر الاتصال.";
 renderReview();C.toast("تم تسجيل المعاملة");
}
document.addEventListener("submit",e=>{
 const id=e.target.id;if(!["v4-voice-text","v4-sms-form","v4-capture-confirm"].includes(id))return;
 e.preventDefault();
 try{
  if(id==="v4-capture-confirm")return handleConfirmation(e.target);
  const f=new FormData(e.target);
  if(id==="v4-voice-text"){const d=parseVoice(String(f.get("spoken")||""));if(!autoRecord(d,"voice"))review(d,"راجع المبلغ والحساب قبل الحفظ.");}
  if(id==="v4-sms-form")review(parseBankSMS(String(f.get("sms")||"")),"البيانات استُخرجت محليًا من SMS. تأكد من اتجاه الحركة والمبلغ.");
 }catch(err){C.toast(err.message)}
});
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-v4-import]");if(!b)return;
 const action=b.dataset.v4Import;
 if(action==="voice")(global.FLOSY_REPAIR?.startVoice||startVoice)();
 if(action==="ocr")(global.FLOSY_REPAIR?.scanReceipt||scanReceipt)();
 if(action==="bank")C.goto("v4-bank");
 if(action==="undo-last")undoLastAuto();
 if(action==="discard"){pending=null;notification="ألغيت العملية دون حفظ.";renderReview()}
});
global.FLOSY_CAPTURE={render,parseBankSMS,parseVoice,parseReceipt,receiveNativeVoice,isDuplicate,amountFrom,cat,redact,parseReview:review,
 autoPrefs,autoEnabled,setAuto,setAutoAccount,resolvedAccount,autoRecord,undoLastAuto,hasUndo:()=>Boolean(lastAutoSaved)};
render();
})(window);