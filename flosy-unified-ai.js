/* Flosy unified AI: one voice/chat/chart assistant across every screen.
 * No external model provider calls. Ledger-based explainable local finance reasoning.
 * Not a newly trained LLM: an LLM-ready on-device copilot, with verified arithmetic.
 */
(function(w,d){"use strict";
 let engine=null,session=[],voiceEnabled=false,continuous=false,busy=false,speech=null,rec=null;
 const $=id=>d.getElementById(id);
 const core=()=>w.FLOSY_UNIFIED?.core?.()||null;
 const state=()=>core()?.FLOSY_BRIDGE?.getState?.()||{accounts:[],transactions:[],settings:{}};
 const summary=()=>w.FLOSY_UNIFIED?.summary?.()||{};
 const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const m=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(+n||0)+" ج.م";
 const money=n=>Number(n)>0&&Number.isFinite(+n)?m(n):"0 ج.م";
 const api=()=>w.FLOSY_UNIFIED;
 function hasWords(q,r){return r.test(q)}
 function respond(question){
  const s=summary(),q=String(question||"").slice(0,600).trim(),data=state();
  if(!q)return {text:"اسألني عن مصروفاتك أو حساباتك أو أقساطك، وأنا معاك.",chart:null};
  const priorities=w.FLOSY_NEEDS_V398;
  if(priorities&&/مهم|ضروري|اختياري|غير مهم|في النص|في المنتصف|أولويات المصروف|اولويات المصروف|مصاريف.*قلل|أقلل.*مصاريف|اقدر اقلل|أقدر أقلل/i.test(q)){
   const v=priorities.summarize(data);
   if(!v.count)return {text:"لسه مفيش مصروفات للشهر الحالي تتقسم إلى مهم وفي المنتصف واختياري. سجّل معاملاتك وراجع أولوياتها من سجل المعاملات.",intent:"spending-priorities"};
   return {text:"حسب "+v.count+" مصروف مسجل هذا الشهر: مهم/ضروري "+money(v.totals.essential)+
    "، في المنتصف "+money(v.totals.flexible)+"، واختياري/غير مهم "+money(v.totals.optional)+
    " ("+v.optionalShare+"% من مصروفات الشهر). ده اقتراح قابل للتعديل حسب ظروفك."+
    (v.uncertain?" فيه "+v.uncertain+" عملية مش واضح أهميتها، راجعها بنفسك.":"")+
    " افتح سجل المعاملات لتغيير أهمية كل عملية.",
    chart:{chart_type:"bar",title:"توزيع المصروفات حسب الأهمية",currency:"EGP",data:[
     {name:"مهم",value_minor:Math.round(v.totals.essential*100)},
     {name:"المنتصف",value_minor:Math.round(v.totals.flexible*100)},
     {name:"اختياري",value_minor:Math.round(v.totals.optional*100)}]},intent:"spending-priorities"};
  }
  const personal=w.FLOSY_COPILOT?.answer?.(q,data,new Date());
  if(personal)return personal;
  const finance=w.FLOSY_FINANCE_ENGINE;
  const linkedPlan=finance?.plan?.(data,new Date());
  if(/استثمر كام|استثمر قد ايه|اوفر كام|ادخر كام|احوش كام|خطة مالي|قسّم المرتب|قسم المرتب/.test(q)){
   if(!linkedPlan?.ready)return {text:"علشان أديك رقم حقيقي، افتح الخدمات ← ملفي المالي وحدد المرتب الشهري والالتزامات ومصاريف المعيشة، وبعدها هحسب لك الفائض.",intent:"linked-plan"};
   return {text:"حسب مرتبك المتكرر "+money(linkedPlan.profile.predictableIncome)+
    " والتزاماتك "+money(linkedPlan.profile.livingCost)+
    "، الفائض المحسوب "+money(linkedPlan.monthlySurplus)+
    ". المقترح للطوارئ هذا الشهر "+money(linkedPlan.suggestedEmergency)+
    " والحد المشروط للاستثمار "+money(linkedPlan.suggestedInvestment)+
    ". "+linkedPlan.liquidity+". مش نسبة ثابتة، ورأي استثماري مش مضمون.",
    intent:"linked-plan"};
  }
  if(/زكا[ةه]|نصاب|حول هجري/.test(q)){
   const z=finance?.zakat?.(data);if(!z)return null;
   return {text:"وعاء الزكاة التقديري "+money(z.base)+
    "، النصاب "+(z.nisab===null?"غير محدد لحين إدخال سعر جرام الذهب عيار 21":money(z.nisab))+
    ". تقدير الزكاة بعد تحقق النصاب والحول "+money(z.estimatedZakat)+
    ". راجع شروط الحول والأصول والديون مع دار الإفتاء المصرية.",intent:"zakat"};
  }
  if(/ثروت[يك]|صافي ثروة|اصولي|أصولي/.test(q)){
   const wInfo=finance?.wealth?.(data);
   if(wInfo)return {text:"الفلوس في حساباتك "+money(wInfo.totalCash)+
     "، الأصول الإضافية "+money(wInfo.manualAssets)+
     "، الديون "+money(wInfo.totalDebt)+
     ". صافي الثروة المحسوب "+money(wInfo.netWorth)+".",intent:"wealth"};
  }
  const analytics=core()?.FLOSY_LOCAL_ANALYTICS;
  let answer=null;
  try{answer=analytics?.query?.(q,data,new Date());}catch{}
  if(answer?.chart||answer?.text&&answer.intent!=="out-of-scope")
   return {text:answer.text,chart:answer.chart||null,intent:answer.intent};
  const U=w.FLOSY_ULTRA_DATA;
  if(hasWords(q,/أقدر أشتري|اقدر اشتري|شراء|اشتريها|أشتريها|تقسيط/i)){
   const amount=+(q.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:جنيه|ج|EGP|جنيها)/i)?.[1]||0);
   if(amount>0){
    const safe=s.safe??0,left=Math.round(safe-amount);
    return {text:"المتاح الآمن للصرف عندك "+money(safe)+". لو اشتريت الحاجة دي بـ"+money(amount)+
      " هيتبقى تقريبًا "+money(left)+". "+(left>=0?
       "راجع التزاماتك القريبة قبل ما تقرر.":"المبلغ أكبر من المتاح الآمن؛ راجع خطتك بدل ما تعتمد على قسط افتراضي."),
       chart:{chart_type:"bar",title:"أثر الشراء على المتاح الآمن",currency:"EGP",data:[
        {name:"قبل الشراء",value_minor:Math.max(0,Math.round(safe*100))},
        {name:"بعد الشراء",value_minor:Math.max(0,Math.round(left*100))}]},intent:"afford"};
   }
  }
  if(hasWords(q,/حساب|رصيد|محفظ|ثروة|فلوسي|كاش/i)){
   const list=(s.accounts||[]).map(a=>a.name+": "+money(a.balance)).slice(0,6).join("، ");
   return {text:s.hasAccounts?"إجمالي أرصدتك المسجلة "+money(s.total)+". التفاصيل: "+list+".":"ابدأ بإضافة حساب ورصيده الحقيقي علشان أقدر أردّ بأرقام.",intent:"balance"};
  }
  if(hasWords(q,/قسط|أقساط|التزام|فاتور|جمعية|معاد|ميعاد/i)){
   let upcoming=[];try{upcoming=core()?.FLOSY_REMINDERS?.upcoming?.()||[]}catch{}
   upcoming=upcoming.filter(x=>!x.paid&&x.date).slice(0,5);
   return {text:upcoming.length?
    "دي الالتزامات القادمة المسجلة: "+upcoming.map(x=>(x.title||x.name||"استحقاق")+" "+(x.date||"")).join("، ")+
    ". هتلاقي جدولها كامل في التقويم.":"لسه مفيش التزامات قريبة مكتملة في بياناتك؛ ممكن تضيفها من الفواتير والأقساط.",intent:"bills"};
  }
  if(hasWords(q,/توفير|ادخار|فائض|وفّر|اوفر|استثمار|هدف/i))
   return {text:"الدخل المسجل للفترة "+money(s.income)+"، والمصروفات "+money(s.expense)+
    ". الفرق "+money(s.net)+". الأفضل تربط أي هدف بفائضك الحقيقي بعد الفواتير؛ الحسابات الداخلية مش أرباح.",intent:"saving"};
  if(hasWords(q,/رسم|جراف|بيان|مخطط|chart|فئ|نسب|مصاريف/i)){
   const c=(s.categories||[]).slice(0,7);
   return {text:c.length?"ده توزيع مصروفاتك حسب الفئات المسجلة.":"لسه مفيش مصروفات في الفترة دي علشان نرسمها.",
     chart:c.length?{chart_type:"donut",title:"توزيع الصرف حسب الفئة",currency:"EGP",
      data:c.map(x=>({name:x.name,value_minor:Math.round(x.amount*100)}))}:null,intent:"chart"};
  }
  if(hasWords(q,/اسمك|ازيك|عامل ايه|صباح الخير|أهلا/i))
   return {text:"يا أهلاً! أنا فلوسي AI، مساعدك المالي بالمصري. اسألني «فين راحت فلوسي؟» أو «صرف المواصلات زاد؟» أو «أقدر أشتري حاجة بكام؟».",intent:"greeting"};
  if(hasWords(q,/فين|ازاي|طريقة|إعداد|البرنامج|فلوسي/i))
   return {text:"من «الخدمات» تلاقي الحسابات والأهداف والفواتير والتقارير والخصوصية. وتقدر تسألني عن معاملتك ومصاريفك بالأرقام المسجلة. سؤالك تحديدًا عن أي ميزة؟",intent:"help"};
  return {text:U?.answer?.(q,s)||"أقدر أحلل المصروفات والدخل وأرسم الفئات وأقارن الشهور وأشرح المتاح الآمن. جرب تسألني عن واحدة منهم.",intent:"fallback"};
 }
 function chartHtml(spec){
  if(!spec||!["bar","donut","line"].includes(spec.chart_type)||spec.currency!=="EGP"||!Array.isArray(spec.data))return"";
  const pts=spec.data.slice(0,32).map(x=>({name:String(x.name||"").slice(0,35),
   v:Number.isFinite(+x.value_minor)?Math.max(0,Math.min(1e13,+x.value_minor)):0}));
  if(!pts.some(x=>x.v>0))return"";
  const colors=["var(--primary)","var(--secondary)","var(--accent)","var(--expense)","#8B5CF6","#0EA5E9"];
  const high=Math.max(1,...pts.map(x=>x.v)),total=pts.reduce((a,x)=>a+x.v,0);
  const title=esc(spec.title||"رسم بياني من Flosy");
  if(spec.chart_type==="donut"){
   const R=67,C=2*Math.PI*R;let offset=0;
   const circles=pts.map((x,i)=>{
    const slice=x.v/total*C,out='<circle cx="112" cy="108" r="'+R+'" fill="none" stroke="'+colors[i%colors.length]+
     '" stroke-width="22" stroke-dasharray="'+(slice||0)+' '+C+'" stroke-dashoffset="'+(-offset)+
     '" transform="rotate(-90 112 108)"/>';offset+=slice;return out;
   }).join("");
   return '<figure class="flosy-ai-chart" role="img" aria-label="'+title+'"><figcaption>'+title+'</figcaption>'+
    '<svg viewBox="0 0 330 225" aria-hidden="true">'+circles+
    '<text x="112" y="109" text-anchor="middle" font-size="12" font-weight="900" fill="var(--text-primary)">'+
    esc(new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(total/100))+
    '</text></svg><div style="display:grid;gap:5px;margin-top:4px">'+pts.map((x,i)=>
    '<div style="display:flex;align-items:center;gap:8px;font-size:10px;color:var(--text-primary)">'+
    '<span style="width:8px;height:8px;border-radius:50%;background:'+colors[i%colors.length]+'"></span>'+
    '<span style="flex:1">'+esc(x.name)+'</span><strong>'+esc(m(x.v/100))+'</strong></div>').join("")+'</div></figure>';
  }
  if(spec.chart_type==="line"){
   const points=pts.map((p,i)=>[18+292*i/Math.max(1,pts.length-1),176-150*p.v/high]);
   return '<figure class="flosy-ai-chart"><figcaption>'+title+'</figcaption>'+
    '<svg viewBox="0 0 330 220" role="img" aria-label="'+title+'">'+
    '<path d="M18 176H310" stroke="var(--border)" stroke-width="2"/>'+
    '<polyline points="'+points.map(p=>p.map(n=>n.toFixed(1)).join(",")).join(" ")+
    '" fill="none" stroke="var(--primary)" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>'+
    points.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.5" fill="var(--secondary)"/>').join("")+
    '</svg><small>كل نقطة تمثل إنفاق يوم مسجل. غياب العملية لا يعني غياب الإنفاق.</small></figure>';
  }
  const slot=Math.max(16,Math.floor(292/pts.length));
  return '<figure class="flosy-ai-chart"><figcaption>'+title+'</figcaption>'+
   '<svg viewBox="0 0 330 225" role="img" aria-label="'+title+'"><path d="M15 184H315" stroke="var(--border)"/>'+
   pts.map((p,i)=>{
    const width=Math.max(7,Math.min(40,slot-7)),x=18+i*slot,h=p.v/high*142;
    return '<rect x="'+x+'" y="'+(184-h)+'" rx="5" width="'+width+'" height="'+h+'" fill="'+colors[i%colors.length]+'"/>'+
      '<text x="'+(x+width/2)+'" y="203" text-anchor="middle" font-size="9" fill="var(--text-primary)">'+esc(p.name.slice(0,7))+'</text>';
   }).join("")+'</svg></figure>';
 }
 function addMessage(role,content,chart){
  const stream=$("flosyAiStream");if(!stream)return;
  const item=d.createElement("div");item.className="flosy-message "+(role==="user"?"user":"");
  item.textContent=String(content||"").slice(0,1400);
  stream.appendChild(item);
  if(chart){const fig=d.createElement("div");fig.innerHTML=chartHtml(chart);stream.appendChild(fig)}
  stream.scrollTop=stream.scrollHeight;
 }
 function say(text){
  if(!voiceEnabled)return;
  if(w.FLOSY_NATIVE_BRIDGE_AVAILABLE&&w.FlosyNative?.postMessage){
   try{w.FlosyNative.postMessage(JSON.stringify({action:"ultra-ai-speak",text,locale:"ar-EG",rate:0.96}));return}catch{}
  }
  if(!w.speechSynthesis)return;
  try{
   w.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text).slice(0,1300));
   u.lang="ar-EG";u.rate=.94;u.onend=()=>{if(continuous&&!busy)listen()};w.speechSynthesis.speak(u);
  }catch{}
 }
 function ask(text){
  const q=String(text||"").trim().slice(0,550);if(!q)return null;
  if(hasWords(q,/^(دفعت|اشتريت|صرفت|قبضت|استلمت|دخل|دفعة|حولت|حولت من)/i)&&/\d/.test(q)){
   try{const booked=api()?.fromVoiceText?.(q);
    if(booked?.length){const msg="جهزت "+booked.length+" اقتراح للمراجعة. لم تُحفظ أي عملية قبل اختيار الحساب وتأكيدك.";
      addMessage("user",q);addMessage("assistant",msg);say(msg);return {text:msg,booked};}}
   catch(err){const msg="ما قدرتش أسجل الجملة: "+(err.message||"البيانات ناقصة");
    addMessage("user",q);addMessage("assistant",msg);return {text:msg};}
  }
  const result=respond(q);
  session.push({role:"user",content:q},{role:"assistant",content:result.text});
  if(session.length>90)session.splice(0,session.length-90);
  addMessage("user",q);addMessage("assistant",result.text,result.chart);
  say(result.text);
  return result;
 }
 function listen(){
  if(busy)return;
  busy=true;
  const note=$("flosyAiVoiceStatus");if(note)note.textContent="🎙️ سامعك.. اتكلم بالمصري";
  if(w.FLOSY_NATIVE_ANDROID===true || 
     (w.FLOSY_NATIVE_BRIDGE_AVAILABLE&&w.FlosyNative?.postMessage)){
   const started=api()?.startVoice?.(true);
   if(!started){busy=false;if(note)note.textContent="تعذر فتح الصوت. راجع إذن الميكروفون."}
   return;
  }
  const Speech=w.SpeechRecognition||w.webkitSpeechRecognition;
  if(!Speech){busy=false;if(note)note.textContent="التعرف الصوتي غير متاح على هذا الجهاز";return}
  rec=new Speech();rec.lang="ar-EG";rec.continuous=false;rec.interimResults=false;
  rec.onresult=e=>onVoice(e.results?.[0]?.[0]?.transcript||"");
  rec.onerror=e=>{busy=false;if(note)note.textContent="تعذر الصوت: "+(e.error||"")};
  rec.onend=()=>{busy=false};
  rec.start();
 }
 function onVoice(text){
  busy=false;
  const note=$("flosyAiVoiceStatus");if(note)note.textContent="اتعرفت على كلامك";
  ask(text);
 }
 function stop(){
  continuous=false;voiceEnabled=false;busy=false;
  try{rec?.abort()}catch{}try{w.speechSynthesis?.cancel()}catch{}
  try{w.FlosyNative?.postMessage?.(JSON.stringify({action:"ultra-ai-stop"}))}catch{}
  for(const k of ["flosyAiVoiceToggle","flosyAiContinuous"])$(k)?.setAttribute("aria-pressed","false");
 }
 function mount(container){
  if(!container)return;
  const old=container.innerHTML;
  container.innerHTML='<div class="flosy-ai-header">'+
   '<div class="flosy-ai-avatar"><img src="flosy-ultra-avatar.svg" alt="Flosy AI"></div>'+
   '<div><h3>فلوسي AI · مساعدك المالي</h3><p>مساعد موحّد بالمصري — تحليل محلي ورسومات من معاملاتك الحقيقية</p></div></div>'+
   '<div id="flosyAiStream" class="flosy-ai-stream" role="log" aria-live="polite"></div>'+
   '<div class="flosy-buttonbar" style="margin:8px 0 10px">'+
    '<button type="button" class="flosy-ai-chip" data-ai-q="صرفت كام الشهر ده؟">مصروفات الشهر</button>'+
    '<button type="button" class="flosy-ai-chip" data-ai-q="ارسم فئات المصروفات">رسمة الإنفاق</button>'+
    '<button type="button" class="flosy-ai-chip" data-ai-q="قارن هذا الشهر بالشهر اللي فات">مقارنة الشهور</button>'+
    '<button type="button" class="flosy-ai-chip" data-ai-q="Roast me">🔥 Roast Me</button>'+
    '<button type="button" class="flosy-ai-chip" data-ai-q="نصيحة اليوم">💡 نصيحة اليوم</button></div>'+
   '<form id="flosyAiUnifiedForm" class="flosy-buttonbar" style="flex-wrap:nowrap"><input id="flosyAiUnifiedInput" class="flosy-input" style="flex:1" placeholder="اسأل فلوسي بالمصري..." required>'+
    '<button class="flosy-btn" type="submit" aria-label="إرسال السؤال">إرسال</button></form>'+
   '<div class="flosy-buttonbar"><button id="flosyAiMic" class="flosy-btn flosy-btn-secondary" type="button">🎙️ اتكلم مع فلوسي</button>'+
    '<button id="flosyAiVoiceToggle" class="flosy-btn flosy-btn-secondary" aria-pressed="false" type="button">🔊 الرد بالصوت</button>'+
    '<button id="flosyAiContinuous" class="flosy-btn flosy-btn-secondary" aria-pressed="false" type="button">محادثة متتابعة</button>'+
    '<button id="flosyAiStop" class="flosy-btn flosy-btn-secondary" type="button">إيقاف</button></div>'+
   '<p id="flosyAiVoiceStatus" class="flosy-capture-status" role="status"></p>'+
   '<p class="flosy-muted">المساعد الحالي تحليلي محلي قابل للتطوير لنموذج لغوي لاحقًا، وليس LLM مُدرَّبًا من الصفر. لا يستخدم OpenAI أو Gemini.</p>';
  $("flosyAiUnifiedForm").onsubmit=e=>{e.preventDefault();ask($("flosyAiUnifiedInput").value);$("flosyAiUnifiedInput").value=""};
  container.querySelectorAll("[data-ai-q]").forEach(btn=>btn.onclick=()=>ask(btn.dataset.aiQ));
  $("flosyAiMic").onclick=listen;
  $("flosyAiVoiceToggle").onclick=()=>{
   voiceEnabled=!voiceEnabled;$("flosyAiVoiceToggle").setAttribute("aria-pressed",String(voiceEnabled));
   if(!voiceEnabled)try{w.speechSynthesis?.cancel()}catch{};
  };
  $("flosyAiContinuous").onclick=()=>{
   continuous=!continuous;voiceEnabled=continuous||voiceEnabled;
   $("flosyAiContinuous").setAttribute("aria-pressed",String(continuous));
   $("flosyAiVoiceToggle").setAttribute("aria-pressed",String(voiceEnabled));
  };
  $("flosyAiStop").onclick=stop;
  const person=w.FLOSY_COPILOT?.name?.(state())||"";
  addMessage("assistant",(person?"أهلاً يا "+person+"! ":"يا أهلاً! ")+
   "أنا فلوسي AI. اسألني عن فلوسك، أو اضغط «Roast Me» للتعليق اللطيف على فئات الصرف، أو «نصيحة اليوم» للاقتراح الشخصي.");
 }
 function voiceStatus(message){
  const status=$("flosyAiVoiceStatus");
  if(status)status.textContent=String(message||"");
 }
 function voiceError(message){
  busy=false;
  const status=$("flosyAiVoiceStatus");
  if(status)status.textContent=String(message||"تعذّر التسجيل الصوتي");
 }
 w.FLOSY_UNIFIED_AI={mount,ask,respond,chartHtml,onVoice,listen,stop,
  voiceStatus,voiceError,ttsDone:()=>{if(continuous&&!busy)listen()},
  getHistory:()=>session.slice()};
})(window,document);
