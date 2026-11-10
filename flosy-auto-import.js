/* Flosy Auto Import 2.8 — hidden in Standard and Safe Import variants.
 * The native Play-reviewed variant alone exposes this opt-in UI.
 * No SMS or notification data leaves the phone before user-approved ledger entry.
 */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
let consent=false,status=null,message="",count=0;
function available(){return w.FLOSY_NATIVE_AUTO_IMPORT_AVAILABLE===true}
function send(action,extra={}){
 if(!available()||!w.FlosyNative||typeof w.FlosyNative.postMessage!=="function"){
   message="هذا الإجراء يحتاج إصدار Android الذي اجتاز مراجعة Google Play.";render();return false;
 }
 try{w.FlosyNative.postMessage(JSON.stringify({action,...extra}));return true}
 catch(err){message="تعذر الاتصال بخدمة Android.";render();return false}
}
function render(){
 const root=el("flosyAutoImportRoot");if(!root)return;
 if(!available()){root.innerHTML="";return}
 const s=status||{},running=s.enabled===true,blocked=s.smsGranted!==true;
 root.innerHTML='<section class="flosy-auto-panel" aria-label="الاستيراد التلقائي للمعاملات المالية">'+
 '<div class="flosy-auto-head"><div><span class="flosy-auto-label">FLOSY · AUTOMATIC IMPORT</span>'+
 '<h2>استيراد مالي تلقائي بإذنك</h2><p>استقبال معاملات SMS والإشعارات المالية التي تسمح بها. لا نقرأ رسائلك الشخصية أو نخزن رموز التحقق.</p></div>'+
 '<span class="flosy-auto-state">'+(running?"مفعّل":"متوقف")+'</span></div>'+
 '<div class="flosy-auto-warning"><strong>تنبيه الصلاحيات</strong><p>'+
 'قد يمنح Android التطبيق وصولًا واسعًا إلى صندوق SMS والإشعارات؛ يقيّد Flosy معالجتها بالمرسلين والتطبيقات التي تختارها، ويحتفظ بمرشحات المعاملات محليًا ومشفرة حتى 30 يومًا. لا يرفع الرسائل أو الإشعارات إلى OpenAI أو Supabase. التفعيل اختياري ويمكن إيقافه.</p></div>'+
 '<div class="flosy-auto-grid"><label>معرّفات مرسلي البنوك المسموح بها (مفصولة بفاصلة)'+
 '<textarea id="flosyAutoSenders" rows="2" maxlength="600" placeholder="مثال توضيحي فقط: CIB, NBE, QNB">'+esc(s.senders||"")+'</textarea>'+
 '<small>اكتب أسماء المرسلين كما تظهر على رسائل بنكك. لن يفحص Flosy رسائل مرسل غير موجود هنا.</small></label>'+
 '<label>تطبيقات مالية إضافية تختارها (Package IDs)'+
 '<input id="flosyAutoPackages" maxlength="600" placeholder="مثال: com.example.bank" value="'+esc(s.apps||"")+'">'+
 '<small>InstaPay Egypt مدعوم تلقائيًا عند موافقتك، ولا تحتاج كتابة معرّفه.</small></label></div>'+
 '<div class="flosy-auto-buttons"><button type="button" data-auto-action="configure" class="flosy-auto-secondary">حفظ مصادر الاستيراد</button></div>'+
 '<label class="flosy-auto-consent"><input id="flosyAutoConsent" type="checkbox" '+(consent?"checked":"")+'>'+
 '<span>أقر بأن هذا هاتفي أو أنني مخوّل بإدارة هذه البيانات. أوافق على استقبال معاملات مالية من المصادر المحددة فقط ووضعها في قائمة مراجعة محلية مشفّرة. يمكنني الإيقاف ومسح المرشحات في أي وقت.</span></label>'+
 '<div class="flosy-auto-buttons"><button type="button" data-auto-action="'+(running?"disable":"enable")+'" class="'+(running?"flosy-auto-danger":"flosy-auto-primary")+'">'+
 (running?"إيقاف الاستيراد ومسح قائمة الانتظار":"تفعيل الاستيراد التلقائي بإذني")+'</button>'+
 '<button type="button" data-auto-action="notification" class="flosy-auto-secondary">إعداد إذن إشعارات InstaPay</button></div>'+
 '<div class="flosy-auto-status"><strong>حالة الهاتف</strong><div>'+
 '<span>قراءة SMS: '+(s.smsGranted?"مسموح":"غير مسموح")+'</span>'+
 '<span>الوصول للإشعارات: '+(s.notificationGranted?"مسموح":"غير مسموح")+'</span>'+
 '<span>معاملات في انتظار المراجعة: '+Number(s.pending||0)+'</span></div>'+
 (blocked&&running?'<p>للمزامنة من SMS يجب إكمال طلب إذن Android. يمكن لإشعارات InstaPay أن تعمل باستقلالية إذا منحت إذنها.</p>':"")+'</div>'+
 '<div class="flosy-auto-buttons"><button type="button" data-auto-action="history" class="flosy-auto-secondary">فحص رسائل آخر 30 يومًا</button>'+
 '<button type="button" data-auto-action="pending" class="flosy-auto-primary">عرض المعاملات المكتشفة للمراجعة</button>'+
 '<button type="button" data-auto-action="clear" class="flosy-auto-secondary">مسح قائمة الانتظار فقط</button></div>'+
 (message?'<p role="status" class="flosy-auto-feedback">'+esc(message)+'</p>':"")+
 '<p class="flosy-auto-small">تظل المعاملات المكتشفة مجرد مقترحات، ولا تتغير أرصدتك حتى تؤكد عملية الحفظ داخل Flosy. توقف خدمة التطبيق أو إغلاق أذونات Android قد يمنع استقبال بعض الإشعارات.</p>'+
 '</section>';
}
function nativeStatus(s){
 if(!s||typeof s!=="object")return;
 status={enabled:!!s.enabled,smsGranted:!!s.smsGranted,notificationGranted:!!s.notificationGranted,
 senders:String(s.senders||"").slice(0,600),apps:String(s.apps||"").slice(0,600),pending:Math.max(0,Number(s.pending)||0)};
 render();
}
function nativeQueue(items){
 const safe=Array.isArray(items)?items.slice(0,60)
   .filter(x=>x&&typeof x.text==="string"&&x.text.length<=650&&
     (x.source==="sms"||x.source==="instapay"||x.source==="bank_notification")&&Number.isFinite(Number(x.date))):[];
 count=safe.length;message=safe.length?
  "تم تحميل "+safe.length+" معاملة محتملة. راجع كل واحدة قبل الحفظ.":
  "لا توجد معاملات مالية معلقة في قائمة المراجعة.";
 if(safe.length && w.FLOSY_NEXT?.receiveScannedSMS)
   w.FLOSY_NEXT.receiveScannedSMS(safe);
 render();
}
function ack(id){
 if(typeof id!=="string"||!/^[0-9a-f]{32}$/.test(id))return false;
 return send("auto-dismiss",{id});
}
document.addEventListener("change",e=>{
 if(e.target?.id==="flosyAutoConsent")consent=Boolean(e.target.checked);
});
document.addEventListener("click",e=>{
 const b=e.target?.closest?.("[data-auto-action]");if(!b)return;
 const act=b.dataset.autoAction;
 if(act==="enable"){
  if(!consent){message="لازم تختار الموافقة الصريحة أولًا.";render();return}
  // Explicitly save allowlists before requesting native Android permission.
  send("auto-configure",{senders:String(el("flosyAutoSenders")?.value||""),
    apps:String(el("flosyAutoPackages")?.value||"")});
  send("auto-enable");return;
 }
 if(act==="configure"){
  send("auto-configure",{senders:String(el("flosyAutoSenders")?.value||""),
    apps:String(el("flosyAutoPackages")?.value||"")});
  message="تم إرسال المصادر المختارة إلى الهاتف.";render();return;
 }
 if(act==="disable"){consent=false;send("auto-disable");message="تم طلب إيقاف الاستيراد ومسح المرشحات المحفوظة.";return}
 if(act==="notification")send("auto-notification-settings");
 if(act==="history")send("auto-scan-existing");
 if(act==="pending")send("auto-pending");
 if(act==="clear")send("auto-clear");
});
w.FLOSY_AUTO_IMPORT={render,nativeStatus,nativeQueue,ack};
render();
})(window);
