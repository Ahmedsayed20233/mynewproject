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
 ...value.matchAll(/(?:EGP|جنيه(?:اً|ا)?|جم|ج\.م|L\.E\.?)\s*[:\-]?\s*([0-9][0-9.,\s]{0,22})/gi),
 ...value.matchAll(/(?:بمبلغ|بقيمة|amount|amt|تم\s*خصم|تم\s*إيداع|دفعت|دفع|purchase|paid)\s*[:\-]?\s*([0-9][0-9.,\s]{0,22})\s*(?:EGP|جنيه|جم|ج\.م|L\.E\.?)/gi)
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
  category:debit?cat(str):"دخل آخر",subcategory:"",accountId:cash()[0]?.id||"",
  description:merchant+" — معاملة رسالة بنكية تحتاج مراجعة",
  sourceHash:"sms4-"+hash(str.trim().replace(/\s+/g," ").toLowerCase()),source:"sms_reviewed",confidence:"مراجعة مطلوبة"};
}
function parseVoice(text){
 const str=digits(String(text||"").trim()),amount=amountFrom(str)||(()=>{
  const m=str.match(/(?:دفعت|صرفت|شراء|استلمت|جالي|دخل|استلم|كسبت)\s+(\d+(?:[.,]\d{1,2})?)/);
  return m?Number(m[1].replace(",",".")):null;
 })();
 if(!validAmount(amount))throw Error("اتأكد من المبلغ، مثل: «دفعت 75 جنيه على القهوة».");
 const credit=/استلمت|جالي|وصلني|مرتب|دخلت|قبضت|إيداع|ايداع/.test(str)&&!/دفعت|صرفت|اشتريت/.test(str);
 const ymd=dateLocal(),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
 const dt=/امبارح|أمس/.test(str)?[yesterday.getFullYear(),String(yesterday.getMonth()+1).padStart(2,"0"),String(yesterday.getDate()).padStart(2,"0")].join("-"):ymd;
 const matched=cash().find(a=>str.includes(a.name)||/فيزا|كارت|بنك/.test(str)&&a.id==="bank"||/كاش/.test(str)&&a.id==="wallet");
 return {id:uuid(),type:credit?"income":"expense",date:dt,amount,
   category:credit?"دخل آخر":cat(str),description:"إدخال صوتي — "+str.slice(0,85),
   accountId:matched?.id||cash()[0]?.id||"",subcategory:"",source:"voice_reviewed"};
}
function parseReceipt(text){
 const src=digits(String(text||"").slice(0,12000));
 const lines=src.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean);
 const totalLine=/\bgrand\s*total\b|\btotal\b|الإجمالي|الاجمالي|إجمالي\s*الفاتورة|المجموع|amount\s*due|المطلوب/i;
 const excludedLine=/subtotal|sub total|ضريبة|tax|vat|خصم|discount|كاش\s*باك/i;
 // Only infer the total from an explicitly labeled line, never from the largest
 // numeral (invoice number/phone/loyalty points can be larger than the total).
 const getLineAmount=line=>{
   const withCurrency=amountFrom(line);
   if(withCurrency!==null)return withCurrency;
   const afterLabel=line.replace(/^.*?(?:grand\s*total|total|الإجمالي|الاجمالي|إجمالي\s*الفاتورة|المجموع|amount\s*due|المطلوب)\s*[:：\-]?\s*/i,"");
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
 const totals=lines.filter(line=>totalLine.test(line)&&!excludedLine.test(line));
 const amount=[...totals].reverse().map(getLineAmount).find(x=>x!==null);
 if(amount===undefined||amount===null)throw Error("لم أجد إجمالي فاتورة واضحًا؛ أدخل المبلغ يدويًا بعد مراجعة الإيصال.");
 // Receipt dates are optional; invalid/ambiguous dates remain today's date and
 // must be reviewed in the confirmation form.
 let receiptDate=dateLocal();
 for(const line of lines){
   let found=line.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
   if(found){
     const y=+found[1],m=+found[2],d=+found[3],check=new Date(y,m-1,d);
     if(check.getFullYear()===y&&check.getMonth()+1===m&&check.getDate()===d)
       {receiptDate=[y,String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");break}
   }
   found=line.match(/\b([0-3]?\d)[-\/.]([01]?\d)[-\/.](20\d{2})\b/);
   if(found){
     const y=+found[3],m=+found[2],d=+found[1],check=new Date(y,m-1,d);
     if(check.getFullYear()===y&&check.getMonth()+1===m&&check.getDate()===d)
       {receiptDate=[y,String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");break}
   }
 }
 const merchant=lines.find(x=>x.length>2&&!/\d{5,}/.test(x)&&!totalLine.test(x)&&!/(tax|vat|ضريبة|الهاتف)/i.test(x))||"إيصال";
 return {id:uuid(),type:"expense",date:receiptDate,amount,category:cat(lines.join(" ")),
  description:"إيصال — "+merchant.slice(0,60),accountId:cash()[0]?.id||"",subcategory:"",source:"receipt_reviewed"};
}
function isDuplicate(d){
 return (C.getState().transactions||[]).some(x=>
   (d.sourceHash&&x.sourceHash===d.sourceHash)||
   (x.accountId===d.accountId&&x.type===d.type&&x.date===d.date&&+x.amount===+d.amount&&x.description===d.description));
}
function accountOpts(){return cash().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("")}
function categoryOpts(type){let cats=type==="income"?["مرتب","دخل آخر","هدية"]:["طعام ومشروبات","ترفيه","مشتريات","مواصلات","الهدايا","إيجار","فاتورة الإنترنت","فاتورة شحن رصيد","فاتورة الكهرباء","فواتير","صحة","تعليم","معيشة أخرى"];return cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("")}
function draftForm(){
 if(!pending)return '<div class="v4-empty">مفيش عملية معلّقة. مش هيتم حفظ أي مصروف من غير تأكيدك.</div>';
 return '<form class="v4-form" id="v4-capture-confirm">'+
 '<label>نوع الحركة<select name="type"><option value="expense" '+(pending.type==="expense"?"selected":"")+'>مصروف</option><option value="income" '+(pending.type==="income"?"selected":"")+'>دخل</option></select></label>'+
 '<label>المبلغ بالجنيه<input type="number" name="amount" min=".01" step="any" value="'+esc(pending.amount)+'" required></label>'+
 '<label>التاريخ<input type="date" name="date" value="'+esc(pending.date)+'" required></label>'+
 '<label>الحساب<select name="accountId" required>'+accountOpts()+'</select></label>'+
 '<label>الفئة<select name="category">'+categoryOpts(pending.type)+'</select></label>'+
 '<label class="full">الوصف<input name="description" maxlength="150" value="'+esc(pending.description)+'" required></label>'+
 '<div class="full v4-chips"><button type="submit" class="v4-btn">تأكيد وحفظ المعاملة</button><button type="button" data-v4-import="discard" class="v4-btn secondary">إلغاء</button></div>'+
 '</form>';
}
function renderReview(){
 const h=el("v4-capture-review");if(!h)return;
 h.innerHTML=draftForm()+(notification?'<div class="v4-note">'+esc(notification)+'</div>':'');
 if(pending){
  const a=h.querySelector('select[name=accountId]'),c=h.querySelector('select[name=category]');
  if(a&&cash().some(x=>x.id===pending.accountId))a.value=pending.accountId;
  if(c&&[...c.options].some(x=>x.value===pending.category))c.value=pending.category;
 }
}
function review(d,message){pending=d;staged=[];rawOutput="";notification=message||"راجع كل خانة، ثم وافق على الحفظ.";renderReview()}
function captureForm(){
 return '<div class="v4-hero"><div class="v4-eyebrow">QUICK ADD · EGYPT FIRST</div><h2>سجّل مصروفك بطريقتك</h2><p>بالعامية المصرية، بصورة إيصال، أو برسالة بنك. كل عملية تُعرض للمراجعة قبل حفظها.</p></div>'+
 '<div class="v4-bento">'+
 '<div class="v4-surface v4-half"><div class="v4-head"><h3>🎙️ مصروف بالصوت المصري</h3><span class="v4-badge">ar-EG</span></div>'+
 '<div class="v4-chips"><button class="v4-btn" type="button" data-v4-import="voice">ابدأ تسجيل الصوت</button><span class="v4-chip">«دفعت 75 جنيه قهوة من الفيزا»</span></div>'+
 '<form id="v4-voice-text" class="v4-form" style="margin-top:13px"><label class="full">ممكن تكتب الجملة لو الميكروفون مش متاح<textarea name="spoken" rows="2" maxlength="280" required placeholder="دفعت 120 جنيه غداء من البنك امبارح"></textarea></label>'+
 '<button class="v4-btn secondary full">تحليل الجملة</button></form>'+
 '<p class="v4-fineprint">التعرف الصوتي قد يستخدم خدمة نطق خارجية بحسب الهاتف/المتصفح. لا تُخزن التسجيلات الصوتية في Flosy.</p></div>'+
 '<div class="v4-surface v4-half"><div class="v4-head"><h3>📷 تصوير إيصال (OCR)</h3><span class="v4-badge">معاينة أولًا</span></div>'+
 '<input id="v4-ocr-file" type="file" accept="image/png,image/jpeg,image/webp" capture="environment" aria-label="صورة إيصال" />'+
 '<div class="v4-chips" style="margin-top:10px"><button type="button" data-v4-import="ocr" class="v4-btn">استخراج من الصورة</button></div>'+
 '<p class="v4-fineprint">معالجة الصورة داخل المتصفح باستخدام Tesseract.js؛ تُحمّل مكتبة التعرف واللغات من الإنترنت عند أول استخدام. قد تخطئ في السعر أو التاريخ؛ تأكد بنفسك.</p></div>'+
 '<div class="v4-surface v4-half"><h3>💬 تحليل رسالة مالية</h3><form class="v4-form" id="v4-sms-form">'+
 '<label class="full">رسالة SMS مالية تختارها<textarea rows="3" name="sms" maxlength="5000" placeholder="CIB: Your card purchase EGP 250.00" required></textarea></label>'+
 '<button type="submit" class="v4-btn full">تحليل الرسالة بدون حفظ تلقائي</button></form>'+
 '<p class="v4-fineprint">دعم مبدئي لعبارات CIB، البنك الأهلي، بنك مصر، QNB، بنك القاهرة، الإسكندرية، InstaPay، المحافظ. لازم تختبر نماذج البنك الفعلية؛ رموز OTP مرفوضة.</p></div>'+
 '<div class="v4-surface v4-half"><h3>📑 كشف بنك CSV</h3>'+
 '<p>الملفات تختلف من بنك لبنك؛ استخدم استيراد CSV الذكي لتحديد أعمدة التاريخ والمبلغ والخصم والإضافة والوصف يدويًا عند الحاجة.</p>'+
 '<button class="v4-btn secondary" type="button" data-v4-import="bank">فتح مستورد CSV الذكي</button>'+
 '<p class="v4-fineprint">لا يوجد ربط مباشر بأي بنك أو سحب تلقائي لسجلات الحساب.</p></div>'+
 '<div class="v4-surface v4-full"><div class="v4-head"><h3>مراجعة العملية قبل الحفظ</h3><span class="v4-badge">تحت سيطرتك</span></div><div id="v4-capture-review"></div></div></div>';
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
  review(parseVoice(spoken),"راجع النص والمبلغ والتاريخ والحساب قبل الحفظ.");
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
  if(id==="v4-voice-text")review(parseVoice(String(f.get("spoken")||"")),"المبلغ والتاريخ والفئة مستخرجة من اللغة الطبيعية؛ راجعها.");
  if(id==="v4-sms-form")review(parseBankSMS(String(f.get("sms")||"")),"البيانات استُخرجت محليًا من SMS. تأكد من اتجاه الحركة والمبلغ.");
 }catch(err){C.toast(err.message)}
});
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-v4-import]");if(!b)return;
 const action=b.dataset.v4Import;
 if(action==="voice")(global.FLOSY_REPAIR?.startVoice||startVoice)();
 if(action==="ocr")(global.FLOSY_REPAIR?.scanReceipt||scanReceipt)();
 if(action==="bank")C.goto("v4-bank");
 if(action==="discard"){pending=null;notification="ألغيت العملية دون حفظ.";renderReview()}
});
global.FLOSY_CAPTURE={render,parseBankSMS,parseVoice,parseReceipt,receiveNativeVoice,isDuplicate,amountFrom,cat,redact,parseReview:review};
render();
})(window);