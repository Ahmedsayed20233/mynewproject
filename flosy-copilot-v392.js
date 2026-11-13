/* Flosy 3.9.2 AI guidance. Real transaction aggregates, transparent rules,
 * light-hearted opt-in Roast Me, no third-party LLM or API data sharing.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_COPILOT=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const norm=x=>String(x||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").trim();
 const money=x=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(+x||0)+" ج.م";
 const isoDate=date=>{
  const d=date instanceof Date?date:new Date(date);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
 };
 const safeName=value=>{
  const name=String(value||"").split(/\s+/)[0].replace(/[^\p{L}\u0621-\u064A -]/gu,"").trim();
  return name.length>=2&&name.length<=24?name:"";
 };
 function name(state){
  const x=state||{};
  const profile=x.profile||x.user||{};
  const opts=[x.settings?.flosyFirstName,profile.firstName,profile.displayName,
   profile.name,x.settings?.displayName];
  return opts.map(safeName).find(Boolean)||"";
 }
 function ledger(state,date=new Date()){
  const today=isoDate(date),month=today.slice(0,7),rows=(Array.isArray(state?.transactions)?state.transactions:[])
   .filter(t=>t&&t.date?.slice(0,7)===month&&t.deleted!==true&&
    !["draft","pending","cancelled","failed","reversed"].includes(String(t.status||"").toLowerCase())&&
    Number.isFinite(+t.amount)&&+t.amount>0);
  const spend=rows.filter(t=>t.type==="expense").reduce((s,t)=>s+(+t.amount),0);
  const income=rows.filter(t=>t.type==="income").reduce((s,t)=>s+(+t.amount),0);
  const cats=new Map();
  for(const t of rows.filter(t=>t.type==="expense")){
   const c=String(t.category||"مصروفات أخرى");
   cats.set(c,(cats.get(c)||0)+Number(t.amount));
  }
  const categories=[...cats].map(([name,amount])=>({name,amount}))
   .sort((a,b)=>b.amount-a.amount);
  const todaySpend=rows.filter(t=>t.type==="expense"&&t.date===today)
   .reduce((s,t)=>s+Number(t.amount),0);
  return {today,month,spend,income,categories,todaySpend,rows};
 }
 function dailyAdvice(state,date=new Date()){
  const s=ledger(state,date),first=name(state);
  const greeting=first?"يا "+first+"، ":"";
  const engine=typeof window!=="undefined"?window.FLOSY_FINANCE_ENGINE:null;
  const linked=engine?.plan?.(state,date);
  if(linked?.ready && linked.profile.margin<0)return {
   title:greeting+"ملفك المالي محتاج تعديل",
   message:"المصاريف والالتزامات المتوقعة أعلى من الدخل المتكرر. راجع خطة الشهر قبل أي قسط أو استثمار.",
   subject:"cashflow",date:s.today};
  if(linked?.ready&&Number(s.today.slice(-2))%4===0)return {
   title:greeting+"هدف التوفير المحسوب",
   message:"خطة فلوسي المقترحة للطوارئ "+money(linked.suggestedEmergency)+
    "، والاستثمار المشروط "+money(linked.suggestedInvestment)+
    "، بعد الاحتياجات وهامش الأمان. راجع التزامك الشهري أولًا.",
   subject:"financial-plan",date:s.today};
  const day=Number(s.today.slice(-2));
  if(!s.rows.length)return {
   title:greeting+"ابدأ رحلة فلوسي",
   message:"مفيش معاملات مسجلة للشهر الحالي. سجّل أول مصروف أو دخل علشان توصياتي تبقى مبنية على فلوسك الحقيقية.",
   subject:"setup",date:s.today};
  if(s.income>0&&s.spend>s.income)return {
   title:greeting+"خد بالك من السيولة",
   message:"مصروفاتك المسجلة "+money(s.spend)+" أعلى من دخلك المسجل "+money(s.income)+
    ". راجع أكبر 3 فئات والتزاماتك القريبة قبل صرف مبلغ جديد.",
   subject:"cashflow",date:s.today};
  const top=s.categories[0];
  if(top&&day%3===0)return {
   title:greeting+"فرصة لتوفير أذكى",
   message:"أكبر فئة عندك "+top.name+" بـ"+money(top.amount)+
    ". لو خفضت منها 10٪ الشهر القادم ممكن توفر نظريًا "+money(top.amount*.10)+
    "، بشرط إنها مصاريف قابلة للتقليل.",
   subject:"category",date:s.today};
  if(s.todaySpend>0&&day%3===1)return {
   title:greeting+"مراجعة مصروفات النهارده",
   message:"سجّلت مصروفات النهارده بـ"+money(s.todaySpend)+
    ". بص عليها بسرعة واتأكد إن مفيش مصروف مكرر أو اشتراك اتخصم مرتين.",
   subject:"today",date:s.today};
  if(s.income>0)return {
   title:greeting+"هدف صغير للادخار",
   message:"الفرق بين دخل ومصروف الشهر المسجل "+money(s.income-s.spend)+
    ". جرّب تخصص جزء منه لهدف طوارئ بعد حساب الإيجار والأقساط.",
   subject:"saving",date:s.today};
  return {title:greeting+"راجع مصادر الدخل",
   message:"عندك مصروفات مسجلة "+money(s.spend)+" لكن لسه مفيش دخل مسجل للشهر. ضيف الدخل عشان نقدر نحسب نسبة الادخار بدقة.",
   subject:"income",date:s.today};
 }
 function roast(state,date=new Date()){
  const s=ledger(state,date),first=name(state),prefix=first?"يا "+first+"، ":"";
  if(!s.rows.length)return {text:prefix+"عايز Roast والدفتر فاضي؟ 😂 سجّل معاملات الأول علشان ما ألفش عليك.",intent:"roast"};
  const top=s.categories[0];
  if(top&&/قهو|كافي|مطعم|اكل|طعام|وجبات/i.test(top.name))
   return {text:prefix+"الميزانية عندك شكلها بتقول: «المهم الكافيه يبقى مبسوط» ☕😂. "+
    "فئة "+top.name+" واخدة "+money(top.amount)+". جرب سقف أسبوعي، وشوف هتوفر قد إيه.",intent:"roast"};
  if(s.income>0&&s.spend>s.income)
   return {text:prefix+"الفلوس بتدخل من باب وبتطلع من الشباك أسرع من إشعار المرتب 😂. "+
    "المصروفات "+money(s.spend)+" والدخل "+money(s.income)+". ابدأ بأكبر فئة وقلل غير الضروري.",intent:"roast"};
  if(top)return {text:prefix+"أكبر نجم في مصروفاتك هو «"+top.name+"» — "+
    money(top.amount)+"! 😄 واضح إنه واخد بطولة الشهر، تعال نحدد له سقف بدل ما يكون مدير الميزانية.",intent:"roast"};
  return {text:prefix+"واضح إن عندك معاملات... بس محتاجين دخل ومصروف أكتر عشان الـRoast يبقى عادل 😂.",intent:"roast"};
 }
 function answer(text,state,date=new Date()){
  const q=norm(text);
  if(/\broast\b|روست|اتريق|احرجني|اشويني|تريقة|اسخر من مصروفي/.test(q))return roast(state,date);
  if(/اقتراح|نصيح|ماذا افعل|اعمل ايه|الخطة اليوم|نصيحه اليوم|daily tip|اقترح علي/.test(q)){
   const x=dailyAdvice(state,date);
   return {text:x.title+"\n"+x.message,intent:"daily-advice"};
  }
  if(/اسمك ايه|اسمي ايه|عرف اسمي|بتعرف اسمي/.test(q))
   return {text:name(state)?"أنت مسجّل اسمك في فلوسي: "+name(state)+".":"لسه مش عارف اسمك. ضيف الاسم من الخدمات عشان أقدر أوجه لك نصايح شخصية.",intent:"identity"};
  return null;
 }
 return {norm,name,ledger,dailyAdvice,roast,answer,version:"3.9.2-local-rules"};
});
