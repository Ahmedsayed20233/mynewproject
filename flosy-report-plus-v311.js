/* Flosy v3.11 — auditable personal reporting, offline and canonical-ledger only.
 * Exports must be triggered by an actual owner click. No remote analytics.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_REPORT_PLUS_V311=api;})(typeof window!=="undefined"?window:null,function(){"use strict";
 const validStatus=new Set(["pending","failed","draft","reversed","cancelled","canceled","void","deleted","rejected"]);
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=c=>new Intl.NumberFormat("ar-EG",{minimumFractionDigits:0,maximumFractionDigits:2}).format((Number(c)||0)/100)+" ج.م";
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const asUTC=isoDate=>Date.parse(isoDate+"T12:00:00Z");
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))&&new Date(asUTC(s)).toISOString().startsWith(s);
 function daysBetween(a,b){return Math.round((asUTC(b)-asUTC(a))/86400000)+1}
 function dateOffset(s,days){const d=new Date(asUTC(s)+days*86400000);return d.toISOString().slice(0,10)}
 function rangeFor(preset,today=new Date(),all=[]){
  const t=typeof today==="string"?today:iso(today);if(!validDate(t))throw Error("تاريخ اليوم غير صالح");
  const y=+t.slice(0,4),m=+t.slice(5,7),day=+t.slice(8,10),finish=t;
  const periodStart=n=>{const d=new Date(y,m-1+n,1);return iso(d)};
  if(preset==="week")return {start:dateOffset(t,-6),end:finish};
  if(preset==="month")return {start:periodStart(0),end:finish};
  if(preset==="quarter")return {start:periodStart(-2),end:finish};
  if(preset==="half")return {start:periodStart(-5),end:finish};
  if(preset==="year")return {start:iso(new Date(y,0,1)),end:finish};
  if(preset==="lastyear")return {start:iso(new Date(y-1,0,1)),end:iso(new Date(y-1,11,31))};
  if(preset==="all"){
   const earliest=(Array.isArray(all)?all:[]).map(x=>String(x?.date||"").slice(0,10)).filter(validDate).sort()[0];
   return {start:earliest&&earliest<=t?earliest:periodStart(0),end:finish};
  }
  return {start:periodStart(0),end:finish};
 }
 function validate(options){
  const o=options||{},start=String(o.start||""),end=String(o.end||"");
  if(!validDate(start)||!validDate(end)||start>end)throw Error("تاريخ البداية أو النهاية غير صحيح");
  if(daysBetween(start,end)>3660)throw Error("المدة طويلة جدًا: الحد الأقصى 10 سنوات");
  const type=String(o.type||"all");
  if(!["all","expense","income","transfer"].includes(type))throw Error("نوع العملية غير معروف");
  return {start,end,type,accountId:String(o.accountId||"all"),category:String(o.category||"all")};
 }
 const accepted=tx=>tx&&!tx.deleted&&!tx.isDeleted&&!validStatus.has(String(tx.status||"").toLowerCase())&&
  ["income","expense","transfer"].includes(tx.type)&&
  Number.isFinite(Number(tx.amount))&&Number(tx.amount)>=0&&validDate(String(tx.date||"").slice(0,10));
 function filteredState(state,o){
  const options=validate(o);
  const t=(Array.isArray(state?.transactions)?state.transactions:[]).filter(tx=>{
   if(!accepted(tx))return false;
   const dt=String(tx.date).slice(0,10);
   if(dt<options.start||dt>options.end)return false;
   if(options.accountId!=="all"&&String(tx.accountId||tx.fromAccountId||tx.sourceAccountId||"")!==options.accountId)return false;
   if(options.type!=="all"&&tx.type!==options.type)return false;
   if(options.category!=="all"&&String(tx.category||"غير مصنف")!==options.category)return false;
   return true;
  });
  return {...state,transactions:t};
 }
 function build(state,o,kit){
  if(!kit?.build)throw Error("محرك تقارير Flosy الأساسي غير متاح");
  const options=validate(o);
  const selected=filteredState(state,options);
  const r=kit.build(selected,{start:options.start,end:options.end});
  const len=daysBetween(options.start,options.end);
  const priorEnd=dateOffset(options.start,-1),priorStart=dateOffset(priorEnd,-len+1);
  const prior=kit.build(filteredState(state,{...options,start:priorStart,end:priorEnd}),
    {start:priorStart,end:priorEnd});
  const trend=new Map();
  const cur=new Date(Date.UTC(+options.start.slice(0,4),+options.start.slice(5,7)-1,1));
  const end=new Date(Date.UTC(+options.end.slice(0,4),+options.end.slice(5,7)-1,1));
  let ticks=0;
  while(cur<=end&&ticks++<121){
   const key=cur.toISOString().slice(0,7);trend.set(key,{month:key,income:0,expense:0,net:0,count:0});
   cur.setUTCMonth(cur.getUTCMonth()+1);
  }
  for(const x of r.rows){
   const t=trend.get(x.date.slice(0,7));if(!t)continue;
   t.count++;if(x.type==="expense")t.expense+=x.cents;
   if(x.type==="income")t.income+=x.cents;
  }
  for(const t of trend.values())t.net=t.income-t.expense;
  const timeline=[...trend.values()];
  const priorVal=prior.expense;
  const expenseChange=r.expense-priorVal;
  const rate=priorVal>0?Math.round(expenseChange/priorVal*1000)/10:null;
  const activeDays=new Set(r.rows.filter(x=>x.type==="expense").map(x=>x.date)).size;
  const allTimeDays=daysBetween(options.start,options.end);
  const mean=allTimeDays>0?Math.round(r.expense/allTimeDays):0;
  const avgActive=activeDays?Math.round(r.expense/activeDays):0;
  const maxExpense=r.rows.filter(x=>x.type==="expense").sort((a,b)=>b.cents-a.cents)[0]||null;
  const savingRate=r.income>0?Math.round(r.net/r.income*1000)/10:null;
  const ratio=r.income>0?Math.round(r.expense/r.income*1000)/10:null;
  const filters={...options};
  const comparison={start:priorStart,end:priorEnd,income:prior.income,expense:prior.expense,net:prior.net,
   expenseChange,expenseChangePercent:rate,previousCount:prior.rows.length};
  const budgetRows=Array.isArray(state?.settings?.categoryBudgets)?state.settings.categoryBudgets:[];
  const isThisMonth=options.start.slice(0,7)===options.end.slice(0,7)&&
    options.start.endsWith("-01")&&options.type==="all"&&options.accountId==="all";
  const budgets=isThisMonth?budgetRows.map(b=>{
   const actual=r.categories.find(x=>x.name===String(b.name))?.value||0;
   const limit=Number(b.limit);
   if(!(limit>0)||!Number.isFinite(limit))return null;
   return {name:String(b.name),limit:Math.round(limit*100),spent:actual,
    percent:Math.round(actual/limit/100*100),remaining:Math.round(limit*100)-actual};
  }).filter(Boolean):[];
  const insights=[...r.advice];
  if(r.rows.length&&!prior.rows.length)insights.push("لا توجد معاملات في الفترة السابقة للمقارنة؛ لا يمكن تقدير التغير بدقة.");
  if(r.rows.length&&prior.rows.length&&rate!==null&&rate>20)
   insights.push("زادت مصروفاتك المسجلة "+rate+"٪ مقارنة بمدة سابقة مساوية؛ راجع أكبر الفئات لمعرفة السبب.");
  if(budgets.some(b=>b.spent>b.limit))insights.push("توجد فئات تجاوزت ميزانيتها المسجلة لهذا الشهر؛ راجعها قبل إضافة مصروفات اختيارية.");
  const result={...r,range:{start:options.start,end:options.end},filters,
   timeline,comparison,budgets,insights,days:len,dailyAverage:mean,activeDayAverage:avgActive,
   activeDays,maxExpense,savingsRatioPrecise:savingRate,expenseIncomeRatio:ratio,
   itemCount:r.rows.length,generatedAt:new Date().toISOString(),version:"3.11.0"};
  return result;
 }
 function csvCell(value){
  let s=String(value??"").replace(/\r?\n/g," ");
  if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 }
 function csvText(r){
  const grid=[["التاريخ","النوع","الفئة","الوصف","الحساب","المبلغ بالجنيه","معرف العملية"],
   ...r.rows.map(x=>[x.date,x.type,x.category,x.description,x.account,(x.cents/100).toFixed(2),x.id])];
  return "\uFEFF"+grid.map(a=>a.map(csvCell).join(",")).join("\r\n")+"\r\n";
 }
 function csvBytes(r){return new TextEncoder().encode(csvText(r))}
 const formats={pdf:"PDF",xlsx:"Excel XLSX",csv:"CSV"};
 function controls(state,date=new Date()){
  const t=typeof date==="string"?date:iso(date),options=rangeFor("month",t,state?.transactions||[]);
  const accounts=(Array.isArray(state?.accounts)?state.accounts:[]).filter(a=>a?.id);
  const cats=[...new Set((state?.transactions||[]).filter(accepted).map(x=>String(x.category||"غير مصنف")))].sort();
  return '<div class="flosy-report-ui-v311" dir="rtl">'+
   '<header class="report311-hero"><div><small>FLOSY • FINANCIAL INTELLIGENCE</small><h2>تقاريري المالية</h2>'+
   '<p>تقرير قابل للتخصيص من معاملاتك الحقيقية، بدون رفع بياناتك لأي خدمة.</p></div>'+
   '<span aria-hidden="true">▤</span></header>'+
   '<div class="report311-presets" role="group" aria-label="الفترة الزمنية">'+
   [["week","7 أيام"],["month","هذا الشهر"],["quarter","3 شهور"],["half","6 شهور"],["year","هذه السنة"],["lastyear","السنة الماضية"],["all","الكل"]].map(p=>
    '<button type="button" data-report-preset="'+p[0]+'"'+(p[0]==="month"?' aria-pressed="true"':'')+'>'+p[1]+'</button>').join("")+'</div>'+
   '<div class="report311-filters"><label>من<input id="flosyReportFrom" type="date" value="'+options.start+'"></label>'+
   '<label>إلى<input id="flosyReportTo" type="date" value="'+options.end+'"></label>'+
   '<label>الحساب<select id="flosyReportAccount"><option value="all">كل الحسابات</option>'+
   accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name||"حساب")+'</option>').join("")+'</select></label>'+
   '<label>الفئة<select id="flosyReportCategory"><option value="all">كل الفئات</option>'+
   cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("")+'</select></label>'+
   '<label>النوع<select id="flosyReportType"><option value="all">كل العمليات</option><option value="expense">المصروفات</option>'+
   '<option value="income">الدخل</option><option value="transfer">التحويلات</option></select></label></div>'+
   '<div class="report311-files" aria-label="تنزيل التقارير">'+
   '<button type="button" data-flosy-action="report" data-kind="pdf"><strong>PDF</strong><small>تقرير احترافي</small></button>'+
   '<button type="button" data-flosy-action="report" data-kind="excel"><strong>Excel</strong><small>شيتات قابلة للتحليل</small></button>'+
   '<button type="button" data-flosy-action="report" data-kind="csv"><strong>CSV</strong><small>بيانات منظّمة</small></button></div>'+
   '<div id="flosyReportStatus" role="status" aria-live="polite">حدد الفترة ثم اختر صيغة الملف؛ على Android ستفتح نافذة اختيار مكان الحفظ.</div>'+
   '<section id="flosyReportLivePreview" aria-label="معاينة التقرير" aria-live="polite"></section>'+
   '</div>';
 }
 function preview(r){
  const percent=(n,d)=>d>0?(100*n/d).toFixed(1)+"%":"—";
  const kpi=(label,value,desc="")=>'<div class="report311-kpi"><span>'+esc(label)+'</span><strong>'+
   esc(value)+'</strong><small>'+esc(desc)+'</small></div>';
  const max=Math.max(1,...r.categories.map(x=>x.value));
  const maxMonth=Math.max(1,...r.timeline.map(x=>x.expense));
  const trends=r.timeline.slice(-12).map(t=>'<div class="report311-month"><span>'+esc(t.month)+'</span>'+
   '<div class="report311-track"><i style="width:'+Math.min(100,t.expense/maxMonth*100).toFixed(1)+'%"></i></div>'+
   '<b>'+esc(money(t.expense))+'</b></div>').join("");
  const categories=r.categories.slice(0,8).map(t=>'<div class="report311-month"><span>'+esc(t.name)+'</span>'+
   '<div class="report311-track"><i style="width:'+Math.min(100,t.value/max*100).toFixed(1)+'%"></i></div>'+
   '<b>'+esc(percent(t.value,r.expense))+'</b></div>').join("");
  const cmp=r.comparison,comparison=r.rows.length&&cmp.previousCount?
   (cmp.expenseChange>0?"زاد الإنفاق ":cmp.expenseChange<0?"انخفض الإنفاق ":"لم يتغير الإنفاق ")+
   esc(money(Math.abs(cmp.expenseChange)))+
   (cmp.expenseChangePercent===null?"":" ("+Math.abs(cmp.expenseChangePercent)+"٪)")+
   " مقارنة بالفترة السابقة المساوية":"لا توجد بيانات كافية للمقارنة مع الفترة السابقة";
  const budget=r.budgets.length?'<h3>الالتزام بالميزانيات</h3>'+r.budgets.map(b=>
   '<div class="report311-budget"><span>'+esc(b.name)+'</span><strong>'+esc(money(b.spent))+' / '+esc(money(b.limit))+
   '</strong><small>'+(b.remaining<0?"تجاوزت الحد بمقدار "+esc(money(-b.remaining)):"متبقي "+esc(money(b.remaining)))+
   '</small></div>').join(""):"";
  return '<div class="report311-kpis">'+
   kpi("إجمالي الدخل",money(r.income))+kpi("المصروفات",money(r.expense))+
   kpi("صافي التدفق",money(r.net),"الدخل - المصروفات")+
   kpi("معدل الادخار",r.savingsRatioPrecise===null?"غير متاح":r.savingsRatioPrecise+"٪")+
   kpi("متوسط المصروف اليومي",money(r.dailyAverage),"على أيام الفترة كلها")+
   kpi("عدد المعاملات",String(r.itemCount),"التحويلات لا تدخل في المصروف")+'</div>'+
   '<section class="report311-panel"><h3>مقارنة بالفترة السابقة</h3><p>'+comparison+'</p>'+
   '<small>الفترة السابقة: '+esc(cmp.start)+' حتى '+esc(cmp.end)+'. قد تختلف الفترتان موسميًا.</small></section>'+
   '<section class="report311-panel"><h3>توزيع المصروفات حسب الفئة</h3>'+
   (categories||'<p>لم تُسجّل مصروفات مطابقة للفلاتر.</p>')+'</section>'+
   '<section class="report311-panel"><h3>الاتجاه الشهري</h3>'+
   (trends||'<p>لا يوجد اتجاه شهري متاح.</p>')+'</section>'+
   (budget?'<section class="report311-panel">'+budget+'</section>':"")+
   '<section class="report311-panel"><h3>ملاحظات مالية قابلة للتنفيذ</h3><ul>'+
   r.insights.slice(0,6).map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></section>'+
   '<div class="report311-footer">المعلومات معتمدة على ما سُجّل في Flosy وليست كشف حساب بنكي. لا يتم إدراج المعاملات المعلقة أو الملغاة.</div>';
 }
 function currentFilters(){
  if(typeof document==="undefined")throw Error("لا توجد واجهة تقرير مفتوحة");
  const x=id=>document.getElementById(id)?.value;
  return validate({start:x("flosyReportFrom"),end:x("flosyReportTo"),type:x("flosyReportType")||"all",
   category:x("flosyReportCategory")||"all",accountId:x("flosyReportAccount")||"all"});
 }
 function mount(box){
  if(!box||typeof window==="undefined")return;
  const api=window.FLOSY_UNIFIED,kit=api?.core()?.FLOSY_REPORT_KIT;
  if(!api?.state||!kit?.build)return;
  box.innerHTML=controls(api.state(),api.date());
  const output=box.querySelector("#flosyReportLivePreview");
  const status=box.querySelector("#flosyReportStatus");
  function refresh(){
   try{const r=build(api.state(),currentFilters(),kit);
    output.innerHTML=preview(r);
    if(status){status.textContent="تم تحديث المعاينة من بياناتك المسجلة. جاهز للتنزيل.";status.dataset.error="false"}
   }catch(e){output.innerHTML='<p role="alert">'+esc(e.message||"تعذّر إعداد التقرير")+'</p>';
    if(status){status.textContent="راجع الفترة أو الفلاتر قبل التنزيل.";status.dataset.error="true"}}
  }
  box.querySelectorAll("input,select").forEach(n=>n.addEventListener("change",()=>{
   box.querySelectorAll("[data-report-preset]").forEach(b=>b.setAttribute("aria-pressed","false"));refresh();
  }));
  box.querySelectorAll("[data-report-preset]").forEach(b=>b.addEventListener("click",()=>{
   const dates=rangeFor(b.dataset.reportPreset,api.date(),api.state().transactions||[]);
   box.querySelector("#flosyReportFrom").value=dates.start;
   box.querySelector("#flosyReportTo").value=dates.end;
   box.querySelectorAll("[data-report-preset]").forEach(el=>el.setAttribute("aria-pressed",String(el===b)));
   refresh();
  }));
  refresh();
 }
 return {build,filteredState,rangeFor,validate,csvText,csvBytes,controls,preview,mount,
  currentFilters,version:"3.11.0"};
});