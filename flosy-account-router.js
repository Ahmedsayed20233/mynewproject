/* Flosy multi-bank account routing v1 — offline, read-only, no default first account.
 * A missing or contradictory account hint means review, NEVER guessing.
 */
(function(w){"use strict";
const toDigits=s=>String(s||"").normalize("NFKC").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
const norm=s=>toDigits(s).toLowerCase().replace(/[\u064b-\u065f\u0640\u200c-\u200f]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/\s+/g," ").trim();
const BANKS=[
 ["cib",/(?:\bcib\b|commercial international|التجاري الدولي)/i],
 ["nbe",/(?:\bnbe\b|national bank of egypt|البنك الاهلي)/i],
 ["banque-misr",/(?:banque misr|bank misr|بنك مصر)/i],
 ["qnb",/(?:\bqnb\b|قطر الوطني)/i],
 ["alexbank",/(?:alexbank|بنك الاسكندريه)/i],
 ["bdc",/(?:banque du caire|بنك القاهره)/i],
 ["hsbc",/(?:\bhsbc\b)/i],
 ["aaib",/(?:\baaib\b|العربي الافريقي)/i],
 ["vodafone-cash",/(?:vodafone cash|فودافون كاش)/i],
 ["orange-cash",/(?:orange cash|اورنج كاش)/i],
 ["etisalat-cash",/(?:etisalat cash|e& cash|اتصالات كاش)/i]
];
const bankOf=s=>BANKS.find(x=>x[1].test(norm(s)))?.[0]||"";
function suffixes(text){
 const s=norm(text),matched=[];
 const rx=/(?:account|acct|a\/c|card|ending(?:\s+in)?|بطاق[هت]|كارت|حساب|الحساب|فيزا|[x*●•]{2,})[\s:#*x●•.\-]{0,16}([0-9]{4})(?![0-9])/gi;
 let m;while((m=rx.exec(s))!==null){matched.push(m[1]);if(matched.length>=5)break;}
 return [...new Set(matched)];
}
const suffix=a=>{
 const explicit=toDigits(a?.last4||"");
 if(/^\d{4}$/.test(explicit))return explicit;
 // Existing account name "CIB ••••1234" remains compatible.
 const m=norm(a?.name||"").match(/(?:\*{2,}|x{2,}|[•●]{2,}|\s)(\d{4})$/i);
 return m?m[1]:"";
};
function match(accounts,opts={}){
 const list=(Array.isArray(accounts)?accounts:[]).filter(a=>a&&a.id);
 const text=String(opts.text||"").slice(0,2000);
 const from=String(opts.sender||"").slice(0,90);
 const digits=suffixes(text);
 if(digits.length>1)return {id:"",reason:"multiple-account-identifiers"};
 const senderBank=bankOf(from),textBank=senderBank?"":bankOf(text),bank=senderBank||textBank;
 const configured=list.find(a=>String(a.id)===String(opts.defaultAccountId||""));
 if(digits.length===1){
  const suffixMatch=list.filter(a=>suffix(a)===digits[0]);
  if(suffixMatch.length!==1)return {id:"",reason:suffixMatch.length?"ambiguous-last4":"unrecognized-last4"};
  const found=suffixMatch[0];
  const accountBank=bankOf([found.bankName,found.bank,found.name].filter(Boolean).join(" "));
  if(bank&&accountBank&&bank!==accountBank)return {id:"",reason:"bank-last4-conflict"};
  return {id:String(found.id),reason:"last4",confidence:"high"};
 }
 if(bank){
  const candidates=list.filter(a=>bankOf([a.bankName,a.bank,a.name].filter(Boolean).join(" "))===bank);
  if(candidates.length===1)return {id:String(candidates[0].id),reason:"unique-bank",confidence:"medium"};
  if(candidates.length>1)return {id:"",reason:"multiple-accounts-at-bank"};
  // Never fall back to a conflicting explicitly selected default account.
  if(configured&&bankOf([configured.bankName,configured.bank,configured.name].filter(Boolean).join(" "))!==bank)
   return {id:"",reason:"bank-not-configured"};
  return {id:"",reason:"bank-not-configured"};
 }
 if(list.length===1)return {id:String(list[0].id),reason:"sole-account",confidence:"medium"};
 if(configured)return {id:String(configured.id),reason:"explicit-owner-default",confidence:"medium"};
 return {id:"",reason:"select-account"};
}
w.FLOSY_ACCOUNT_ROUTER={match,suffixes,bankOf,version:"1.0.0"};
})(window);
