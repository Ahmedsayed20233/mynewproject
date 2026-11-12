/* Flosy Aurora: refined mobile-first UI and optional Android reminders.
   Does not parse, read or import SMS or banking notifications.
   All reminder content stays on the user's device. */
(function(w,d){
 "use strict";
 const ID="flosyAuroraIntro",STATUS="flosy-aurora-status";
 const q=(selector)=>d.querySelector(selector);
 const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 let installed=false,lastSync="",lastStatus={enabled:false,permission:"unknown",scheduled:0};
 const nativeReady=()=>w.FLOSY_MVP_NO_MESSAGE_IMPORT===true &&
   w.FLOSY_NATIVE_BRIDGE_AVAILABLE===true &&
   !!w.FlosyNative && typeof w.FlosyNative.postMessage==="function";
 function send(action,fields={}){
  if(!nativeReady())return false;
  try{w.FlosyNative.postMessage(JSON.stringify({action,...fields}));return true}catch{return false}
 }
 function intro(){
  const target=q("#page-dashboard");if(!target||d.getElementById(ID))return;
  const div=d.createElement("section");
  div.id=ID;div.className="flosy-aurora-intro";
  div.setAttribute("aria-label","اختصارات فلوسي");
  div.innerHTML='<span>✦ Flosy Aurora · تنظيم أموالك بكل بساطة</span>'+
   '<h2>فلوسك أوضح. قراراتك أذكى.</h2>'+
   '<p>تابع المتاح للصرف، سجّل مصروفك، واعرف ما الذي تغيّر في ميزانيتك.</p>'+
   '<div class="flosy-aurora-quick">'+
   '<button type="button" data-go="v4-capture">🎙 إدخال ذكي</button>'+
   '<button type="button" data-go="wealth">◈ حساباتي</button>'+
   '<button type="button" data-go="ai">✦ اسأل فلوسي</button>'+
   '</div>';
  target.insertBefore(div,target.firstChild);
 }
 function due(){
  try{
   const a=w.FLOSY_REMINDERS?.upcoming?.();
   if(!Array.isArray(a))return[];
   return a.filter(x=>x&&!x.paid&&!x.linked && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date)))
    .slice(0,12).map(x=>({id:String(x.key||x.date).slice(0,90),
       date:x.date,kind:"bill"}));
  }catch{return[]}
 }
 function sync(force=false){
  if(!nativeReady())return;
  const bills=due();
  const json=JSON.stringify(bills);
  if(!force&&json===lastSync)return;
  if(send("notifications-sync",{items:bills}))lastSync=json;
 }
 function statusLabel(){
  if(lastStatus.permission==="denied")return "إذن الإشعارات مرفوض من Android";
  if(!lastStatus.enabled)return "الإشعارات متوقفة — فعّلها باختيارك";
  if(lastStatus.permission!=="granted")return "فعّل إذن الإشعارات من الهاتف";
  return "مفعّلة · "+(Number(lastStatus.scheduled)||0)+" تنبيه مجدول";
 }
 function notifyCard(){
  return '<div class="flosy-aurora-notifications v4-surface" data-aurora-notify-root>'+
   '<div class="flosy-notify-header"><div><h3>🔔 تنبيهات فلوسي الذكية</h3>'+
   '<p>فواتيرك وأقساطك القريبة: تنبيهات محلية على هاتفك حتى بعد إغلاق التطبيق، '+
   'بحسب إعدادات توفير البطارية وAndroid. لا تحتوي الإشعارات على مبالغ أو أرقام حسابات.</p></div>'+
   '<div class="flosy-notify-bell" aria-hidden="true">🔔</div></div>'+
   '<div role="status" class="flosy-notify-state" data-state="'+esc(lastStatus.permission)+'" '+
   'data-faurora-status>'+esc(statusLabel())+'</div>'+
   '<div class="flosy-notify-actions">'+
   '<button type="button" data-faurora-action="enable">تفعيل التنبيهات</button>'+
   '<button type="button" data-faurora-action="sync">تحديث المواعيد</button>'+
   '<button type="button" data-faurora-action="test">إشعار تجريبي</button>'+
   '<button type="button" data-faurora-action="stop">إيقاف</button>'+
   '</div></div>'
 }
 function notifications(){
  if(!nativeReady())return;
  for(const page of ["#page-settings","#page-recurring"]){
   const root=q(page);if(!root||root.querySelector("[data-aurora-notify-root]"))continue;
   const wrap=d.createElement("div");
   wrap.innerHTML=notifyCard();root.insertBefore(wrap.firstElementChild,root.firstChild);
  }
 }
 function onNativeStatus(x){
  if(!x||typeof x!=="object")return;
  lastStatus={
   enabled:x.enabled===true,permission:String(x.permission||"unknown"),
   scheduled:Math.max(0,Math.min(24,Number(x.scheduled)||0))
  };
  d.querySelectorAll("[data-faurora-status]").forEach(n=>{
   n.textContent=statusLabel();n.dataset.state=lastStatus.permission;
  });
 }
 function boot(){
  intro();if(!nativeReady())return;
  notifications();send("notifications-status");sync(true);
  if(!installed){
   installed=true;
   w.setInterval(()=>{if(!d.hidden)sync()},120000);
  }
 }
 d.addEventListener("click",e=>{
  const b=e.target.closest("[data-faurora-action]");
  if(!b||!nativeReady())return;
  const a=b.dataset.fauroraAction;
  if(a==="enable")send("notifications-enable");
  if(a==="test")send("notifications-test");
  if(a==="stop")send("notifications-stop");
  if(a==="sync")sync(true);
 });
 d.addEventListener("submit",()=>{if(nativeReady())w.setTimeout(()=>sync(true),700)});
 d.addEventListener("visibilitychange",()=>{if(!d.hidden&&nativeReady()){send("notifications-status");sync(true)}});
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",intro,{once:true});
 else intro();
 w.FLOSY_AURORA={boot,sync,onNativeStatus};
})(window,document);
