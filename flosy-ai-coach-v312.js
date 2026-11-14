/* Flosy AI 3.12: auditable Egyptian financial follow-ups. Not an LLM.
 * Uses posted transactions only, respects cancellation and no guessed salary.
 */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_CUSTOMER_COACH_V312=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 let previousIntent="",previousCategory="";
 const normalize=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/[إأآ]/g,"ا")
  .replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/[ً-ْـ]/g,"").trim();
 const fmt=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(n)||0)+" ج.م";
 const dstr=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const posted=(data,brain)=>brain?.rows?.(data)||[];
 const actions={ledger:[{label:"راجع العمليات",screen:4},{label:"سجّل مصروف",screen:5}],
  reports:[{label:"تقرير الشهر",screen:15},{label:"المعاملات",screen:4}],
  budget:[{label:"الميزانية",screen:11},{label:"التقارير",screen:15}]};
 function scoped(q,rows,at,brain){
  const p=brain?.range?.(q,at),from=p?.from||dstr(new Date(at.getFullYear(),at.getMonth(),1)),
   to=p?.to||dstr(at);
  return {start:from,end:to,label:p?.label||"الشهر الحالي",
   expenses:rows.filter(x=>x.type==="expense"&&x.date>=from&&x.date<=to)};
 }
 function rank(rows,n=5){
  return [...rows].sort((a,b)=>Number(b.amount)-Number(a.amount)).slice(0,n);
 }
 function sum(rows){return Math.round(rows.reduce((a,b)=>a+(Number(b.amount)||0),0)*100)/100}
 function breakdown(rows){
  const groups=new Map();for(const x of rows){
   const cat=String(x.category||"غير مصنف").slice(0,65);
   groups.set(cat,(groups.get(cat)||0)+Number(x.amount||0));
  }
  return [...groups].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount);
 }
 const sameDaysLastMonth=at=>{
  const now=dstr(at),y=at.getFullYear(),m=at.getMonth(),cut=new Date(y,m-1,Math.min(at.getDate(),new Date(y,m,0).getDate()));
  return {start:dstr(new Date(y,m-1,1)),end:dstr(cut),now};
 };
 function whyIncrease(rows,at){
  const compare=sameDaysLastMonth(at),start=dstr(new Date(at.getFullYear(),at.getMonth(),1));
  const a=rows.filter(x=>x.type==="expense"&&x.date>=start&&x.date<=compare.now),
   b=rows.filter(x=>x.type==="expense"&&x.date>=compare.start&&x.date<=compare.end);
  previousIntent="comparison";previousCategory="";
  if(!a.length||!b.length)return {intent:"v312-why-spending",text:
   "لا توجد بيانات كافية لتحديد سبب تغير المصروفات: محتاج معاملات من الشهر الحالي ومن نفس عدد الأيام الشهر الماضي. مش هخمن سبب الزيادة.",actions:actions.reports};
  const amountA=sum(a),amountB=sum(b),delta=amountA-amountB;
  const categoriesA=new Map(breakdown(a).map(x=>[x.name,x.amount])),
   categoriesB=new Map(breakdown(b).map(x=>[x.name,x.amount]));
  const changes=[...new Set([...categoriesA.keys(),...categoriesB.keys()])]
   .map(name=>({name,delta:Math.round(((categoriesA.get(name)||0)-(categoriesB.get(name)||0))*100)/100}))
   .sort((x,y)=>y.delta-x.delta);
  const causes=changes.filter(x=>x.delta>0).slice(0,3);
  const label=delta>0?"زادت":delta<0?"انخفضت":"لم تتغير";
  const explanation=delta>0&&causes.length?
   "أكبر الفئات التي ساهمت في الزيادة: "+causes.map(x=>x.name+" (+"+fmt(x.delta)+")").join("؛ ")+". ":
   "لا أقدر أقول إن في زيادة فعلية خلال الأيام المقارنة. ";
  const percent=amountB?Math.round(Math.abs(delta)/amountB*1000)/10:null;
  return {intent:"v312-why-spending",text:
   "قارنت من أول الشهر حتى اليوم بنفس عدد أيام الشهر السابق؛ لأن الشهر الحالي لسه ما خلصش. "+
   "المصروف المسجل الآن "+fmt(amountA)+" مقابل "+fmt(amountB)+". "+
   "المصروفات "+label+" بمقدار "+fmt(Math.abs(delta))+
   (percent===null?"":" ("+percent+"٪)")+". "+explanation+
   "ده تحليل للمعاملات المسجلة وليس إثباتًا لسبب كل عملية.",actions:actions.reports};
 }
 function topTransactions(q,rows,at,brain){
  const range=scoped(q,rows,at,brain),data=rank(range.expenses,5);
  previousIntent="top";previousCategory="";
  if(!data.length)return {intent:"v312-top-five",text:"لا توجد مصروفات مسجلة للفترة دي أقدر أرتبها.",actions:actions.ledger};
  return {intent:"v312-top-five",text:"أكبر "+data.length+" مصروفات مسجلة في "+range.label+": "+
   data.map((x,i)=>(i+1)+") "+String(x.description||x.category||"مصروف").slice(0,48)+
    " — "+fmt(x.amount)+" بتاريخ "+x.date).join("؛ ")+
   ". مجموع العمليات المعروضة "+fmt(sum(data))+". تقدر تعدّل أي تصنيف من المعاملات.",
   actions:actions.ledger};
 }
 function planning(q,rows,at,brain){
  const r=scoped(q,rows,at,brain),groups=breakdown(r.expenses);
  previousIntent="planning";previousCategory=groups[0]?.name||"";
  if(!groups.length)return {intent:"v312-plan",text:
   "علشان أقترح تقليل مصروفات مبني على أرقام، سجّل مصروفات الشهر أولًا وحدد أيها أساسي وأيها اختياري.",
   actions:actions.ledger};
  const flexible=groups.find(g=>/قهو|كافيه|ترفيه|مطاعم|وجبات|تسوق|مشتريات|اكل بره|أكل برة|طلبات|هدايا/.test(normalize(g.name)))||groups[0];
  const theoretical=Math.round(flexible.amount*.1*100)/100;
  return {intent:"v312-plan",text:"حسب "+r.expenses.length+" عملية في "+r.label+
   "، أكبر 3 فئات: "+groups.slice(0,3).map(x=>x.name+" "+fmt(x.amount)).join("؛ ")+". "+
   "ابدأ بمراجعة فئة «"+flexible.name+"» ("+fmt(flexible.amount)+"). "+
   "لو جزء منها اختياري، تقليله 10٪ قد يوفر افتراضيًا "+fmt(theoretical)+
   " في فترة مشابهة. راجع الإيجار والالتزامات والسيولة أولًا، ومش هفرض إن الفئة كلها قابلة للتقليل.",
   actions:actions.budget};
 }
 function spendingToday(snapshot){
  const val=Number(snapshot?.daily);
  const safe=Number(snapshot?.safe);
  previousIntent="safe";previousCategory="";
  if(typeof snapshot?.daily!=="number"||!Number.isFinite(val))
   return {intent:"v312-safe",text:"لسه الحد الآمن اليومي مش محسوب بشكل موثوق. أكمل أرصدة الحسابات والدخل والالتزامات في ملفك المالي، وبعدها أحسب لك المبلغ.",actions:actions.budget};
  return {intent:"v312-safe",text:"المتاح الآمن اليومي المُقدّر بناءً على مدخلاتك هو "+fmt(Math.max(0,val))+
   ". "+(Number.isFinite(safe)&&typeof snapshot.safe==="number"?
    "المتاح المخطط خلال الفترة "+fmt(Math.max(0,safe))+". ":"")+
   "المبلغ ده تقدير من البيانات المسجلة، مش تأكيد إن كل الرصيد البنكي متاح للصرف.",
   actions:actions.budget};
 }
 function answer(question,data,snapshot,at,brain,originalAnswer){
  const q=normalize(question).slice(0,550);if(!q)return null;
  const rows=posted(data,brain),today=at instanceof Date&&!Number.isNaN(at.getTime())?at:new Date();
  if(/(ليه|لماذا|سبب|اشمعنى).*(مصاريف|صرف|الانفاق|إنفاق).*(زادت|زياده|كتير|عالي|غالي)|مصاريفي زادت ليه|ليه المصاريف زادت/.test(q))
   return whyIncrease(rows,today);
  if(/(اكبر|اكتر|اعلى|اكثر|اغلى|top)\s*(?:\d+\s*)?(?:عمليات|مصاريف|مصروفات|حركات)|(?:5|خمسه|خمس)\s*(?:اكبر|مصروفات)/.test(q))
   return topTransactions(q,rows,today,brain);
  if(/(ازاي|كيف|عايز|عاوز|ممكن).*(اوفر|توفير|قلل|اخفض|اظبط المصاريف|خطة توفير)|خطة لتقليل|انصحني اوفر/.test(q))
   return planning(q,rows,today,brain);
  if(/(اقدر|ممكن).*(اصرف|انفق|انزل).*(كام|كم)|المتاح.*(اليوم|النهارده)|اصرف كام النهارده/.test(q))
   return spendingToday(snapshot);
  if(/^(يعني ايه|اشرح اكتر|طب اعمل ايه|طيب اعمل ايه|ايه الحل)\??$/.test(q)&&previousIntent){
   if(previousIntent==="comparison")return whyIncrease(rows,today);
   if(previousIntent==="top")return planning("ازاي اوفر",rows,today,brain);
   if(previousIntent==="planning")return planning("ازاي اوفر",rows,today,brain);
   if(previousIntent==="safe")return spendingToday(snapshot);
  }
  return typeof originalAnswer==="function"?originalAnswer(question,data,snapshot,at):null;
 }
 function install(root){
  const brain=root?.FLOSY_AI_BRAIN_V399;
  if(!brain||brain.__customerCoachV312)return false;
  const original=brain.answer;
  brain.answer=(q,data,snapshot,at)=>answer(q,data,snapshot,at,brain,original);
  brain.__customerCoachV312=true;return true;
 }
 function reset(){previousIntent="";previousCategory=""}
 return {answer,install,rank,breakdown,whyIncrease,topTransactions,planning,spendingToday,reset,
  version:"3.12.0"};
});
