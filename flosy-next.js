/* Flosy 2.0: privacy-first bank-message review, smart budgets, recurring, rules, backups. */
(function(){
"use strict";
const C=window.FLOSY_BRIDGE;if(!C)return;
const $=id=>document.getElementById(id),S=()=>C.getState();
const esc=x=>String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(n)||0)+" ج.م";
const dateISO=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const uid=()=>crypto.randomUUID?crypto.randomUUID():"f2"+Date.now().toString(36)+Math.random().toString(36).slice(2);
const now=()=>new Date().toISOString();
const stat=(title,value,help,klass="")=>'<div class="f2-kpi '+klass+'"><small>'+esc(title)+'</small><strong class="f2-sensitive">'+money(value)+'</strong><em>'+esc(help)+'</em></div>';
const hdr=(title,subtitle="",action="")=>'<div class="f2-header"><div><span class="f2-pill">✦ FLO​SY 2.0 · smarter money</span><h2>'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div>'+action+'</div>';
const card=(body,span="12")=>'<div class="f2-card f2-span-'+span+'">'+body+'</div>';
const smBtn=(action,title,cls="")=>'<button type="button" class="f2-toolbutton '+cls+'" data-f2="'+action+'">'+esc(title)+'</button>';
const txs=()=>S().transactions||[];
const num=v=>Number(v)||0;
const txMonth=(dt,typ)=>txs().filter(t=>t.type===typ&&String(t.date).slice(0,7)===dt).reduce((a,t)=>a+num(t.amount),0);
const monthKey=(d=new Date())=>dateISO(d).slice(0,7);
const aList=()=>((S().accounts||[]).filter(a=>a&&a.id)).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join("");
const expenseCats=['طعام ومشروبات','ترفيه','إيجار','فواتير','فاتورة الإنترنت','فاتورة الكهرباء','فاتورة شحن رصيد','فاتورة الأنبوبة','فاتورة صيانة الشقة','مواصلات','مشتريات','الهدايا','صحة','تعليم','معيشة أخرى'];
const catOpts=()=>expenseCats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
const select=(id,label,options)=>'<label>'+esc(label)+'<select name="'+id+'">'+options+'</select></label>';
const input=(id,label,type="text",extra="")=>'<label>'+esc(label)+'<input name="'+id+'" type="'+type+'" '+extra+' required></label>';
const alert=(text,kind="info")=>'<div class="f2-'+kind+'">'+esc(text)+'</div>';
let draft=null,csvDrafts=[],lastBackupList=[],importStatus="",smsCandidates=[];
function ensure(){
  let s=S();
  if(!s.next||typeof s.next!=="object")s.next={recurring:[],rules:[],flexBudget:{target:0,carry:true},savedViews:[],version:2};
  if(!Array.isArray(s.next.recurring))s.next.recurring=[];
  if(!Array.isArray(s.next.rules))s.next.rules=[];
  if(!Array.isArray(s.next.savedViews))s.next.savedViews=[];
  if(!s.next.flexBudget)s.next.flexBudget={target:0,carry:true};
  C.persistInitial();
}
const F=()=>S().next;
function monthlyHistory(maxMonths=6){
 let today=new Date();let out=[];
 for(let n=maxMonths-1;n>=0;n--){
  let d=new Date(today.getFullYear(),today.getMonth()-n,1),k=monthKey(d);
  out.push({key:k,income:txMonth(k,"income"),expense:txMonth(k,"expense"),transfer:txMonth(k,"transfer")});
 }
 return out;
}
function changeFromLastMonth(){
 const x=monthlyHistory(2),a=x[0].expense,b=x[1].expense;
 return a>0?{percent:(b-a)/a*100,prior:a,current:b}:null;
}
function recurringDue(){
 const d=new Date(),result=[];
 for(const r of F().recurring){
  const day=Math.max(1,Math.min(31,num(r.day)||1));
  const y=d.getFullYear(),m=d.getMonth();
  let dayThis=Math.min(day,new Date(y,m+1,0).getDate());
  let due=new Date(y,m,dayThis);
  if(due<new Date(y,m,d.getDate())){
   due=new Date(y,m+1,Math.min(day,new Date(y,m+2,0).getDate()));
  }
  const diff=Math.round((new Date(due.getFullYear(),due.getMonth(),due.getDate())-new Date(y,m,d.getDate()))/86400000);
  const match=txs().some(t=>t.type==="expense"&&t.category===r.category&&String(t.date).slice(0,7)===monthKey(d)
    &&Math.abs(num(t.amount)-num(r.amount))<=Math.max(5,num(r.amount)*.03));
  result.push({...r,nextDate:dateISO(due),days:diff,likelyPaid:match});
 }
 return result.sort((a,b)=>a.days-b.days);
}
function rolloverBudget(){
 const prefs=F().flexBudget,target=num(prefs.target);
 const isFlexible=t=>t.type==="expense"&&t.category!=="إيجار"&&!["فواتير","فاتورة الإنترنت","فاتورة شحن رصيد","فاتورة الكهرباء","فاتورة الأنبوبة","فاتورة صيانة الشقة"].includes(t.category);
 let spentThis=txs().filter(t=>isFlexible(t)&&String(t.date).slice(0,7)===monthKey()).reduce((n,t)=>n+num(t.amount),0);
 let carried=0;
 if(prefs.carry){
  const hist=monthlyHistory(6),recorded=hist.slice(0,-1).filter(m=>txs().some(t=>isFlexible(t)&&String(t.date).slice(0,7)===m.key));
  recorded.forEach(m=>{
    const flexSpent=txs().filter(t=>isFlexible(t)&&String(t.date).slice(0,7)===m.key).reduce((a,t)=>a+num(t.amount),0);
    carried+=target-flexSpent;carried=Math.min(target*3,Math.max(-target,carried));
  });
 }
 return {target,carry:carried,available:target+carried,spent:spentThis,remaining:target+carried-spentThis};
}
function insights(){
 const s=S(),thisMonth=monthKey(),income=txMonth(thisMonth,"income"),spent=txMonth(thisMonth,"expense"),transfer=txMonth(thisMonth,"transfer"),budget=num(s.settings.rent)+num(s.settings.bills)+num(s.settings.living);
 const prev=changeFromLastMonth(),due=recurringDue(),risk=[];
 if(!C.getSession())risk.push("المزامنة السحابية غير مفعّلة. سجّل الدخول لحماية معاملاتك عند تغيير الهاتف.");
 if(spent>budget&&budget>0)risk.push("الإنفاق المسجل تجاوز حد الميزانية المقررة.");
 if(prev&&prev.percent>20)risk.push("مصروفاتك زادت "+Math.round(prev.percent)+"% مقارنة بالشهر السابق.");
 const upcoming=due.filter(x=>x.days<=7&&!x.likelyPaid);
 if(upcoming.length)risk.push(upcoming.length+" التزامات قادمة خلال 7 أيام. تأكد من السداد الفعلي.");
 let cash=null;
 if(window.FLOSY_PRO&&window.FLOSY_PRO.metrics){
  try{cash=window.FLOSY_PRO.metrics()}catch(e){}
 }
 return {income,spent,transfer,budget,prev,upcoming,risk,cash};
}
function miniChart(){
 let arr=monthlyHistory(6),max=Math.max(1,...arr.flatMap(x=>[x.income,x.expense]));
 return '<div class="f2-graph">'+arr.map(v=>'<div class="f2-graph-col"><i style="height:'+Math.max(2,100*v.income/max)+'%"></i><i style="height:'+Math.max(2,100*v.expense/max)+'%;background:#8eacc6"></i><label>'+esc(v.key.slice(5))+'</label></div>').join("")+'</div>'+
 '<div class="f2-legend"><span><i style="background:#159a8f"></i>دخل</span><span><i style="background:#8eacc6"></i>مصروفات</span></div>';
}
function renderHome(){
 let root=$("flosyNextHome");if(!root)return;let i=insights(),cash=i.cash?i.cash.net:0,rate=i.income>0?Math.round(Math.max(0,(i.income-i.spent)/i.income*100)):null;
 root.innerHTML=hdr("صباح الخير — إيدك على فلوسك","مركز التحكم: أولويات، تنبيهات، واستنتاجات مبنية على معاملاتك الفعلية.",'<button type="button" class="btn" data-go="smart">اكتشف تحليلاتك ✦</button>')+
 '<div class="f2-kpis">'+stat("صافي الثروة المقدر",cash,"حسابات + استثمارات − التزامات","f2-positive")+
 stat("دخل الشهر المسجل",i.income,"لا يُضاف الراتب تلقائيًا")+
 stat("مصروفات الشهر",i.spent,"من سجل المعاملات فقط")+
 stat("المتبقي من الميزانية",i.budget-i.spent,"الموازنة مقابل المصروف الفعلي",i.spent>i.budget?"f2-negative":"")+'</div>'+
 '<div class="f2-grid">'+
 card('<div class="f2-head"><h3>اتجاه التدفق النقدي</h3><small>آخر 6 أشهر</small></div>'+miniChart()+
 '<p>نسبة الادخار وفق الدخل المسجل: <strong>'+(rate===null?'—':rate+'%')+'</strong>. التحويلات بين الحسابات ليست مصروفًا استهلاكيًا.</p>',"8")+
 card('<div class="f2-head"><h3>الخطوة التالية</h3><small>ترتيب الأولويات</small></div>'+
 (i.risk.length?i.risk.slice(0,3).map(x=>'<div class="f2-warning">'+esc(x)+'</div>').join(""):alert("مؤشرات الميزانية الحالية تحت السيطرة وفق ما أدخلته.","success"))+
 '<div class="f2-btnrow">'+smBtn("go-import","استيراد رسالة أو CSV")+' '+smBtn("go-recovery","مركز حماية بياناتي")+'</div>',"4")+
 card('<div class="f2-head"><h3>التزامات قريبة</h3><small>المواعيد يدويًا</small></div>'+
 (i.upcoming.length?i.upcoming.slice(0,4).map(x=>'<div class="f2-list-item"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.nextDate)+' • خلال '+x.days+' يوم</small></div><b>'+money(x.amount)+'</b></div>').join(""):'<div class="f2-empty">مافيش التزامات قادمة مسجلة خلال الأسبوع.</div>')+
 smBtn("go-recurring","إدارة الالتزامات"),"6")+
 card('<div class="f2-head"><h3>ملخص الشهر الذكي</h3><small>قواعد واضحة، مش توصية استثمارية</small></div>'+
 '<div class="f2-balance"><span>الميزانية</span><strong>'+money(i.budget)+'</strong></div>'+
 '<div class="f2-metricbar"><i style="width:'+Math.min(100,i.budget?100*i.spent/i.budget:0)+'%"></i></div>'+
 '<div class="f2-balance"><span>المصروفات / التحويلات</span><strong>'+money(i.spent)+' / '+money(i.transfer)+'</strong></div>'+
 '<p>معلومة: لا توجد قراءة تلقائية لحسابات البنوك أو ثاندر. دقة النتائج تعتمد على إدخالاتك وتحديث الأسعار.</p>',"6")+
 '</div>';
}
function renderSmart(){
 const i=insights(),f=rolloverBudget(),root=$("f2-smart");if(!root)return;
 const pct=f.available?Math.round(Math.max(0,f.spent/f.available*100)):0;
 root.innerHTML=hdr("رؤى وميزانية مرنة","استفد من فكرة Flex Budget ومراجعات الشهر بواجهة Flosy المحلية.")+
 '<div class="f2-kpis">'+stat("سقف الإنفاق المرن",f.target,"يمكن تعديله")+
 stat("الرصيد المرحّل",f.carry,"تقدير من آخر 5 أشهر")+
 stat("إنفاق هذا الشهر",f.spent,"مقارنة بالميزانية المرنة")+
 stat("المتبقي المرن",f.remaining,"يمكن أن يكون سالبًا",f.remaining<0?"f2-negative":"f2-positive")+'</div>'+
 '<div class="f2-grid">'+card('<div class="f2-head"><h3>إعداد الميزانية المرنة</h3><small>Flex budget</small></div>'+
 '<form id="f2FlexForm" class="f2-inputs">'+input("target","السقف الشهري بالجنيه","number",'min="0" step="1" value="'+num(F().flexBudget.target)+'"')+
 '<label>ترحيل غير المستخدم للأشهر التالية<select name="carry"><option value="yes" '+(F().flexBudget.carry?'selected':'')+'>مفعّل</option><option value="no" '+(!F().flexBudget.carry?'selected':'')+'>متوقف</option></select></label>'+
 '<button type="submit" class="f2-toolbutton primary full">حفظ إعداد الميزانية</button></form>'+
 '<p>الترحيل يُحسب بصورة تقريبية من الأشهر التي سجلت فيها مصروفات مرنة فقط، بعد استبعاد الإيجار والفواتير. لا ينقل أموالًا فعلية.</p>',"6")+
 card('<h3>ملخص الإنفاق</h3><div class="f2-balance"><span>استخدام الميزانية</span><strong>'+pct+'%</strong></div><div class="f2-progress"><i style="width:'+Math.min(100,pct)+'%"></i></div>'+
 '<div class="f2-balance"><span>مقارنة بالشهر الماضي</span><strong>'+(i.prev?Math.round(i.prev.percent)+'%':'بيانات غير كافية')+'</strong></div>'+
 '<p>المراجعة تعتمد على المعاملات المسجلة؛ الراتب المخطط لا يُعامل كدخل فعلي.</p>',"6")+
 card('<div class="f2-head"><h3>التنبيهات الحالية</h3><small>تُحدث عند فتح التطبيق</small></div>'+
 (i.risk.length?i.risk.map(x=>alert(x,"warning")).join(""):alert("لا توجد تنبيهات كبيرة وفق البيانات الحالية.","success")),"12")+'</div>';
}
function renderRecurring(){
 const root=$("f2-recurring");if(!root)return;const due=recurringDue();
 root.innerHTML=hdr("الفواتير والالتزامات المتكررة","تابع المواعيد المقبلة بدون إضافة مصروف تلقائي أو خصم من حسابك.")+
 '<div class="f2-grid">'+card('<h3>أضف التزامًا شهريًا</h3><form id="f2RecurringForm" class="f2-inputs">'+
 input("name","اسم الالتزام","text",'maxlength="60" placeholder="إنترنت البيت"')+
 input("amount","القيمة المتوقعة بالجنيه","number",'min="0.01" step="any"')+
 select("category","الفئة",catOpts())+
 input("day","يوم الاستحقاق (1–31)","number",'min="1" max="31" value="1"')+
 '<button class="f2-toolbutton primary full" type="submit">＋ حفظ الالتزام</button></form>'+alert("هذه تذكيرات داخل Flosy وليست إشعارات مضمونة خارج التطبيق.","info"),"4")+
 card('<div class="f2-head"><h3>تقويم الالتزامات</h3><small>'+due.length+' التزام</small></div>'+
 (due.length?due.map(x=>'<div class="f2-list-item"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.category)+' • '+esc(x.nextDate)+(x.likelyPaid?' • يوجد مصروف مشابه هذا الشهر':' • يحتاج مراجعة')+'</small></div><div><b>'+money(x.amount)+'</b> '+smBtn("delete-recurring:"+x.id,"حذف")+'</div></div>').join(""):'<div class="f2-empty">أضف الفواتير الدورية لتراها هنا.</div>'),"8")+'</div>';
}
function renderRules(){
 const root=$("f2-rules");if(!root)return;
 root.innerHTML=hdr("قواعد التصنيف الذكية","صنّف الرسائل والمعاملات المستوردة بكلمات تعرفها؛ بدون إرسال النص لخادم ذكاء اصطناعي.")+
 '<div class="f2-grid">'+card('<h3>قاعدة جديدة</h3><form id="f2RuleForm" class="f2-inputs">'+
 input("term","كلمة أو اسم تاجر","text",'maxlength="60" placeholder="Cafeteria"')+
 select("category","الفئة الناتجة",catOpts())+
 '<button type="submit" class="f2-toolbutton primary full">إضافة قاعدة</button></form>'+
 '<p>مثال: وجود «كافيه» في وصف المعاملة يقترح تصنيف «ترفيه»، ويمكنك تعديله قبل الحفظ.</p>',"4")+
 card('<div class="f2-head"><h3>القواعد الحالية</h3><small>'+F().rules.length+' قاعدة</small></div>'+
 (F().rules.length?F().rules.map(r=>'<div class="f2-list-item"><div><strong>لو الوصف يحتوي: '+esc(r.term)+'</strong><small>تصنيف → '+esc(r.category)+'</small></div>'+smBtn("delete-rule:"+r.id,"حذف")+'</div>').join(""):'<div class="f2-empty">مفيش قواعد لسه.</div>'),"8")+'</div>';
}
function digits(s){return String(s).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/٬/g,",").replace(/٫/g,".")}
function fingerprint(raw){let h=2166136261,s=raw.trim().replace(/\s+/g," ").toLowerCase();for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function categoryFromText(raw){
 const a=raw.toLowerCase();
 const rule=F().rules.find(r=>a.includes(String(r.term).toLowerCase()));if(rule)return rule.category;
 if(/internet|انترنت|إنترنت|فودافون نت/.test(a))return "فاتورة الإنترنت";
 if(/cafe|coffee|قهوة|كافيه|كافي|كافى/.test(a))return "ترفيه";
 if(/food|restaurant|مطعم|سوبرماركت|market|grocery/.test(a))return "طعام ومشروبات";
 if(/electric|كهرباء/.test(a))return "فاتورة الكهرباء";
 if(/uber|careem|اوبر|مواصلات/.test(a))return "مواصلات";
 return "مشتريات";
}
function parseSMS(raw,options={}){
 const normalized=digits(String(raw||"")).replace(/[\u200e\u200f]/g," ").trim().slice(0,5000);
 if(normalized.length<6)throw Error("الرسالة قصيرة ولا يمكن تأكيد معاملة منها");
 if(/\b(?:OTP|PIN|CVV)\b|one.time.password|verification\s*code|security\s*code|رمز.{0,14}(التحقق|التفعيل|سري)|كود.{0,14}(التحقق|التفعيل)|كلمة\s*(?:مرور|السر)/i.test(normalized))
  throw Error("رسالة تحقق أو رمز سري؛ لن نقرأها أو نحفظها");
 if(/فشلت|فشل|لم تتم|تم رفض|pending|failed|declined|cancelled|canceled/i.test(normalized))
  throw Error("هذه رسالة فشل أو عملية لم تكتمل، وليست حركة مالية مؤكدة");
 const instapay=/insta[\s-]?pay|انستا\s*باي|إنستا\s*باي/i.test(normalized)||options.source==="instapay";
 const out=/(?:خصم|سحب|شراء|عملية شراء|دفع|تم إرسال|تم ارسال|تم التحويل إلى|تم التحويل الي|تم تحويل.+(?:إلى|الي)|تحويل صادر|تمت عملية تحويل|debited|withdrawn|paid|purchased|spent|sent|transfer to)/i.test(normalized);
 const inc=/(?:إيداع|ايداع|إضافة|تم إضافة|استلام|تم استلام|وصلتك|وارد|تم التحويل من|تحويل وارد|credited|received|deposited|salary|transfer from)/i.test(normalized);
 if(out&&inc)throw Error("اتجاه العملية غير واضح (إرسال/استلام). راجعها وأضفها يدويًا");
 if(!out&&!inc)throw Error("لا توجد عملية خصم أو استلام مؤكدة؛ استخدم الإدخال اليدوي");
 const pCurrency=/(?:EGP|جنيه(?:ا)?|ج\.?\s*م\.?|L\.?E\.?)/i;
 // Look for a labeled transaction amount, never remaining balance/fee/reference.
 const patterns=[
  /(?:بمبلغ|مبلغ|القيمة|قيمة التحويل|amount|amt|تم خصم|تم استلام|تم إرسال|تم ارسال)\s*[:\-]?\s*(?:EGP|جنيه|ج\.?\s*م\.?)?\s*([0-9][0-9,\s.]{0,16})\s*(?:EGP|جنيه|ج\.?\s*م\.?)?/i,
  /(?:EGP|جنيه|ج\.?\s*م\.?|L\.?E\.?)\s*[:\-]?\s*([0-9][0-9,\s.]{0,16})/i,
  /([0-9][0-9,\s.]{0,16})\s*(?:EGP|جنيه|ج\.?\s*م\.?|L\.?E\.?)/i
 ];
 let match=null;
 for(const pattern of patterns){const m=normalized.match(pattern);if(m){match=m;break}}
 if(!match&&!pCurrency.test(normalized)&&instapay){
  match=normalized.match(/(?:حوّلت|حولت|تحويل|أرسلت|ارسلت|استلمت|received|sent)\s*(?:مبلغ)?\s*([0-9][0-9,.]{0,13})/i);
 }
 if(!match)throw Error("لم أجد مبلغ معاملة واضحًا؛ لا يمكن الاعتماد على الرصيد أو الرسوم بدلًا منه");
 let rawNum=String(match[1]||"").trim().replace(/\s/g,"").replace(/[,.]$/,"");
 if(rawNum.includes(",")&&rawNum.includes(".")){
  rawNum=rawNum.lastIndexOf(",")>rawNum.lastIndexOf(".")?
    rawNum.replace(/\./g,"").replace(",","."):rawNum.replace(/,/g,"");
 }else if(rawNum.includes(",")){
  const a=rawNum.split(",");rawNum=a.length===2&&a[1].length!==3?a.join("."):a.join("");
 }else if((rawNum.match(/\./g)||[]).length===1&&rawNum.split(".")[1]?.length===3){
  rawNum=rawNum.replace(".","");
 }
 const amount=Number(rawNum);
 if(!Number.isFinite(amount)||amount<=0||amount>100000000)
  throw Error("المبلغ المستخرج غير صالح");
 let day=dateISO();
 if(Number.isFinite(Number(options.date))&&Number(options.date)>0){
  const dt=new Date(Number(options.date));if(!Number.isNaN(+dt))day=dateISO(dt);
 }else{
  const dm=normalized.match(/\b([0-3]?\d)[/.-]([01]?\d)[/.-](20\d{2})\b/);
  if(dm){const dt=new Date(+dm[3],+dm[2]-1,+dm[1]);if(dt.getFullYear()===+dm[3]&&dt.getMonth()+1===+dm[2]&&dt.getDate()===+dm[1])day=dateISO(dt)}
 }
 const ref=normalized.match(/(?:reference|ref(?:erence)?\s*(?:no|number)?|رقم\s*(?:المرجع|العملية|التحويل)|الرقم\s*المرجعي)\s*[:#\-]?\s*([A-Z0-9-]{6,36})/i)?.[1]||"";
 const type=out?"expense":"income";
 return {id:uid(),sourceHash:ref?fingerprint("transaction-ref|"+ref.toLowerCase()+"|"+amount+"|"+type):fingerprint(normalized),
  amount,type,date:day,category:out?categoryFromText(normalized):"دخل آخر",
  description:(instapay?"InstaPay": "رسالة مالية")+" — "+(out?"تحويل/خصم":"استلام/إيداع")+" للمراجعة",
  source:instapay?"instapay_reviewed":"sms_reviewed"};
}
function duplicate(d){
 return txs().some(t=>t.sourceHash&&t.sourceHash===d.sourceHash)
 ||txs().some(t=>t.type===d.type&&num(t.amount)===num(d.amount)&&t.date===d.date&&String(t.description||"")===String(d.description||""));
}
function draftCard(d){
 const cats=d.type==="income"?'<option value="مرتب">مرتب</option><option value="دخل آخر">دخل آخر</option>':catOpts();
 return '<div class="f2-review-panel"><h3>تأكيد العملية قبل الحفظ</h3>'+
 '<form id="f2ReviewForm" class="f2-inputs">'+
 '<label>نوع العملية<select name="type"><option value="expense" '+(d.type==="expense"?"selected":"")+'>مصروف</option><option value="income" '+(d.type==="income"?"selected":"")+'>دخل</option></select></label>'+
 '<label>المبلغ (ج.م)<input type="number" min="0.01" step="any" name="amount" value="'+esc(d.amount)+'" required></label>'+
 '<label>التاريخ<input type="date" name="date" value="'+esc(d.date)+'" required></label>'+
 '<label>الحساب<select name="accountId" required>'+aList()+'</select></label>'+
 '<label>الفئة<select name="category">'+cats+'</select></label>'+
 '<label class="full">الوصف (لا تكتب رقم كارت أو رمز تحقق)<input name="description" maxlength="100" required value="'+esc(d.description)+'"></label>'+
 '<div class="f2-btnrow full"><button type="submit" class="f2-toolbutton primary">حفظ المعاملة المعتمدة</button> '+smBtn("cancel-draft","تجاهل")+'</div>'+
 '</form><p class="f2-privacy">يُحفظ المبلغ والتصنيف والوصف فقط بعد موافقتك، دون نص رسالة البنك الأصلي. أي رصيد أو حساب أُدخل تلقائيًا يحتاج مراجعة.</p></div>';
}
function renderImport(){
 const root=$("f2-import");if(!root)return;
 root.innerHTML=hdr("استيراد معاملات البنك والرسائل","أنت المتحكم: مشاركة رسالة أو لصقها أو رفع CSV، ومراجعة كل عملية قبل تسجيلها.")+
 '<div class="f2-grid">'+card('<div class="f2-head"><h3>رسالة بنك / محفظة</h3><span class="f2-tag">موافقة صريحة</span></div>'+
 '<form id="f2SMSForm" class="f2-inputs">'+
 '<label class="full">الصق رسالة مالية واحدة هنا<textarea name="message" id="f2SMSText" placeholder="مثال توضيحي: تم خصم مبلغ 125 EGP من حسابك مقابل شراء."></textarea></label>'+
 '<button type="submit" class="f2-toolbutton primary full">تحليل الرسالة محليًا</button></form>'+
 '<div class="f2-privacy">يمكنك أيضًا الضغط «مشاركة» من تطبيق الرسائل واختيار Flosy في APK. Flosy لا يحتاج صلاحية قراءة جميع SMS، ولا يسجّل أي معاملة حتى تراجعها وتوافق عليها.</div>',"6")+
 card('<div class="f2-head"><h3>استيراد رسالة SMS أو InstaPay بأمان</h3><span class="f2-tag">بدون صلاحيات حساسة</span></div>'+
 '<p>من تطبيق الرسائل: افتح الرسالة المالية المحددة، واضغط «مشاركة → Flosy» إن ظهر الخيار، أو «نسخ»، ثم ألصق النص في الخانة بالأعلى. ويمكنك مشاركة نص إيصال InstaPay إن كان التطبيق يوفر ذلك.</p>'+
 '<p>Flosy لا يستطيع الآن قراءة صندوق SMS كاملًا أو إشعارات التطبيقات؛ هذه الصلاحيات أُزيلت لحماية هاتفك. لن يسجل أي معاملة إلا بعد مراجعتك الصريحة.</p>'+
 '<div class="f2-privacy">ارفض مشاركة رموز OTP أو PIN أو أرقام البطاقات. لو مشاركة InstaPay غير متاحة، أدخل العملية يدويًا أو استورد CSV من البنك.</div>',"12")+
 card('<h3>استيراد كشف معاملات CSV</h3><p>لملف صادر بنفسك من البنك أو المحفظة. صيغة أعمدة مدعومة: <code>date,description,amount,type</code> مع <code>type</code> يساوي expense أو income. تُراجع العمليات قبل تسجيلها.</p>'+
 '<div class="f2-inputs"><label>ملف CSV<input type="file" accept=".csv,text/csv" id="f2CSVFile"></label>'+
 '<label>الحساب المرتبط بالمعاملات<select id="f2CSVAccount">'+aList()+'</select></label></div>'+
 '<div class="f2-btnrow">'+smBtn("sample-csv","تنزيل نموذج CSV")+'</div>'+
 '<div class="f2-privacy">استيراد يدوي فقط؛ لا توجد صلاحية للوصول إلى حساباتك البنكية أو رسائلك دون مشاركتها.</div>',"6")+
 card('<div class="f2-head"><h3>المراجعة قبل الإضافة</h3><span class="f2-tag">لا إضافات تلقائية</span></div>'+
 '<div id="f2DraftMount">'+(draft?draftCard(draft):csvDrafts.length?renderCSVQueue():'<div class="f2-empty">بعد تحليل رسالة أو رفع ملف ستظهر المعاملات هنا للمراجعة.</div>')+'</div>'+
 (importStatus?alert(importStatus,"info"):""),"12")+
 '</div>';
 if(draft&&$("f2ReviewForm")&&draft.category){const cat=$("f2ReviewForm").elements.namedItem("category");if(cat){if([...cat.options].some(o=>o.value===draft.category))cat.value=draft.category}}
}
function parseCSV(text){
 const rows=[];let fields=[],cell="",q=false;
 for(let i=0;i<text.length;i++){
  let c=text[i];
  if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++}else q=!q}
  else if(c===','&&!q){fields.push(cell);cell=""}
  else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;fields.push(cell);if(fields.some(x=>x.trim()))rows.push(fields);fields=[];cell=""}
  else cell+=c;
 }
 fields.push(cell);if(fields.some(x=>x.trim()))rows.push(fields);
 return rows;
}
function isoDate(raw){
 let s=digits(raw).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
 let m=s.match(/^([0-3]?\d)[\/.-]([01]?\d)[\/.-](20\d{2})$/);
 if(m){const d=new Date(+m[3],+m[2]-1,+m[1]);if(d.getFullYear()==+m[3]&&d.getMonth()==+m[2]-1&&d.getDate()==+m[1])return dateISO(d)}
 throw Error("تنسيق تاريخ غير مدعوم: "+s);
}
function parseCSVTransactions(txt){
 let rows=parseCSV(txt.replace(/^\uFEFF/,""));
 if(rows.length>501)throw Error("الحد الأقصى 500 عملية في كل دفعة.");
 const headers=rows.shift()?.map(h=>h.trim().toLowerCase());
 if(!headers)throw Error("ملف فارغ");
 const idx=aliases=>headers.findIndex(h=>aliases.includes(h));
 const dateIdx=idx(["date","التاريخ"]),descIdx=idx(["description","الوصف","details"]),amountIdx=idx(["amount","المبلغ"]),typeIdx=idx(["type","النوع"]);
 if([dateIdx,amountIdx,typeIdx].some(x=>x<0))throw Error("يجب وجود الأعمدة date, amount, type (الوصف اختياري).");
 let account=$("f2CSVAccount").value;
 if(!(S().accounts||[]).some(a=>a.id===account))throw Error("اختر حسابًا صحيحًا");
 return rows.map((r,i)=>{
  const amount=Number(String(r[amountIdx]||"").replace(/,/g,"").trim()),
    type=String(r[typeIdx]||"").trim().toLowerCase();
  if(!Number.isFinite(amount)||amount<=0||!["income","expense"].includes(type))throw Error("بيانات غير صالحة في الصف "+(i+2));
  const description=String(descIdx>=0?r[descIdx]||"":"عملية مستوردة").slice(0,100).trim()||"عملية مستوردة";
  const date=isoDate(r[dateIdx]);
  const fingerprintBasis=[account,date,type,amount.toFixed(2),description.toLowerCase()].join("|");
  return {id:uid(),type,amount,date,description,category:type==="income"?"دخل آخر":categoryFromText(description),accountId:account,sourceHash:"csv-"+fingerprint(fingerprintBasis)};
 });
}
function renderCSVQueue(){
 return '<div class="f2-info">العمليات الجاهزة للمراجعة: '+csvDrafts.length+'. لا يتم الحفظ قبل التأكيد.</div>'+
 '<div class="f2-tablewrap"><table class="f2-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>المبلغ</th><th>النوع</th></tr></thead><tbody>'+
 csvDrafts.slice(0,500).map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.description)+'</td><td>'+money(x.amount)+'</td><td>'+esc(x.type==="expense"?"مصروف":"دخل")+'</td></tr>').join("")+
 '</tbody></table></div>'+alert("ستُضاف العمليات غير المكررة فقط. راجع جميع صفوف الملف في الجدول قبل الاعتماد عليه.")+
 '<div class="f2-btnrow">'+smBtn("confirm-csv","تأكيد حفظ الدفعة","primary")+' '+smBtn("cancel-csv","إلغاء الاستيراد")+'</div>';
}
function renderBackups(){
 let root=$("f2-backups");if(!root)return;let signed=!!C.getSession();
 root.innerHTML=hdr("حماية البيانات والاسترجاع","نسخ محفوظة بحسابك السحابي، مع استرجاع اختياري ونسخة JSON خارجية.")+
 '<div class="f2-recovery"><h3>قبل حذف APK أو تغيير الهاتف</h3><p>احفظ JSON خارج التطبيق، ثم سجّل الدخول ونفّذ مزامنة ناجحة. إعادة التثبيت تمسح التخزين المحلي في WebView.</p>'+
 '<div class="f2-btnrow">'+smBtn("export-json","تنزيل نسخة JSON")+' '+smBtn("backup-now","إنشاء نسخة سحابية الآن")+' '+smBtn("load-backups","عرض النسخ المحفوظة")+'</div></div>'+
 (signed?alert("أنت مسجل الدخول، لكن المزامنة لا تُعد ناجحة إلا بعد رسالة تأكيد من الخادم.","success"):alert("أنت غير مسجل الدخول. افتح «الإعدادات» ثم سجّل الدخول لعرض النسخ السحابية.","warning"))+
 '<div class="f2-card"><div class="f2-head"><h3>سجل النسخ</h3><small>الأحدث أولًا</small></div>'+
 (lastBackupList.length?lastBackupList.map(b=>'<div class="f2-list-item"><div><strong>نسخة '+esc(new Date(b.created_at).toLocaleString("ar-EG"))+'</strong><small>'+esc(b.source)+' · محفوظة بالحساب</small></div>'+smBtn("restore:"+b.id,"استرجاع")+'</div>').join(""):'<div class="f2-empty">اضغط «عرض النسخ المحفوظة» بعد تسجيل الدخول.</div>')+
 '</div>';
}
function render(){
 if(!S().next)ensure();
 try{renderHome();renderSmart();renderRecurring();renderRules();renderImport();renderBackups()}
 catch(err){console.error("Flosy Next render:",err)}
}
function addRecord(obj){
 C.mutate(s=>{s.transactions.push({...obj,id:obj.id||uid(),createdAt:now(),updatedAt:now()})})
}
function onAction(action){
 if(action==="go-import")return C.goto("import");
 if(action==="clear-sms-inbox"){smsCandidates=[];draft=null;importStatus="تم مسح نتائج الفحص من الذاكرة.";renderImport();return}
 if(action.startsWith("sms-select:")){
  const n=Number(action.slice(11));const row=smsCandidates[n];
  if(!row){C.toast("لم يتم العثور على الرسالة");return}
  try{
    let parsed=parseSMS(row.text,{source:row.source||'sms',date:row.date});
    if(duplicate(parsed))throw Error("المعاملة تبدو مسجلة بالفعل");
    draft=parsed;csvDrafts=[];
    importStatus="راجع بيانات الرسالة بعناية: المبلغ والحساب والتاريخ والفئة. النص الخام لا يُحفظ.";
    renderImport();
  }catch(e){C.toast(e.message)}
  return;
 }
 if(action==="go-recurring")return C.goto("recurring");
 if(action==="go-recovery")return C.goto("recovery");
 if(action==="cancel-draft"){draft=null;importStatus="تم تجاهل الرسالة ولم يُحفظ شيء";return renderImport()}
 if(action==="cancel-csv"){csvDrafts=[];importStatus="تم إلغاء استيراد الملف";return renderImport()}
 if(action==="confirm-csv"){
  if(!csvDrafts.length)return;
  const seen=new Set();const nonduplicates=csvDrafts.filter(x=>{if(duplicate(x)||seen.has(x.sourceHash))return false;seen.add(x.sourceHash);return true}),duplicates=csvDrafts.length-nonduplicates.length;
  if(!confirm("إضافة "+nonduplicates.length+" معاملة إلى حسابك؟ هناك "+duplicates+" مكررة سيتم تجاهلها. لا تُرسل أي معاملة حتى تؤكد."))return;
  if(nonduplicates.length){C.mutate(s=>{for(const x of nonduplicates)s.transactions.push({...x,createdAt:now(),updatedAt:now()})})}
  csvDrafts=[];importStatus="تم تسجيل "+nonduplicates.length+" معاملة؛ تم تجاهل "+duplicates+" مكررات.";renderImport();return;
 }
 if(action.startsWith("delete-recurring:")){
  let id=action.slice(17);if(!confirm("حذف الالتزام من التقويم؟ لن تُحذف معاملات سابقة."))return;
  C.mutate(s=>{s.next.recurring=s.next.recurring.filter(x=>x.id!==id);s.deletedIds=s.deletedIds||[];s.deletedIds.push("recurring/"+id)});return;
 }
 if(action.startsWith("delete-rule:")){
  let id=action.slice(12);if(!confirm("حذف قاعدة التصنيف؟"))return;
  C.mutate(s=>{s.next.rules=s.next.rules.filter(x=>x.id!==id);s.deletedIds=s.deletedIds||[];s.deletedIds.push("rules/"+id)});return;
 }
 if(action==="export-json")return $("exportJSON").click();
 if(action==="backup-now")return backupNow();
 if(action==="load-backups")return loadBackups();
 if(action.startsWith("restore:"))return restoreBackup(action.slice(8));
 if(action==="sample-csv"){
  const sample="date,description,amount,type\n2026-01-01,مثال مصروف,100,expense\n2026-01-02,مثال دخل,200,income\n";
  const blob=new Blob(["\uFEFF"+sample],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="flosy-csv-example.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 }
}
async function cloudApi(path,opts){
 if(!C.getSession()){C.toast("سجل الدخول من الإعدادات أولًا");throw Error("No session")}
 return C.cloudApi(path,opts);
}
async function backupNow(){
 try{
  await C.ensureSession();
  const session=C.getSession(),payload=C.getState();
  await cloudApi("/rest/v1/flosy_backups",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify([{user_id:session.user.id,payload:payload,source:"user_manual_backup"}])});
  C.toast("تم حفظ نسخة سحابية باسم حسابك");loadBackups()
 }catch(e){C.toast("تعذر الحفظ السحابي: "+e.message)}
}
async function loadBackups(){
 try{
  await C.ensureSession();
  const s=C.getSession();
  let result=await cloudApi("/rest/v1/flosy_backups?select=id,created_at,source&user_id=eq."+encodeURIComponent(s.user.id)+"&order=created_at.desc&limit=50");
  lastBackupList=Array.isArray(result)?result:[];
  renderBackups()
 }catch(e){C.toast("تعذر عرض النسخ: "+e.message)}
}
async function restoreBackup(id){
 if(!C.getSession())return C.toast("سجّل الدخول أولًا");
 if(!window.FLOSY_SYNC_V3)return C.toast("محرك المزامنة الآمن لم يتم تحميله. لا يمكن الاسترجاع الآن.");
 if(!confirm("هل أنت متأكد أنك تريد استرجاع نسخة قديمة؟ سيتم حفظ نسخة محلية ونسخة تاريخية آليًا قبل تغيير السجل السحابي."))return;
 try{
  await C.ensureSession();
  const session=C.getSession(),uid=session.user.id;
  const snapshot=await cloudApi("/rest/v1/flosy_backups?select=payload&user_id=eq."+encodeURIComponent(uid)+"&id=eq."+encodeURIComponent(id));
  if(!snapshot?.length||!snapshot[0].payload)throw Error("النسخة غير متاحة");
  const restored=snapshot[0].payload;
  if(!restored||typeof restored!=="object"||!Array.isArray(restored.transactions))throw Error("نسخة غير صالحة");
  await window.FLOSY_SYNC_V3.restorePayload(restored);
  C.toast("تم الاسترجاع برقم إصدار جديد. راجع معاملاتك وأرصدتك ثم صدّر نسخة JSON.");
  await loadBackups();
 }catch(e){C.toast("تعذر الاسترجاع دون استبدال البيانات: "+e.message)}
}
function receiveScannedSMS(items){
 smsCandidates=Array.isArray(items)?items.slice(0,35).filter(x=>x&&typeof x.text==="string"&&x.text.length<=1200&&
 Number.isFinite(Number(x.date))&&(x.source==="instapay"||x.source===undefined||x.source==="sms"))
 .map(x=>({date:Number(x.date),source:x.source==="instapay"?"instapay":"sms",text:x.text.slice(0,1200)})):[];
 draft=null;csvDrafts=[];
 importStatus=smsCandidates.length?"تم العثور على "+smsCandidates.length+" رسائل/إشعارات. اختر المعاملة لمراجعتها؛ لم يُحفظ شيء.":"لم نعثر على رسائل أو إشعارات مكتملة ومتاحة الآن. يمكنك مشاركة رسالة من التطبيق يدويًا.";
 C.goto("import");renderImport();
}
function receiveSharedText(message){
 if(typeof message!=="string")return;
 if(message.length>5000){C.toast("الرسالة كبيرة جدًا");return}
 C.goto("import");
 if($("f2SMSText"))$("f2SMSText").value=message;
 importStatus="تم استقبال رسالة مشتركة للمراجعة فقط، ولم يتم تسجيلها.";
 renderImport();if($("f2SMSText"))$("f2SMSText").value=message;
}
document.addEventListener("click",e=>{let hit=e.target.closest("[data-f2]");if(hit)onAction(hit.dataset.f2)});
document.addEventListener("submit",e=>{
 let f=e.target;
 if(!["f2FlexForm","f2RecurringForm","f2RuleForm","f2SMSForm","f2ReviewForm"].includes(f.id))return;
 e.preventDefault();const d=new FormData(f);
 if(f.id==="f2FlexForm"){
  let target=Number(d.get("target"));if(!Number.isFinite(target)||target<0)return C.toast("الحد الشهري غير صالح");
  C.mutate(s=>s.next.flexBudget={target,carry:d.get("carry")==="yes"});C.toast("تم حفظ الميزانية المرنة");
 }
 if(f.id==="f2RecurringForm"){
  let amount=Number(d.get("amount")),day=Number(d.get("day")),name=String(d.get("name")||"").trim(),category=String(d.get("category")||"");
  if(!name||!Number.isFinite(amount)||amount<=0||!Number.isInteger(day)||day<1||day>31)return C.toast("تأكد من المبلغ ويوم الاستحقاق");
  C.mutate(s=>s.next.recurring.push({id:uid(),name:name.slice(0,60),amount,day,category,createdAt:now()}));C.toast("تم حفظ الالتزام");
 }
 if(f.id==="f2RuleForm"){
  let term=String(d.get("term")||"").trim(),category=String(d.get("category")||"");
  if(term.length<2||term.length>60||!expenseCats.includes(category))return C.toast("راجع قاعدة التصنيف");
  C.mutate(s=>s.next.rules.push({id:uid(),term,category,createdAt:now()}));C.toast("تمت إضافة قاعدة التصنيف");
 }
 if(f.id==="f2SMSForm"){
  try{let text=String(d.get("message")||"");if(!text.trim())throw Error("ألصق رسالة مالية أولًا");
   let candidate=parseSMS(text);
   if(duplicate(candidate))throw Error("يبدو أن هذه الرسالة سُجلت بالفعل.");
   draft=candidate;csvDrafts=[];importStatus="تم تحليل الرسالة محليًا. راجع الحساب والفئة والمبلغ قبل حفظ العملية.";
   renderImport();
  }catch(err){C.toast(err.message)}
 }
 if(f.id==="f2ReviewForm"){
  if(!draft)return;
  let x={...draft},amount=Number(d.get("amount"));
  if(!Number.isFinite(amount)||amount<=0)return C.toast("المبلغ غير صالح");
  x.amount=amount;x.date=String(d.get("date"));x.type=String(d.get("type"));x.category=String(d.get("category"));x.accountId=String(d.get("accountId"));x.description=String(d.get("description")||"").trim().slice(0,100);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!x.description||!aList().includes('value="'+esc(x.accountId)+'"'))return C.toast("راجع التاريخ والوصف والحساب");
  if(duplicate(x))return C.toast("المعاملة مسجلة من قبل");
  addRecord(x);draft=null;importStatus="تم اعتماد العملية وحفظها بدون نص الرسالة الخام";renderImport();C.toast("تم حفظ العملية");
 }
});
document.addEventListener("change",async e=>{
 if(e.target.id!=="f2CSVFile")return;
 try{
  const file=e.target.files[0];if(!file)return;
  if(file.size>512000)throw Error("الحد الأقصى للملف 500 كيلوبايت");
  const data=await file.text();csvDrafts=parseCSVTransactions(data).filter(x=>!duplicate(x));
  draft=null;importStatus="تأكد من محتوى ملفك قبل الموافقة. تم تجاهل العمليات المطابقة للمحفوظ مسبقًا.";
  renderImport()
 }catch(err){csvDrafts=[];C.toast("تعذر استيراد CSV: "+err.message)}
});
ensure();
window.FLOSY_NEXT={render,receiveSharedText,receiveScannedSMS,parseSMS,parseCSVTransactions,rolloverBudget,recurringDue};
render();
})();
