/* Flosy local analytics (deterministic, not a LLM).
 * All arithmetic is read-only against the user's on-device ledger.
 * SVG charts render from validated ChartSpec, never model-written HTML. */
(function(w){"use strict";
const PALETTE=["#0D5E4F","#308DC1","#FF9664","#8965C7","#E7BB43","#4BB69D"];
const dateISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const monthISO=d=>dateISO(d).slice(0,7);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const minor=n=>Number.isFinite(Number(n))&&Number(n)>0&&Number(n)<1e9?Math.round(Number(n)*100):0;
const fmt=c=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(c/100)+" ج.م";
function rows(state,month,today){
 return (Array.isArray(state?.transactions)?state.transactions:[]).filter(t=>
   typeof t?.date==="string"&&t.date.slice(0,7)===month&&t.date<=today&&
   !["failed","pending","draft","reversed","cancelled"].includes(String(t.status||"").toLowerCase())&&
   ["expense","income"].includes(t.type)&&minor(t.amount)>0);
}
function summarize(state,month,today){
 const entries=rows(state,month,today),categories={},daily={},ids={};
 let expense=0,income=0;
 for(const t of entries){
   const v=minor(t.amount);
   if(t.type==="income"){income+=v;continue}
   expense+=v;
   const category=String(t.category||"غير مصنف").slice(0,55);
   categories[category]=(categories[category]||0)+v;
   daily[t.date]=(daily[t.date]||0)+v;
   if(t.id!==undefined)(ids[category]||=[]).push(String(t.id).slice(0,90));
 }
 return {month,expense,income,count:entries.length,categories,daily,ids};
}
function rank(summary){return Object.entries(summary.categories).sort((a,b)=>b[1]-a[1]).slice(0,6)}
function chart(type,title,series){
 return {chart_type:type,title,currency:"EGP",data:series.map(x=>({
   name:String(x.name).slice(0,55),value_minor:Math.max(0,Math.floor(x.value_minor||0))
 }))};
}
function questionIntent(q){
 const s=String(q||"").toLowerCase().trim();
 if(/roast|اتريق|تريق|تحفيل|انتقد مصاريفي/.test(s))return "roast";
 if(/why.*(transport|uber|taxi)|ليه.*(مواصلات|اوبر|أوبر|بنزين)|مواصلات.*(غالي|غالية|زادت)|transportation.*high/.test(s))return "transport";
 if(/vs|versus|compare|مقارنه|مقارنة|الشهر.*(?:اللي فات|السابق|الماضي)|last month|مقابل الشهر/.test(s))return "compare";
 if(/trend|منحنى|منحني|خلال الأيام|خلال الايام|كل يوم|daily.*spend/.test(s))return "trend";
 if(/top categor|categor|categories|فئ|تصنيف|أكبر.*صرف|اكتر.*صرف|أكثر.*صرف|فين راحت/.test(s))return "categories";
 if(/how did i spend|spent this month|how much.*spend|spending this month|صرفت.*(?:الشهر|قد ايه|كام)|مصروفاتي|مصاريف.*الشهر|صرف.*الشهر/.test(s))return "month";
 if(/ميزاني|توفير|ادخار|قسط|أقساط|دين|فلوس|حساب|safe to spend|آمن|امن|اصرف|أصرف|راتب|مرتب|طوار|الفواتير|تحويل|سجل|عملية/.test(s))return "other-finance";
 return "out-of-scope";
}
function query(question,state={},now=new Date()){
 const intent=questionIntent(question);
 if(intent==="out-of-scope")return {intent,text:"أنا مساعد Flosy المالي فقط؛ أقدر أشرح معاملاتك وميزانيتك وحساباتك ومميزات البرنامج، لكن الأسئلة خارج فلوسي مش ضمن شغلي.",chart:null};
 if(intent==="other-finance")return null; // Other audited Flosy local tools cover these cases.
 const month=monthISO(now),prev=monthISO(new Date(now.getFullYear(),now.getMonth()-1,1));
 const today=dateISO(now),current=summarize(state,month,today),previous=summarize(state,prev,today);
 const ordered=rank(current);
 if(!current.count&&intent!=="compare")return {intent,text:"مافيش معاملات مسجلة كفاية للشهر ده. سجّل مصروفات أو استورد كشف حساب، وفلوسي هيرسم التحليل من البيانات الفعلية.",chart:null};
 if(intent==="compare"){
   const difference=current.expense-previous.expense;
   const direction=difference>0?"زيادة":difference<0?"انخفاض":"بدون تغير";
   const pct=previous.expense>0?Math.round(100*Math.abs(difference)/previous.expense):null;
   return {intent,text:"مقارنة "+month+" مع "+prev+": صرفت "+fmt(current.expense)+" مقابل "+fmt(previous.expense)+
     ". الفرق "+direction+" بمقدار "+fmt(Math.abs(difference))+
     (pct===null?"؛ لا يمكن حساب نسبة تغير لعدم وجود مصروفات سابقة.":" ("+pct+"٪).")+
     " التحويلات بين حساباتك غير محسوبة كمصروفات.",
     chart:chart("bar","الشهر الحالي مقابل السابق",[{name:prev,value_minor:previous.expense},{name:month,value_minor:current.expense}])};
 }
 if(intent==="transport"){
   const sum=s=>Object.entries(s.categories).filter(([k])=>/مواصل|بنزين|اوبر|أوبر|تاكسي|taxi|uber|transport|fuel/i.test(k)).reduce((a,[,v])=>a+v,0);
   const cur=sum(current),pre=sum(previous),delta=cur-pre;
   if(!cur&&!pre)return {intent,text:"مش شايف مصروفات مواصلات مسجلة في الشهر الحالي أو السابق؛ ما ينفعش أقول إنها عالية من غير بيانات.",chart:null};
   const all=rows(state,month,today).filter(t=>t.type==="expense"&&/مواصل|بنزين|اوبر|أوبر|تاكسي|taxi|uber|transport|fuel/i.test(t.category||""));
   const average=all.length?Math.round(cur/all.length):0;
   return {intent,text:"المواصلات الشهر ده "+fmt(cur)+" من "+all.length+" عمليات، بمتوسط "+fmt(average)+
    " للعملية. الشهر السابق "+fmt(pre)+". الفرق "+(delta>0?"زيادة ":"انخفاض ")+fmt(Math.abs(delta))+
    ". راجع تكرار الرحلات والمبالغ الكبيرة؛ الأرقام مش دليل وحدها على سبب الزيادة.",
    chart:chart("bar","تحليل المواصلات",[{name:"الشهر السابق",value_minor:pre},{name:"الشهر الحالي",value_minor:cur}])};
 }
 if(intent==="roast"){
   if(!ordered.length)return {intent,text:"مش هعمل Roast على معاملات مش موجودة 😄 سجّل مصاريفك الأول.",chart:null};
   const [top,value]=ordered[0],share=current.expense>0?Math.round(100*value/current.expense):0;
   return {intent,text:"😄 واضح إن فئة «"+top+"» واخدة "+share+"٪ من مصروفاتك المسجلة! "+
     "مش هحكم عليك، بس الحساب بيقول إنك لو راجعت أكبر 3 عمليات فيها ممكن تلاقي فرصة للتوفير. "+
     "إجمالي المصروفات "+fmt(current.expense)+"؛ خليك ذكي مش قاسي على نفسك.",
     chart:chart("donut","فين راحت فلوسك؟",ordered.map(([name,value_minor])=>({name,value_minor})))};
 }
 if(intent==="trend"){
   const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
   const points=Array.from({length:Math.min(days,now.getDate())},(_,i)=>{
     const d=month+"-"+String(i+1).padStart(2,"0");
     return {name:String(i+1),value_minor:current.daily[d]||0};
   });
   return {intent,text:"منحنى الإنفاق اليومي للشهر "+month+" مبني على "+current.count+
    " معاملة دخل أو مصروف مسجلة. إجمالي المصروف "+fmt(current.expense)+
    ". يوم بدون معاملة مسجلة لا يعني بالضرورة أنك لم تصرف.",
    chart:chart("line","الإنفاق اليومي",points)};
 }
 const categoryText=ordered.map(([name,value],i)=>String(i+1)+". "+name+": "+fmt(value)).join(" | ");
 return {intent,text:"مصروفات الشهر "+month+": "+fmt(current.expense)+" من "+current.count+
  " معاملة دخل/مصروف مسجلة. "+(ordered.length?"أكبر الفئات: "+categoryText:"لا توجد فئات مصروفات.")+
  " التحويلات الداخلية مستبعدة من الإجمالي.",
  chart:chart("donut","توزيع المصروفات حسب الفئة",ordered.map(([name,value_minor])=>({name,value_minor})))};
}
function renderChart(spec){
 if(!spec||!["bar","donut","line"].includes(spec.chart_type)||
    !Array.isArray(spec.data)||spec.data.length>40||spec.currency!=="EGP")return "";
 const data=spec.data.map(x=>({name:String(x.name||"").slice(0,55),
  v:Number.isFinite(x.value_minor)&&x.value_minor>=0&&x.value_minor<1e13?Math.floor(x.value_minor):0}));
 if(!data.length||data.every(x=>x.v===0))return "";
 const title=esc(spec.title||"تحليل فلوسي");
 let shapes="";
 if(spec.chart_type==="donut"){
   const total=data.reduce((a,x)=>a+x.v,0),radius=63,circ=2*Math.PI*radius;
   let offset=0;
   shapes=data.map((x,i)=>{
     const portion=x.v/total*circ;
     const s='<circle cx="100" cy="100" r="'+radius+'" fill="none" stroke="'+PALETTE[i%PALETTE.length]+
        '" stroke-width="25" stroke-dasharray="'+Math.max(0,portion-0.9).toFixed(3)+' '+circ.toFixed(3)+
        '" stroke-dashoffset="'+(-offset).toFixed(3)+'" transform="rotate(-90 100 100)" />';
     offset+=portion;return s;
   }).join("")+'<circle cx="100" cy="100" r="42" fill="#fff"/>'+
      '<text x="100" y="104" text-anchor="middle" font-size="14" fill="#0D5E4F">'+
      esc(new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(total/100))+'</text>';
 }else if(spec.chart_type==="bar"){
   const high=Math.max(1,...data.map(x=>x.v));
   shapes=data.map((x,i)=>{const h=130*x.v/high;
     return '<rect x="'+(30+i*110)+'" y="'+(170-h)+'" width="54" height="'+h+'" rx="7" fill="'+PALETTE[i%PALETTE.length]+'"/>'+
      '<text x="'+(57+i*110)+'" y="187" font-size="11" text-anchor="middle" fill="#375b5d">'+esc(x.name)+'</text>';
   }).join("");
 }else{
   const high=Math.max(1,...data.map(x=>x.v));
   const points=data.map((x,i)=>(20+(i*285/Math.max(1,data.length-1))).toFixed(1)+","+(166-145*x.v/high).toFixed(1)).join(" ");
   shapes='<path d="M20 166 H305" stroke="#bdcfcb" stroke-width="1"/>'+
     '<polyline points="'+points+'" fill="none" stroke="#0D5E4F" stroke-width="3" stroke-linejoin="round"/>';
 }
 const legend=spec.chart_type==="donut"?'<div style="display:flex;flex-wrap:wrap;gap:7px;font-size:11px">'+
   data.map((x,i)=>'<span style="padding:4px 7px;border-radius:7px;background:#f3f7f6">'+
   '<span style="color:'+PALETTE[i%PALETTE.length]+'">●</span> '+esc(x.name)+' '+esc(fmt(x.v))+'</span>').join("")+'</div>':"";
 return '<figure role="img" aria-label="'+title+'" style="margin:12px 0;padding:10px;border:1px solid #e0ece7;border-radius:16px;background:#fff;color:#123">'+
   '<figcaption style="font-weight:700;margin:4px 0 7px">'+title+'</figcaption>'+
   '<svg viewBox="0 0 330 210" style="width:100%;max-height:215px" aria-hidden="true">'+
   shapes+'</svg>'+legend+'</figure>';
}
w.FLOSY_LOCAL_ANALYTICS={query,renderChart,summarize,questionIntent,version:"1.0.0-local"};
})(window);