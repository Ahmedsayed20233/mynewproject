/* Flosy Phase 1 — Safe-to-Spend, obligations, debts and 90-day forecast.
   Informational accounting. No bank connection, transfer, auto-pay, or investment orders. */
(function(global){
"use strict";
const C=global.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id),S=()=>C.getState();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(num(v))+" ج.م";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():"p1"+Date.now().toString(36)+Math.random().toString(36).slice(2);
const now=()=>new Date().toISOString();
const utc=d=>new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
const dayISO=d=>[d.getUTCFullYear(),String(d.getUTCMonth()+1).padStart(2,"0"),String(d.getUTCDate()).padStart(2,"0")].join("-");
const fromISO=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(s)))return null;const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.valueOf())&&dayISO(d)===s?d:null};
const inc=(d,n)=>new Date(d.getTime()+n*86400000);
const ym=d=>dayISO(d).slice(0,7);
const monthDay=(year,month,day)=>new Date(Date.UTC(year,month,Math.min(Math.max(1,num(day)),new Date(Date.UTC(year,month+1,0)).getUTCDate())));
const fmtDate=s=>fromISO(s)?new Date(s+"T12:00:00Z").toLocaleDateString("ar-EG",{day:"numeric",month:"short",year:"numeric"}):s;
const catFixed=c=>c==="إيجار"||String(c||"").startsWith("فاتورة")||c==="فواتير";
function init(){
 const s=S();if(!s.phase1||typeof s.phase1!=="object"){s.phase1={salaryDay:1,buffer:1000,includeSalaryForecast:true,oneOff:[],payments:[]};C.persistInitial()}
 const p=s.phase1;if(!Array.isArray(p.oneOff))p.oneOff=[];if(!Array.isArray(p.payments))p.payments=[];
}
function settings(){const p=S().phase1||{};return {salaryDay:Math.max(1,Math.min(28,Math.round(num(p.salaryDay)||1))),buffer:Math.max(0,num(p.buffer)),includeSalaryForecast:p.includeSalaryForecast!==false}}
function accounts(){try{return global.FLOSY_PRO?.rowsForAccounts?.()||{}}catch{return{}}}
function freeCash(){
 const ids=new Map((S().accounts||[]).map(x=>[x.id,x]));
 const b=accounts();let total=0,components=[];
 for(const [id,amount] of Object.entries(b)){
  const acc=ids.get(id)||{};
  if(["emergency","reserve","thndr"].includes(id)||["emergency","reserve","thndr"].includes(acc.type))continue;
  // Other physical cash accounts can count as available only if user explicitly created them.
  total+=num(amount);components.push({id,name:acc.name||id,amount:num(amount)});
 }
 return {total,components};
}
function salaryCycle(today,pref=settings()){
 let d=today,day=pref.salaryDay;
 let thisPay=monthDay(d.getUTCFullYear(),d.getUTCMonth(),day);
 if(thisPay>d)thisPay=monthDay(d.getUTCFullYear(),d.getUTCMonth()-1,day);
 let next=monthDay(thisPay.getUTCFullYear(),thisPay.getUTCMonth()+1,day);
 return {start:thisPay,next,days:Math.max(1,Math.round((next-d)/86400000))};
}
function hasPayment(key){return (S().phase1?.payments||[]).some(x=>x.key===key&&x.status==="paid")}
function existingExpenseFor(x){
 return (S().transactions||[]).some(t=>
   t.type==="expense"&&t.relatedCommitmentKey===x.key);
}
function occurrences(start,end){
 const s=S(),rows=[],recurring=s.next?.recurring||[],debts=s.liabilities||[],oneOff=s.phase1?.oneOff||[];
 const minMonth=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),1));
 const endMonth=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),1));
 for(let d=minMonth;d<=endMonth;d=monthDay(d.getUTCFullYear(),d.getUTCMonth()+1,1)){
  for(const x of recurring){
   if(!x?.id||num(x.amount)<=0)continue;
   let due=monthDay(d.getUTCFullYear(),d.getUTCMonth(),x.day||1),date=dayISO(due),key="bill/"+x.id+"/"+ym(due);
   if(due>end)continue;
   if(due<start&&ym(due)!==ym(start))continue;
   rows.push({key,source:"bill",id:x.id,name:x.name||x.category||"فاتورة",amount:num(x.amount),category:x.category||"فواتير",date,paid:hasPayment(key),linked:existingExpenseFor({key})});
  }
  for(const x of debts){
   const payment=num(x.installment),balance=num(x.balance);
   if(!x?.id||payment<=0||balance<=0||!x.dueDay)continue;
   let due=monthDay(d.getUTCFullYear(),d.getUTCMonth(),x.dueDay),date=dayISO(due),key="debt/"+x.id+"/"+ym(due);
   if(due>end)continue;if(due<start&&ym(due)!==ym(start))continue;
   rows.push({key,source:"debt",id:x.id,name:x.name||"قسط",amount:Math.min(balance,payment),category:"أقساط",date,paid:hasPayment(key),linked:existingExpenseFor({key})});
  }
 }
 for(const x of oneOff){
  if(!x?.id||!fromISO(x.dueDate)||num(x.amount)<=0)continue;
  const date=x.dueDate,key="oneoff/"+x.id;
  if(date>dayISO(end))continue;
  if(date<dayISO(start)&&ym(fromISO(date))!==ym(start))continue;
  rows.push({key,source:"oneoff",id:x.id,name:x.name||"مصاريف قادمة",amount:num(x.amount),category:x.category||"معيشة أخرى",date,paid:hasPayment(key),linked:existingExpenseFor({key})});
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}
function unpaid(rows){return rows.filter(x=>!x.paid&&!x.linked)}
function actualSpent(from,to){
 return (S().transactions||[]).filter(x=>x.type==="expense"&&typeof x.date==="string"&&x.date>=dayISO(from)&&x.date<=dayISO(to))
}
function calculate(today=utc(new Date())){
 const p=settings(),s=S().settings||{},cycle=salaryCycle(today,p),balance=freeCash();
 const end=inc(cycle.next,-1),trs=actualSpent(cycle.start,today);
 const variableSpent=trs.filter(t=>!catFixed(t.category)).reduce((a,t)=>a+num(t.amount),0);
 const fixedSpent=trs.filter(t=>catFixed(t.category)).reduce((a,t)=>a+num(t.amount),0);
 const variableLeft=Math.max(0,num(s.living)-variableSpent);
 const fixedLeft=Math.max(0,num(s.rent)+num(s.bills)-fixedSpent);
 const due=unpaid(occurrences(today,end));
 const fixedDue=due.filter(x=>catFixed(x.category)).reduce((a,t)=>a+t.amount,0);
 const reservedFixed=Math.max(0,fixedLeft-fixedDue);
 const obligations=due.reduce((a,x)=>a+x.amount,0);
 const final=balance.total-obligations-reservedFixed-variableLeft-p.buffer;
 const safe=Math.max(0,final);
 return {freeCash:balance.total,components:balance.components,cycle,days:cycle.days,obligations,scheduled:due,
   fixedRemaining:reservedFixed,variableRemaining:variableLeft,buffer:p.buffer,
   safe,deficit:Math.max(0,-final),daily:safe/cycle.days};
}
function forecast(today=utc(new Date()),days=90){
 const s=S().settings||{},p=settings(),starting=freeCash(),cycle=salaryCycle(today,p);
 const end=inc(today,days),events=unpaid(occurrences(today,end));
 const byDate=new Map();
 for(const ev of events){const d=ev.date<=dayISO(today)?dayISO(inc(today,1)):ev.date;byDate.set(d,(byDate.get(d)||0)+ev.amount)}
 // Forecast salary is explicitly a scenario, never actual recorded income.
 let projection=starting.total,results=[{day:0,date:dayISO(today),value:projection}],minValue=projection;
 for(let n=1;n<=days;n++){
  const d=inc(today,n),dstr=dayISO(d),monthLen=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  const monthDue=events.filter(x=>x.date.startsWith(ym(d))&&catFixed(x.category)).reduce((a,x)=>a+x.amount,0);
  const fixedPerDay=Math.max(0,num(s.rent)+num(s.bills)-monthDue)/monthLen;
  const variablePerDay=Math.max(0,num(s.living))/monthLen;
  const salary=p.includeSalaryForecast&&d.getUTCDate()===p.salaryDay?num(s.salary):0;
  projection+=salary-variablePerDay-fixedPerDay-(byDate.get(dstr)||0);
  minValue=Math.min(minValue,projection);
  if([7,14,30,60,90].includes(n))results.push({day:n,date:dstr,value:projection});
 }
 return {starting:starting.total,results,minValue,events,salaryIncluded:p.includeSalaryForecast};
}
function lineRows(data){
 if(!data.length)return '<p class="f2-small">لا توجد التزامات مسجلة.</p>';
 return '<div class="f2-tablewrap"><table class="f2-table"><thead><tr><th>الاستحقاق</th><th>الالتزام</th><th>القيمة</th><th>الحالة</th><th></th></tr></thead><tbody>'+
 data.map(x=>'<tr><td>'+fmtDate(x.date)+'</td><td>'+esc(x.name)+'<br><span class="f2-small">'+esc(x.category)+'</span></td><td>'+money(x.amount)+'</td><td>'+(x.paid||x.linked?'تم التعليم / ربط معاملة':'قادم')+'</td><td>'+
 '<button class="f2-toolbutton" type="button" data-phase1="toggle-paid" data-key="'+esc(x.key)+'">'+(x.paid?'تراجع':'تعليم كمدفوع')+'</button></td></tr>').join("")+
 '</tbody></table></div>';
}
function dashboard(){
 const host=E("phase1Home");if(!host)return;
 const v=calculate(),f=forecast(),balance=v.freeCash,percent=balance>0?Math.min(100,Math.max(0,100*v.safe/balance)):0;
 host.innerHTML='<div class="f2-card" style="margin-bottom:15px">'+
 '<div class="f2-head"><h3>فلوسي الآمنة للصرف · Safe to Spend</h3><button type="button" class="f2-toolbutton primary" data-go="phase1">التفاصيل والتوقعات</button></div>'+
 '<div class="f2-kpis" style="margin-bottom:10px"><div class="f2-kpi f2-positive"><small>إضافي آمن للصرف حتى المرتب</small><strong>'+money(v.safe)+'</strong><em>بعد الاحتياجات والالتزامات المحجوزة</em></div>'+
 '<div class="f2-kpi"><small>متاح إضافي يوميًا</small><strong>'+money(v.daily)+'</strong><em>لمدة '+v.days+' يومًا حتى المرتب المخطط</em></div>'+
 '<div class="f2-kpi"><small>المستحقات القادمة</small><strong>'+money(v.obligations+v.fixedRemaining)+'</strong><em>قائمة الاستحقاقات والميزانية الثابتة</em></div>'+
 '<div class="f2-kpi"><small>عجز احتياطي متوقع</small><strong>'+money(v.deficit)+'</strong><em>تقدير محافظ حسب بياناتك</em></div></div>'+
 '<div class="f2-progress"><i style="width:'+percent+'%"></i></div>'+
 '<p class="f2-small" style="margin:10px 0 0">لا يشمل ثاندر والطوارئ والاحتياطي؛ لا يعد الرصيد المتاح صلاحية للإنفاق الفعلي من البنك. الحساب يتطلب مطابقة الأرصدة وتحديث الفواتير.</p></div>';
}
function page(){
 const host=E("phase1Root");if(!host)return;const v=calculate(),f=forecast(),p=settings();
 const upcoming=occurrences(utc(new Date()),inc(utc(new Date()),90));
 host.innerHTML='<div class="f2-header"><div><span class="f2-pill">✦ FLOSY · MONEY CONTROL</span><h2>فلوسي الآمنة وخطة الـ90 يوم</h2><p>التزاماتك، أقساطك، وصورتك النقدية القادمة في مكان واحد — بتقديرات معلنة وقابلة للمراجعة.</p></div></div>'+
 '<div class="f2-kpis">'+
 '<div class="f2-kpi"><small>الأرصدة النقدية الحرة المسجلة</small><strong>'+money(v.freeCash)+'</strong><em>بدون الطوارئ وثاندر والاحتياطي</em></div>'+
 '<div class="f2-kpi"><small>مستحقات قبل المرتب</small><strong>'+money(v.obligations+v.fixedRemaining)+'</strong><em>فواتير وأقساط واحتياجات ثابتة متبقية</em></div>'+
 '<div class="f2-kpi"><small>احتياجات معيشية متبقية</small><strong>'+money(v.variableRemaining)+'</strong><em>ميزانية المعيشة ناقص المصروف المسجل</em></div>'+
 '<div class="f2-kpi f2-positive"><small>مبلغ إضافي آمن للصرف</small><strong>'+money(v.safe)+'</strong><em>معدل يومي '+money(v.daily)+'</em></div></div>'+
 (v.deficit>0?'<div class="f2-warning">تنبيه: هناك عجز مبدئي قدره '+money(v.deficit)+' قبل المرتب. لا تعتمد على الاستثمار أو الطوارئ كمصروف اعتيادي، وراجع التزاماتك.</div>':'')+
 '<div class="f2-grid">'+
 '<div class="f2-card f2-span-4"><h3>إعدادات الحساب</h3><form id="p1-settings" class="f2-inputs">'+
 '<label>يوم القبض من الشهر (1–28)<input name="salaryDay" type="number" min="1" max="28" value="'+p.salaryDay+'" required></label>'+
 '<label>هامش أمان إضافي (ج.م)<input name="buffer" type="number" min="0" step="1" value="'+p.buffer+'" required></label>'+
 '<label class="full">إضافة المرتب المخطط للتوقع<select name="salary"><option value="1" '+(p.includeSalaryForecast?'selected':'')+'>نعم — افتراض فقط</option><option value="0" '+(!p.includeSalaryForecast?'selected':'')+'>لا — توقع متحفظ جدًا</option></select></label>'+
 '<button class="f2-toolbutton primary full" type="submit">حفظ الإعدادات</button></form>'+
 '<p>لتجنب مضاعفة رصيد الطوارئ، لن يحسب Flosy المبالغ المحولة لحساب طوارئ مستقل ضمن النقد المسموح بالصرف.</p></div>'+
 '<div class="f2-card f2-span-8"><div class="f2-head"><h3>توقع الرصيد النقدي خلال 90 يومًا</h3><span class="f2-tag">'+(f.salaryIncluded?'يتضمن المرتبات المخططة':'دون المرتبات المستقبلية')+'</span></div>'+
 '<div class="f2-tablewrap"><table class="f2-table"><thead><tr><th>الوقت</th><th>التاريخ</th><th>الرصيد المتوقع</th></tr></thead><tbody>'+
 f.results.map(x=>'<tr><td>'+(!x.day?'اليوم':'بعد '+x.day+' يوم')+'</td><td>'+fmtDate(x.date)+'</td><td style="color:'+(x.value<0?'#db6372':'inherit')+'">'+money(x.value)+'</td></tr>').join("")+'</tbody></table></div>'+
 '<p>أقل رصيد في سيناريو الـ90 يوم: <strong>'+money(f.minValue)+'</strong>. الحساب افتراضي، ويفترض صرف ميزانية المعيشة والفواتير بالتساوي، ويعرض المرتب المتوقع كافتراض لا كتدفق مؤكد.</p></div>'+
 '<div class="f2-card f2-span-6"><h3>أضف مصروفًا أو التزامًا لمرة واحدة</h3><form id="p1-oneoff" class="f2-inputs">'+
 '<label class="full">الوصف<input name="name" maxlength="70" placeholder="صيانة الشقة / كشف طبي" required></label>'+
 '<label>المبلغ المتوقع<input type="number" name="amount" min="0.01" step="any" required></label>'+
 '<label>تاريخ الاستحقاق<input name="dueDate" type="date" required value="'+dayISO(utc(new Date()))+'"></label>'+
 '<button class="f2-toolbutton primary full" type="submit">إضافة التزام قادم</button></form>'+
 '<p>لن يُسجل تلقائيًا كمعاملة مصروف. عند دفعه فعلًا سجّل المصروف ثم علِّم الالتزام مدفوعًا.</p></div>'+
 '<div class="f2-card f2-span-6"><h3>إدارة الديون والأقساط</h3><form id="p1-debt" class="f2-inputs">'+
 '<label class="full">الجهة / وصف الدين<input name="name" maxlength="70" placeholder="قسط جهاز أو قرض" required></label>'+
 '<label>المتبقي من الدين بالجنيه<input type="number" name="balance" min="0.01" step="any" required></label>'+
 '<label>قيمة القسط الشهري<input type="number" name="installment" min="0.01" step="any" required></label>'+
 '<label>يوم استحقاق القسط<input type="number" name="dueDay" min="1" max="28" required></label>'+
 '<button class="f2-toolbutton primary full" type="submit">تسجيل دين وجدول أقساطه</button></form>'+
 '<p>ديونك القديمة ضمن «كل أموالي» تظل محفوظة. عند السداد، حدّث الرصيد المتبقي ولا تسجل القسط مرتين.</p></div>'+
 '<div class="f2-card f2-span-12"><div class="f2-head"><h3>جدول الالتزامات والفواتير والأقساط</h3><span class="f2-tag">القادم خلال 90 يومًا</span></div>'+lineRows(upcoming)+
 '<p>يمكن إعداد الفواتير الشهرية من صفحة «الفواتير المتكررة». «تعليم كمدفوع» لتتبع الالتزام فقط؛ لا يخصم من حسابك ولا ينشئ معاملة مالية.</p></div>'+
 '<div class="f2-card f2-span-12"><div class="f2-head"><h3>الديون المسجلة</h3></div>'+
 ((S().liabilities||[]).length
 ?(S().liabilities||[]).map(x=>'<div class="f2-list-item"><div><strong>'+esc(x.name)+'</strong><small>المتبقي: '+money(x.balance)+' · القسط: '+money(x.installment||0)+' · موعده: يوم '+esc(x.dueDay||"غير محدد")+'</small></div><button type="button" class="f2-toolbutton" data-phase1="edit-debt" data-id="'+esc(x.id)+'">تعديل الرصيد والقسط</button></div>').join("")
 :'<div class="f2-empty">لا توجد ديون مسجلة.</div>')+'</div></div>';
 // Conditional operator ends the composed string. Keep root as one document tree.
}
function render(){
 try{dashboard();page()}catch(e){console.error("Flosy phase1 error",e)}
}
function makePayment(key,paid){
 C.mutate(s=>{
  s.phase1.payments=s.phase1.payments||[];
  const removed=s.phase1.payments.filter(x=>x.key===key);
  s.phase1.payments=s.phase1.payments.filter(x=>x.key!==key);
  if(removed.length){s.deletedIds=s.deletedIds||[];removed.forEach(x=>s.deletedIds.push("payments/"+x.id))}
  if(paid)s.phase1.payments.push({id:uid(),key,status:"paid",updatedAt:now()});
 });
}
document.addEventListener("click",ev=>{
 const b=ev.target.closest("[data-phase1]");if(!b)return;
 const action=b.dataset.phase1;
 if(action==="toggle-paid"){
  const key=b.dataset.key,due=occurrences(inc(utc(new Date()),-40),inc(utc(new Date()),90)).find(x=>x.key===key);
  if(!due)return C.toast("لا يمكن تحديد الاستحقاق");
  if(!confirm((due.paid?"التراجع عن تعليم السداد؟":"هل سددت هذا الالتزام بالفعل؟ لن تُنشأ معاملة مالية.")+"\n"+due.name+" • "+money(due.amount)))return;
  makePayment(key,!due.paid);
  C.toast("تم تحديث حالة الالتزام");
 }
 if(action==="edit-debt"){
  const id=b.dataset.id,record=(S().liabilities||[]).find(x=>x.id===id);if(!record)return;
  const remain=prompt("المتبقي الحقيقي من الدين بالجنيه",String(record.balance||0));if(remain===null)return;
  const installment=prompt("القسط الشهري المتوقع بالجنيه",String(record.installment||0));if(installment===null)return;
  const dueDay=prompt("يوم الاستحقاق 1–28",String(record.dueDay||1));if(dueDay===null)return;
  const a=Number(remain),v=Number(installment),d=Number(dueDay);
  if(!Number.isFinite(a)||a<0||!Number.isFinite(v)||v<0||!Number.isInteger(d)||d<1||d>28)return C.toast("المدخلات غير صالحة");
  C.mutate(s=>{const x=s.liabilities.find(x=>x.id===id);if(x){x.balance=a;x.installment=v;x.dueDay=d;x.updatedAt=now()}});
 }
});
document.addEventListener("submit",e=>{
 if(!["p1-settings","p1-oneoff","p1-debt"].includes(e.target.id))return;
 e.preventDefault();const f=new FormData(e.target);
 if(e.target.id==="p1-settings"){
  const day=Number(f.get("salaryDay")),buffer=Number(f.get("buffer"));
  if(!Number.isInteger(day)||day<1||day>28||!Number.isFinite(buffer)||buffer<0)return C.toast("راجع إعدادات يوم المرتب والهامش");
  C.mutate(s=>Object.assign(s.phase1,{salaryDay:day,buffer,includeSalaryForecast:f.get("salary")==="1"}));
  C.toast("تم تحديث الحساب المالي");
 }
 if(e.target.id==="p1-oneoff"){
  const name=String(f.get("name")||"").trim(),amount=Number(f.get("amount")),dueDate=String(f.get("dueDate")||"");
  if(!name||!Number.isFinite(amount)||amount<=0||!fromISO(dueDate))return C.toast("راجع بيانات الالتزام");
  C.mutate(s=>s.phase1.oneOff.push({id:uid(),name:name.slice(0,70),amount,dueDate,category:"معيشة أخرى",createdAt:now(),updatedAt:now()}));
  C.toast("تمت إضافة الالتزام للمتابعة");
 }
 if(e.target.id==="p1-debt"){
  const name=String(f.get("name")||"").trim(),balance=Number(f.get("balance")),installment=Number(f.get("installment")),day=Number(f.get("dueDay"));
  if(!name||!Number.isFinite(balance)||balance<=0||!Number.isFinite(installment)||installment<=0||!Number.isInteger(day)||day<1||day>28)return C.toast("راجع بيانات الدين");
  C.mutate(s=>s.liabilities.push({id:uid(),name:name.slice(0,70),balance,installment,dueDay:day,createdAt:now(),updatedAt:now()}));
  C.toast("تمت إضافة جدول الأقساط");
 }
});
init();
global.FLOSY_PHASE1={calculate,forecast,occurrences,salaryCycle,render,freeCash,settings};
render();
})(window);