/* Flosy repairs: voice and receipt capture with explicit user consent and fail-safe review. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;
if(!C)return;
const el=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let voice=null,busyVoice=false,busyOCR=false,lastReceiptText="",receiptEngine="";
function status(id,message){const x=el(id);if(x)x.textContent=message;return message}
function render(){
 const host=el("flosyRepairRoot");if(!host)return;
 const nativeOCR=Boolean(w.FLOSY_NATIVE_OCR_AVAILABLE);
 const p=w.FLOSY_CAPTURE?.autoPrefs?.()||{voice:false,sms:false,receipt:false,accountId:""};
 const accounts=(C.getState().accounts||[]).filter(a=>a&&a.id);
 const accountChoices='<option value="">الحساب الوحيد أو اكتشاف الحساب من النص</option>'+
  accounts.map(a=>'<option value="'+esc(a.id)+'" '+(p.accountId===a.id?'selected':'')+'>'+esc(a.name)+'</option>').join("");

 host.innerHTML='<div class="f10-capture" aria-label="تسجيل الصوت ومسح الإيصالات">'+
 '<div class="f10-hero"><span class="f10-overline">FLOSY CAPTURE · SIMPLE & SECURE</span>'+
 '<h2>سجّل فلوسك في ثواني</h2><p>فعّل الحفظ التلقائي مرة واحدة. المعاملات الواضحة تُحفظ فورًا، والحالات الغامضة تُترك للتصحيح.</p>'+
 '<div class="f10-mini-pills"><span>◉ يدعم العامية المصرية</span><span>▣ بياناتك تحت سيطرتك</span><span>◷ منع التكرار والتراجع</span></div>'+
 '<div class="f10-auto-settings" aria-label="إعدادات تسجيل المعاملات تلقائيا">'+
 '<label><input type="checkbox" data-repair-auto="voice" '+(p.voice?'checked':'')+'> حفظ الصوت مباشرة</label>'+
 '<label><input type="checkbox" data-repair-auto="receipt" '+(p.receipt?'checked':'')+'> حفظ الفواتير الواضحة مباشرة</label>'+
 '<label><input type="checkbox" data-repair-auto="sms" '+(p.sms?'checked':'')+'> حفظ SMS المالية الواضحة مباشرة</label>'+
 '<label>حساب التسجيل التلقائي<select id="flosyAutoCaptureAccount">'+accountChoices+'</select></label>'+
 '<small>يعمل فقط عند وجود مبلغ واتجاه موثوقين. كل الرسائل غير المالية وأكواد التحقق لا تُضاف إلى الرصيد، وعدم وضوح الحساب يوقف الحفظ التلقائي.</small></div></div>'+
 '<div class="f10-two">'+
 '<section class="f10-card voice" aria-labelledby="f10VoiceTitle">'+
 '<div class="f10-cardtitle"><span class="f10-step">01</span><div><h3 id="f10VoiceTitle">سجّل بالصوت</h3><p>مثال: «دفعت 75 جنيه قهوة من الكاش»</p></div></div>'+
 '<div class="f10-mic-wrap"><span class="f10-mic-icon" aria-hidden="true">🎙</span>'+
 '<button class="f10-primary" type="button" data-repair="voice">ابدأ التسجيل بالمصري</button></div>'+
 '<p class="f10-live" id="flosyVoiceStatus" role="status" aria-live="polite">جاهز. اضغط الزر واسمح للميكروفون لو طلب.</p>'+
 '<form id="v4-voice-text" class="f10-mini-form"><label for="f10Spoken">أو اكتب جملتك لو الميكروفون غير متاح</label>'+
 '<textarea id="f10Spoken" name="spoken" rows="2" maxlength="280" required placeholder="اشتريت حاجات للبيت بـ 120 جنيه امبارح"></textarea>'+
 '<button class="f10-secondary" type="submit">تسجيل الجملة</button></form>'+
 '<small class="f10-privacy">Flosy لا يخزّن تسجيلات صوتية. محرك التعرف الصوتي قد يحتاج خدمات جهازك.</small></section>'+
 '<section class="f10-card receipt" aria-labelledby="f10ReceiptTitle">'+ '<div class="f10-cardtitle"><span class="f10-step">02</span>'+
 '<div><h3 id="f10ReceiptTitle">استخرج بيانات الإيصال</h3><p>صوّر الإيصال بوضوح أو اختار صورة محفوظة</p></div></div>'+
 '<div class="f10-camera">'+
 (nativeOCR?'<button type="button" class="f10-primary" data-repair="native-camera">📷 تصوير بالكاميرا</button>'+
 '<button type="button" class="f10-secondary" data-repair="native-ocr">اختيار صورة</button>':'')+
 '<label class="f10-file">اختار صورة إيصال <input id="v4-ocr-file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="صورة إيصال" /></label>'+
 '<button type="button" class="f10-secondary" data-v4-import="ocr">استخراج النص من الصورة</button></div>'+
 '<p class="f10-live" id="flosyOcrStatus" role="status" aria-live="polite">JPEG أو PNG أو WebP بحد أقصى 8 ميجابايت. الفاتورة الواضحة تُحفظ تلقائيًا عند تفعيل الخيار.</p>'+
 '<small class="f10-privacy">على Android: OCR محلي للأرقام والنص اللاتيني؛ المتصفح يدعم العربية مع تنزيل نموذج Tesseract.</small></section>'+
 '</div>'+
 '<section class="f10-extracted"><div class="f10-section-heading"><div><span class="f10-overline">EXTRACTED TEXT</span>'+
 '<h3>النص المستخرج من الإيصال</h3><p>تقدر تصححه أو تستخرج المبلغ يدويًا قبل التسجيل.</p></div></div>'+
 '<form id="flosyRepairOCRForm" class="f10-text-form">'+
 '<label for="flosyRepairOCRText">النص القابل للتعديل</label>'+
 '<textarea id="flosyRepairOCRText" name="ocrText" rows="4" maxlength="12000" placeholder="اسم المتجر&#10;Date: 10/11/2026&#10;TOTAL EGP 125.00">'+esc(lastReceiptText)+'</textarea>'+
 '<div class="f10-tools"><button type="submit" class="f10-primary">استخراج الإجمالي للمراجعة</button>'+
 '<button type="button" class="f10-secondary" data-repair="copy-ocr">نسخ النص</button>'+
 '<button type="button" class="f10-secondary" data-repair="export-ocr">تنزيل نص الإيصال</button></div></form>'+
 '<details class="f10-manual"><summary>لو الإيصال غير واضح — إدخال التاجر والمبلغ يدويًا</summary>'+
 '<form id="flosyReceiptManualForm" class="f10-mini-form">'+
 '<label>اسم التاجر<input name="merchant" maxlength="65" placeholder="اسم التاجر" required></label>'+
 '<label>المبلغ بالجنيه<input type="number" name="amount" min="0.01" max="999999999" step="0.01" required></label>'+
 '<button class="f10-secondary" type="submit">إرسال للمراجعة</button></form></details>'+
 '</section>'+
 '<div class="f10-bottom">تحتاج استيراد SMS أو InstaPay؟ <button type="button" data-repair="open-import">افتح مركز الاستيراد المخصص ←</button></div>'+
 '</div>';
}
function proposeReceipt(text,engine){
 const raw=String(text||"").slice(0,12000).trim();
 lastReceiptText=raw;receiptEngine=engine||"OCR";
 const area=el("flosyRepairOCRText");if(area)area.value=raw;
 if(!raw){status("flosyOcrStatus","لم يُستخرج نص قابل للقراءة؛ جرب صورة أوضح أو اكتب النص.");return false}
 const C4=w.FLOSY_CAPTURE;
 if(!C4?.parseReceipt||!C4?.parseReview){status("flosyOcrStatus","لم يتم تحميل أداة مراجعة المعاملات بعد.");return false}
 try{
  const suggested=C4.parseReceipt(raw);
  if(C4.autoRecord?.(suggested,"receipt")){
   status("flosyOcrStatus","تم حفظ إجمالي "+suggested.amount+" جنيه مباشرة (يمكنك التراجع من أسفل الصفحة).");
  }else{
   C4.parseReview(suggested,"تم استخراج الإيصال، لكن البيانات غير مكتملة أو التسجيل التلقائي مغلق. راجع الحقول أدناه.");
   status("flosyOcrStatus","تم استخراج الإجمالي والتاريخ. راجع البيانات أدناه، أو فعّل الحفظ التلقائي وحدد حسابًا.");
  }
  return true;
 }catch(err){
  status("flosyOcrStatus","تم استخراج نص، لكن إجمالي الفاتورة غير مؤكد: "+err.message+" — صحح النص أدناه.");
  C.toast("راجع إجمالي الإيصال؛ لم يتم حفظ أي معاملة.");
  return false;
 }
}
function receiveNativeReceipt(text){return proposeReceipt(text,"Android ML Kit (Latin/EGP)")}
async function receiveNativeReceiptImage(imageDataUrl,latinText){
 const latin=String(latinText||"").slice(0,12000);
 // Fast path: keep the bundled offline OCR when it finds a reliable total.
 if(latin&&proposeReceipt(latin,"Android ML Kit Latin"))return true;
 if(typeof imageDataUrl!=="string"||!/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(imageDataUrl)
    ||imageDataUrl.length>750000){
  status("flosyOcrStatus","OCR اللاتيني لم يحدد إجمالي الفاتورة؛ استخدم اختيار صورة + استخراج النص بالعربي.");
  return false;
 }
 if(busyOCR)return false;
 busyOCR=true;
 status("flosyOcrStatus","القراءة اللاتينية لم تتعرف على الإجمالي. جاري تجربة محرك OCR عربي/إنجليزي محليًا...");
 let worker=null;
 try{
  const lib=await loadOCR();
  worker=await lib.createWorker(["ara","eng"]);
  const ocr=await worker.recognize(imageDataUrl);
  const text=String(ocr?.data?.text||"");
  return proposeReceipt(text||latin,"Tesseract Arabic/English (Android image)");
 }catch(e){
  status("flosyOcrStatus","تعذر إكمال OCR العربي: "+String(e.message||e)+". اختر صورة أوضح أو صحّح النص المستخرج.");
  return false;
 }finally{
  if(worker)try{await worker.terminate()}catch{}
  busyOCR=false;
 }
}
function nativeAction(action,fallback,text=""){
 try{
  if(w.FlosyNative&&typeof w.FlosyNative.postMessage==="function"){
    w.FlosyNative.postMessage(JSON.stringify({action,text}));
    return true;
  }
  if(w.FLOSY_NATIVE_ANDROID&&fallback){w.location.href="flosyapp://"+fallback;return true}
 }catch(err){
  status("flosyVoiceStatus","تعذر توصيل التطبيق بخدمة Android: "+err.message);
 }
 return false;
}
function nativeVoiceError(message){
 busyVoice=false;
 status("flosyVoiceStatus",String(message||"تعذر التعرف الصوتي")+". يمكنك كتابة المصروف بدلًا من ذلك.");
}
function nativeVoiceStatus(message){status("flosyVoiceStatus",String(message||"التسجيل جارٍ…"))}
function nativeVoiceResult(text){
 status("flosyVoiceStatus",text?"تم التقاط الصوت. إذا كانت العملية واضحة والحفظ التلقائي مفعل، سُجلت بالفعل.":"لم يتم التقاط نص واضح.");
}

async function loadOCR(){
 if(w.Tesseract)return w.Tesseract;
 const current=document.querySelector('script[data-flosy-ocr-lib]');
 if(current){
  return new Promise((resolve,reject)=>{
   if(w.Tesseract)return resolve(w.Tesseract);
   current.addEventListener("load",()=>resolve(w.Tesseract),{once:true});
   current.addEventListener("error",()=>reject(Error("تعذر تحميل مكتبة OCR")),{once:true});
  });
 }
 return new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.dataset.flosyOcrLib="1";
  script.src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js";
  script.crossOrigin="anonymous";
  script.referrerPolicy="no-referrer";
  script.onload=()=>w.Tesseract?resolve(w.Tesseract):reject(Error("ملفات OCR غير مدعومة"));
  script.onerror=()=>reject(Error("تعذر الوصول إلى مكتبة OCR؛ تحقق من الإنترنت"));
  document.head.appendChild(script);
 });
}
async function scanReceipt(){
 if(busyOCR)return;
 const input=el("v4-ocr-file"),file=input?.files?.[0];
 if(!file){
  if(w.FLOSY_NATIVE_OCR_AVAILABLE&&nativeAction("receipt-camera","receipt-camera")){
    status("flosyOcrStatus","افتح الكاميرا وصوّر الإيصال. بعد التصوير هتظهر التفاصيل للمراجعة.");
    return;
  }
  C.toast("اختر صورة إيصال من المعرض أولًا، ثم اضغط استخراج.");
  return;
 }
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size<=0||file.size>8*1024*1024){
  C.toast("اختر صورة JPEG/PNG/WebP لا تتجاوز 8MB");return;
 }
 busyOCR=true;status("flosyOcrStatus","جاري تحميل نموذج OCR وقراءة النص محليًا؛ يمكن أن يستغرق أول تشغيل وقتًا.");
 let worker=null;
 try{
  const lib=await loadOCR();
  worker=await lib.createWorker(["ara","eng"]);
  const result=await worker.recognize(file);
  const text=String(result?.data?.text||"");
  if(!proposeReceipt(text,"Tesseract Arabic/English"))
   throw Error("تعذر تحديد إجمالي مؤكد؛ جرّب صورة أوضح أو صحح إجمالي الفاتورة");
 }catch(err){
  status("flosyOcrStatus","تعذر التحليل الآلي: "+String(err.message||err)+". يمكنك لصق النص وتصحيحه ثم تحليله.");
 }finally{
  if(worker){try{await worker.terminate()}catch{}}
  busyOCR=false;
 }
}
function startVoice(){
 if(busyVoice)return;
 if(w.FLOSY_NATIVE_VOICE_AVAILABLE){
  status("flosyVoiceStatus","جارٍ تشغيل ميكروفون Android. لو ظهرت رسالة إذن ميكروفون اختر سماح.");
  if(nativeAction("voice","voice-expense"))return;
 }
 const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Speech){status("flosyVoiceStatus","المتصفح لا يدعم التسجيل المباشر. افتح Chrome مع إذن الميكروفون، أو اكتب الجملة.");C.toast("التعرف الصوتي غير مدعوم هنا؛ استخدم الإدخال النصي.");return}
 try{
  voice=new Speech();voice.lang="ar-EG";voice.interimResults=false;voice.continuous=false;voice.maxAlternatives=1;
  voice.onstart=()=>status("flosyVoiceStatus","🎤 الميكروفون مفتوح؛ اتكلم بالمصري...");
  voice.onresult=e=>{
   const spoken=e.results?.[0]?.[0]?.transcript||"";
   if(spoken){w.FLOSY_CAPTURE?.receiveNativeVoice(spoken);status("flosyVoiceStatus","تم تحويل الكلام إلى نص وتطبيق إعداد الحفظ التلقائي.")}
   else status("flosyVoiceStatus","لم يظهر نص واضح. جرب الكلام ببطء.");
  };
  voice.onerror=e=>{busyVoice=false;status("flosyVoiceStatus","خطأ في التسجيل: "+String(e.error||"unknown")+". راجع إذن الميكروفون وخدمة التعرف الصوتي.")};
  voice.onend=()=>{busyVoice=false;if(el("flosyVoiceStatus")?.textContent.includes("المفتوح"))status("flosyVoiceStatus","انتهى التسجيل؛ إن لم يظهر نص استخدم الإدخال المكتوب.")};
  busyVoice=true;voice.start();
 }catch(err){busyVoice=false;status("flosyVoiceStatus","تعذر بدء الميكروفون: "+String(err.message||err))}
}
document.addEventListener("change",e=>{
 const mode=e.target?.dataset?.repairAuto;
 if(mode){
  w.FLOSY_CAPTURE?.setAuto?.(mode,Boolean(e.target.checked));
  status("flosyVoiceStatus",e.target.checked?"تم تفعيل الحفظ التلقائي لـ"+mode:"تم إيقاف الحفظ التلقائي لـ"+mode);
 }
 if(e.target?.id==="flosyAutoCaptureAccount"){
  w.FLOSY_CAPTURE?.setAutoAccount?.(String(e.target.value||""));
  status("flosyVoiceStatus","تم حفظ اختيار حساب التسجيل التلقائي.");
 }
});
document.addEventListener("submit",e=>{
 const id=e.target?.id;if(!["flosyRepairOCRForm","flosyReceiptManualForm"].includes(id))return;
 e.preventDefault();
 if(id==="flosyRepairOCRForm"){
  proposeReceipt(String(new FormData(e.target).get("ocrText")||""),"manual text review");return;
 }
 const f=new FormData(e.target),amount=Number(f.get("amount")),
  merchant=String(f.get("merchant")||"").trim().slice(0,65);
 if(!Number.isFinite(amount)||amount<=0||amount>=1e9||!merchant){
  C.toast("راجع اسم التاجر والمبلغ");return;
 }
 const accounts=C.getState().accounts||[];
 const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
 const draft={id:w.crypto?.randomUUID?.()||"receipt-"+Date.now(),
  type:"expense",date:today,amount,category:"مشتريات",
  description:"إيصال — "+merchant,accountId:accounts[0]?.id||"",
  subcategory:"",source:"receipt_reviewed"};
 w.FLOSY_CAPTURE?.parseReview?.(draft,"مبلغ أُدخل يدويًا؛ راجع الحساب والتاريخ قبل الحفظ.");
});
document.addEventListener("click",async e=>{
 const button=e.target?.closest?.("[data-repair]");if(!button)return;
 const action=button.dataset.repair;
 if(action==="voice")startVoice();
 if(action==="native-ocr"){
  if(!nativeAction("receipt-ocr","ocr-receipt"))
   C.toast("اختيار الصورة متاح من حقل الصورة في المتصفح.");
 }
 if(action==="open-import"){C.goto("import");return;}
 if(action==="native-camera"){
  if(!nativeAction("receipt-camera","receipt-camera"))
   C.toast("الكاميرا الأصلية متاحة فقط على Android الجديد؛ يمكنك استخدام كاميرا Chrome.");
 }
 if(action==="export-ocr"){
  const content=el("flosyRepairOCRText")?.value||lastReceiptText;
  if(!content.trim())return C.toast("استخرج نص الإيصال أو اكتبه أولًا.");
  if(nativeAction("receipt-export","",content)){
   status("flosyOcrStatus","اختر مكانًا لحفظ ملف نص الإيصال من نافذة Android.");return;
  }
  const blob=new Blob([content],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="Flosy_Receipt_"+new Date().toISOString().slice(0,10)+".txt";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  status("flosyOcrStatus","تم تجهيز ملف الإيصال. تأكد من ظهوره ضمن التنزيلات.");
 }
 if(action==="copy-ocr"){
  const content=el("flosyRepairOCRText")?.value||"";
  if(!content)return C.toast("لا يوجد نص من الإيصال لنسخه");
  try{await navigator.clipboard.writeText(content);C.toast("تم نسخ نص الإيصال — لا تشاركه إن كان يحتوي بيانات حساسة");}
  catch{C.toast("حدد النص وانسخه يدويًا")}
 }
});
w.FLOSY_REPAIR={render,scanReceipt,startVoice,receiveNativeReceipt,receiveNativeReceiptImage,proposeReceipt,nativeVoiceError,nativeVoiceResult,nativeVoiceStatus,nativeAction};
render();
})(window);
