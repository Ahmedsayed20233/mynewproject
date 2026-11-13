/* Flosy Ultra v3.8.1: complete functional feature library.
 * Shows the ORIGINAL Flosy finance tools from the existing canonical app iframe.
 * No second ledger and no SMS/notification-inbox access. The designer's 12 views remain.
 */
(function(w,d){
 "use strict";
 const groups=[
  {title:"الأدوات الأساسية",items:[
   {id:"ultra-ai",label:"Flosy AI — الشخصية الصوتية",hint:"محادثة بالمصري بالصوت والكتابة",icon:"fa-robot",screen:8,featured:true},
   {id:"core-ai",label:"Flosy AI — المساعد الكامل",hint:"كل أدوات المساعد المالي الأصلية",icon:"fa-comments",page:"ai",featured:true},
   {id:"ultra-report",label:"التقارير — الواجهة الجديدة",hint:"شهري وربع سنوي ونصف سنوي وسنوي",icon:"fa-file-lines",screen:11,featured:true},
   {id:"core-report",label:"التقارير التفصيلية",hint:"التحليل الكامل والجداول وPDF وExcel",icon:"fa-chart-column",page:"reports",featured:true},
   {id:"dashboard",label:"لوحة التحكم الأصلية",hint:"جميع الويدجت وأدوات المتابعة",icon:"fa-table-cells-large",page:"dashboard"},
   {id:"transactions",label:"سجل المعاملات الكامل",hint:"استعراض وبحث وتعديل وتصنيف",icon:"fa-arrow-right-arrow-left",page:"transactions"},
   {id:"accounts",label:"كل أموالي والحسابات",hint:"الحسابات والأرصدة والإدارة",icon:"fa-wallet",page:"wealth"}
  ]},
  {title:"الإدخال والميزانيات",items:[
   {id:"add",label:"إضافة عملية",hint:"مصروف أو دخل أو تحويل",icon:"fa-circle-plus",screen:5},
   {id:"voice",label:"التسجيل بالصوت المصري",hint:"فهم مصروفاتك من كلامك",icon:"fa-microphone-lines",screen:7},
   {id:"receipt",label:"كاميرا الإيصالات",hint:"تصوير الفواتير وتحليلها",icon:"fa-camera",screen:6},
   {id:"capture",label:"مركز الصوت والإيصالات الأصلي",hint:"الإدخال الذكي وعمليات المراجعة",icon:"fa-receipt",page:"v4-capture"},
   {id:"budgets",label:"الميزانيات الكاملة",hint:"حدود البنود والخطة الشهرية",icon:"fa-gauge-high",page:"budget"},
   {id:"rules",label:"قواعد التصنيف التلقائي",hint:"تنظيم المعاملات وفق قواعدك",icon:"fa-list-check",page:"rules"},
   {id:"smart",label:"الرؤى والميزانية المرنة",hint:"اقتراحات عملية من بياناتك",icon:"fa-lightbulb",page:"smart"},
   {id:"family",label:"ميزانية العيلة",hint:"تخطيط ومتابعة الاحتياجات المشتركة",icon:"fa-people-roof",page:"v4-family"}
  ]},
  {title:"المستقبل المالي والثروة",items:[
   {id:"goals",label:"الأهداف والطوارئ",hint:"الأهداف والادخار وصندوق الطوارئ",icon:"fa-bullseye",page:"goals"},
   {id:"safe",label:"Safe to Spend والتوقعات",hint:"المبلغ المتاح بعد الالتزامات",icon:"fa-shield-heart",page:"phase1"},
   {id:"recurring",label:"الفواتير والأقساط المتكررة",hint:"المدفوعات المستقبلية والمواعيد",icon:"fa-calendar-check",page:"recurring"},
   {id:"plan",label:"الخطة المالية لـ24 شهرًا",hint:"الخطط طويلة المدى والتخصيص",icon:"fa-calendar-days",page:"plan"},
   {id:"portfolio",label:"محفظة ثاندر",hint:"الاستثمارات والمعاملات المسجلة",icon:"fa-chart-line",page:"portfolio"},
   {id:"wealth",label:"الثروة المصرية",hint:"الذهب والعملات والجمعيات",icon:"fa-gem",page:"v4-wealth"},
   {id:"risk",label:"الحماية من الأزمات",hint:"الالتزامات والمخاطر والصدمات",icon:"fa-umbrella",page:"risk"},
   {id:"crisis",label:"مختبر الأزمات",hint:"محاكاة البطالة والتضخم والطوارئ",icon:"fa-triangle-exclamation",page:"v4-crisis"},
   {id:"insights",label:"التحليلات الذكية",hint:"الفئات والاتجاهات ونسب الإنفاق",icon:"fa-chart-pie",screen:9},
   {id:"tips",label:"النصائح المالية",hint:"فرص التوفير المبنية على بياناتك",icon:"fa-sparkles",screen:12}
  ]},
  {title:"إدارة البيانات والإعدادات",items:[
   {id:"bank-csv",label:"استيراد كشف البنك CSV",hint:"ملفات كشف الحساب والمراجعة",icon:"fa-file-csv",page:"v4-bank"},
   {id:"backup",label:"النسخ الاحتياطية والاسترجاع",hint:"حفظ البيانات والتحقق من الاستعادة",icon:"fa-cloud-arrow-down",page:"recovery"},
   {id:"privacy",label:"مركز الخصوصية والأجهزة",hint:"إعدادات البيانات وحماية الحساب",icon:"fa-user-shield",page:"v4-privacy"},
   {id:"settings",label:"الإعدادات والمزامنة",hint:"اللغة والتفضيلات والنسخ والمزامنة",icon:"fa-gears",page:"settings"}
  ]}
 ];
 const all=groups.flatMap(g=>g.items);
 const allowed=new Set(all.filter(x=>x.page).map(x=>x.page));
 const by=id=>d.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let previousFocus=null,sourceScreen=2,open=false,coreOpen=false;
 const themeNames={emerald:"الزمردي الفاخر",light:"النهاري المريح",sapphire:"الياقوتي الملكي"};
 const themes=[
  {key:"emerald",label:themeNames.emerald,swatch:"#10B981",symbol:"✦"},
  {key:"light",label:themeNames.light,swatch:"#F8FAFC",symbol:"☼"},
  {key:"sapphire",label:themeNames.sapphire,swatch:"#38BDF8",symbol:"◆"}
 ];
 function toast(message){
  if(typeof w.showToast==="function")w.showToast(message);
 }
 function coreWindow(){return w.FLOSY_ULTRA_CORE||null}
 function coreFrame(){return by("flosyUltraCore")}
 function menuContent(){
  return '<section class="ultra-more-sheet" role="dialog" aria-modal="true" aria-labelledby="ultraMoreTitle">'+
   '<div class="ultra-more-handle" aria-hidden="true"></div>'+
   '<header class="ultra-more-head">'+
     '<div><small>FLOSY ULTRA</small><h2 id="ultraMoreTitle">المزيد من فلوسي</h2>'+
     '<p>كل إمكانيات التطبيق الأصلي في مكان واحد</p></div>'+
     '<button type="button" class="ultra-more-close" data-more-close aria-label="إغلاق قائمة المزيد">✕</button>'+
   '</header>'+
   '<label class="ultra-more-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>'+
     '<input id="ultraMoreSearch" type="search" placeholder="ابحث عن أي ميزة..." autocomplete="off" aria-label="البحث عن ميزة"></label>'+
   '<section class="ultra-more-theme" aria-label="المظهر والثيمات الثلاثة">'+
     '<h3><i class="fa-solid fa-palette" aria-hidden="true"></i> المظهر</h3>'+
     '<div class="ultra-more-themes">'+themes.map(x=>
       '<button type="button" data-more-theme="'+x.key+'" aria-pressed="false">'+
       '<span class="ultra-theme-swatch" style="--theme-swatch:'+x.swatch+'">'+x.symbol+'</span>'+
       '<span>'+x.label+'</span></button>').join("")+'</div></section>'+
   '<div id="ultraMoreGroups" class="ultra-more-groups">'+
     groups.map(g=>'<section class="ultra-more-group"><h3>'+esc(g.title)+'</h3>'+
     '<div class="ultra-more-grid">'+g.items.map(x=>
       '<button type="button" class="ultra-more-tile'+(x.featured?' ultra-more-featured':'')+'" '+
       'data-more-feature="'+x.id+'" data-more-search="'+esc(x.label+" "+x.hint)+'">'+
       '<span class="ultra-more-icon"><i class="fa-solid '+esc(x.icon)+'" aria-hidden="true"></i></span>'+
       '<span class="ultra-more-copy"><strong>'+esc(x.label)+'</strong><small>'+esc(x.hint)+'</small></span>'+
       '<i class="fa-solid fa-chevron-left ultra-more-chevron" aria-hidden="true"></i>'+
       '</button>').join("")+'</div></section>').join("")+
   '</div>'+
   '<p id="ultraMoreEmpty" class="ultra-more-empty" hidden>مافيش ميزة بالاسم ده، جرّب كلمة تانية.</p>'+
   '<p class="ultra-more-disclaimer">استيراد رسائل SMS وإشعارات البنوك غير متاح في نسخة Ultra التجريبية. استيراد كشف حساب CSV يظل متاحًا.</p>'+
   '</section>';
 }
 function theme(){return d.documentElement.getAttribute("data-theme")||"emerald"}
 function syncTheme(value=theme()){
  d.querySelectorAll("[data-more-theme]").forEach(b=>{
   const active=b.dataset.moreTheme===value;
   b.setAttribute("aria-pressed",String(active));
   b.classList.toggle("active",active);
  });
 }
 function openMenu(){
  if(coreOpen)return;
  previousFocus=d.activeElement;
  const box=by("ultraMoreOverlay");
  if(!box)return;
  box.hidden=false;box.classList.add("open");open=true;
  d.body.classList.add("ultra-more-visible");
  const search=by("ultraMoreSearch");if(search){search.value="";filter("")}
  syncTheme();by("ultraMoreSearch")?.focus();
 }
 function closeMenu(){
  const box=by("ultraMoreOverlay");
  if(box){box.hidden=true;box.classList.remove("open")}
  open=false;d.body.classList.remove("ultra-more-visible");
  previousFocus?.focus?.();
 }
 function filter(query){
  const needle=String(query||"").trim().toLocaleLowerCase("ar-EG");
  let shown=0;
  d.querySelectorAll("#ultraMoreGroups .ultra-more-group").forEach(group=>{
   let groupCount=0;
   group.querySelectorAll(".ultra-more-tile").forEach(tile=>{
    const value=(tile.dataset.moreSearch||"").toLocaleLowerCase("ar-EG");
    const match=!needle||value.includes(needle);
    tile.hidden=!match;if(match){shown++;groupCount++}
   });
   group.hidden=groupCount===0;
  });
  if(by("ultraMoreEmpty"))by("ultraMoreEmpty").hidden=shown>0;
 }
 function bridgeNativeWorkbook(core){
  // The original reports engine runs in a same-origin iframe. Route its XLSX
  // bytes through the visible Ultra main frame (Android accepts main-frame
  // native messages only). No arbitrary iframe-to-native message forwarding.
  if(w.FLOSY_NATIVE_ANDROID!==true||w.FLOSY_NATIVE_XLSX_AVAILABLE!==true
    ||!w.FLOSY_REPORT_KIT?.saveNativeXlsx)return;
  const kit=core?.FLOSY_REPORT_KIT;
  if(!kit||kit.__ultraNativeExport)return;
  const oldDownload=kit.download;
  kit.download=function(financeState,range){
   const report=kit.build(financeState,range),bytes=kit.xlsxBytes(report);
   if(w.FLOSY_REPORT_KIT.saveNativeXlsx(bytes,range))return;
   return oldDownload(financeState,range);
  };
  kit.__ultraNativeExport=true;
 }
 function openCore(page,label){
  if(!allowed.has(page))return false;
  const core=coreWindow(),frame=coreFrame();
  if(!core||!frame||!core.document)return toast("جاري تجهيز أدوات فلوسي، حاول تاني"),false;
  const nav=core.document.querySelector('.sidebar .nav button[data-page="'+page+'"]');
  const target=core.document.getElementById("page-"+page);
  if(!nav||!target)return toast("هذه الأداة غير متاحة في النسخة الحالية"),false;
  closeMenu();
  sourceScreen=Number(d.querySelector(".phone-frame.ultra-active")?.dataset.screen||2);
  // Navigate using the old app's actual controller, not a duplicate finance engine.
  bridgeNativeWorkbook(core);
  nav.click();
  frame.classList.add("ultra-core-visible");
  frame.setAttribute("aria-hidden","false");
  const wrap=by("ultraCoreBar");
  if(wrap){wrap.hidden=false;by("ultraCoreTitle").textContent=label||"أدوات فلوسي"}
  coreOpen=true;d.body.classList.add("ultra-core-open");
  by("ultraCoreBack")?.focus();
  return true;
 }
 function closeCore(){
  if(!coreOpen)return;
  const frame=coreFrame();
  if(frame){frame.classList.remove("ultra-core-visible");frame.setAttribute("aria-hidden","true")}
  const bar=by("ultraCoreBar");if(bar)bar.hidden=true;
  d.body.classList.remove("ultra-core-open");coreOpen=false;
  try{w.FLOSY_ULTRA?.render?.()}catch{}
  d.querySelector('.phone-frame.ultra-active .ultra-more-dock')?.focus();
 }
 function action(id){
  const item=all.find(x=>x.id===id);if(!item)return;
  if(item.screen){
   closeMenu();w.FLOSY_ULTRA?.goToScreen?.(item.screen);
  }else if(item.page)openCore(item.page,item.label);
 }
 function installDock(){
  d.querySelectorAll(".phone-frame").forEach(frame=>{
   if(frame.dataset.screen==="1")return;
   const dock=frame.querySelector(".bottom-nav-dock");
   if(dock&&!dock.querySelector(".ultra-more-dock")){
    const b=d.createElement("button");b.type="button";b.className="ultra-more-dock";
    b.setAttribute("aria-label","فتح قائمة المزيد بكل مزايا فلوسي");
    b.innerHTML='<i class="fa-solid fa-grip" aria-hidden="true"></i><span>المزيد</span>';
    b.addEventListener("click",openMenu);dock.appendChild(b);
   }
   // Screens 5-8 use a full-page composer instead of a bottom dock.
   // Add More inline to their OWN header; never cover content with a floating button.
   if(!dock&&!frame.querySelector(".ultra-more-inline")){
    let header=null;
    if(frame.dataset.screen==="5")header=frame.querySelector(".screen-scroll > .space-y-3 > .flex.items-center.justify-between");
    else if(frame.dataset.screen==="8")header=frame.querySelector(".flex-1 > .flex.items-center.justify-between");
    else header=frame.querySelector(".flex-1 > .flex.items-center.justify-between");
    if(!header)return;
    const spacer=Array.from(header.children).find(x=>x.classList.contains("w-8")&&x.tagName==="DIV");
    const b=d.createElement("button");b.type="button";b.className="ultra-more-inline";
    b.setAttribute("aria-label","فتح قائمة المزيد");
    b.innerHTML='<i class="fa-solid fa-grip" aria-hidden="true"></i><span>المزيد</span>';
    b.addEventListener("click",openMenu);
    if(spacer)spacer.replaceWith(b);else header.appendChild(b);
   }
  });
 }
 function mount(){
  if(by("ultraMoreOverlay"))return;
  const overlay=d.createElement("div");overlay.id="ultraMoreOverlay";
  overlay.className="ultra-more-overlay";overlay.hidden=true;
  overlay.innerHTML=menuContent();d.body.appendChild(overlay);
  const bar=d.createElement("div");bar.id="ultraCoreBar";bar.hidden=true;
  bar.className="ultra-core-bar";
  bar.innerHTML='<button type="button" id="ultraCoreBack" aria-label="الرجوع للواجهة الجديدة">'+
    '<i class="fa-solid fa-arrow-right" aria-hidden="true"></i> عودة لـ Ultra</button>'+
    '<strong id="ultraCoreTitle">أدوات فلوسي</strong>';
  d.body.appendChild(bar);
  by("ultraCoreBack").addEventListener("click",closeCore);
  by("ultraMoreSearch").addEventListener("input",e=>filter(e.target.value));
  overlay.addEventListener("click",e=>{
   if(e.target===overlay){closeMenu();return}
   if(e.target.closest("[data-more-close]")){closeMenu();return}
   const button=e.target.closest("[data-more-feature]");
   if(button){action(button.dataset.moreFeature);return}
   const themeButton=e.target.closest("[data-more-theme]");
   if(themeButton){
    const value=themeButton.dataset.moreTheme;
    if(Object.prototype.hasOwnProperty.call(themeNames,value)){w.FLOSY_ULTRA?.theme?.(value);syncTheme(value)}
   }
  });
  d.addEventListener("keydown",e=>{
   if(e.key==="Escape"){
    if(open){e.preventDefault();closeMenu()}
    else if(coreOpen){e.preventDefault();closeCore()}
   }
  });
  installDock();syncTheme();
 }
 w.FLOSY_ULTRA_MORE={
  boot:mount,open:openMenu,close:closeMenu,openCore,closeCore,
  navigate:action,syncTheme,features:()=>all.map(x=>({id:x.id,label:x.label,page:x.page||null,screen:x.screen||null})),
  get isCoreOpen(){return coreOpen}
 };
 // Android hardware Back closes the full legacy tool or the More sheet first.
 const oldBack=w.FLOSY_HANDLE_BACK;
 w.FLOSY_HANDLE_BACK=()=>{
  if(open){closeMenu();return "handled"}
  if(coreOpen){closeCore();return "handled"}
  return typeof oldBack==="function"?oldBack():"exit";
 };
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});
 else mount();
})(window,document);
