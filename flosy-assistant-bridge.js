/* Flosy assistant: local verified financial arithmetic and explicit ChatGPT handoff.
   Never claims a ChatGPT subscription is connected or auto-saves an AI action. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id);
const M=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(n)||0)+" ج.م";
const N=x=>Number.isFinite(Number(x))?Number(x):0;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function evidence(){
 const state=C.getState()||{},m=new Date(),period=[m.getFullYear(),String(m.getMonth()+1).padStart(2,"0")].join("-");
 const transactions=(state.transactions||[]).filter(t=>typeof t.date==="string"&&t.date.startsWith(period));
 const income=transactions.filter(t=>t.type==="income").reduce((s,t)=>s+N(t.amount),0);
 const expenses=transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+N(t.amount),0);
 let safe=null;try{safe=w.FLOSY_PHASE1?.calculate?.()||null}catch{}
 return {period,income,expenses,transactionCount:transactions.length,
  safe:safe?.safe??null,daily:safe?.daily??null,days:safe?.days??null,
  obligations:safe?.obligations??null};
}
function localInsight(){
 const v=evidence();
 const lines=["تحليل حسابي محلي من بياناتك المسجلة — ليس ChatGPT ولا نصيحة استثمارية.",
  "الشهر: "+v.period+"، عدد المعاملات: "+v.transactionCount,
  "الدخل المسجل: "+M(v.income)+"، المصروفات: "+M(v.expenses),
  "الفرق بين الدخل والمصروف المسجل: "+M(v.income-v.expenses)];
 if(v.safe!==null)lines.push("المبلغ الإضافي الآمن للصرف: "+M(v.safe)+"، يوميًا: "+M(v.daily)+
  " حتى الراتب المخطط بعد "+v.days+" يوم");
 lines.push("راجع الأرصدة والالتزامات قبل اتخاذ قرار؛ لا يوجد اتصال مباشر بالبنوك.");
 return lines.join("\n");
}
function promptForChatGPT(includeSummary){
 const question=String(E("flosyAiQuestion")?.value||"").trim().slice(0,1200)||
  "ساعدني في تنظيم دخلي ومصاريفي وميزانية الطوارئ.";
 let result="أنت مساعد تخطيط ميزانية. أعطني خطوات واضحة بدون افتراض بيانات غير موجودة أو تنفيذ معاملات.\nالسؤال: "+question;
 if(includeSummary){
  const v=evidence();
  result+="\n\nأنا أختار مشاركة ملخص أرقامي المسجلة يدويًا، وليست أرصدة بنك مؤكدة:\n"+
   "الفترة: "+v.period+", الدخل: "+v.income+" جنيه، المصروفات: "+v.expenses+
   " جنيه، عدد المعاملات: "+v.transactionCount+
   (v.safe===null?"":", Safe to Spend: "+v.safe+" جنيه، التزامات: "+v.obligations+" جنيه");
 }
 return result;
}
function tell(message){const v=E("flosyAssistResult");if(v)v.textContent=String(message);}
function render(){
 const root=E("flosyAssistantBridgeRoot");if(!root)return;
 root.innerHTML='<div class="v4-surface" style="margin-top:16px"><div class="v4-head"><h3>مساعد المهام المالية · Flosy Tools</h3><span class="v4-badge">خصوصيتك أولًا</span></div>'+
 '<p>يمكنك تحليل بياناتك محليًا بدون API، أو نسخ سؤال وفتحه في ChatGPT بنفسك. ربط ChatGPT المدفوع داخل Flosy يحتاج مفتاح OpenAI API منفصلًا على الخادم.</p>'+
 '<div class="v4-chips" style="margin:12px 0;gap:8px">'+
 '<button type="button" class="v4-btn" data-ai-tools="local">حلّل أرقامي محليًا</button>'+
 '<button type="button" class="v4-btn secondary" data-ai-tools="chatgpt">افتح ChatGPT بسؤالي</button>'+
 '<button type="button" class="v4-btn secondary" data-ai-tools="expense">حوّل السؤال إلى مصروف للمراجعة</button>'+
 '<button type="button" class="v4-btn secondary" data-ai-tools="health">افحص اتصال Flosy AI</button>'+
 '<button type="button" class="v4-btn secondary" data-ai-tools="capture">صوت أو صورة إيصال</button></div>'+
 '<pre id="flosyAssistResult" role="status" aria-live="polite" style="white-space:pre-wrap;word-break:break-word;border:1px solid #DFEBE8;border-radius:12px;padding:13px;background:#F6FAF9;color:#214C52;font:inherit;line-height:1.8">اختر أداة، ولا تُدخل كلمات سر أو رموز OTP.</pre>'+
 '<p class="v4-fineprint">لا يتم إرسال بيانات مالية إلى ChatGPT بهذه الأزرار؛ إن اخترت تضمين الملخص المالي فسيُنسخ للنص وتراجعه قبل إرساله بنفسك. Flosy AI عبر API يتطلب تفعيله بشكل منفصل.</p></div>';
}
async function health(){
 if(!C.getSession()?.user){tell("التطبيق غير مسجّل الدخول؛ سجّل دخولك من إعدادات Flosy لتمكين المساعد الذكي.");return}
 try {
  const cfg=C.getCloud();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfg.url))throw Error("عنوان الخادم غير صالح");
  const res=await fetch(cfg.url.replace(/\/$/,"")+"/functions/v1/flosy-ai?health=1",{
   method:"GET",headers:{"apikey":cfg.key}});
  const o=await res.json();
  if(!res.ok)throw Error(o.error||"HTTP "+res.status);
  tell(o.ai_ready?"خادم Flosy AI جاهز بمفتاح API على الخادم. جرّب سؤالًا من الواجهة أعلاه.":
   "خادم Flosy AI يعمل، لكن مفتاح OPENAI_API_KEY غير مضاف إلى Supabase Secrets. أزرار التحليل المحلي وChatGPT الخارجية تعمل دون المفتاح.");
 }catch(e){tell("تعذر اختبار خدمة AI: "+e.message+" — هذا ليس تأكيدًا أن المفتاح موجود.")}
}
document.addEventListener("click",async ev=>{
 const action=ev.target?.closest?.("[data-ai-tools]")?.dataset?.aiTools;
 if(!action)return;
 if(action==="local"){tell(localInsight());return}
 if(action==="capture"){C.goto("v4-capture");return}
 if(action==="expense"){
  const q=String(E("flosyAiQuestion")?.value||"").trim();
  if(!q){tell("اكتب جملة مثل: دفعت 80 جنيه على القهوة، ثم جرّب تحويلها للمعاملة.");return}
  try{
   const draft=w.FLOSY_CAPTURE?.parseVoice?.(q);
   if(!draft)throw Error("أداة تحليل المعاملات غير متاحة");
   w.FLOSY_CAPTURE.parseReview(draft,"معاملة مقترحة من سؤالك وليست مصروفًا محفوظًا. راجع كل حقل ثم وافق على الحفظ.");
   C.goto("v4-capture");tell("تم فتح شاشة مراجعة المصروف. لا شيء محفوظ بعد.");
  }catch(e){tell("تعذر تحويل السؤال إلى معاملة: "+e.message)}
  return;
 }
 if(action==="health"){await health();return}
 if(action==="chatgpt"){
  const sharing=Boolean(E("flosyAiConsent")?.checked);
  if(sharing&&!w.confirm("ستنسخ أرقامًا مالية إلى سؤال ChatGPT. هل وافقت على ذلك؟"))return;
  const text=promptForChatGPT(sharing);
  const tab=w.open("https://chatgpt.com/","_blank","noopener,noreferrer");
  try{await navigator.clipboard.writeText(text);tell("تم نسخ السؤال فقط. افتح ChatGPT والصقه بعد المراجعة؛ لا توجد مشاركة تلقائية.");}
  catch{tell("النسخ الآلي غير متاح. راجع النص وانسخه بنفسك:\n\n"+text)}
  if(!tab)tell("قد يكون المتصفح منع فتح النافذة. افتح chatgpt.com ثم راجع السؤال والصقه يدويًا:\n\n"+text);
 }
});
w.FLOSY_ASSIST_TOOLS={render,evidence,localInsight,promptForChatGPT,health};
render();
})(window);
