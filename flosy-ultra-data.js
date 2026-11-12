/* Exact-design production data model for Flosy Ultra.
 * Pure accounting functions. Never inject demo balances from designer mockup.
 * Financial records are owned by the existing canonical Flosy ledger.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_ULTRA_DATA=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0;};
 const iso=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 const money=v=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n(v))+" ج.م";
 const invalid=new Set(["pending","failed","draft","reversed","cancelled"]);
 const arr=a=>Array.isArray(a)?a:[];
 function cleanTx(s){return arr(s?.transactions).filter(t=>
  ["expense","income","transfer"].includes(t?.type)&&n(t.amount)>0&&n(t.amount)<1e9&&
  /^\d{4}-\d{2}-\d{2}$/.test(String(t.date||""))&&
  !invalid.has(String(t.status||"").toLowerCase()));}
 function monthRange(d=new Date(),months=1,shift=0){
  const e=new Date(d.getFullYear(),d.getMonth()-shift+1,0);
  const b=new Date(e.getFullYear(),e.getMonth()-months+1,1);
  return {start:iso(b),end:iso(e)};
 }
 function periodRange(key,d=new Date()){
  const y=d.getFullYear(),m=d.getMonth();
  if(key==="quarter")return {start:iso(new Date(y,Math.floor(m/3)*3,1)),end:iso(d)};
  if(key==="half")return {start:iso(new Date(y,Math.floor(m/6)*6,1)),end:iso(d)};
  if(key==="year")return {start:iso(new Date(y,0,1)),end:iso(d)};
  if(key==="last")return monthRange(d,1,1);
  if(key==="three")return {start:iso(new Date(y,m-2,1)),end:iso(d)};
  return {start:iso(new Date(y,m,1)),end:iso(d)};
 }
 function inRange(t,r){return t.date>=r.start&&t.date<=r.end;}
 function category(t){
  const c=String(t?.category||"أخرى"),desc=String(t?.description||"");
  if(/مطعم|وجبات|اكل|طعام|برجر|غداء|عشاء/i.test(c+" "+desc))return "الطعام والمطاعم";
  if(/مواصل|بنزين|اوبر|أوبر|تكسي|سيار|مترو/i.test(c+" "+desc))return "المواصلات";
  if(/سوبر|تسوق|مشتريات|ملابس/i.test(c+" "+desc))return "التسوق";
  if(/قهوة|مشروب|كافيه/i.test(c+" "+desc))return "المشروبات";
  if(/فاتورة|كهرباء|انترنت|إنترنت|خدمات|فواتير/i.test(c+" "+desc))return "الفواتير";
  if(/ترفيه|لعب|سينما|ألعاب/i.test(c+" "+desc))return "الترفيه";
  if(/راتب|مرتب|دخل|قبض/i.test(c))return "الدخل";
  return c||"أخرى";
 }
 const colors=["#F59E0B","#0EA5E9","#A855F7","#F43F5E","#10B981","#6366F1","#F97316"];
 const icons={
  "الطعام والمطاعم":"fa-utensils","المواصلات":"fa-car-side","التسوق":"fa-cart-shopping",
  "المشروبات":"fa-mug-hot","الفواتير":"fa-bolt","الترفيه":"fa-gamepad","الدخل":"fa-sack-dollar"
 };
 const icon=c=>icons[c]||"fa-wallet";
 function summary(state,range=periodRange("month"),balances={},safe=null){
  const tx=cleanTx(state).filter(t=>inRange(t,range));
  let income=0,expense=0;const cats={};
  for(const t of tx){
   if(t.type==="income")income+=n(t.amount);
   if(t.type==="expense"){expense+=n(t.amount);cats[category(t)]=(cats[category(t)]||0)+n(t.amount);}
  }
  const a=arr(state?.accounts),b=balances||{};
  const accountBalances=a.map(x=>({...x,balance:Number.isFinite(Number(b[x.id]))?Number(b[x.id]):n(x.opening)}));
  const total=accountBalances.reduce((sum,x)=>sum+n(x.balance),0);
  const safeMoney=safe&&Number.isFinite(Number(safe.safe))?Math.max(0,Number(safe.safe)):null;
  const daily=safe&&Number.isFinite(Number(safe.daily))?Math.max(0,Number(safe.daily)):null;
  const categories=Object.entries(cats).sort((x,y)=>y[1]-x[1])
   .map(([name,amount],i)=>({name,amount,share:expense?amount/expense*100:0,color:colors[i%colors.length],icon:icon(name)}));
  const savings=income?Math.round((income-expense)/income*100):null;
  return {income,expense,net:income-expense,categories,savings,transactions:tx,
   accounts:accountBalances,total,hasAccounts:accountBalances.length>0,
   safe:safeMoney,daily,budget:n(state?.settings?.rent)+n(state?.settings?.bills)+n(state?.settings?.living),
   range};
 }
 function budgetCards(s,state){
  const recorded=s.transactions.filter(t=>t.type==="expense");
  const spending=c=>recorded.filter(t=>category(t)===c).reduce((sum,t)=>sum+n(t.amount),0);
  const cfg=state?.settings||{};
  // Prefer explicitly configured category budgets, otherwise show suggestions as unconfigured.
  const custom=arr(cfg.categoryBudgets||cfg.budgets);
  const names=["الطعام والمطاعم","المواصلات","التسوق","الترفيه"];
  const cards=names.map((name,i)=>{
   const item=custom.find(x=>category({category:x.name||x.category})===name);
   const budget=n(item?.limit??item?.amount??item?.budget);
   const spent=spending(name);
   return {name,budget,spent,remaining:budget?budget-spent:null,
    ratio:budget?Math.round(spent/budget*100):null,color:colors[i%colors.length],
    configured:budget>0,icon:icon(name)};
  });
  return cards;
 }
 function weekly(expenses,range){
  const out=[0,0,0,0];
  const begin=new Date(range.start+"T12:00:00");
  for(const t of expenses.filter(x=>x.type==="expense")){
   const days=Math.floor((new Date(t.date+"T12:00:00")-begin)/86400000);
   if(days>=0)out[Math.min(3,Math.floor(days/7))]+=n(t.amount);
  }
  return out;
 }
 function tips(s){
  if(!s.hasAccounts)return ["ابدأ بإضافة حساب وحدد رصيدك الحقيقي علشان تحصل على توصيات تناسبك."];
  if(!s.expense)return ["سجل أول مصروف هذا الشهر علشان نبدأ نحلل عادات الصرف."];
  const top=s.categories[0];
  const savings=(s.income-s.expense);
  return [
   top?"أكبر بند صرف حاليًا هو "+top.name+" بقيمة "+money(top.amount)+".":null,
   savings>0?"فيه فائض مسجل بقيمة "+money(savings)+". حدّد جزءًا منه لهدف ادخار.":"راجع المصروفات الثابتة قبل تخصيص مبلغ ادخار شهري.",
   s.safe===null?"كمّل خطة الفواتير والالتزامات علشان يتحدد المتاح الآمن للصرف.":"المتاح الآمن للصرف المحسوب: "+money(s.safe)+"."
  ].filter(Boolean);
 }
 function answer(question,s){
  const q=String(question||"").trim();
  if(!q)return "اسألني عن مصروفاتك أو ميزانيتك وأنا معاك.";
  if(!s.hasAccounts)return "أهلاً بيك! لسه مفيش حساب مالي متسجل. ضيف حسابك الأول، وبعدها نقدر نحلل فلوسك بأرقام حقيقية.";
  if(/صرف|مصروف|انفقت|أنفقت|إنفاق|كام دفع/.test(q)){
   return "بص، إجمالي مصروفاتك في الفترة دي "+money(s.expense)+". "+(s.categories[0]?
    "وأكبر بند هو "+s.categories[0].name+" بـ "+money(s.categories[0].amount)+".":"لسه مفيش مصروفات موزعة على فئات.");
  }
  if(/توفير|ادخار|اوفر|أوفر|وفّر|فائض/.test(q)){
   return s.income>0?"إيراداتك "+money(s.income)+" ومصروفاتك "+money(s.expense)+
    ". الفرق "+money(s.net)+". اقترح تبدأ بنسبة صغيرة قابلة للاستمرار، بعد مراجعة التزاماتك.":
    "محتاجين نسجل الدخل الفعلي الأول قبل ما أقولك رقم واقعي للادخار.";
  }
  if(/امن|آمن|متاح|اليوم|يومي/.test(q)){
   return s.safe===null?"لسه حساب الصرف الآمن مش مكتمل. عرّف الحسابات والفواتير أولًا.":
    "المتاح الآمن للصرف "+money(s.safe)+(s.daily===null?"":". والحد اليومي التقريبي "+money(s.daily))+".";
  }
  if(/ميزاني|هدف|خطة|أقساط|قسط/.test(q))return "معاك خطوة بخطوة. راجع ميزانيات الفئات والفواتير المستحقة؛ مش هاعتبر أي مبلغ مخطط معاملة مدفوعة.";
  if(/مرحبا|أهلا|ازيك|عامل ايه|اسمك/.test(q))return "يا أهلاً! أنا فلوسي AI، صاحبك في تنظيم الفلوس. كل تحليلي مبني على معاملاتك اللي سجلتها، مش أرقام من خيالي.";
  if(/حساب|رصيد|محفظ/.test(q))return "إجمالي أرصدتك المسجلة حاليًا "+money(s.total)+". راجع كل حساب من صفحة حساباتي للتأكد من الرصيد.";
  return "فاهم عليك. أقدر أحلل الصرف والدخل والحسابات والميزانية والتوفير بالأرقام المتسجلة. جرب تقول: صرفت كام الشهر ده؟";
 }
 return {n,iso,money,cleanTx,periodRange,monthRange,category,summary,budgetCards,weekly,tips,answer,icon};
});
