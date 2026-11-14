/* FLOSY 3.13 / Customer Usability Sprint.
 * Enhances the existing canonical Flosy ledger and 3.12 screen tree; no shadow data
 * store, invented account values, new OCR model, or automatic ambiguous postings.
 */
(function(w,d){"use strict";
 const P=w.FLOSY_UNIFIED_PAGES,V=w.FLOSY_CUSTOMER_V312;
 if(!P?.render||!V?.openSheet)return;
 const oldRender=P.render;
 const api=()=>w.FLOSY_UNIFIED;
 const money=v=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(Number(v)||0)+" ج.م";
 const today=()=>api()?.date?.()||new Date().toISOString().slice(0,10);
 const statuses=new Set(["pending","failed","rejected","cancelled","canceled","void","draft","reversed"]);
 const deletedIds=state=>new Set((state?.deletedIds||[]).map(x=>String(x).split("/").pop()));
 const safeRows=state=>{const gone=deletedIds(state);return (state?.transactions||[]).filter(t=>t&&!t.deleted&&
  !gone.has(String(t.id))&&!statuses.has(String(t.status||"").toLowerCase())&&Number(t.amount)>0);};
 let wired=false;
 function onboarding(){
  const frame=d.querySelector('.phone-frame[data-screen="1"] .flosy-real');
  if(!frame||frame.querySelector("#cx313QuickStart"))return;
  const old=frame.querySelector("#flosyWelcomeV397"),start=frame.querySelector("#flosyStartButton");
  if(!old||!start)return;
  const advanced=d.createElement("details");advanced.id="cx313AdvancedSetup";advanced.className="cx313-onboard-advanced";
  advanced.innerHTML='<summary>عايز تضبط المرتب والالتزامات من البداية؟ افتح الإعداد التفصيلي</summary>';
  old.before(advanced);advanced.appendChild(old);
  const quick=d.createElement("section");quick.id="cx313QuickStart";quick.className="cx313-quickstart";
  quick.innerHTML='<div class="cx313-quickstart-icon" aria-hidden="true"><i class="fa-solid fa-wallet"></i></div>'+
   '<small class="cx313-eyebrow">البداية السريعة · دقيقة تقريبًا</small><h2>ابدأ بحساب واحد بس</h2>'+
   '<p>مش محتاج تدخل مرتبك وكل مصاريفك دلوقتي. ابدأ بحساب حقيقي، وسجّل أول حركة، وكمّل خطتك المالية في أي وقت.</p>'+
   '<form id="cx313QuickStartForm">'+
   '<label>اسم الحساب<input name="name" maxlength="70" required minlength="2" placeholder="مثال: الكاش أو محفظتي"></label>'+
   '<label>نوع الحساب<select name="type"><option value="cash">كاش</option><option value="bank">حساب بنكي</option>'+
   '<option value="wallet">محفظة إلكترونية</option><option value="savings">ادخار</option></select></label>'+
   '<label>الرصيد الحالي بالجنيه<input name="balance" inputmode="decimal" type="number" min="0" max="999999999" step="0.01" required placeholder="0.00"></label>'+
   '<p class="cx313-onboarding-privacy"><i class="fa-solid fa-circle-info"></i> الرصيد ده بتدخله أنت، ومش بنفترض إن فيه فلوس أو دخل تلقائيًا.</p>'+
   '<div id="cx313OnboardError" role="alert" hidden></div>'+
   '<button type="submit" class="cx313-primary-btn">احفظ الحساب وابدأ <i class="fa-solid fa-arrow-left"></i></button></form>'+
   '<button type="button" class="cx313-skip" data-cx313-advanced>عندي بيانات أكتر وعايز أكمل الإعداد</button>';
  advanced.before(quick);
  quick.querySelector("[data-cx313-advanced]").addEventListener("click",()=>{
   advanced.open=true;advanced.scrollIntoView({block:"start",behavior:"instant"});
  });
  const form=quick.querySelector("#cx313QuickStartForm");
  form.addEventListener("submit",event=>{
   event.preventDefault();
   const a=api(),m=new FormData(form),name=String(m.get("name")||"").trim(),
    type=String(m.get("type")||"cash"),balance=Number(m.get("balance"));
   const err=quick.querySelector("#cx313OnboardError");
   const fail=t=>{err.hidden=false;err.textContent=t};
   if(name.length<2||!["cash","bank","wallet","savings"].includes(type)||
      !Number.isFinite(balance)||balance<0||balance>=1e9)return fail("اكتب اسم الحساب ورصيدًا صحيحًا، ولو الرصيد صفر اكتب 0.");
   const save=quick.querySelector('button[type="submit"]');save.disabled=true;err.hidden=true;
   try{
    const result=a.createAccount({name,type,opening:balance});
    if(result?.id)a.setDefaultAccount?.(result.id);
    try{localStorage.setItem("flosy_onboarding_39","yes")}catch{}
    a.go(2);a.notify("✓ الحساب جاهز. سجّل أول مصروف من زر إضافة، وكمّل بياناتك المالية وقت ما تحب.");
   }catch(e){save.disabled=false;fail(String(e.message||"تعذر إنشاء الحساب"))}
  });
  start.textContent="استكشاف التطبيق بدون إنشاء حساب";
 }
 function simplifyHome(){
  const box=d.querySelector('.phone-frame[data-screen="2"] .flosy-real');
  const home=box?.querySelector(".cx312-home");if(!home)return;
  home.querySelector(".cx312-greeting>button")?.remove();
  const rail=home.querySelector(".cx312-add-rail");
  if(rail){
   rail.querySelector('[data-ux312-quick="income"]')?.remove();
   rail.querySelector('[data-ux312-quick="transfer"]')?.remove();
   rail.classList.add("cx313-home-rail");
   const h=home.querySelector(".cx312-capture header h2");
   if(h)h.textContent="مصروف جديد في ثوانٍ";
   const caption=home.querySelector(".cx312-capture header small");
   if(caption)caption.textContent="والدخل والتحويل من زر + تحت";
  }
  home.querySelector(".cx312-footer-links [data-flosy-screen='8']")?.remove();
  const daily=home.querySelector(".cx312-safe-amount");
  if(daily&&daily.textContent.includes("لم يُحسب")){
   const safe=home.querySelector(".cx312-safe");
   safe?.classList.add("cx313-safe-setup");
   const p=safe?.querySelector("p");
   if(p)p.textContent="حدد دخلك والتزاماتك عشان نقدر نحسب المبلغ اليومي بشكل أوضح.";
   const btn=safe?.querySelector(".cx312-setup");
   if(btn){btn.dataset.flosyScreen="17";btn.textContent="أكمل ملفك المالي";}
  }
  const balance=home.querySelector(".cx312-safe-bottom span");
  if(balance)balance.textContent="رصيد الحسابات المسجل";
  const footer=home.querySelector(".cx312-footer-links");
  if(footer)footer.classList.add("cx313-home-footer");
 }
 function latestExpense(){
  const s=api()?.state?.()||{},owned=new Set((api()?.accounts?.()||[]).map(a=>a.id));
  return safeRows(s).filter(t=>t.type==="expense"&&owned.has(t.accountId))
   .sort((a,b)=>String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")))[0]||null;
 }
 function formatPreview(form){
  const f=form.elements,amount=Number(f.amount.value),kind=f.type.value;
  const names={expense:"مصروف",income:"دخل",transfer:"تحويل"};
  const a=api()?.accounts?.()||[],from=a.find(x=>String(x.id)===String(f.accountId.value));
  const to=a.find(x=>String(x.id)===String(f.targetAccountId?.value));
  const label=String(f.description.value||"").trim();
  const category=String(f.category.value||"").trim();
  if(!(amount>0))return "اكتب المبلغ، واختار مصروف شائع أو وصف واضح، وبعدها احفظ العملية.";
  return names[kind]+" "+money(amount)+" • "+
    (label||"بدون وصف")+(kind==="transfer"?" • من "+(from?.name||"حساب")+" إلى "+(to?.name||"حساب"):
    " • "+(category==="غير مصنف"?"الفئة غير محددة":category)+" • "+(from?.name||"حساب"));
 }
 function enhanceSheet(){
  const sheet=d.querySelector("#cx312Overlay"),form=sheet?.querySelector("#cx312QuickForm");
  if(!form||form.dataset.cx313Enhanced)return;form.dataset.cx313Enhanced="yes";
  const chips=form.querySelector("#cx312CommonChips");
  const latest=latestExpense();
  if(chips&&latest){
   const button=d.createElement("button");button.type="button";button.dataset.cx313Repeat="yes";
   button.innerHTML='<i class="fa-solid fa-rotate-left" aria-hidden="true"></i> كرّر آخر مصروف';
   button.setAttribute("aria-label","تجهيز آخر مصروف للمراجعة دون تسجيله تلقائيًا");
   chips.appendChild(button);
  }
  const desc=form.querySelector("#cx312Description");
  if(desc){
   const label=desc.closest("label"),p=d.createElement("p");p.id="cx313CategoryHint";
   p.className="cx313-category-hint";p.setAttribute("role","status");
   label?.after(p);
  }
  const preview=d.createElement("output");preview.id="cx313QuickPreview";preview.className="cx313-quick-preview";
  preview.setAttribute("aria-live","polite");
  form.querySelector("#cx312QuickSave")?.before(preview);
  const update=()=>{
   const hint=form.querySelector("#cx313CategoryHint");
   const cat=String(form.elements.category.value||"");
   if(hint)hint.textContent=form.elements.type.value==="transfer"?
    "التحويل بين حساباتك مش بيتحسب كمصروف.":
    cat&&cat!=="غير مصنف"?"الفئة المقترحة: "+cat:"اختار نوع المصروف من الاختصارات أو اكتب وصفًا علشان نحدد الفئة.";
   preview.textContent=formatPreview(form);
  };
  form.addEventListener("input",()=>queueMicrotask(update));
  form.addEventListener("change",()=>queueMicrotask(update));
  form.addEventListener("click",event=>{
   const repeat=event.target.closest("[data-cx313-repeat]");
   if(!repeat)return;
   const t=latestExpense();if(!t)return;
   const type=form.querySelector('[data-ux312-type="expense"]');type?.click();
   form.elements.amount.value=String(t.amount);
   form.elements.description.value=String(t.description||"مصروف");
   if([...form.elements.accountId.options].some(o=>o.value===t.accountId))
    form.elements.accountId.value=t.accountId;
   form.elements.description.dispatchEvent(new Event("input",{bubbles:true}));
   if([...form.elements.category.options].some(o=>o.value===t.category))
    form.elements.category.value=t.category;
   update();
   api()?.notify?.("جهزت آخر مصروف للمراجعة، ولسه ما اتحفظش. اضغط حفظ لو البيانات صحيحة.");
  });
  update();
 }
 function review(){
  const obj=w.FLOSY_CAPTURE_REVIEW_V2;if(!obj?.open||obj.__cx313Review)return;
  const prior=obj.open;
  obj.open=function(options){
   const result=prior(options),overlay=d.getElementById("flosyReviewOverlayV2");
   const header=overlay?.querySelector(".flosy-v2-dialog>header");
   if(header&&!header.querySelector(".cx313-review-hint")){
    const hint=d.createElement("div");hint.className="cx313-review-hint";
    hint.innerHTML='<b>راجع قبل الحفظ</b><div><span>1 · اقرأ النتيجة</span><span>2 · عدّل المبلغ والحساب</span><span>3 · أكّد الحفظ</span></div>';
    header.after(hint);
   }
   return result;
  };obj.__cx313Review=true;
 }
 function captureScreen(id){
  const box=d.querySelector('.phone-frame[data-screen="'+id+'"] .flosy-real');
  if(!box||box.querySelector(".cx313-capture-steps"))return;
  const header=box.querySelector(".fx-page-head");
  const target=box.querySelector(".fx-hero-capture")||box.querySelector(".fx-voice-capture");
  if(!header&&!target)return;
  const steps=d.createElement("div");steps.className="cx313-capture-steps";
  steps.innerHTML=id===6?'<span>1 · صوّر</span><span>2 · راجع الرقم</span><span>3 · احفظ</span>':
   '<span>1 · اتكلم</span><span>2 · صحّح الكلام</span><span>3 · احفظ</span>';
  (header||target)?.after(steps);
  if(id===6){
   const p=box.querySelector(".fx-hero-capture p");
   if(p)p.textContent="اختار صورة واضحة، وهنعرض لك الإجمالي والأصناف علشان تصحح أي رقم مش واضح قبل الحفظ.";
  }
 }
 function coach(){
  const a=w.FLOSY_UNIFIED_AI;if(!a?.ask||a.__cx313Feedback)return;
  const ask=a.ask;
  a.ask=function(q){
   const out=ask.call(this,q);
   if(!out||!out.text)return out;
   d.getElementById("cx313AiFeedback")?.remove();
   const feed=d.querySelector(".phone-frame[data-screen='8'] .flosy-real .faix-pane[data-ai-pane='chat']")||
    d.getElementById("flosyAiStream")?.parentElement;
   if(!feed)return out;
   const row=d.createElement("section");row.id="cx313AiFeedback";row.className="cx313-ai-feedback";
   row.dataset.intent=String(out.intent||"other").slice(0,55);
   row.innerHTML='<small><i class="fa-solid fa-circle-check"></i> الرد مبني على بياناتك المسجّلة (إن وُجدت)، وقد يحتاج مراجعتك.</small>'+
    '<div><span>هل الرد ساعدك؟</span><button type="button" data-cx313-rate="yes"><i class="fa-solid fa-thumbs-up"></i> مفيد</button>'+
    '<button type="button" data-cx313-rate="no"><i class="fa-solid fa-thumbs-down"></i> محتاج تحسين</button></div>'+
    '<p class="cx313-rate-status" role="status" hidden></p>';
   const stream=feed.querySelector("#flosyAiStream");
   if(stream)stream.after(row);else feed.appendChild(row);
   return out;
  };a.__cx313Feedback=true;
 }
 function feedback(target){
  const button=target.closest("[data-cx313-rate]");if(!button)return false;
  const box=button.closest(".cx313-ai-feedback");if(!box||box.dataset.done)return true;
  const value=button.dataset.cx313Rate==="yes"?"useful":"needs-improvement";
  try{
   const raw=JSON.parse(localStorage.getItem("flosy_ai_feedback_v313")||"{}");
   const total=Number(raw.total)||0;
   const ratings={useful:Number(raw.useful)||0,needsImprovement:Number(raw.needsImprovement)||0};
   if(value==="useful")ratings.useful++;else ratings.needsImprovement++;
   localStorage.setItem("flosy_ai_feedback_v313",JSON.stringify({...ratings,total:total+1}));
  }catch{}
  box.dataset.done="yes";
  box.querySelectorAll("button").forEach(x=>x.disabled=true);
  const status=box.querySelector(".cx313-rate-status");if(status){
   status.hidden=false;status.textContent="شكرًا! رأيك اتسجّل على الجهاز فقط، ولم يُستخدم لتدريب النموذج تلقائيًا.";
  }return true;
 }
 function reports(){
  const box=d.querySelector('.phone-frame[data-screen="15"] .flosy-real'),
   ui=box?.querySelector(".flosy-report-ui-v311");
  if(!ui||ui.querySelector(".cx313-report-intro"))return;
  const intro=d.createElement("div");intro.className="cx313-report-intro";
  intro.innerHTML='<strong><i class="fa-solid fa-chart-column"></i> ملخص الشهر جاهز</strong>'+
   '<p>اختار الصيغة اللي تناسبك، وافتح «تخصيص» فقط لو عايز فترة أو حساب معين. بيانات التقرير من معاملاتك المسجلة.</p>';
  ui.querySelector(".report311-files")?.before(intro);
  const preview=ui.querySelector("#flosyReportLivePreview");
  if(preview)preview.classList.add("cx313-report-preview");
 }
 function ensure(){
  if(wired)return;wired=true;
  review();coach();
  d.addEventListener("click",event=>{
   if(feedback(event.target))return;
   const quick=event.target.closest("[data-ux312-quick]");
   if(quick)enhanceSheet();
  });
  d.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&d.getElementById("cx312Overlay")){V.clearSheet();event.preventDefault();}
  });
  const oldBack=w.FLOSY_HANDLE_BACK;
  if(typeof oldBack==="function"){
   w.FLOSY_HANDLE_BACK=function(){
    if(d.getElementById("cx312Overlay")){V.clearSheet();return"handled"}
    if(d.getElementById("flosyReviewOverlayV2")){w.FLOSY_CAPTURE_REVIEW_V2?.close?.();return"handled"}
    return oldBack.apply(this,arguments);
   };
  }
 }
 function render(id){
  oldRender(id);ensure();d.body.classList.add("flosy-customer-v313");
  if(+id===1)onboarding();
  if(+id===2)simplifyHome();
  if(+id===6||+id===7)captureScreen(+id);
  if(+id===15)reports();
 }
 P.render=render;
 ensure();
 w.FLOSY_CUSTOMER_V313={version:"3.13.0",onboarding,simplifyHome,latestExpense,formatPreview,
  enhanceSheet,captureScreen,reports,feedback,render};
})(window,document);