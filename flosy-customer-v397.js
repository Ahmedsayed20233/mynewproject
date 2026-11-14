/* Flosy customer journey v3.9.7 — guided first run + finance transparency.
 * No seeded balances, no hidden posting, no change to offline permissions.
 */
(function(w,d){"use strict";
 const P=w.FLOSY_UNIFIED_PAGES,previous=P?.render;
 if(!P||typeof previous!=="function")return;
 const api=()=>w.FLOSY_UNIFIED;
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(n)||0)+" ج.م";
 const labels=["حسابك","دخلك ومصاريفك","التزاماتك","مراجعة وابدأ"];
 const onboarding=()=>{
  const frame=d.querySelector('.phone-frame[data-screen="1"] .flosy-real');
  if(!frame||frame.querySelector("#flosyWelcomeV397"))return;
  const start=frame.querySelector("#flosyStartButton");
  if(!start)return;
  start.textContent="تخطي الإعداد والدخول للتطبيق";
  const block=d.createElement("section");
  block.id="flosyWelcomeV397";block.className="flosy-v397-wizard";
  block.innerHTML='<div class="flosy-v397-steps" aria-label="مراحل الإعداد">'+
   labels.map((s,i)=>'<span data-onboard-dot="'+i+'">'+(i+1)+'. '+esc(s)+'</span>').join("")+'</div>'+
   '<form id="flosyWizardFormV397">'+
   '<div data-onboard-step="0"><h3>1 — ابدأ بحسابك الحقيقي</h3>'+
   '<p>اختار الكاش أو البنك أو المحفظة. الرصيد ده هيتحسب من معاملاتك بعد كده.</p>'+
   '<label>اسم الحساب<input name="accountName" class="flosy-input" maxlength="70" placeholder="مثال: الكاش / بنك مصر"></label>'+
   '<label>نوع الحساب<select name="accountType" class="flosy-input"><option value="cash">كاش</option><option value="bank">بنك</option><option value="wallet">محفظة إلكترونية</option><option value="savings">ادخار</option></select></label>'+
   '<label>الرصيد الحالي بالجنيه<input name="opening" type="number" step="0.01" min="0" value="0" class="flosy-input"></label></div>'+
   '<div data-onboard-step="1" hidden><h3>2 — دخلك ومعيشتك</h3>'+
   '<p>مهم علشان Safe to Spend والميزانية. تقدّر تسيب الخانات فاضية وتكملها بعدين.</p>'+
   '<label>المرتب الشهري<input name="salary" type="number" step="0.01" min="0" class="flosy-input" placeholder="المرتب الصافي"></label>'+
   '<label>مصروفات المعيشة الأساسية شهريًا<input name="essentials" type="number" step="0.01" min="0" class="flosy-input" placeholder="أكل أساسي ومواصلات"></label>'+
   '<label>ميزانية الصرف الاختياري<input name="discretionary" type="number" step="0.01" min="0" class="flosy-input" placeholder="كافيهات وترفيه وتسوق"></label></div>'+
   '<div data-onboard-step="2" hidden><h3>3 — التزاماتك واحتياطيك</h3>'+
   '<p>أدخل مجموع الالتزامات الثابتة عشان ما نصرفش فلوس الإيجار أو الأقساط بالغلط.</p>'+
   '<label>الالتزامات الثابتة شهريًا<input name="fixed" type="number" step="0.01" min="0" class="flosy-input" placeholder="إيجار وأقساط وفواتير"></label>'+
   '<label>مبلغ احتياطي تفضّل الاحتفاظ به<input name="buffer" type="number" step="0.01" min="0" class="flosy-input" placeholder="مبلغ أمان"></label></div>'+
   '<div data-onboard-step="3" hidden><h3>4 — فلوسي جاهز ليك</h3>'+
   '<p id="flosyWizardSummaryV397">هنحفظ بياناتك الحقيقية، ونحسب منها الميزانية والمبلغ الآمن للصرف.</p>'+
   '<p>العمليات الصوتية والفواتير مش بتتحفظ إلا بعد موافقتك.</p></div>'+
   '<div id="flosyWizardErrorV397" role="alert"></div>'+
   '<div class="flosy-v397-wizard-nav"><button type="button" data-wizard-back hidden>السابق</button>'+
   '<button type="button" class="flosy-btn" data-wizard-next>التالي</button>'+
   '<button type="submit" class="flosy-btn" data-wizard-save hidden>حفظ وابدأ فلوسي</button></div></form>';
  start.parentElement?.insertBefore(block,start);
  const form=block.querySelector("form");let step=0;
  const selected=(name)=>String(new FormData(form).get(name)||"");
  const amount=name=>Number(selected(name)||0);
  function show(n){
   step=Math.max(0,Math.min(3,n));
   block.querySelectorAll("[data-onboard-step]").forEach(panel=>panel.hidden=Number(panel.dataset.onboardStep)!==step);
   block.querySelectorAll("[data-onboard-dot]").forEach(dot=>dot.dataset.current=String(Number(dot.dataset.onboardDot)===step));
   block.querySelector("[data-wizard-back]").hidden=step===0;
   block.querySelector("[data-wizard-next]").hidden=step===3;
   block.querySelector("[data-wizard-save]").hidden=step!==3;
   block.querySelector("#flosyWizardErrorV397").textContent="";
   if(step===3){
    const cash=selected("accountName")||"حسابك الحالي",salary=amount("salary"),
      fixed=amount("fixed"),essential=amount("essentials");
    block.querySelector("#flosyWizardSummaryV397").textContent=
     "الحساب: "+cash+" — الدخل الشهري: "+money(salary)+
     " — المعيشة والالتزامات: "+money(essential+fixed)+
     ". تقدر تعدّلهم في أي وقت.";
   }
  }
  block.querySelector("[data-wizard-next]").onclick=()=>show(step+1);
  block.querySelector("[data-wizard-back]").onclick=()=>show(step-1);
  form.onsubmit=e=>{
   e.preventDefault();
   const err=block.querySelector("#flosyWizardErrorV397");
   const values=["opening","salary","essentials","discretionary","fixed","buffer"].map(amount);
   if(values.some(v=>!Number.isFinite(v)||v<0||v>=1e9)){
    err.textContent="الأرقام لازم تكون موجبة أو صفر، ومن غير قيم غير واقعية.";return;
   }
   const name=selected("accountName").trim(),existing=api()?.accounts?.()||[];
   if(!existing.length&&name.length<2){err.textContent="اكتب اسم حساب أولًا أو استخدم زر تخطي الإعداد.";show(0);return;}
   try{
    if(name)api().createAccount({name,type:selected("accountType"),opening:amount("opening")});
    const a=api();
    a.core().FLOSY_BRIDGE.mutate(s=>{
     s.settings=s.settings||{};
     const p=s.settings.financeProfileV393||{};
     s.settings.financeProfileV393={...p,monthlySalary:amount("salary"),
      essentialVariableSpend:amount("essentials"),
      monthlyDiscretionarySpend:amount("discretionary"),
      minimumMonthlyBuffer:amount("buffer"),
      monthlyCommitments:amount("fixed")>0?[{id:"v397-onboard-fixed",name:"التزامات شهرية",amount:amount("fixed"),kind:"bill"}]:
       (p.monthlyCommitments||[])};
    });
    try{localStorage.setItem("flosy_onboarding_39","yes")}catch{}
    a.go(2);
    a.notify("تم إعداد فلوسي من بياناتك. تقدر تعدلها من خطتك المالية.");
   }catch(ex){err.textContent=String(ex.message||"تعذر حفظ الإعداد")}
  };
  show(0);
 };
 function safeExplanation(){
  const frame=d.querySelector('.phone-frame[data-screen="2"] .flosy-real');
  if(!frame)return;
  const old=frame.querySelector("#flosySafeExplainV397");
  old?.remove();
  const s=api()?.summary?.()||{};
  const root=d.createElement("details");root.id="flosySafeExplainV397";root.className="flosy-v397-safe";
  root.innerHTML='<summary>إزاي بنحسب المتاح الآمن للصرف؟</summary>'+
   '<p>'+(s.safe===null?
    'أكمل المرتب الشهري والمصاريف الأساسية والالتزامات والميزانية الاختيارية لتفعيل الحساب.':
    'ده تقدير محافظ من الرصيد النقدي المتاح، بعد حجز الالتزامات ومصاريف المعيشة والاحتياطي، وبحد أقصى الميزانية الاختيارية المتبقية.')+
   '</p><button type="button" data-flosy-screen="17">راجع مرتبك والتزاماتك</button>';
  const hero=frame.querySelector(".hero-card");
  if(hero)hero.insertAdjacentElement("afterend",root);
  else frame.insertAdjacentElement("afterbegin",root);
 }
 P.render=function(id){
  previous(id);
  if(id===1)onboarding();
  if(id===2)safeExplanation();
 };
 w.FLOSY_CUSTOMER_UX_V397={version:"3.9.7",steps:labels,accountTypes:["cash","bank","wallet","savings"]};
})(window,document);
