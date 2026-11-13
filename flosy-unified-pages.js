/* Flosy v3.9 — connected 20-screen renderers.
 * All displayed financial values come from canonical state, never from static mockup.
 */
(function(w,d){"use strict";
 const api=()=>w.FLOSY_UNIFIED;
 const by=id=>d.getElementById(id),esc=x=>api()?.esc?.(x)||String(x||"");
 const f=n=>d.querySelector('.phone-frame[data-screen="'+n+'"]');
 const money=x=>api()?.money?.(x)||"0 ج.م";
 const tx=()=>w.FLOSY_ULTRA_DATA?.cleanTx?.(api()?.state?.())||[];
 const full=()=>api()?.state?.()||{transactions:[],accounts:[],settings:{}};
 const go=(id)=>api()?.go(id),feature=(key,label)=>{
  return '<button type="button" class="flosy-feature" data-flosy-feature="'+esc(key)+'" data-label="'+esc(label)+
   '"><span class="flosy-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></span><span><strong>'+
   esc(label)+'</strong><small>مرتبط بدفتر فلوسي وإعداداتك المسجلة</small></span>‹</button>';
 };
 const nav=(id,label,icon="fa-chevron-left",desc="")=>'<button class="flosy-feature" type="button" data-flosy-screen="'+id+'">'+
  '<span class="flosy-icon"><i class="fa-solid '+icon+'"></i></span><span><strong>'+esc(label)+
  '</strong><small>'+esc(desc)+'</small></span><i class="fa-solid fa-chevron-left"></i></button>';
 const h=(name,tagline="",back=16)=>'<div class="flosy-screen-top"><div><h2>'+esc(name)+
  '</h2><p>'+esc(tagline)+'</p></div><button class="flosy-back" data-flosy-screen="'+back+'" type="button">← الخدمات</button></div>';
 const panel=(title,body)=>'<section class="flosy-panel"><h3>'+esc(title)+'</h3>'+body+'</section>';
 const empty=txt=>'<div class="flosy-muted-card"><p class="flosy-muted">'+esc(txt)+'</p></div>';
 const num=(x,color="")=>'<strong class="flosy-fin-num"'+(color?' style="color:'+color+'"':'')+'>'+money(x)+'</strong>';
 const metric=(title,number)=>'<div class="flosy-metric">'+num(number)+'<small>'+esc(title)+'</small></div>';
 const percent=(a,b)=>b>0?Math.min(100,Math.round(a/b*100)):0;
 const ico=x=>'<i class="fa-solid '+esc(x)+'" aria-hidden="true"></i>';
 function row(t){
  const cat=w.FLOSY_ULTRA_DATA?.category?.(t)||t.category||"أخرى";
  const icon=api()?.inferIcon?.(String(t.description||"")+" "+String(t.category||""),t.type)||"fa-wallet";
  const name=esc(t.description||cat);
  const account=api()?.accounts()?.find(a=>a.id===t.accountId)?.name||"حساب";
  return '<div class="flosy-item"><span class="flosy-icon">'+ico(icon)+'</span>'+
   '<div class="flosy-item-info"><strong>'+name+'</strong><small>'+esc(cat)+' • '+esc(t.date||"")+
   ' • '+esc(account)+'</small></div><span class="flosy-item-amount" style="color:'+
   (t.type==="expense"?"var(--expense)":t.type==="income"?"var(--income)":"var(--secondary)")+'">'+
   (t.type==="expense"?"−":t.type==="income"?"+":"↔")+money(t.amount)+'</span></div>';
 }
 const accountOptions=(selected="")=>(api()?.accounts()||[]).map(a=>
  '<option value="'+esc(a.id)+'"'+(a.id===selected?' selected':'')+'>'+esc(a.name||"حساب")+'</option>').join("");
 const safeSum=()=>api()?.summary?.()||{income:0,expense:0,total:0,accounts:[],transactions:[],categories:[],safe:null,hasAccounts:false};
 const actions={
  "dashboard":{screen:2,title:"الرئيسية"},
  "reports":{screen:15,title:"تقاريري"},
  "assistant":{screen:8,title:"Flosy AI"},
  "transactions":{screen:4,title:"المعاملات"},
  "accounts":{screen:3,title:"الحسابات"},
  "budgets":{screen:11,title:"الميزانية"}
 };
 function first(){
  return '<div style="padding:25px 12px;display:grid;gap:17px;min-height:90dvh;align-content:center;text-align:center">'+
   '<div class="flosy-ai-avatar" style="margin:auto;width:85px;height:85px"><img src="flosy-ultra-icon.svg" style="width:76px;height:76px" alt="Flosy"></div>'+
   '<h1 style="font-size:25px;font-weight:900;color:var(--text-primary)">فلوسي | Flosy</h1>'+
   '<p class="flosy-muted" style="font-size:12px">كل أموالك ومصروفاتك وأهدافك ومساعدك الذكي في تطبيق واحد وبأربع ثيمات متكاملة.</p>'+
   panel("ابدأ بحساباتك الحقيقية",'<p class="flosy-muted">تسجيل الصوت والفواتير والتقارير كلها مرتبطة بنفس دفتر الحسابات؛ لا توجد أرقام تجريبية في الواجهة الحية.</p>')+
   '<button type="button" class="flosy-btn" id="flosyStartButton">ابدأ الآن</button>'+
   '<p class="flosy-muted">نسخة MVP تجريبية. مزايا SMS وواتساب المصرفية غير موصولة تلقائيًا.</p></div>';
 }
 function home(){
  const s=safeSum(),rows=tx().filter(t=>t.date.slice(0,7)===api().date().slice(0,7)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);
  const hero='<section class="hero-card" style="border-radius:22px;padding:18px;margin-bottom:11px">'+
   '<div style="display:flex;justify-content:space-between;align-items:center"><small>إجمالي أرصدتك</small>'+
   '<button class="flosy-btn flosy-btn-secondary" style="min-height:26px;padding:4px 8px" data-flosy-screen="3">حساباتي</button></div>'+
   '<div class="balance-num" style="font-size:25px;font-weight:900;margin:8px 0">'+money(s.total)+'</div>'+
   '<div style="border-top:1px solid #ffffff30;padding-top:10px;margin-top:10px"><small>المتاح الآمن للصرف</small>'+
   '<div class="balance-num" style="font-size:21px;font-weight:900">'+(s.safe===null?"لم يكتمل":money(s.safe))+'</div>'+
   '<small>الحد اليومي '+(s.daily===null?"—":money(s.daily))+'</small></div></section>';
  return '<div class="flosy-screen-top"><div><h2>فلوسك أوضح كل يوم ✦</h2><p>بياناتك الفعلية، بدون أرصدة نموذجية</p></div>'+
   '<button type="button" class="flosy-back" data-flosy-screen="16">☰ الخدمات</button></div>'+hero+
   '<div class="flosy-grid-2" style="margin-bottom:11px">'+metric("الدخل هذا الشهر",s.income)+metric("مصروفات الشهر",s.expense)+'</div>'+
   '<div class="flosy-grid-3" style="margin-bottom:12px">'+
    '<button class="flosy-btn" data-flosy-screen="5">+ معاملة</button>'+
    '<button class="flosy-btn flosy-btn-secondary" data-flosy-action="listen">🎙️ صوت</button>'+
    '<button class="flosy-btn flosy-btn-secondary" data-flosy-action="receipt">📸 فاتورة</button></div>'+
   panel("أحدث معاملاتك",'<div class="flosy-list">'+(rows.map(row).join("")||empty("لسه مفيش معاملات في الشهر الحالي."))+
    '</div><div class="flosy-buttonbar"><button class="flosy-btn flosy-btn-secondary" data-flosy-screen="4">كل المعاملات</button></div>')+
   panel("اكتشف فلوسي",'<div class="flosy-list">'+nav(8,"Flosy AI","fa-robot","محادثة صوتية وتحليلات ورسومات")+
    nav(15,"تقاريري","fa-chart-column","فترات متعددة وتصدير PDF وExcel")+
    nav(18,"تقويم السيولة","fa-calendar-days","الأقساط والجمعيات القادمة")+'</div>');
 }
 function wallets(){
  const s=safeSum(),a=s.accounts||[],liabilities=full().liabilities||[],assets=full().assets||[];
  return h("كل أموالي", "بنوك ومحافظ نقدية وديون وأصول",2)+
   panel("الأرصدة المسجلة",'<div style="font-size:23px;font-weight:900;color:var(--primary)">'+money(s.total)+'</div>'+
    '<p class="flosy-muted">إجمالي أرصدة الحسابات الحالية؛ الأصول والديون الإضافية في أدوات الثروة.</p>')+
   panel("حساباتي",'<div class="flosy-list">'+(a.map(x=>
    '<div class="flosy-item"><span class="flosy-icon">'+ico("fa-building-columns")+'</span><div class="flosy-item-info"><strong>'+
     esc(x.name||"حساب")+'</strong><small>الرصيد الفعلي من دفتر فلوسي</small></div>'+
     '<span class="flosy-item-amount">'+money(s.accounts.find(r=>r.id===x.id)?.balance||0)+'</span></div>').join("")||
     empty("أضف حسابًا لتفعيل تسجيل الفواتير والصوت المباشر"))+'</div>'+
    '<div class="flosy-buttonbar"><button class="flosy-btn" data-flosy-action="account">+ إضافة حساب</button></div>')+
   panel("أصول وديون إضافية",'<div class="flosy-grid-2">'+
     metric("عدد الأصول",assets.length)+metric("عدد الالتزامات",liabilities.length)+'</div>'+
     '<div class="flosy-buttonbar">'+feature("wealth","متتبع الأصول")+'</div>')+
   panel("محفظة الاستثمار",nav(17,"درع التضخم ومقارنة العوائد","fa-shield-halved")+
    feature("portfolio","محفظة ثاندر")+
    feature("v4-wealth","الذهب والجمعيات والثروة المصرية"));
 }
 function records(){
  const list=tx().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,150);
  return h("المعاملات المرتبطة", "كل تسجيل يغيّر الحساب والتقارير فورًا",2)+
   '<label class="flosy-field">ابحث عن معاملة<input class="flosy-input" id="flosyTxSearch" placeholder="مثال: عربية أو مواصلات أو إيجار"></label>'+
   '<label class="flosy-field">النوع<select class="flosy-input" id="flosyTxType"><option value="all">الكل</option>'+
     '<option value="expense">مصروف</option><option value="income">دخل</option><option value="transfer">تحويل</option></select></label>'+
   '<div class="flosy-list" id="flosyLiveTransactionList">'+(list.map(row).join("")||empty("لا توجد عمليات مسجلة"))+'</div>'+
   '<div class="flosy-buttonbar"><button class="flosy-btn" data-flosy-screen="5">تسجيل معاملة جديدة</button>'+
    '<button class="flosy-btn flosy-btn-secondary" data-flosy-feature="transactions" data-label="تفاصيل المعاملات">السجل المتقدم والتعديل</button></div>';
 }
 function manual(){
  const selected=api()?.defaultAccount()||"";
  const form='<form id="flosyNewTxForm"><label class="flosy-field">نوع الحركة<select class="flosy-input" name="type">'+
   '<option value="expense">مصروف</option><option value="income">دخل</option><option value="transfer">تحويل داخلي</option></select></label>'+
   '<label class="flosy-field">المبلغ بالجنيه<input class="flosy-input" name="amount" type="number" required min=".01" step=".01" inputmode="decimal"></label>'+
   '<label class="flosy-field">الفئة<select class="flosy-input" name="category">'+
   ["طعام ومشروبات","مواصلات","مشتريات","فواتير","صحة","تعليم","ترفيه","إيجار","مدفوعات","دخل آخر","مرتب","تحويل"].map(x=>
    '<option>'+esc(x)+'</option>').join("")+'</select></label>'+
   '<label class="flosy-field">الوصف — يستخدم لاختيار أيقونة العملية<input class="flosy-input" name="description" required maxlength="90" placeholder="مثال: اشتريت عربية"></label>'+
   '<label class="flosy-field">من حساب<select class="flosy-input" name="accountId" required>'+accountOptions(selected)+'</select></label>'+
   '<label class="flosy-field" id="flosyTargetWrap" hidden>إلى حساب<select class="flosy-input" name="targetAccountId">'+accountOptions()+'</select></label>'+
   '<label class="flosy-field">التاريخ<input class="flosy-input" name="date" type="date" required value="'+api().date()+'"></label>'+
   '<button class="flosy-btn" type="submit" style="width:100%">حفظ العملية وتحديث جميع الأرصدة</button></form>';
  return h("تسجيل عملية واحدة", "كل عملية مرتبطة بحساب وفئة وأيقونة",2)+
   (!api()?.accounts().length?empty("أضف حسابًا قبل التسجيل المباشر"):"")+
   panel("بيانات المعاملة",form)+
   '<div class="flosy-grid-2">'+nav(7,"بالصوت","fa-microphone-lines")+nav(6,"فاتورة","fa-camera")+'</div>';
 }
 function capture(){
  return h("تصوير الفواتير", "قراءة وحفظ مباشر بعد استخراج إجمالي واضح",2)+
   panel("الكاميرا الذكية",'<div style="text-align:center;padding:12px">'+
    '<div class="flosy-ai-avatar" style="margin:0 auto 12px;width:72px;height:72px">'+ico("fa-camera")+'</div>'+
    '<p class="flosy-muted">صوّر فاتورتك باستخدام كاميرا Android؛ يُستخرج الإجمالي والأصناف والتاريخ، وتُحفظ العملية مباشرة عندما تكون البيانات قابلة للاعتماد.</p>'+
    '<button type="button" class="flosy-btn" data-flosy-action="receipt">📷 تصوير فاتورة حقيقية</button></div>')+
   panel("إدخال نص فاتورة أو اختبار نتيجة OCR",'<label class="flosy-field">نص الإيصال<textarea rows="6" id="flosyReceiptPaste" class="flosy-input" placeholder="الصق النص المستخرج من فاتورة حقيقية..."></textarea></label>'+
     '<button class="flosy-btn" id="flosyReceiptSave" type="button">تحليل وتسجيل الفاتورة تلقائيًا</button>'+
     '<p class="flosy-muted">الإجمالي الغامض أو المتناقض لا يُحجز في حسابك. يتم منع الإيصالات المكررة.</p>')+
   panel("إدارة الإدخال الذكي",feature("v4-capture","أدوات الصوت والإيصالات المتقدمة"));
 }
 function voice(){
  return h("تسجيل الصوت المصري", "عملية واحدة أو عدة عمليات في جملة",2)+
   panel("اتكلم بطبيعتك",'<div style="text-align:center;padding:12px">'+
    '<div class="flosy-ai-avatar" style="margin:0 auto 10px;width:70px;height:70px">'+ico("fa-microphone-lines")+'</div>'+
    '<button class="flosy-btn" type="button" data-flosy-action="listen">🎙️ ابدأ التسجيل الآن</button>'+
    '<p id="flosyCaptureStatus" class="flosy-capture-status">مثال: «اشتريت عربية بـ 200000 جنيه» أو «دفعت 40 جنيه قهوة وبعدين 60 مواصلات»</p>'+
    '</div>')+
   panel("اكتب جملة عامية للاختبار",'<form id="flosyVoiceTypedForm"><label class="flosy-field">جملة مالية حقيقية'+
    '<input class="flosy-input" name="spoken" required placeholder="دفعت 75 جنيه قهوة من الكاش"></label>'+
    '<button class="flosy-btn" type="submit">فهم وتسجيل العمليات مباشرة</button></form>')+
   panel("أيقونة تلقائية",'<p class="flosy-muted">«اشتريت عربية» → سيارة، «دفعت بنزين» → محطة، «اشتريت أكل» → مطعم. يتم اختيار الأيقونة من معنى وصف العملية وليس من الفئة العامة فقط.</p>');
 }
 function assistant(){
  return h("فلوسي AI", "المساعد الواحد لكل حساباتك وكل ثيماتك",2)+
   '<section class="flosy-panel"><div id="flosyUnifiedAI"></div></section>'+
   panel("محاكي قرار الشراء",'<form id="flosyAffordForm" class="flosy-grid-2">'+
     '<label class="flosy-field">سعر الحاجة<input class="flosy-input" type="number" name="price" min="1" required></label>'+
     '<label class="flosy-field">على كام شهر؟<input class="flosy-input" type="number" name="months" min="1" max="120" value="1"></label>'+
     '<button class="flosy-btn" type="submit">تقييم تأثير الشراء</button></form>'+
     '<div id="flosyAffordResult" class="flosy-muted" style="margin-top:7px"></div>');
 }
 function obligations(){
  let due=[];try{due=api()?.core()?.FLOSY_REMINDERS?.upcoming?.()||[]}catch{}
  return h("الالتزامات والجمعيات", "المستحق غير المدفوع لا يُحسب مصروفًا",2)+
   panel("المواعيد القادمة",'<div class="flosy-list">'+(due.slice(0,15).map(x=>
    '<div class="flosy-item"><span class="flosy-icon">'+ico("fa-calendar-check")+'</span><div class="flosy-item-info"><strong>'+
    esc(x.title||x.name||"استحقاق")+'</strong><small>'+esc(x.date||"")+
    '</small></div><span class="flosy-item-amount">'+money(x.amount||0)+'</span></div>').join("")||
    empty("لا توجد فواتير أو أقساط قريبة مسجلة"))+'</div>')+
   panel("ربط الفواتير بالتقويم",feature("recurring","الفواتير المتكررة")+
    feature("phase1","الآمن للصرف بعد الالتزامات"));
 }
 function debts(){
  const liabilities=Array.isArray(full().liabilities)?full().liabilities:[];
  return h("الديون وتقسيم الفاتورة", "المستحقات غير المسددة منفصلة عن النقد المتاح",16)+
   panel("الديون المسجلة",'<div class="flosy-list">'+(liabilities.map(x=>
    '<div class="flosy-item"><span class="flosy-icon">'+ico("fa-hand-holding-dollar")+'</span><div class="flosy-item-info"><strong>'+
    esc(x.name||x.label||"دين")+'</strong></div><strong>'+money(x.amount||x.balance)+'</strong></div>').join("")||
    empty("لا توجد ديون إضافية مسجلة"))+'</div>')+
   panel("قسّم فاتورة الشلة",'<form id="flosySplitForm"><label class="flosy-field">إجمالي الفاتورة'+
    '<input type="number" class="flosy-input" name="amount" min="1" step=".01" required></label>'+
    '<label class="flosy-field">عدد الأشخاص<input class="flosy-input" type="number" name="people" min="1" max="100" value="2" required></label>'+
    '<button class="flosy-btn" type="submit">احسب نصيب كل شخص</button>'+
    '<div id="flosySplitResult" style="margin-top:9px;font-size:18px;font-weight:900"></div></form>'+
    '<p class="flosy-muted">الحساب لا يخصم من أرصدتك قبل تسجيل دفع حقيقي.</p>')+
   feature("wealth","إدارة الديون والأصول");
 }
 function budgets(){
  const s=safeSum(),settings=full().settings||{},card=w.FLOSY_ULTRA_DATA?.budgetCards?.(s,full())||[];
  return h("ميزانيتي الذكية", "الخطة المالية تختلف عن المدفوعات الحقيقية",2)+
   panel("توزيع الدخل",'<div class="flosy-grid-2">'+metric("الدخل المسجل",s.income)+metric("المصروف المسجل",s.expense)+'</div>'+
    '<p class="flosy-muted">50/30/20 مثال لتقسيم الميزانية، مش فرضًا تلقائيًا على دخلك.</p>')+
   panel("حدود الفئات",'<div class="flosy-list">'+card.map(c=>
    '<div class="flosy-panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
     '<strong style="font-size:11px">'+esc(c.name)+'</strong><small>'+money(c.spent)+' / '+
     (c.configured?money(c.budget):"لم تحدد")+'</small></div>'+
     '<div class="flosy-progress"><span style="--progress:'+Math.min(100,c.ratio||0)+'%"></span></div></div>').join("")+'</div>')+
   panel("أضف حدًا شهريًا للفئة",'<form id="flosyBudgetForm">'+
     '<label class="flosy-field">الفئة<select name="name" class="flosy-input">'+card.map(c=>'<option>'+esc(c.name)+'</option>').join("")+'</select></label>'+
     '<label class="flosy-field">الحد الشهري<input class="flosy-input" type="number" min="1" name="limit" step=".01" required></label>'+
     '<button class="flosy-btn" type="submit">حفظ الميزانية</button></form>')+
   feature("budget","الميزانية المتقدمة");
 }
 function goals(){
  const gs=Array.isArray(full().goals)?full().goals:[];
  const accounts=api()?.accounts()||[];
  return h("أهدافي والحصالة", "أي إيداع حقيقي يظهر عبر رصيد حساب الهدف",2)+
   panel("الأهداف",'<div class="flosy-list">'+(gs.map(g=>{
    const account=api()?.summary().accounts?.find(a=>a.id===g.accountId);
    const amount=account?.balance||0,goal=Number(g.target)||0;
    return '<div class="flosy-panel"><strong>'+esc(g.name||"هدف")+'</strong>'+
     '<p class="flosy-muted">'+money(amount)+' من '+money(goal)+'</p>'+
     '<div class="flosy-progress"><span style="--progress:'+percent(amount,goal)+'%"></span></div></div>';
   }).join("")||empty("لسه ما اخترتش هدف. اعمل حساب ادخار وحدد هدف ليه."))+'</div>')+
   panel("هدف جديد مرتبط بحساب",'<form id="flosyGoalForm">'+
    '<label class="flosy-field">اسم الهدف<input class="flosy-input" name="name" placeholder="مثال: صندوق الطوارئ" required></label>'+
    '<label class="flosy-field">القيمة المستهدفة<input class="flosy-input" type="number" min="1" step=".01" name="target" required></label>'+
    '<label class="flosy-field">حساب الادخار<select class="flosy-input" name="accountId" required>'+accountOptions()+'</select></label>'+
    '<button class="flosy-btn" type="submit">حفظ الهدف</button></form>')+
   feature("goals","لوحة أهداف الادخار المتقدمة");
 }
 function zakat(){
  return h("حاسبة الزكاة", "تقدير حسابي لا يغني عن شروط النصاب والحول",16)+
   panel("قيمة المال الخاضع للزكاة",'<form id="flosyZakatForm">'+
    '<label class="flosy-field">قيمة المال بالجنيه<input class="flosy-input" type="number" min="0" step=".01" name="base" required></label>'+
    '<button class="flosy-btn" type="submit">حساب 2.5%</button>'+
    '<div id="flosyZakatResult" class="flosy-fin-num" style="margin-top:12px"></div></form>')+
   panel("الأصول المسجلة",'<p class="flosy-muted">راجع أصولك والديون المؤثرة وتوقيت الحول والسعر المرجعي للذهب عند حساب النصاب. المعادلة الافتراضية 2.5% لا تعني تلقائيًا أن الزكاة واجبة على جميع أرصدتك.</p>'+
     feature("v4-wealth","الثروة والأصول"));
 }
 function analyses(){
  const s=safeSum(),query=api()?.core()?.FLOSY_LOCAL_ANALYTICS;
  const result=query?.query?.("ارسم توزيع مصروفاتي حسب الفئات",full(),new Date());
  return h("التحليلات والتوقعات", "من بياناتك المسجلة، بدون أرقام افتراضية",2)+
   panel("مؤشرات الفترة",'<div class="flosy-grid-2">'+metric("الدخل",s.income)+metric("الصرف",s.expense)+
    metric("التدفق الصافي",s.net)+metric("عدد المعاملات",s.transactions?.length||0)+'</div>')+
   panel("توزيع الإنفاق",'<div id="flosyAnalyticsChart">'+
    (w.FLOSY_UNIFIED_AI?.chartHtml?.(result?.chart)||empty("لا توجد معاملات صالحة لعرض الرسم البياني"))+'</div>')+
   panel("اسأل فلوسي عن الاتجاهات",nav(8,"افهم ليه المصروفات زادت","fa-robot")+
    feature("reports","التقرير المالي المتقدم"));
 }
 function reports(){
  const s=safeSum(),period=w.FLOSY_ULTRA_DATA?.periodRange?.("month")||{start:api().date(),end:api().date()};
  return h("التقارير المالية", "PDF وExcel وفترات زمنية مرنة",2)+
   panel("ملخص هذا الشهر",'<div class="flosy-grid-2">'+metric("الدخل",s.income)+metric("المصروف",s.expense)+
    metric("الفرق",s.net)+metric("أرصدة الحسابات",s.total)+'</div>')+
   panel("التقرير حسب المدة",'<label class="flosy-field">من<input type="date" class="flosy-input" id="flosyReportFrom" value="'+period.start+'"></label>'+
    '<label class="flosy-field">إلى<input type="date" class="flosy-input" id="flosyReportTo" value="'+api().date()+'"></label>'+
    '<div class="flosy-buttonbar">'+
     '<button class="flosy-btn" data-flosy-action="report" data-kind="pdf">PDF / طباعة</button>'+
     '<button class="flosy-btn flosy-btn-secondary" data-flosy-action="report" data-kind="excel">Excel (.xlsx)</button></div>')+
   panel("تحليلات وتفاصيل إضافية",feature("reports","التقرير التفصيلي ورسومات الستة أشهر"));
 }
 const services=[
  {title:"الأساسيات",data:[["2","الرئيسية","fa-house"],["3","حساباتي","fa-wallet"],["4","المعاملات","fa-right-left"],
   ["8","فلوسي AI","fa-robot"],["14","التحليلات","fa-chart-pie"],["15","التقارير","fa-file-lines"]]},
  {title:"الإدخال والتخطيط",data:[["5","إضافة معاملة","fa-plus"],["6","الإيصالات","fa-camera"],["7","المصروف بالصوت","fa-microphone"],
   ["9","الالتزامات والجمعيات","fa-calendar-check"],["11","الميزانيات","fa-gauge"],["12","الأهداف","fa-bullseye"],
   ["18","تقويم السيولة","fa-calendar-days"]]},
  {title:"الثروة والأسرة",data:[["10","الديون والشلة","fa-people-group"],["13","الزكاة","fa-coins"],
   ["17","درع التضخم","fa-shield"],["19","ميزانية العيلة","fa-people-roof"],["20","رادار أسعار الفواتير","fa-tags"]]}
 ];
 const extra=[
  ["portfolio","محفظة ثاندر"],["plan","الخطة المالية 24 شهرًا"],["risk","الحماية من الأزمات"],
  ["phase1","Safe to Spend والتوقعات"],["recurring","الفواتير والأقساط المتكررة"],
  ["v4-bank","استيراد CSV من البنك"],["v4-wealth","متتبع الذهب والثروة"],
  ["v4-crisis","محاكاة الأزمات"],["v4-family","ميزانية العيلة المتقدمة"],
  ["v4-privacy","الخصوصية والأجهزة"],["smart","مركز الرؤى"],
  ["rules","قواعد التصنيف"],["recovery","حماية بياناتي والنسخ الاحتياطية"],
  ["settings","الإعدادات والمزامنة"],["budget","المخطط المالي الأصلي"],["wealth","تفاصيل الأصول والديون"]
 ];
 function hub(){
  const themeList=Object.entries(api().THEMES).map(([key,t])=>
   '<button data-theme-select="'+key+'" aria-pressed="'+(d.documentElement.dataset.theme===key)+'" type="button">'+
    '<span class="flosy-theme-swatch" style="--swatch:'+t.swatch+'">'+ico("fa-palette")+'</span><span>'+esc(t.label)+'</span></button>').join("");
  return h("الخدمات والإعدادات", "كل فلوسي في تجربة واحدة، من غير Ultra أو Pro منفصل",2)+
   panel("المظهر الموحد",'<p class="flosy-muted">الأربعة ثيمات بتشتغل على كل الشاشات والمساعد والتقارير والإعدادات والأدوات المتقدمة.</p>'+
    '<div class="flosy-theme-grid">'+themeList+'</div>')+
   panel("حساب التسجيل الصوتي والفواتير",'<label class="flosy-field">الحساب الافتراضي للمعاملات السريعة'+
    '<select class="flosy-input" id="flosyDefaultAccount"><option value="">اختر حسابًا</option>'+
    accountOptions(api().defaultAccount())+'</select></label>'+
    '<p class="flosy-muted">لو عندك أكثر من حساب اختار الحساب الصحيح علشان التسجيل الصوتي والفواتير يروحوا لمكانهم.</p>')+
   panel("الوصول السريع",services.map(g=>
    '<h4 class="flosy-section-title">'+esc(g.title)+'</h4><div class="flosy-list">'+g.data.map(x=>nav(+x[0],x[1],x[2])).join("")+'</div>').join(""))+
   panel("جميع المزايا المتقدمة",'<div class="flosy-list">'+extra.map(x=>feature(x[0],x[1])).join("")+'</div>')+
   panel("إعدادات تكميلية",'<div class="flosy-list">'+feature("settings","الإعدادات والمزامنة")+
    feature("v4-privacy","الأمان والأجهزة")+
    feature("recovery","نسخ احتياطي واسترجاع البيانات")+'</div>');
 }
 function yieldCompare(){
  return h("درع التضخم", "سيناريوهات يحدد المستخدم افتراضاتها بنفسه",16)+
   panel("قارن افتراضات العوائد",'<form id="flosyYieldForm">'+
    '<label class="flosy-field">المبلغ المراد المقارنة عليه<input class="flosy-input" name="capital" type="number" min="1" required></label>'+
    '<label class="flosy-field">عائد سنوي افتراضي للشهادة (%)<input class="flosy-input" name="cert" type="number" min="0" max="100" step=".1" value="15"></label>'+
    '<label class="flosy-field">عائد افتراضي للذهب (%)<input class="flosy-input" name="gold" type="number" min="-90" max="200" step=".1" value="0"></label>'+
    '<label class="flosy-field">عائد افتراضي لأذون الخزانة (%)<input class="flosy-input" name="tbill" type="number" min="0" max="100" step=".1" value="14"></label>'+
    '<button class="flosy-btn" type="submit">مقارنة السيناريوهات</button>'+
    '<div id="flosyYieldResult" style="margin-top:12px"></div></form>'+
    '<p class="flosy-muted">الأرقام مبدئية يكتبها المستخدم، وليست أسعارًا أو عوائد رسمية مباشرة.</p>');
 }
 function calendar(){
  let due=[];try{due=api()?.core()?.FLOSY_REMINDERS?.upcoming?.()||[]}catch{}
  return h("تقويم السيولة والأقساط", "الاستحقاقات القادمة من الخطة المالية",2)+
   panel("رادار الاستحقاقات",'<div class="flosy-list">'+(due.slice(0,25).map(x=>
    '<div class="flosy-item"><span class="flosy-icon">'+ico("fa-calendar-day")+'</span>'+
    '<div class="flosy-item-info"><strong>'+esc(x.title||x.name||"التزام")+'</strong><small>'+
    esc(x.date||"")+'</small></div><strong>'+money(x.amount||0)+'</strong></div>').join("")||
    empty("لا يوجد استحقاق مسجل للفترة القريبة"))+'</div>')+
   panel("إدارة التدفق النقدي",feature("phase1","Safe to Spend والتوقعات")+
    feature("recurring","الفواتير والأقساط")+
    feature("plan","الخطة المالية 24 شهرًا"));
 }
 function family(){
  return h("العيلة والتخطيط المشترك", "مساحة التخطيط والمصاريف الأسرية",16)+
   panel("الميزانية الأسرية",'<p class="flosy-muted">احتياجات البيت والخطط المشتركة مرتبطة بنفس المصروفات المسجلة. ما بننشئش محفظة مشتركة أو رصيد زواج افتراضي.</p>'+
    feature("v4-family","الميزانية الأسرية الكاملة")+
    nav(12,"أهداف الزواج والادخار","fa-heart"))+
   panel("الأقساط والتخطيط",feature("recurring","الالتزامات")+
    nav(18,"تقويم السيولة","fa-calendar-days"));
 }
 function prices(){
  const recent=tx().filter(t=>t.source?.includes("receipt")&&Array.isArray(t.receiptDetails?.items));
  const list=new Map();
  for(const t of recent){for(const item of t.receiptDetails.items||[]){
   const name=String(item.name||"").trim().slice(0,55),price=+item.unitPrice||+item.price||0;
   if(name&&price>0){const a=list.get(name)||[];a.push({date:t.date,price});list.set(name,a)}
  }}
  const items=[...list].slice(0,15);
  return h("رادار أسعار فواتيرك", "متابعة أسعار مشترياتك المسجلة بالفعل",16)+
   panel("تغيّر السعر في إيصالاتك",'<div class="flosy-list">'+(items.map(([name,arr])=>
    '<div class="flosy-item"><span class="flosy-icon">'+ico("fa-tags")+'</span><div class="flosy-item-info"><strong>'+
    esc(name)+'</strong><small>'+arr.length+' أسعار مسجلة</small></div>'+
    '<strong>'+money(arr[arr.length-1].price)+'</strong></div>').join("")||
    empty("سجّل فواتير حقيقية تحتوي على أصناف وأسعار علشان يشتغل الرادار."))+'</div>')+
   panel("قارن من بياناتك",'<p class="flosy-muted">الرادار هنا يقارن الأسعار في فواتيرك أنت؛ لا يدّعي وجود عروض حية من السوبر ماركت أو ربط WhatsApp غير منفَّذ.</p>')+
   panel("سجّل فاتورة",nav(6,"صوّر إيصال","fa-camera")+
    feature("v4-bank","استيراد كشف البنك CSV"));
 }
 const VIEWS={1:first,2:home,3:wallets,4:records,5:manual,6:capture,7:voice,8:assistant,
  9:obligations,10:debts,11:budgets,12:goals,13:zakat,14:analyses,15:reports,16:hub,
  17:yieldCompare,18:calendar,19:family,20:prices};
 function renderPage(id){
  const host=f(id)?.querySelector(":scope > .flex-1");
  const fn=VIEWS[id];if(!host||!fn)return;
  // Preserve a running AI conversation when switching other data widgets.
  if(id===8&&host.querySelector("#flosyUnifiedAI"))return;
  const old=host.querySelector(".flosy-real");
  if(old)old.remove();
  host.classList.add("flosy-section","flosy-mounted");
  host.classList.remove("flex","flex-col","justify-between","text-center","overflow-hidden");
  const box=d.createElement("div");box.className="flosy-real";
  box.innerHTML=fn();host.insertBefore(box,host.firstChild);
  wire(id,box);
 }
 function wire(id,box){
  const a=api();if(!a)return;
  if(id===1)box.querySelector("#flosyStartButton").onclick=()=>{
    try{localStorage.setItem("flosy_onboarding_39","yes")}catch{}a.go(2);
  };
  if(id===4){
   const source=tx().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,150);
   const input=box.querySelector("#flosyTxSearch"),typ=box.querySelector("#flosyTxType");
   const refresh=()=>{const q=input.value.toLocaleLowerCase("ar-EG");
    const x=source.filter(t=>(typ.value==="all"||t.type===typ.value)&&
      ((t.description||"")+" "+(t.category||"")+" "+(t.date||"")).toLocaleLowerCase("ar-EG").includes(q));
    box.querySelector("#flosyLiveTransactionList").innerHTML=x.map(row).join("")||empty("لا توجد معاملات مطابقة");
   };
   input.oninput=refresh;typ.onchange=refresh;
  }
  if(id===5){
   const form=box.querySelector("#flosyNewTxForm");
   form.elements.type.onchange=()=>box.querySelector("#flosyTargetWrap").hidden=form.elements.type.value!=="transfer";
   form.onsubmit=e=>{
    e.preventDefault();const m=new FormData(form),type=String(m.get("type"));
    try{a.postBatch([{type,amount:Number(m.get("amount")),category:String(m.get("category")),
     description:String(m.get("description")),date:String(m.get("date")),accountId:String(m.get("accountId")),
     targetAccountId:type==="transfer"?String(m.get("targetAccountId")):null}],"flosy39_manual");
     a.go(4)}
    catch(err){a.notify(err.message)}
   };
  }
  if(id===6){
   box.querySelector("#flosyReceiptSave").onclick=()=>{
    try{a.fromReceiptText(box.querySelector("#flosyReceiptPaste").value);a.go(4)}
    catch(err){a.notify(err.message)}
   };
  }
  if(id===7){
   box.querySelector("#flosyVoiceTypedForm").onsubmit=e=>{
    e.preventDefault();try{a.fromVoiceText(new FormData(e.target).get("spoken"));a.go(4)}
    catch(err){a.notify(err.message)}
   };
  }
  if(id===8){
   w.FLOSY_UNIFIED_AI?.mount?.(box.querySelector("#flosyUnifiedAI"));
   box.querySelector("#flosyAffordForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target),price=+f.get("price"),months=+f.get("months"),s=a.summary();
    const output=box.querySelector("#flosyAffordResult");
    output.textContent=s.safe===null?"سجّل الالتزامات أولًا لحساب المتاح الآمن.":
     "المتاح الآمن "+money(s.safe)+". سعر الشراء "+money(price)+
     ". التقسيط النظري على "+months+" شهر "+money(price/months)+
     " شهريًا قبل أي فائدة أو رسوم. القرار يعتمد على الالتزامات الأخرى.";
   };
  }
  if(id===10){
   box.querySelector("#flosySplitForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target),total=+f.get("amount"),people=+f.get("people");
    box.querySelector("#flosySplitResult").textContent=money(total/people)+" لكل شخص، قبل أي بقشيش";
   };
  }
  if(id===11){
   box.querySelector("#flosyBudgetForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target),name=String(f.get("name")),limit=+f.get("limit");
    if(!(limit>0))return a.notify("الحد يجب أن يكون موجبًا");
    a.core().FLOSY_BRIDGE.mutate(s=>{
     s.settings=s.settings||{};const olds=Array.isArray(s.settings.categoryBudgets)?s.settings.categoryBudgets:[];
     s.settings.categoryBudgets=[...olds.filter(x=>x.name!==name),{name,limit}];
    });a.renderAll();a.notify("تم تعديل خطة الميزانية فقط");
   };
  }
  if(id===12){
   box.querySelector("#flosyGoalForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    const name=String(f.get("name")||"").trim(),accountId=String(f.get("accountId")||""),target=+f.get("target");
    if(!a.accounts().some(x=>x.id===accountId)||!name||!(target>0))return a.notify("راجع اسم الهدف والحساب");
    a.core().FLOSY_BRIDGE.mutate(s=>{
     s.goals=Array.isArray(s.goals)?s.goals:[];
     s.goals.push({id:"goal-"+Date.now().toString(36),name,accountId,target});
    });a.renderAll();a.notify("اتحفظ الهدف، ورصيده مرتبط بحساب الادخار");
   };
  }
  if(id===13){
   box.querySelector("#flosyZakatForm").onsubmit=e=>{
    e.preventDefault();const value=+new FormData(e.target).get("base");
    box.querySelector("#flosyZakatResult").textContent=money(value*.025)+" — تقدير مبدئي 2.5%";
   };
  }
  if(id===16){
   const select=box.querySelector("#flosyDefaultAccount");
   if(select)select.onchange=()=>{a.setDefaultAccount(select.value);a.notify("اتحفظ الحساب الافتراضي")};
  }
  if(id===17){
   box.querySelector("#flosyYieldForm").onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target),capital=+f.get("capital");
    const lines=[["الشهادة",+f.get("cert")],["الذهب",+f.get("gold")],["أذون الخزانة",+f.get("tbill")]]
    .map(([label,r])=>'<div class="flosy-item"><strong>'+esc(label)+'</strong><strong>'+money(capital*r/100)+
    '</strong><small>تغير سنوي افتراضي '+r+'%</small></div>').join("");
    box.querySelector("#flosyYieldResult").innerHTML=lines;
   };
  }
 }
 w.FLOSY_UNIFIED_PAGES={render:renderPage,VIEWS:Object.keys(VIEWS).map(Number)};
})(window,document);
