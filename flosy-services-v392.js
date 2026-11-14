/* Flosy v3.9.2 — unified services and opt-in notification settings.
 * Works on all 20 screens and all four themes. No provider API connections. */
(function(w,d){"use strict";
 const Pages=w.FLOSY_UNIFIED_PAGES;
 if(!Pages)return;
 const original=Pages.render,api=()=>w.FLOSY_UNIFIED,esc=x=>api()?.esc?.(x)||String(x??"");
 const CP=()=>w.FLOSY_COPILOT;
 const icon=x=>'<i class="fa-solid '+x+'" aria-hidden="true"></i>';
 const map=w.FLOSY_SCREEN_MAP_V395;
 if(!map)throw Error("Flosy consolidated screen map missing");
 // The More tab contains SETTINGS ONLY. All main money spaces are accessible
 // from Home/navigation; detail routes use workflow tabs; advanced finance features
 // appear on their matching finance pages (not twice here).
 const items=map.more,subItems=map.details,advancedItems=map.advanced;
 let lastStatus=null;
 function quick(item){
  const [id,label,description,i,group,advanced]=item;
  const tier=advanced?"advanced":subItems.includes(item)?"detail":"primary";
  return '<button type="button" class="service-v392-item" data-service-'+tier+'="true" data-sgroup="'+group+'" '+
   (advanced?'data-flosy-feature="'+id+'" data-label="'+esc(label)+'"':
    'data-flosy-screen="'+id+'"')+'>'+
   '<span class="service-v392-icon">'+icon(i)+'</span><span class="service-v392-copy"><strong>'+
   esc(label)+'</strong><small>'+esc(description)+'</small></span>'+
   icon("fa-chevron-left")+'</button>';
 }
 function summary(){
  const s=api()?.state()||{},advice=CP()?.dailyAdvice?.(s,new Date())||{title:"نصيحة اليوم",message:"ابدأ بإضافة معاملاتك."};
  const n=CP()?.name?.(s)||"";
  return {advice,n};
 }
 function themeGrid(){
  return Object.entries(api().THEMES).map(([key,t])=>
   '<button class="service-v392-theme" type="button" data-theme-select="'+key+'" aria-pressed="'+
   (d.documentElement.dataset.theme===key)+'">'+
   '<span style="background:'+t.swatch+'" class="service-v392-swatch">'+icon("fa-check")+'</span>'+
   '<span>'+esc(t.label)+'</span></button>').join("");
 }
 function servicesHtml(){
  const {n}=summary();
  return '<div class="service-v392-root service-v395-more">'+
   '<header class="service-v392-hero"><div><small>FLOSY · SETTINGS</small>'+
    '<h2>المزيد والإعدادات</h2>'+
    '<p>'+(n?'يا '+esc(n)+'، ':'')+
    'هنا إدارة حسابك وبياناتك وتفضيلاتك فقط. العمليات والديون والتقارير في أقسامها الأصلية.</p></div></header>'+
   '<h3 class="service-v395-title">إدارة التطبيق والبيانات</h3>'+
   '<div id="servicesV392Grid" class="service-v392-grid" aria-label="إعدادات فلوسي">'+
    items.map(quick).join("")+'</div>'+
   '<p id="servicesV392Count" class="service-v392-count" role="status">'+
    items.length+' إعدادات أساسية، بدون تكرار الشاشات المالية.</p>'+
   '<details class="service-v392-fold" id="flosyMorePreferences"><summary>'+icon("fa-palette")+
    ' المظهر والثيمات <span>اختيار شخصي</span></summary>'+
    '<div class="service-v392-themes">'+themeGrid()+'</div></details>'+
   '<details class="service-v392-fold" id="flosyMoreNotifications"><summary>'+icon("fa-bell")+
    ' الإشعارات والتذكيرات <span>تحتاج إذنك</span></summary>'+
    '<div class="service-v392-notify"><div id="flosyNotificationStatus" class="service-v392-status" role="status">لم تُطلب حالة الإشعارات بعد.</div>'+
    '<button class="flosy-btn" type="button" data-notify-action="enable">'+icon("fa-bell")+' تفعيل إشعارات الأقساط</button>'+
    '<button class="flosy-btn flosy-btn-secondary" type="button" data-notify-action="daily">'+icon("fa-sun")+' اقتراح يومي 9 صباحًا</button>'+
    '<button class="flosy-btn flosy-btn-secondary" type="button" data-notify-action="stop">إيقاف الإشعارات</button>'+
    '<small>إشعارات Android محلية ولا تعرض تفاصيل بنكية على شاشة القفل. نظام الهاتف قد يؤخرها؛ لا توجد إشعارات ويب مضمونة في الخلفية.</small></div></details>'+
   '<details class="service-v392-fold" id="flosyMoreProfile"><summary>'+icon("fa-id-card")+
    ' معلوماتي والتسجيل السريع <span>الاسم والحساب الافتراضي</span></summary>'+
    '<form id="flosyFirstNameForm" class="service-v392-name"><label>الاسم الأول'+
    '<input class="flosy-input" name="firstName" maxlength="24" autocomplete="given-name" value="'+esc(n)+'" placeholder="مثال: أحمد" required></label>'+
    '<button class="flosy-btn" type="submit">حفظ الاسم</button></form>'+
    '<label class="flosy-field">الحساب الافتراضي للإدخال السريع<select class="flosy-input" id="flosyDefaultAccount">'+
     '<option value="">اختر حسابًا</option>'+
     (api()?.accounts()||[]).map(a=>'<option value="'+esc(a.id)+'"'+
      (api().defaultAccount()===a.id?' selected':'')+'>'+esc(a.name)+'</option>').join("")+
    '</select></label></details></div>';
 }
 function dailyHome(){
  const {advice}=summary();
  return '<section class="service-v392-home-tip"><span>'+icon("fa-lightbulb")+'</span><div><strong>'+
   esc(advice.title)+'</strong><p>'+esc(advice.message)+'</p></div>'+
   '<button type="button" data-flosy-screen="8">اسأل AI</button></section>';
 }
 function nativeStatus(s){
  lastStatus=s||{};
  const x=d.getElementById("flosyNotificationStatus");
  if(!x)return;
  x.textContent=(s.enabled?"الإشعارات مفعّلة":"الإشعارات متوقفة")+
   " · الإذن: "+(s.permission==="granted"?"مسموح":"غير مسموح")+
   " · النصيحة اليومية: "+(s.dailyEnabled?"مفعّلة":"غير مفعّلة");
 }
 function askPermission(action){
  if(api().bridge(action))return;
  const status=d.getElementById("flosyNotificationStatus");
  if(status)status.textContent="إشعارات الأقساط والنصيحة اليومية في الخلفية متاحة من نسخة Android.";
 }
 function bind(el){
  // Four distinct settings, no duplicated dashboard/AI/receipt/plan search catalog.
  el.querySelectorAll("[data-notify-action]").forEach(btn=>btn.onclick=()=>{
   const action=btn.dataset.notifyAction;
   if(action==="enable")askPermission("notifications-enable");
   else if(action==="daily")askPermission("notifications-daily-enable");
   else if(action==="test")askPermission("notifications-test");
   else if(action==="stop")askPermission("notifications-stop");
  });
  el.querySelector("#flosyFirstNameForm").onsubmit=e=>{
   e.preventDefault();
   const val=String(new FormData(e.target).get("firstName")||"").trim();
   const first=CP()?.name?.({settings:{flosyFirstName:val}})||"";
   if(!first){api().notify("اكتب اسم أول صحيح");return}
   api().core().FLOSY_BRIDGE.mutate(s=>{
    s.settings=s.settings||{};s.settings.flosyFirstName=first;
   });
   api().notify("يا "+first+"، هتوصلك نصائح شخصية داخل فلوسي.");
   api().bridge("notifications-daily-name",{name:first});
   api().renderAll();
  };
  el.querySelector("#flosyDefaultAccount").onchange=e=>{
   if(api().setDefaultAccount(e.target.value))api().notify("اتحفظ الحساب الافتراضي");
  };
  api().bridge("notifications-daily-name",{name:CP()?.name?.(api().state())||""});
  if(lastStatus)nativeStatus(lastStatus);else api().bridge("notifications-status");
 }
 let openMoreFolders=[];
 Pages.render=function(id){
  if(id===16){
   const prior=d.querySelector('.phone-frame[data-screen="16"] .service-v392-root');
   if(prior)openMoreFolders=[...prior.querySelectorAll("details[open]")].map(x=>x.id).filter(Boolean);
  }
  original(id);
  const host=d.querySelector('.phone-frame[data-screen="'+id+'"] .flosy-real');
  if(!host)return;
  if(id===16){
   host.innerHTML=servicesHtml();
   for(const id of openMoreFolders){const details=host.querySelector("#"+id);if(details)details.open=true}
   bind(host);
  }
  if(id===2){
   host.querySelector(".service-v392-home-tip")?.remove();
   const root=host.querySelector(".hero-card");
   if(root)root.insertAdjacentHTML("afterend",dailyHome());
  }
 };
 w.FLOSY_NOTIFY_V392={nativeStatus};
 w.FLOSY_SERVICES_V392={servicesHtml,items,subItems,advancedItems,moreSettings:items,version:"3.9.5-more"};
})(window,document);
