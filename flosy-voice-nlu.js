/* Flosy Voice NLU v1 — no paid APIs, runs on transcribed text locally.
 * Multiclass logistic model trained on 14,800 SYNTHETIC Egyptian-Arabic utterances
 * with independent explicit-action safety gates. Not a speech-to-text/audio model.
 * Synthetic held-out result cannot establish real-world accuracy. Never write
 * ledger entries here; FLOSY_CAPTURE performs account, amount and duplicate checks.
 */
(function(w){"use strict";
const PATTERNS=[
 /دفعت|دفعنا|سددت|اديت|أديت|بعت|خصموا/,
 /اشتريت|اشتريتها|اشتري|جبت|شريت|كلفني/,
 /صرفت|صرفنا|مصروف|دفعة|فلوس خرجت|اتخصم/,
 /حولت|حوّلت|حوالة|تحويل|نقلت|نقلتهم/,
 /استلمت|وصلني|وصلتلي|جالي|جاتلي|دخللي/,
 /قبضت|مرتب|راتب|نزل|خدت|اتصرفلي/,
 /رجعلي|اتردلي|استرديت|ردوا|استرداد/,
 /لحسابي|حساباتي|من حسابي|بين حساب|لنفسي|محفظتي|من الفيزا للكاش|من البنك للكاش|للكاش|للبنك/,
 /من (?:الفيزا|البنك|الحساب|الكاش|المحفظة).{0,25}(?:للكاش|للبنك|للمحفظة|لحسابي|للفيزا)/,
 /لخالد|لمحمد|لأحمد|لاصاحبي|لصاحبي|لأخويا|لامي|لأمي|لبابا|لصاحب|للراجل|للمحل/,
 /هشتري|هدفع|هصرف|هحول|هنقل|هقبض|هستلم|هجيب|ناوي|مخطط|بكرة|بكره|المفروض|لو /,
 /مدفعتش|ما دفعتش|ماحولتش|ما حولتش|مشتريتش|ما اشتريتش|متسجلش|ما تسجلش|ملغى|اتلغت/,
 /مش |لسه|يمكن|تقريبا|ممكن/,
 /كام|ازاي|ليه|امتى|ايه|إيه|هل |\?/,
 /سجل|ضيف|اكتب|احسب/,
 /مواصلات|اوبر|مطعم|اكل|قهوة|كافيه|صيدلية|فواتير|ايجار|دوا|بنزين|سوبرماركت|جزم|هدية/,
 /توفير|استثمار|محفظة|كاش|فيزا|بنك/,
 /جنيه|جم|EGP|جنيهات/,
 /\d/,
 /امبارح|اول امبارح|النهارده|اليوم/,
 /فشل|مرفوض|معلق|ملغي|اترفض|استرجع/,
 /رصيدي|ميزانيتي|الحسابات|مساعدة|نصيحة|شرح/,
 /من /,
 /إلى |الى |لـ|لي |ل /,
 /إيداع|ايداع|تحويل وارد/,
 /سحبت|سحب|دفع فلوس/,
 /مش مصروف|مجرد مثال|تجربة|تدريب|مش حقيقي/,
 /اتحول|اتنقل|حولتهم/,
 /استلفت|اقترضت|دين/,
 /دفعت|صرفت|اشتريت|قبضت|وصلني|استلمت|حولت|نقلت/
];
const CLASSES=["expense","income","none","transfer"];
const BIAS=[-0.99503,-0.63032,4.25476,-2.62941];
const WEIGHTS=[
[3.916,4.41362,5.4884,-0.55311,-1.31375,-0.89673,-0.60781,-0.90414,-0.42865,4.14216,-2.18152,-3.62738,-4.01457,-1.80043,-0.87814,1.61327,0.33298,1.4663,0.1186,-0.02082,-1.03017,-0.13593,-0.6286,-0.65656,-0.12854,3.75438,-0.79829,0,0,-0.35888],
[-1.22571,-1.72188,-3.4446,-2.3598,4.15455,3.38751,1.78679,-0.46565,-0.15966,-0.31046,-0.75862,-0.51371,-0.41421,-2.78253,0.90255,-1.90141,-1.96733,-0.03926,-0.03498,0.33048,-1.84045,-0.09454,1.61125,4.30139,0.45152,-0.66676,-0.18311,0,0,0.53392],
[-2.01028,-1.93183,-1.84535,-0.79444,-1.71792,-2.04897,-1.08093,-1.237,-0.49698,-0.45435,3.14082,5.01111,4.72712,4.71482,0.31922,0.7286,0.6604,-0.91931,-0.03177,-0.12583,3.74374,0.27793,-1.41232,-2.12223,-0.20387,-2.69802,1.1853,0,0,-2.37351],
[-0.68001,-0.75991,-0.19845,3.70735,-1.12288,-0.44181,-0.09805,2.60679,1.0853,-3.37735,-0.20068,-0.87002,-0.29834,-0.13186,-0.34363,-0.44046,0.97395,-0.50773,-0.05186,-0.18382,-0.87311,-0.04746,0.42967,-1.5226,-0.1191,-0.3896,-0.20389,0,0,2.19848]
];
const normalize=x=>String(x||"").toLowerCase()
 .replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
 .replace(/ؤ/g,"و").replace(/ئ/g,"ء")
 .replace(/[\u064b-\u065f\u0640]/g,"").replace(/\s+/g," ").trim();
function classify(raw){
 const text=normalize(raw).slice(0,400);
 const feature=PATTERNS.map(r=>r.test(text)?1:0);
 const logits=CLASSES.map((c,i)=>BIAS[i]+feature.reduce((sum,n,j)=>sum+WEIGHTS[i][j]*n,0));
 const max=Math.max(...logits);
 const exps=logits.map(x=>Math.exp(Math.max(-70,x-max)));
 const denom=exps.reduce((a,b)=>a+b,0);
 const probabilities=exps.map(x=>x/denom);
 let best=0;for(let i=1;i<probabilities.length;i++)if(probabilities[i]>probabilities[best])best=i;
 const confidence=probabilities[best];
 // The ML prediction alone is NEVER permission to move money in the ledger.
 const blockedFuture=/(?:هشتري|هدفع|هصرف|هحول|ناوي|مخطط|بكره|بكرة|لسه|المفروض|لو\s+دفعت)/.test(text);
 const blockedNegation=/(?:ما\s*دفعتش|مدفعتش|ما\s*حولتش|ماحولتش|مشتريتش|ما\s*اشتريتش|مش\s*(?:حقيقي|مصروف)|ملغي|اتلغ|فشل|اترفض|مرفوض|مجرد\s*مثال|تجربه)/.test(text);
 const blockedQuestion=/(?:كام|ازاي|امتي|ليه|\?|هل\s+|ممكن\s+ا)/.test(text);
 const internalTransfer=/(?:بين\s+حساب|لحسابي|حساباتي|لنفسي|من\s*(?:الفيزا|البنك|الكاش|الحساب|المحفظه).{0,35}(?:للكاش|للفيزا|للبنك|للمحفظه|لحسابي))/.test(text);
 const safe=!(blockedFuture||blockedNegation||blockedQuestion);
 let label=CLASSES[best];
 if(internalTransfer)label="transfer";
 if(!safe)label="none";
 const explicitExpense=/(?:دفعت|دفعنا|سددت|اديته|اديت|اشتريت|جبت|شريت|صرفت|اتخصم|خصموا|كلفني|سحبت|حولت\s+\S+\s+ل|حولت\s+ل|بعت\s+ل|مصروف)/.test(text);
 const explicitIncome=/(?:قبضت|مرتب\s+نزل|نزل\s+المرتب|استلمت|وصلني|جالي|دخللي|رجعلي|اتردلي|تحويل\s+وارد|ايداع)/.test(text);
 const explicitTransfer=internalTransfer;
 const explicit=(label==="expense"&&explicitExpense)||(label==="income"&&explicitIncome)||
   (label==="transfer"&&explicitTransfer);
 const reliable=safe&&explicit&&confidence>=0.78&&label!=="none"&&
   !(explicitExpense&&explicitIncome);
 return {intent:label,confidence:+confidence.toFixed(4),reliable,
   reason:!safe?"not_completed":internalTransfer?"own_account_transfer":
      !explicit?"missing_explicit_action":confidence<.78?"uncertain_intent":"clear_intent",
   version:"voice-nlu-synthetic-v1"};
}
const DIGITS={
 واحد:1,واحده:1,اتنين:2,اثنين:2,اثنان:2,تنين:2,تلاته:3,تلات:3,ثلاثه:3,ثلاث:3,
 اربعه:4,خمسه:5,سته:6,سبعه:7,تمانيه:8,ثمانيه:8,تسعه:9,
 عشره:10,عشر:10,حداشر:11,احداشر:11,اتناشر:12,اثناشر:12,
 تلاتاشر:13,اربعتاشر:14,خمستاشر:15,ستاشر:16,سبعتاشر:17,
 تمنتاشر:18,تسعتاشر:19,
 عشرين:20,تلاتين:30,ثلاثين:30,اربعين:40,خمسين:50,ستين:60,
 سبعين:70,تمانين:80,ثمانين:80,تسعين:90,
 ميه:100,مائه:100,مايه:100,ميتين:200,متين:200,مئتين:200,مءتين:200,
 تلتميه:300,تلاتميه:300,ثلاثميه:300,اربعمية:400,اربعمائه:400,
 خمسمية:500,خمسميه:500,ستمية:600,ستميه:600,سبعمية:700,سبعميه:700,
 تمنمية:800,تمنميه:800,تسعمية:900,تسعميه:900,
 نص:0.5,نصف:0.5,ربع:0.25
};
const isThousand=t=>/^(?:الف|الفين|الاف)$/.test(t);
const parseWord=t=>{
 let v=normalize(t).replace(/[،؛.!?]/g,"");
 if(Object.prototype.hasOwnProperty.call(DIGITS,v))return DIGITS[v];
 if(v.startsWith("و")&&Object.prototype.hasOwnProperty.call(DIGITS,v.slice(1)))return DIGITS[v.slice(1)];
 return null;
};
function spokenAmount(raw){
 const normalized=normalize(raw).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 // Require a currency after the amount; never parse an arbitrary date/transaction ID.
 const m=normalized.match(/(.{1,180}?)\s*(?:جنيه(?:ات)?|جم\b|egp\b)/);
 if(!m)return null;
 const part=m[1],tokens=part.split(/\s+/);
 const suffix=[];
 for(let i=tokens.length-1;i>=0;i--){
  let tok=tokens[i].replace(/[،؛.!?]/g,"");
  if(tok.startsWith("و")&&isThousand(tok.slice(1)))tok=tok.slice(1);
  if(isThousand(tok)||parseWord(tok)!==null||/^\d+(?:\.\d+)?$/.test(tok)){
   suffix.unshift(tok);if(suffix.length>14)break;
  }else if(suffix.length)break;
 }
 if(!suffix.length)return null;
 let value=0,segment=0;
 for(const rawToken of suffix){
  let token=rawToken.startsWith("و")&&isThousand(rawToken.slice(1))?rawToken.slice(1):rawToken;
  if(isThousand(token)){
   let n=segment||1;if(token==="الفين")n=2;
   value+=n*1000;segment=0;continue;
  }
  const word=parseWord(token);
  const n=word===null?Number(token):word;
  if(!Number.isFinite(n)||n<0)return null;
  segment+=n;
 }
 const amount=value+segment;
 return amount>0&&amount<1e9?+amount.toFixed(2):null;
}
function category(raw,type){
 if(type==="income"){
  return /مرتب|راتب|الشغل|الوظيفه/.test(normalize(raw))?"مرتب":"دخل آخر";
 }
 const t=normalize(raw);
 if(/قهوه|كافيه|كوفي|coffee/.test(t))return "ترفيه";
 if(/دواء|دوا|صيدلي|كشف|دكتور|علاج|hospital/.test(t))return "صحة";
 if(/بنزين|وقود|اوبر|مواصلات|ميكروباص|تاكسي|كريم|uber/.test(t))return "مواصلات";
 if(/مدرسه|كتب|كورسات|دروس|جامعه|تعليم|course/.test(t))return "تعليم";
 if(/ايجار|الشقه|rent/.test(t))return "إيجار";
 if(/سوبر|اكل|اكل|طعام|مطعم|ماركت|grocery/.test(t))return "طعام ومشروبات";
 if(/انترنت|نت\b|wifi|adsl/.test(t))return "فاتورة الإنترنت";
 if(/كهربا|كهرباء/.test(t))return "فاتورة الكهرباء";
 if(/مياه|فاتوره|فواتير|اشتراك/.test(t))return "فواتير";
 if(/هديه|هدية/.test(t))return "الهدايا";
 return "مشتريات";
}
w.FLOSY_VOICE_NLU={classify,spokenAmount,category,modelInfo:{
  model:"4-class logistic regression",training:"14800 synthetic Egyptian Arabic phrases; no user recordings",
  heldOutSynthetic:2960,validation:"synthetic only; real speech/device testing needed",version:1}};
})(window);