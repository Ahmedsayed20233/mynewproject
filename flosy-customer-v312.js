/* FLOSY 3.12 Customer-first journey. One ledger, one primary action per screen.
 * Wrapper only: no alternate transaction store, no synthetic monetary entries.
 */
(function(w,d){"use strict";
 const P=w.FLOSY_UNIFIED_PAGES;if(!P||typeof P.render!=="function")return;
 const original=P.render,api=()=>w.FLOSY_UNIFIED;
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>c==="&"?"&amp;":c==="<"?"&lt;":c===">"?"&gt;":c==='"'?"&quot;":"&#39;");
 const money=x=>api()?.money?.(Number(x)||0)||new Intl.NumberFormat("ar-EG").format(Number(x)||0)+" ج.م";
 const clean=s=>{
  const excluded=new Set((s?.deletedIds||[]).map(x=>String(x).split("/").pop()));
  return (w.FLOSY_ULTRA_DATA?.cleanTx?.(s)||[]).filter(t=>!t.deleted&&!t.isDeleted&&!excluded.has(String(t.id)));
 };
 const iso=()=>api()?.date?.()||new Date().toISOString().slice(0,10);
 const types=[["expense","مصروف","fa-arrow-trend-down"],["income","دخل","fa-arrow-trend-up"],["transfer","تحويل","fa-right-left"]];
 const presets=[["قهوة","fa-mug-hot"],["فطار","fa-bread-slice"],["مواصلات","fa-car"],["سوبرماركت","fa-basket-shopping"]];
 let recentType="expense",sheet=null,hotkeysAttached=false;
 function homeMarkup(){
  const a=api(),s=a?.summary?.()||{},transactions=clean(a?.state?.()||{})
    .sort((x,y)=>String(y.createdAt||y.date||"").localeCompare(String(x.createdAt||x.date||""))).slice(0,3);
  const liquid=Number.isFinite(Number(s.total))&&s.hasAccounts?money(s.total):"أضف حسابك الأول";
  const daily=typeof s.daily==="number"&&Number.isFinite(s.daily)?money(s.daily):"لم يُحسب بعد";
  const net=Number(s.income||0)-Number(s.expense||0);
  let due=null;try{
   const reminders=a?.core?.()?.FLOSY_REMINDERS?.upcoming?.()||[];
   due=reminders.find(x=>x&&!x.paid&&x.date&&Number(x.days)>=0);
  }catch{}
  const latest=transactions.map(t=>{
   const title=esc(String(t.description||t.category||"معاملة").slice(0,55)),
    account=a?.accounts?.()?.find(q=>q.id===t.accountId)?.name||"حساب",
    isExp=t.type==="expense",isInc=t.type==="income";
   return '<div class="cx312-tx"><span class="cx312-tx-icon"><i class="fa-solid '+
    esc(a?.inferIcon?.(t.description||t.category||"",t.type)||"fa-wallet")+'"></i></span>'+
    '<div><strong>'+title+'</strong><small>'+esc(t.date)+' • '+esc(account)+'</small></div>'+
    '<b data-type="'+esc(t.type)+'">'+(isExp?"−":isInc?"+":"↔")+esc(money(t.amount))+'</b></div>';
  }).join("");
  return '<main class="cx312-home" aria-label="الرئيسية المبسطة">'+
   '<header class="cx312-greeting"><div><small>فلوسي • كل شيء في مكان واحد</small>'+
    '<h1>فلوسك أوضح كل يوم <span aria-hidden="true">✦</span></h1></div>'+
    '<button type="button" data-flosy-screen="16" aria-label="فتح الخدمات" title="الخدمات"><i class="fa-solid fa-grip"></i></button></header>'+
   '<section class="cx312-safe" aria-label="الحد الآمن اليومي"><div class="cx312-safe-top"><span><i class="fa-solid fa-shield-heart"></i> المتاح الآمن للصرف اليوم</span>'+
    '<button type="button" data-ux312-help="safe" aria-label="كيف يُحسب المتاح الآمن للصرف؟">؟</button></div>'+
    '<strong class="cx312-safe-amount">'+esc(daily)+'</strong>'+
    '<p>'+(typeof s.daily==="number"?"تقدير مبني على الأرصدة والالتزامات المسجلة؛ راجع الدخل والمدفوعات قبل أي قرار.":"أدخل الدخل والتزاماتك وحساباتك لحساب حد يومي أدق.")+'</p>'+
    '<div class="cx312-safe-bottom"><span>الرصيد المسجل في حساباتك</span><b>'+esc(liquid)+'</b></div>'+
    (typeof s.daily!=="number"?
     '<button type="button" data-flosy-screen="11" class="cx312-setup">استكمال بيانات الميزانية</button>':"")+'</section>'+
   '<section class="cx312-metrics" aria-label="ملخص الشهر">'+
    '<div><small>مصروفات الشهر</small><strong>'+esc(money(s.expense))+'</strong></div>'+
    '<div><small>الدخل المسجل</small><strong>'+esc(money(s.income))+'</strong></div>'+
    '<div><small>صافي التدفق</small><strong>'+esc(money(net))+'</strong></div></section>'+
   '<section class="cx312-card cx312-capture"><header><h2>سجّل حركة جديدة</h2><small>بدون خطوات كثيرة</small></header>'+
    '<div class="cx312-add-rail">'+
     '<button type="button" data-ux312-quick="expense"><i class="fa-solid fa-plus-circle"></i><b>مصروف</b></button>'+
     '<button type="button" data-ux312-quick="income"><i class="fa-solid fa-arrow-trend-up"></i><b>دخل</b></button>'+
     '<button type="button" data-ux312-quick="transfer"><i class="fa-solid fa-right-left"></i><b>تحويل</b></button>'+
     '<button type="button" data-flosy-screen="7"><i class="fa-solid fa-microphone"></i><b>صوت</b></button>'+
     '<button type="button" data-flosy-screen="6"><i class="fa-solid fa-camera"></i><b>فاتورة</b></button></div></section>'+
   (due?'<section class="cx312-due"><i class="fa-solid fa-calendar-check"></i><span>عندك التزام قادم'+
    (due.date?" بتاريخ "+esc(due.date):"")+' — راجع تفاصيله قبل موعد السداد.</span>'+
    '<button type="button" data-flosy-screen="9">عرض</button></section>':"")+
   '<section class="cx312-card cx312-recent"><header><h2>آخر المعاملات</h2>'+
    '<button type="button" data-flosy-screen="4">كل المعاملات</button></header>'+
    (latest||'<p class="cx312-empty">لسه ما فيش حركات مسجلة. جرّب تسجل أول مصروف من فوق.</p>')+'</section>'+
   '<div class="cx312-footer-links"><button type="button" data-flosy-screen="15"><i class="fa-solid fa-chart-pie"></i> تقرير الشهر</button>'+
    '<button type="button" data-flosy-screen="8"><i class="fa-solid fa-robot"></i> اسأل فلوسي AI</button></div></main>';
 }
 const cats=(type,selected="")=>{
  const specs=w.FLOSY_CATEGORIES?.forType?.(type)||[];
  const fallback=type==="income"?"دخل آخر":type==="transfer"?"تحويل داخلي":"غير مصنف";
  const rows=specs.length?specs:[{label:fallback}];
  if(!rows.some(x=>x.label===fallback))rows.unshift({label:fallback});
  const picked=selected||fallback;
  return rows.map(x=>'<option value="'+esc(x.label)+'"'+(x.label===picked?' selected':'')+'>'+esc(x.label)+'</option>').join("");
 };
 const accountsHtml=(items,selected)=>items.map(x=>
  '<option value="'+esc(x.id)+'"'+(String(x.id)===String(selected)?' selected':'')+'>'+esc(x.name||"حساب")+'</option>').join("");
 function formMarkup(type="expense"){
  const a=api(),arr=a?.accounts?.()||[],preferred=a?.defaultAccount?.()||arr[0]?.id||"";
  if(!arr.length)return '<div class="cx312-empty-account"><p>لإضافة حركة فعلية، سجّل أول حساب برصيده الحالي.</p>'+
   '<button type="button" data-ux312-create-account>+ إضافة حساب</button></div>';
  return '<form id="cx312QuickForm" novalidate>'+
   '<div class="cx312-quick-types" role="group" aria-label="نوع المعاملة">'+types.map(([value,label,icon])=>
    '<button type="button" data-ux312-type="'+value+'" aria-pressed="'+(type===value)+'">'+
    '<i class="fa-solid '+icon+'"></i> '+label+'</button>').join("")+'</div>'+
   '<input name="type" type="hidden" value="'+esc(type)+'">'+
   '<label class="cx312-amount-label">المبلغ بالجنيه المصري<div class="cx312-amount-box">'+
    '<input name="amount" type="number" min="0.01" max="999999999" step="0.01" required inputmode="decimal" autocomplete="off" placeholder="0.00">'+
    '<span>ج.م</span></div></label>'+
   '<div id="cx312CommonChips" class="cx312-chips" role="group" aria-label="مصروفات شائعة">'+presets.map(([label,icon])=>
     '<button type="button" data-ux312-preset="'+esc(label)+'"><i class="fa-solid '+icon+'"></i> '+esc(label)+'</button>').join("")+'</div>'+
   '<label>الوصف <small>اختياري — بنقترح الفئة تلقائيًا</small>'+
     '<input name="description" id="cx312Description" type="text" maxlength="90" placeholder="مثال: قهوة، بنزين، مرتب..." autocomplete="off"></label>'+
   '<label>الحساب'+
     '<select name="accountId" required>'+accountsHtml(arr,preferred)+'</select></label>'+
   '<label id="cx312Target" '+(type==="transfer"?"":"hidden")+'>الحساب المستلم'+
     '<select name="targetAccountId">'+accountsHtml(arr,arr.find(x=>x.id!==preferred)?.id||"")+'</select></label>'+
   '<details class="cx312-optional"><summary>الفئة والتاريخ والتفاصيل الاختيارية</summary>'+
    '<label>الفئة<select name="category">'+cats(type)+'</select></label>'+
    '<label>التاريخ<input name="date" type="date" required value="'+esc(iso())+'"></label></details>'+
   '<p id="cx312QuickError" role="alert" aria-live="assertive" hidden></p>'+
   '<button type="submit" id="cx312QuickSave" class="cx312-save"><i class="fa-solid fa-check"></i> حفظ المعاملة</button>'+
   '<p class="cx312-quick-foot">أي معاملة ستظهر في الحساب والتقارير. يمكن التراجع عن آخر إضافة من الشريط الظاهر بعد الحفظ.</p>'+
   '</form>';
 }
 function clearSheet(){
  if(!sheet)return;
  if(sheet.__previousFocus?.isConnected)sheet.__previousFocus.focus({preventScroll:true});
  sheet.remove();sheet=null;d.body.classList.remove("cx312-modal-open");
 }
 function setType(type){
  if(!sheet||!types.some(x=>x[0]===type))return;
  const f=sheet.querySelector("#cx312QuickForm");if(!f)return;
  f.elements.type.value=type;recentType=type;
  f.querySelectorAll("[data-ux312-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.ux312Type===type)));
  f.querySelector("#cx312Target").hidden=type!=="transfer";
  f.querySelector("#cx312CommonChips").hidden=type!=="expense";
  const description=f.elements.description;
  if(type==="transfer"&&!description.value.trim())description.placeholder="تحويل بين حساباتي";
  else if(type==="income"&&!description.value.trim())description.placeholder="مرتب، مكافأة، دخل إضافي...";
  else if(!description.value.trim())description.placeholder="مثال: قهوة، بنزين، فاتورة...";
  f.elements.category.innerHTML=cats(type);
  classify();
 }
 function classify(){
  const f=sheet?.querySelector("#cx312QuickForm");if(!f)return;
  const desc=String(f.elements.description.value||"").trim(),type=f.elements.type.value;
  if(!desc||type==="transfer")return;
  const found=w.FLOSY_CATEGORIES?.classify?.(desc,type);
  if(found?.label&&f.elements.category.querySelector('option[value="'+
    ((w.CSS?.escape?.(found.label))||found.label.replace(/"/g,'\\"'))+'"]'))f.elements.category.value=found.label;
  else if(found?.label){const options=[...f.elements.category.options];const match=options.find(o=>o.value===found.label);
    if(match)f.elements.category.value=match.value;
  }
 }
 function openSheet(type="expense"){
  if(!types.some(x=>x[0]===type))type="expense";
  clearSheet();
  const dialog=d.createElement("section");dialog.className="cx312-overlay";
  dialog.id="cx312Overlay";dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");
  dialog.setAttribute("aria-labelledby","cx312Title");dialog.__previousFocus=d.activeElement;
  dialog.innerHTML='<div class="cx312-backdrop" data-ux312-close></div>'+
   '<div class="cx312-sheet"><header><div><small>FLOSY · إدخال ذكي</small><h2 id="cx312Title">إضافة حركة</h2></div>'+
    '<button type="button" data-ux312-close aria-label="إغلاق بدون حفظ"><i class="fa-solid fa-xmark"></i></button></header>'+
    formMarkup(type)+
    '<div class="cx312-sheet-other"><button type="button" data-ux312-open-screen="7"><i class="fa-solid fa-microphone"></i> صوت</button>'+
    '<button type="button" data-ux312-open-screen="6"><i class="fa-solid fa-camera"></i> فاتورة</button>'+
    '<button type="button" data-ux312-open-screen="5"><i class="fa-solid fa-sliders"></i> إضافة مفصلة</button></div></div>';
  d.body.appendChild(dialog);sheet=dialog;d.body.classList.add("cx312-modal-open");
  setType(type);
  const input=sheet.querySelector("[name=amount]");if(input)input.focus({preventScroll:true});
  return dialog;
 }
 function handleSheetClick(target){
  if(target.closest("[data-ux312-close]")){clearSheet();return true}
  const account=target.closest("[data-ux312-create-account]");
  if(account){clearSheet();api()?.go?.(3);api()?.openAccountDialog?.();return true}
  const t=target.closest("[data-ux312-type]");
  if(t){setType(t.dataset.ux312Type);return true}
  const choice=target.closest("[data-ux312-preset]");
  if(choice){
   const f=sheet?.querySelector("#cx312QuickForm");if(!f)return true;
   f.elements.description.value=choice.dataset.ux312Preset;classify();
   f.elements.amount.focus({preventScroll:true});return true;
  }
  const nav=target.closest("[data-ux312-open-screen]");
  if(nav){const route=Number(nav.dataset.ux312OpenScreen);clearSheet();api()?.go?.(route);return true}
  return false;
 }
 function saveQuick(ev){
  ev.preventDefault();
  const form=ev.target,err=form.querySelector("#cx312QuickError");
  const state=Object.fromEntries(new FormData(form).entries()),a=api(),type=state.type;
  const amount=Number(state.amount),acc=String(state.accountId||""),target=String(state.targetAccountId||"");
  const owned=a?.accounts?.()||[];
  const failure=message=>{err.hidden=false;err.textContent=message;form.querySelector("#cx312QuickSave").disabled=false};
  err.hidden=true;
  if(!(amount>0&&Number.isFinite(amount)&&amount<1e9))return failure("اكتب مبلغًا صحيحًا أكبر من صفر.");
  if(!owned.some(x=>String(x.id)===acc))return failure("اختار حسابًا موجودًا.");
  if(type==="transfer"&&(!owned.some(x=>String(x.id)===target)||acc===target))
   return failure("التحويل يحتاج حسابين مختلفين.");
  const date=String(state.date||iso());
  const enteredDescription=String(state.description||"").trim().slice(0,90);
  if(type==="expense"&&!enteredDescription)
   return failure("اختار مصروف شائع (زي قهوة) أو اكتب وصفًا بسيطًا قبل الحفظ علشان ما تضيعش تفاصيل العملية.");
  const description=enteredDescription||(type==="income"?"دخل":"تحويل بين حساباتي");
  const cat=w.FLOSY_CATEGORIES?.resolve?.(String(state.category||""),description,type);
  const category=cat?.label||String(state.category|| (type==="income"?"دخل آخر":type==="transfer"?"تحويل داخلي":"مشتريات"));
  form.querySelector("#cx312QuickSave").disabled=true;
  try{
   const saved=a.postBatch([{type,amount,accountId:acc,targetAccountId:type==="transfer"?target:null,
    description,category,date}],form.dataset.cx313RepeatPrepared==="yes"?
     "flosy391_manual_repeat":"flosy312_quick_add");
   a.setDefaultAccount?.(acc);
   clearSheet();a.notify?.("✓ تم حفظ "+saved.length+" معاملة في دفتر فلوسي. زر التراجع متاح الآن.");
   if(a.getCurrentScreen?.()!==2)a.go?.(2);
  }catch(e){failure(String(e.message||"تعذر الحفظ. حاول مرة أخرى."))}
 }
 function bindPage(id){
  const frame=d.querySelector('.phone-frame[data-screen="'+Number(id)+'"]');
  const box=frame?.querySelector(".flosy-real");if(!box)return;
  if(Number(id)===2){
   const priorities=box.querySelector("#flosyNeedsHomeV398");
   const safeExplain=box.querySelector("#flosySafeExplainV397");
   box.innerHTML=homeMarkup();
   const home=box.querySelector(".cx312-home");
   // Existing real-data owner controls are retained, not duplicated or replaced with fake labels.
   if(safeExplain)home.querySelector(".cx312-safe")?.after(safeExplain);
   if(priorities)home.appendChild(priorities);
  }
  if(Number(id)===5){
   box.querySelector(".flosy-v399-entry-switch")?.remove();
   // Advanced tools remain available in their existing collapsed details controls.
   const f=box.querySelector("#flosyNewTxForm");
   if(f&&!f.querySelector("#cx312MoreManual")){
    const opts=d.createElement("details");opts.id="cx312MoreManual";opts.className="cx312-optional";
    opts.innerHTML="<summary>المزيد من التفاصيل (التاريخ والوقت والملاحظات)</summary>";
    for(const name of ["date","time","note"]){const field=f.elements[name]?.closest("label");
     if(field&&name!=="date")opts.appendChild(field)}
    const submit=f.querySelector('[type="submit"]');submit?.before(opts);
   }
  }
  if(Number(id)===6){
   const items=box.querySelector("#flosyReceiptPaste")?.closest(".flosy-panel");
   if(items&&!items.matches("details")){
    const details=d.createElement("details");details.className="cx312-optional";
    details.innerHTML='<summary>قراءة نص الفاتورة أو تصحيحه يدويًا</summary>';
    items.before(details);details.appendChild(items);
   }
   const chooser=box.querySelector("#flosyReceiptFile");
   if(chooser)chooser.setAttribute("aria-label","اختر صورة الفاتورة من الهاتف");
  }
  if(Number(id)===7){
   box.querySelector(".flosy-v399-voice-opt")?.setAttribute("aria-describedby","flosyCaptureStatus");
   const helper=d.createElement("p");helper.className="cx312-tip";
   helper.textContent="مثال: دفعت 120 جنيه بنزين من الكاش. لو الرقم اتفهم غلط، صححه من نفس شاشة المراجعة قبل الحفظ.";
   const target=box.querySelector(".fx-voice-capture");
   if(target&&!target.querySelector(".cx312-tip"))target.appendChild(helper);
  }
  if(Number(id)===8){
   const stream=box.querySelector("#flosyAiUnifiedInput")||box.querySelector("#flosyAiUnifiedForm");
   if(stream&&!box.querySelector(".cx312-ai-prompts")){
    const prompts=d.createElement("section");prompts.className="cx312-ai-prompts";
    prompts.innerHTML='<strong>جرّب تسألني عن بياناتك</strong><div>'+
     ["ليه مصاريفي زادت الشهر ده؟","إيه أكبر 5 مصروفات الشهر ده؟","إزاي أوفر الشهر الجاي؟","أقدر أصرف كام النهارده؟"].map(q=>
      '<button type="button" data-ux312-ai-question="'+esc(q)+'">'+esc(q)+'</button>').join("")+'</div>';
    const visible=box.querySelector(".faix-chips")||box.querySelector(".faix-welcome")||stream.closest("form");
    visible?.after(prompts);
   }
   box.querySelector(".flosy-v399-ai-capture")?.remove();
  }
  if(Number(id)===15){
   const ui=box.querySelector(".flosy-report-ui-v311");
   if(ui&&!ui.querySelector("#cx312ReportAdvanced")){
    const presets=ui.querySelector(".report311-presets"),filters=ui.querySelector(".report311-filters");
    const bar=ui.querySelector(".report311-files"),status=ui.querySelector("#flosyReportStatus");
    if(presets&&filters&&bar&&status){
     const details=d.createElement("details");details.id="cx312ReportAdvanced";details.className="cx312-optional";
     details.innerHTML='<summary>تخصيص الفترة والحساب والفئة (اختياري)</summary>';
     details.appendChild(presets);details.appendChild(filters);status.before(details);
     const caption=d.createElement("p");caption.className="cx312-tip";caption.textContent=
      "ملخص هذا الشهر جاهز تلقائيًا. لتنزيله اختر PDF أو Excel أو CSV، أو افتح التخصيص لتغيير الفترة.";
     bar.before(caption);
    }
   }
  }
  const nav=frame.querySelector('.flosy-nav399 button[data-flosy-screen="5"]');
  if(nav){nav.removeAttribute("data-flosy-screen");nav.setAttribute("data-ux312-quick","expense");
   nav.setAttribute("aria-label","إضافة معاملة بسرعة");nav.querySelector("span").textContent="إضافة";}
 }
 function decorateReview(){
  const review=w.FLOSY_CAPTURE_REVIEW_V2;
  if(!review?.open||review.__cx312Wrapped)return;
  const originalOpen=review.open;
  review.open=function(options){
   const result=originalOpen(options),node=d.getElementById("flosyReviewOverlayV2");
   if(node){
    node.classList.add("cx312-review");
    const heading=node.querySelector("header p");
    if(heading)heading.textContent="راجع المبلغ والحساب ويمكنك تعديلهما هنا قبل الحفظ. لم تُسجّل أي عملية بعد.";
    const firstAmount=node.querySelector('input[name^="amount-"]');
    firstAmount?.setAttribute("inputmode","decimal");
    node.querySelectorAll(".flosy-v2-items").forEach((details,i)=>{
     const item=options?.items?.[i]||options?.items?.[0];
     const n=Array.isArray(item?.receiptDetails?.items)?item.receiptDetails.items.length:0;
     const warns=item?.receiptDetails?.extractionWarnings||[];
     if(n>4&&!warns.length&&!item?.receiptDetails?.arithmeticContradiction)details.open=false;
    });
    if(options?.kind==="receipt"){
     const source=d.getElementById("flosyV310ReceiptPreview");
     if(source&&!source.hidden&&/^blob:/.test(source.src)&&node.querySelector("header")){
      const image=d.createElement("img");image.src=source.src;image.alt="صورة الفاتورة الأصلية للمقارنة أثناء المراجعة";
      image.className="cx312-review-image";node.querySelector("header").after(image);
     }
    }
   }
   return result;
  };review.__cx312Wrapped=true;
 }
 function init(){
  decorateReview();
  w.FLOSY_CUSTOMER_COACH_V312?.install?.(w);
  if(hotkeysAttached)return;hotkeysAttached=true;
  d.addEventListener("click",event=>{
   if(sheet&&handleSheetClick(event.target))return;
   const quick=event.target.closest("[data-ux312-quick]");
   if(quick){event.preventDefault();openSheet(quick.dataset.ux312Quick);return;}
   const q=event.target.closest("[data-ux312-ai-question]");
   if(q){event.preventDefault();api()?.go?.(8);w.FLOSY_UNIFIED_AI?.ask?.(q.dataset.ux312AiQuestion);return;}
   const help=event.target.closest("[data-ux312-help]");
   if(help?.dataset.ux312Help==="safe"){
    api()?.notify?.("المتاح اليومي تقدير وليس رصيدًا بنكيًا؛ يعتمد على الحسابات والالتزامات المسجلة. افتح الميزانية لمراجعة مدخلات الحساب.");
   }
  });
  d.addEventListener("submit",e=>{
   if(e.target?.id==="cx312QuickForm"){e.stopPropagation();saveQuick(e);}
  },true);
  d.addEventListener("input",e=>{
   if(e.target?.id==="cx312Description")classify();
  });
  d.addEventListener("keydown",e=>{
   if(e.key==="Escape"&&sheet){e.preventDefault();clearSheet();return;}
   if(e.key==="Tab"&&sheet){
    const items=[...sheet.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),summary')]
      .filter(x=>!x.closest('[hidden]')&&x.getClientRects().length>0);
    if(!items.length)return;
    const start=items[0],end=items[items.length-1];
    if(e.shiftKey&&d.activeElement===start){e.preventDefault();end.focus();}
    else if(!e.shiftKey&&d.activeElement===end){e.preventDefault();start.focus();}
   }
  });
 }
 function render(id){original(id);init();bindPage(id);d.body.classList.add("flosy-customer-v312");}
 P.render=render;
 init();
 w.FLOSY_CUSTOMER_V312={version:"3.12.0",homeMarkup,formMarkup,openSheet,clearSheet,render};
})(window,document);