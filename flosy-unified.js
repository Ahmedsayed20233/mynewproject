/* Flosy v3.9 unified app: same-origin canonical ledger bridge, one UI, four themes.
 * Live financial figures only. No mock postings, SMS inbox access or third-party LLM providers.
 */
(function(w,d){"use strict";
 const U=w.FLOSY_ULTRA_DATA;
 const THEMES={
  "clean-light":{label:"النهاري المريح",swatch:"#F8FAFC",status:"#F8FAFC"},
  "emerald-dark":{label:"الزمردي الفاخر",swatch:"#0B1324",status:"#0B1324"},
  "calm-light":{label:"التركواز الهادئ",swatch:"#F4F7F9",status:"#F4F7F9"},
  "serene-dark":{label:"الليلي الهادئ",swatch:"#0B111E",status:"#0B111E"}
 };
 let ledger=null,C=null,current=1,history=[],lastHash="",sourceMode="expense",lastSaved=null;
 let voiceForAI=false,receiptText="",notifyStatus={};
 const by=id=>d.getElementById(id),frame=n=>d.querySelector('.phone-frame[data-screen="'+n+'"]');
 const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const n=x=>Number.isFinite(Number(x))?Number(x):0;
 const money=x=>U?.money?.(x)||new Intl.NumberFormat("ar-EG").format(+x||0)+" ج.م";
 const date=()=>U?.iso?.(new Date())||new Date().toISOString().slice(0,10);
 const state=()=>C?.getState?.()||{accounts:[],transactions:[],settings:{}};
 const tx=()=>U?.cleanTx?.(state())||[];
 const accounts=()=>Array.isArray(state().accounts)?state().accounts:[];
 const balances=()=>{try{return ledger?.FLOSY_PRO?.rowsForAccounts?.()||{}}catch{return{}}};
 const safe=()=>{
  try{
   const engine=w.FLOSY_FINANCE_ENGINE;
   const plan=engine?.plan?.(state());
   const oldCalc=ledger?.FLOSY_PHASE1?.calculate?.()||null;
   if(plan?.ready){
    const liquid=ledger?.FLOSY_PHASE1?.freeCash?.();
    if(!liquid||!Array.isArray(liquid.components)||!liquid.components.length)return null;
    const days=oldCalc?.cycle?.days||30;
    const estimate=engine.safeToSpend(state(),liquid.total,new Date(),days);
    // A future paycheck is NOT cash available today. Never replace the actual
    // balance with forecasted salary or the full monthly discretionary cap.
    return estimate.ready?{...estimate,source:"financeProfileV393-liquid-cash"}:null;
   }
   // Do not present an unconfigured forecast as verified spendable cash.
   const cfg=state().settings||{};
   const legacyReady=n(cfg.salary)>0&&n(cfg.living)>0&&
    Array.isArray(oldCalc?.components)&&oldCalc.components.length>0;
   return legacyReady?{...oldCalc,source:"verified-legacy-budget"}:null;
  }catch{return null}
 };
 const summary=(key="month")=>U?.summary?.(state(),U.periodRange(key),balances(),safe())||{};
 const live=fn=>{if(!C)throw Error("دفتر فلوسي لسه بيتحمّل");return C.mutate(fn)};
 const notify=text=>{const target=by("flosyToastMessage");if(target){target.textContent=text;by("flosyToastBox").hidden=false;
  clearTimeout(notify.timer);notify.timer=setTimeout(()=>by("flosyToastBox").hidden=true,3800);}
  else if(typeof w.showToast==="function")w.showToast(text);
 };
 function bridge(action,fields={}){
  if(w.FLOSY_NATIVE_BRIDGE_AVAILABLE&&w.FlosyNative?.postMessage){
   try{w.FlosyNative.postMessage(JSON.stringify({action,...fields}));return true}catch{}
  }return false;
 }
 function applyTheme(key){
  if(!Object.prototype.hasOwnProperty.call(THEMES,key))key="clean-light";
  d.documentElement.dataset.theme=key;
  d.querySelector('meta[name="theme-color"]')?.setAttribute("content",THEMES[key].status);
  try{localStorage.setItem("flosy_theme_unified_v39",key)}catch{}
  d.querySelectorAll("[data-theme-select]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.themeSelect===key)));
  try{ledger?.document?.documentElement?.setAttribute("data-theme",key)}catch{}
  styleCore();
  bridge("ultra-theme",{theme:key});
 }
 function inferIcon(text,type="expense"){
  const v=String(text||"").toLowerCase().replace(/[أإآ]/g,"ا");
  const explicit=w.FLOSY_CATEGORIES?.classify?.(v,type);
  if(explicit&&explicit.id!=="other"&&explicit.id!=="other-income")return explicit.icon;
  if(/عربيه|عربية|سيارة|عربيات|موتوسيكل|car|vehicle|سيارات/.test(v))return "fa-car-side";
  if(/بنزين|سولار|محطة|fuel/.test(v))return "fa-gas-pump";
  if(/اوبر|تاكسي|مواصلات|مترو|اتوبيس|سرفيس/.test(v))return "fa-bus";
  if(/كهرب|فاتور|عداد/.test(v))return "fa-bolt";
  if(/ميه|مياه|water/.test(v))return "fa-droplet";
  if(/نت|انترنت|wifi|adsl/.test(v))return "fa-wifi";
  if(/موبايل|تليفون|هاتف|شحن رصيد/.test(v))return "fa-mobile-screen";
  if(/طعام|اكل|غدا|عشا|مطعم|وجبة|فطار|برجر|بيتزا/.test(v))return "fa-utensils";
  if(/قهوة|شاي|كافيه|مشروب/.test(v))return "fa-mug-hot";
  if(/سوبرماركت|سوبر ماركت|بقالة|خضار|فاكهة/.test(v))return "fa-basket-shopping";
  if(/هدية|هديه|gift/.test(v))return "fa-gift";
  if(/علاج|دواء|صيدلية|دكتور|مستشف|صحة/.test(v))return "fa-kit-medical";
  if(/مدرسة|تعليم|جامعة|كورس|تدريب/.test(v))return "fa-graduation-cap";
  if(/لبس|هدوم|فستان|جزمة|حذاء|ملابس/.test(v))return "fa-shirt";
  if(/ذهب|دهب|سبيكة|دهبي/.test(v))return "fa-coins";
  if(/ايجار|شقة|منزل/.test(v))return "fa-house";
  if(/مرتب|قبضت|salary|دخل/.test(v)||type==="income")return "fa-money-bill-wave";
  if(/قسط|دين|سلف/.test(v))return "fa-calendar-check";
  if(/ترفيه|سينما|لعبة|اشتراك/.test(v))return "fa-gamepad";
  if(type==="transfer")return "fa-right-left";
  return "fa-wallet";
 }
 function sanitizeName(v){
  const s=String(v||"").replace(/\b(?:OTP|CVV|PIN)\b.*$/i,"")
   .replace(/\b\d{9,}\b/g,"••••").replace(/[\u0000-\u001f<>]/g," ").trim();
  return s.slice(0,90);
 }
 function defaultAccount(){
  const a=accounts();
  let saved="";try{saved=localStorage.getItem("flosy_default_account_v39")||""}catch{}
  if(saved&&a.some(x=>x.id===saved))return saved;
  return a.length===1?a[0].id:"";
 }
 function setDefaultAccount(id){
  if(!accounts().some(a=>a.id===id))return false;
  try{localStorage.setItem("flosy_default_account_v39",id)}catch{}
  return true;
 }
 function rowBase(x,source){
  if(!["income","expense","transfer"].includes(x.type)||!(n(x.amount)>0&&n(x.amount)<1e9)||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||"")))
   throw Error("بيانات الحركة ناقصة، مش هسجل مبلغ غير مؤكد");
  // Do not silently charge another account if a stale/unknown account ID
  // was supplied by a capture integration. Missing IDs may use an explicit default.
  if(x.accountId&&!accounts().some(a=>a.id===x.accountId))
   throw Error("الحساب المحدد غير موجود؛ اختر الحساب الصحيح قبل التسجيل");
  const cents=Number(x.amount)*100;
  if(!Number.isFinite(cents)||cents<1||Math.abs(cents-Math.round(cents))>1e-6)
   throw Error("المبلغ يجب أن يكون بالجنيه والقروش حتى منزلتين فقط");
  const accountId=x.accountId||defaultAccount();
  if(!accountId)throw Error("اختار حساب افتراضي من الخدمات أو أضف حساب أولًا");
  if(x.type==="transfer"&&(!x.targetAccountId||x.targetAccountId===accountId||
   !accounts().some(a=>a.id===x.targetAccountId)))throw Error("التحويل لازم حسابين مختلفين");
  const description=sanitizeName(x.description||x.category||"عملية");
  const categorySpec=w.FLOSY_CATEGORIES?.resolve?.(
   x.category,(x.iconText||"")+" "+description,x.type,
   {preferDescription:source.includes("voice_auto")||source.includes("receipt_auto")});
  const now=new Date().toISOString();
  return {...x,id:"flosy39-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9),
   amount:+Number(x.amount).toFixed(2),date:x.date,accountId,
   description,category:categorySpec?.label||String(x.category||"مشتريات").slice(0,55),
   categoryId:categorySpec?.id||null,categoryColor:categorySpec?.color||null,
   icon:categorySpec?.icon||inferIcon((x.iconText||"")+" "+description+" "+(x.category||""),x.type),
   source,createdAt:now,updatedAt:now,
   sourceHash:x.sourceHash||source+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9)};
 }
 function postBatch(rows,source){
  if(!Array.isArray(rows)||!rows.length)throw Error("لا توجد عمليات واضحة للتسجيل");
  const validated=rows.map(x=>rowBase(x,source));
  const historical=tx();const seen=new Set();
  for(const x of validated){
   const conflict=historical.some(old=>
    (x.sourceHash&&x.sourceHash===old.sourceHash)||
    (x.type===old.type&&+old.amount===x.amount&&old.accountId===x.accountId&&
     old.date===x.date&&String(old.description||"")===x.description&&
     String(old.source||"").startsWith("flosy39")&&
     Math.abs(Date.now()-Date.parse(old.createdAt||""))<120000));
   if(conflict||seen.has(x.sourceHash))throw Error("العملية دي متسجلة بالفعل؛ منعت تكرار خصم الفلوس");
   seen.add(x.sourceHash);
  }
  live(s=>{s.transactions=Array.isArray(s.transactions)?s.transactions:[];
   s.transactions.push(...validated);
  });
  lastSaved=validated.map(x=>x.id);
  showUndo(validated.length);
  renderAll();
  return validated;
 }
 function showUndo(count){
  const b=by("flosyUndoBox");if(!b)return;b.hidden=false;
  by("flosyUndoText").textContent="اتسجلت "+count+" عملية في دفتر فلوسي";
  clearTimeout(showUndo.timer);showUndo.timer=setTimeout(()=>b.hidden=true,16000);
 }
 function undo(){
  if(!lastSaved?.length)return;
  const ids=new Set(lastSaved);lastSaved=null;
  live(s=>{
   s.transactions=s.transactions.filter(x=>!ids.has(x.id));
   s.deletedIds=Array.isArray(s.deletedIds)?s.deletedIds:[];
   for(const id of ids)s.deletedIds.push("transactions/"+id);
  });
  by("flosyUndoBox").hidden=true;renderAll();notify("تم التراجع وتحديث رصيد حساباتك");
 }
 function splitVoice(text){
  const q=String(text||"").trim();
  const parts=q.split(/\s+(?:و|وبعدين|ثم|بعدها|بعد كده)\s+(?=(?:دفعت|اشتريت|صرفت|قبضت|استلمت|بعت)\b)/i);
  return parts.map(x=>x.trim()).filter(Boolean).slice(0,8);
 }
 function contextualName(spoken,row){
  const v=String(spoken||"");
  const patterns=[
   [/اشتريت\s+(?:عربيه|عربية|سيارة)/i,"شراء سيارة"],
   [/اشتريت\s+(?:موبايل|تليفون)/i,"شراء هاتف"],
   [/اشتريت\s+(?:دهب|ذهب|سبيكة)/i,"شراء ذهب"],
   [/مطعم|وجبة|اكل|أكل/i,"وجبة أو مطعم"],
   [/بنزين|سولار/i,"وقود سيارة"],
   [/أوبر|اوبر|تاكسي/i,"مواصلات"],
   [/قهوة|كافيه/i,"قهوة"],
   [/فاتورة\s+الكهرباء/i,"فاتورة الكهرباء"],
   [/مرتب|قبضت/i,"دخل أو مرتب"]
  ];
  return patterns.find(([re])=>re.test(v))?.[1]||row.description||"عملية صوتية";
 }
 function fromVoiceText(text){
  const pars=ledger?.FLOSY_CAPTURE?.parseVoice;if(!pars)throw Error("محرك فهم الصوت لسه ما اتحمّلش");
  const parts=splitVoice(text);
  const rows=parts.map(spoken=>{
   const parsed=pars(spoken);
   if(!parsed||!parsed.amount||!parsed.type)throw Error("ما فهمتش مبلغ أو نوع إحدى المعاملات");
   if(!["expense","income"].includes(parsed.type))throw Error("تحويل الحسابات يحتاج تحديد المصدر والوجهة");
   const normalizedSpoken=String(spoken).toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه");
   const explicitAccount=accounts().find(a=>String(a.name||"").length>=3&&normalizedSpoken.includes(
    String(a.name).toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه")));
   return {...parsed,accountId:explicitAccount?.id||defaultAccount()||parsed.accountId,
    iconText:spoken,description:contextualName(spoken,parsed),
    category:(()=>{
     const precise=w.FLOSY_CATEGORIES?.classify?.(spoken,parsed.type);
     const fallback=w.FLOSY_CATEGORIES?.resolve?.(parsed.category,spoken,parsed.type);
     return precise&& !["other","other-income"].includes(precise.id)?
       precise.label:fallback?.label||parsed.category;
    })(),
    sourceHash:parsed.sourceHash||"voice39-"+String(spoken).slice(0,25)};
  });
  const booked=postBatch(rows,"flosy39_voice_auto");notify("اتسجل كلامك مباشرة، وظهر زر التراجع");
  return booked;
 }
 function fromReceiptText(text){
  const src=String(text||"").trim();
  if(src.length<12)throw Error("الكتابة اللي ظهرت من الفاتورة قليلة؛ حاول بصورة أوضح");
  const parser=ledger?.FLOSY_CAPTURE?.parseReceipt;
  if(!parser)throw Error("محرك الفواتير لسه بيتحمّل");
  const parsed=parser(src);
  if(!parsed||!parsed.amount)throw Error("مفيش إجمالي واضح في الإيصال");
  if(parsed.receiptDetails?.arithmeticConsistent===false&&
     parsed.receiptDetails?.items?.length>=2&&
     parsed.receiptDetails?.arithmeticContradiction===true)
   throw Error("مجموع الأصناف مختلف عن الإجمالي؛ لم أسجّل مبلغًا متناقضًا");
  if(parsed.receiptDetails?.confidence<0.72)
   throw Error("قراءة الإيصال غير مؤكدة؛ صوّر الإيصال مرة ثانية");
  const details=parsed.receiptDetails||{};
  const items=Array.isArray(details.items)?details.items:[];
  const rows=[{...parsed,accountId:defaultAccount()||parsed.accountId,
    description:sanitizeName(parsed.description||"إيصال"),
    category:w.FLOSY_CATEGORIES?.resolve?.(parsed.category,
      items.map(x=>x.name||"").join(" ")+" "+parsed.description,"expense",
      {preferDescription:true})?.label||parsed.category,
    iconText:items.map(x=>x.name).join(" ")||parsed.description}];
  const saved=postBatch(rows,"flosy39_receipt_auto");
  notify("اتسجلت الفاتورة مباشرة واتفعل زر التراجع");return saved;
 }
 let captureBusy=false,receiptBusy=false;
 function captureStatus(id,value,failed=false){
  const el=by(id);if(el){el.textContent=String(value||"");el.dataset.state=failed?"error":"ok";}
 }
 function nativeReceipt(text){
  const src=String(text||"").trim();
  if(!src){captureStatus("flosyReceiptStatus","الإيصال غير واضح؛ صور الوصل تاني بإضاءة أقوى",true);return}
  try{
   const rows=fromReceiptText(src);
   captureStatus("flosyReceiptStatus","✓ اتحفظ "+moneyLocal(rows[0].amount)+" في حسابك.",false);
   if(current===6)go(4);
  }catch(err){
   captureStatus("flosyReceiptStatus",err.message,true);
   const area=by("flosyReceiptPaste");if(area)area.value=src;
   notify(err.message);
  }
 }
 function moneyLocal(n){return new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(+n||0)+" ج.م"}
 async function nativeReceiptImage(imageDataUrl,latinText){
  if(receiptBusy)return;
  receiptBusy=true;captureStatus("flosyReceiptStatus","جارٍ قراءة الفاتورة بالعربي والإنجليزي واستخراج الإجمالي...");
  let text=String(latinText||"").slice(0,12000),ocrError="";
  try{
   const extractor=ledger?.FLOSY_REPAIR?.extractForUnified;
   if(typeof extractor==="function" && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(String(imageDataUrl||""))){
    try{
     const combined=await extractor(imageDataUrl,text);
     if(combined?.trim())text=combined.slice(0,12000);
    }catch(err){ocrError=String(err.message||err);}
   }
   if(text.trim())nativeReceipt(text);
   else{
    const message="لم يظهر إجمالي قابل للقراءة"+(ocrError?"؛ "+ocrError:"")+
     ". جرّب صورة أوضح أو اختار صورة محفوظة.";
    captureStatus("flosyReceiptStatus",message,true);notify(message);
   }
  }finally{receiptBusy=false;}
 }
 function nativeVoice(text){
  captureBusy=false;
  const spoken=String(text||"").trim();
  if(!spoken){captureStatus("flosyCaptureStatus","مش سامع كلام واضح؛ حاول مرة تانية.",true);return}
  if(voiceForAI){voiceForAI=false;w.FLOSY_UNIFIED_AI?.onVoice?.(spoken);return}
  captureStatus("flosyCaptureStatus","سمعت: «"+spoken.slice(0,130)+"»؛ جاري تسجيل العمليات...");
  try{
   const rows=fromVoiceText(spoken);
   captureStatus("flosyCaptureStatus","✓ تم تسجيل "+rows.length+" عملية في حسابك بنجاح");
   if(current===7)go(4);
  }catch(err){captureStatus("flosyCaptureStatus",err.message,true);notify(err.message);}
 }
 function startVoice(forAI=false){
  if(captureBusy)return false;
  voiceForAI=!!forAI;captureBusy=true;
  captureStatus("flosyCaptureStatus","🎙️ جاري فتح الميكروفون. اتكلم بالمصري...");
  if(bridge("voice"))return true;
  if(w.FLOSY_NATIVE_ANDROID===true){
   w.location.href="flosyapp://voice-expense";
   return true;
  }
  const Recognition=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Recognition){captureBusy=false;notify("التعرف الصوتي غير متاح؛ اكتب العملية في خانة التسجيل");return false}
  try{
   const r=new Recognition();r.lang="ar-EG";r.interimResults=false;r.continuous=false;r.maxAlternatives=3;
   r.onresult=e=>nativeVoice(e.results?.[0]?.[0]?.transcript||"");
   r.onerror=e=>{captureBusy=false;captureStatus("flosyCaptureStatus","تعذّر الميكروفون: "+e.error,true);notify("تأكد من إذن الميكروفون وخدمة التعرف الصوتي")};
   r.onend=()=>{captureBusy=false;};
   r.start();return true;
  }catch(err){captureBusy=false;notify("فشل بدء التسجيل: "+err.message);return false}
 }
 function startReceipt(mode="camera"){
  captureStatus("flosyReceiptStatus","📸 جاري فتح "+(mode==="gallery"?"معرض الصور":"الكاميرا")+"...");
  const action=mode==="gallery"?"receipt-ocr":"receipt-camera";
  if(bridge(action))return true;
  if(w.FLOSY_NATIVE_ANDROID===true){
   w.location.href=mode==="gallery"?"flosyapp://ocr-receipt":"flosyapp://receipt-camera";
   return true;
  }
  const input=by("flosyReceiptFile");
  if(input){input.click();return true}
  go(6);notify("افتح قسم الفواتير واختر صورة من الجهاز");return false;
 }
 function go(id,{replace=false}={}){
  const x=Number(id);if(!Number.isInteger(x)||x<1||x>20)return;
  if(!replace&&current!==x)history.push(current);
  if(history.length>50)history=history.slice(-50);
  current=x;
  d.querySelectorAll(".phone-frame").forEach(f=>{const on=+f.dataset.screen===x;
   f.classList.toggle("flosy-active",on);f.setAttribute("aria-hidden",String(!on));
   const scroll=f.querySelector(".flosy-section");if(on&&scroll)scroll.scrollTop=0;
  });
  if(C)w.FLOSY_UNIFIED_PAGES?.render?.(x);
  const activeTab=[9,10,11,12,17,18].includes(x)?11:
   [3,13,14,15,16,19,20].includes(x)?16:x;
  d.querySelectorAll(".flosy-primary-dock .flosy-nav-item").forEach(b=>{
   const active=Number(b.dataset.flosyScreen)===activeTab;
   b.classList.toggle("flosy-current",active);
   if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
  });
  // The unified page owns the assistant mount.
  return x;
 }
 function back(){
  const corePanel=by("flosyLegacyPanel");if(corePanel?.classList.contains("open")){
   closeFeature();return"handled";
  }
  if(by("flosyModal")?.open){by("flosyModal").close();return"handled"}
  if(history.length){go(history.pop(),{replace:true});return"handled"}
  if(current!==2){go(2,{replace:true});return"handled"}
  return"exit";
 }
 function styleCore(){
  const doc=ledger?.document;if(!doc)return;
  let style=doc.getElementById("flosyUnifiedCoreStyle");
  if(!style){style=doc.createElement("style");style.id="flosyUnifiedCoreStyle";doc.head.appendChild(style)}
  const theme=d.documentElement.dataset.theme||"clean-light";
  const map={ "clean-light":{bg:"#F8FAFC",panel:"#FFFFFF",sub:"#F1F5F9",border:"#E2E8F0",text:"#0F172A",muted:"#475569",primary:"#059669",sec:"#4F46E5"},
   "emerald-dark":{bg:"#0B1324",panel:"#131E33",sub:"#172540",border:"#2B3A54",text:"#F8FAFC",muted:"#94A3B8",primary:"#10B981",sec:"#0EA5E9"},
   "calm-light":{bg:"#F4F7F9",panel:"#FFFFFF",sub:"#EBF1F5",border:"#E2E8F0",text:"#0F172A",muted:"#475569",primary:"#0D9488",sec:"#4F46E5"},
   "serene-dark":{bg:"#0B111E",panel:"#151F32",sub:"#1E293B",border:"#2A384A",text:"#F8FAFC",muted:"#94A3B8",primary:"#14B8A6",sec:"#6366F1"}};
  const t=map[theme]||map["clean-light"];
  // Override all old light-only extension cards at source; never display old provider links.
  style.textContent=':root,body,body.light{--bg:'+t.bg+'!important;--panel:'+t.panel+
    '!important;--panel2:'+t.sub+'!important;--outline:'+t.border+'!important;--text:'+t.text+
    '!important;--muted:'+t.muted+'!important;--teal:'+t.primary+'!important;--blue:'+t.sec+
    '!important;--shadow:none!important;color-scheme:'+(/dark/.test(theme)?"dark":"light")+'!important}'+
   'html,body{background:'+t.bg+'!important;color:'+t.text+'!important;font-family:Readex Pro,Cairo,sans-serif!important}'+
   '.shell{display:block!important;min-height:100%}.sidebar,.top,.mobile-dock,.mobile-more-shade{display:none!important}'+
   '.main{width:100%!important;max-width:none!important;padding:14px 12px 50px!important;margin:0!important}'+
   '.card,.v4-surface,.f2-card,.v5-card,.flosy-studio-card,.flosy-ai-bubble{background:'+t.panel+
    '!important;color:'+t.text+'!important;border-color:'+t.border+'!important;box-shadow:none!important;border-radius:16px!important}'+
   '.card h3,.card strong,.v4-surface strong,.f2-card strong,.main h2,.page h2{color:'+t.text+'!important}'+
   '.card p,.muted,.footnote,.v4-fineprint{color:'+t.muted+'!important}'+
   '.field input,.field select,.field textarea,.chip,.btn:not(.primary){background:'+t.sub+
    '!important;color:'+t.text+'!important;border-color:'+t.border+'!important}'+
   '.btn.primary{background:'+t.primary+'!important;color:white!important;border-radius:12px!important}'+
   '.page:not(.active){display:none!important}.page.active{display:block!important}';
  doc.documentElement.dataset.theme=theme;
  if(!doc.getElementById("flosyLegacyTheme391")){
   const link=doc.createElement("link");link.id="flosyLegacyTheme391";
   link.rel="stylesheet";link.href="./flosy-legacy-theme-v391.css?v=3910";
   doc.head.appendChild(link);
  }
  // Original unthemed Gemini/OpenAI controls are never used in the unified app.
  const ai=doc.getElementById("page-ai");
  if(ai&&ai.dataset.flosyRedirect!=="true"){
   ai.innerHTML='<div class="card"><h3>فلوسي AI</h3><p>المساعد الذكي الموحد متاح في شاشة فلوسي AI من قائمة الخدمات.</p></div>';
   ai.dataset.flosyRedirect="true";
  }
 }
 function openFeature(page,label){
  if(!ledger||!C)return notify("جاري تحميل المزايا");
  // Old names are navigation aliases, not a second independent finance app.
  // Unique advanced modules (portfolio trades, CSV, backups, family sharing,
  // recurring editor) remain explicitly accessible inside their home screen.
  const canonicalRoutes={ai:8,wealth:3,"v4-wealth":3,smart:14,
   plan:17,goals:12};
  if(Object.prototype.hasOwnProperty.call(canonicalRoutes,page)){
   closeFeature();go(canonicalRoutes[page]);return;
  }
  const nav=ledger.document.querySelector('.sidebar .nav button[data-page="'+page+'"]');
  const target=ledger.document.getElementById("page-"+page);
  if(!target||!nav){notify("الخاصية دي غير متاحة حاليًا");return}
  nav.click();
  styleCore();
  const modal=by("flosyLegacyPanel");
  by("flosyLegacyTitle").textContent=label||"فلوسي";
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");
 }
 function closeFeature(){const modal=by("flosyLegacyPanel");modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden","true");renderAll();}
 function configurePrimaryNavigation(){
  // Five stable destinations replace the designer-era 20 different bottom docks.
  const destinations=[[2,"الرئيسية","fa-house"],[4,"المعاملات","fa-receipt"],[5,"إضافة","fa-plus"],[11,"خطتي","fa-bullseye"],[16,"المزيد","fa-grip"]];
  const markup=destinations.map(([screen,label,icon])=>
   '<button type="button" class="flosy-nav-item" data-flosy-screen="'+screen+'" aria-label="'+label+'">'+
   '<i aria-hidden="true" class="fa-solid '+icon+'"></i><span>'+label+'</span></button>').join("");
  d.querySelectorAll(".bottom-dock").forEach(dock=>{
   dock.classList.add("flosy-primary-dock");dock.innerHTML=markup;
   dock.setAttribute("aria-label","التنقل الرئيسي");
  });
 }
 function createChrome(){
  const toast=d.createElement("div");toast.id="flosyToastBox";toast.className="flosy-undo";toast.hidden=true;
  toast.innerHTML='<span id="flosyToastMessage">تم التحديث</span>';
  d.body.appendChild(toast);
  const undoBox=d.createElement("div");undoBox.id="flosyUndoBox";undoBox.className="flosy-undo";undoBox.hidden=true;
  undoBox.innerHTML='<span id="flosyUndoText">اتسجلت العملية</span><button type="button" id="flosyUndoButton">تراجع</button>';
  d.body.appendChild(undoBox);by("flosyUndoButton").onclick=()=>undo();
  const panel=d.createElement("section");panel.id="flosyLegacyPanel";panel.className="flosy-floating-core";
  panel.setAttribute("aria-hidden","true");
  panel.innerHTML='<div class="flosy-core-titlebar"><button id="flosyLegacyBack" type="button"><i class="fa-solid fa-arrow-right"></i> رجوع</button>'+
   '<h2 id="flosyLegacyTitle">فلوسي</h2><button id="flosyLegacyServices" type="button">الخدمات</button></div>';
  d.body.appendChild(panel);
  by("flosyLegacyBack").onclick=closeFeature;
  by("flosyLegacyServices").onclick=()=>{closeFeature();go(16)};
 }
 function mountLedger(){
  const iframe=d.createElement("iframe");iframe.id="flosyCoreFrame";
  iframe.src="./index.html?flosy_core=1";iframe.title="محرك البيانات والخدمات المالية";iframe.tabIndex=-1;
  iframe.style.cssText="display:block;width:1px;height:1px;border:0;opacity:0;pointer-events:none;position:absolute;top:-100px";
  by("flosyLegacyPanel").appendChild(iframe);
  iframe.addEventListener("load",()=>{
   try{
    ledger=iframe.contentWindow;C=ledger.FLOSY_BRIDGE;
    if(!C)throw Error("دفتر البيانات غير متاح");
    w.FLOSY_UNIFIED_CORE=ledger;
    iframe.style.cssText="display:block;flex:1;min-height:0;width:100%;border:0;background:var(--bg-app)";
    styleCore();renderAll();syncReminders();
    by("flosyLoading")?.remove();
    const opened=localStorage.getItem("flosy_onboarding_39")==="yes";
    go(opened?2:1,{replace:true});
    if(!mountLedger.timer)mountLedger.timer=setInterval(refreshIfChanged,1500);
   }catch(err){
    const load=by("flosyLoading");if(load)load.textContent="تعذر فتح دفتر فلوسي: "+err.message;
   }
  });
 }
 function syncReminders(){
  const reminders=ledger?.FLOSY_REMINDERS?.upcoming?.()||[];
  const items=reminders.filter(x=>x&&!x.paid&&x.date&&Number(x.days)>=0&&Number(x.days)<=7)
   .slice(0,12).map(x=>({id:String(x.key||x.date),date:x.date}));
  bridge("notifications-sync",{items});
 }
 function refreshIfChanged(){
  if(!C)return;const s=state();
  const hash=String(s._updatedAt||"")+":"+s.transactions?.length+":"+s.accounts?.length+
   ":"+JSON.stringify(s.settings||{});
  if(hash===lastHash)return;
  lastHash=hash;renderAll();syncReminders();
 }
 function renderAll(){if(!C)return;try{w.FLOSY_UNIFIED_PAGES?.render?.(current)}catch(err){notify("خطأ عرض: "+err.message)}}
 function sendReport(kind){
  if(w.FLOSY_REPORT_PRO?.download)return w.FLOSY_REPORT_PRO.download(kind);
  const from=by("flosyReportFrom")?.value||U.periodRange("month").start,
        to=by("flosyReportTo")?.value||date(),range={start:from,end:to};
  if(from>to)return notify("نطاق التقرير غير صالح");
  const kit=ledger?.FLOSY_REPORT_KIT;
  if(kind==="excel"&&kit){
   try{
    const bytes=kit.xlsxBytes(kit.build(state(),range));
    const nativeKit=w.FLOSY_REPORT_KIT;
    if(w.FLOSY_NATIVE_ANDROID===true&&nativeKit?.saveNativeXlsx?.(bytes,range))return;
    const a=d.createElement("a"),blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
    a.href=URL.createObjectURL(blob);a.download="Flosy-"+from+"-"+to+".xlsx";a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2500);
   }catch(err){notify(err.message)}
  }else if(kind==="pdf"){
   const totals=U.summary(state(),range,balances(),safe());
   const el=by("flosyUnifiedPrint")||d.createElement("section");el.id="flosyUnifiedPrint";
   el.style.cssText="direction:rtl;padding:32px";
   el.innerHTML="<h1>فلوسي — التقرير المالي</h1><p>"+esc(from)+" — "+esc(to)+"</p>"+
    "<p>الدخل: "+money(totals.income)+" · المصروفات: "+money(totals.expense)+
    " · الصافي: "+money(totals.net)+"</p>"+
    "<h2>الفئات</h2>"+totals.categories.map(x=>"<p>"+esc(x.name)+" — "+money(x.amount)+"</p>").join("");
   if(!el.isConnected)d.body.appendChild(el);
   if(w.FLOSY_NATIVE_ANDROID)w.location.href="flosyapp://print";
   else{w.print();}
  }else notify("خدمة التقارير مش جاهزة");
 }
 function init(){
  d.body.classList.add("flosy-live");
  createChrome();
  configurePrimaryNavigation();
  const loading=d.createElement("div");loading.id="flosyLoading";
  loading.style.cssText="position:fixed;inset:0;z-index:150;display:grid;place-items:center;background:var(--bg-app);color:var(--text-primary);font-weight:900;text-align:center;padding:20px";
  loading.textContent="فلوسي بيجهّز حساباتك...";d.body.appendChild(loading);
  const currentTheme=(()=>{try{return localStorage.getItem("flosy_theme_unified_v39")||"clean-light"}catch{return"clean-light"}})();
  applyTheme(currentTheme);
  w.FLOSY_ULTRA_AI={nativeSpeechDone:()=>w.FLOSY_UNIFIED_AI?.ttsDone?.()};
  const originalScript=d.querySelectorAll("button[onclick]");
  for(const b of originalScript)if(/simulateWhatsAppBotMsg|payObligationQuick|settleDebtBtn|boostGoal1|executeCompoundVoice|addExtractedTx/.test(b.getAttribute("onclick")||""))b.dataset.mockAction="true";
  // Existing designer navigation is replaced with one-screen navigation; no separate Ultra/pro mode.
  w.goToScreen=id=>{go(id)};
  w.jumpToScreen=id=>{go(id)};
  w.goBackScreen=()=>back();
  w.setTheme=applyTheme;
  w.openQuickDrawer=()=>go(16);
  w.openSmartPlusMenu=()=>go(5);
  w.saveQuickTransaction=()=>{const amount=Number(by("quickAmountInput")?.value);
   const category=by("quickCatValue")?.value||"مشتريات";
   try{postBatch([{type:sourceMode,amount,category,description:category,date:date()}],"flosy39_manual");go(4)}
   catch(err){notify(err.message)}};
  w.addExtractedTx=(category,amount,type="expense")=>{
   try{return postBatch([{type,amount,category,description:category,date:date()}],"flosy39_manual")}
   catch(err){notify(err.message);return[]}};
  w.setEntryType=type=>{sourceMode=["expense","income","transfer"].includes(type)?type:"expense"};
  w.executeCompoundVoice=()=>notify("اضغط الميكروفون وسجّل عملياتك الحقيقية؛ جُمل العرض لا تُخصم من حسابك");
  w.simulateCompoundVoice=()=>startVoice(false);
  w.sendAiPrompt=q=>w.FLOSY_UNIFIED_AI?.ask?.(q);
  w.runAffordabilityCheck=()=>{
   const amt=Number(by("affordInput")?.value),s=summary();
   const out=by("affordOutput");
   if(out)out.textContent=amt>0?(s.safe!==null?
    "السعر "+money(amt)+"، المتاح الآمن "+money(s.safe)+". بعد الشراء "+money(s.safe-amt)+".":"عرّف التزاماتك الأول"):"اكتب سعر الشراء";
  };
  w.payObligationQuick=()=>notify("لتسجيل سداد حقيقي افتح الفواتير وربطها بالحساب؛ المبلغ المخطط ليس مدفوعًا.");
  w.settleDebtBtn=()=>notify("سجّل تسوية الدين بمعاملة فعلية في حسابك أولًا");
  w.boostGoal1=()=>notify("انقل مبلغًا حقيقيًا من حساب لآخر علشان يتحدث هدف الادخار");
  w.simulateWhatsAppBotMsg=()=>notify("واتساب ليس مربوطًا بعد. استخدم مساعد فلوسي داخل التطبيق.");
  w.FLOSY_HANDLE_BACK=back;
  w.FLOSY_CAPTURE={receiveNativeVoice:nativeVoice};
  w.FLOSY_REPAIR={receiveNativeReceipt:nativeReceipt,receiveNativeReceiptImage:nativeReceiptImage,
   nativeVoiceError:message=>{
    captureBusy=false;voiceForAI=false;captureStatus("flosyCaptureStatus",message,true);
    w.FLOSY_UNIFIED_AI?.voiceError?.(message);notify(message);
   },nativeVoiceStatus:message=>{
    captureStatus("flosyCaptureStatus",message);
    w.FLOSY_UNIFIED_AI?.voiceStatus?.(message);
   }};
  w.FLOSY_UNIFIED={
   core:()=>ledger,state,summary,accounts,balances,safe,money,date,esc,inferIcon,
   defaultAccount,setDefaultAccount,postBatch,fromVoiceText,fromReceiptText,
   go,back,applyTheme,openFeature,closeFeature,renderAll,startVoice,startReceipt,
   bridge,sendReport,notify,THEMES,getCurrentScreen:()=>current,
   nativeVoice,nativeReceipt,nativeReceiptImage,captureStatus,
   getLastSaved:()=>lastSaved?.slice()||[]
  };
  mountLedger();
  d.addEventListener("click",e=>{
   const nav=e.target.closest("[data-flosy-screen]");if(nav){go(+nav.dataset.flosyScreen);return}
   const feature=e.target.closest("[data-flosy-feature]");
   if(feature){openFeature(feature.dataset.flosyFeature,feature.dataset.label||"فلوسي");return}
   const theme=e.target.closest("[data-theme-select]");
   if(theme){applyTheme(theme.dataset.themeSelect);return}
   const action=e.target.closest("[data-flosy-action]");
   if(!action)return;
   switch(action.dataset.flosyAction){
    case "listen":startVoice(false);break;
    case "receipt":startReceipt(action.dataset.mode||"camera");break;
    case "ai":go(8);break;
    case "undo":undo();break;
    case "report":sendReport(action.dataset.kind||"pdf");break;
    case "account":addAccountModal();break;
   }
  });
 }
 function addAccountModal(){
  const name=prompt("اسم الحساب الجديد:");if(!name||!name.trim())return;
  const amount=prompt("الرصيد الافتتاحي الحقيقي بالجنيه:","0");
  if(amount===null)return;
  const v=Number(amount);if(!Number.isFinite(v)||v<0||v>1e9)return notify("رصيد غير صحيح");
  const id="flosy39-a"+Date.now().toString(36);
  live(s=>{s.accounts.push({id,name:sanitizeName(name),opening:v,type:"bank",updatedAt:new Date().toISOString()})});
  setDefaultAccount(id);renderAll();notify("اتحفظ الحساب وارتبط بجميع الأدوات");
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})(window,document);
