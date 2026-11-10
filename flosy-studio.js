/* Flosy Studio v9: original white-only Egyptian finance UX.
   Adapted from user-provided mobile product screenshots without copying artwork.
   Uses the existing transaction form and canonical C.mutate ledger; no second ledger.
   Cloud-synced UI preferences are strictly presentation data. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id),S=()=>C.getState()||{};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mny=x=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(x)||0)+" ج.م";
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const monthKey=d=>localDate(d).slice(0,7);
const widgets=[
 {id:"accounts",title:"حساباتي",hint:"أرصدة سجلتها وحدثتها أنت"},
 {id:"opportunities",title:"فرص توفير",hint:"سيناريوهات من معاملاتك الفعلية"},
 {id:"flow",title:"حركة الفلوس",hint:"الدخل والمصروف خلال 30 يومًا"},
 {id:"guide",title:"ابدأ صح",hint:"خطوات لإكمال بياناتك"}
];
let launcher=false,lastFocus=null;
const defaultOrder=["accounts","opportunities","flow","guide"];
function preferences(){
 const v=S().studio||{};
 const valid=Array.isArray(v.order)?v.order.filter(x=>defaultOrder.includes(x)):[];
 const order=[...new Set([...valid,...defaultOrder])];
 const shown=v.visible&&typeof v.visible==="object"?v.visible:{};
 return {order,visible:Object.fromEntries(defaultOrder.map(x=>[x,
  typeof shown[x]==="boolean"?shown[x]:["accounts","opportunities"].includes(x)]))};
}
function balances(){
 const s=S(),accounts=Array.isArray(s.accounts)?s.accounts:[];
 let amounts={};try{amounts=w.FLOSY_PRO?.rowsForAccounts?.()||{}}catch{}
 return accounts.filter(a=>a&&a.id).map(a=>({
  id:a.id,name:String(a.name||a.id).slice(0,70),
  balance:Number.isFinite(Number(amounts[a.id]))?Number(amounts[a.id]):n(a.opening),
  kind:String(a.type||"bank")
 }));
}
function recorded(){
 const today=new Date(),end=localDate(today),start=new Date(today);
 start.setDate(start.getDate()-29);
 const prevStart=new Date(start);prevStart.setDate(prevStart.getDate()-30);
 const rows=(Array.isArray(S().transactions)?S().transactions:[]).filter(t=>t&&
  /^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&n(t.amount)>0);
 const last=rows.filter(t=>t.date>=localDate(start)&&t.date<=end);
 const earlier=rows.filter(t=>t.date>=localDate(prevStart)&&t.date<localDate(start));
 const currentMonth=rows.filter(t=>t.date.slice(0,7)===monthKey(today));
 const sum=(arr,type)=>arr.filter(x=>x.type===type).reduce((a,x)=>a+Math.max(0,n(x.amount)),0);
 const categories={};
 currentMonth.filter(t=>t.type==="expense").forEach(t=>{
  const cat=String(t.category||"غير مصنف").slice(0,65);
  categories[cat]=(categories[cat]||0)+Math.max(0,n(t.amount));
 });
 return {month:monthKey(today),days:30,count:last.length,monthCount:currentMonth.length,
  income:sum(last,"income"),expense:sum(last,"expense"),transfers:sum(last,"transfer"),
  previousExpense:sum(earlier,"expense"),
  top:Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,4)};
}
function widgetAccounts(){
 const a=balances(),total=a.reduce((v,x)=>v+x.balance,0);
 return '<section class="u3-panel u3-accounts"><div class="u3-panelhead"><span class="u3-icon mint">▤</span>'+
 '<div><b>حساباتي المسجلة</b><small>الأرصدة محسوبة من المعاملات التي أضفتها، وليست متصلة بالبنوك</small></div>'+
 '<button type="button" data-u3-route="wealth" class="u3-link">إدارة ←</button></div>'+
 (a.length?'<div class="u3-account-list">'+a.slice(0,4).map(x=>
 '<div class="u3-account-row"><span class="u3-account-mark">▣</span><span class="u3-account-name">'+
 esc(x.name)+'</span><strong class="v4-sensitive" dir="ltr">'+mny(x.balance)+'</strong></div>').join("")+
 (a.length>4?'<p class="u3-fine">+ '+(a.length-4)+' حسابات أخرى</p>':"")+
 '</div><div class="u3-account-foot"><span>إجمالي الأرصدة النقدية المسجلة</span>'+
 '<strong class="v4-sensitive" dir="ltr">'+mny(total)+'</strong></div>':
 '<div class="u3-empty">أضف حساباتك النقدية والبنكية من صفحة الثروة. لن نطلب أي كلمة مرور بنكية.</div>')+
 '</section>';
}
function widgetOpportunities(){
 const s=recorded(),best=s.top[0];
 const budgets=S().elevate?.categoryBudgets||{};
 const over=s.top.filter(([name,value])=>n(budgets[name]?.amount)>0&&value>n(budgets[name].amount));
 let html="";
 if(over.length){
  const [category,value]=over[0],limit=n(budgets[category]?.amount);
  html='<div class="u3-advice-icon">!</div><strong>تجاوزت حد فئة '+esc(category)+'</strong>'+
  '<p>أنفقت '+mny(value)+' هذا الشهر، مقابل سقف '+mny(limit)+
  '. راجع معاملات الفئة قبل تعديل ميزانيتك.</p>';
 }else if(best){
  const [cat,value]=best,target=Math.round(value*.1);
  html='<div class="u3-advice-icon">◈</div><strong>راجع أكبر فئة إنفاق: '+esc(cat)+'</strong>'+
   '<p>إنفاق الشهر المسجل '+mny(value)+'. خفض افتراضي بنسبة 10٪ قد يتيح '+mny(target)+
   '؛ ده مثال حسابي، مش توفير مضمون.</p>';
 }else{
  html='<div class="u3-advice-icon">◎</div><strong>فرص توفير مبنية على أرقامك</strong>'+
   '<p>ابدأ بتسجيل المصروفات وتصنيفها لتظهر أفكار توفير واقعية. لا نعرض عروضًا تجارية غير مؤكدة.</p>';
 }
 return '<section class="u3-panel u3-opportunity"><div class="u3-panelhead"><span class="u3-icon peach">✳</span>'+
 '<div><b>فرص التوفير</b><small>اقتراحات بدون إعلانات أو وعود بعوائد</small></div></div>'+
 '<div class="u3-advice">'+html+'</div><button type="button" class="u3-inline-action" data-u3-route="budget">راجع حدود الميزانية <span>←</span></button></section>';
}
function widgetFlow(){
 const s=recorded(),den=Math.max(s.income,s.expense,1);
 const incomePct=Math.round(s.income/den*100),expensePct=Math.round(s.expense/den*100);
 const balanced=s.income-s.expense;
 return '<section class="u3-panel u3-flow"><div class="u3-panelhead"><span class="u3-icon lilac">↗</span>'+
 '<div><b>فلوس داخلة وخارجة</b><small>آخر 30 يومًا من الحركات المسجلة</small></div>'+
 '<button type="button" data-u3-route="transactions" class="u3-link">التفاصيل ←</button></div>'+
 '<div class="u3-flowrow"><span>دخل</span><strong class="v4-sensitive">'+mny(s.income)+'</strong></div>'+
 '<div class="u3-track"><i class="u3-income" style="width:'+incomePct+'%"></i></div>'+
 '<div class="u3-flowrow"><span>مصروف</span><strong class="v4-sensitive">'+mny(s.expense)+'</strong></div>'+
 '<div class="u3-track"><i class="u3-expense" style="width:'+expensePct+'%"></i></div>'+
 '<div class="u3-flowfoot"><span>الفرق المسجل <b class="v4-sensitive">'+mny(balanced)+'</b></span><small>التحويلات ('+mny(s.transfers)+') ليست مصروفًا</small></div>'+
 (!s.count?'<p class="u3-fine">لا توجد معاملات خلال آخر 30 يومًا. هذا لا يعني أن رصيدك البنكي صفر.</p>':'')+
 '</section>';
}
function widgetGuide(){
 const s=S(),items=[];
 if(!(S().transactions||[]).length)items.push({title:"سجل أول مصروف أو دخل",route:"v4-capture",icon:"+"});
 if(!C.getSession?.())items.push({title:"فعّل المزامنة بعد مراجعة بياناتك",route:"settings",icon:"◇"});
 if(!(s.next?.recurring||[]).length)items.push({title:"أضف فاتورة أو قسطًا متكررًا",route:"recurring",icon:"◷"});
 if(!(s.elevate?.wealthHistory||[]).length)items.push({title:"سجّل لقطة لصافي ثروتك",route:"wealth",icon:"↗"});
 if(!Object.keys(s.elevate?.categoryBudgets||{}).length)items.push({title:"ضع حدًا للإنفاق على فئة",route:"budget",icon:"◉"});
 if(!items.length)items.push({title:"راجع تقريرك الشهري",route:"reports",icon:"▥"});
 return '<section class="u3-panel u3-guide"><div class="u3-panelhead"><span class="u3-icon blue">✓</span>'+
 '<div><b>خطواتك التالية</b><small>إكمال البيانات يحسّن دقة الملخصات</small></div></div>'+
 '<div class="u3-guide-list">'+items.slice(0,3).map(x=>
 '<button type="button" class="u3-guide-row" data-u3-route="'+x.route+'"><span>'+x.icon+'</span>'+
 '<b>'+esc(x.title)+'</b><span aria-hidden="true">‹</span></button>').join("")+'</div></section>';
}
function renderHome(){
 const root=E("flosyStudioHome");if(!root)return;
 const p=preferences(),func={accounts:widgetAccounts,opportunities:widgetOpportunities,flow:widgetFlow,guide:widgetGuide};
 const shown=p.order.filter(id=>p.visible[id]);
 root.innerHTML='<section class="u3-home" aria-label="أدوات فلوسي اليومية">'+
 '<div class="u3-homehead"><div><span class="u3-eyebrow">YOUR MONEY, YOUR WAY</span>'+
 '<h2>نظرة على فلوسك، بطريقتك</h2><p>اختار الأدوات اللي تهمك. كل رقم من البيانات اللي أنت سجلتها.</p></div>'+
 '<div class="u3-head-actions"><button type="button" class="u3-button primary" data-u3-launch>＋ إضافة سريعة</button>'+
 '<button type="button" class="u3-button outline" data-u3-customize aria-controls="flosyStudioCustomization" aria-expanded="false">⚙ تخصيص الرئيسية</button></div></div>'+
 '<div id="flosyStudioWidgets" class="u3-widgets">'+
 shown.map(id=>'<div class="u3-widget" data-u3-widget="'+id+'">'+func[id]()+'</div>').join("")+
 (!shown.length?'<div class="u3-empty">لا توجد أدوات ظاهرة. اضغط «تخصيص الرئيسية» لإعادة إظهارها.</div>':"")+
 '</div><div id="flosyStudioCustomization" class="u3-customization" hidden>'+
 '<div class="u3-custom-head"><div><strong>تخصيص الرئيسية</strong><p>اختر إظهار الأقسام وترتيبها. التغيير لا يمس معاملاتك ولا أرصدتك.</p></div>'+
 '<button type="button" class="u3-close-tiny" data-u3-customize-close aria-label="إغلاق التخصيص">×</button></div>'+
 '<div class="u3-custom-list">'+p.order.map((id,i)=>{
  const config=widgets.find(x=>x.id===id);
  return '<div class="u3-custom-item"><label><input type="checkbox" data-u3-visible="'+id+'" '+(p.visible[id]?"checked":"")+'>'+
  '<span><b>'+esc(config.title)+'</b><small>'+esc(config.hint)+'</small></span></label>'+
  '<div class="u3-movers"><button type="button" data-u3-move="'+id+'" data-dir="-1" '+(i===0?"disabled":"")+' aria-label="رفع '+esc(config.title)+'">↑</button>'+
  '<button type="button" data-u3-move="'+id+'" data-dir="1" '+(i===p.order.length-1?"disabled":"")+
  ' aria-label="خفض '+esc(config.title)+'">↓</button></div></div>';
 }).join("")+'</div></div></section>';
}
function renderSettings(){
 const root=E("flosyStudioSettings");if(!root)return;
 root.innerHTML='<section class="u3-settings u3-panel"><div class="u3-panelhead"><span class="u3-icon mint">⚙</span>'+
 '<div><b>إدارة فلوسي</b><small>إعدادات منظمة للوصول السريع والآمن</small></div></div>'+
 '<div class="u3-setting-grid">'+[
 ["wealth","▤","الحسابات والأرصدة","راجع الأرصدة اليدوية وبيانات ثاندر"],
 ["rules","⟡","قواعد التصنيف","خصص فئات التجار والرسائل"],
 ["v4-bank","⇄","استيراد المعاملات","CSV وSMS مع مراجعة قبل الحفظ"],
 ["v4-privacy","◇","الخصوصية والنسخ","إخفاء الأرصدة وتصدير البيانات"]
 ].map(([route,icon,title,desc])=>'<button type="button" data-u3-route="'+route+'" class="u3-setting-link">'+
 '<span class="u3-setting-icon">'+icon+'</span><span><b>'+title+'</b><small>'+desc+'</small></span><span aria-hidden="true">‹</span></button>').join("")+'</div></section>';
}
function launcherMarkup(){
 return '<div class="u3-launcher-backdrop" id="flosyStudioLauncher" hidden aria-hidden="true">'+
 '<section class="u3-launcher" role="dialog" aria-modal="true" aria-labelledby="u3LauncherHeading" tabindex="-1">'+
 '<div class="u3-dragbar" aria-hidden="true"></div><div class="u3-launcherhead"><div>'+
 '<span class="u3-eyebrow">ONE TAP · FLOSY</span><h2 id="u3LauncherHeading">تحب تضيف إيه؟</h2>'+
 '<p>كل معاملة تتراجع وتتسجل في السجل الأصلي — مفيش بيانات بتتضاعف.</p></div>'+
 '<button type="button" class="u3-x" data-u3-close aria-label="إغلاق">×</button></div>'+
 '<div class="u3-action-menu">'+[
 ["expense","−","مصروف","سجل عملية شراء أو خدمة","expense"],
 ["income","+","دخل","مرتب أو دخل إضافي","income"],
 ["transfer","⇄","تحويل بين حساباتك","التحويل لا يُحسب إنفاقًا","transfer"],
 ["budget","◉","ميزانية فئة","حدد سقفك الشهري","budget"],
 ["voice","♬","سجل بالصوت المصري","ميكروفون وإقرار قبل الحفظ","v4-capture"],
 ["receipt","▧","صوّر إيصال","قراءة الصورة ومراجعة المبلغ","v4-capture"]
 ].map(([kind,icon,title,desc])=>'<button type="button" class="u3-launch-option" data-u3-option="'+kind+'">'+
 '<span class="u3-option-icon '+kind+'">'+icon+'</span><span><b>'+title+'</b><small>'+desc+'</small></span>'+
 '<span class="u3-chevron" aria-hidden="true">‹</span></button>').join("")+'</div>'+
 '<p class="u3-launcherfoot">Flosy لا يسحب فلوس ولا يعمل تحويلات بنكية فعلية. كل العمليات للتسجيل والمتابعة فقط.</p>'+
 '</section></div>';
}
function setupLauncher(){
 const host=E("flosyStudioLauncherHost");if(!host)return;
 if(!E("flosyStudioLauncher"))host.innerHTML=launcherMarkup();
}
function openLauncher(){
 setupLauncher();const back=E("flosyStudioLauncher");if(!back)return;
 lastFocus=document.activeElement;launcher=true;
 back.hidden=false;back.setAttribute("aria-hidden","false");
 document.body.classList.add("u3-launch-open");
 const dialog=back.querySelector(".u3-launcher");
 if(dialog)dialog.focus({preventScroll:true});
}
function closeLauncher(){
 const back=E("flosyStudioLauncher");if(!back)return;
 launcher=false;back.hidden=true;back.setAttribute("aria-hidden","true");
 document.body.classList.remove("u3-launch-open");
 if(lastFocus&&document.contains(lastFocus)&&typeof lastFocus.focus==="function")
  lastFocus.focus({preventScroll:true});
}
function runOption(action){
 closeLauncher();
 if(["expense","income","transfer"].includes(action)){
  const original=document.querySelector('[data-quick="'+action+'"]');
  if(original){
   original.click();
   const date=E("txnForm")?.elements?.date;
   if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date.value))date.value=localDate(new Date());
  }else C.goto("v4-capture");
  return;
 }
 const route=action==="budget"?"budget":action==="voice"||action==="receipt"?"v4-capture":"dashboard";
 C.goto(route);
 if(action==="voice"||action==="receipt")
  C.toast(action==="voice"?"اضغط «ابدأ تسجيل الصوت» للسماح بالميكروفون.":
    "اضغط زر الكاميرا أو اختر صورة الإيصال؛ راجع المبلغ قبل الحفظ.");
}
function editPreferences(operation,id,direction=0){
 if(!defaultOrder.includes(id))return;
 C.mutate(s=>{
  if(!s.studio||typeof s.studio!=="object")s.studio={};
  const p=preferences();
  if(operation==="toggle")p.visible[id]=!p.visible[id];
  if(operation==="move"){
   const idx=p.order.indexOf(id),target=idx+direction;
   if(target>=0&&target<p.order.length){
    [p.order[idx],p.order[target]]=[p.order[target],p.order[idx]];
   }
  }
  s.studio={version:1,order:p.order,visible:p.visible};
 });
 // Main app render reconstructs the customization panel; reopen after update.
 const custom=E("flosyStudioCustomization");
 if(custom){custom.hidden=false;E("flosyStudioHome")?.querySelector("[data-u3-customize]")?.setAttribute("aria-expanded","true")}
}
function render(){renderHome();renderSettings();setupLauncher()}
document.addEventListener("click",e=>{
 if(!e.target?.closest)return;
 if(e.target.closest("#dockAdd,#addBtn")){
  if(!E("flosyStudioLauncherHost"))return;
  e.preventDefault();e.stopImmediatePropagation();
  openLauncher();
 }
},true);
document.addEventListener("click",e=>{
 const b=e.target?.closest?.("[data-u3-launch],[data-u3-close],[data-u3-option],[data-u3-route],[data-u3-customize],[data-u3-customize-close],[data-u3-move]");
 if(b){
  if(b.hasAttribute("data-u3-launch"))return openLauncher();
  if(b.hasAttribute("data-u3-close"))return closeLauncher();
  if(b.dataset.u3Option)return runOption(b.dataset.u3Option);
  if(b.dataset.u3Route)return C.goto(b.dataset.u3Route);
  if(b.hasAttribute("data-u3-customize")){
   const section=E("flosyStudioCustomization");if(!section)return;
   section.hidden=!section.hidden;
   b.setAttribute("aria-expanded",String(!section.hidden));return;
  }
  if(b.hasAttribute("data-u3-customize-close")){
   const section=E("flosyStudioCustomization");if(section)section.hidden=true;
   E("flosyStudioHome")?.querySelector("[data-u3-customize]")?.setAttribute("aria-expanded","false");return;
  }
  if(b.dataset.u3Move)return editPreferences("move",b.dataset.u3Move,Number(b.dataset.dir));
 }
 if(e.target?.id==="flosyStudioLauncher")closeLauncher();
});
document.addEventListener("change",e=>{
 const id=e.target?.dataset?.u3Visible;if(!id)return;
 editPreferences("toggle",id);
});
document.addEventListener("keydown",e=>{
 if(!launcher)return;
 if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();closeLauncher();return}
 if(e.key==="Tab"){
  const modal=E("flosyStudioLauncher")?.querySelector(".u3-launcher");
  const controls=[...(modal?.querySelectorAll("button:not([disabled])")||[])];
  if(!controls.length)return;
  const idx=controls.indexOf(document.activeElement);
  if(e.shiftKey&&(idx<=0)){e.preventDefault();controls.at(-1).focus()}
  else if(!e.shiftKey&&idx===controls.length-1){e.preventDefault();controls[0].focus()}
 }
},true);
w.FLOSY_STUDIO={render,preferences,recorded,balances,openLauncher,closeLauncher,runOption,editPreferences};
render();
})(window);
