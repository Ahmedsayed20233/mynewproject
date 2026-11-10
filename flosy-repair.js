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
 const host=el("flosyRepairRoot");
 if(!host)return;
 const nativeOCR=Boolean(w.FLOSY_NATIVE_OCR_AVAILABLE);
 host.innerHTML='<div class="v4-surface v4-full" style="margin-top:13px"><h3>🎙️ مساعدة التسجيل الصوتي ومسح الإيصالات</h3>'+
 '<p>ابدأ التسجيل من الزر بالأعلى. لو تعذّر التعرف الصوتي أو قراءة الصورة، استخدم المدخلات أدناه؛ لا تُحفظ أي معاملة إلا بعد موافقتك.</p>'+
 '<div class="v4-bento"><div class="v4-half"><p class="v4-fineprint" id="flosyVoiceStatus" role="status" aria-live="polite">جاهز لسماع كلامك بالمصري.</p>'+
 '<button class="v4-btn secondary" type="button" data-repair="voice">🎤 حاول التسجيل الصوتي</button>'+
 '</div><div class="v4-half"><p class="v4-fineprint" id="flosyOcrStatus" role="status" aria-live="polite">ارفع صورة واضحة، أو اختَر قراءة الصورة على Android.</p>'+
 (nativeOCR?'<button class="v4-btn secondary" type="button" data-repair="native-ocr">📷 قراءة صورة محفوظة على الهاتف (بدون شبكة)</button>':'')+
 '</div><div class="v4-full"><form id="flosyRepairOCRForm" class="v4-form">'+
 '<label class="full">نص الإيصال المستخرج — قابل للتعديل<textarea id="flosyRepairOCRText" name="ocrText" rows="4" maxlength="12000" placeholder="Cafe Campus&#10;Date: 10/11/2026&#10;Total: EGP 125.00">'+esc(lastReceiptText)+'</textarea></label>'+
 '<div class="v4-chips full"><button type="submit" class="v4-btn secondary">تحليل النص ومراجعة المعاملة</button>'+
 '<button type="button" class="v4-btn secondary" data-repair="copy-ocr">نسخ النص المستخرج</button></div></form></div></div>'+
 '<p class="v4-fineprint">Android OCR يتعرف على النص الإنجليزي/الأرقام محليًا باستخدام ML Kit، واللغة العربية تُعالج في المتصفح بواسطة Tesseract بعد تحميل نموذج اللغة. إذا تعذّر استخراج الإجمالي لا نخمّن رقمًا.</p></div>';
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
  C4.parseReview(suggested,"تم تحليل الإيصال باستخدام "+receiptEngine+". راجع التاجر والإجمالي والتاريخ والحساب ثم أكد الحفظ.");
  status("flosyOcrStatus","تم استخراج الإجمالي والتاريخ المقترح من الصورة؛ راجع البيانات أدناه.");
  return true;
 }catch(err){
  status("flosyOcrStatus","تم استخراج نص، لكن إجمالي الفاتورة غير مؤكد: "+err.message+" — صحح النص أدناه.");
  C.toast("راجع إجمالي الإيصال؛ لم يتم حفظ أي معاملة.");
  return false;
 }
}
function receiveNativeReceipt(text){return proposeReceipt(text,"Android ML Kit (Latin/EGP)")}
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
 if(!file||!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size<=0||file.size>8*1024*1024){
  C.toast("اختر صورة JPEG/PNG/WebP لا تتجاوز 8MB قبل المسح");return;
 }
 busyOCR=true;status("flosyOcrStatus","جاري تحميل نموذج OCR وقراءة النص محليًا؛ يمكن أن يستغرق أول تشغيل وقتًا.");
 let worker=null;
 try{
  const lib=await loadOCR();
  worker=await lib.createWorker(["ara","eng"]);
  const result=await worker.recognize(file);
  const text=String(result?.data?.text||"");
  if(!proposeReceipt(text,"Tesseract Arabic/English"))throw Error("تعذر تحديد إجمالي مؤكد؛ راجع النص يدويًا");
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
  status("flosyVoiceStatus","سيبدأ التعرف الصوتي من Android. قد يحتاج الهاتف لخدمة Speech Recognizer.");
  w.location.href="flosyapp://voice-expense";return;
 }
 const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
 if(!Speech){status("flosyVoiceStatus","المتصفح لا يدعم التسجيل المباشر. افتح Chrome مع إذن الميكروفون، أو اكتب الجملة.");C.toast("التعرف الصوتي غير مدعوم هنا؛ استخدم الإدخال النصي.");return}
 try{
  voice=new Speech();voice.lang="ar-EG";voice.interimResults=false;voice.continuous=false;voice.maxAlternatives=1;
  voice.onstart=()=>status("flosyVoiceStatus","🎤 الميكروفون مفتوح؛ اتكلم بالمصري...");
  voice.onresult=e=>{
   const spoken=e.results?.[0]?.[0]?.transcript||"";
   if(spoken){w.FLOSY_CAPTURE?.receiveNativeVoice(spoken);status("flosyVoiceStatus","تم تحويل الكلام إلى نص. راجع المعاملة المقترحة أدناه.")}
   else status("flosyVoiceStatus","لم يظهر نص واضح. جرب الكلام ببطء.");
  };
  voice.onerror=e=>{busyVoice=false;status("flosyVoiceStatus","خطأ في التسجيل: "+String(e.error||"unknown")+". راجع إذن الميكروفون وخدمة التعرف الصوتي.")};
  voice.onend=()=>{busyVoice=false;if(el("flosyVoiceStatus")?.textContent.includes("المفتوح"))status("flosyVoiceStatus","انتهى التسجيل؛ إن لم يظهر نص استخدم الإدخال المكتوب.")};
  busyVoice=true;voice.start();
 }catch(err){busyVoice=false;status("flosyVoiceStatus","تعذر بدء الميكروفون: "+String(err.message||err))}
}
document.addEventListener("submit",e=>{
 if(e.target?.id!=="flosyRepairOCRForm")return;
 e.preventDefault();proposeReceipt(String(new FormData(e.target).get("ocrText")||""),"manual text review");
});
document.addEventListener("click",async e=>{
 const button=e.target?.closest?.("[data-repair]");if(!button)return;
 const action=button.dataset.repair;
 if(action==="voice")startVoice();
 if(action==="native-ocr"){
  if(w.FLOSY_NATIVE_OCR_AVAILABLE)w.location.href="flosyapp://ocr-receipt";
  else C.toast("المسح المحلي متاح في إصدار Android الجديد.");
 }
 if(action==="copy-ocr"){
  const content=el("flosyRepairOCRText")?.value||"";
  if(!content)return C.toast("لا يوجد نص من الإيصال لنسخه");
  try{await navigator.clipboard.writeText(content);C.toast("تم نسخ نص الإيصال — لا تشاركه إن كان يحتوي بيانات حساسة");}
  catch{C.toast("حدد النص وانسخه يدويًا")}
 }
});
w.FLOSY_REPAIR={render,scanReceipt,startVoice,receiveNativeReceipt,proposeReceipt};
render();
})(window);
