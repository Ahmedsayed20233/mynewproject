/* Flosy staged financial message parser — intentionally DISABLED.
 * This module does NOT subscribe to SMS, notifications, BroadcastReceivers,
 * Android bridges, background tasks or the ledger. No raw messages are saved.
 * A future release must separately pass permission, consent and device review.
 */
(function(root){"use strict";
 const ENABLED=false; // NOT user-configurable in this release.
 const rejectSecrets=/(?:\b(?:otp|pin|cvv|one[ -]?time|passcode|verification\s*code|login\s*code)\b|رمز\s*(?:التحقق|الدخول|السري)|كود\s*(?:التفعيل|التحقق|الدخول)|كلمة\s*المرور)/i;
 const rejectPending=/(?:pending|declined|failed|rejected|cancelled|canceled|unsuccessful|معلق|معلّق|قيد\s*التنفيذ|فشل|مرفوض|لم\s*تتم|ملغاة|ملغي)/i;
 const normalize=(x)=>String(x??"").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/٫/g,".").replace(/٬/g,",")
  .replace(/[أإآ]/g,"ا").replace(/\s+/g," ").trim();
 function amountFrom(text){
  const t=normalize(text);
  // A balance is not a transaction amount: anchor to the action phrase.
  const action=/(?:تم\s*)?(?:خصم|سحب|دفع|شراء|ايداع|اضافة|استلام|تحويل|credited|debited|spent|purchase|paid|withdrawn|received)\s*(?:مبلغ|بمبلغ|قيمه|بقيمة|amount|of)?\s*[:：-]?\s*/ig;
  let m;
  while((m=action.exec(t))){
   const chunk=t.slice(action.lastIndex,action.lastIndex+65);
   const value=chunk.match(/^\s*(?:egp|جم|جنيه)\s*([0-9][0-9,.]*)|^\s*([0-9][0-9,.]*)\s*(?:egp\b|جم\b|جنيه(?:ات)?\b)/i);
   if(!value)continue;
   const raw=value[1]||value[2];
   let cleaned=raw.replace(/,/g,"");
   if(/^\d+\.\d{1,2}$/.test(cleaned)||/^\d+$/.test(cleaned)){
    const n=Number(cleaned);
    if(Number.isFinite(n)&&n>0&&n<1e9)return Math.round(n*100)/100;
   }
  }
  return null;
 }
 function direction(text){
  const t=normalize(text);
  if(/(?:من\s*حسابي\s*الى\s*حسابي|من\s*البنك\s*(?:ل|الى)\s*الكاش|بين\s*حساباتي)/i.test(t))
   return "transfer";
  const debit=/(?:خصم|سحب|دفع|شراء|debited|spent|paid|purchase|withdrawn)/i.test(t);
  const credit=/(?:ايداع|اضافة|استلام|وصلني|قبض|credited|received)/i.test(t);
  return debit===credit?null:(debit?"expense":"income");
 }
 function fingerprint(fields){
  // Non-cryptographic idempotency hint only; final cross-source matching lives in ledger.
  const key=[fields.accountId,fields.type,fields.amount.toFixed(2),fields.date,
   fields.reference||""].join("|");
  let h=2166136261;
  for(const c of key){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16).padStart(8,"0");
 }
 function previewSynthetic(text,opts={}){
  const value=String(text??"");
  if(value.length>3000)return {status:"invalid",reason:"message-too-long"};
  if(rejectSecrets.test(value))return {status:"blocked",reason:"secret-or-otp"};
  if(rejectPending.test(value))return {status:"blocked",reason:"not-completed"};
  if(!["sms","notification"].includes(opts.source))return {status:"invalid",reason:"unsupported-source"};
  const amount=amountFrom(value),type=direction(value);
  if(!amount||!type)return {status:"review",reason:"uncertain-financial-event"};
  if(type==="transfer")return {status:"review",reason:"transfer-needs-two-explicit-accounts"};
  if(!opts.accountId)return {status:"review",reason:"account-required",amount,type};
  const date=/^\d{4}-\d{2}-\d{2}$/.test(String(opts.date||""))?opts.date:null;
  if(!date)return {status:"review",reason:"verified-date-required",amount,type};
  const event={type,amount,date,accountId:String(opts.accountId),source:opts.source};
  return {status:"candidate",reason:"preview-only",...event,fingerprint:fingerprint(event)};
 }
 function ingest(){return {status:"disabled",reason:"message-import-not-enabled"};}
 const api=Object.freeze({enabled:()=>ENABLED,ingest,previewSynthetic,
  policy:Object.freeze({requiresExplicitConsent:true,allowsAutoPost:false,readsInbox:false,
   listensToNotifications:false,storesRawMessages:false,requiresVerifiedAccount:true})});
 root.FLOSY_STAGED_IMPORT=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
