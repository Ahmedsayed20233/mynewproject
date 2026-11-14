/* Flosy v3.9.9 voice-auto approval gate.
 * This does NOT perform speech recognition, does not train an ASR, and never writes money.
 * Only the existing canonical Flosy ledger may persist the returned rows.
 * User must enable the explicit opt-in switch once for their account.
 */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_VOICE_AUTO_V399=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const intentSet=new Set(["expense","income"]);
 const block=/\b(?:otp|pin|cvv)\b|سري|كود|رمز|باسورد|فشل|مرفوض|اتلغ|ملغي|تجرب[هة]|تقريب|يمكن|غالبا|احتمال|ممكن|عايز|عاوز|نفسي|امبارح|أمس|بكره|بكرة|بعدين|منذ|يوم|اسبوع|اسبوعين|شهر|هحول|هشتري|هصرف|هدفع|هقبض|لو|اذا|لما|هل|كام|ازاي|ليه|؟|\?/i;
 const expenseVerb=/(?:^|\s)(?:انا\s+)?(?:دفعت|اشتريت|شريت|صرفت|حاسبت|جبت|اتخصم|كلفني|عملت\s+عملي[هة]\s+شراء)(?:\s|$)/i;
 const incomeVerb=/(?:^|\s)(?:انا\s+)?(?:قبضت|استلمت|كسبت|جالي|جاتلي|نزل\s+المرتب|نزلي\s+المرتب|وصلني)(?:\s|$)/i;
 const currency=/(?:^|\s|[\d.])(?:جنيه|جني|جنيهات|جم|ج\.م|egp)(?:\s|$|[.،])/i;
 function norm(t){return String(t||"").normalize("NFKC").toLowerCase()
  .replace(/[إأآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
  .replace(/[ً-ْـ]/g,"").replace(/\s+/g," ").trim();}
 function fingerprint(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(16);}
 function decide(items,{enabled=false,accounts=[],today="",maxAmount=5000,now=Date.now()}={}){
  const reject=reason=>({accepted:false,reason,rows:[]});
  if(!enabled)return reject("auto_off");
  if(!Array.isArray(items)||items.length!==1)return reject("compound_requires_review");
  const p=items[0],t=norm(p?.text);
  if(!intentSet.has(p?.intent))return reject("not_direct_expense_or_income");
  if(p?.status!=="needs_confirmation"||p?.autoPost===true)return reject("unverified");
  if(!(Number(p.amount)>0)||!Number.isFinite(Number(p.amount))||Number(p.amount)>maxAmount)return reject("amount_limit");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date))||p.date!==today)return reject("date_unclear");
  if(t.length<10||t.length>220||block.test(t)||!currency.test(t))return reject("ambiguous_words");
  if(p.intent==="expense"&&!expenseVerb.test(t))return reject("ambiguous_expense");
  if(p.intent==="income"&&!incomeVerb.test(t))return reject("ambiguous_income");
  if(p.trainedPrediction&&p.trainedPrediction.agreement===false)return reject("model_disagreement");
  if(!p.accountId||!accounts.some(a=>String(a.id)===String(p.accountId)))return reject("account_missing");
  // Auto-post requires the owner to speak an actual account alias, not an inferred default.
  const account=accounts.find(a=>String(a.id)===String(p.accountId));
  const accountNorm=norm(account?.name);
  const explicit=accountNorm.length>=3&&t.includes(accountNorm)||
     (/كاش|نقد/.test(accountNorm)&&/(?:\s|^)الكاش(?:\s|$)|(?:\s|^)كاش(?:\s|$)/.test(t))||
     (/بنك مصر/.test(accountNorm)&&t.includes("بنك مصر"))||
     (/الاهلي/.test(accountNorm)&&t.includes("الاهلي"))||
     (/\bcib\b/.test(accountNorm)&&t.includes("cib"))||
     (/فودافون كاش/.test(accountNorm)&&t.includes("فودافون كاش"));
  if(!explicit)return reject("account_not_spoken");
  const window5=Math.floor(Number(now)/300000);
  const description=String(p.description||p.text||"عملية صوتية").slice(0,90);
  return {accepted:true,reason:"explicit_completed_single_verified_transaction",
    rows:[{type:p.intent,amount:Number(p.amount),date:p.date,accountId:p.accountId,
      description,category:p.category,sourceHash:"flosy39-voice399-"+window5+"-"+
       fingerprint([t,p.intent,p.amount,p.date,p.accountId].join("|"))}]};
 }
 return {norm,decide,version:"3.9.9",autoPostRequiresOptIn:true};
});