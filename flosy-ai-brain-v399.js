/* Flosy AI Brain v3.9.9: grounded Egyptian-language analysis.
 * Local deterministic planner, NOT a generative LLM or a trained ASR model.
 * Pure, auditable accounting; no direct ledger mutation or financial transaction execution.
 */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_AI_BRAIN_V399=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 let previous={intent:"",category:""};
 const normalize=x=>String(x??"").normalize("NFKC").toLowerCase()
  .replace(/[إأآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
  .replace(/[ً-ْـ]/g,"").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
  .replace(/\s+/g," ").trim();
 const format=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(+n||0)+" جنيه";
 const money=n=>Math.round((Number(n)||0)*100)/100;
 const forbiddenStatus=new Set(["pending","failed","rejected","cancelled","canceled","void","draft","reversed"]);
 const action=(label,screen)=>({label,screen});
 const actions={
  ledger:[action("راجع معاملاتك",4),action("أضف عملية",5)],
  budget:[action("افتح الميزانية",11),action("راجع الالتزامات",9)],
  reports:[action("افتح التقارير",15),action("راجع المعاملات",4)],
  accounts:[action("افتح حساباتي",3),action("أضف عملية",5)]
 };
 function rows(data){
  const deleted=new Set((data?.deletedIds||[]).filter(x=>typeof x==="string").map(x=>x.split("/").pop()));
  return (Array.isArray(data?.transactions)?data.transactions:[]).filter(x=>{
   const a=Number(x?.amount),d=String(x?.date||"");
   return !x?.deleted&&!deleted.has(String(x?.id))&&!forbiddenStatus.has(String(x?.status||"").toLowerCase())&&
    Number.isFinite(a)&&a>0&&["expense","income"].includes(x?.type)&&/^\d{4}-\d{2}-\d{2}$/.test(d);
  });
 }
 const iso=(y,m,d)=>[y,String(m).padStart(2,"0"),String(d).padStart(2,"0")].join("-");
 function monthRange(at,offset=0){
  const first=new Date(at.getFullYear(),at.getMonth()+offset,1);
  const last=new Date(first.getFullYear(),first.getMonth()+1,0);
  return {from:iso(first.getFullYear(),first.getMonth()+1,1),
   to:iso(last.getFullYear(),last.getMonth()+1,last.getDate()),
   label:offset===-1?"الشهر اللي فات":"الشهر الحالي"};
 }
 function range(q,at){
  if(/الشهر اللي فات|الشهر السابق|الشهر الماضي|last month/.test(q))return monthRange(at,-1);
  if(/النهارده|النهاردة|اليوم|today/.test(q)){
   const today=iso(at.getFullYear(),at.getMonth()+1,at.getDate());
   return {from:today,to:today,label:"النهاردة"};
  }
  if(/امبارح|امس|yesterday/.test(q)){
   const d=new Date(at.getFullYear(),at.getMonth(),at.getDate()-1);
   const day=iso(d.getFullYear(),d.getMonth()+1,d.getDate());
   return {from:day,to:day,label:"امبارح"};
  }
  if(/الاسبوع ده|الاسبوع الحالي|هذا الاسبوع/.test(q)){
   const start=new Date(at.getFullYear(),at.getMonth(),at.getDate()-((at.getDay()+1)%7));
   return {from:iso(start.getFullYear(),start.getMonth()+1,start.getDate()),
    to:iso(at.getFullYear(),at.getMonth()+1,at.getDate()),label:"الأسبوع الحالي"};
  }
  if(/السنه دي|السنة دي|السنه الحاليه|هذه السنه|هذا العام/.test(q))
   return {from:iso(at.getFullYear(),1,1),to:iso(at.getFullYear(),12,31),label:"السنة الحالية"};
  return monthRange(at,0);
 }
 const aggregate=(arr,key="category")=>{
  const totals=new Map();
  for(const x of arr){const name=String(x[key]||"غير مصنف").trim().slice(0,75)||"غير مصنف";
   totals.set(name,money((totals.get(name)||0)+Number(x.amount)));}
  return [...totals].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount);
 };
 function chart(data,title,type="donut"){
  return data.length?{chart_type:type,title,currency:"EGP",
   data:data.slice(0,7).map(x=>({name:x.name,value_minor:Math.round(x.amount*100)}))}:null;
 }
 const detectCategory=q=>{
  const p=[["مواصلات",/مواصلات|اوبر|تكسي|تاكسي|بنزين|مترو|سواق|uber/],
   ["أكل",/اكل|مطعم|فطار|غدا|عشا|وجبات|طعام|سوبرماركت/],
   ["قهوة",/قهوه|كافيه|كوفي|coffee/],["إيجار",/ايجار|سكن|شقه/],
   ["أقساط",/قسط|اقساط/],["علاج",/صيدلي|مستشفي|دوا|دواء|علاج/],
   ["هدايا",/هديه|هدايا/],["ترفيه",/ترفيه|سينما|نتفليكس|العاب/]];
  return p.find(([,pattern])=>pattern.test(q))?.[0]||"";
 };
 const matchCategory=(tx,key)=>{
  const s=normalize([tx.category,tx.subcategory,tx.description].join(" "));
  return key==="مواصلات"?/مواصلات|اوبر|تاكسي|بنزين|مترو|سواق|uber/.test(s):
   key==="أكل"?/اكل|مطعم|فطار|غدا|عشا|وجبات|سوبرماركت/.test(s):
   key==="قهوة"?/قهوه|كافيه|كوفي|coffee/.test(s):
   key==="إيجار"?/ايجار|شقه|سكن/.test(s):
   key==="أقساط"?/قسط|اقساط/.test(s):
   key==="علاج"?/صيدلي|مستشفي|دواء|علاج/.test(s):
   key==="هدايا"?/هديه|هدايا/.test(s):/ترفيه|سينما|نتفليكس|العاب/.test(s);
 };
 function answer(question,data={},snapshot={},at=new Date()){
  const q=normalize(question).slice(0,600);if(!q)return null;
  const all=rows(data),period=range(q,at),selected=all.filter(x=>x.date>=period.from&&x.date<=period.to);
  const exp=selected.filter(x=>x.type==="expense"),income=selected.filter(x=>x.type==="income");
  const spent=money(exp.reduce((a,x)=>a+Number(x.amount),0));
  const earned=money(income.reduce((a,x)=>a+Number(x.amount),0));
  const parts=aggregate(exp),largest=parts.slice(0,3);
  const periodText=period.label;
  const comparison=/قارن|مقارنه|الفرق|زادت|قلت|تحسن|اللي فات.*الشهر|الشهر.*اللي فات/.test(q)&&
   /شهر|مصاريف|صرف|انفاق|المقارنه|قارن/.test(q);
  if(comparison){
   const curr=monthRange(at),last=monthRange(at,-1);
   const curRows=all.filter(x=>x.type==="expense"&&x.date>=curr.from&&x.date<=curr.to);
   const oldRows=all.filter(x=>x.type==="expense"&&x.date>=last.from&&x.date<=last.to);
   const a=money(curRows.reduce((v,x)=>v+Number(x.amount),0));
   const b=money(oldRows.reduce((v,x)=>v+Number(x.amount),0));
   previous={intent:"spending",category:""};
   if(!curRows.length||!oldRows.length)return {intent:"v399-compare",text:
    "مقدرش أقارن الشهرين بشكل عادل: "+(curRows.length?"":"الشهر الحالي مفيهوش مصروفات، ")+
    (oldRows.length?"":"الشهر الماضي مفيهوش مصروفات. ")+
    "سجل بيانات الفترتين وبعدين أعرضلك الفرق الحقيقي.",actions:actions.ledger};
   const delta=money(a-b),pct=b?Math.round(Math.abs(delta)/b*1000)/10:null;
   return {intent:"v399-compare",text:"حسب العمليات المسجلة: الشهر الحالي "+format(a)+
    " ("+curRows.length+" عملية)، والشهر السابق "+format(b)+" ("+oldRows.length+
    " عملية). "+(delta>0?"الإنفاق زاد بمقدار ":delta<0?"الإنفاق قل بمقدار ":"الإنفاق متساوٍ: ")+
    format(Math.abs(delta))+(pct===null?"":" (حوالي "+pct+"%)")+
    ". المقارنة بالشهر الجاري غير المكتمل تقديرية وليست توقعًا.",
    chart:chart([{name:"الشهر الماضي",amount:b},{name:"الشهر الحالي",amount:a}],"مقارنة الإنفاق","bar"),
    actions:actions.reports};
  }
  const spendingWords=/صرفت|صرف|مصروف|مصاريف|انفاق|اتدفعت|فلوسي راحت|راحت فلوسي|فين الفلوس|أكبر فئ|اكبر فئ|كتر حاجه|أكتر حاجه|اكتر حاجه|توزيع فلوسي/.test(q);
  const totalQuestion=/كام|قد ايه|مجموع|اجمالي|النهارده|امبارح|اللي فات|المصاريف|الصرف/.test(q);
  const followUp=/^(و|طيب|طب)\s*(الشهر|امبارح|النهارده|الاسبوع|نفس|اللي فات)|^والشهر اللي فات/.test(q);
  const wantsSpending=spendingWords||(followUp&&previous.intent==="spending");
  const category=detectCategory(q)||(followUp?previous.category:"");
  if(wantsSpending){
   previous={intent:"spending",category};
   const usedCategory=category?exp.filter(x=>matchCategory(x,category)):exp;
   const n=usedCategory.length,total=money(usedCategory.reduce((a,x)=>a+Number(x.amount),0));
   if(category)return {intent:"v399-category",text:n?
    "مصروف "+category+" في "+periodText+" = "+format(total)+" من "+n+
    " عملية مسجلة. دي معاملات موجودة في سجل فلوسي، وممكن تراجعها بالتفصيل.":
    "مش لاقي مصروفات من نوع "+category+" مسجلة في "+periodText+
    ". ده مش معناه إنك ما صرفتش؛ معناه إن مفيش تسجيل مطابق في التطبيق.",
    actions:actions.ledger};
   if(!exp.length)return {intent:"v399-spending",text:"مش لاقي مصروفات مسجلة في "+periodText+
    ". أضف مصروف يدويًا أو بالصوت أو بالإيصال وبعدها أقدر أحللها.",actions:actions.ledger};
   const top=largest.map(x=>x.name+" "+format(x.amount)).join("؛ ");
   const explain=/(فين|ليه|اكتر|اكثر|حلل|تحليل|توزيع|راحت|كتر)/.test(q);
   return {intent:"v399-spending",text:"مصروفاتك في "+periodText+" = "+format(spent)+
    " من "+exp.length+" عملية فعلية. "+(explain?"أكبر الفئات: "+top+". ":"")+
    "التحويلات بين حساباتك مش محسوبة كمصروفات. تقدر تضغط «راجع معاملاتك» لتعديل أي تصنيف.",
    chart:chart(parts,"المصروفات حسب الفئة"),
    actions:actions.ledger};
  }
  if(/قبضت كام|دخل كام|الدخل كام|ايراد|المرتب نزل كام|كسبت كام/.test(q)){
   previous={intent:"income",category:""};
   return {intent:"v399-income",text:income.length?
    "الدخل المسجل في "+periodText+" = "+format(earned)+" من "+income.length+
    " عملية. التحويلات الداخلية غير محسوبة دخل.":
    "مافيش دخل مسجل في "+periodText+". المرتب المتوقع في ملفك مش معناها إنه اتقبض.",
    actions:actions.ledger};
  }
  if(/عايز اسجل|عاوز اسجل|ازاي اسجل|اضيف مصروف|اسجل فاتور|صوره فاتور|بالصوت|ميكروفون|اضافه عمليه|اضافة عملية/.test(q))
   return {intent:"v399-help-capture",text:"أسرع طريقة: اضغط «+ إضافة» واختار يدوي، صوت، أو تصوير فاتورة. الصوت الواضح يقدر يتحفظ مباشرة بعد تفعيل الخيار من شاشة الصوت، وأي كلام ناقص بيتفتح للتصحيح. الفواتير تفضل بمراجعة الإجمالي.",actions:[action("إضافة عملية",5),action("سجل بالصوت",7),action("صوّر فاتورة",6)]};
  if(/مش فاهم|مش عارف|مساعده|تعمل ايه|ماذا تستطيع|ساعدني|ايه الخدمات/.test(q))
   return {intent:"v399-help",text:"أقدر أحسب اللي صرفته النهاردة أو الشهر، أقارن بالشهر السابق، أوضح أكبر الفئات، أساعدك توصل لتسجيل الصوت والفواتير، وأربطك بخطة الميزانية. كل إجابة رقمية مرتبطة بما سجّلته أنت بالفعل.",actions:[action("المعاملات",4),action("الميزانية",11),action("إضافة",5)]};
  return null;
 }
 function reset(){previous={intent:"",category:""}}
 return {answer,rows,normalize,range,aggregate,reset,version:"3.9.9"};
});