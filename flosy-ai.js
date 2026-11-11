/* Flosy Free Coach — zero-cost explainable local assistant, with optional paid API.
   Local mode never transmits chat or financial data. No ChatGPT impersonation. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const $=id=>document.getElementById(id);
const escapeHTML=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(n)||0)+" جنيه";
const num=x=>Number.isFinite(Number(x))&&Number(x)>=0?Number(x):0;
const selected=()=>String($("flosyAiQuestion")?.value||"");
const prompts=["أحلل ميزانيتي إزاي؟","أبني صندوق طوارئ مناسب؟","إزاي أنظم مصروفاتي؟","رتب لي أقساطي","إيه أكبر فئات الصرف؟"];
let conversation=[],loading=false,consent=false,error="",mode="free";
function dateString(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function snapshot(){
 const state=C.getState()||{},now=new Date(),month=dateString(now).slice(0,7),
 start=new Date(now);start.setDate(start.getDate()-90);
 const since=dateString(start),tx=(Array.isArray(state.transactions)?state.transactions:[])
  .filter(x=>typeof x.date==="string"&&x.date>=since&&x.date<=dateString(now));
 const monthTx=tx.filter(x=>x.date.startsWith(month));
 const sum=(arr,type)=>arr.filter(t=>t.type===type).reduce((a,t)=>a+num(t.amount),0);
 const categories={};
 for(const t of monthTx)if(t.type==="expense"){
  const k=String(t.category||"غير مصنف").slice(0,60);
  categories[k]=(categories[k]||0)+num(t.amount);
 }
 const top=Object.entries(categories).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const settings=state.settings||{};
 const debts=(Array.isArray(state.liabilities)?state.liabilities:[])
  .filter(x=>num(x.balance)>0).map(x=>({name:String(x.name||"دين").slice(0,35),
   balance:num(x.balance),monthly:num(x.installment)}));
 let safe=null;
 try{safe=w.FLOSY_PHASE1?.calculate?.()||null}catch{}
 return {month,transactions:monthTx.length,periodTransactions:tx.length,
  income:sum(monthTx,"income"),spending:sum(monthTx,"expense"),
  income90:sum(tx,"income"),spending90:sum(tx,"expense"),
  categories:top,debts,plannedSalary:num(settings.salary),
  plannedRent:num(settings.rent),plannedBills:num(settings.bills),
  plannedLiving:num(settings.living),emergencyTarget:num(settings.emergencyTarget),
  safeDaily:typeof safe?.daily==="number"?safe.daily:null,
  safeAdditional:typeof safe?.safe==="number"?safe.safe:null,
  days:typeof safe?.days==="number"?safe.days:null};
}
function answerFree(question){
 const q=String(question||"").trim().toLowerCase(),s=snapshot();
 const lines=["**مساعد فلوسي المحلي المجاني** — حسابات من السجلات المدخلة، وليس ردًا من ChatGPT.",
  "الشهر "+s.month+" · "+s.transactions+" معاملات مسجلة · دخل "+fmt(s.income)+
  " · مصروف "+fmt(s.spending)+" · صافي حركة "+fmt(s.income-s.spending)+"."];
 if(!s.transactions)lines.push("ملاحظة: لا توجد معاملات كثيرة مسجلة لهذا الشهر؛ النتائج ناقصة وليست أرصدة بنكية مؤكدة.");
 const planned=s.plannedRent+s.plannedBills+s.plannedLiving;
 const savings=s.plannedSalary-planned;
 if(/طوار|أمان|أزمة|وظيف|فقدان/.test(q)){
  lines.push("**صندوق الطوارئ:** المصروفات الشهرية المخططة "+fmt(planned)+
   "؛ تغطية 3 أشهر "+fmt(planned*3)+"، و6 أشهر "+fmt(planned*6)+
   ". الهدف الذي سجلته: "+fmt(s.emergencyTarget)+".");
  if(s.emergencyTarget>0&&s.plannedSalary>0&&savings>0)lines.push(
   "لو ادخرت كامل الفائض المخطط "+fmt(savings)+" شهريًا فمن الصفر قد تحتاج نحو "+
   Math.ceil(s.emergencyTarget/savings)+" شهرًا. هذا سيناريو وليس وعدًا.");
  lines.push("ابدأ بتحديد مصروف ضروري فعلي واحسب كم شهرًا تغطيه مدخرات الطوارئ، ولا تستخدم استثمارات متقلبة كبديل للسيولة.");
 }else if(/قسط|أقساط|ديون|دين|قرض|مستحق|فاتور/.test(q)){
  lines.push("**الالتزامات:** "+s.debts.length+" ديون نشطة مسجلة؛ إجمالي الرصيد المتبقي "+
   fmt(s.debts.reduce((a,d)=>a+d.balance,0))+
   "، والأقساط الشهرية المدخلة "+fmt(s.debts.reduce((a,d)=>a+d.monthly,0))+".");
  if(s.debts.length)lines.push(s.debts.slice(0,4).map(d=>d.name+" — متبقي "+fmt(d.balance)+" / قسط "+fmt(d.monthly)).join("\n"));
  lines.push("راجع تواريخ الاستحقاق في صفحة الأقساط أولًا. لا تسجل القسط مرة ثانية إذا كان محسوبًا ضمن معاملة فعلية.");
 }else if(/فئ|تصنيف|أكبر|أكثر|فين|صرف|مصاريف|ميزاني|توفير|ادخار|تقرير/.test(q)){
  lines.push("**أكبر فئات المصروف المسجل هذا الشهر:** "+
   (s.categories.length?s.categories.map(([c,v],i)=>(i+1)+") "+c+": "+fmt(v)).join(" · "):"لا يوجد تصنيف مصروفات مسجل")+".");
  if(s.spending>0&&s.categories.length){
   const [k,v]=s.categories[0];
   lines.push("أكبر فئة هي "+k+" وتشكل "+Math.round(100*v/s.spending)+"٪ من المصروفات المسجلة. راجعها قبل تحديد سقف خفض.");
  }
  lines.push("**الخطة المخططة:** الراتب "+fmt(s.plannedSalary)+" - (إيجار "+fmt(s.plannedRent)+
   " + فواتير "+fmt(s.plannedBills)+" + معيشة "+fmt(s.plannedLiving)+") = "+
   fmt(savings)+" فائض مخطط؛ لا يعني أنه متاح فعلًا في البنك.");
 }else if(/آمن|النهاردة|اليوم|أصرف|اصرف|safe/.test(q)){
  lines.push(s.safeDaily===null?"حساب Safe to Spend غير متاح حتى تملأ حساباتك والتزاماتك.":
   "**آمن للصرف بحسب بياناتك:** "+fmt(s.safeDaily)+" إضافي يوميًا"+
   (s.days===null?"":" خلال "+s.days+" يومًا")+ ". لا يشمل أموال الاستثمار والطوارئ المحجوزة.");
  lines.push("لا تعتمد على هذا الرقم قبل التأكد من أرصدة الحسابات والالتزامات غير المسجلة.");
 }else if(/سجل|ضيف|إضافة|اضف|معامل|دفعت|صرفت|اشتريت/.test(q)){
  lines.push("أقدر أجهز معاملتك للمراجعة: افتح «سجّل مصروف» أو اضغط «حوّل السؤال إلى مصروف للمراجعة» أدناه. لن أحفظ شيئًا تلقائيًا.");
 }else{
  lines.push("**اقتراحان عمليان:** 1) طابق معاملات هذا الشهر بكشف البنك. 2) حدد التزامات الشهر القادم قبل تخصيص أي ادخار أو إنفاق.");
  lines.push("اسألني عن: صندوق الطوارئ، الأقساط، أكبر فئات المصروف، المبلغ الآمن للصرف، أو الميزانية.");
 }
 lines.push("طريقة الحساب واضحة ومبنية على بياناتك المسجلة فقط؛ لا يوجد وصول مباشر للبنوك أو استثمار أو تحويل تلقائي.");
 return lines.join("\n");
}
function view(){
 const root=$("flosyAiRoot");if(!root)return;
 const signed=Boolean(C.getSession());
 root.innerHTML='<div class="f2-header"><div><span class="f2-pill">✳ Flosy Coach · مجاني</span><h2>مساعدك المالي داخل فلوسي</h2>'+
 '<p>مساعد محلي يفهم أسئلة الميزانية ويحسب من بياناتك دون اتصال أو مفتاح API. ويمكنك اختيار Gemini Free من حسابك الشخصي.</p></div></div>'+
 '<div class="f2-card flosy-ai-shell"><div class="flosy-ai-ribbon"><div><strong>Flosy Money Coach</strong>'+
 '<small>المجاني تحليل قواعد وحسابات، وليس نموذج ChatGPT أو ذكاء اصطناعي توليدي.</small></div>'+
 '<span class="f2-chip">'+(mode==="free"?"مجاني · محلي":mode==="gemini"?(signed?"Gemini Free · حسابك":"Gemini · سجّل الدخول"):(signed?"OpenAI API":"OpenAI · يتطلب تسجيل دخول"))+'</span></div>'+
 '<label style="display:block;margin:10px 0;font-weight:700">نوع المساعد <select id="flosyAiMode" aria-label="نوع مساعد Flosy">'+
 '<option value="free" '+(mode==="free"?"selected":"")+'>مساعد Flosy المحلي المجاني — يعمل بدون اشتراك</option>'+
 '<option value="gemini" '+(mode==="gemini"?"selected":"")+'>Gemini API Free — حساب شخصي بدون رسوم إضافية</option>'+ 
 '<option value="api" '+(mode!=="free"?"selected":"")+'>OpenAI API (اختياري، يتطلب إعدادًا مدفوعًا)</option></select></label>'+
 '<div class="flosy-ai-promptrow">'+prompts.map(p=>'<button type="button" class="f2-toolbutton" data-ai-prompt="'+escapeHTML(p)+'">'+escapeHTML(p)+'</button>').join("")+'</div>'+
 '<div class="flosy-ai-messages" id="flosyAiMessages" role="log" aria-live="polite">'+
 (conversation.length?conversation.map(x=>'<div class="flosy-ai-bubble '+(x.role==="user"?"user":"assistant")+'"><div class="flosy-ai-speaker">'+(x.role==="user"?"أنت":x.kind==="gemini"?"Gemini Free":x.kind==="api"?"OpenAI API":"Flosy المحلي")+
 '</div><div>'+escapeHTML(x.content).replace(/\n/g,"<br>")+'</div></div>').join(""):
 '<div class="f2-empty">اسأل عن الميزانية والطوارئ والأقساط. الخدمة المجانية لا تحتاج تسجيل دخول أو مفتاح API.</div>')+
 (loading?'<div class="flosy-ai-loading">جارٍ التحليل…</div>':"")+'</div>'+
 (error?'<div class="f2-warning">'+escapeHTML(error)+'</div>':"")+
 '<form id="flosyAiForm" class="flosy-ai-composer"><textarea name="question" id="flosyAiQuestion" rows="3" maxlength="1200" required placeholder="مثلًا: احسبلي صندوق طوارئ 6 شهور"></textarea>'+
 (mode==="api"?'<label class="flosy-ai-consent"><input type="checkbox" id="flosyAiConsent" '+(consent?"checked":"")+
 '> '+(mode==="gemini"?"أوافق على إرسال موضوع عام ونِسَب مُقرّبة إلى Gemini Free فقط. لن نرسل السؤال الأصلي أو رسائل البنك. قد تستخدم Google المحتوى لتحسين خدماتها.":"أوافق على إرسال ملخص مالي مجمع للخادم وOpenAI (اختياري)")+'</label>':'<p class="v4-fineprint">بياناتك لا تخرج من الجهاز في الوضع المجاني.</p>')+
 '<div class="flosy-ai-bottom"><button type="submit" class="f2-toolbutton primary" '+(loading?"disabled":"")+
 '>اسأل المساعد <span aria-hidden="true">➜</span></button></div></form>'+
 '<div class="f2-btnrow"><button type="button" class="f2-toolbutton" data-ai-clear="true">مسح المحادثة من الشاشة</button></div>'+
 '<div class="f2-privacy">الوضع المحلي لا يرسل بيانات. Gemini Free اختيار شخصي محدود ويستقبل نوع السؤال ونسبًا عامة منقحة فقط؛ دون أرقام الحسابات أو نصوص SMS أو الصور. اشتراك Google AI Pro لا يغطي API.</div></div>';
 const area=$("flosyAiMessages");if(area)area.scrollTop=area.scrollHeight;
}
function humanError(code,message){
 const errors={configuration_required:"OpenAI API لم يُفعّل في Supabase. استخدم المساعد المجاني الآن.",
 login_required:"سجّل الدخول لتستخدم OpenAI API، أو استخدم المساعد المجاني.",
 session_expired:"انتهت الجلسة. سجّل الدخول من جديد.",
 daily_limit:"استهلكت الحد اليومي لطلبات API. المساعد المجاني يعمل دائمًا.",
 openai_error:"خادم OpenAI غير متاح أو لا يوجد رصيد API. جرّب المساعد المجاني.",
 server_configuration:"خادم OpenAI غير مهيّأ بالكامل.",rate_limit_unavailable:"تعذر التحقق من حد API اليومي.",
 forbidden_origin:"المصدر غير معتمد لخدمة API."};
 return errors[code]||message||"تعذر استخدام OpenAI API. المساعد المجاني متاح.";
}
async function ask(question){
 if(loading)return;
 const q=String(question||"").trim();
 if(q.length<2||q.length>1200){error="اكتب سؤالًا من حرفين إلى 1200 حرف.";view();return}
 const history=conversation.slice(-6),selectedMode=mode;
 consent=Boolean($("flosyAiConsent")?.checked);
 conversation.push({role:"user",content:q});error="";
 if(selectedMode==="free"){
  conversation.push({role:"assistant",kind:"free",content:answerFree(q)});
  view();return;
 }
 if(!C.getSession()){error="OpenAI يتطلب تسجيل الدخول وإعداد API؛ انتقل للوضع المجاني لتبدأ فورًا.";view();return}
 loading=true;view();
 try{
  await C.ensureSession();
  const session=C.getSession();if(!session)throw Error("login_required");
  const cfg=C.getCloud();
  const response=await fetch(cfg.url.replace(/\/$/,"")+"/functions/v1/flosy-ai",{
   method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"apikey":cfg.key,"Content-Type":"application/json"},
   body:JSON.stringify({question:q,include_finances:consent,history:history.map(m=>({role:m.role,content:m.content}))})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(humanError(data.error,data.message));
  if(typeof data.answer!=="string"||!data.answer)throw Error("لا توجد إجابة من API");
  conversation.push({role:"assistant",kind:"api",content:data.answer.slice(0,6000)});
 }catch(err){error=err?.message||"فشل اتصال API — جرّب المساعد المجاني."}
 finally{loading=false;view()}
}
document.addEventListener("click",e=>{
 const b=e.target?.closest?.("[data-ai-prompt]");
 if(b){const field=$("flosyAiQuestion");if(field){field.value=b.dataset.aiPrompt;field.focus()}}
 if(e.target?.closest?.("[data-ai-clear]")){conversation=[];error="";view()}
});
document.addEventListener("change",e=>{
 if(e.target?.id==="flosyAiMode"){mode=["api","gemini"].includes(e.target.value)?e.target.value:"free";error="";view()}
 if(e.target?.id==="flosyAiConsent")consent=!!e.target.checked;
});
document.addEventListener("submit",e=>{
 if(e.target?.id!=="flosyAiForm")return;
 e.preventDefault();ask($("flosyAiQuestion")?.value);
});
w.FLOSY_AI={render:view,ask,snapshot,answerFree};
view();
})(window);
