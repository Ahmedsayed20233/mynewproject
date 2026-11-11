/* Flosy 2.9 — free locally paired Automate-to-Flosy financial event relay.
   Shown only in the installed safe Android wrapper. No SMS or notification
   permissions are requested by Flosy. Automate from official Google Play
   receives selected events with permissions controlled by the user.
   Pair token never stored in website localStorage, IndexedDB or cloud. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const byId=id=>document.getElementById(id);
const escapeHTML=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const officialApp="com.egyptianbanks.instapay";
const ACTION="com.flosy.finance.REVIEW_EXTERNAL_FINANCIAL_EVENT";
const RECEIVER="com.flosy.finance.AutoRelayReceiver";
let info=null,temporaryToken="",message="",confirmed=false;
function enabled(){return w.FLOSY_NATIVE_RELAY_AVAILABLE===true}
function send(action,extra={}){
 if(!enabled()||!w.FlosyNative||typeof w.FlosyNative.postMessage!=="function"){
  message="ميزة الاقتران متاحة من Flosy Android 2.9 فقط، وليس الموقع العادي.";
  render();return false;
 }
 try{w.FlosyNative.postMessage(JSON.stringify({action,...extra}));return true}
 catch(err){message="تعذر الاتصال ببرنامج Android.";render();return false}
}
function render(){
 const root=byId("flosyAutomateRelayRoot");if(!root)return;
 if(!enabled()){root.innerHTML="";return}
 const s=info||{},pkg=s.packageName||"com.flosy.finance",paired=s.paired===true;
 root.innerHTML='<section class="f29-panel"><div class="f29-head"><div><span class="f29-overline">FLOSY • LOCAL AUTOMATION</span>'+
 '<h2>استيراد تلقائي مجاني — من هاتفك لفلوسي</h2><p>اربط Automate من Google Play مع Flosy من غير مفتاح API أو حساب مطوّر أو تعطيل Play Protect.</p></div>'+
 '<span class="f29-pill">'+(paired?"متصل محليًا":"غير مقترن")+'</span></div>'+
 '<div class="f29-disclosure"><strong>كيف يعمل؟</strong><p>Automate هو التطبيق الذي يقرأ SMS أو إشعارات التطبيقات التي تسمح بها في Android. Flosy لا يحصل على صلاحية قراءة صندوق رسائلك؛ يستقبل فقط أحداثًا محددة برمز سري ويضعها في قائمة مشفّرة للمراجعة. استخدام Automate يتطلب منحه الصلاحيات التي تختارها، وهو تطبيق خارجي.</p></div>'+
 '<div class="f29-grid">'+
 '<div class="f29-step"><span class="f29-num">01</span><h3>ثبّت Automate مجانًا</h3>'+
 '<p>نزّله من Google Play. النسخة المجانية تسمح حتى 30 بلوك تشغيل — كافية للتدفقين المطلوبين.</p>'+
 '<a class="f29-link" href="https://play.google.com/store/apps/details?id=com.llamalab.automate" target="_blank" rel="noopener noreferrer">تثبيت Automate من Google Play</a></div>'+
 '<div class="f29-step"><span class="f29-num">02</span><h3>حدّد المصادر الموثوقة</h3>'+
 '<label>معرّفات مرسلي SMS عندك (كما تظهر فعليًا)<input id="flosyRelaySenders" value="'+escapeHTML(s.senders||"")+
 '" maxlength="400" placeholder="مثال توضيحي: CIB,NBE" /></label>'+
 '<label>حزم تطبيقات بنوك إضافية اختيارية<input id="flosyRelayApps" value="'+escapeHTML(s.apps||"")+
 '" maxlength="400" placeholder="com.example.bank" /></label>'+
 '<button type="button" class="f29-secondary" data-f29="configure">حفظ المصادر</button></div>'+
 '<div class="f29-step"><span class="f29-num">03</span><h3>اقرن Automate بفلوسي</h3>'+
 '<p>اضغط إنشاء الرمز ثم انسخه والصقه في تدفّق Automate على هاتفك فقط. لا ترسله لأحد.</p>'+
 '<button type="button" class="f29-primary" data-f29="pair">إنشاء رمز اقتران محلي</button>'+
 (temporaryToken?'<div class="f29-token"><code id="flosyRelayToken">'+escapeHTML(temporaryToken)+'</code>'+
 '<button type="button" class="f29-secondary" data-f29="copy">نسخ الرمز</button></div>':
 '<p class="f29-small">الرمز سيظهر مرة واحدة بعد تأكيد Android؛ إنشاء رمز جديد يلغي القديم.</p>')+
 '</div>'+
 '<div class="f29-step"><span class="f29-num">04</span><h3>أنشئ تدفّقَي Automate</h3>'+
 '<p>SMS received → Broadcast send → SMS received. وNotification posted → Broadcast send → Notification posted.</p>'+
 '<div class="f29-instructions"><span>Package</span><code>'+escapeHTML(pkg)+'</code>'+
 '<span>Receiver class</span><code>'+RECEIVER+'</code>'+
 '<span>Action</span><code>'+ACTION+'</code></div>'+
 '<p class="f29-small">في Extras أضف: <code>token</code>، <code>source</code>، <code>sender</code>، <code>text</code>. قيمة source للرسالة <code>sms</code> وللإشعار <code>notification</code>. اكتب رقم أو اسم المرسل الحقيقي في sender، وPackage اسم InstaPay هو <code>'+officialApp+'</code>.</p></div>'+
 '</div>'+
 '<div class="f29-controls"><strong>الحالة والمرشحات</strong><p>'+
 (paired?"تم إنشاء اقتران على الهاتف":"فعّل الاقتران لإنشاء قناة مشفّرة")+
 ' • في الانتظار: '+Number(s.pending||0)+' • Flosy لا يحفظ معاملات تلقائيًا</p>'+
 '<div class="f29-buttons"><button class="f29-primary" type="button" data-f29="pending">عرض المعاملات المكتشفة</button>'+
 '<button class="f29-secondary" type="button" data-f29="refresh">تحديث الحالة</button>'+
 '<button class="f29-secondary" type="button" data-f29="clear">مسح المرشحات</button>'+
 '<button class="f29-danger" type="button" data-f29="stop">إلغاء الاقتران والتوقف</button></div></div>'+
 (message?'<p class="f29-feedback" role="status">'+escapeHTML(message)+'</p>':"")+
 '<p class="f29-small">الاستيراد التلقائي يلتقط الرسائل الجديدة بعد بدء التدفقات، لا سجل SMS القديم. لا تنس ضبط البطارية لـAutomate كي لا يوقفه نظام الهاتف. المراجعة داخل Flosy إلزامية قبل إضافة المصروف أو الدخل.</p></section>';
}
function nativeStatus(s){
 if(!s||typeof s!=="object")return;
 info={paired:!!s.paired,senders:String(s.senders||"").slice(0,400),
 apps:String(s.apps||"").slice(0,400),pending:Number(s.pending)||0,
 packageName:String(s.packageName||"com.flosy.finance").slice(0,100)};
 render();
}
function nativePair(result){
 const token=String(result?.token||"");
 if(!/^[a-f0-9]{48}$/.test(token)){message="فشل إنشاء رمز الاقتران. حاول مرة ثانية.";render();return}
 temporaryToken=token;
 message="رمز الاقتران جاهز. انسخه إلى تدفق Automate ولا تشاركه مع أي شخص.";
 render();
}
function nativePending(data){
 const items=Array.isArray(data?.items)?data.items.filter(x=>x&&
  /^[0-9a-f]{32}$/.test(String(x.id||""))&&
  ["sms","instapay","bank_notification"].includes(x.source)&&
  typeof x.text==="string"&&x.text.length<=650&&Number.isFinite(Number(x.date))).slice(0,60):[];
 message=items.length?"تم عرض "+items.length+" مرشحات داخل مركز استيراد المعاملات. راجع كل عملية.":
 "لا توجد رسائل مالية معلقة.";
 if(items.length && w.FLOSY_NEXT?.receiveScannedSMS){
  w.FLOSY_NEXT.receiveScannedSMS(items);
  C.goto("import");
 }
 render();
}
async function copyToken(){
 if(!temporaryToken)return;
 try{
  await navigator.clipboard.writeText(temporaryToken);
  message="تم نسخ الرمز؛ الصقه داخل Automate فقط.";
 }catch{
  const input=document.createElement("textarea");
  input.value=temporaryToken;
  document.body.appendChild(input);input.select();
  try{document.execCommand("copy");message="تم نسخ الرمز."}
  catch{message="حدد الرمز بالأعلى وانسخه يدويًا."}
  input.remove();
 }
 render();
}
function ack(id){
 return /^[0-9a-f]{32}$/.test(String(id||"")) && send("relay-dismiss",{id});
}
document.addEventListener("click",event=>{
 const btn=event.target?.closest?.("[data-f29]");if(!btn)return;
 const act=btn.dataset.f29;
 if(act==="pair"){send("relay-pair");return}
 if(act==="copy"){copyToken();return}
 if(act==="configure"){
  send("relay-configure",{senders:String(byId("flosyRelaySenders")?.value||""),
   apps:String(byId("flosyRelayApps")?.value||"")});
  message="تم إرسال قائمة المرسلين والتطبيقات المسموح بها إلى الهاتف.";render();return;
 }
 if(act==="pending")return send("relay-pending");
 if(act==="refresh")return send("relay-status");
 if(act==="clear")return send("relay-clear");
 if(act==="stop"){
  temporaryToken="";
  if(send("relay-stop")){message="تم إلغاء الاقتران. أوقف تدفقات Automate أيضًا.";render()}
 }
});
w.FLOSY_AUTOMATE_RELAY={render,nativePair,nativeStatus,nativePending,ack};
render();
})(window);