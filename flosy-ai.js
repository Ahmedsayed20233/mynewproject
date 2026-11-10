/* Flosy GPT Assistant — OpenAI API via authenticated Supabase Edge Function. */
(function(){
"use strict";
const C=window.FLOSY_BRIDGE;if(!C)return;
const $=id=>document.getElementById(id);
const safe=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let conversation=[],loading=false,sendSummary=false,error="";
const prompts=["أحلل ميزانيتي إزاي؟","أبني صندوق طوارئ مناسب؟","إزاي أنظم مصروفاتي؟","إيه الفرق بين الادخار والاستثمار؟"];
function view(){
 const host=$("flosyAiRoot");if(!host)return;
 const signed=Boolean(C.getSession());
 host.innerHTML=
 '<div class="f2-header"><div><span class="f2-pill">✦ Flosy GPT · OpenAI API</span><h2>مساعدك المالي الذكي</h2><p>اسأل عن ميزانيتك وخططك المالية. لن تُرسل معاملاتك الشخصية إلا بموافقتك.</p></div></div>'+
 '<div class="f2-card flosy-ai-shell"><div class="flosy-ai-ribbon"><div><strong>Flosy Financial Assistant</strong><small>مساعد للتثقيف المالي — لا ينفذ تداولًا أو تحويلات</small></div><span class="f2-chip">'+(signed?"حساب متصل":"سجل الدخول أولًا")+'</span></div>'+
 '<div class="flosy-ai-promptrow">'+prompts.map(p=>'<button class="f2-toolbutton" data-ai-prompt="'+safe(p)+'">'+safe(p)+'</button>').join("")+'</div>'+
 '<div class="flosy-ai-messages" id="flosyAiMessages" role="log" aria-live="polite">'+
 (conversation.length?conversation.map(m=>'<div class="flosy-ai-bubble '+(m.role==="user"?"user":"assistant")+'"><div class="flosy-ai-speaker">'+(m.role==="user"?"أنت":"Flosy AI")+'</div><div>'+safe(m.content).replace(/\n/g,"<br>")+'</div></div>').join(""):'<div class="f2-empty">ابدأ بسؤال أو اختر أحد الأسئلة المقترحة. لا ترسل كلمة سر أو رقم بطاقة أو رمز OTP.</div>')+
 (loading?'<div class="flosy-ai-loading">Flosy AI يحضّر الإجابة…</div>':"")+'</div>'+
 (error?'<div class="f2-warning">'+safe(error)+'</div>':"")+
 '<form id="flosyAiForm" class="flosy-ai-composer"><textarea name="question" id="flosyAiQuestion" rows="3" maxlength="1200" placeholder="اسأل عن مصروفاتك، الطوارئ، أهداف الادخار…" required></textarea>'+
 '<div class="flosy-ai-bottom"><label class="flosy-ai-consent"><input type="checkbox" id="flosyAiConsent" '+(sendSummary?"checked":"")+'> أوافق على إرسال ملخص أرقام حسابي المتزامنة إلى OpenAI مع سؤالي</label>'+
 '<button type="submit" class="f2-toolbutton primary" '+(loading||!signed?"disabled":"")+'>إرسال <span aria-hidden="true">➜</span></button></div></form>'+
 '<div class="f2-privacy">المساعد يعتمد على OpenAI API وليس محادثات حسابك داخل ChatGPT. عند تفعيل خيار الملخص تُرسل إجماليات الدخل والمصروفات والفئات فقط، وليس الرسائل النصية أو أرقام البطاقات أو تفاصيل المعاملات. يتطلب إعداد مفتاح API سريًا في Supabase. الاستخدام قد تكون له تكلفة API منفصلة، والردود تعليمية وليست نصيحة مالية مضمونة.</div>'+
 '<div class="f2-btnrow"><button class="f2-toolbutton" data-ai-clear="true">مسح هذه المحادثة من الشاشة</button></div></div>';
 const area=$("flosyAiMessages");if(area)area.scrollTop=area.scrollHeight;
}
function humanError(code,message){
 const m={
  configuration_required:"خدمة Flosy AI منشورة لكنها تحتاج OPENAI_API_KEY داخل Supabase Edge Function Secrets. لا تضع المفتاح داخل الموقع.",
  login_required:"سجّل الدخول بحساب فلوسي من الإعدادات.",
  session_expired:"انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى.",
  daily_limit:"وصلت لحد 15 سؤالًا اليوم.",
  server_configuration:"إعداد خدمة الذكاء الاصطناعي على الخادم غير مكتمل.",
  rate_limit_unavailable:"تعذر التحقق من حد الاستخدام الآن.",
  openai_error:"تعذر الاتصال بمزوّد الذكاء الاصطناعي. راجع المفتاح ورصيد OpenAI API.",
  forbidden_origin:"هذا الموقع غير مسموح له باستخدام الخدمة."
 };
 return m[code]||message||"تعذر إرسال السؤال. تحقق من اتصال الإنترنت وحالة الخادم.";
}
async function ask(question){
 if(loading)return;
 if(!C.getSession()){error="سجّل دخولك إلى فلوسي أولًا.";view();return}
 const q=question.trim();if(q.length<2||q.length>1200){error="اكتب سؤالًا من حرفين إلى 1200 حرف.";view();return}
 const previous=conversation.slice(-6);
 const consent=$("flosyAiConsent");sendSummary=!!consent?.checked;
 conversation.push({role:"user",content:q});
 error="";loading=true;view();
 try{
  await C.ensureSession();const session=C.getSession();if(!session)throw new Error("login_required");
  const cloud=C.getCloud();
  const url=cloud.url.replace(/\/$/,"")+"/functions/v1/flosy-ai";
  const response=await fetch(url,{method:"POST",headers:{
    "Authorization":"Bearer "+session.access_token,"apikey":cloud.key,"Content-Type":"application/json"},
    body:JSON.stringify({question:q,include_finances:sendSummary,history:previous})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(humanError(data.error,data.message));
  if(!data.answer||typeof data.answer!=="string")throw new Error("الخدمة لم تُرجع إجابة.");
  conversation.push({role:"assistant",content:data.answer.slice(0,6000)});
 }catch(err){
  error=err.message||"تعذر التواصل مع المساعد.";
  // Do not silently fabricate a ChatGPT response.
 }finally{loading=false;view()}
}
document.addEventListener("click",e=>{
 const p=e.target.closest("[data-ai-prompt]");if(p){const a=$("flosyAiQuestion");if(a){a.value=p.dataset.aiPrompt;a.focus()}}
 if(e.target.closest("[data-ai-clear]")){conversation=[];error="";view()}
});
document.addEventListener("submit",e=>{if(e.target.id!=="flosyAiForm")return;e.preventDefault();ask($("flosyAiQuestion").value)});
document.addEventListener("change",e=>{if(e.target.id==="flosyAiConsent")sendSummary=e.target.checked});
window.FLOSY_AI={render:view};
view();
})();