/* Flosy 3.9.1 UX overhaul. Pure presentation controller; the ledger remains
 * FLOSY_UNIFIED.postBatch/FLOSY_BRIDGE.mutate, never a duplicate store. */
(function(w,d){"use strict";
 const P=w.FLOSY_UNIFIED_PAGES,U=()=>w.FLOSY_UNIFIED, K=w.FLOSY_CATEGORIES;
 if(!P||!K)return;
 const renderOld=P.render,html=(s)=>U()?.esc(s)||String(s??"");
 const money=x=>U()?.money(x)||"0 ج.م";
 const icon=x=>'<i class="fa-solid '+html(x)+'" aria-hidden="true"></i>';
 const accounts=()=>U()?.accounts()||[];
 const rows=()=>w.FLOSY_ULTRA_DATA?.cleanTx(U()?.state()||{})||[];
 const parseDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:"";
 const typeText=t=>t==="income"?"دخل":t==="transfer"?"تحويل":"مصروف";
 const color=t=>t==="income"?"var(--income)":t==="transfer"?"var(--secondary)":"var(--expense)";
 const groupOptions=(items,selected="",useAll=false)=>(useAll?'<option value="all">كل الفئات</option>':"")+
  [...new Set(items.map(x=>x.group))].map(g=>
   '<optgroup label="'+html(g)+'">'+items.filter(c=>c.group===g).map(c=>
    '<option value="'+html(c.label)+'"'+(c.label===selected?' selected':'')+'>'+html(c.label)+'</option>').join("")+'</optgroup>').join("");
 const accountOptions=(current="",includeAll=false)=>(includeAll?'<option value="all">كل الحسابات</option>':"")+
  accounts().map(a=>'<option value="'+html(a.id)+'"'+(a.id===current?' selected':'')+'>'+html(a.name||"حساب")+'</option>').join("");
 const banner=(title,sub,back=2)=>'<div class="fx-page-head">'+
  '<div><span class="fx-overline">FLOSY · MY MONEY</span><h2>'+html(title)+'</h2><p>'+html(sub)+'</p></div>'+
  '<button class="fx-circle" type="button" aria-label="رجوع" data-flosy-screen="'+back+'">'+icon("fa-arrow-right")+'</button></div>';
 const categorySpec=(t)=>K.byLabel(t.category,t.type)||K.resolve(t.category,t.description,t.type);
 function countText(n){return new Intl.NumberFormat("ar-EG").format(n)}
 function item(t){
  const cat=categorySpec(t),tag=cat?.label||String(t.category||"أخرى"),account=accounts().find(a=>a.id===t.accountId);
  const iconName=t.icon||K.resolve(tag,t.description,t.type)?.icon||"fa-wallet";
  const candidate=t.categoryColor||cat?.color||"#64748B";
  const palette=/^#[0-9A-Fa-f]{6}$/.test(candidate)?candidate:"#64748B";
  return '<div class="fx-transaction" data-transaction="'+html(t.id)+'">'+
   '<div class="fx-transaction-main"><span class="fx-transaction-symbol" style="--tx-color:'+palette+'">'+icon(iconName)+'</span>'+
   '<div class="fx-transaction-copy"><strong>'+html(t.description||tag)+'</strong>'+
    '<span><b style="color:'+palette+'">'+html(tag)+'</b> · '+html(account?.name||"حساب")+" · "+html(t.time||t.date||"")+'</span></div>'+
   '<div class="fx-transaction-amount" style="color:'+color(t.type)+'">'+
     (t.type==="expense"?"−":t.type==="income"?"+":"↔")+money(t.amount)+'</div></div>'+
   '<div class="fx-transaction-tools"><button type="button" data-fx-details="'+html(t.id)+'" aria-label="عرض تفاصيل المعاملة">'+icon("fa-eye")+' التفاصيل</button>'+
    '<button type="button" data-fx-edit="'+html(t.id)+'" aria-label="تعديل المعاملة">'+icon("fa-pen")+' تعديل</button>'+
    '<button type="button" data-fx-delete="'+html(t.id)+'" aria-label="حذف المعاملة">'+icon("fa-trash-can")+' حذف</button></div></div>';
 }
 const today=()=>U()?.date()||new Date().toISOString().slice(0,10);
 function recordPage(){
  return banner("سجل المعاملات","كل حركة مربوطة بالحساب والفئة والتقارير")+
   '<div class="fx-records-summary" id="fxRecordsSummary"></div>'+
   '<div class="fx-searchbar"><span>'+icon("fa-magnifying-glass")+'</span><input id="flosyTxSearch" class="flosy-input" type="search" aria-label="بحث في المعاملات" placeholder="ابحث عن عملية أو محل أو فئة...">'+
   '<button type="button" class="fx-icon-button" id="fxFiltersToggle" aria-expanded="false" aria-controls="fxAdvancedFilters">'+icon("fa-sliders")+'</button></div>'+
   '<div class="fx-type-tabs" role="group" aria-label="تصفية المعاملات">'+
    ["all","expense","income","transfer"].map((t,i)=>
     '<button type="button" data-fx-type="'+t+'" aria-pressed="'+(i===0)+'">'+(["الكل","مصروف","دخل","تحويل"][i])+'</button>').join("")+'</div>'+
   '<div class="fx-filter-card" id="fxAdvancedFilters" hidden>'+
    '<div class="fx-filter-grid"><label>الحساب<select class="flosy-input" id="fxAccountFilter">'+accountOptions("",true)+'</select></label>'+
    '<label>الفئة<select class="flosy-input" id="fxCategoryFilter">'+groupOptions([...K.forType("expense"),...K.forType("income"),...K.forType("transfer")],"",true)+'</select></label>'+
    '<label>من تاريخ<input type="date" id="fxStartDate" class="flosy-input"></label>'+
    '<label>إلى تاريخ<input type="date" id="fxEndDate" class="flosy-input"></label>'+
    '<label>الترتيب<select class="flosy-input" id="fxSort"><option value="recent">الأحدث</option><option value="old">الأقدم</option>'+
     '<option value="amount">الأكبر مبلغًا</option></select></label></div>'+
    '<button class="flosy-btn flosy-btn-secondary" type="button" id="fxClearFilters">مسح الفلاتر</button></div>'+
   '<div class="fx-list-head"><strong>الحركات المالية <span id="fxFilteredCount"></span></strong>'+
    '<button class="fx-link" type="button" data-flosy-screen="5">+ إضافة جديدة</button></div>'+
   '<div class="fx-transactions-list" id="flosyLiveTransactionList" aria-live="polite"></div>'+
   '<button type="button" id="fxLoadMore" class="flosy-btn flosy-btn-secondary" style="width:100%;margin-top:9px" hidden>عرض المزيد</button>'+
   '<div class="fx-action-rail">'+
    '<button type="button" data-flosy-screen="5">'+icon("fa-plus")+' يدوي</button>'+
    '<button type="button" data-flosy-screen="7">'+icon("fa-microphone")+' صوت</button>'+
    '<button type="button" data-flosy-screen="6">'+icon("fa-camera")+' فاتورة</button></div>'+
   '<dialog id="fxEditDialog" class="fx-dialog"><form method="dialog" id="fxEditForm">'+
   '<div class="fx-modal-head"><h3>تعديل المعاملة</h3><button type="button" id="fxEditCancel" class="fx-circle" aria-label="إغلاق">'+icon("fa-xmark")+'</button></div>'+
   '<label>النوع<select class="flosy-input" name="type"><option value="expense">مصروف</option><option value="income">دخل</option><option value="transfer">تحويل</option></select></label>'+
   '<label>المبلغ<input class="flosy-input" type="number" name="amount" step=".01" min=".01" required></label>'+
   '<label>الوصف<input class="flosy-input" name="description" maxlength="90" required></label>'+
   '<label>الفئة<select class="flosy-input" name="category"></select></label>'+
   '<label>الحساب<select class="flosy-input" name="accountId">'+accountOptions()+'</select></label>'+
   '<label>حساب التحويل المستلم<select class="flosy-input" name="targetAccountId">'+accountOptions()+'</select></label>'+
   '<label>التاريخ<input class="flosy-input" type="date" name="date" required></label>'+
   '<div class="flosy-buttonbar"><button class="flosy-btn" type="submit">حفظ التعديل</button>'+
   '<button class="flosy-btn flosy-btn-secondary" id="fxEditClose" type="button">إلغاء</button></div></form></dialog>';
 }
 function categoriesMarkup(type,selected){
  const list=K.forType(type),groups=K.groups(type);
  return '<div class="fx-category-grid">'+groups.map(g=>
   '<div class="fx-category-group-label">'+html(g)+'</div>'+
   list.filter(c=>c.group===g).map(c=>
    '<button type="button" data-fx-cat="'+html(c.label)+'" aria-pressed="'+(c.label===selected)+'" '+
    'style="--cat:'+c.color+'"><span class="fx-cat-icon">'+icon(c.icon)+'</span>'+
    '<span>'+html(c.label)+'</span></button>').join("")).join("")+'</div>';
 }
 function manualPage(){
  const existing=accounts(),account=U()?.defaultAccount()||existing[0]?.id||"";
  return banner("معاملة جديدة","تسجيل سريع، كل التفاصيل بتتحدث في مكان واحد")+
   '<form id="flosyNewTxForm" class="fx-entry-form">'+
   '<div class="fx-type-tabs fx-entry-types" role="group" aria-label="نوع المعاملة">'+
    [["expense","مصروف","fa-arrow-trend-down"],["income","دخل","fa-arrow-trend-up"],["transfer","تحويل","fa-right-left"]].map(([t,l,i])=>
     '<button type="button" data-fx-entry-type="'+t+'" aria-pressed="'+(t==="expense")+'">'+icon(i)+" "+l+'</button>').join("")+'</div>'+
   '<input type="hidden" name="type" value="expense">'+
   '<div class="fx-quickbox" aria-label="اختصارات المعاملات">'+
    '<div class="fx-quick-title"><strong>تسجيل أسرع</strong><small>اختار المصروف واكتب المبلغ فقط</small></div>'+
    '<div class="fx-quickchips">'+
     '<button type="button" data-fx-quick="قهوة">☕ قهوة</button>'+
     '<button type="button" data-fx-quick="مواصلات">🚕 مواصلات</button>'+
     '<button type="button" data-fx-quick="فطار">🥪 فطار</button>'+
     '<button type="button" data-fx-quick="سوبرماركت">🛒 سوبرماركت</button>'+
     '<button type="button" data-fx-repeat="latest">↺ كرر آخر مصروف</button>'+
    '</div></div>'+
   '<div class="fx-amount-card"><span>المبلغ بالجنيه المصري</span><div><input class="fx-amount-input" type="number" name="amount" min=".01" max="999999999" step=".01" inputmode="decimal" required placeholder="0.00"><b>ج.م</b></div></div>'+
   '<label class="fx-form-field">الوصف<input class="flosy-input" name="description" id="fxDescription" placeholder="مثال: بنزين العربية، قهوة، مرتب..." maxlength="90" required></label>'+
   '<div id="fxSelectedCategory" class="fx-selected-category" aria-live="polite"></div>'+
    '<details class="fx-category-details" id="fxCategoryDetails"><summary>تعديل الفئة (اختياري — بنقترحها تلقائيًا)</summary>'+
   '<div class="fx-form-section-head"><strong>الفئة المناسبة <span id="fxCategoryCount"></span></strong>'+
    '<label class="fx-inline-search">'+icon("fa-magnifying-glass")+'<input type="search" id="fxCategorySearch" aria-label="بحث في الفئات" placeholder="بحث..."></label></div>'+
   
   '<input type="hidden" name="category" value="مطاعم ووجبات">'+
   '<div id="fxCategoryGrid">'+categoriesMarkup("expense","مطاعم ووجبات")+'</div></details>'+
   '<div class="fx-two-col">'+
    '<label class="fx-form-field">من حساب<select class="flosy-input" name="accountId" required>'+accountOptions(account)+'</select></label>'+
    '<label class="fx-form-field" id="flosyTargetWrap" hidden>إلى حساب<select class="flosy-input" name="targetAccountId">'+accountOptions()+'</select></label>'+
    '<label class="fx-form-field">التاريخ<input class="flosy-input" type="date" name="date" required value="'+today()+'"></label>'+
    '<label class="fx-form-field">الوقت (اختياري)<input class="flosy-input" type="time" name="time"></label></div>'+
   '<label class="fx-form-field">ملاحظة (اختيارية)<input class="flosy-input" name="note" maxlength="180" placeholder="أي تفاصيل تساعدك تتذكر العملية"></label>'+
   '<button class="flosy-btn" type="submit" id="fxSubmitTransaction" style="width:100%">'+icon("fa-check-circle")+' حفظ المعاملة</button>'+
   '<div class="fx-form-hint">كل عملية تتحفظ في حساب واحد وتتضاف للتقارير. التحويل بين حساباتك مش مصروف.</div>'+
   '</form>'+
   '<div class="fx-action-rail"><button type="button" data-flosy-screen="7">'+icon("fa-microphone")+' تسجيل بالصوت</button>'+
   '<button type="button" data-flosy-screen="6">'+icon("fa-camera")+' تصوير إيصال</button></div>';
 }
 function accountPicker(id="fxCaptureAccount"){
  const chosen=U()?.defaultAccount()||"";
  return '<label class="fx-form-field">الحساب المفضل للإضافة اليدوية<select id="'+id+'" class="flosy-input">'+
    '<option value="">اختر الحساب</option>'+accountOptions(chosen)+'</select></label>';
 }
 function capturePage(){
  return banner("تصوير الإيصال","كاميرا أو معرض صور، ثم مراجعة المبلغ والحساب قبل الحفظ")+
   '<section class="fx-hero-capture"><div class="fx-capture-art">'+icon("fa-receipt")+'</div>'+
    '<h3>صوّر الوصل... وسيب الباقي لفلوسي</h3><p>قراءة عربي وإنجليزي. بنقترح الإجمالي والحساب، ومش بنحفظ أي عملية قبل موافقتك.</p>'+
    '<div class="fx-capture-actions"><button type="button" class="flosy-btn" data-flosy-action="receipt" data-mode="camera">'+icon("fa-camera")+' افتح الكاميرا</button>'+
     '<button type="button" class="flosy-btn flosy-btn-secondary" data-flosy-action="receipt" data-mode="gallery">'+icon("fa-images")+' من المعرض</button></div>'+
    '<input id="flosyReceiptFile" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="صورة إيصال" style="width:100%;margin-top:10px">'+
    '<p class="fx-capture-status" id="flosyReceiptStatus" role="status" aria-live="polite">جاهز. اختار صورة واضحة بإضاءة كويسة.</p></section>'+
   '<section class="flosy-panel">'+accountPicker("fxReceiptAccount")+
    '<p class="flosy-muted">الاختيار ده تفضيل فقط؛ لازم تأكد حساب الدفع في شاشة المراجعة.</p></section>'+
   '<section class="flosy-panel"><h3>نص الفاتورة (للتصحيح عند الحاجة)</h3>'+
    '<textarea class="flosy-input" id="flosyReceiptPaste" rows="6" placeholder="المتجر&#10;Date: 13/11/2026&#10;TOTAL: EGP 125.00"></textarea>'+
    '<button class="flosy-btn" type="button" id="flosyReceiptSave" style="margin-top:9px;width:100%">استخراج البيانات ومراجعتها قبل الحفظ</button>'+
    '<p class="flosy-muted">لو الإجمالي مش واضح هتظهر رسالة لإعادة التصوير أو تصحيح النص.</p></section>';
 }
 function voicePage(){
  return banner("مصروفات بالصوت","اتكلم بالمصري وراجع اللي فهمه فلوسي قبل الحفظ")+
   '<section class="fx-hero-capture fx-voice-capture">'+
    '<div class="fx-capture-art fx-pulse">'+icon("fa-microphone-lines")+'</div>'+
    '<h3>قول العملية بطريقتك</h3>'+
    '<p>مثال: «دفعت 75 جنيه قهوة من الكاش» أو «اشتريت عربية بـ 200 ألف جنيه».</p>'+
    '<button class="flosy-btn" type="button" data-flosy-action="listen" id="fxListenButton">'+icon("fa-microphone")+' ابدأ التسجيل</button>'+
    '<p class="fx-capture-status" id="flosyCaptureStatus" role="status" aria-live="polite">الميكروفون جاهز — تأكد إنك سمحت له على هاتفك.</p></section>'+
    '<section class="flosy-panel">'+accountPicker("fxVoiceAccount")+'</section>'+
    '<section class="flosy-panel"><h3>جرب كتابة الجملة لو الميكروفون مش متاح</h3>'+
     '<form id="flosyVoiceTypedForm" class="fx-voice-form"><input class="flosy-input" name="spoken" required placeholder="دفعت 50 جنيه بنزين" autocomplete="off">'+
     '<button class="flosy-btn" type="submit">تحليل الجملة ومراجعة العملية</button></form></section>'+
    '<section class="flosy-panel"><h3>إزاي بنتعامل مع كلامك؟</h3><p class="flosy-muted">'+
     'بنقترح المبلغ والنوع والتاريخ من الجملة، وبنعرض كل حاجة للمراجعة. أرصدتك لا تتغير قبل اختيار الحساب والتأكيد، وأي مبلغ غير واضح يتم رفضه.</p></section>';
 }
 function aiPage(){
  return '<div class="faix-host"><div id="flosyUnifiedAI"></div></div>';
 }
 function topStats(list){
  const inc=list.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0);
  const exp=list.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0);
  return '<div><b style="color:var(--income)">'+money(inc)+'</b><small>الدخل</small></div>'+
    '<div><b style="color:var(--expense)">'+money(exp)+'</b><small>المصروف</small></div>'+
    '<div><b>'+money(inc-exp)+'</b><small>الصافي</small></div>';
 }
 function bindRecords(box){
  let type="all",page=1;
  const el=sel=>box.querySelector(sel);
  function selected(){
   const q=K.normalize(el("#flosyTxSearch").value),account=el("#fxAccountFilter").value,
     category=el("#fxCategoryFilter").value,start=el("#fxStartDate").value,end=el("#fxEndDate").value,
     sort=el("#fxSort").value;
   const list=rows().filter(t=>
    (type==="all"||t.type===type)&&
    (account==="all"||t.accountId===account||t.targetAccountId===account)&&
    (category==="all"||t.category===category)&&(!start||t.date>=start)&&(!end||t.date<=end)&&
    (!q||K.normalize([t.description,t.category,t.note,
       accounts().find(x=>x.id===t.accountId)?.name].join(" ")).includes(q)));
   list.sort((a,b)=>sort==="amount"?Number(b.amount)-Number(a.amount):
    sort==="old"?String(a.date).localeCompare(String(b.date)):
     String(b.date).localeCompare(String(a.date))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
   return list;
  }
  function update(){
   const list=selected();
   el("#fxRecordsSummary").innerHTML=topStats(list);
   el("#fxFilteredCount").textContent="("+countText(list.length)+")";
   const visible=list.slice(0,page*40);let lastDate="";
   el("#flosyLiveTransactionList").innerHTML=visible.map(t=>{
    const day=String(t.date||"");const head=day!==lastDate?
     '<h4 class="fx-date-divider">'+html(day)+'</h4>':"";
    lastDate=day;return head+item(t);
   }).join("")||'<p class="fx-empty">مفيش معاملات مطابقة للفلاتر. جرّب بحث مختلف.</p>';
   el("#fxLoadMore").hidden=list.length<=visible.length;
  }
  const watch=["#flosyTxSearch","#fxAccountFilter","#fxCategoryFilter","#fxStartDate","#fxEndDate","#fxSort"];
  watch.forEach(id=>{const n=el(id);n.addEventListener("input",()=>{page=1;update()});});
  box.querySelectorAll("[data-fx-type]").forEach(b=>b.onclick=()=>{
   type=b.dataset.fxType;page=1;box.querySelectorAll("[data-fx-type]").forEach(n=>n.setAttribute("aria-pressed",String(n===b)));update();
  });
  el("#fxFiltersToggle").onclick=()=>{
   el("#fxAdvancedFilters").hidden=!el("#fxAdvancedFilters").hidden;
   el("#fxFiltersToggle").setAttribute("aria-expanded",String(!el("#fxAdvancedFilters").hidden));
  };
  el("#fxLoadMore").onclick=()=>{page++;update()};
  el("#fxClearFilters").onclick=()=>{
   for(const id of ["#flosyTxSearch","#fxStartDate","#fxEndDate"])el(id).value="";
   for(const id of ["#fxAccountFilter","#fxCategoryFilter","#fxSort"])el(id).selectedIndex=0;
   type="all";box.querySelectorAll("[data-fx-type]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.fxType===type)));
   page=1;update();
  };
  const dialog=el("#fxEditDialog"),form=el("#fxEditForm");
  el("#fxEditCancel").onclick=el("#fxEditClose").onclick=()=>dialog.close();
  function openEditor(id){
   const t=rows().find(x=>x.id===id);if(!t)return;
   form.dataset.editId=t.id;
   for(const name of ["type","amount","description","accountId","targetAccountId","date"]){
    if(form.elements[name])form.elements[name].value=String(t[name]??"");
   }
   form.elements.category.innerHTML=groupOptions(K.forType(t.type),t.category);
   form.elements.category.value=t.category;
   if(!form.elements.category.value)form.elements.category.value=K.forType(t.type).at(-1)?.label||"";
   dialog.showModal();
  }
  function removeRecord(id){
   if(!confirm("حذف العملية دي من دفتر الحسابات؟ هيتحدث رصيد الحساب والتقارير."))return;
   U().core().FLOSY_BRIDGE.mutate(s=>{
    const found=(s.transactions||[]).find(x=>x.id===id);if(!found)return;
    s.transactions=s.transactions.filter(x=>x.id!==id);
    s.deletedIds=Array.isArray(s.deletedIds)?s.deletedIds:[];
    s.deletedIds.push("transactions/"+id);
   });update();U().notify("اتحذفت العملية واتحدّث الرصيد");
  }
  el("#flosyLiveTransactionList").addEventListener("click",e=>{
   const edit=e.target.closest("[data-fx-edit]"),del=e.target.closest("[data-fx-delete]");
   if(edit)openEditor(edit.dataset.fxEdit);
   if(del)removeRecord(del.dataset.fxDelete);
  });
  form.elements.type.onchange=()=>{
   const old=form.elements.category.value;
   form.elements.category.innerHTML=groupOptions(K.forType(form.elements.type.value),old);
  };
  form.onsubmit=e=>{
   e.preventDefault();
   const id=form.dataset.editId,m=new FormData(form),typ=String(m.get("type"));
   const amount=Number(m.get("amount")),desc=String(m.get("description")||"").trim(),
    date=String(m.get("date")),acc=String(m.get("accountId")||""),
    target=String(m.get("targetAccountId")||"");
   if(!Number.isFinite(amount)||amount<=0||amount>=1e9||!desc||!parseDate(date)||
      !accounts().some(x=>x.id===acc))return U().notify("راجع المبلغ والوصف والحساب والتاريخ");
   if(typ==="transfer"&&(!target||target===acc||!accounts().some(x=>x.id===target)))
    return U().notify("اختار حساب تحويل مستلم مختلف");
   const category=K.resolve(String(m.get("category")),desc,typ);
   U().core().FLOSY_BRIDGE.mutate(s=>{
    const t=s.transactions.find(x=>x.id===id);if(!t)return;
    Object.assign(t,{amount:+amount.toFixed(2),type:typ,description:desc,date,accountId:acc,
      targetAccountId:typ==="transfer"?target:null,category:category.label,categoryId:category.id,
      icon:category.icon,categoryColor:category.color,updatedAt:new Date().toISOString()});
   });
   dialog.close();update();U().notify("تم تعديل المعاملة وتحديث جميع الأرصدة");
  };
  update();
 }
 function bindEntry(box){
  const form=box.querySelector("#flosyNewTxForm"),get=name=>form.elements[name];
  const catBox=box.querySelector("#fxCategoryGrid"),search=box.querySelector("#fxCategorySearch");
  function refreshCats(){
   const kind=get("type").value,q=K.normalize(search.value);
   let selected=get("category").value;
   if(!K.byLabel(selected,kind)){selected=K.forType(kind)[0]?.label||"";get("category").value=selected}
   catBox.innerHTML=categoriesMarkup(kind,selected);
   catBox.querySelectorAll("[data-fx-cat]").forEach(b=>b.hidden=!K.normalize(b.dataset.fxCat).includes(q));
   catBox.querySelectorAll(".fx-category-group-label").forEach(group=>{
    let next=group.nextElementSibling,any=false;
    while(next&&!next.matches(".fx-category-group-label")){
     if(!next.hidden)any=true;
     next=next.nextElementSibling;
    }
    group.hidden=!any;
   });
   box.querySelector("#fxCategoryCount").textContent="· "+countText(K.forType(kind).length)+" فئة";
   const c=K.byLabel(selected,kind);
   box.querySelector("#fxSelectedCategory").innerHTML=c?'<span style="--cat:'+c.color+'">'+icon(c.icon)+' '+html(c.label)+'</span>':"";
  }
  function setType(type){
   get("type").value=type;search.value="";
   box.querySelectorAll("[data-fx-entry-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.fxEntryType===type)));
   box.querySelector("#flosyTargetWrap").hidden=type!=="transfer";
   box.querySelector("#fxCategoryGrid").hidden=type==="transfer";
   box.querySelector("#fxCategorySearch").closest(".fx-inline-search").hidden=type==="transfer";
   get("category").value=K.forType(type)[0]?.label||"";
   refreshCats();
  }
  box.querySelectorAll("[data-fx-entry-type]").forEach(b=>b.onclick=()=>setType(b.dataset.fxEntryType));
  const quickPick=label=>{
   form.dataset.repeatMode="false";
   setType("expense");
   const input=box.querySelector("#fxDescription");
   input.value=label;input.dispatchEvent(new Event("input",{bubbles:true}));
   get("amount").focus();
  };
  box.querySelectorAll("[data-fx-quick]").forEach(b=>b.onclick=()=>quickPick(b.dataset.fxQuick));
  const repeat=box.querySelector("[data-fx-repeat]");
  if(repeat)repeat.onclick=()=>{
   const latest=(U()?.state()?.transactions||[]).filter(t=>
    t.type==="expense"&&Number(t.amount)>0&&!t.deleted).slice().sort((a,b)=>
      String(b.createdAt||b.date||"").localeCompare(String(a.createdAt||a.date||"")))[0];
   if(!latest){U().notify("لسه ما فيش مصروف سابق للتكرار");return}
   quickPick(latest.description||latest.category||"مصروف");
   form.dataset.repeatMode="true";
   get("amount").value=String(latest.amount);
   if(accounts().some(a=>a.id===latest.accountId))get("accountId").value=latest.accountId;
   const c=K.resolve(latest.category,latest.description,"expense");
   if(c?.label){get("category").value=c.label;refreshCats()}
   U().notify("جاهز للمراجعة، اضغط حفظ لتسجيل مصروف جديد");
  };
  search.oninput=refreshCats;
  catBox.addEventListener("click",e=>{
   const b=e.target.closest("[data-fx-cat]");if(!b)return;
   get("category").value=b.dataset.fxCat;refreshCats();
  });
  box.querySelector("#fxDescription").oninput=e=>{
   const value=e.target.value,kind=get("type").value;
   if(kind==="transfer"||!value.trim())return;
   const c=K.classify(value,kind);
   if(c.id!=="other"&&c.id!=="other-income"){
    get("category").value=c.label;
    refreshCats();
   }
  };
  form.onsubmit=e=>{
   e.preventDefault();const m=new FormData(form),type=String(m.get("type"));
   const amount=Number(m.get("amount")),date=String(m.get("date")),acc=String(m.get("accountId"));
   const desc=String(m.get("description")||"").trim(),target=String(m.get("targetAccountId")||"");
   if(!Number.isFinite(amount)||amount<=0||!desc||!parseDate(date)||!accounts().some(x=>x.id===acc))
    return U().notify("راجع المبلغ والوصف والحساب");
   if(type==="transfer"&&(!target||target===acc||!accounts().some(x=>x.id===target)))
    return U().notify("اختار حساب استقبال مختلف للتحويل");
   const c=K.resolve(m.get("category"),desc,type);
   try{
    U().postBatch([{type,amount,category:c.label,description:desc,date,accountId:acc,
     targetAccountId:type==="transfer"?target:null,
     time:String(m.get("time")||""),note:String(m.get("note")||"")}],form.dataset.repeatMode==="true"?"flosy391_manual_repeat":"flosy391_manual");
    U().go(4);
   }catch(err){U().notify(err.message);}
  };
  setType("expense");
 }
 function bindAccountSelect(box,id){
  const el=box.querySelector("#"+id);
  if(el)el.onchange=()=>{if(U().setDefaultAccount(el.value))U().notify("اتحدد الحساب المفضل للإضافة اليدوية")};
 }
 function bindReceipt(box){
  bindAccountSelect(box,"fxReceiptAccount");
  box.querySelector("#flosyReceiptSave").onclick=()=>{
   try{U().fromReceiptText(box.querySelector("#flosyReceiptPaste").value);
}catch(err){U().captureStatus("flosyReceiptStatus",err.message,true);U().notify(err.message)}
  };
  box.querySelector("#flosyReceiptFile").onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)
    return U().captureStatus("flosyReceiptStatus","اختار صورة JPEG/PNG/WebP أقل من 8MB",true);
   U().captureStatus("flosyReceiptStatus","جارٍ قراءة صورة الإيصال... أول تشغيل ممكن يحتاج تحميل نموذج OCR");
   try{
    const data=await new Promise((resolve,reject)=>{
     const fr=new FileReader();fr.onerror=()=>reject(Error("تعذر قراءة الصورة"));
     fr.onload=()=>resolve(fr.result);fr.readAsDataURL(file);
    });
    // For gallery PNG/WEBP, native model input accepts a Blob directly.
    const engine=U().core()?.FLOSY_REPAIR?.extractForUnified;
    if(!engine)throw Error("مكتبة OCR غير جاهزة");
    const text=await engine(file,"");
    if(!text.trim())throw Error("لم يُستخرج نص من الفاتورة");
    box.querySelector("#flosyReceiptPaste").value=text;
    U().nativeReceipt(text);
   }catch(err){U().captureStatus("flosyReceiptStatus","تعذر استخراج الإجمالي: "+err.message,true);}
  };
 }
 function bindVoice(box){
  bindAccountSelect(box,"fxVoiceAccount");
  box.querySelector("#flosyVoiceTypedForm").onsubmit=e=>{
   e.preventDefault();
   try{U().fromVoiceText(new FormData(e.target).get("spoken"));
}catch(err){U().captureStatus("flosyCaptureStatus",err.message,true);U().notify(err.message)}
  };
 }
 function bindAi(box){
  w.FLOSY_UNIFIED_AI?.mount?.(box.querySelector("#flosyUnifiedAI"));
  const s=U().summary();
  const el=box.querySelector("#fxAiInsights");
  if(el)el.innerHTML='<div><small>مصروفات الشهر</small><strong>'+money(s.expense)+'</strong></div>'+
    '<div><small>الدخل</small><strong>'+money(s.income)+'</strong></div>'+
    '<div><small>الآمن للصرف</small><strong>'+(s.safe===null?"غير مكتمل":money(s.safe))+'</strong></div>';
 }
 const overwrites={4:[recordPage,bindRecords],5:[manualPage,bindEntry],6:[capturePage,bindReceipt],
  7:[voicePage,bindVoice],8:[aiPage,bindAi]};
 P.render=function(id){
  const host=d.querySelector('.phone-frame[data-screen="'+id+'"] > .flex-1');
  if(id===8&&host?.querySelector("#flosyAiStream"))return;
  renderOld(id);
  if(!overwrites[id])return;
  const box=d.querySelector('.phone-frame[data-screen="'+id+'"] .flosy-real');
  if(!box)return;
  const [build,bind]=overwrites[id];
  box.innerHTML=build();bind(box);
 };
 w.FLOSY_UX_V391={categories:K,accountOptions,recordPage,manualPage,item,
  version:"3.9.1",activeScreens:Object.keys(overwrites).map(Number)};
})(window,document);
