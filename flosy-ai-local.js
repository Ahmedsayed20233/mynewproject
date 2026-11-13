/* Flosy local-only compatibility assistant used by the unified finance engine.
 * No OpenAI, ChatGPT, Gemini, proxy endpoint or external model request.
 */
(function(w,d){"use strict";
 const C=w.FLOSY_BRIDGE;
 if(!C)return;
 const root=()=>d.getElementById("flosyAiRoot");
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(n)||0)+" ج.م";
 const month=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
 let chat=[],error="";
 function snapshot(){
  const s=C.getState()||{},now=month(),rows=(s.transactions||[]).filter(x=>x.date?.slice(0,7)===now&&
   !["draft","pending","failed","reversed"].includes(x.status)&&+x.amount>0);
  const sum=type=>rows.filter(x=>x.type===type).reduce((v,x)=>v+Number(x.amount||0),0);
  let safe=null;try{safe=w.FLOSY_PHASE1?.calculate?.()||null}catch{}
  return {month:now,income:sum("income"),spending:sum("expense"),
   transactions:rows.length,safeDaily:safe?.daily??null,safeAdditional:safe?.safe??null};
 }
 function answerFree(question){
  const q=String(question||"").trim(),s=snapshot();
  const response=w.FLOSY_LOCAL_ANALYTICS?.query?.(q,C.getState(),new Date());
  if(response?.text&&response.intent!=="out-of-scope")return response.text;
  if(/طوار|ادخار|توفير/.test(q))return "صندوق الطوارئ الأفضل يتحدد من المصاريف الضرورية المسجلة. دخلك "+money(s.income)+
   " ومصروفاتك "+money(s.spending)+"؛ حدد هدف السيولة حسب التزاماتك.";
  if(/آمن|امن|اصرف/.test(q))return s.safeAdditional===null?
   "عرّف الالتزامات والحسابات الأول علشان نحسب Safe to Spend.":"المتاح الآمن للصرف "+money(s.safeAdditional)+".";
  return "مساعد فلوسي المحلي: دخل الفترة "+money(s.income)+"، مصروفات "+money(s.spending)+
   ". تقدر تسألني عن أكبر الفئات والمقارنة بين الشهور.";
 }
 function view(){
  const target=root();if(!target)return;
  target.innerHTML='<section class="card" style="padding:14px"><h3>فلوسي AI · تحليل محلي فقط</h3>'+
   '<p style="color:var(--muted)">بدون ربط بأي API خارجي؛ السؤال والرد من بيانات فلوسي المسجلة.</p>'+
   '<div id="flosyAiMessages">'+chat.slice(-25).map(x=>
    '<div style="padding:9px;margin:6px 0;border:1px solid var(--outline);border-radius:11px">'+
    '<b>'+(x.role==="user"?"أنت":"فلوسي AI")+'</b><p>'+esc(x.content)+'</p></div>').join("")+'</div>'+
   '<form id="flosyAiForm"><input id="flosyAiQuestion" class="chip" style="width:100%" required placeholder="اسأل فلوسي بالمصري...">'+
   '<button class="btn primary" type="submit">اسأل فلوسي</button></form></section>';
  const form=d.getElementById("flosyAiForm");
  if(form)form.onsubmit=e=>{e.preventDefault();const text=d.getElementById("flosyAiQuestion")?.value;ask(text)};
 }
 async function ask(question){
  const q=String(question||"").trim();if(!q)return "";
  const ans=answerFree(q);
  chat.push({role:"user",content:q},{role:"assistant",content:ans,kind:"local"});
  if(chat.length>60)chat=chat.slice(-60);
  view();return ans;
 }
 w.FLOSY_AI={render:view,ask,snapshot,answerFree,
  getLastReply:()=>chat.filter(x=>x.role==="assistant").at(-1)||null,
  getReplyCount:()=>chat.filter(x=>x.role==="assistant").length,
  version:"3.9.0-local-only"};
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",view);else view();
})(window,document);
