/* Flosy v3.9.6 — screenshot-informed AI home, insights and action hub.
 * Wraps the already audited AI, voice, OCR and finance calculations.
 * Never writes money automatically, never invents user values or transactions.
 */
(function(w,d){"use strict";
 const ai=w.FLOSY_UNIFIED_AI;
 if(!ai||ai.__experienceV396)return;
 const prevMount=ai.mount;
 const e=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const icon=x=>'<i class="fa-solid '+x+'" aria-hidden="true"></i>';
 const api=()=>w.FLOSY_UNIFIED,finance=()=>w.FLOSY_FINANCE_ENGINE;
 const ledger=()=>api()?.state?.()||{accounts:[],transactions:[],settings:{}};
 const money=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(n)||0)+" ج.م";
 const valid=n=>typeof n==="number"&&Number.isFinite(n);
 const chartSafe=(s,name)=>Array.isArray(s)?s.filter(x=>x&&typeof x==="object"&&
  String(x.name||"").trim()&&valid(Number(x.amount))&&Number(x.amount)>0).slice(0,5):[];
 function profile(){
  const s=ledger(),sum=api()?.summary?.()||{};
  const insight=finance()?.insight?.(s,new Date())||{};
  const plan=finance()?.plan?.(s,new Date())||{ready:false};
  const who=w.FLOSY_COPILOT?.name?.(s)||"";
  return {s,sum,insight,plan,who};
 }
 function insightMarkup(){
  const {sum,insight,plan}=profile();
  const cat=chartSafe(insight.topCategories);
  const total=Number(insight.profile?.actualExpense)||0;
  const pct=insight.changePct;
  const diff=valid(pct)?((pct>=0?"+":"")+pct.toFixed(1)+"%"):"—";
  const safe=valid(sum.safe)?money(sum.safe):"غير محسوب";
  const daily=valid(sum.daily)?money(sum.daily):"—";
  const rows=cat.length?cat.map(x=>{
    const amount=Number(x.amount),width=total>0?Math.max(3,Math.min(100,100*amount/total)):0;
    return '<div class="faix-cat"><div><span>'+e(x.name)+'</span><b>'+e(money(amount))+'</b></div>'+
     '<div class="faix-track"><span style="width:'+width.toFixed(2)+'%"></span></div></div>';
  }).join(""):'<p class="faix-muted">لسه مفيش مصروفات كفاية لعرض توزيع الفئات.</p>';
  const summaryText=!insight.hasData?
    "لسه ما سجلتش بيانات كفاية علشان أقدّم مقارنة دقيقة.":
    cat.length?"أكبر بند مصروفات مسجل هذا الشهر: "+cat[0].name+
     "، بإجمالي "+money(cat[0].amount)+
     ". "+(valid(pct)?"التغير عن الشهر الماضي "+diff+".":"سجّل بيانات الشهر الماضي للمقارنة.") :
     "تقدر تسألني عن مصروفاتك وحساباتك المسجلة.";
  const warnings=Array.isArray(insight.warnings)?insight.warnings.slice(0,2):[];
  return '<section class="faix-safecard" aria-label="المتاح الآمن للصرف">'+
    '<div class="faix-safe-top"><span>'+icon("fa-shield-heart")+' Safe to Spend</span>'+icon("fa-circle-check")+'</div>'+
    '<small>تقدر تصرف بأمان حسب بياناتك الحالية</small><strong>'+e(safe)+'</strong>'+
    '<small>الحد اليومي: '+e(daily)+'</small>'+
    (!valid(sum.safe)?'<small>أكمل ملفك المالي لحساب المبلغ الآمن.</small>':'')+'</section>'+
   '<section class="faix-insight-card"><h3>أكبر مصروفاتك الشهر ده</h3>'+rows+'</section>'+
   '<section class="faix-insight-card"><h3>هذا الشهر مقارنة بالشهر الماضي</h3>'+
    '<div class="faix-comparison"><div><small>هذا الشهر</small><b>'+e(money(total))+'</b></div>'+
    '<div><small>الشهر الماضي</small><b>'+e(money(insight.previousExpense||0))+'</b></div>'+
    '<span class="faix-delta" data-direction="'+(valid(pct)?pct>0?"up":"down":"unknown")+'">'+e(diff)+'</span></div>'+
    (!valid(pct)?'<small class="faix-muted">المقارنة النسبية غير متاحة بدون مصروفات الشهر الماضي.</small>':'')+
   '</section><section class="faix-insight-card"><h3>'+icon("fa-wand-magic-sparkles")+' تحليل فلوسي AI</h3>'+
    '<p>'+e(summaryText)+'</p>'+warnings.map(x=>'<p class="faix-warning">'+e(x)+'</p>').join("")+
    '<div class="faix-action-row"><button type="button" data-ai-question="حلل مصاريفي">اسأل متابعة</button>'+
    '<button type="button" data-ai-question="نصيحة اليوم">اقترح تحسين</button></div></section>'+
    (plan.ready?'<p class="faix-footnote">اقتراحات الادخار مبنية على بياناتك المدخلة، وليست ضمانًا لاستثمار أو عائد.</p>':
      '<p class="faix-footnote">الأرقام ناقصة؟ أضف المرتب والالتزامات من الملف المالي.</p>');
 }
 function planMarkup(kind){
  const {plan}=profile();
  if(!plan?.ready){
   return '<div class="faix-plan-result"><h3>'+(kind==="crisis"?"خطة الطوارئ":"اقتراح ميزانية")+'</h3>'+
    '<p>علشان أطلع اقتراحات شخصية بالأرقام، سجّل المرتب الشهري والالتزامات والمعيشة الأساسية الأول.</p>'+
    '<button type="button" class="faix-primary" data-flosy-screen="17">أكمل ملفك المالي</button></div>';
  }
  const p=plan.profile;
  const crisis=kind==="crisis";
  const details=crisis?
   [["تكلفة المعيشة والالتزامات شهريًا",p.livingCost],["هدف صندوق الطوارئ",plan.emergencyTarget],
    ["المتبقي لتمويل الطوارئ",plan.emergencyGap],["اقتراح ادخار للطوارئ هذا الشهر",plan.suggestedEmergency]]:
   [["الدخل الشهري المتوقع",p.predictableIncome],["تكلفة المعيشة والالتزامات",p.livingCost],
    ["الفائض المتاح للتخصيص",plan.monthlySurplus],["اقتراح للطوارئ هذا الشهر",plan.suggestedEmergency],
    ["الحد المشروط للاستثمار",plan.suggestedInvestment]];
  return '<div class="faix-plan-result"><h3>'+icon(crisis?"fa-shield-heart":"fa-chart-pie")+
   (crisis?" خطة طوارئ مرتبطة بدخلك":" اقتراح ميزانية من بياناتك")+'</h3>'+
   '<p>دي تقديرات قابلة للمراجعة ومش حركة مالية أو أمر شراء.</p>'+
   details.map(([label,val])=>'<div class="faix-fin-row"><span>'+e(label)+'</span><b>'+e(money(val))+'</b></div>').join("")+
   (plan.note?'<p class="faix-warning">'+e(plan.note)+'</p>':'')+
   '<div class="faix-action-row"><button type="button" data-flosy-screen="17">راجع تفاصيل خطتك</button>'+
   '<button type="button" class="faix-primary" data-flosy-screen="11">افتح الميزانية</button></div></div>';
 }
 function markup(){
  const {who}=profile(),greeting=who?"أهلاً يا "+e(who)+"،":"أهلاً بيك،";
  return '<div class="faix-root" dir="rtl">'+
   '<header class="faix-topbar"><button type="button" data-ai-open-settings aria-label="إعدادات المساعد">'+
    icon("fa-bell")+'</button><div><b>Flosy AI</b><small>مساعدك الذكي لإدارة فلوسك بذكاء</small></div>'+
    '<button type="button" data-ai-open-profile aria-label="ملفك المالي">'+icon("fa-user")+'</button></header>'+
   '<nav class="faix-tabs" aria-label="أقسام مساعد فلوسي">'+
    '<button type="button" class="faix-tab" data-ai-tab="chat" aria-selected="true">محادثة</button>'+
    '<button type="button" class="faix-tab" data-ai-tab="actions" aria-selected="false">نفّذ مع AI</button>'+
    '<button type="button" class="faix-tab" data-ai-tab="insights" aria-selected="false">رؤى فلوسي</button></nav>'+
   '<div class="faix-pane" data-ai-pane="chat">'+
    '<div class="faix-robot"><img src="flosy-ultra-avatar.svg" alt="مساعد فلوسي الروبوت" /></div>'+
    '<div class="faix-welcome"><b>'+greeting+'</b><strong>جاهز أساعدك في فلوسك؟ <span aria-hidden="true">💚</span></strong></div>'+
    '<div class="faix-chips">'+
     '<button type="button" data-ai-question="صرفت كام الشهر ده؟">'+icon("fa-chart-column")+' صرفت كام الشهر ده؟</button>'+
     '<button type="button" data-ai-question="اعمللي خطة توفير">'+icon("fa-bullseye")+' اعمللي خطة توفير</button>'+
     '<button type="button" data-ai-question="Roast Me">'+icon("fa-fire")+' Roast Me</button>'+
     '<button type="button" data-ai-question="حلل مصاريفي">'+icon("fa-chart-pie")+' حلل مصاريفي</button></div>'+
    '<button type="button" class="faix-voice-prompt" data-ai-action="voice">'+
     icon("fa-microphone-lines")+'<span><b>جرّب التحدث معايا</b><small>وسجّل مصروفاتك بسرعة</small></span></button>'+
    '<div class="faix-chat-stream" id="flosyAiFeedHost" aria-label="المحادثة"></div>'+
    '<form id="flosyAiComposerV396" class="faix-composer">'+
     '<button type="button" data-ai-action="receipt" aria-label="حلل إيصال" title="حلل إيصال">'+icon("fa-receipt")+'</button>'+
     '<button type="button" data-ai-action="chat-mic" class="faix-mic" aria-label="تحدث إلى المساعد">'+icon("fa-microphone")+'</button>'+
     '<input id="flosyAiInputV396" aria-label="اسأل فلوسي" placeholder="اكتب سؤالك هنا..." maxlength="550" required />'+
     '<button type="submit" aria-label="إرسال">'+icon("fa-paper-plane")+'</button></form>'+
    '<p id="faixVoiceStatus" class="faix-status" role="status"></p></div>'+
   '<div class="faix-pane" data-ai-pane="actions" hidden>'+
    '<div class="faix-action-head"><b>نفّذ مع FLOSY AI '+icon("fa-wand-magic-sparkles")+'</b>'+
     '<small>حوّل أفكارك لخطوات حقيقية، ومفيش عملية تتحفظ من غير موافقتك.</small></div>'+
    '<div class="faix-actions-grid">'+
     '<button type="button" data-ai-action="voice">'+icon("fa-microphone")+'<b>سجّل مصروف بالصوت</b><small>قول اللي صرفته، وراجع التفاصيل قبل الحفظ</small></button>'+
     '<button type="button" data-ai-action="receipt">'+icon("fa-receipt")+'<b>حلّل إيصال</b><small>صوّر فاتورة وراجع الإجمالي والحساب</small></button>'+
     '<button type="button" data-ai-action="budget">'+icon("fa-chart-pie")+'<b>اقترح ميزانية</b><small>خطة مبنية على دخلك والتزاماتك</small></button>'+
     '<button type="button" data-ai-action="crisis">'+icon("fa-shield-heart")+'<b>خطة الطوارئ</b><small>اعرف صندوق الطوارئ المناسب ليك</small></button></div>'+
    '<section class="faix-intent-panel"><b>'+icon("fa-wand-magic-sparkles")+' اقتراح ذكي من Flosy AI</b>'+
     '<p>عاوز تسجّل معاملة؟ اختار نوعها الأول، واحفظها بنفسك بعد مراجعة المبلغ والحساب.</p>'+
     '<div class="faix-intent-actions"><button type="button" data-ai-intent="transfer">'+icon("fa-right-left")+' تحويل</button>'+
      '<button type="button" data-ai-intent="expense">'+icon("fa-credit-card")+' مصروف</button>'+
      '<button type="button" data-ai-intent="income">'+icon("fa-plus")+' دخل</button></div></section>'+
    '<div id="faixActionResult" role="status"></div></div>'+
   '<div class="faix-pane" data-ai-pane="insights" hidden>'+
    '<div class="faix-action-head"><b>رؤى FLOSY AI '+icon("fa-wand-magic-sparkles")+'</b>'+
     '<small>تحليلات من دفتر معاملاتك، بدون أرصدة أو عوائد افتراضية.</small></div>'+
    '<div id="faixInsights"></div></div>'+
   '<details class="faix-preferences"><summary>'+icon("fa-sliders")+' تفضيلات الصوت</summary>'+
    '<button type="button" data-ai-speech-toggle aria-pressed="false">'+icon("fa-volume-high")+' الرد بالصوت</button>'+
    '<button type="button" data-ai-stop>'+icon("fa-stop")+' إيقاف الصوت</button></details>'+
   '<p class="faix-disclaimer">فلوسي AI يحلل بياناتك محليًا؛ مش نموذج لغوي كبير مدرَّب من الصفر. الردود تقديرية ولا تنفّذ معاملات أو استثمارات تلقائيًا.</p>'+
   '</div>';
 }
 function install(container){
  prevMount(container);
  // Move previously bound markup instead of destroying its original handlers.
  const previous=d.createElement("div");
  previous.className="faix-legacy-controls";previous.hidden=true;
  while(container.firstChild)previous.appendChild(container.firstChild);
  container.innerHTML=markup();
  container.appendChild(previous);
  const host=container.querySelector("#flosyAiFeedHost");
  const stream=previous.querySelector("#flosyAiStream");
  if(stream){stream.innerHTML="";host.appendChild(stream)}
  const oldVoiceStatus=previous.querySelector("#flosyAiVoiceStatus");
  if(oldVoiceStatus)container.querySelector(".faix-pane[data-ai-pane=chat]")?.appendChild(oldVoiceStatus);
  const panes=[...container.querySelectorAll("[data-ai-pane]")],tabs=[...container.querySelectorAll("[data-ai-tab]")];
  const switchTab=tab=>{
   for(const p of panes)p.hidden=p.dataset.aiPane!==tab;
   for(const t of tabs)t.setAttribute("aria-selected",String(t.dataset.aiTab===tab));
   if(tab==="insights")container.querySelector("#faixInsights").innerHTML=insightMarkup();
  };
  switchTab("chat");
  const ask=q=>{switchTab("chat");ai.ask(q);};
  const runAction=kind=>{
   const a=api();
   if(kind==="chat-mic"){switchTab("chat");ai.listen();return}
   if(kind==="voice"){a?.go?.(7);a?.startVoice?.(false);return}
   if(kind==="receipt"){a?.go?.(6);a?.startReceipt?.("camera");return}
   if(kind==="budget"||kind==="crisis"){
    switchTab("actions");
    const box=container.querySelector("#faixActionResult");
    box.innerHTML=planMarkup(kind);
    box.scrollIntoView?.({block:"nearest",behavior:"smooth"});
   }
  };
  container.addEventListener("click",ev=>{
   const tab=ev.target.closest("[data-ai-tab]");
   if(tab){switchTab(tab.dataset.aiTab);return}
   const question=ev.target.closest("[data-ai-question]");
   if(question){ask(question.dataset.aiQuestion);return}
   const action=ev.target.closest("[data-ai-action]");
   if(action){runAction(action.dataset.aiAction);return}
   const intent=ev.target.closest("[data-ai-intent]");
   if(intent){
    const type=intent.dataset.aiIntent;
    if(!["expense","income","transfer"].includes(type))return;
    api()?.go?.(5);
    const frame=d.querySelector('.phone-frame[data-screen="5"] .flosy-real');
    const field=frame?.querySelector('select[name="type"]');
    if(field){field.value=type;field.dispatchEvent(new Event("change",{bubbles:true}))}
    return;
   }
   if(ev.target.closest("[data-ai-speech-toggle]")){
    const old=previous.querySelector("#flosyAiVoiceToggle");
    old?.click();
    ev.target.closest("[data-ai-speech-toggle]").setAttribute("aria-pressed",old?.getAttribute("aria-pressed")||"false");
    return;
   }
   if(ev.target.closest("[data-ai-stop]")){ai.stop();return}
   if(ev.target.closest("[data-ai-open-settings]")){api()?.go?.(16);return}
   if(ev.target.closest("[data-ai-open-profile]")){api()?.go?.(17);return}
  });
  const form=container.querySelector("#flosyAiComposerV396");
  form?.addEventListener("submit",ev=>{
   ev.preventDefault();const input=container.querySelector("#flosyAiInputV396");
   const q=String(input?.value||"").trim();
   if(q){ask(q);input.value="";}
  });
 }
 ai.mount=install;
 ai.renderInsights=insightMarkup;
 ai.planPreview=planMarkup;
 ai.__experienceV396=true;
 w.FLOSY_AI_EXPERIENCE_V396={insightMarkup,planMarkup,version:"3.9.6",mount:install};
})(window,document);
