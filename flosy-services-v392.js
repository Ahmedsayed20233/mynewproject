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
 const items=map.primary,subItems=map.details,advancedItems=map.advanced;
 const types=[["all","الكل"],["main","الأساسيات"],["capture","الإدخال"],
  ["plan","الالتزامات والخطط"],["wealth","الثروة"],["ai","الذكاء والتقارير"],
  ["settings","الإعدادات"]];
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
  const {advice,n}=summary();
  return '<div class="service-v392-root">'+
   '<header class="service-v392-hero"><div><small>YOUR FLOSY · خدماتك</small><h2>'+
   (n?"أهلاً يا "+esc(n):"كل فلوسي في مكان واحد")+'</h2>'+
   '<p>كل أدوات إدارة أموالك بأيقونات واضحة وتنظيم أسهل.</p></div>'+
   '<button type="button" data-flosy-screen="8" aria-label="فلوسي AI" class="service-v392-avatar"><img src="flosy-ultra-avatar.svg" alt="Flosy AI"/></button></header>'+
   '<div class="service-v392-daily" data-flosy-screen="8" role="link" tabindex="0">'+
    '<span>'+icon("fa-wand-magic-sparkles")+'</span><div><small>اقتراح شخصي اليوم</small><strong>'+
    esc(advice.title)+'</strong><p>'+esc(advice.message)+'</p></div></div>'+
   '<div class="service-v392-search">'+icon("fa-magnifying-glass")+
   '<input id="servicesV392Search" type="search" placeholder="دوّر على خدمة، زي تقارير أو صوت..." aria-label="البحث في الخدمات"></div>'+
   '<div class="service-v392-tabs" role="group" aria-label="أقسام الخدمات">'+
    types.map(([id,label])=>'<button type="button" data-sfilter="'+id+'" aria-pressed="'+(id==="all")+'">'+label+'</button>').join("")+'</div>'+
   '<p class="service-v392-count">8 أقسام أساسية بدل 20 شاشة منفصلة؛ الوظائف التفصيلية ما زالت متاحة.</p>'+
   '<p id="servicesV392Count" class="service-v392-count" aria-live="polite"></p>'+
   '<h3 class="service-v395-title">المساحات الرئيسية</h3>'+
   '<div id="servicesV392Grid" class="service-v392-grid">'+items.map(quick).join("")+'</div>'+
   '<details class="service-v392-fold" id="flosyDetailedTools"><summary>'+icon("fa-layer-group")+
    ' وظائف داخل المساحات <span>10 أدوات مستقلة، وليست 10 أقسام جديدة</span></summary>'+
    '<div class="service-v392-grid service-v395-subgrid">'+subItems.map(quick).join("")+'</div></details>'+
   '<details class="service-v392-fold" id="flosyAdvancedTools"><summary>'+icon("fa-toolbox")+
    ' الأدوات المتقدمة <span>المزامنة والخصوصية وغيرها</span></summary>'+
    '<div class="service-v392-grid service-v395-subgrid">'+advancedItems.map(quick).join("")+'</div></details>'+
   '<details class="service-v392-fold" open><summary>'+icon("fa-palette")+
     ' التصميم والثيمات الأربعة <span>ألوان موحدة لكل الصفحات</span></summary>'+
     '<div class="service-v392-themes">'+themeGrid()+'</div></details>'+
   '<details class="service-v392-fold" open><summary>'+icon("fa-bell")+
     ' الإشعارات الذكية <span>تحتاج إذن صريح منك</span></summary>'+
     '<div class="service-v392-notify"><div id="flosyNotificationStatus" class="service-v392-status" role="status">لم تُطلب حالة الإشعارات بعد.</div>'+
     '<button class="flosy-btn" type="button" data-notify-action="enable">'+icon("fa-bell")+' تفعيل إشعارات الأقساط</button>'+
     '<button class="flosy-btn flosy-btn-secondary" type="button" data-notify-action="daily">'+icon("fa-sun")+' اقتراح يومي 9 صباحًا</button>'+
     '<button class="flosy-btn flosy-btn-secondary" type="button" data-notify-action="test">إشعار تجريبي</button>'+
     '<button class="flosy-btn flosy-btn-secondary" type="button" data-notify-action="stop">إيقاف الإشعارات</button>'+
     '<small>إشعارات Android محلية، ولا تعرض مبالغ أو تفاصيل بنكية على شاشة القفل. قد يؤخر النظام موعد التسليم. إشعارات الويب اليومية في الخلفية غير مدعومة في هذه النسخة.</small></div></details>'+
   '<details class="service-v392-fold"><summary>'+icon("fa-id-card")+
     ' معلوماتي <span>علشان فلوسي يناديك باسمك</span></summary>'+
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
  let group="all";
  const input=el.querySelector("#servicesV392Search"),cards=[...el.querySelectorAll(".service-v392-item")],
    count=el.querySelector("#servicesV392Count");
  const refresh=()=>{
   const q=String(input?.value||"").trim().toLocaleLowerCase("ar-EG");
   let found=0;
   for(const c of cards){
    const match=(group==="all"||c.dataset.sgroup===group)&&
      (!q||c.innerText.toLocaleLowerCase("ar-EG").includes(q));
    c.hidden=!match;if(match)found++;
   }
   // If a user searches for a hidden tool, open its collapsed collection.
   if(q)for(const id of ["flosyDetailedTools","flosyAdvancedTools"]){
    const fold=el.querySelector("#"+id);
    if(fold?.querySelector(".service-v392-item:not([hidden])"))fold.open=true;
   }
   count.textContent=(q||group!=="all")?found+" نتيجة":
    items.length+" مساحات رئيسية · "+subItems.length+" وظائف داخلها";
  };
  input.oninput=refresh;
  el.querySelectorAll("[data-sfilter]").forEach(btn=>btn.onclick=()=>{
   group=btn.dataset.sfilter;el.querySelectorAll("[data-sfilter]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));
   refresh();
  });refresh();
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
  el.querySelector(".service-v392-daily").onkeydown=e=>{
   if(e.key==="Enter"||e.key===" "){e.preventDefault();api().go(8)}
  };
  api().bridge("notifications-daily-name",{name:CP()?.name?.(api().state())||""});
  if(lastStatus)nativeStatus(lastStatus);else api().bridge("notifications-status");
 }
 Pages.render=function(id){
  original(id);
  const host=d.querySelector('.phone-frame[data-screen="'+id+'"] .flosy-real');
  if(!host)return;
  if(id===16){host.innerHTML=servicesHtml();bind(host);}
  if(id===2){
   host.querySelector(".service-v392-home-tip")?.remove();
   const root=host.querySelector(".hero-card");
   if(root)root.insertAdjacentHTML("afterend",dailyHome());
  }
 };
 w.FLOSY_NOTIFY_V392={nativeStatus};
 w.FLOSY_SERVICES_V392={servicesHtml,items,subItems,advancedItems,version:"3.9.5"};
})(window,document);
