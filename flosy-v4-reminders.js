/* Flosy: privacy-respecting due-date reminders while the site/app is open.
   No background push, no SMS access; notification permission is strictly opt-in. */
(function(w){
 "use strict";
 const C=w.FLOSY_BRIDGE;if(!C)return;
 const q=id=>document.getElementById(id);
 const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const format=x=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Number(x)||0);
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const dt=s=>new Date(s+"T12:00:00");
 const start=()=>new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
 let preference=localStorage.getItem("flosy_v4_reminders")||"off";
 // All calendar exports are user-initiated. No server or background access.
 function upcoming(){
  const api=w.FLOSY_PHASE1;if(!api)return[];
  const today=start(),due=new Date(today);due.setDate(due.getDate()+7);
  const earliest=new Date(today);earliest.setDate(earliest.getDate()-31);
  try{
   return api.occurrences(earliest,due)
    .filter(x=>!x.paid&&!x.linked&&x.date<=iso(due))
    .map(x=>({...x,days:Math.round((dt(x.date)-dt(iso(today)))/86400000)}))
    .sort((a,b)=>a.days-b.days||a.key.localeCompare(b.key))
    .slice(0,12);
  }catch{return[]}
 }
 function render(){
  const container=q("v4-reminders");if(!container)return;
  const bills=upcoming(),urgent=bills.filter(x=>x.days<=2);
  const rows=bills.slice(0,4).map(x=>
   '<div class="v4-reminder-row"><span class="v4-reminder-dot"></span><div><b>'+html(x.name)+'</b><small>'+
    (x.days<0?"متأخر "+Math.abs(x.days)+" يوم":x.days===0?"موعده النهارده":"خلال "+x.days+" يوم")+
    '</small></div><strong>'+format(x.amount)+' ج.م</strong></div>').join("");
  container.innerHTML='<div class="v4-surface v4-full v4-reminders">'+
   '<div class="v4-head"><h3>مواعيد لازم تتابعها</h3><span class="v4-pill">'+urgent.length+' عاجل · '+bills.length+' قادم</span></div>'+
   (rows||'<p class="v4-fineprint">مفيش فواتير أو أقساط قادمة مسجلة خلال الأسبوع.</p>')+
   '<div class="v4-reminder-footer"><button type="button" class="v4-btn secondary" data-v4-reminders="open">جدول الفواتير والأقساط</button>'+
   '<button type="button" class="v4-btn secondary" data-v4-reminders="toggle">'+
   (preference==="on"?"إيقاف تنبيهات المتصفح":"تفعيل تنبيهات المتصفح")+'</button>'+
   '<button type="button" class="v4-btn secondary" data-v4-reminders="calendar">تصدير مواعيد 90 يوم للتقويم</button></div>'+
   '<p class="v4-fineprint">التنبيهات تعمل عند فتح فلوسي فقط، وليست إشعارات مضمونة في الخلفية. لا نرسل قيم معاملاتك إلى خادم إشعارات.</p></div>';
 }
 async function toggle(){
  if(preference==="on"){
   preference="off";localStorage.setItem("flosy_v4_reminders",preference);render();return
  }
  if(!("Notification" in w)){C.toast("متصفحك لا يدعم إشعارات الويب. ستظل التنبيهات داخل التطبيق.");return}
  try{
   const result=await Notification.requestPermission();
   if(result!=="granted"){C.toast("لم يُمنح الإذن. التنبيهات داخل التطبيق تظل مفعلة.");return}
   preference="on";localStorage.setItem("flosy_v4_reminders","on");
   render();notify();
  }catch(e){C.toast("تعذر تفعيل إشعارات المتصفح: "+e.message)}
 }
 function notify(){
  if(preference!=="on"||!("Notification" in w)||Notification.permission!=="granted")return;
  const bills=upcoming().filter(x=>x.days>=-1&&x.days<=2);
  if(!bills.length)return;
  const day=iso(start()),key="flosy_v4_notified_"+day;
  try{
   if(sessionStorage.getItem(key))return;
   // No sensitive amounts, bank names or account numbers in lock-screen notification.
   new Notification("فلوسي — مواعيد مستحقة",{body:bills.length+" فواتير أو أقساط تحتاج مراجعتك قريبًا.",tag:"flosy-due-"+day});
   sessionStorage.setItem(key,"1");
  }catch(e){C.toast("الرسائل الداخلية متاحة، لكن إشعارات النظام غير مدعومة هنا.")}
 }
 // Standard iCalendar events can notify the user even when the web app is closed,
 // subject to calendar permissions/settings. No values or account names are exported.
 function calendarText(){
  const api=w.FLOSY_PHASE1;if(!api)return"";
  const today=start(),end=new Date(today);end.setDate(end.getDate()+90);
  const rows=api.occurrences(today,end).filter(x=>!x.paid&&!x.linked&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)).slice(0,300);
  if(!rows.length)return"";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Flosy//Egypt Due Dates//AR","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  const stamp=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  for(const x of rows){
   const day=x.date.replace(/-/g,"");
   const uid=encodeURIComponent(x.key).replace(/%/g,"x").slice(0,110);
   lines.push("BEGIN:VEVENT","UID:"+uid+"@flosy.local","DTSTAMP:"+stamp,
    "DTSTART;VALUE=DATE:"+day,"SUMMARY:Flosy - Financial due date",
    "DESCRIPTION:Open Flosy to review a scheduled payment. Nothing is paid automatically.",
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Flosy - Check upcoming payment",
    "TRIGGER:-P1D","END:VALARM","END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n")+"\r\n";
 }
 function exportCalendar(){
  const body=calendarText();
  if(!body)return C.toast("لا توجد استحقاقات قابلة للتصدير");
  try{
   const blob=new Blob([body],{type:"text/calendar;charset=utf-8"});
   const href=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=href;a.download="Flosy_Due_Dates_90_Days.ics";
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(href),3000);
   C.toast("تم تجهيز ملف تقويم. افتحه في تطبيق التقويم وراجع التنبيهات.");
  }catch{C.toast("افتح فلوسي من Chrome لتصدير التقويم؛ التنبيهات الداخلية متاحة دائمًا.")}
 }
 document.addEventListener("click",e=>{
  const b=e.target.closest("[data-v4-reminders]");if(!b)return;
  if(b.dataset.v4Reminders==="open")C.goto("phase1");
  if(b.dataset.v4Reminders==="toggle")toggle();
  if(b.dataset.v4Reminders==="calendar")exportCalendar();
 });
 w.FLOSY_REMINDERS={render,upcoming,notify,calendarText};
 render();if(preference==="on")notify();
})(window);
