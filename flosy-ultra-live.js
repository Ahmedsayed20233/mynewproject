/* Flosy Ultra production bridge: designer's EXACT HTML + real Flosy canonical ledger.
 * No seeded example balances or receipt transactions, no SMS imports.
 * Source HTML is intentionally preserved rather than redrawn.
 */
(function(w,d){"use strict";
 const D=w.FLOSY_ULTRA_DATA,by=id=>d.getElementById(id);
 const getFrame=n=>d.querySelector('.phone-frame[data-screen="'+n+'"]');
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let core=null,C=null,snapshot=null,period="month",analyticsPeriod="month",txFilter="all",txQuery="";
 let entryType="expense",candidate=null,voiceTarget="expense",receiptText="",lastHash="",lastNativeStatus={};
 const q=(sel,base=d)=>base?.querySelector(sel),qa=(sel,base=d)=>Array.from(base?.querySelectorAll(sel)||[]);
 const n=D.n,fmt=D.money,iso=D.iso;const date=()=>iso(new Date());
 const toast=message=>w.showToast(String(message||""));
 const state=()=>C?.getState?.()||{};
 function status(text){const el=by("ultraBridgeStatus");if(el)el.textContent=text;}
 function safeCalc(){try{return core?.FLOSY_PHASE1?.calculate?.()||null}catch{return null}}
 function balances(){try{return core?.FLOSY_PRO?.rowsForAccounts?.()||{}}catch{return{}}}
 function data(which="month"){return D.summary(state(),D.periodRange(which),balances(),safeCalc())}
 function setText(el,s){if(el)el.textContent=String(s);}
 function setSrcCurrency(el,v){setText(el,fmt(v));}
 function elementIcon(category){return '<i class="fa-solid '+esc(D.icon(category))+'"></i>'}
 function txRow(t){
  const cat=D.category(t),account=state().accounts?.find(a=>a.id===t.accountId);
  const col=t.type==="expense"?"#F43F5E":t.type==="income"?"#10B981":"#38BDF8";
  const sign=t.type==="expense"?"-":t.type==="income"?"+":"↔ ";
  return '<div class="tx-item flex items-center justify-between gap-2 pb-2 border-b border-slate-500/10" data-type="'+esc(t.type)+'" data-title="'+esc(cat+' '+(t.description||''))+'">'+
   '<div class="flex items-center gap-2.5 min-w-0"><div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:color-mix(in srgb,'+col+' 16%,transparent);color:'+col+'">'+elementIcon(cat)+'</div>'+
   '<div class="min-w-0"><div class="text-xs font-extrabold truncate">'+esc(t.description||cat)+'</div>'+
   '<div class="text-[10px] opacity-60 truncate">'+esc(t.date||'')+' • '+esc(account?.name||"حساب غير محدد")+'</div></div></div>'+
   '<div class="text-left tabular-nums shrink-0"><div class="text-xs font-black balance-sensitive" style="color:'+col+'">'+sign+fmt(t.amount)+'</div>'+
   '<div class="text-[9px] opacity-60">'+esc(cat)+'</div></div></div>';
 }
 function renderHome(s){
  // Original onboarding wallet contains illustrative 42,600 EGP — replace with the real user's total.
  const introBalance=q(".text-2xl.font-black.tabular-nums",getFrame(1));
  if(introBalance)setText(introBalance,s.hasAccounts?fmt(s.total):"ابدأ من الصفر");
  setText(by("homeSafeBalance"),s.safe===null?"—":fmt(s.safe));
  setSrcCurrency(by("homeTotalIncome"),s.income);
  setSrcCurrency(by("homeTotalExpense"),s.expense);
  const p=s.budget?Math.min(100,Math.round((s.safe??0)/s.budget*100)):0;
  setText(by("homeSafePercent"),s.safe===null?"—":p+"%");
  const ring=by("homeGaugeCircle");if(ring)ring.setAttribute("stroke-dashoffset",String(163*(1-p/100)));
  const hero=q(".hero-safe-card",getFrame(2));
  setText(q(".space-y-1 p",hero),s.budget?"من ميزانيتك الشهرية "+fmt(s.budget):"أضف ميزانيتك علشان يظهر الحساب الدقيق");
  setText(q(".mt-3 .balance-sensitive",hero),s.daily===null?"—":fmt(s.daily)+" / يوم");
  const recent=by("homeRecentTransactions");
  if(recent)recent.innerHTML=s.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3)
   .map(txRow).join("")||'<div class="ultra-empty">لسه مفيش معاملات. اضغط إضافة يدوية وابدأ.</div>';
  const intro=getFrame(2);const slogan=q(".text-\\[10px\\].fintech-text-sub",intro);
  if(slogan)setText(slogan,s.hasAccounts?"نظرة حقيقية على فلوسك النهارده":"ابدأ بإضافة حساب ورصيدك الحقيقي");
 }
 function renderAccounts(s){
  setSrcCurrency(by("accountsTotalBalance"),s.total);
  const area=by("accountsListContainer");
  if(!area)return;
  area.innerHTML=s.accounts.map(a=>'<div class="fintech-card rounded-2xl p-3.5 flex items-center justify-between gap-2">'+
   '<div class="flex gap-3 items-center min-w-0"><div class="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><i class="fa-solid fa-wallet"></i></div>'+
   '<div class="min-w-0"><div class="text-xs font-extrabold truncate">'+esc(a.name||"حساب")+'</div><div class="text-[10px] fintech-text-sub">'+
   (a.last4?"•••• "+esc(a.last4):"حساب سجلته بنفسك")+'</div></div></div>'+
   '<div class="text-sm font-black tabular-nums balance-sensitive shrink-0">'+fmt(a.balance)+'</div></div>'
  ).join("")||'<div class="ultra-empty">مافيش حسابات مسجلة. ضيف حساب علشان تبدأ.</div>';
  const badge=q(".wallet-hero-card .text-\\[10px\\]",getFrame(3));if(badge)badge.textContent=s.accounts.length+" حسابات مسجلة";
 }
 function transactionGroups(){
  const f=getFrame(4),sc=q(".screen-scroll",f);if(!sc)return;
  const all=D.cleanTx(state()).filter(t=>{
   const text=(t.category||"")+" "+(t.description||"");
   return (txFilter==="all"||txFilter===t.type)&&text.toLocaleLowerCase("ar-EG").includes(txQuery.toLocaleLowerCase("ar-EG"));
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
  const groups=new Map();
  for(const t of all.slice(0,100)){
   let label=t.date===date()?"النهارده":t.date===iso(new Date(Date.now()-86400000))?"امبارح":t.date;
   if(!groups.has(label))groups.set(label,[]);
   groups.get(label).push(t);
  }
  const out=[...groups].map(([label,rows])=>'<section class="space-y-2 ultra-tx-group">'+
   '<div class="flex justify-between text-xs font-bold fintech-text-main"><span>'+esc(label)+'</span><span class="text-rose-400 tabular-nums">'+
   (rows.reduce((v,t)=>v+(t.type==="expense"?-n(t.amount):t.type==="income"?n(t.amount):0),0).toFixed(0))+' ج.م</span></div>'+
   '<div class="fintech-list-card rounded-2xl p-3 space-y-2">'+rows.map(txRow).join("")+'</div></section>').join("");
  // Remove demo groups once, then re-render on every filter/search update.
  let slot=by("ultraTransactionGroups");
  if(!slot){
   const children=Array.from(sc.children);
   children.slice(3).forEach(el=>el.remove());
   slot=d.createElement("div");slot.id="ultraTransactionGroups";slot.className="space-y-3";
   sc.appendChild(slot);
  }
  slot.innerHTML=out||'<div class="ultra-empty">لا توجد معاملات تطابق البحث أو الفلتر.</div>';
  const title=q("h2",sc);if(title)title.textContent="سجل المعاملات · "+new Date().toLocaleDateString("ar-EG",{month:"long",year:"numeric"});
 }
 function renderBudget(s){
  const area=by("budgetsListContainer");if(!area)return;
  const cards=D.budgetCards(s,state());
  area.innerHTML=cards.map(x=>{
   const ratio=x.ratio===null?0:Math.max(0,Math.min(100,x.ratio));
   const c=ratio>100?"#F43F5E":ratio>=70?"#F59E0B":"#10B981";
   return '<div class="fintech-list-card rounded-2xl p-3 flex items-center justify-between gap-2.5">'+
    '<div class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style="color:'+c+';background:color-mix(in srgb,'+c+' 15%,transparent)">'+elementIcon(x.name)+'</div>'+
    '<div class="flex-1 min-w-0"><div class="flex justify-between items-center gap-1"><span class="text-xs font-extrabold">'+esc(x.name)+'</span>'+
    '<span class="text-[10px] font-bold" style="color:'+c+'">'+(x.configured?"متبقي "+fmt(x.remaining):"الحد غير محدد")+'</span></div>'+
    '<div class="text-[10px] opacity-65 tabular-nums mt-1">'+fmt(x.spent)+' من '+(x.configured?fmt(x.budget):"—")+'</div>'+
    '<div class="ultra-chart-track mt-1.5"><i style="width:'+ratio+'%;background:'+c+'"></i></div></div>'+
    '<div class="w-10 h-10 rounded-full border-4 shrink-0 flex items-center justify-center text-[10px] font-black" style="border-color:'+c+'">'+
     (x.configured?x.ratio+"%":"—")+'</div></div>';
  }).join("");
 }
 function renderAnalytics(s){
  const f=getFrame(9),sc=q(".screen-scroll",f);if(!sc)return;
  const blocks=qa(":scope > .fintech-card",sc);
  const expense=blocks[0],donut=blocks[1],area=blocks[2];
  if(expense){
   const title=q(".text-xl,.text-2xl",expense);if(title)setText(title,fmt(s.expense));
   const delta=q(".text-emerald-400",expense);if(delta)setText(delta,"حسب معاملاتك المسجلة");
  }
  if(donut){
   // Replace demo SVG percentages with actual category share for valid accounting.
   const legend=q(".flex-1",donut);
   if(legend){
    legend.innerHTML=(s.categories.slice(0,5).map(c=>'<div class="flex justify-between text-[10px] mb-1.5"><span>'+esc(c.name)+'</span>'+
      '<span class="tabular-nums font-black">'+Math.round(c.share)+'%</span></div>').join("")||
      '<div class="ultra-empty">لا توجد بيانات لهذا الاختيار</div>');
   }
   const rings=qa("svg circle",donut);const items=s.categories.slice(0,5);
   let offset=0;for(let i=0;i<rings.length;i++){const share=Math.max(0,Math.min(100,items[i]?.share||0));
    rings[i].setAttribute("stroke-dasharray",share+" "+(100-share));
    rings[i].setAttribute("stroke-dashoffset",String(-offset));offset+=share;}
   const count=q(".absolute",donut);if(count)setText(count,fmt(s.expense));
  }
  if(area){
   const values=D.weekly(s.transactions,s.range),max=Math.max(1,...values);
   const svg=q("svg",area);
   if(svg){
    const old=svg.querySelector("[data-ultra-live-path]");old?.remove();
    const path=d.createElementNS("http://www.w3.org/2000/svg","polyline");
    path.setAttribute("data-ultra-live-path","true");
    path.setAttribute("points",values.map((v,i)=>(20+80*i)+","+(135-95*v/max)).join(" "));
    path.setAttribute("fill","none");path.setAttribute("stroke","#10B981");
    path.setAttribute("stroke-width","4");path.setAttribute("stroke-linejoin","round");
    svg.appendChild(path);
    qa("path",svg).filter(x=>!x.hasAttribute("data-ultra-live-path")).forEach(x=>x.setAttribute("opacity","0.08"));
   }
  }
 }
 function renderReports(s){
  const sc=q(".screen-scroll",getFrame(11));if(!sc)return;
  const hero=q(".hero-safe-card h3",sc);
  if(hero)setText(hero,"تقرير "+new Date(s.range.start+"T12:00:00").toLocaleDateString("ar-EG",{month:"long",year:"numeric"}));
  const keys=qa(".fintech-card .text-xs.tabular-nums > span:last-child",sc);
  if(keys[0])setText(keys[0],fmt(s.income));
  if(keys[1])setText(keys[1],fmt(s.expense));
  if(keys[2])setText(keys[2],s.savings===null?"—":s.savings+"%");
 }
 function renderTips(s){
  const sc=q(".screen-scroll",getFrame(12));if(!sc)return;
  const score=q(".fintech-card .w-12",sc);
  if(score)setText(score,s.income?Math.max(0,Math.min(100,Math.round(50+40*(s.net/Math.max(s.income,1)))))+" /100":"— /100");
  const target=sc.lastElementChild;
  if(target&&!target.classList.contains("ultra-screen12-list")){
   target.className="ultra-screen12-list";
  }
  if(target)target.innerHTML=D.tips(s).map((tip,i)=>'<button type="button" data-ultra-tip="'+i+'">'+
   '<strong>'+["فرصة لتحسين إنفاقك","ابدأ الادخار الذكي","المتاح الآمن للصرف"][i%3]+'</strong><br>'+esc(tip)+'</button>').join("");
 }
 function renderLive(force=false){
  if(!C)return;
  const st=state(),key=JSON.stringify([st._updatedAt,st.transactions?.length,st.accounts?.length,st.settings,period,analyticsPeriod,txFilter,txQuery]);
  if(!force&&key===lastHash)return;
  lastHash=key;
  const month=data("month"),anal=data(analyticsPeriod),report=data(period);
  snapshot=month;
  renderHome(month);renderAccounts(month);transactionGroups();renderBudget(month);
  renderAnalytics(anal);renderReports(report);renderTips(month);
  syncNotifications();
  if(w.FLOSY_ULTRA_AI?.setContext)w.FLOSY_ULTRA_AI.setContext(month,C,core);
 }
 function navigate(id){
  w.goToScreen(id);
  if(id===4)transactionGroups();
  if(id===9)renderAnalytics(data(analyticsPeriod));
  if(id===11)renderReports(data(period));
  if(id===8)w.FLOSY_ULTRA_AI?.activate?.();
 }
 function showModal(title,fields,onSave){
  by("ultraModalLayer")?.remove();
  const layer=d.createElement("div");layer.id="ultraModalLayer";layer.className="ultra-overlay";
  layer.innerHTML='<div class="ultra-modal" role="dialog" aria-modal="true"><h2>'+esc(title)+'</h2>'+
    '<form id="ultraDataForm">'+fields+'<button type="submit" class="ultra-submit">حفظ</button>'+
    '<button type="button" class="ultra-cancel" id="ultraModalCancel">إلغاء</button></form></div>';
  d.body.appendChild(layer);
  by("ultraModalCancel").onclick=()=>layer.remove();
  layer.addEventListener("click",e=>{if(e.target===layer)layer.remove()});
  const form=by("ultraDataForm");form.onsubmit=e=>{
   e.preventDefault();
   try{const result=onSave(new FormData(form));if(result!==false)layer.remove()}
   catch(err){toast(err.message||"خطأ في البيانات")}
  };
 }
 function addAccount(){
  if(!C){toast("لم يتم تحميل بياناتك بعد");return}
  showModal("إضافة حساب أو محفظة إلكترونية",
   '<label>اسم الحساب<input name="name" maxlength="70" required placeholder="مثال: حسابي الجاري"></label>'+
   '<label>الرصيد الافتتاحي الحقيقي بالجنيه<input name="opening" required type="number" min="0" step="0.01" value="0"></label>'+
   '<label>آخر 4 أرقام (اختياري)<input name="last4" pattern="[0-9]{4}" inputmode="numeric" maxlength="4"></label>',
   f=>{
    const name=String(f.get("name")||"").trim(),opening=Number(f.get("opening"));
    if(!name||!Number.isFinite(opening)||opening<0||opening>=1e9)throw Error("راجع اسم الحساب ورصيده");
    C.mutate(s=>{s.accounts=s.accounts||[];s.accounts.push({id:"ultra-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),
     name,opening,last4:String(f.get("last4")||""),type:"bank",updatedAt:Date.now()})});
    toast("تم حفظ الحساب بدون إنشاء معاملات وهمية");renderLive(true);
   });
 }
 function addBudget(){
  if(!C)return;
  showModal("تحديد ميزانية فئة",
   '<label>الفئة<select name="name"><option>الطعام والمطاعم</option><option>المواصلات</option><option>التسوق</option><option>الترفيه</option></select></label>'+
   '<label>الحد الشهري بالجنيه<input name="limit" type="number" min="1" max="999999999" step="0.01" required></label>',
   f=>{
    const name=String(f.get("name")),limit=Number(f.get("limit"));
    if(!(limit>0&&limit<1e9))throw Error("أدخل حدًا شهريًا صحيحًا");
    C.mutate(s=>{s.settings=s.settings||{};const a=Array.isArray(s.settings.categoryBudgets)?s.settings.categoryBudgets:[];
      s.settings.categoryBudgets=[...a.filter(x=>x.name!==name),{name,limit}];});
    renderLive(true);toast("تم تحديث خطة الميزانية، بدون إنشاء عملية صرف");
   });
 }
 function transactionAccountSelects(){
  const area=getFrame(5),form=q(".screen-scroll .space-y-3",area);
  if(!form||by("ultraAccountSelect"))return;
  const wrap=d.createElement("div");wrap.className="ultra-preview-panel";
  wrap.innerHTML='<label class="block text-[11px] font-bold">من حساب<select id="ultraAccountSelect" class="w-full rounded-lg p-2 mt-1" aria-label="حساب العملية"></select></label>'+
  '<label id="ultraTargetWrap" class="block text-[11px] font-bold" hidden>إلى حساب<select id="ultraTargetSelect" class="w-full rounded-lg p-2 mt-1"></select></label>'+
  '<label class="block text-[11px] font-bold mt-2">التاريخ<input id="ultraTxnDate" type="date" class="w-full p-2 rounded-lg mt-1"></label>';
  form.appendChild(wrap);by("ultraTxnDate").value=date();
 }
 function renderAccountOptions(){
  const items=state().accounts||[];
  for(const id of ["ultraAccountSelect","ultraTargetSelect"]){
   const sel=by(id);if(!sel)continue;const prev=sel.value;
   sel.innerHTML=items.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name||"حساب")+'</option>').join("");
   if(items.some(a=>a.id===prev))sel.value=prev;
  }
  const target=by("ultraTargetWrap");if(target)target.hidden=entryType!=="transfer";
 }
 function saveTransaction(){
  if(!C){toast("جاري تحميل بياناتك");return}
  const amount=Number(by("inputTxAmount")?.value),cat=String(by("inputTxCategory")?.value||"أخرى"),
        desc=String(by("inputTxNote")?.value||"").trim()||cat;
  const accountId=by("ultraAccountSelect")?.value,targetAccountId=by("ultraTargetSelect")?.value;
  const day=String(by("ultraTxnDate")?.value||date());
  if(!(amount>0&&amount<1e9)||!Number.isFinite(amount)){toast("أدخل مبلغًا صحيحًا");return}
  if(!state().accounts?.some(x=>x.id===accountId)){toast("أضف حسابًا حقيقيًا أولاً");navigate(3);return}
  if(entryType==="transfer"&&(targetAccountId===accountId||!state().accounts.some(x=>x.id===targetAccountId))){
   toast("اختر حسابًا آخر للتحويل");return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day+"T12:00:00"))){toast("تاريخ غير صحيح");return}
  const exists=D.cleanTx(state()).some(t=>t.type===entryType&&t.date===day&&n(t.amount)===amount&&t.accountId===accountId&&
   String(t.description||"")===desc&&String(t.targetAccountId||"")===String(entryType==="transfer"?targetAccountId:""));
  if(exists&&!w.confirm("فيه معاملة بنفس البيانات. هل دي عملية مختلفة فعلًا؟"))return;
  const now=new Date().toISOString();
  C.mutate(s=>s.transactions.push({id:"ultra-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
   type:entryType,category:cat,description:desc,amount,date:day,accountId,
   targetAccountId:entryType==="transfer"?targetAccountId:null,createdAt:now,updatedAt:now,source:"ultra_manual"}));
  by("inputTxAmount").value="";
  by("inputTxNote").value="";
  toast("اتسجلت المعاملة بالفعل في فلوسي");renderLive(true);navigate(4);
 }
 function showCandidate(t,label){
  if(!C)return;
  if(!t||!(n(t.amount)>0)){toast("لم يتم استخراج مبلغ مؤكد. حاول مرة أخرى");return}
  candidate={...t,accountId:t.accountId||state().accounts?.[0]?.id||""};
  const choose=(state().accounts||[]).map(a=>'<option value="'+esc(a.id)+'"'+(candidate.accountId===a.id?' selected':'')+'>'+esc(a.name||"حساب")+'</option>').join("");
  const panel='<div class="ultra-candidate" role="status"><b>'+esc(label||"معاملة تم تحليلها")+'</b>'+
   '<div>'+esc(candidate.category||"أخرى")+' · '+fmt(candidate.amount)+' · '+esc(candidate.date||date())+'</div>'+
   '<label>الحساب<select id="ultraCandidateAccount">'+choose+'</select></label>'+
   '<div class="ultra-candidate-actions"><button type="button" id="ultraConfirmCandidate">حفظ بعد المراجعة</button>'+
   '<button type="button" id="ultraDismissCandidate">إلغاء</button></div></div>';
  const place=by("ultraCandidateBox")||
   (voiceTarget==="receipt"?getFrame(6)?.children[2]:getFrame(7)?.children[2])||
   getFrame(7)?.children[2];
  if(place){place.querySelector(".ultra-candidate")?.remove();place.insertAdjacentHTML("beforeend",panel)}
  by("ultraConfirmCandidate").onclick=()=>{
   if(!state().accounts?.some(a=>a.id===by("ultraCandidateAccount").value)){toast("أضف حسابًا أولاً");return}
   const row={...candidate,accountId:by("ultraCandidateAccount").value};
   delete row.autoQuality;delete row.pending;delete row.draft;
   C.mutate(s=>{if(!s.transactions.some(x=>x.sourceHash&&x.sourceHash===row.sourceHash))s.transactions.push(row);
    else throw Error("تم تسجيل المعاملة من قبل")});
   candidate=null;toast("اتسجلت المعاملة بعد مراجعتك");renderLive(true);navigate(4);
  };
  by("ultraDismissCandidate").onclick=()=>{candidate=null;place.querySelector(".ultra-candidate")?.remove()};
 }
 function parseVoiceText(text){
  const spoken=String(text||"").trim();if(!spoken)return;
  if(voiceTarget==="ai"){w.FLOSY_ULTRA_AI?.ask?.(spoken);navigate(8);return}
  try{
   const row=core?.FLOSY_CAPTURE?.parseVoice?.(spoken);
   if(!row)throw Error("مفيش معاملة مكتملة في الكلام");
   voiceTarget="expense";navigate(7);
   showCandidate(row,"فهمت الجملة: "+spoken.slice(0,85));
   setText(by("voicePromptText"),"اتعرفنا على الكلام. راجع التفاصيل قبل الحفظ.");
  }catch(e){toast(e.message||"تعذر تحليل الكلام")}
 }
 function receiptResult(text){
  receiptText=String(text||"").slice(0,12000);
  try{
   const row=core?.FLOSY_CAPTURE?.parseReceipt?.(receiptText);
   if(!row||!(n(row.amount)>0))throw Error("الصورة لم تعرض إجماليًا واضحًا");
   voiceTarget="receipt";navigate(6);showCandidate(row,"فاتورة محللة — راجع المبلغ قبل الحفظ");
   setText(by("receiptScanStatus"),"تم استخراج بيانات فاتورة حقيقية");
  }catch(err){toast(err.message||"لم أقدر أقرأ مبلغ الفاتورة")}
 }
 const native=(action,fields={})=>{if(w.FlosyNative?.postMessage&&w.FLOSY_NATIVE_BRIDGE_AVAILABLE)
  {try{w.FlosyNative.postMessage(JSON.stringify({action,...fields}));return true}catch{}}return false};
 function startVoice(forAI=false){
  voiceTarget=forAI?"ai":"expense";
  if(!forAI)setText(by("voicePromptText"),"🎙️ جاري الاستماع بالمصري...");
  if(native("voice"))return;
  const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Speech){toast("جهازك لا يدعم التعرف الصوتي هنا. استخدم نسخة Android أو اكتب النص.");return}
  const recognition=new Speech();
  recognition.lang="ar-EG";recognition.interimResults=false;recognition.continuous=false;
  recognition.onresult=e=>parseVoiceText(e.results?.[0]?.[0]?.transcript||"");
  recognition.onerror=e=>toast("تعذر التقاط الصوت: "+(e.error||""));
  recognition.start();
 }
 function displayPrivacy(flag){
  w.privacyHidden=flag;
  qa(".balance-sensitive").forEach(el=>el.classList.toggle("privacy-blur",flag));
 }
 function theme(theme){
  const names=["emerald","light","sapphire"];
  if(!names.includes(theme))return;
  w.setTheme(theme);
  if(w.FLOSY_NATIVE_BRIDGE_AVAILABLE&&w.FlosyNative?.postMessage)
   try{w.FlosyNative.postMessage(JSON.stringify({action:"ultra-theme",theme}))}catch{}
  try{localStorage.setItem("flosy_ultra_theme_v1",theme)}catch{}
  qa(".ultra-theme-switch button").forEach(b=>b.classList.toggle("active",b.dataset.theme===theme));
 }
 function installThemes(){
  if(by("ultraThemeSwitch"))return;
  const x=d.createElement("nav");x.id="ultraThemeSwitch";x.className="ultra-theme-switch";
  x.setAttribute("aria-label","تغيير ثيم فلوسي");
  x.innerHTML='<button type="button" data-theme="emerald" title="الزمردي الفاخر" aria-label="الزمردي الفاخر">✦</button>'+
   '<button type="button" data-theme="light" title="النهاري المريح" aria-label="النهاري المريح">☼</button>'+
   '<button type="button" data-theme="sapphire" title="الياقوتي الملكي" aria-label="الياقوتي الملكي">◆</button>';
  d.body.appendChild(x);
  x.addEventListener("click",e=>{const b=e.target.closest("button[data-theme]");if(b)theme(b.dataset.theme)});
  theme(localStorage.getItem("flosy_ultra_theme_v1")||"emerald");
 }
 function handleFilters(){
  const txIn=by("txSearchInput");if(txIn)txIn.addEventListener("input",e=>{txQuery=e.target.value;transactionGroups()});
  const f=getFrame(9);qa(".screen-scroll > div:nth-child(2) button",f).forEach((b,i)=>b.onclick=()=>{
   analyticsPeriod=["month","last","three"][i]||"month";qa("button",b.parentElement).forEach(x=>x.classList.remove("btn-primary-cta"));
   b.classList.add("btn-primary-cta");renderAnalytics(data(analyticsPeriod));
  });
  const r=getFrame(11);qa(".screen-scroll > div:nth-child(2) button",r).forEach((b,i)=>b.onclick=()=>{
   period=["month","quarter","half","year"][i]||"month";qa("button",b.parentElement).forEach(x=>x.classList.remove("btn-primary-cta"));
   b.classList.add("btn-primary-cta");renderReports(data(period));
  });
 }
 function printable(){
  const s=data(period);
  const lines='<h1>Flosy Ultra · تقرير مالي</h1><p>'+esc(s.range.start)+' — '+esc(s.range.end)+'</p>'+
   '<p>الدخل: '+fmt(s.income)+' | المصروف: '+fmt(s.expense)+' | صافي التدفق: '+fmt(s.net)+'</p>'+
   '<h2>التصنيفات</h2>'+s.categories.map(x=>'<p>'+esc(x.name)+': '+fmt(x.amount)+'</p>').join("");
  const print=d.createElement("section");print.id="ultraPrint";print.innerHTML=lines;
  by("ultraPrint")?.remove();
  d.body.appendChild(print);
  // Existing native Android print route generates a real A4 print/PDF dialog.
  if(w.FLOSY_NATIVE_ANDROID){w.location.href="flosyapp://print";}
  else{w.print();setTimeout(()=>print.remove(),1200)}
 }
 function exportReports(kind){
  if(!C)return toast("انتظر تحميل بياناتك");
  if(kind==="excel"){
   if(w.FLOSY_REPORT_KIT?.download)return w.FLOSY_REPORT_KIT.download(state(),data(period).range);
   toast("تصدير Excel غير متاح");return;
  }
  if(kind==="pdf")return printable();
  if(kind==="share"){
   const s=data(period),text="تقرير فلوسي "+s.range.start+" — "+s.range.end+
     " | الدخل "+fmt(s.income)+" | المصروف "+fmt(s.expense);
   if(navigator.share)navigator.share({title:"تقرير Flosy",text}).catch(()=>{});
   else if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>toast("تم نسخ ملخص التقرير"));
   else toast("المشاركة غير مدعومة على هذا الجهاز");
  }
 }
 function syncNotifications(){
  if(!C)return;
  const rows=core?.FLOSY_REMINDERS?.upcoming?.()||[];
  const items=rows.filter(x=>x&&!x.paid&&!x.linked&&Number(x.days)>=0&&Number(x.days)<=7)
   .slice(0,12).map(x=>({id:String(x.key||x.date),date:String(x.date)}));
  native("notifications-sync",{items});
 }
 function openNotifications(){
  const enabled=lastNativeStatus.enabled===true,granted=lastNativeStatus.permission==="granted";
  showModal("إشعارات فلوسي المحلية",
   '<div class="ultra-nav-note">تنبيه قبل الفاتورة بيوم وفي يوم الاستحقاق بعد موافقتك. لا يقرأ فلوسي رسائل البنك أو إشعارات التطبيقات.</div>'+
   '<p class="text-xs mt-3">'+(enabled?"الإشعارات مفعلة":"الإشعارات متوقفة")+
   (granted?" · إذن Android متاح":" · اطلب إذن Android")+'</p>'+
   '<div class="ultra-ai-voicebar" style="margin-top:13px"><button type="button" id="ultraEnableNotify">تفعيل</button>'+
   '<button type="button" id="ultraTestNotify">تجربة</button>'+
   '<button type="button" id="ultraStopNotify">إيقاف</button></div>',
   ()=>false);
  const form=by("ultraDataForm");const save=q(".ultra-submit",form);if(save)save.hidden=true;
  by("ultraEnableNotify").onclick=()=>{native("notifications-enable");syncNotifications();toast("اتبع رسالة منح الإذن من Android")};
  by("ultraTestNotify").onclick=()=>native("notifications-test");
  by("ultraStopNotify").onclick=()=>{native("notifications-stop");toast("تم إيقاف الإشعارات المحلية")};
  native("notifications-status");
 }
 function installEventHooks(){
  // Override mockup demo-only behaviors BEFORE a user can tap; no synthetic financial entries.
  w.goToScreen=function(id){
   // The original designer keeps activeScreen as a global lexical variable.
   activeScreen=Number(id)||2;
   w.setDisplayMode("interactive");
   qa(".phone-frame").forEach(f=>f.classList.toggle("ultra-active",Number(f.dataset.screen)===activeScreen));
   qa(".phone-frame").filter(f=>Number(f.dataset.screen)===activeScreen)
    .forEach(f=>{const scroll=q(".screen-scroll",f);if(scroll)scroll.scrollTop=0});
   if(activeScreen===8)w.FLOSY_ULTRA_AI?.activate?.();
   if(activeScreen===5)renderAccountOptions();
  };
  w.saveCustomTransaction=saveTransaction;
  w.captureReceiptTransaction=()=>native("receipt-camera")||toast("الكاميرا متاحة في نسخة Android");
  w.triggerVoiceListening=()=>startVoice(false);
  w.addVoiceTransaction=(title,amount,type)=>{
   toast("دي جملة نموذجية. استخدم الميكروفون لتسجيل معاملة حقيقية بدل إضافة مثال جاهز.");
  };
  w.addNewDemoAccount=addAccount;
  w.addNewDemoBudget=addBudget;
  w.filterTransactions=function(type,btn){
   txFilter=type;
   qa(".tx-filter-btn",getFrame(4)).forEach(b=>b.classList.remove("btn-primary-cta"));
   btn?.classList.add("btn-primary-cta");transactionGroups();
  };
  w.searchTransactions=function(query){txQuery=query||"";transactionGroups()};
  w.selectTxType=function(type){
   entryType=["expense","income","transfer"].includes(type)?type:"expense";
   const f=getFrame(5);qa("#tabTypeExpense,#tabTypeIncome,#tabTypeTransfer",f).forEach(b=>b.style.opacity=.55);
   by("tabType"+entryType[0].toUpperCase()+entryType.slice(1))?.style.setProperty("opacity","1");
   const target=by("ultraTargetWrap");if(target)target.hidden=entryType!=="transfer";
  };
  // Original receipt preview contains only DEMO figures; never accept it as a real invoice.
  w.askQuickQuestion=question=>w.FLOSY_ULTRA_AI?.ask?.(question);
  w.sendAiMessage=()=>{const input=by("aiChatInput"),question=input?.value?.trim();if(question){
   input.value="";w.FLOSY_ULTRA_AI?.ask?.(question)}};
  // Turn example form into blank real entry.
  if(by("inputTxAmount"))by("inputTxAmount").value="";
  if(by("inputTxNote"))by("inputTxNote").value="";
  transactionAccountSelects();
  // Original demo receipt confirmation becomes the true native OCR action.
  const scanButton=q('[onclick*="captureReceiptTransaction"]',getFrame(6));
  if(scanButton)scanButton.textContent="📷 تصوير فاتورة حقيقية وتحليلها";
  const receiptLabel=by("receiptScanStatus");if(receiptLabel)receiptLabel.textContent="التصميم المعروض مجرد مثال — ابدأ بالكاميرا";
  const scanning=getFrame(6);
  if(scanning){qa(".receipt-paper",scanning).forEach(el=>el.classList.add("ultra-fake-preview"))}
  const report=getFrame(11);
  qa(".screen-scroll > div:nth-child(4) button",report).forEach((b,i)=>
    b.onclick=()=>exportReports(["share","excel","pdf"][i]));
  handleFilters();
  if(by("txSearchInput"))by("txSearchInput").value="";
  // Home bell is an opt-in local due-date reminder, not a fake banking alert.
  const bell=qa("button",getFrame(2)).find(x=>String(x.getAttribute("onclick")||"").includes("لديك نصيحة"));
  if(bell){bell.onclick=()=>openNotifications();bell.setAttribute("aria-label","تنبيهات فلوسي المحلية")}
  // All demo chat examples are cleared when the real voice/chat engine initializes.
  if(by("aiChatContainer"))by("aiChatContainer").innerHTML="";
  qa(".phone-frame").forEach(f=>f.classList.remove("ring-4"));
 }
 function mountCore(){
  const frame=d.createElement("iframe");frame.id="flosyUltraCore";
  frame.src="./index.html";frame.title="محرك بيانات فلوسي";
  frame.setAttribute("aria-hidden","true");
  frame.style.cssText="position:fixed;inset:auto 0 0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;z-index:-1";
  d.body.appendChild(frame);
  frame.addEventListener("load",()=>{
   try{
    const ready=frame.contentWindow;
    if(!ready?.FLOSY_BRIDGE?.getState)throw Error("البيانات غير متاحة");
    core=ready;C=ready.FLOSY_BRIDGE;w.FLOSY_ULTRA_CORE=ready;
    renderLive(true);renderAccountOptions();syncNotifications();
    by("ultraLoading")?.remove();d.body.classList.add("ultra-ready");
    w.FLOSY_ULTRA_AI?.activate?.();
    setInterval(()=>renderLive(),1800);
    status("تم تحميل بياناتك");
   }catch(e){status("تعذر فتح بياناتك: "+e.message)}
  });
 }
 function setup(){
  if(!D)return;
  d.body.classList.add("ultra-live");
  const mask=d.createElement("div");mask.id="ultraLoading";mask.className="ultra-loading";
  mask.innerHTML='<div><div class="spinner"></div><p style="text-align:center">جاري تجهيز فلوسي وبياناتك...</p><small id="ultraBridgeStatus"></small></div>';d.body.appendChild(mask);
  installEventHooks();installThemes();mountCore();
  const badge=qa(".phone-frame[data-screen='1'] .rounded-full").find(el=>
   /256-Bit|256|مشفر/.test(el.textContent));
  if(badge)badge.textContent="نسخة تجريبية — حافظ على نسختك الاحتياطية";
  w.goToScreen(2);
 }
 w.FLOSY_ULTRA={
  render:()=>renderLive(true),onNativeReceipt:receiptResult,onVoiceText:parseVoiceText,
  startVoice,native,goToScreen:navigate,theme,exportReports,getSummary:()=>snapshot
 };
 w.FLOSY_CAPTURE={receiveNativeVoice:parseVoiceText};
 w.FLOSY_REPAIR={receiveNativeReceipt:receiptResult,
  receiveNativeReceiptImage:()=>{setText(by("receiptScanStatus"),"جاري تحليل صورة الفاتورة...")},
  nativeVoiceStatus:x=>setText(by("voicePromptText"),x),
  nativeVoiceError:x=>toast(x)};
 // Native Android notification bridge still works in Ultra's main frame.
 w.FLOSY_AURORA={
   boot:()=>{theme(localStorage.getItem("flosy_ultra_theme_v1")||"emerald");syncNotifications();},
   onNativeStatus:st=>{lastNativeStatus=st||{};}
 };
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})(window,document);
