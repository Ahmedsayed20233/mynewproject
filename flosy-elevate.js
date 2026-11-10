/* Flosy Reference Upgrade — original Egypt-first insights UX.
   Inspired by patterns of grouped mobile activity, goal nudges and budget suggestions.
   No copied branding/assets, no external requests, no inferred bank balances. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id),S=()=>C.getState()||{};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=x=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(x)||0)+" ج.م";
const n=x=>Number.isFinite(Number(x))&&Number(x)>0?Number(x):0;
const localDay=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const dayFrom=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)),12);
const monthKey=d=>localDay(d).slice(0,7);
const previousMonth=(d,offset)=>new Date(d.getFullYear(),d.getMonth()+offset,1,12);
const shortDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||"")?
 dayFrom(s).toLocaleDateString("ar-EG",{day:"numeric",month:"short",year:"numeric"}):String(s||"");
const validTxn=t=>t&&/^(expense|income|transfer)$/.test(String(t.type||""))&&
 /^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&n(t.amount)>0;
const transactions=()=>((S().transactions||[]).filter(validTxn));
const prefs=()=>S().elevate||{};
const budgets=()=>prefs().categoryBudgets&&typeof prefs().categoryBudgets==="object"?
 prefs().categoryBudgets:{};
const dismissed=()=>prefs().dismissed&&typeof prefs().dismissed==="object"?prefs().dismissed:{};
const now=()=>new Date();
let period="month",anchor=new Date(now().getFullYear(),now().getMonth(),now().getDate(),12),
 search="",kind="all",selectedAccount="all",wealthSpan="1y";
function EGP(v){return '<span dir="ltr">'+money(v)+'</span>'}
function monthSummary(date=new Date()){
 const m=monthKey(date),list=transactions().filter(t=>t.date.slice(0,7)===m);
 const sum=type=>list.filter(t=>t.type===type).reduce((a,t)=>a+n(t.amount),0);
 const expenseCategories={};
 for(const t of list)if(t.type==="expense")
  expenseCategories[t.category||"غير مصنف"]=(expenseCategories[t.category||"غير مصنف"]||0)+n(t.amount);
 return {key:m,income:sum("income"),expense:sum("expense"),transfer:sum("transfer"),
  count:list.length,expenses:list.filter(t=>t.type==="expense").length,
  categories:Object.entries(expenseCategories).sort((a,b)=>b[1]-a[1])};
}
function suggestions(date=new Date()){
 // Complete historical months only; the current partial month cannot dilute forecasts.
 const hist=[-3,-2,-1].map(k=>{
  const d=previousMonth(date,k),key=monthKey(d);
  const rows=transactions().filter(t=>t.type==="expense"&&t.date.slice(0,7)===key);
  return {key,rows,all:rows.reduce((a,t)=>a+n(t.amount),0)};
 });
 const usable=hist.filter(h=>h.rows.length);
 // At least two months of real spending history, never assume missing months were zero.
 if(usable.length<2)return [];
 const categories=[...new Set(usable.flatMap(h=>h.rows.map(t=>String(t.category||"غير مصنف").slice(0,70))))];
 return categories.map(category=>{
  const amounts=usable.map(h=>h.rows.filter(t=>String(t.category||"غير مصنف").slice(0,70)===category)
   .reduce((a,t)=>a+n(t.amount),0));
  const appearances=amounts.filter(x=>x>0).length;
  if(appearances<2)return null;
  const mean=amounts.reduce((a,x)=>a+x,0)/usable.length;
  const target=Math.ceil(mean*1.10/50)*50;
  if(target<50||target>1000000)return null;
  return {category,target,average:mean,months:appearances,history:usable.length,
   sampleMonths:usable.map(h=>h.key)};
 }).filter(Boolean).sort((a,b)=>b.average-a.average);
}
function healthTasks(){
 const s=S(),m=monthSummary(),p=prefs(),b=budgets();
 const actions=[];
 if(!transactions().length)actions.push({title:"سجل أول معاملة",desc:"ابدأ بدخل أو مصروف لتصبح التحليلات مفيدة.",route:"v4-capture",symbol:"＋"});
 if(!C.getSession?.())actions.push({title:"احمِ بياناتك",desc:"راجع التسجيل والمزامنة قبل تغيير الهاتف.",route:"settings",symbol:"◇"});
 const recurring=s.next?.recurring||[];
 if(!recurring.length)actions.push({title:"رتّب التزاماتك",desc:"سجّل الإيجار والفواتير والأقساط وتواريخها.",route:"recurring",symbol:"▦"});
 if(m.expense>0&&m.categories.length){
  const [cat,value]=m.categories[0];
  if(value/m.expense>=.40)actions.push({title:"راجع فئة "+String(cat).slice(0,40),
   desc:"تمثل "+Math.round(value/m.expense*100)+"٪ من المصروفات المسجلة هذا الشهر.",route:"transactions",symbol:"↗"});
 }
 const saved=Object.entries(b).filter(([k,v])=>n(v?.amount)>0);
 const active=saved.filter(([cat,v])=>(m.categories.find(x=>x[0]===cat)?.[1]||0)>n(v.amount));
 if(active.length)actions.unshift({title:"فئة تجاوزت سقفها",desc:active.length+" فئات تخطت السقف الذي حددته لها.",
  route:"budget",symbol:"!"});
 if(!saved.length&&suggestions().length)actions.push({title:"ميزانية مقترحة جاهزة",desc:"أنشئ حدودًا للفئات من آخر الأشهر المكتملة.",
  route:"budget",symbol:"◎"});
 if(!actions.length)actions.push({title:"استمر في المراجعة الأسبوعية",
  desc:"لا توجد خطوات عاجلة مكتشفة في بياناتك الحالية.",route:"smart",symbol:"✓"});
 return actions.slice(0,4);
}
function dashboard(){
 const root=E("flosyElevateDashboard");if(!root)return;
 const m=monthSummary(),prev=monthSummary(previousMonth(now(),-1));
 const pct=prev.expense>0?Math.round((m.expense-prev.expense)/prev.expense*100):null;
 const tips=healthTasks();
 const top=m.categories[0];
 const target=top?budgets()[top[0]]:null;
 root.innerHTML='<div class="u-section-head"><div><span class="u-eyebrow">YOUR FINANCIAL PULSE</span>'+
 '<h2>يومك المالي، بدون تعقيد</h2><p>أرقام فعلية مما سجلته، وخطوات تقدر تنفذها الآن.</p></div>'+
 '<button class="u-button ghost" type="button" data-u-go="transactions">استكشف معاملاتك <span aria-hidden="true">↗</span></button></div>'+
 '<div class="u-snapshot-grid">'+
 '<div class="u-snapshot mint"><div class="u-stat-caption">مصروفات الشهر المسجلة</div><strong class="v4-sensitive">'+EGP(m.expense)+'</strong>'+
 '<div class="u-stat-foot">'+(pct===null?"سجّل مصروفات الشهر الماضي للمقارنة":
 (pct>0?"↑ أعلى ":"↓ أقل أو مساوية ")+Math.abs(pct)+"٪ عن الشهر السابق")+'</div></div>'+
 '<div class="u-snapshot snow"><div class="u-stat-caption">الدخل المسجل</div><strong class="v4-sensitive">'+EGP(m.income)+'</strong>'+
 '<div class="u-stat-foot">'+m.count+' معاملات هذا الشهر · لا نضيف الراتب المخطط تلقائيًا</div></div>'+
 '<div class="u-snapshot cream"><div class="u-stat-caption">أكثر فئة إنفاقًا</div><strong class="u-truncate">'+esc(top?.[0]||"لا يوجد بعد")+'</strong>'+
 '<div class="u-stat-foot">'+(top?money(top[1])+
 (target?" · السقف "+money(target.amount):" · بدون سقف مخصص"):"ستظهر بعد تسجيل معاملات")+'</div></div></div>'+
 '<div class="u-focus-grid">'+
 '<section class="u-panel"><div class="u-panel-head"><div><small>NEEDS ATTENTION</small><h3>خطوات مهمة ليك</h3></div>'+
 '<button type="button" class="u-link" data-u-go="smart">المزيد</button></div>'+
 '<div class="u-focus-list">'+tips.map((x,i)=>'<button type="button" class="u-focus-action" data-u-go="'+x.route+'">'+
 '<span class="u-step-symbol">'+esc(x.symbol)+'</span><span><b>'+esc(x.title)+'</b><small>'+esc(x.desc)+'</small></span>'+
 '<span aria-hidden="true">‹</span></button>').join("")+'</div></section>'+
 '<section class="u-panel u-feature-panel"><div class="u-panel-head"><div><small>SMART BUDGET</small><h3>ميزانيات تناسب مصاريفك</h3></div>'+
 '<button class="u-link" type="button" data-u-go="budget">عرض الكل</button></div>'+
 (suggestions().filter(x=>!budgets()[x.category]&&dismissed()[x.category]!==m.key).slice(0,2).map(x=>
 '<div class="u-mini-suggestion"><span class="u-icon-box">◎</span><span><b>'+esc(x.category)+'</b><small>'+
 EGP(x.target)+' / شهر · مبني على '+x.months+' أشهر</small></span>'+
 '<button class="u-micro-button" data-u-accept="'+esc(x.category)+'" type="button" aria-label="تفعيل ميزانية '+esc(x.category)+'">اعتمد</button></div>').join("")||
 '<div class="u-fine">لو معاملاتك أقل من شهرين مكتملين، هننتظر بيانات كافية قبل اقتراح أي حد.</div>')+
 '<p class="u-disclaimer">اقتراحات الفئات للمتابعة، وليست خصمًا ثانيًا من Safe to Spend.</p></section></div>';
}
function rangeFor(mode,date){
 const base=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);
 let a,b;
 if(mode==="day"){a=base;b=base}
 else if(mode==="week"){
  const delta=(base.getDay()+6)%7;a=new Date(base);a.setDate(a.getDate()-delta);
  b=new Date(a);b.setDate(a.getDate()+6);
 }else if(mode==="year"){a=new Date(base.getFullYear(),0,1,12);b=new Date(base.getFullYear(),11,31,12)}
 else{a=new Date(base.getFullYear(),base.getMonth(),1,12);b=new Date(base.getFullYear(),base.getMonth()+1,0,12)}
 return {start:localDay(a),end:localDay(b),label:mode==="day"?shortDate(localDay(a)):
 mode==="week"?shortDate(localDay(a))+" – "+shortDate(localDay(b)):
 mode==="year"?String(base.getFullYear()):
 base.toLocaleDateString("ar-EG",{month:"long",year:"numeric"})};
}
function periodRows(){
 const r=rangeFor(period,anchor);
 const q=search.trim().toLowerCase();
 const list=transactions().filter(t=>{
  if(t.date<r.start||t.date>r.end)return false;
  if(kind!=="all"&&t.type!==kind)return false;
  if(selectedAccount!=="all"&&t.accountId!==selectedAccount&&t.targetAccountId!==selectedAccount)return false;
  if(!q)return true;
  return [t.description,t.category,t.subcategory,t.source,t.accountId].some(x=>String(x||"").toLowerCase().includes(q));
 }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
 return {range:r,rows:list};
}
function activityRows(){
 const root=E("flosyElevateTxRows"),summary=E("flosyElevateTxSummary");if(!root)return;
 const {rows}=periodRows();
 const allIncome=rows.filter(t=>t.type==="income").reduce((a,t)=>a+n(t.amount),0);
 const allExpense=rows.filter(t=>t.type==="expense").reduce((a,t)=>a+n(t.amount),0);
 const allTransfers=rows.filter(t=>t.type==="transfer").reduce((a,t)=>a+n(t.amount),0);
 if(summary)summary.innerHTML='<div><span>دخل</span><b class="u-positive">'+EGP(allIncome)+'</b></div>'+
 '<div><span>مصروفات</span><b class="u-negative">'+EGP(allExpense)+'</b></div>'+
 '<div><span>تحويلات داخلية</span><b>'+EGP(allTransfers)+'</b></div>';
 let last="",html="";
 for(const t of rows.slice(0,120)){
  if(t.date!==last){last=t.date;html+='<h4 class="u-day-heading">'+esc(shortDate(last))+'</h4>'}
  const symbol=t.type==="income"?"↙":t.type==="expense"?"↗":"⇄";
  const label=t.type==="income"?"دخل":t.type==="expense"?"مصروف":"تحويل";
  const desc=String(t.description||t.category||label).slice(0,100);
  const a=S().accounts?.find(x=>x.id===t.accountId);
  html+='<div class="u-transaction"><span class="u-txn-icon '+t.type+'">'+symbol+'</span>'+
   '<div class="u-txn-info"><b>'+esc(desc)+'</b><small>'+esc(t.category||label)+
   (a?" · "+esc(a.name):"")+'</small></div>'+
   '<div class="u-txn-value '+t.type+'">'+(t.type==="expense"?"−":t.type==="income"?"+":"⇄ ")+
   EGP(t.amount)+'</div></div>';
 }
 root.innerHTML=html||'<div class="u-empty"><b>مافيش معاملات في الفترة دي</b><p>جرب تغيير الفترة أو مسح البحث، أو سجّل أول معاملة.</p>'+
 '<button type="button" class="u-button solid" data-u-go="v4-capture">＋ سجل معاملة</button></div>';
 if(rows.length>120)root.innerHTML+='<div class="u-fine">يعرض أحدث 120 معاملة من أصل '+rows.length+
 '؛ استخدم البحث والفلاتر لنتائج أدق.</div>';
 const count=E("flosyElevateTxCount");if(count)count.textContent=rows.length+" معاملة مطابقة";
}
function transactionPage(){
 const root=E("flosyElevateTransactions");if(!root)return;
 const r=rangeFor(period,anchor);
 const accountOptions=(S().accounts||[]).filter(a=>a?.id).map(a=>
 '<option value="'+esc(a.id)+'" '+(selectedAccount===a.id?"selected":"")+'>'+esc(a.name||a.id)+'</option>').join("");
 root.innerHTML='<div class="u-section-head"><div><span class="u-eyebrow">ACTIVITY EXPLORER</span>'+
 '<h2>كل حركة مالية في مكانها</h2><p>بدّل بين اليوم والأسبوع والشهر والسنة، وراقب الدخل والمصروفات منفصلين عن التحويلات.</p></div>'+
 '<button type="button" data-u-go="v4-capture" class="u-button solid">＋ مصروف جديد</button></div>'+
 '<div class="u-panel u-activity-panel"><div class="u-period-tabs" role="group" aria-label="تصفية الفترة">'+
 [["day","يوم"],["week","أسبوع"],["month","شهر"],["year","سنة"]].map(([k,v])=>
 '<button type="button" data-u-period="'+k+'" class="'+(period===k?"active":"")+'" aria-pressed="'+(period===k)+'">'+v+'</button>').join("")+'</div>'+
 '<div class="u-date-switch"><button type="button" data-u-move="-1" aria-label="الفترة السابقة">›</button>'+
 '<strong>'+esc(r.label)+'</strong><button type="button" data-u-move="1" aria-label="الفترة التالية">‹</button></div>'+
 '<div id="flosyElevateTxSummary" class="u-activity-totals"></div>'+
 '<div class="u-filter-row"><label><span>بحث سريع</span><input id="flosyElevateSearch" type="search" value="'+esc(search)+
 '" placeholder="تاجر، وصف، فئة…" maxlength="80" autocomplete="off"></label>'+
 '<label><span>نوع الحركة</span><select data-u-kind><option value="all">الكل</option>'+
 [["expense","مصروف"],["income","دخل"],["transfer","تحويل"]].map(([k,v])=>
 '<option value="'+k+'" '+(kind===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label>'+
 '<label><span>الحساب</span><select data-u-account><option value="all">كل الحسابات</option>'+accountOptions+'</select></label></div>'+
 '<div class="u-list-header"><h3>المعاملات</h3><span id="flosyElevateTxCount">—</span></div>'+
 '<div id="flosyElevateTxRows"></div></div>'+
 '<p class="u-disclaimer">هذه معاملات مسجلة يدويًا أو مُعتمدة بعد الاستيراد. التحويلات بين الحسابات ليست إنفاقًا إضافيًا.</p>';
 activityRows();
}
function budgetPage(){
 const root=E("flosyElevateBudgets");if(!root)return;
 const m=monthSummary(),p=budgets(),s=suggestions(),all=Object.entries(p).filter(([k,v])=>v&&n(v.amount)>0),
  month=monthKey(new Date()),recommended=s.filter(x=>!p[x.category]&&dismissed()[x.category]!==month);
 root.innerHTML='<div class="u-section-head"><div><span class="u-eyebrow">YOUR SPENDING PLAN</span>'+
 '<h2>ميزانيات على قد عاداتك</h2><p>استنتاجات محسوبة من الشهور المكتملة؛ أنت وحدك من يعتمد أو يغير أي سقف.</p></div>'+
 '<button class="u-button ghost" type="button" data-u-go="smart">الميزانية المرنة ←</button></div>'+
 '<div class="u-budget-grid">'+
 '<section class="u-panel"><div class="u-panel-head"><div><small>SUGGESTED FOR YOU</small><h3>ميزانيات مقترحة</h3></div>'+
 '<span class="u-subtle">آخر 3 أشهر مكتملة</span></div>'+
 (recommended.length?recommended.slice(0,12).map(x=>
 '<div class="u-budget-suggestion"><div class="u-circle-symbol">◈</div><div class="u-suggestion-copy"><strong>'+
 esc(x.category)+'</strong><small>متوسط '+money(x.average)+' · ظهر في '+x.months+' أشهر مسجلة</small>'+
 '<b>'+money(x.target)+' / شهر</b></div><div class="u-inline-actions">'+
 '<button type="button" class="u-button solid small" data-u-accept="'+esc(x.category)+'">اعتمد</button>'+
 '<button type="button" class="u-button subtle small" data-u-dismiss="'+esc(x.category)+'" aria-label="تجاهل اقتراح '+esc(x.category)+'">تجاهل</button></div></div>').join(""):
 '<div class="u-empty"><b>لا توجد اقتراحات كافية بعد</b><p>بنحتاج شهرين مكتملين على الأقل فيهما مصروفات فعلية، وتتكرر الفئة في شهرين منها. لا نخمن أرقام ميزانيتك.</p></div>')+
 '</section>'+
 '<section class="u-panel"><div class="u-panel-head"><div><small>ACTIVE CATEGORY LIMITS</small><h3>حدودك الحالية</h3></div>'+
 '<span class="u-subtle">'+all.length+' فئة</span></div>'+
 (all.length?all.map(([cat,value])=>{
  const limit=n(value.amount),spent=m.categories.find(x=>x[0]===cat)?.[1]||0,progress=Math.round(spent/limit*100);
  return '<div class="u-budget-active"><div class="u-budget-top"><strong>'+esc(cat)+'</strong><span>'+
   money(spent)+' / '+money(limit)+'</span></div><div class="u-meter"><i class="'+(progress>=100?"over":"")+
   '" style="width:'+Math.min(100,progress)+'%"></i></div>'+
   '<small>'+(progress>100?"تجاوزت السقف بـ"+money(spent-limit):"استخدمت "+progress+"٪ من السقف")+'</small>'+
   '<form data-u-budget-form="'+esc(cat)+'"><label class="u-inline-edit">تعديل الحد الشهري'+
   '<input aria-label="حد '+esc(cat)+'" type="number" name="amount" min="50" max="1000000" step="1" value="'+limit+'" required></label>'+
   '<div class="u-inline-actions"><button type="submit" class="u-button ghost small">حفظ</button>'+
   '<button type="button" class="u-button subtle small" data-u-remove="'+esc(cat)+'">إزالة الحد</button></div></form></div>';
 }).join(""):'<div class="u-empty"><b>مافيش سقوف فئات مفعّلة</b><p>اعتمد اقتراحًا من القائمة لتشوف تقدم الفئة كل شهر.</p></div>')+
 '</section></div>'+
 '<p class="u-disclaimer">الحدود دي للتنبيه والمتابعة فقط؛ لا تضاعف خصم الإيجار والفواتير من Safe to Spend ولا تغير ميزانيتك الأساسية تلقائيًا.</p>';
}
function acceptBudget(category){
 const suggestion=suggestions().find(x=>x.category===category);
 if(!suggestion)return false;
 C.mutate(s=>{
  if(!s.elevate)s.elevate={};if(!s.elevate.categoryBudgets)s.elevate.categoryBudgets={};
  s.elevate.categoryBudgets[category]={amount:suggestion.target,updatedAt:new Date().toISOString(),source:"historical-proposal"};
 });
 C.toast("تم اعتماد سقف "+category+" — للمتابعة وليس خصمًا ثانيًا من الرصيد");
 return true;
}
function currentWealth(){
 try{
  const m=w.FLOSY_PRO?.metrics?.();
  if(m&&Number.isFinite(m.net))return {net:m.net,cash:m.cash,portfolio:m.portfolio?.market,other:m.other,debt:m.debt};
 }catch{}
 try{
  const v=w.FLOSY_V4_WEALTH?.wealthSummary?.();
  if(v&&Number.isFinite(v.net))return {net:v.net,cash:v.cash,portfolio:v.invest,other:v.manual,debt:v.debt};
 }catch{}
 return null;
}
function wealthSnapshots(){
 return (Array.isArray(prefs().wealthHistory)?prefs().wealthHistory:[])
  .filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||"")&&Number.isFinite(x.net))
  .sort((a,b)=>a.date.localeCompare(b.date));
}
function chart(points){
 if(points.length<2)return'<div class="u-empty">احتفظ بلقطتين حقيقيتين في تاريخين مختلفين لعرض اتجاه صافي الثروة بدون رسم تاريخ افتراضي.</div>';
 const vals=points.map(x=>x.net),min=Math.min(...vals),max=Math.max(...vals),spread=Math.max(1,max-min);
 const xy=points.map((x,i)=>[
  20+(i/(points.length-1))*600,
  170-((x.net-min)/spread)*120
 ]);
 const path=xy.map(([x,y],i)=>(i?"L":"M")+x.toFixed(1)+","+y.toFixed(1)).join(" ");
 const fill=path+" L620,186 L20,186 Z";
 return '<svg class="u-trend-chart" viewBox="0 0 640 215" role="img" aria-label="رسم تطور صافي الثروة من لقطات المستخدم المسجلة">'+
 '<defs><linearGradient id="u-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#38AFA0" stop-opacity=".22"/>'+
 '<stop offset="1" stop-color="#38AFA0" stop-opacity="0"/></linearGradient></defs>'+
 '<path d="'+fill+'" fill="url(#u-chart-fill)"/><path d="'+path+'" stroke="#087E78" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
 xy.map(([x,y])=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="#087E78" stroke="#FFF" stroke-width="2"/>').join("")+
 '<text x="20" y="208" text-anchor="start">'+esc(shortDate(points[0].date))+'</text>'+
 '<text x="620" y="208" text-anchor="end">'+esc(shortDate(points.at(-1).date))+'</text></svg>';
}
function wealthPage(){
 const root=E("flosyElevateWealth");if(!root)return;
 const current=currentWealth(),shots=wealthSnapshots(),today=now();
 const cut=wealthSpan==="all"?"0000-01-01":localDay(new Date(today.getFullYear(),
  today.getMonth()-(wealthSpan==="1m"?1:wealthSpan==="3m"?3:12),today.getDate(),12));
 const subset=shots.filter(x=>x.date>=cut);
 const latest=shots.at(-1),first=subset[0],last=subset.at(-1);
 const delta=first&&last&&first!==last?last.net-first.net:null;
 root.innerHTML='<div class="u-section-head"><div><span class="u-eyebrow">WEALTH JOURNAL</span>'+
 '<h2>تاريخ ثروتك الحقيقي</h2><p>سجل لقطات يدوية على فترات؛ من غير رسوم خيالية لأسعار استثمار أو ذهب غير موثقة.</p></div>'+
 '<button class="u-button solid" type="button" data-u-snapshot '+(!current?'disabled':'')+'>＋ سجّل لقطة اليوم</button></div>'+
 '<section class="u-panel u-wealth-panel"><div class="u-networth-value"><span>صافي الثروة التقديري اليوم</span>'+
 '<strong class="v4-sensitive">'+(current?EGP(current.net):"غير متاح")+'</strong>'+
 '<small>'+(current?"النقد + قيمة ثاندر اليدوية + الأصول اليدوية − الديون":"أضف الأرصدة من صفحة الثروة أولًا")+'</small></div>'+
 '<div class="u-wealth-tabs" role="group" aria-label="الفترة الزمنية">'+
 [["1m","شهر"],["3m","3 شهور"],["1y","سنة"],["all","الكل"]].map(([key,label])=>
 '<button type="button" class="'+(wealthSpan===key?"active":"")+'" data-u-wealth="'+key+'">'+label+'</button>').join("")+'</div>'+
 '<div class="u-trend-shell">'+chart(subset)+'</div>'+
 '<div class="u-wealth-summary"><div><span>اللقطات المسجلة</span><b>'+shots.length+'</b></div>'+
 '<div><span>التغير خلال الفترة من اللقطات</span><b class="'+(delta!==null&&delta<0?"u-negative":"")+'">'+
 (delta===null?"بيانات غير كافية":money(delta))+'</b></div></div>'+
 '<p class="u-disclaimer">لا تُنشأ لقطات تلقائية أو قيم تاريخية مُتخيلة. الأسعار اليدوية لا تعني أسعارًا لحظية. يمكن تحديث لقطة اليوم بعد تعديل بياناتك.</p></section>';
}
function render(){
 try{dashboard();transactionPage();budgetPage();wealthPage()}
 catch(err){console.error("Flosy Elevate:",err)}
}
function move(step){
 if(period==="day")anchor.setDate(anchor.getDate()+step);
 else if(period==="week")anchor.setDate(anchor.getDate()+step*7);
 else if(period==="month")anchor=new Date(anchor.getFullYear(),anchor.getMonth()+step,1,12);
 else anchor=new Date(anchor.getFullYear()+step,0,1,12);
 transactionPage();
}
document.addEventListener("click",event=>{
 const t=event.target.closest?.("[data-u-go],[data-u-period],[data-u-move],[data-u-wealth],[data-u-accept],[data-u-dismiss],[data-u-remove],[data-u-snapshot]");
 if(!t)return;
 if(t.dataset.uGo)return C.goto(t.dataset.uGo);
 if(t.dataset.uPeriod){period=t.dataset.uPeriod;transactionPage();return}
 if(t.dataset.uMove){move(Number(t.dataset.uMove));return}
 if(t.dataset.uWealth){wealthSpan=t.dataset.uWealth;wealthPage();return}
 if(t.dataset.uAccept){acceptBudget(t.dataset.uAccept);return}
 if(t.dataset.uDismiss){
  const cat=t.dataset.uDismiss;
  C.mutate(s=>{if(!s.elevate)s.elevate={};if(!s.elevate.dismissed)s.elevate.dismissed={};
   s.elevate.dismissed[cat]=monthKey(new Date())});
  return;
 }
 if(t.dataset.uRemove){
  const cat=t.dataset.uRemove;
  if(!confirm("هل تريد إلغاء سقف الفئة "+cat+"؟ لن تُحذف أي معاملة."))return;
  C.mutate(s=>{if(s.elevate?.categoryBudgets)delete s.elevate.categoryBudgets[cat]});
  return;
 }
 if(t.hasAttribute("data-u-snapshot")){
  const current=currentWealth();if(!current)return C.toast("راجع أرصدة حساباتك أولًا");
  const date=localDay(new Date());
  C.mutate(s=>{
   if(!s.elevate)s.elevate={};
   const old=Array.isArray(s.elevate.wealthHistory)?s.elevate.wealthHistory:[];
   s.elevate.wealthHistory=[...old.filter(x=>x.date!==date),{date,net:current.net,
    cash:current.cash,portfolio:current.portfolio,other:current.other,debt:current.debt}]
    .sort((a,b)=>a.date.localeCompare(b.date)).slice(-365);
  });
  C.toast("تم حفظ لقطة صافي الثروة لهذا اليوم. تحتاج يومين مختلفين لرسم اتجاه.");
 }
});
document.addEventListener("input",event=>{
 if(event.target?.id==="flosyElevateSearch"){search=String(event.target.value||"").slice(0,80);activityRows()}
});
document.addEventListener("change",event=>{
 if(event.target?.hasAttribute?.("data-u-kind")){kind=event.target.value;activityRows()}
 if(event.target?.hasAttribute?.("data-u-account")){selectedAccount=event.target.value;activityRows()}
});
document.addEventListener("submit",event=>{
 const f=event.target;
 if(!f?.hasAttribute?.("data-u-budget-form"))return;
 event.preventDefault();
 const cat=f.getAttribute("data-u-budget-form"),value=Number(new FormData(f).get("amount"));
 if(!Number.isFinite(value)||value<50||value>1000000)return C.toast("سقف الفئة يجب أن يكون بين 50 ومليون جنيه");
 C.mutate(s=>{if(!s.elevate)s.elevate={};if(!s.elevate.categoryBudgets)s.elevate.categoryBudgets={};
  s.elevate.categoryBudgets[cat]={amount:Math.round(value),updatedAt:new Date().toISOString(),source:"user"};
 });
 C.toast("تم تحديث سقف "+cat+" دون تغيير أرصدة حساباتك");
});
w.FLOSY_ELEVATE={render,suggestions,monthSummary,healthTasks,rangeFor,periodRows,
 acceptBudget,currentWealth,wealthSnapshots};
render();
})(window);
