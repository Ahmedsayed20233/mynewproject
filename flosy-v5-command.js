/* Flosy Pearl 2026 — all-white design, Egyptian market.
   Static local summaries; no network requests and no additional financial storage. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id);
const money=value=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(value)||0)+" ج.م";
function render(){
 const root=E("flosyV5Command");if(!root)return;
 let safe=null,reminders=[],sync={status:"تسجيل الدخول مطلوب",dirty:true};
 try{safe=w.FLOSY_PHASE1?.calculate?.()||null}catch{}
 try{reminders=w.FLOSY_REMINDERS?.upcoming?.()||[]}catch{}
 try{sync=w.FLOSY_SYNC_V3?.getStatus?.()||sync}catch{}
 const isLoggedIn=!!C.getSession()?.user;
 const online=navigator.onLine!==false;
 const actuallySynced=isLoggedIn&&sync.status==="متزامن"&&!sync.dirty;
 const indicator=!online?"غير متصل — البيانات محفوظة على الجهاز":
    !isLoggedIn?"لم تُفعّل المزامنة السحابية":
    actuallySynced?"تمت المزامنة — إصدار "+(Number(sync.revision)||0):
    "تغييرات تنتظر التأكيد من السحابة";
 const dot=actuallySynced?"ok":!online?"warn":"attention";
 const upcoming=reminders.filter(x=>x.days<=7&&!x.paid&&!x.linked);
 const urgent=upcoming.filter(x=>x.days<=2);
 const days=safe?.days||"—";
 root.innerHTML='<section class="v5-command" aria-label="ملخص فلوسي اليوم">'+
 '<div class="v5-command-main"><div class="v5-overline"><span class="v5-spark">✳</span> FLOSY PEARL <span class="v5-locality">مصمم لمصاريف الحياة في مصر</span></div>'+
 '<h2>فلوسك واضحة. <span>قراراتك أهدى.</span></h2>'+
 '<p>خطة يومك المالية مبنية على معاملاتك المسجلة — بدون تخمين رصيد البنك أو استثماراتك.</p>'+
 '<div class="v5-primarystat"><small>متاح إضافي آمن للصرف اليوم</small>'+
 '<strong class="v4-sensitive" data-money>'+money(safe?.daily||0)+'</strong>'+
 '<span>تقدير حتى موعد القبض خلال '+days+' يوم · بعد الالتزامات وهامش الأمان</span></div>'+
 '<div class="v5-command-actions">'+
 '<button type="button" class="v5-action primary" data-v5-go="v4-capture">＋ سجل مصروف</button>'+
 '<button type="button" class="v5-action" data-v5-go="phase1">راجع خطتك</button>'+
 '<button type="button" class="v5-action" data-v5-go="v4-bank">استيراد كشف بنك</button>'+
 '</div></div>'+
 '<div class="v5-command-aside">'+
 '<div class="v5-trust '+dot+'"><span class="v5-status-dot"></span><div><b>'+indicator+'</b>'+
 '<small>'+(actuallySynced?"قبل حذف التطبيق راجع الاسترجاع أيضًا":"صدّر JSON قبل حذف التطبيق، وسجّل الدخول ثم تأكد من حالة المزامنة")+'</small></div></div>'+
 '<div class="v5-aside-tile"><div><small>التزامات عاجلة</small><b>'+urgent.length+'</b></div><p>'+(upcoming.length?"هناك "+upcoming.length+" استحقاقات خلال أسبوع":"لا توجد استحقاقات قريبة مسجلة")+'</p>'+
 '<button type="button" data-v5-go="phase1">اعرض المواعيد ←</button></div>'+
 '<div class="v5-aside-tile pale"><div><small>حماية البيانات</small><b>نسخ واسترجاع</b></div><p>لا تعتبر المزامنة ضمانًا إلا بعد التحقق من جهاز جديد.</p>'+
 '<button type="button" data-v5-go="v4-privacy">مركز الخصوصية ←</button></div>'+
 '</div></section>';
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-v5-go]");if(!b)return;
 const page=b.dataset.v5Go;
 if(["v4-capture","v4-bank","v4-privacy","phase1","v4-wealth","v4-crisis"].includes(page))C.goto(page);
});
w.FLOSY_V5_COMMAND={render};
render();
})(window);
