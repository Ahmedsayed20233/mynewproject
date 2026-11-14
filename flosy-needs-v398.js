/* Flosy smart spending tiers v3.9.8.
 * Customer-defined necessity: Essential / Flexible / Optional.
 * Never mark an income, transfer, debt, or refund as a discretionary expense.
 * This is an explainable suggestion, not a moral judgment or a financial fact.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_NEEDS_V398=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const values=["essential","flexible","optional"],titles={
  essential:"ضروري",flexible:"مهم لكن قابل للتقليل",optional:"اختياري"
 };
 const ruleSets=[
  ["essential",/إيجار|ايجار|rent|أقساط?|قسط|مستشفى|طبيب|دكتور|علاج|دواء|أدوية|صيدلية|pharmacy|hospital|medicine|كهرباء|مياه|فاتورة\s*(?:غاز|كهرباء|مياه)|دوام|مدرسة|كلية|جامعة|تعليم|school|tuition|insurance|تأمين|حضانة/i,"حاجة أساسية أو التزام ضروري"],
  ["optional",/سينما|نتفليكس|netflix|تسلية|ترفيه|gaming|ألعاب|game|بلايستيشن|playstation|سينما|كوافير|صالون|ملاهي|concert|حفلة|اشتراك\s*ترفيه|مشروب\s*ترفيهي/i,"إنفاق ترفيهي يمكن الاستغناء عنه"],
  ["flexible",/قهوة|قهوه|كافيه|كوفي|coffee|cafe|مطعم|restaurant|طلبات|delivery|فاست\s*فود|توصيل|بيتزا|سوبرماركت|بقالة|ماركت|مواصلات|أوبر|اوبر|uber|بنزين|fuel|هدية|هدايا|ملابس|shopping|تسوق|أكل|طعام|فطار|غدا|عشا|وجبات/i,"الضرورة تختلف حسب احتياجك"]
 ];
 const clean=x=>String(x||"").toLocaleLowerCase("ar-EG").normalize("NFKC")
  .replace(/[ً-ْـ]/g,"").replace(/[إأآ]/g,"ا").replace(/ى/g,"ي").replace(/\s+/g," ").trim();
 const amount=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:0};
 function suggest(tx,config={}){
  if(!tx||tx.type!=="expense"||!amount(tx.amount)||tx.deleted||tx.status==="reversed")
   return {tier:"excluded",label:"خارج التصنيف",confidence:1,reason:"ليس مصروفًا فعليًا"};
  if(values.includes(tx.necessity))return {tier:tx.necessity,label:titles[tx.necessity],
   confidence:1,reason:"التصنيف عدّلته بنفسك",source:"owner"};
  const key=clean([tx.category,tx.description,tx.subcategory].filter(Boolean).join(" "));
  const learned=(config?.necessityRules&&typeof config.necessityRules==="object")?config.necessityRules:{};
  const learnedKey=clean(tx.category||"");
  if(values.includes(learned[learnedKey]))return {tier:learned[learnedKey],
   label:titles[learned[learnedKey]],confidence:0.93,reason:"قاعدة فئة اخترتها سابقًا",source:"rule"};
  for(const [tier,pattern,reason] of ruleSets)if(pattern.test(key))
   return {tier,label:titles[tier],confidence:tier==="flexible"?.65:.79,reason,source:"rule"};
  return {tier:"flexible",label:titles.flexible,confidence:.32,
   reason:"لا توجد معلومات كافية؛ اختر ما يناسب حياتك",source:"fallback"};
 }
 function summarize(state,period="month",at=new Date()){
  const d=at instanceof Date?at:new Date(at),year=d.getFullYear(),m=d.getMonth();
  const rows=(Array.isArray(state?.transactions)?state.transactions:[]).filter(t=>{
   if(t?.type!=="expense"||!amount(t.amount)||t.deleted||t.status==="reversed")return false;
   const date=String(t.date||"");
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
   const tYear=+date.slice(0,4),tMonth=+date.slice(5,7)-1;
   return period==="all"?true:period==="year"?tYear===year:tYear===year&&tMonth===m;
  });
  const totals={essential:0,flexible:0,optional:0},counts={essential:0,flexible:0,optional:0};
  const ruleSettings=state?.settings||{};
  for(const row of rows){const tier=suggest(row,ruleSettings).tier;
   if(values.includes(tier)){totals[tier]+=amount(row.amount);counts[tier]++}}
  const sum=totals.essential+totals.flexible+totals.optional;
  for(const k of values)totals[k]=Math.round(totals[k]*100)/100;
  return {period,totals,counts,total:Math.round(sum*100)/100,
   optionalShare:sum?Math.round(totals.optional/sum*1000)/10:0,
   count:rows.length,uncertain:rows.filter(t=>suggest(t,ruleSettings).confidence<.5).length};
 }
 function change(txId,tier,bridge){
  if(!values.includes(tier))throw Error("تصنيف الإنفاق غير صالح");
  if(typeof bridge!=="function")throw Error("محرك المعاملات غير متاح");
  let changed=false;
  bridge(state=>{
   const row=(state.transactions||[]).find(t=>String(t.id)===String(txId));
   if(!row||row.type!=="expense")throw Error("لا يمكن تصنيف عملية ليست مصروفًا");
   row.necessity=tier;row.necessitySource="owner";row.necessityUpdatedAt=new Date().toISOString();
   changed=true;
  });
  return changed;
 }
 return {values,titles,suggest,summarize,change,version:"3.9.8"};
});
