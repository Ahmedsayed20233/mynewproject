/* Flosy v3.9.3 — coherent UX workspaces over ONE canonical money ledger.
 * The 20-screen designer shell remains, but duplicated sections are replaced
 * by integrated finance workflows backed by profile/transactions/assets/debts.
 */
(function(w,d){"use strict";
 const U=()=>w.FLOSY_UNIFIED,F=()=>w.FLOSY_FINANCE_ENGINE,
   K=()=>w.FLOSY_CATEGORIES, P=w.FLOSY_UNIFIED_PAGES;
 if(!P)return;
 const old=P.render;
 const esc=x=>U()?.esc?.(x)||String(x??""),
 money=x=>U()?.money?.(x)||"0 ج.م",
 root=id=>d.querySelector('.phone-frame[data-screen="'+id+'"] .flosy-real'),
 opt=x=>Array.isArray(x)?x:[], unique=()=>("fin393-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)),
 m=()=>U()?.state?.()||{}, A=()=>U()?.accounts?.()||[],
 selectAccounts=()=>A().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||"حساب")+'</option>').join(""),
 mutate=cb=>U().core().FLOSY_BRIDGE.mutate(cb),
 fmt=x=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:1}).format(+x||0),
 ic=x=>'<i class="fa-solid '+esc(x||"fa-wallet")+'" aria-hidden="true"></i>',
 btn=(id,t,i="fa-chevron-left")=>'<button class="fin393-link" data-flosy-screen="'+id+'" type="button">'+
 '<span>'+ic(i)+'</span><strong>'+esc(t)+'</strong>'+ic("fa-arrow-left")+'</button>',
 title=(name,sub,back=16)=>'<div class="fin393-head"><div><small>FLOSY FINANCIAL INTELLIGENCE</small>'+
 '<h2>'+esc(name)+'</h2><p>'+esc(sub)+'</p></div>'+
 '<button type="button" class="fx-circle" aria-label="الرجوع" data-flosy-screen="'+back+'">'+ic("fa-arrow-right")+'</button></div>',
 panel=(label,body,extra="")=>'<section class="fin393-panel '+extra+'"><h3>'+esc(label)+'</h3>'+body+'</section>',
 metric=(name,val,ico="fa-chart-line")=>'<div class="fin393-metric"><span>'+ic(ico)+esc(name)+'</span>'+
 '<strong>'+money(val)+'</strong></div>',
 empty=t=>'<p class="fin393-empty">'+esc(t)+'</p>',
 field=(label,name,value,type="number",step=".01")=>'<label class="fin393-field">'+esc(label)+
 '<input class="flosy-input" name="'+name+'" type="'+type+'" '+(type==="number"?'min="0" step="'+step+'" ':'')+
 'value="'+esc(value??"")+'"></label>',
 safeHex=v=>/^#[A-Fa-f0-9]{6}$/.test(v)?v:"#0D9488",
 getEngine=()=>F()?.plan(m())||{ready:false},
 getWealth=()=>F()?.wealth(m())||{},
 getP=()=>F()?.profile(m())||{},
 _focus={};

 function profileCard(){
  const p=getP(),settings=m()?.settings?.financeProfileV393||{};
  return panel("ملفك المالي — بيانات واحدة لكل الصفحات",
   '<p class="fin393-note">المرتب والالتزامات والمديونيات هنا هي المدخلات المشتركة لحساب الآمن للصرف، الرؤى، الميزانية وخطة الادخار. مفيش نسب استثمار ثابتة.</p>'+
   '<form id="fin393ProfileForm" class="fin393-form">'+
    '<div class="fin393-grid">'+field("المرتب الشهري المتكرر (ج.م)","monthlySalary",settings.monthlySalary)+
     field("دخل إضافي متكرر (ج.م)","recurringExtraIncome",settings.recurringExtraIncome||0)+
     field("مصاريف معيشة أساسية متغيرة (ج.م)","essentialVariableSpend",settings.essentialVariableSpend||0)+
     field("ميزانية الصرف الاختياري الشهري","monthlyDiscretionarySpend",settings.monthlyDiscretionarySpend||0)+
     field("احتياطي نقدي متاح للطوارئ","emergencyCash",settings.emergencyCash||0)+
     field("أشهر صندوق الطوارئ (3–12)","emergencyMonths",settings.emergencyMonths||3)+
     field("هامش أمان شهري قبل الاستثمار","minimumMonthlyBuffer",settings.minimumMonthlyBuffer||0)+
     field("مدة الاستثمار المستهدفة بالشهور","investmentHorizonMonths",settings.investmentHorizonMonths||12)+
     '<label class="fin393-field">تحمل مخاطر الاستثمار<select class="flosy-input" name="riskTolerance">'+
      [["unset","غير محدد"],["low","منخفض"],["medium","متوسط"],["high","مرتفع"]].map(([key,label])=>
       '<option value="'+key+'"'+(settings.riskTolerance===key?' selected':'')+'>'+label+'</option>').join("")+'</select></label></div>'+
    '<label class="fin393-check"><input type="checkbox" name="highInterestDebt"'+(settings.highInterestDebt?' checked':'')+
     '> عندي دين مرتفع التكلفة أحتاج أسدده قبل الاستثمار</label>'+
    '<button class="flosy-btn" type="submit" style="width:100%">حفظ ملفي وتحديث كل الحسابات فورًا</button>'+
   '</form>')+
   panel("الالتزامات الشهرية — الإيجار والأقساط والجمعية",
    '<div class="fin393-list">'+(p.commitments||[]).map(x=>
     '<div class="fin393-line"><span>'+esc(x.name)+'<small>'+esc(x.kind)+'</small></span><strong>'+
      money(x.amount)+'</strong>'+(x.source==="profile"?'<button type="button" data-fin-remove-commit="'+esc(x.id)+
      '" aria-label="حذف الالتزام">'+ic("fa-trash")+'</button>':'<span class="fin393-tag">مرتبط بالدين</span>')+'</div>').join("")+
     (p.commitments?.length?"":empty("ما أضفتش التزامات شهرية. سجّل الإيجار والفواتير والأقساط حتى تكون الخطة صحيحة."))+'</div>'+
    '<form id="fin393CommitmentForm" class="fin393-form">'+
     field("اسم الالتزام","name","","text")+
     '<label class="fin393-field">نوع الالتزام<select name="category" class="flosy-input">'+
       K().forType("obligation").map(c=>'<option value="'+esc(c.id)+'">'+esc(c.label)+'</option>').join("")+'</select></label>'+
     field("المبلغ الشهري","amount",0)+
     '<div class="fin393-actions"><button class="flosy-btn" type="submit">+ إضافة التزام</button>'+
     '<button type="button" class="flosy-btn flosy-btn-secondary" data-fin-open-category="obligation">+ فئة التزام جديدة</button></div></form>');
 }
 function planPage(){
  const p=getP(),plan=getEngine();
  const home=title("خطة ماليّة على مقاسك","تُحسب من مرتبك ومعيشتك وأقساطك وأهدافك — بدون أرقام تجريبية",16);
  if(!plan.ready)return home+panel("ابدأ من ملفك المالي",'<p class="fin393-note">'+
     esc(plan.note||"أدخل بياناتك الأساسية")+'</p>')+profileCard();
  return home+
   '<div class="fin393-bento">'+metric("الدخل الشهري المتكرر",p.predictableIncome,"fa-money-bill-wave")+
    metric("الالتزامات الشهرية",p.fixedSum,"fa-calendar-check")+
    metric("المعيشة الأساسية المتغيرة",p.essentials,"fa-basket-shopping")+
    metric("الفائض قبل الادخار",p.margin,"fa-piggy-bank")+'</div>'+
   panel("الخطة المقترحة بالحساب",'<div class="fin393-advice">'+
     '<div><span>هدف الطوارئ ('+p.goalMonths+' أشهر)</span><strong>'+money(plan.emergencyTarget)+'</strong></div>'+
     '<div><span>الفجوة عن الهدف</span><strong>'+money(plan.emergencyGap)+'</strong></div>'+
     '<div><span>المبلغ المقترح للطوارئ هذا الشهر</span><strong>'+money(plan.suggestedEmergency)+'</strong></div>'+
     '<div><span>الحد الأقصى المشروط للاستثمار الجديد</span><strong>'+money(plan.suggestedInvestment)+'</strong></div>'+
     '<div><span>هامش الأمان المحتفظ به</span><strong>'+money(plan.buffer)+'</strong></div></div>'+
    (plan.note?'<p class="fin393-warning">'+esc(plan.note)+'</p>':'')+
    '<p class="fin393-note">دي حدود حسابية مبنية على البيانات اللي أدخلتها، وليست أوامر تحويل تلقائي أو ضمانًا للعائد. الأولوية لصندوق طوارئ وسيولة كافية وسداد الدين المرتفع التكلفة.</p>')+
   panel("اقتراح أدوات الاستثمار وفق الأفق والمخاطر",
     '<p class="fin393-note">'+esc(plan.assetSuggestion)+'</p>'+
     '<div class="fin393-list"><a href="https://www.cbe.org.eg/ar/auctions/egp-t-bills" target="_blank" rel="noopener">البنك المركزي المصري — أذون الخزانة وآجالها</a>'+
     '<a href="https://www.cbe.org.eg/ar/contact-us/website-faqs" target="_blank" rel="noopener">كيفية شراء الأذون عبر البنوك المصرية</a>'+
     '<a href="https://www.investor.gov/introduction-investing/getting-started/asset-allocation" target="_blank" rel="noopener">الهيئة الأمريكية SEC — التنويع والأفق الزمني</a>'+
     '<a href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/" target="_blank" rel="noopener">CFPB — بناء صندوق الطوارئ</a></div>'+
     '<p class="fin393-note">لا توجد أسعار أو عوائد حية داخل هذا الحساب؛ راجع الرسوم والضرائب والمخاطر والسيولة من مصدر المنتج قبل الاستثمار.</p>')+
   profileCard();
 }
 function budgetsPage(){
  const p=getP(),plan=getEngine(),data=w.FLOSY_ULTRA_DATA?.summary?.(m())||{transactions:[]};
  const actual=(data.transactions||[]).filter(t=>t.type==="expense");
  const limits=opt(m()?.settings?.categoryBudgets);
  const cats=K().forType("expense");
  const spent=c=>actual.filter(t=>t.category===c.label||t.categoryId===c.id)
   .reduce((v,t)=>v+(+t.amount||0),0);
  return title("ميزانية ذكية موحّدة","ميزانية الفئات وتوصيات الخطة من نفس الدفتر",16)+
   '<div class="fin393-bento">'+metric("المرتب الشهري",p.manualSalary,"fa-money-bill")+
     metric("الالتزامات",p.fixedSum,"fa-clipboard-list")+
     metric("الفائض المتاح بعد الاحتياجات",Math.max(0,p.margin||0),"fa-piggy-bank")+
     metric("مصروفات هذا الشهر",p.actualExpense,"fa-receipt")+'</div>'+
   panel("مراقبة حدود الفئات",'<div class="fin393-list">'+
    cats.filter(c=>spent(c)>0||limits.some(x=>x.name===c.label)).map(c=>{
     const actual=spent(c),limit=+limits.find(x=>x.name===c.label)?.limit||0;
     const ratio=limit?Math.min(100,Math.round(actual/limit*100)):0;
     return '<div class="fin393-budget-line"><div><span style="color:'+safeHex(c.color)+'">'+ic(c.icon)+
     '</span><strong>'+esc(c.label)+'</strong><small>'+money(actual)+' / '+(limit?money(limit):"لا يوجد حد")+'</small></div>'+
     (limit?'<div class="fin393-meter"><span style="width:'+ratio+'%;background:'+safeHex(c.color)+'"></span></div>':"")+
     (limit&&actual>limit?'<small class="fin393-warning">تجاوزت الحد المحدد</small>':"")+'</div>';
    }).join("")+empty("يمكنك ضبط حدود الفئات حتى لو لم يكن هناك إنفاق بعد.")+'</div>')+
   panel("تحديد حد فئة",'<form id="fin393BudgetForm" class="fin393-form">'+
    '<label class="fin393-field">الفئة<select class="flosy-input" name="name">'+
     cats.map(c=>'<option>'+esc(c.label)+'</option>').join("")+'</select></label>'+
    field("الحد الشهري","limit",0)+
    '<button class="flosy-btn" type="submit">تحديث الميزانية وربط الرؤى</button></form>')+
   panel("توصية الميزانية",'<p class="fin393-note">'+(plan.ready?
      "بعد احتياجاتك والتزاماتك، الفائض المشروط "+money(plan.monthlySurplus)+
      "؛ توزيع الفئات وحدوده اختيارك ولا يتم تحويل الأموال آليًا.":
      "أدخل مرتبك ومصاريف المعيشة والالتزامات في ملفك المالي للحصول على ميزانية واقعية.")+'</p>'+
    btn(17,"افتح الخطة المالية","fa-chart-pie"));
 }
 function insightPage(){
  const x=F().insight(m()),p=x.profile,r=x.plan;
  const chartData=x.topCategories.slice(0,8);
  const chart=w.FLOSY_UNIFIED_AI?.chartHtml?.(chartData.length?{
    chart_type:"donut",title:"صرف هذا الشهر حسب الفئات",currency:"EGP",
    data:chartData.map(c=>({name:c.name,value_minor:Math.round(c.amount*100)}))}:null)||"";
  const warnings=x.warnings.map(s=>'<div class="fin393-warning">'+ic("fa-triangle-exclamation")+" "+esc(s)+'</div>').join("");
  return title("مركز الرؤى الذكي","تحليل قابل للتفسير من دفتر واحد بدون معاملات وهمية",16)+
   '<div class="fin393-bento">'+metric("الدخل الفعلي هذا الشهر",p.actualIncome,"fa-money-bill-wave")+
    metric("الإنفاق الفعلي",p.actualExpense,"fa-arrow-trend-down")+
    metric("تغير الإنفاق عن الشهر الماضي",x.changePct===null?0:x.changePct,"fa-chart-column")+
    metric("صافي الثروة المسجلة",x.wealth.netWorth,"fa-scale-balanced")+'</div>'+
   panel("تنبيهات وقواعد استباقية",warnings||empty("مفيش تنبيهات مؤكدّة من بياناتك الحالية — راجع اكتمال التسجيل."))+
   panel("ما الذي يستهلك ميزانيتك؟",chart||empty("سجّل معاملات للحصول على رسم بياني حقيقي."))+
   panel("خطوة تالية محسوبة",'<p class="fin393-note">'+(r.ready?
     "حد ادخار الطوارئ المقترح "+money(r.suggestedEmergency)+"، وحد الاستثمار المشروط "+
     money(r.suggestedInvestment)+". مبني على إدخالاتك وأقساطك الحالية.":
     "أكمل بيانات مرتبك والتزاماتك أولًا؛ لا يمكن اقتراح نسبة ادخار موثوقة دونها.")+'</p>'+
     btn(17,"خطة العميل المتصلة","fa-calculator")+
     btn(11,"ميزانيات الفئات","fa-gauge")+
     btn(8,"اسأل Flosy AI أو Roast Me","fa-robot"));
 }
 function wealthPage(){
  const x=getWealth();
  return title("الثروة الصافية","حسابات + أصول يدوية − ديون، من دفتر فلوسي الحقيقي",16)+
   '<div class="fin393-bento">'+metric("إجمالي الحسابات",x.totalCash||0,"fa-building-columns")+
    metric("الأصول المضافة",x.manualAssets||0,"fa-gem")+
    metric("الديون غير المسددة",x.totalDebt||0,"fa-hand-holding-dollar")+
    metric("صافي ثروتك التقديري",x.netWorth||0,"fa-chart-line")+'</div>'+
   panel("الحسابات البنكية والنقدية",'<div class="fin393-list">'+
    x.cash.map(a=>'<div class="fin393-line"><span>'+esc(a.name)+'</span><b>'+money(a.value)+'</b></div>').join("")+
    empty("كل الحسابات تُعرض برصيدها الناتج عن معاملات الدفتر.")+'</div>'+
    '<button class="flosy-btn flosy-btn-secondary" data-flosy-action="account">+ إضافة حساب</button>')+
   panel("أصول خارج الحسابات — ذهب، دولار، صندوق، عقار",
    '<div class="fin393-list">'+x.assets.map(a=>
     '<div class="fin393-line"><span>'+esc(a.name||"أصل")+
     '<small>'+esc(a.assetKind||"أصل")+' · آخر تقييم يدوي</small></span><strong>'+
      money(a.currentValue)+'</strong><button type="button" data-fin-remove-asset="'+esc(a.id)+'">'+ic("fa-trash")+'</button></div>').join("")+
     empty("أضف أصلًا فقط لو قيمته مش محسوبة أصلًا ضمن رصيد حساب.")+'</div>'+
    '<form class="fin393-form" id="fin393AssetForm">'+
     field("اسم الأصل","name","","text")+
     '<label class="fin393-field">نوع الأصل<select class="flosy-input" name="assetKind">'+
      ["gold","usd","mutual-fund","stocks","treasury","certificate","property","other"].map(k=>
      '<option value="'+k+'">'+({"gold":"ذهب","usd":"دولار","mutual-fund":"صندوق استثمار","stocks":"أسهم",
        "treasury":"أذون خزانة","certificate":"شهادة","property":"عقار","other":"أصل آخر"}[k])+'</option>').join("")+'</select></label>'+
     field("الكمية","qty",1)+field("سعر الوحدة الحالي بالجنيه","unitPriceEgp",0)+
     '<label class="fin393-check"><input type="checkbox" name="zakatEligible"> يدخل في وعاء الزكاة (بحسب حالتك)</label>'+
     '<button class="flosy-btn" type="submit">+ إضافة أصل وربطه بالثروة والزكاة</button></form>')+
   panel("الديون والالتزامات",'<div class="fin393-list">'+x.liabilities.map(a=>
    '<div class="fin393-line"><span>'+esc(a.name||"دين")+'</span><b>'+money(a.remaining)+'</b></div>').join("")+'</div>'+
    btn(10,"إدارة الديون والشلة","fa-users")+
    btn(13,"حاسبة الزكاة المتصلة","fa-coins"))+
   '<p class="fin393-note">'+esc(x.warning||"")+'</p>';
 }
 function zakatPage(){
  const x=F().zakat(m()),cfg=m()?.settings?.financeProfileV393||{};
  const description=x.status==="estimate-due"?"تقدير يستدعي مراجعة فقهية قبل السداد":
   x.status==="below-nisab"?"المبلغ أقل من النصاب وفق السعر الذي أدخلته":
    x.status==="hawl-not-confirmed"?"لا يمكن تأكيد وجوب الزكاة قبل التحقق من مرور حول هجري كامل":
    "أدخل سعر جرام الذهب عيار 21 وتاريخه لحساب النصاب";
  return title("حاسبة الزكاة التلقائية","تُحدَّث مع الحسابات والأصول المختارة، والتأكيد الشرعي بيد المستخدم",16)+
   '<div class="fin393-bento">'+metric("أموال الحسابات",x.liquid,"fa-wallet")+
    metric("أصول أضفت أنها زكوية",x.assets,"fa-coins")+
    metric("الديون القابلة للخصم",x.deductible,"fa-scale-balanced")+
    metric("الوعاء المحسوب",x.base,"fa-calculator")+'</div>'+
   panel("هل بلغت النصاب؟",
    '<p class="fin393-note">'+esc(description)+'</p>'+
    '<div class="fin393-advice"><div><span>النصاب المحسوب (85 جم عيار 21)</span><b>'+
     (x.nisab===null?"أدخل سعر الذهب":money(x.nisab))+'</b></div>'+
    '<div><span>قيمة 2.5٪ عند تحقق الشروط</span><b>'+money(x.provisionalCalculation)+'</b></div>'+
    '<div><span>تقدير الزكاة بعد التأكيد</span><strong>'+money(x.estimatedZakat)+'</strong></div></div>')+
   panel("المعلومات الشرعية والحسابية",
    '<form id="fin393ZakatForm" class="fin393-form">'+
     field("سعر جرام ذهب عيار 21 بالجنيه (مصدر يدوي)","gold21GramPriceEgp",cfg.gold21GramPriceEgp||0)+
     field("تاريخ السعر الذي تحققت منه","goldPriceDate",cfg.goldPriceDate||"","date")+
     field("الديون المستحقة المسموح بخصمها في حالتك","zakatDeductibleDebt",cfg.zakatDeductibleDebt||0)+
     '<label class="fin393-check"><input type="checkbox" name="zakatHawlCompleted"'+
      (cfg.zakatHawlCompleted?' checked':'')+'> أؤكد مرور سنة هجرية كاملة على المال البالغ للنصاب</label>'+
     '<button class="flosy-btn" type="submit">إعادة الحساب من كل أموالي الآن</button></form>'+
     '<p class="fin393-note">لا يُسحب السعر مباشرة من سوق الذهب؛ لا نعتمد على سعر مخمَّن. ليس كل ذهب زينة أو سهم أو عقار زكويًا بذات المعاملة، وطريقة خصم الديون تخضع لحالتك.</p>'+
     '<a href="https://www.dar-alifta.org/ar/Fatwa/Details/18349/" target="_blank" rel="noopener">دار الإفتاء المصرية: النصاب والحول والمقدار (2.5٪)</a>')+
     btn(3,"راجع الأصول المؤهلة للزكاة","fa-gem");
 }
 function debtsPage(){
  const l=opt(m().liabilities),splits=opt(m().settings?.friendSplitsV393);
  const total=l.reduce((a,x)=>a+(+x.balance||0),0);
  return title("الديون وديون الشلة","اعرف عليك كام، ليك كام، والدفعات التي سُدّدت فعلًا",16)+
   '<div class="fin393-bento">'+metric("الديون المتبقية",total,"fa-money-bill-transfer")+
     metric("عدد الالتزامات",l.length,"fa-calendar-check")+'</div>'+
   panel("ديوني وأقساطي",'<div class="fin393-list">'+l.map(x=>
    '<div class="fin393-line"><span>'+esc(x.name||"دين")+
     '<small>قسط شهري: '+money(x.monthlyPayment||0)+'</small></span><b>'+money(x.balance)+'</b>'+
     '<button type="button" data-fin-debt-delete="'+esc(x.id)+'" title="حذف الدين">'+ic("fa-trash")+'</button></div>').join("")+
    empty("ما فيش ديون مسجلة؛ أضف القسط مرة واحدة وسيظهر في خطتك الشهرية.")+'</div>'+
    '<form id="fin393DebtForm" class="fin393-form">'+
      field("اسم الدين / الجهة","name","","text")+
      field("المبلغ المتبقي","balance",0)+
      field("القسط الشهري","monthlyPayment",0)+
      '<label class="fin393-field">نوع الدين<select class="flosy-input" name="category">'+
       K().forType("obligation").map(c=>'<option value="'+esc(c.id)+'">'+esc(c.label)+'</option>').join("")+'</select></label>'+
      '<div class="fin393-actions"><button class="flosy-btn" type="submit">+ إضافة دين وربطه بالخطة</button>'+
       '<button type="button" class="flosy-btn flosy-btn-secondary" data-fin-open-category="obligation">فئة قسط جديدة</button></div></form>')+
   panel("شلة الأصدقاء — حساب كل واحد",'<div class="fin393-list">'+splits.map(x=>
      '<div class="fin393-line"><span>'+esc(x.friend)+
       '<small>'+esc(x.description||"مشاركة في فاتورة")+'</small></span><strong>'+
       money(x.owed)+'</strong><button type="button" data-fin-split-settle="'+esc(x.id)+'">تم التسوية</button></div>').join("")+
      empty("سجل تكلفة فاتورة الشلة ونصيب صديقك؛ هذه مديونية للمتابعة وليست مصروفًا آخر.")+'</div>'+
    '<form id="fin393SplitForm" class="fin393-form">'+
      field("اسم الصديق","friend","","text")+field("اسم المشوار/الفاتورة","description","","text")+
      field("الإجمالي الذي دفعته بالفعل","total",0)+
      field("عدد المشاركين (بمن فيهم أنت)","people",2)+
      '<button class="flosy-btn" type="submit">احسب نصيب كل واحد وسجله كمديونية</button>'+
      '<p class="fin393-note">الدفع النقدي لا يُسجل مرتين؛ بعد تسوية المبلغ سجّل «دخل مسترد» فقط إذا دخل حسابك فعلًا.</p></form>')+
   btn(17,"تأثير الأقساط على خطتك","fa-chart-line");
 }
 function familyPage(){
  const members=opt(m().settings?.familyMembersV393),data=m(),
  familyTx=opt(data.transactions).filter(x=>x.familyMemberId);
  return title("ميزانية العيلة","أعضاء الأسرة والمصروفات المشتركة من نفس دفتر فلوسي",16)+
   panel("أفراد الأسرة",'<div class="fin393-list">'+members.map(x=>
    '<div class="fin393-line"><span>'+esc(x.name)+'<small>'+esc(x.role)+'</small></span><strong>'+
     money(x.monthlyLimit||0)+'</strong><button type="button" data-fin-member-delete="'+esc(x.id)+'">'+ic("fa-trash")+'</button></div>').join("")+
    empty("أضف أفراد الأسرة وحدد ميزانية تقديرية لكل فرد.")+'</div>'+
    '<form id="fin393FamilyForm" class="fin393-form">'+
     field("اسم الشخص","name","","text")+
     '<label class="fin393-field">القرابة<select class="flosy-input" name="role">'+
      ["أب","أم","زوج/زوجة","ابن/ابنة","أخ/أخت","فرد آخر"].map(x=>'<option>'+x+'</option>').join("")+'</select></label>'+
     field("سقف مصروف شهري اختياري","monthlyLimit",0)+
     '<button class="flosy-btn" type="submit">+ إضافة فرد وربطه بالميزانية</button></form>')+
   panel("المصروفات الأسرية المسجلة",'<div class="fin393-list">'+familyTx.slice(-14).reverse().map(t=>
     '<div class="fin393-line"><span>'+esc(t.description||t.category)+
     '<small>'+esc(members.find(x=>x.id===t.familyMemberId)?.name||"فرد من الأسرة")+'</small></span><b>'+
     money(t.amount)+'</b></div>').join("")+
    empty("ما اتسجلتش مصروفات مرتبطة بأفراد الأسرة لسه.")+'</div>'+
    '<form id="fin393FamilyExpenseForm" class="fin393-form">'+
     '<label class="fin393-field">الفرد<select name="memberId" class="flosy-input">'+
       members.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join("")+'</select></label>'+
     field("الوصف","description","","text")+field("مبلغ المصروف","amount",0)+
     '<label class="fin393-field">الحساب الذي خرجت منه الفلوس<select class="flosy-input" name="accountId">'+
       selectAccounts()+'</select></label>'+
     '<button class="flosy-btn" type="submit">تسجيل مصروف حقيقي للفرد</button></form>')+
   panel("المديونيات والالتزامات الأسرية",btn(10,"ديون الشلة والأقساط","fa-people-group")+
    btn(17,"الراتب وخطة البيت","fa-house"));
 }
 function customCategoryDialog(){
  const typeOptions=[["expense","مصروف"],["income","دخل"],["obligation","التزام أو قسط"]];
  const icons=["fa-wallet","fa-utensils","fa-car-side","fa-gas-pump","fa-house",
    "fa-baby","fa-heart-pulse","fa-dumbbell","fa-gift","fa-plane",
    "fa-coins","fa-chart-line","fa-graduation-cap","fa-credit-card","fa-people-roof","fa-briefcase"];
  return '<dialog id="fin393CategoryDialog" class="fx-dialog"><form id="fin393CategoryForm" class="fin393-form">'+
   '<div class="fin393-head"><h3>فئة جديدة بأيقونتك ولونك</h3><button id="fin393CatClose" type="button" class="fx-circle">'+ic("fa-xmark")+'</button></div>'+
    field("اسم الفئة","label","","text")+
    '<label class="fin393-field">نوع الفئة<select name="type" class="flosy-input">'+
      typeOptions.map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join("")+'</select></label>'+
    '<label class="fin393-field">المجموعة<input name="group" class="flosy-input" value="فئاتي الخاصة" maxlength="36"></label>'+
    '<label class="fin393-field">اللون<input name="color" type="color" value="#0D9488" class="flosy-input"></label>'+
    '<div class="fin393-icons">'+icons.map((icon,i)=>
     '<label><input type="radio" name="icon" value="'+icon+'"'+(i===0?' checked':'')+'>'+
      ic(icon)+'</label>').join("")+'</div>'+
    '<button class="flosy-btn" type="submit">حفظ الفئة واستخدامها في كل الصفحات</button></form></dialog>';
 }
 function mount(id,render,bind){
  const host=root(id);
  if(!host)return;
  host.innerHTML=render();
  if(bind)bind(host);
 }
 function wireForm(host,form,save){
  const el=host.querySelector("#"+form);if(!el)return;
  el.onsubmit=e=>{e.preventDefault();try{save(new FormData(el));U().renderAll()}catch(err){U().notify(err.message)}};
 }
 function refresh(){U().renderAll()}
 const positive=(x,label)=>{const n=Number(x);if(!Number.isFinite(n)||n<0||n>=1e12)throw Error(label+" رقم غير صالح");return n};
 const label=x=>{const t=String(x||"").trim();if(t.length<2||t.length>90)throw Error("الاسم لازم يكون من حرفين إلى 90");return t};
 function bindFinance(id,host){
  if(id===17){
   wireForm(host,"fin393ProfileForm",f=>{
    const numbers=["monthlySalary","recurringExtraIncome","essentialVariableSpend","monthlyDiscretionarySpend","emergencyCash",
      "emergencyMonths","minimumMonthlyBuffer","investmentHorizonMonths"];
    const entries={};for(const k of numbers)entries[k]=positive(f.get(k),k);
    if(entries.emergencyMonths<3||entries.emergencyMonths>12)throw Error("صندوق الطوارئ من 3 إلى 12 شهر");
    entries.riskTolerance=String(f.get("riskTolerance")||"unset");
    entries.highInterestDebt=f.has("highInterestDebt");
    mutate(s=>{
      s.settings=s.settings||{};
      s.settings.financeProfileV393={...(s.settings.financeProfileV393||{}),...entries};
    });
    U().notify("اتحدّثت خطتك والميزانية والرؤى والزكاة من نفس البيانات");
   });
   wireForm(host,"fin393CommitmentForm",f=>{
    const n=label(f.get("name")),amount=positive(f.get("amount"),"المبلغ");
    if(amount<=0)throw Error("المبلغ لازم أكبر من صفر");
    const category=K().forType("obligation").find(x=>x.id===f.get("category"));
    mutate(s=>{
     s.settings=s.settings||{};
     const p=s.settings.financeProfileV393=s.settings.financeProfileV393||{};
     p.monthlyCommitments=opt(p.monthlyCommitments);
     p.monthlyCommitments.push({id:unique(),name:n,amount,kind:category?.id||"bill",
       categoryColor:category?.color||"#0D9488",icon:category?.icon||"fa-receipt"});
    });
   });
  }
  if(id===11)wireForm(host,"fin393BudgetForm",f=>{
   const name=String(f.get("name")),limit=positive(f.get("limit"),"الحد");
   mutate(s=>{
    s.settings=s.settings||{};
    const a=opt(s.settings.categoryBudgets);
    s.settings.categoryBudgets=[...a.filter(x=>x.name!==name),{name,limit}];
   });
  });
  if(id===13)wireForm(host,"fin393ZakatForm",f=>{
   const price=positive(f.get("gold21GramPriceEgp"),"سعر الذهب");
   if(!price)throw Error("أدخل سعر الذهب الفعلي من مصدر موثوق");
   const goldPriceDate=String(f.get("goldPriceDate")||"");
   if(!/^\d{4}-\d{2}-\d{2}$/.test(goldPriceDate))throw Error("حدد تاريخ سعر الذهب");
   const debt=positive(f.get("zakatDeductibleDebt"),"الديون");
   mutate(s=>{
    s.settings=s.settings||{};
    s.settings.financeProfileV393={...(s.settings.financeProfileV393||{}),
      gold21GramPriceEgp:price,goldPriceDate,zakatDeductibleDebt:debt,
      zakatHawlCompleted:f.has("zakatHawlCompleted")};
   });
  });
  if(id===3)wireForm(host,"fin393AssetForm",f=>{
   const name=label(f.get("name")),qty=positive(f.get("qty"),"الكمية"),
     price=positive(f.get("unitPriceEgp"),"سعر الوحدة");
   if(!qty||!price)throw Error("سجّل كمية وسعر وحدة حقيقي");
   mutate(s=>{s.assets=s.assets||[];s.assets.push({
    id:unique(),name,assetKind:String(f.get("assetKind")),qty,unitPriceEgp:price,
    value:qty*price,zakatEligible:f.has("zakatEligible"),
    valuationDate:U().date()});});
  });
  if(id===10){
   wireForm(host,"fin393DebtForm",f=>{
    const name=label(f.get("name")),balance=positive(f.get("balance"),"باقي الدين"),
      monthlyPayment=positive(f.get("monthlyPayment"),"القسط");
    if(!balance)throw Error("الدين يجب أن يكون أكبر من صفر");
    mutate(s=>{
     s.liabilities=s.liabilities||[];
     s.liabilities.push({id:unique(),name,balance,monthlyPayment,
       kind:String(f.get("category")),createdAt:new Date().toISOString()});
    });
   });
   wireForm(host,"fin393SplitForm",f=>{
    const friend=label(f.get("friend")),description=label(f.get("description")),
      total=positive(f.get("total"),"الإجمالي"),people=positive(f.get("people"),"عدد الأشخاص");
    if(!total||people<2||people>100||!Number.isInteger(people))throw Error("اكتب إجمالي الفاتورة وعدد الأشخاص (2–100)");
    mutate(s=>{
     s.settings=s.settings||{};s.settings.friendSplitsV393=opt(s.settings.friendSplitsV393);
     s.settings.friendSplitsV393.push({id:unique(),friend,description,
       total,people,owed:Math.round(total/people*100)/100,
       createdAt:new Date().toISOString()});
    });
   });
  }
  if(id===19){
   wireForm(host,"fin393FamilyForm",f=>{
    const name=label(f.get("name")),role=String(f.get("role")),
     monthlyLimit=positive(f.get("monthlyLimit"),"الحد");
    mutate(s=>{
     s.settings=s.settings||{};s.settings.familyMembersV393=opt(s.settings.familyMembersV393);
     s.settings.familyMembersV393.push({id:unique(),name,role,monthlyLimit});
    });
   });
   wireForm(host,"fin393FamilyExpenseForm",f=>{
    const memberId=String(f.get("memberId")),accountId=String(f.get("accountId")),
     amount=positive(f.get("amount"),"المصروف"),description=label(f.get("description"));
    if(!opt(m().settings?.familyMembersV393).some(x=>x.id===memberId)||
      !A().some(x=>x.id===accountId)||!amount)throw Error("اختار فرد وحساب ومبلغ صحيح");
    U().postBatch([{type:"expense",accountId,date:U().date(),amount,
     description,category:"أسرة وأطفال",familyMemberId:memberId}],"flosy393_family");
   });
  }
  host.addEventListener("click",e=>{
   const button=e.target.closest("[data-fin-remove-commit],[data-fin-remove-asset],[data-fin-debt-delete],"+
    "[data-fin-split-settle],[data-fin-member-delete],[data-fin-open-category]");
   if(!button)return;
   const dataset=button.dataset;
   if(dataset.finOpenCategory){
    openCategory(dataset.finOpenCategory);return;
   }
   if(dataset.finRemoveCommit)mutate(s=>{
    const p=s.settings.financeProfileV393||{};
    p.monthlyCommitments=opt(p.monthlyCommitments).filter(x=>x.id!==dataset.finRemoveCommit);
   });
   if(dataset.finRemoveAsset)mutate(s=>{
    s.assets=opt(s.assets).filter(x=>x.id!==dataset.finRemoveAsset);
    s.deletedIds=opt(s.deletedIds);s.deletedIds.push("assets/"+dataset.finRemoveAsset);
   });
   if(dataset.finDebtDelete)mutate(s=>{
    s.liabilities=opt(s.liabilities).filter(x=>x.id!==dataset.finDebtDelete);
    s.deletedIds=opt(s.deletedIds);s.deletedIds.push("liabilities/"+dataset.finDebtDelete);
   });
   if(dataset.finSplitSettle)mutate(s=>{
    s.settings.friendSplitsV393=opt(s.settings.friendSplitsV393)
     .filter(x=>x.id!==dataset.finSplitSettle);
   });
   if(dataset.finMemberDelete)mutate(s=>{
    s.settings.familyMembersV393=opt(s.settings.familyMembersV393)
     .filter(x=>x.id!==dataset.finMemberDelete);
   });
   refresh();
  });
 }
 let dialogOpen=false;
 function openCategory(type){
  let dia=d.getElementById("fin393CategoryDialog");
  if(!dia){d.body.insertAdjacentHTML("beforeend",customCategoryDialog());
   dia=d.getElementById("fin393CategoryDialog");
   dia.querySelector("#fin393CatClose").onclick=()=>dia.close();
   dia.querySelector("#fin393CategoryForm").onsubmit=e=>{
    e.preventDefault();
    const fields=new FormData(e.target),
      type=String(fields.get("type")),name=label(fields.get("label")),
      group=label(fields.get("group")),icon=String(fields.get("icon")),
      color=safeHex(String(fields.get("color"))),
      existing=K().forType(type);
    if(!["expense","income","obligation"].includes(type))throw Error("نوع الفئة غير صالح");
    if(existing.some(x=>K().normalize(x.label)===K().normalize(name))){
     U().notify("اسم الفئة موجود بالفعل");return;
    }
    mutate(s=>{
     s.settings=s.settings||{};const list=s.settings.customCategoriesV393=opt(s.settings.customCategoriesV393);
     list.push({id:unique(),type,label:name,group,icon,color,keywords:[]});
    });
    dia.close();U().notify("اتحفظت الفئة في كل الصفحات");
    refresh();
   };
  }
  dia.querySelector('[name="type"]').value=type||"expense";
  dia.showModal();
 }
 function details(){
  return '<dialog id="fin393Detail" class="fx-dialog"><div class="fin393-detail-head">'+
   '<h3>تفاصيل المعاملة</h3><button type="button" id="fin393DetailClose" class="fx-circle" aria-label="إغلاق">'+ic("fa-xmark")+'</button></div>'+
   '<div id="fin393DetailBody"></div>'+
   '<div class="fin393-actions"><button type="button" id="fin393DetailEdit" class="flosy-btn">تعديل</button>'+
    '<button type="button" id="fin393DetailDelete" class="flosy-btn flosy-btn-secondary">حذف</button></div></dialog>';
 }
 function bindDetail(host){
  let dia=host.querySelector("#fin393Detail");
  if(!dia){host.insertAdjacentHTML("beforeend",details());dia=host.querySelector("#fin393Detail");}
  const close=dia.querySelector("#fin393DetailClose");close.onclick=()=>dia.close();
  const list=host.querySelector("#flosyLiveTransactionList");
  if(!list)return;
  list.addEventListener("click",e=>{
   if(e.target.closest("[data-fx-edit],[data-fx-delete]"))return;
   const row=e.target.closest("[data-transaction]");
   if(!row)return;
   const t=opt(m().transactions).find(x=>x.id===row.dataset.transaction);
   if(!t)return;
   dia.querySelector("#fin393DetailBody").innerHTML=
    '<div class="fin393-detail-amount">'+money(t.amount)+'</div>'+
    [["الوصف",t.description],["النوع",t.type],["الفئة",t.category],
     ["التاريخ",t.date],["الوقت",t.time],["ملاحظة",t.note],
     ["الحساب",A().find(a=>a.id===t.accountId)?.name],
     ["مصدر التسجيل",t.source],["المعرّف",t.id]].filter(x=>x[1]).map(x=>
    '<div class="fin393-line"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>').join("")+
    (t.receiptDetails?.items?'<h4>بنود الإيصال</h4>'+
     opt(t.receiptDetails.items).map(x=>'<p>'+esc(x.name)+' — '+money(x.price||x.unitPrice||0)+'</p>').join(""):"");
   dia.querySelector("#fin393DetailEdit").onclick=()=>{
    dia.close();row.querySelector("[data-fx-edit]")?.click();
   };
   dia.querySelector("#fin393DetailDelete").onclick=()=>{
    dia.close();row.querySelector("[data-fx-delete]")?.click();
   };
   dia.showModal();
  });
 }
 const pages={3:[wealthPage,bindFinance],10:[debtsPage,bindFinance],11:[budgetsPage,bindFinance],
  13:[zakatPage,bindFinance],14:[insightPage,bindFinance],17:[planPage,bindFinance],19:[familyPage,bindFinance]};
 P.render=function(id){
  old(id);
  if(pages[id])mount(id,pages[id][0],el=>pages[id][1](id,el));
  if(id===4)bindDetail(root(4));
  if(id===5){
   const host=root(5);
   if(host&&!host.querySelector("#fin393NewCategory")){
    const head=host.querySelector(".fx-form-section-head");
    if(head)head.insertAdjacentHTML("afterend",
     '<button type="button" id="fin393NewCategory" class="flosy-btn flosy-btn-secondary">+ إضافة فئة بأيقونة ولون</button>');
    host.querySelector("#fin393NewCategory")?.addEventListener("click",()=>openCategory(
     host.querySelector('[name="type"]')?.value||"expense"));
   }
  }
  // Services v3.9.2 now routes directly to the canonical feature screens.
  // No separate "wealth 2" or "plan 2" shortcuts are injected.
 };
 w.FLOSY_FINANCE_UI={profileCard,planPage,budgetsPage,insightPage,wealthPage,zakatPage,debtsPage,
  familyPage,openCategory,version:"3.9.3"};
})(window,document);
