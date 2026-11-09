/* Flosy Wealth & Thndr Tracker v1.2 — manual accounting, no trading API. */
(function () {
  "use strict";
  var C=window.FLOSY_BRIDGE;
  if(!C)return;
  var defs=[
    {id:"wallet",name:"النقدية / المحفظة",type:"cash",opening:0,updatedAt:0},
    {id:"bank",name:"الحساب البنكي",type:"bank",opening:0,updatedAt:0},
    {id:"emergency",name:"صندوق الطوارئ",type:"emergency",opening:0,updatedAt:0},
    {id:"reserve",name:"احتياطي المصروفات",type:"reserve",opening:0,updatedAt:0},
    {id:"thndr",name:"نقدي ثاندر",type:"thndr",opening:0,updatedAt:0}
  ];
  var presets=[
    {code:"CI30",name:"صندوق مؤشر أسهم واسعة — CI30",target:50,unit:"وحدة"},
    {code:"T70",name:"صندوق أسهم EGX70 — T70",target:10,unit:"وحدة"},
    {code:"SAVINGS",name:"أداة ادخار / صندوق نقدي على ثاندر",target:25,unit:"وحدة"},
    {code:"GOLD",name:"ذهب ثاندر",target:15,unit:"جرام"}
  ];
  var ids={};
  function el(id){return document.getElementById(id)}
  function st(){return C.getState()}
  function money(n){return new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(Number(n)||0)+" ج.م"}
  function num(n){return Number(n)||0}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function rid(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():"id"+Date.now().toString(36)+Math.random().toString(36).slice(2)}
  function iso(){var d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
  function ymdate(x){var a=x.split("-").map(Number);return new Date(a[0],a[1]-1,1)}
  function ym(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0")].join("-")}
  function name(code){var p=presets.find(function(x){return x.code===code});return p?p.name:code}
  function unit(code){var p=presets.find(function(x){return x.code===code});return p?p.unit:"وحدة"}
  function cashAccounts(){return st().accounts||[]}
  function acc(id){return cashAccounts().find(function(a){return a.id===id})}
  function init(){
    var state=st();var changed=false;
    if(!Array.isArray(state.accounts)||!state.accounts.length){state.accounts=defs.map(function(x){return Object.assign({},x)});changed=true}
    ["trades","assets","liabilities"].forEach(function(k){if(!Array.isArray(state[k])){state[k]=[];changed=true}});
    if(!state.prices||typeof state.prices!=="object"){state.prices={};changed=true}
    if(!state.plan||typeof state.plan!=="object"){
      state.plan={startMonth:ym(new Date()),emergencyTarget:60000,reserveTarget:12000,year1InvestTarget:24000,
        p1Emergency:7000,p2Emergency:5750,p2Investment:1250,p3Investment:7000,reserveMonthly:1000,
        weights:{CI30:50,T70:10,SAVINGS:25,GOLD:15}};
      changed=true;
    }
    if(changed)C.persistInitial();
  }
  function rowsForAccounts(){
    var cash={};
    cashAccounts().forEach(function(a){cash[a.id]=num(a.opening)});
    (st().transactions||[]).forEach(function(t){
      var v=num(t.amount);if(v<=0)return;
      if(t.type==="income"&&t.accountId&&cash[t.accountId]!==undefined)cash[t.accountId]+=v;
      if(t.type==="expense"&&t.accountId&&cash[t.accountId]!==undefined)cash[t.accountId]-=v;
      if(t.type==="transfer"&&t.accountId&&t.targetAccountId&&cash[t.accountId]!==undefined&&cash[t.targetAccountId]!==undefined){
        cash[t.accountId]-=v;cash[t.targetAccountId]+=v;
      }
    });
    (st().trades||[]).forEach(function(t){
      if(cash.thndr===undefined)return;
      if(t.kind==="buy")cash.thndr-=num(t.qty)*num(t.price)+num(t.fee);
      if(t.kind==="sell")cash.thndr+=num(t.qty)*num(t.price)-num(t.fee);
    });
    return cash;
  }
  function portfolio(){
    var grouped={};var realized=0;var fees=0;var totalBuy=0;var totalSell=0;
    (st().trades||[]).slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.createdAt||"").localeCompare(String(b.createdAt||""))}).forEach(function(t){
      var code=t.asset,qty=num(t.qty),price=num(t.price),fee=num(t.fee),p=grouped[code]||(grouped[code]={code:code,qty:0,book:0,realized:0,fees:0,last:0,lastDate:""});
      p.fees+=fee;fees+=fee;p.last=price;p.lastDate=t.date;
      if(t.kind==="buy"||t.kind==="opening"){p.qty+=qty;p.book+=qty*price+(t.kind==="buy"?fee:0);if(t.kind==="buy")totalBuy+=qty*price+fee}
      if(t.kind==="sell"){
        if(p.qty+1e-8<qty)return;var avg=p.qty?p.book/p.qty:0;
        p.book-=avg*qty;p.qty-=qty;if(Math.abs(p.qty)<1e-8){p.qty=0;p.book=0}
        p.realized+=qty*price-fee-avg*qty;realized+=qty*price-fee-avg*qty;totalSell+=qty*price-fee;
      }
    });
    var holdings=Object.values(grouped).filter(function(p){return p.qty>1e-8}).map(function(p){
      var pr=st().prices&&st().prices[p.code];
      var marketPrice=pr&&num(pr.value)>0?num(pr.value):p.last;
      var valued=!!(pr&&num(pr.value)>0);
      return Object.assign(p,{currentPrice:marketPrice,value:p.qty*marketPrice,profit:p.qty*marketPrice-p.book,priceDate:valued?pr.updatedAt:p.lastDate,pricedManually:valued,unit:unit(p.code)});
    }).sort(function(a,b){return b.value-a.value});
    var market=holdings.reduce(function(a,p){return a+p.value},0);
    var cost=holdings.reduce(function(a,p){return a+p.book},0);
    return {holdings:holdings,market:market,cost:cost,unrealized:market-cost,realized:realized,fees:fees,buy:totalBuy,sell:totalSell};
  }
  function metrics(){
    var balances=rowsForAccounts(),cash=Object.values(balances).reduce(function(a,v){return a+v},0);
    var p=portfolio(),other=(st().assets||[]).reduce(function(a,x){return a+num(x.value)},0);
    var debt=(st().liabilities||[]).reduce(function(a,x){return a+num(x.balance)},0);
    var oldUnassigned=(st().transactions||[]).filter(function(t){return !t.accountId}).length;
    return {balances:balances,cash:cash,portfolio:p,other:other,debt:debt,net:cash+p.market+other-debt,unassigned:oldUnassigned};
  }
  function box(label,val,sub,tone){
    return '<div class="pro-stat '+(tone||"")+'"><span>'+esc(label)+'</span><strong>'+money(val)+'</strong><small>'+esc(sub||"")+'</small></div>';
  }
  function line(rows,cols){
    return '<div class="pro-scroll"><table class="pro-table"><thead><tr>'+cols.map(function(x){return '<th>'+esc(x)+'</th>'}).join("")+'</tr></thead><tbody>'+
    (rows.length?rows.map(function(a){return '<tr>'+a.map(function(v){return '<td>'+v+'</td>'}).join("")+'</tr>'}).join(""):'<tr><td colspan="'+cols.length+'" class="muted">لا توجد بيانات حتى الآن.</td></tr>')+
    '</tbody></table></div>';
  }
  function formAccounts(){
    var list=cashAccounts().map(function(a){return '<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>'}).join("");
    return list;
  }
  function optionsPositions(){
    return presets.map(function(x){return '<option value="'+x.code+'">'+esc(x.name)+'</option>'}).join("")+'<option value="CUSTOM">أصل آخر — أدخل الرمز</option>';
  }
  function selectAccount(id,exclude){
    var target=el(id);if(!target)return;
    var selected=target.value;
    target.innerHTML=cashAccounts().filter(function(a){return !exclude||a.id!==exclude}).map(function(a){return '<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>'}).join("");
    if(selected&&cashAccounts().some(function(a){return a.id===selected}))target.value=selected;
  }
  function updateTxnAccounts(){
    var typ=el("formType")&&el("formType").value;
    var from=el("formAccount"),to=el("formTargetAccount"),wrap=el("txnTargetWrap");
    if(!from||!to)return;
    var previous=from.value;
    from.innerHTML=formAccounts();
    if(previous&&acc(previous))from.value=previous;
    if(!previous&&acc("bank"))from.value="bank";
    wrap.hidden=typ!=="transfer";
    selectAccount("formTargetAccount",from.value);
    if(typ==="transfer"){
      var cat=el("formCategory").value;
      var id=cat==="الاستثمار"?"thndr":cat==="الطوارئ"?"emergency":cat==="الاحتياطي"?"reserve":null;
      if(id&&acc(id)&&id!==from.value)to.value=id;
    }
  }
  function clearForm(type){
    var form=el(type);if(form){form.reset();form.dataset.edit="";} 
  }
  function renderAccounts(){
    var target=el("proAccounts");if(!target)return;var m=metrics();
    var html='<div class="pro-hero"><div><small>صافي الثروة التقديري</small><div class="pro-major">'+money(m.net)+'</div><span>الأرصدة النقدية + القيمة السوقية المدخلة + أصول أخرى − الالتزامات</span></div><span class="pro-hero-icon">◈</span></div>';
    html+='<div class="pro-stat-grid">'+box("النقدية والحسابات",m.cash,"يشمل النقدي داخل ثاندر")+
      box("الأصول الاستثمارية",m.portfolio.market,"القيمة من الأسعار التي تدخلها")+
      box("أصول أخرى",m.other,"مثل سيارة أو عقار")+
      box("الديون والالتزامات",m.debt,"تُطرح من صافي الثروة","pro-warn")+'</div>';
    html+='<div class="pro-card"><div class="pro-head"><div><h3>حساباتك وأرصدة الأموال</h3><p>أدخل الرصيد الافتتاحي مرة واحدة، وسجّل بعده العمليات عبر حساب محدد.</p></div><button class="btn primary" data-pro="add-account">＋ حساب</button></div>';
    html+=line(cashAccounts().map(function(a){
      var amount=m.balances[a.id]||0;return ['<span class="pro-icon">▣</span> '+esc(a.name),esc(({cash:"نقدية",bank:"حساب بنكي",emergency:"طوارئ",reserve:"احتياطي",thndr:"ثاندر",other:"حساب آخر"})[a.type]||a.type),'<strong class="'+(amount<0?"pro-negative":"")+'">'+money(amount)+'</strong>',
      '<button class="smallbtn" data-pro="edit-account" data-id="'+esc(a.id)+'">تعديل</button>'];
    }),["الحساب","النوع","الرصيد المحسوب",""]);
    html+='<div class="pro-note">العمليات القديمة المسجلة قبل إضافة الحسابات لا تُوزع تلقائيًا لمنع احتسابها مرتين. أدخل الأرصدة الحالية بدقة وراجع تطابقها مع البنك وثاندر.</div></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>تحويل بين حساباتك</h3></div><form id="proAccountTransfer" class="pro-grid-fields">'+
      '<label>من حساب<select name="from" required>'+formAccounts()+'</select></label>'+
      '<label>إلى حساب<select name="to" required>'+formAccounts()+'</select></label>'+
      '<label>المبلغ (ج.م)<input name="amount" type="number" min="0.01" step="0.01" required></label>'+
      '<label>الغرض<select name="category"><option value="تحويل داخلي">تحويل داخلي</option><option value="الطوارئ">صندوق الطوارئ</option><option value="الاحتياطي">الاحتياطي</option><option value="الاستثمار">تمويل ثاندر</option></select></label>'+
      '<label class="pro-wide">وصف التحويل<input name="description" maxlength="100" value="تحويل بين حساباتي" required></label>'+
      '<button class="btn primary pro-wide" type="submit">حفظ التحويل — ليس مصروفًا</button></form></div>';
    html+='<div class="pro-two"><div class="pro-card"><div class="pro-head"><h3>أصول أخرى</h3><button class="btn" data-pro="add-asset">إضافة أصل</button></div>'+
      line((st().assets||[]).map(function(x){return [esc(x.name),money(x.value),'<button class="smallbtn" data-pro="edit-asset" data-id="'+esc(x.id)+'">تعديل</button> <button class="smallbtn" data-pro="delete-asset" data-id="'+esc(x.id)+'">حذف</button>']}),["الأصل","القيمة التقديرية",""])+
      '<p class="muted">لا تُضف هنا أصلًا مسجلًا بالفعل ضمن المحفظة الاستثمارية.</p></div>'+
      '<div class="pro-card"><div class="pro-head"><h3>الديون والالتزامات</h3><button class="btn" data-pro="add-debt">إضافة دين</button></div>'+
      line((st().liabilities||[]).map(function(x){return [esc(x.name),money(x.balance),'<button class="smallbtn" data-pro="edit-debt" data-id="'+esc(x.id)+'">تعديل</button> <button class="smallbtn" data-pro="delete-debt" data-id="'+esc(x.id)+'">حذف</button>']}),["الالتزام","المتبقي",""])+
      '<p class="muted">حدّث الرصيد يدويًا بعد أي سداد، ولا تخصمه مرتين من الحسابات.</p></div></div>';
    if(m.unassigned)html+='<div class="pro-alert">⚠ توجد '+m.unassigned+' معاملات قديمة بلا حساب مرتبط. لم تُحتسب في أرصدة الحسابات الجديدة. لا تعِد تسجيلها دون مراجعة الرصيد.</div>';
    target.innerHTML=html;
  }
  function renderPortfolio(){
    var root=el("proPortfolio");if(!root)return;var m=metrics(),p=m.portfolio,thndrCash=m.balances.thndr||0;
    var total=p.market+thndrCash;
    var plan=st().plan||{},weights=plan.weights||{};
    var html='<div class="pro-stat-grid">'+box("القيمة السوقية للمراكز",p.market,"تقييم يدوي غير مباشر")+
      box("نقدي ثاندر",thndrCash,"بعد الإيداع والشراء والبيع")+
      box("الربح/الخسارة غير المحققة",p.unrealized,"القيمة السوقية ناقص التكلفة")+
      box("أرباح محققة",p.realized,"بعد بيع الوحدات ورسومها")+'</div>';
    html+='<div class="pro-notice"><strong>Thndr Tracker</strong> لا يتصل بحساب ثاندر ولا يسحب أسعارًا لحظية. أدخل الصفقات المنفذة فقط، وحدّث سعر الوحدة أو الجرام من ثاندر يدويًا. لا تُدخل أوامر شراء من هنا.</div>';
    html+='<div class="pro-two"><div class="pro-card"><div class="pro-head"><h3>تسجيل عملية استثمار</h3><span class="pro-meta">شراء • بيع • رصيد افتتاحي</span></div><form id="proTradeForm" class="pro-grid-fields">'+
      '<label>نوع العملية<select name="kind" required><option value="buy">شراء منفذ</option><option value="sell">بيع منفذ</option><option value="opening">مركز موجود سابقًا</option></select></label>'+
      '<label>الأصل<select name="asset" id="proTradeAsset">'+optionsPositions()+'</select></label>'+
      '<label class="pro-wide" id="proCustomWrap" hidden>رمز الأصل الآخر<input name="custom" maxlength="25" placeholder="مثال: EGX30"></label>'+
      '<label>الكمية / عدد الوحدات<input type="number" name="qty" min="0.000001" step="any" required placeholder="مثال: 1.5"></label>'+
      '<label>سعر الوحدة بالجنيه<input type="number" name="price" min="0.000001" step="any" required></label>'+
      '<label>رسوم العملية بالجنيه<input type="number" name="fee" min="0" step="any" value="0" required></label>'+
      '<label>تاريخ التنفيذ<input type="date" name="date" value="'+iso()+'" required></label>'+
      '<button type="submit" class="btn primary pro-wide">حفظ العملية الفعلية</button></form><p class="muted">الشراء يقلل نقدي ثاندر، والبيع يزيده؛ تسجيل مركز افتتاحي لا يخصم نقدًا مرة ثانية.</p></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>تحديث الأسعار يدويًا</h3><span class="pro-meta">الأرقام من ثاندر</span></div>'+
      '<form id="proPriceForm" class="pro-grid-fields">'+
      '<label>الأصل<select name="asset" id="proPriceAsset">'+optionsPositions()+'</select></label>'+
      '<label>السعر الحالي بالجنيه<input type="number" name="price" min="0.000001" step="any" required></label>'+
      '<label class="pro-wide" id="proPriceCustomWrap" hidden>رمز الأصل الآخر<input name="custom" maxlength="25"></label>'+
      '<button class="btn primary pro-wide" type="submit">تحديث سعر التقييم</button></form>'+
      '<p class="muted">التقييم يُحسب من أحدث سعر أدخلته. لو لم تُدخل سعرًا، يُستخدم آخر سعر صفقة على أنه تقدير، وليس سعر السوق الحالي.</p>'+
      '<div class="pro-note">رسوم ثاندر واشتراكات الصناديق ليست واحدة لكل أصل. أدخل الرسم الفعلي كما ظهر في كشف التنفيذ.</div></div></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>مراكزي الاستثمارية</h3><span class="pro-meta">قيمة المراكز '+money(p.market)+'</span></div>';
    html+=line(p.holdings.map(function(x){return [
      '<strong>'+esc(name(x.code))+'</strong><br><small class="muted">'+esc(x.code)+'</small>',
      x.qty.toLocaleString("en-US",{maximumFractionDigits:6})+' '+esc(x.unit),
      money(x.book),
      money(x.currentPrice)+'<br><small class="muted">'+(x.pricedManually?"محدث يدويًا":"آخر سعر صفقة")+'</small>',
      money(x.value),
      '<span class="'+(x.profit<0?"pro-negative":"pro-positive")+'">'+money(x.profit)+'</span>'
    ]}),["الأصل","الوحدات","التكلفة","سعر التقييم","القيمة","الربح/الخسارة"]);
    html+='<div class="pro-note">إجمالي رسوم الصفقات المسجلة: '+money(p.fees)+'. البيع بنظام متوسط التكلفة المرجّح لأغراض التتبع، وليس بيانًا ضريبيًا رسميًا.</div></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>توزيع محفظة ثاندر مقابل الخطة</h3><span class="pro-meta">بعد احتساب المراكز فقط — دون النقدي</span></div>';
    presets.forEach(function(k){
      var row=p.holdings.find(function(x){return x.code===k.code}),current=p.market?(row?row.value/p.market*100:0):0,target=num(weights[k.code]!==undefined?weights[k.code]:k.target);
      html+='<div class="pro-allocation"><div class="pro-alloc-head"><b>'+esc(k.name)+'</b><span>'+current.toFixed(1)+'% فعلي / '+target+'% مستهدف</span></div><div class="pro-bar"><i style="width:'+Math.max(0,Math.min(current,100))+'%"></i></div></div>';
    });
    html+='<p class="muted">لو محفظتك فارغة تظهر نسب فعلية صفر. النسب المستهدفة لا تعني أوامر شراء تلقائية.</p></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>سجل صفقات ثاندر اليدوي</h3></div>';
    html+=line((st().trades||[]).slice().reverse().map(function(t){
      return [esc(t.date),esc(t.kind==="buy"?"شراء":t.kind==="sell"?"بيع":"رصيد افتتاحي"),esc(name(t.asset)),
      num(t.qty).toLocaleString("en-US",{maximumFractionDigits:6}),money(t.price),money(t.fee),'<button class="smallbtn" data-pro="delete-trade" data-id="'+esc(t.id)+'">حذف</button>'];
    }),["التاريخ","النوع","الأصل","الكمية","السعر","الرسم",""]);
    html+='</div>';
    root.innerHTML=html;
  }
  function planRows(){
    var p=st().plan;var first=ymdate(p.startMonth||ym(new Date())),out=[];
    for(var i=0;i<24;i++){
      var d=new Date(first.getFullYear(),first.getMonth()+i,1),m=ym(d);
      var e=i<2?num(p.p1Emergency):i<10?num(p.p2Emergency):0;
      var investment=i<2?0:i<10?num(p.p2Investment):num(p.p3Investment);
      var r=num(p.reserveMonthly);
      var actual={emergency:0,investment:0,reserve:0};
      (st().transactions||[]).filter(function(t){return t.type==="transfer"&&String(t.date).slice(0,7)===m}).forEach(function(t){
        if(t.category==="الطوارئ")actual.emergency+=num(t.amount);
        if(t.category==="الاستثمار")actual.investment+=num(t.amount);
        if(t.category==="الاحتياطي")actual.reserve+=num(t.amount);
      });
      out.push({index:i+1,month:m,emergency:e,investment:investment,reserve:r,actual:actual,total:e+investment+r});
    }
    return out;
  }
  function renderPlan(){
    var root=el("proPlan");if(!root)return;var p=st().plan,items=planRows(),s=st().settings;
    var total=items.reduce(function(a,x){return a+x.total},0);
    var emergency=items.reduce(function(a,x){return a+x.emergency},0);
    var investments=items.reduce(function(a,x){return a+x.investment},0);
    var reserves=items.reduce(function(a,x){return a+x.reserve},0);
    var planSave=num(s.salary)-num(s.rent)-num(s.bills)-num(s.living);
    var actualEmergency=(st().transactions||[]).filter(function(t){return t.type==="transfer"&&t.category==="الطوارئ"}).reduce(function(a,t){return a+num(t.amount)},0);
    var html='<div class="pro-hero"><div><small>خطة فلوسي × ثاندر</small><div class="pro-major">24 شهرًا</div><span>الأمان المالي أولًا، ثم زيادة الاستثمار على مراحل</span></div><span class="pro-hero-icon">◎</span></div>';
    html+='<div class="pro-stat-grid">'+box("تخصيصات 24 شهرًا",total,"قبل العوائد والسحوبات")+
      box("صندوق الطوارئ المستهدف بالخطة",emergency,"لا يُستثمر في الأسهم")+
      box("مساهمات ثاندر بالخطة",investments,"لا تعني القيمة السوقية")+
      box("الاحتياطي غير المنتظم",reserves,"قد يُستخدم للصيانة")+'</div>';
    if(planSave<8000)html+='<div class="pro-alert">⚠ الفائض الحالي المحسوب من ميزانيتك '+money(planSave)+' أقل من مثال الخطة الأصلية البالغ 8,000 جنيه. راجع التخصيصات قبل الالتزام.</div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>تخصيص مراحل الادخار</h3><span class="pro-meta">القيم قابلة للتعديل حسب دخلك</span></div>'+
      '<form id="proPlanForm" class="pro-grid-fields">'+
      '<label>بداية الخطة<input name="startMonth" type="month" required value="'+esc(p.startMonth)+'"></label>'+
      '<label>الاحتياطي كل شهر<input name="reserveMonthly" min="0" type="number" required value="'+num(p.reserveMonthly)+'"></label>'+
      '<label>الطوارئ في أول شهرين<input name="p1Emergency" min="0" type="number" required value="'+num(p.p1Emergency)+'"></label>'+
      '<label>الطوارئ شهريًا في الشهور 3–10<input name="p2Emergency" min="0" type="number" required value="'+num(p.p2Emergency)+'"></label>'+
      '<label>الاستثمار شهريًا في الشهور 3–10<input name="p2Investment" min="0" type="number" required value="'+num(p.p2Investment)+'"></label>'+
      '<label>الاستثمار شهريًا في الشهور 11–24<input name="p3Investment" min="0" type="number" required value="'+num(p.p3Investment)+'"></label>'+
      '<label>هدف الطوارئ<input name="emergencyTarget" type="number" min="0" required value="'+num(p.emergencyTarget)+'"></label>'+
      '<label>هدف الاستثمار للسنة الأولى<input name="year1InvestTarget" type="number" min="0" required value="'+num(p.year1InvestTarget)+'"></label>'+
      '<button class="btn primary pro-wide" type="submit">حفظ الخطة المالية</button></form></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>توزيع المحفظة المستهدف</h3><span class="pro-meta">نسب من مبلغ الاستثمار فقط</span></div><form id="proWeightsForm" class="pro-grid-fields">'+
      presets.map(function(x){return '<label>'+esc(x.name)+' %<input type="number" name="'+x.code+'" min="0" max="100" step="1" required value="'+num(p.weights[x.code])+'"></label>'}).join("")+
      '<button type="submit" class="btn primary pro-wide">حفظ الأوزان (المجموع 100%)</button></form><div class="pro-note">من كل 7,000 جنيه: '+presets.map(function(x){return esc(x.code)+' '+money(7000*num(p.weights[x.code])/100)}).join(' • ')+'</div></div>';
    html+='<div class="pro-card"><div class="pro-head"><h3>جدول التخصيصات لـ24 شهرًا</h3><span class="pro-meta">قارن الخطة بما سجلته بالفعل</span></div>';
    html+=line(items.map(function(x){
      var actual=x.actual.emergency+x.actual.investment+x.actual.reserve,delta=actual-x.total;
      return [String(x.index),esc(x.month),money(x.emergency),money(x.investment),money(x.reserve),money(x.total),
      money(actual),'<span class="'+(delta<0?"pro-negative":"pro-positive")+'">'+money(delta)+'</span>'];
    }),["#","الشهر","الطوارئ","ثاندر","الاحتياطي","المستهدف","المسجل","الفرق"]);
    html+='<p class="muted">المبالغ المنفذة تُستخرج من تحويلات «الطوارئ / الاستثمار / الاحتياطي» المسجلة في معاملاتك. الاستثمارات لا تُحسب مصروفات استهلاكية.</p></div>';
    root.innerHTML=html;
  }
  function renderRisk(){
    var root=el("proRisk");if(!root)return;
    var m=metrics(),s=st().settings,monthly=num(s.rent)+num(s.bills)+num(s.living),e=m.balances.emergency||0;
    var runway=monthly>0?e/monthly:0;
    var over=(st().transactions||[]).filter(function(t){return t.type==="expense"&&String(t.date).slice(0,7)===iso().slice(0,7)}).reduce(function(a,t){return a+num(t.amount)},0);
    var html='<div class="pro-stat-grid">'+box("تغطية الطوارئ",runway,"شهر — المعروض عدد أشهر وليس جنيه")+
      box("تكلفة المعيشة الشهرية",monthly,"وفق الميزانية")+
      box("المصروفات هذا الشهر",over,"من معاملاتك المسجلة")+
      box("قيمة الاستثمارات",m.portfolio.market,"تقييم يدوي")+'</div>';
    html='<div class="pro-card"><div class="pro-head"><h3>لوحة الأزمات المالية</h3></div><div class="pro-risk-grid">'+
      '<div><small>رصيد صندوق الطوارئ المحتسب</small><strong>'+money(e)+'</strong></div>'+
      '<div><small>شهور التغطية الحالية</small><strong>'+runway.toFixed(1)+' شهر</strong></div>'+
      '<div><small>تغطية مع زيادة الأسعار 15%</small><strong>'+(monthly?e/(monthly*1.15):0).toFixed(1)+' شهر</strong></div>'+
      '<div><small>هبوط المحفظة 25% (سيناريو فقط)</small><strong class="pro-negative">−'+money(m.portfolio.market*.25)+'</strong></div></div>'+
      '<div class="pro-alert">'+(runway<1?"🔴 أولوية عاجلة: بناء سيولة كافية لمصاريف شهر كامل.":runway<3?"🟠 تغطية الطوارئ أقل من 3 أشهر؛ قلّل المخاطر وابنِ السيولة.":runway<6?"🟡 مستوى أفضل، لكن استهدف 6 أشهر للأمان المالي.":"🟢 هدف الأمان المالي الأساسي محقق وفق الأرصدة المُدخلة.")+'</div></div>';
    var alerts=[];
    if(m.unassigned)alerts.push('هناك '+m.unassigned+' معاملات قديمة غير مربوطة بحساب، لذلك قد لا يطابق صافي الثروة الواقع.');
    if(Object.values(m.balances).some(function(v){return v<0}))alerts.push('هناك حساب برصيد سلبي. راجع الرصيد الافتتاحي أو العمليات المسجلة.');
    if(over>monthly&&monthly>0)alerts.push('المصروفات المسجلة لهذا الشهر تجاوزت الميزانية.');
    if(!C.getSession())alerts.push('المزامنة السحابية غير نشطة. سجّل الدخول واحتفظ بنسخة احتياطية JSON.');
    var stale=m.portfolio.holdings.filter(function(p){var d=Date.parse(String(p.priceDate).slice(0,10));return !d||Date.now()-d>14*86400000});
    if(stale.length)alerts.push('تقييم بعض المراكز الاستثمارية يعتمد على أسعار قديمة. حدّث أسعار ثاندر يدويًا.');
    html+='<div class="pro-card"><div class="pro-head"><h3>تنبيهات البيانات والميزانية</h3></div>'+
      (alerts.length?alerts.map(function(a){return '<div class="pro-note">• '+esc(a)+'</div>'}).join(""):'<div class="pro-note">لا توجد تنبيهات كبيرة بناءً على المعلومات المسجلة حاليًا.</div>')+'</div>';
    html+='<div class="pro-card"><h3>ماذا تفعل وقت الأزمة؟</h3><ol class="pro-steps"><li>أوقف شراء الأصول عالية المخاطرة مؤقتًا.</li><li>استخدم الاحتياطي غير المنتظم للمصاريف الموسمية، والطوارئ للحالات الحقيقية.</li><li>خفض مصروفاتك الاختيارية، وأعِد حساب عدد أشهر التغطية شهريًا.</li><li>لا تَبِع الأصول المتقلبة تحت الضغط دون مراجعة احتياجاتك وتوزيع المخاطر.</li><li>أعد تعبئة صندوق الطوارئ قبل زيادة الاستثمار.</li></ol><div class="pro-note">هذه سيناريوهات توعوية؛ النتائج تعتمد على الأرصدة والأسعار التي أدخلتها، وليست توقعات مؤكدة.</div></div>';
    root.innerHTML=html;
  }
  function updateHighlights(){
    var target=el("wealthHighlights");if(!target)return;
    var m=metrics();
    target.innerHTML='<div class="pro-glance"><div><small>صافي ثروتك المسجلة</small><strong>'+money(m.net)+'</strong><span>نقدي + استثمارات + أصول − ديون</span></div><div class="pro-glance-actions"><button type="button" class="btn" data-go="wealth">▣ حساباتي</button><button type="button" class="btn primary" data-go="portfolio">↗ محفظة ثاندر</button></div></div>'+
      '<div class="pro-note pro-glance-note">تقدير مبني على أرصدة الحسابات والأسعار التي تدخلها يدويًا. لا توجد مزامنة مباشرة مع البنوك أو ثاندر.</div>';
  }
  function reportSection(){
    var m=metrics(),p=m.portfolio;
    var html='<h2>7. ملحق الثروة الحالية (تقييم بتاريخ إصدار التقرير)</h2>';
    html+='<div class="r-note">هذا الملحق يمثل القيم المُدخلة حاليًا ولا يعيد إنشاء أرصدة تاريخية للفترة. تجنب تكرار احتساب نفس الأصل.</div>';
    html+='<table><thead><tr><th>الحساب النقدي</th><th>الرصيد (جنيه)</th></tr></thead><tbody>'+
      cashAccounts().map(function(a){return '<tr><td>'+esc(a.name)+'</td><td>'+money(m.balances[a.id]||0)+'</td></tr>'}).join("")+'</tbody></table>';
    html+='<h2>8. مراكز ثاندر الحالية</h2><table><thead><tr><th>الأصل</th><th>الكمية</th><th>التكلفة</th><th>القيمة المقدرة</th></tr></thead><tbody>'+
      (p.holdings.length?p.holdings.map(function(a){return '<tr><td>'+esc(name(a.code))+'</td><td>'+a.qty.toFixed(4)+'</td><td>'+money(a.book)+'</td><td>'+money(a.value)+'</td></tr>'}).join(""):'<tr><td colspan="4">لم تُسجل مراكز بعد.</td></tr>')+
      '</tbody></table><h2>9. ملخص صافي الثروة</h2><table><tbody>'+
      '<tr><td>النقدية بالحسابات</td><td>'+money(m.cash)+'</td></tr>'+
      '<tr><td>القيمة السوقية للمراكز المسجلة</td><td>'+money(m.portfolio.market)+'</td></tr>'+
      '<tr><td>أصول أخرى</td><td>'+money(m.other)+'</td></tr>'+
      '<tr><td>الالتزامات</td><td>−'+money(m.debt)+'</td></tr>'+
      '<tr><th>صافي الثروة التقديري</th><th>'+money(m.net)+'</th></tr></tbody></table>';
    return html;
  }
  function render(){
    updateHighlights();renderAccounts();renderPortfolio();renderPlan();renderRisk();updateTxnAccounts();
  }
  function store(kind,item){C.mutate(function(s){s[kind].push(Object.assign({id:rid(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},item))});}
  function del(kind,id){if(!confirm("هل تريد حذف هذا السجل؟ لا يمكن استعادته إلا من نسخة احتياطية."))return;C.mutate(function(s){s[kind]=s[kind].filter(function(x){return x.id!==id});if(!s.deletedIds)s.deletedIds=[];s.deletedIds.push(kind+"/"+id)})}
  document.addEventListener("click",function(e){
    var btn=e.target.closest("[data-pro]");if(!btn)return;
    var action=btn.dataset.pro,id=btn.dataset.id;
    if(action==="add-account"){
      var an=prompt("اسم الحساب الجديد (مثال: بنك آخر / محفظة إلكترونية)");if(!an||!an.trim())return;
      var a=prompt("الرصيد الافتتاحي الحالي بالجنيه","0");if(a===null)return;var v=Number(a);
      if(!Number.isFinite(v)||v<0){C.toast("أدخل رصيدًا صحيحًا");return}
      store("accounts",{name:an.trim().slice(0,60),type:"other",opening:v});
    }
    if(action==="edit-account"){
      var x=acc(id);if(!x)return;
      var y=prompt("الرصيد الافتتاحي للحساب: "+x.name+"\nملحوظة: لا تكتب الرصيد الحالي الناتج عن معاملات سجّلتها بالفعل.",String(x.opening));if(y===null)return;
      var z=Number(y);if(!Number.isFinite(z)||z<0){C.toast("الرصيد غير صالح");return}
      C.mutate(function(s){var a=s.accounts.find(function(k){return k.id===id});if(a){a.opening=z;a.updatedAt=new Date().toISOString()}});
    }
    if(action==="edit-asset"||action==="edit-debt"){
      var kind=action==="edit-asset"?"assets":"liabilities",valueKey=kind==="assets"?"value":"balance";
      var item=(st()[kind]||[]).find(function(x){return x.id===id});if(!item)return;
      var edit=prompt("القيمة الحالية: "+item.name,String(item[valueKey]||0));
      if(edit===null)return;
      var updated=Number(edit);if(!Number.isFinite(updated)||updated<0){C.toast("القيمة غير صالحة");return}
      C.mutate(function(s){var x=s[kind].find(function(r){return r.id===id});if(x){x[valueKey]=updated;x.updatedAt=new Date().toISOString()}});
      C.toast("تم تحديث التقييم الحالي");
    }
    if(action==="add-asset"||action==="add-debt"){
      var kind=action==="add-asset"?"assets":"liabilities",title=kind==="assets"?"الأصل غير النقدي":"الدين أو الالتزام";
      var name=prompt("اسم "+title);if(!name||!name.trim())return;
      var v=prompt("القيمة الحالية بالجنيه","0");if(v===null)return;var amount=Number(v);
      if(!Number.isFinite(amount)||amount<0){C.toast("القيمة غير صالحة");return}
      store(kind,kind==="assets"?{name:name.trim().slice(0,80),value:amount}:{name:name.trim().slice(0,80),balance:amount});
    }
    if(action.startsWith("delete-"))del(action==="delete-trade"?"trades":action==="delete-asset"?"assets":"liabilities",id);
  });
  document.addEventListener("change",function(e){
    if(e.target.id==="proTradeAsset")el("proCustomWrap").hidden=e.target.value!=="CUSTOM";
    if(e.target.id==="proPriceAsset")el("proPriceCustomWrap").hidden=e.target.value!=="CUSTOM";
    if(e.target.id==="formType"||e.target.id==="formCategory"||e.target.id==="formAccount")updateTxnAccounts();
  });
  document.addEventListener("submit",function(e){
    var form=e.target;
    if(!["proAccountTransfer","proTradeForm","proPriceForm","proPlanForm","proWeightsForm"].includes(form.id))return;
    e.preventDefault();var d=new FormData(form);
    if(form.id==="proAccountTransfer"){
      var a=d.get("from"),b=d.get("to"),amount=Number(d.get("amount"));
      if(a===b||!acc(a)||!acc(b)||!Number.isFinite(amount)||amount<=0){C.toast("اختر حسابين مختلفين ومبلغًا صحيحًا");return}
      C.mutate(function(s){s.transactions.push({id:rid(),type:"transfer",date:iso(),description:String(d.get("description")||"تحويل").trim(),category:String(d.get("category")),amount:amount,accountId:a,targetAccountId:b,createdAt:new Date().toISOString()})});
      C.toast("تم تسجيل التحويل دون اعتباره مصروفًا");
    }
    if(form.id==="proTradeForm"){
      var k=d.get("kind"),asset=d.get("asset"),code=asset==="CUSTOM"?String(d.get("custom")||"").trim().toUpperCase():String(asset),
          qty=Number(d.get("qty")),price=Number(d.get("price")),fee=Number(d.get("fee"));
      if(!code||code.length>25||!["buy","sell","opening"].includes(k)||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<=0||!Number.isFinite(fee)||fee<0){C.toast("راجع بيانات الصفقة");return}
      if(k==="sell"){var p=portfolio().holdings.find(function(x){return x.code===code});if(!p||p.qty+1e-8<qty){C.toast("كمية البيع أكبر من الوحدات المسجلة");return}}
      if(k==="buy"&&rowsForAccounts().thndr<qty*price+fee&&!confirm("الرصيد النقدي المسجل في ثاندر لا يغطي تكلفة الشراء. ربما لم تسجل الإيداع. هل تريد حفظ الصفقة رغم ذلك؟"))return;
      store("trades",{kind:k,asset:code,qty:qty,price:price,fee:fee,date:String(d.get("date")||iso())});
      C.toast("تم حفظ الصفقة في سجل التتبع");
    }
    if(form.id==="proPriceForm"){
      var sym=d.get("asset")==="CUSTOM"?String(d.get("custom")||"").trim().toUpperCase():String(d.get("asset")),v=Number(d.get("price"));
      if(!sym||sym.length>25||!Number.isFinite(v)||v<=0){C.toast("أدخل رمزًا وسعرًا صحيحين");return}
      C.mutate(function(s){s.prices[sym]={value:v,updatedAt:new Date().toISOString()}});
      C.toast("تم تحديث تقييم المحفظة");
    }
    if(form.id==="proPlanForm"){
      var fields=["reserveMonthly","p1Emergency","p2Emergency","p2Investment","p3Investment","emergencyTarget","year1InvestTarget"],result={},valid=true;
      fields.forEach(function(k){result[k]=Number(d.get(k));if(!Number.isFinite(result[k])||result[k]<0)valid=false});
      var start=String(d.get("startMonth")||"");if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(start))valid=false;
      if(!valid){C.toast("راجع أرقام وتواريخ الخطة");return}
      C.mutate(function(s){Object.assign(s.plan,result,{startMonth:start})});
      C.toast("تم تحديث خطة 24 شهرًا");
    }
    if(form.id==="proWeightsForm"){
      var w={},sum=0;presets.forEach(function(k){w[k.code]=Number(d.get(k.code));sum+=w[k.code]});
      if(presets.some(function(k){return !Number.isFinite(w[k.code])||w[k.code]<0||w[k.code]>100})||Math.abs(sum-100)>.01){C.toast("مجموع الأوزان يجب أن يساوي 100%");return}
      C.mutate(function(s){s.plan.weights=w});C.toast("تم حفظ توزيع الاستثمار");
    }
  });
  init();
  window.FLOSY_PRO={render:render,updateTxnAccounts:updateTxnAccounts,reportSection:reportSection};
  C.render();
})();
