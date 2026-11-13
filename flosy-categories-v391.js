/* Flosy v3.9.1: universal category design tokens, not an independent ledger.
 * Changes here appear in manual entry, transaction history, assistant and old pages.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_CATEGORIES=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const def=(id,label,group,icon,color,keywords=[])=>({id,label,group,icon,color,keywords});
 const expense=[
 def("food","مطاعم ووجبات","الأكل والشرب","fa-utensils","#F97316",["مطعم","مطاعم","اكل","أكل","وجبة","برجر","بيتزا","فطار","غداء","عشاء","فراخ","كشري","وجبات","fast food"]),
 def("groceries","سوبر ماركت وبقالة","الأكل والشرب","fa-basket-shopping","#EAB308",["بقالة","سوبرماركت","سوبر ماركت","خضار","فاكهة","سوبر","ماركت","بقاله","grocery"]),
 def("coffee","قهوة وكافيهات","الأكل والشرب","fa-mug-hot","#A16207",["قهوة","كافيه","نسكافيه","كابتشينو","شاي","قهوه","كوفي","cafe","coffee"]),
 def("transport","مواصلات وأوبر","المواصلات والسيارات","fa-bus","#3B82F6",["مواصلات","أوبر","اوبر","تاكسي","مترو","أتوبيس","اتوبيس","ميكروباص","تذكرة","uber"]),
 def("fuel","بنزين وصيانة سيارة","المواصلات والسيارات","fa-gas-pump","#0EA5E9",["بنزين","سولار","وقود","زيت عربية","صيانه عربيه","صيانة عربية","بوجيهات","كاوتش","fuel"]),
 def("vehicle","شراء سيارة","المواصلات والسيارات","fa-car-side","#2563EB",["اشتريت عربية","شراء عربية","اشتريت عربيه","عربية جديدة","سيارة جديدة","شراء سيارة","موتوسيكل"]),
 def("rent","إيجار","البيت والفواتير","fa-house","#8B5CF6",["إيجار","ايجار","الشقة","البيت ايجار","rent"]),
 def("electricity","كهرباء","البيت والفواتير","fa-bolt","#F59E0B",["كهرباء","كهربا","عداد كهرباء","شحن كهرباء"]),
 def("water","مياه وغاز","البيت والفواتير","fa-droplet","#06B6D4",["مياه","ميه","فاتورة مياه","الغاز","غاز طبيعي"]),
 def("internet","إنترنت","البيت والفواتير","fa-wifi","#6366F1",["إنترنت","انترنت","نت أرضي","adsl","باقه نت","باقة نت","wifi"]),
 def("phone","موبايل ورصيد","البيت والفواتير","fa-mobile-screen-button","#0EA5E9",["شحن رصيد","فودافون","اتصالات","اورانج","شركة وي","باقة مكالمات","شحن تلفون"]),
 def("home","مستلزمات البيت","البيت والفواتير","fa-couch","#14B8A6",["أدوات منزلية","اثاث","عفش","فرش","مكنسة","مستلزمات البيت","حاجات للبيت"]),
 def("clothes","ملابس وأحذية","التسوق والرفاهية","fa-shirt","#EC4899",["ملابس","هدوم","تيشيرت","جزمة","حذاء","بنطلون","جاكت","فستان","قميص"]),
 def("shopping","مشتريات أخرى","التسوق والرفاهية","fa-bag-shopping","#D946EF",["شراء","اشتريت","مشتريات","شوبينج","تسوق"]),
 def("electronics","إلكترونيات وموبايل","التسوق والرفاهية","fa-laptop","#7C3AED",["لابتوب","كمبيوتر","موبايل جديد","تليفون جديد","سماعة","شاشة","تابلت","الكترونيات"]),
 def("entertainment","ترفيه وسينما","التسوق والرفاهية","fa-film","#F43F5E",["سينما","حفلة","تذاكر","خروجة","خروجه","ترفيه","فيلم","ملاهي"]),
 def("subscriptions","اشتراكات وتطبيقات","التسوق والرفاهية","fa-repeat","#8B5CF6",["نتفليكس","سبوتيفاي","اشتراك","يوتيوب","تطبيق","منصة"]),
 def("gifts","هدايا","التسوق والرفاهية","fa-gift","#E11D48",["هدية","هديه","هدايا","عيد ميلاد","مناسبة"]),
 def("pharmacy","صيدلية وأدوية","الصحة والتعليم","fa-prescription-bottle-medical","#22C55E",["صيدلية","دواء","علاج","ادوية","أدوية","صيدليه"]),
 def("doctor","دكاترة وتحاليل","الصحة والتعليم","fa-stethoscope","#10B981",["دكتور","طبيب","كشف","تحليل","تحاليل","أشعة","اشعة","مستشفى"]),
 def("gym","رياضة وجيم","الصحة والتعليم","fa-dumbbell","#84CC16",["جيم","نادي رياضي","رياضة","بروتين","سباحة"]),
 def("education","تعليم وكورسات","الصحة والتعليم","fa-graduation-cap","#0D9488",["جامعة","مدرسة","تعليم","كورس","كتب دراسية","دراسة","دروس","مصروفات مدرسة"]),
 def("books","كتب وأدوات مكتبية","الصحة والتعليم","fa-book-open","#16A34A",["كتاب","كتب","قلم","طباعة","تصوير ورق","مكتبة"]),
 def("travel","سفر وفنادق","السفر والعلاقات","fa-plane","#0891B2",["سفر","طيران","طائرة","تذاكر طيران","فندق","رحلة","تأشيرة"]),
 def("family","أسرة وأطفال","السفر والعلاقات","fa-people-roof","#9333EA",["أطفال","طفل","حضانه","حضانة","عيلة","الأسرة","اسرتي"]),
 def("charity","تبرعات وزكاة","السفر والعلاقات","fa-hand-holding-heart","#059669",["صدقة","تبرع","زكاة","خير","تبرعات"]),
 def("installment","أقساط وديون","الالتزامات","fa-calendar-check","#EF4444",["قسط","أقساط","تقسيط","دين","سلفة","سلف","قرض"]),
 def("association","جمعيات","الالتزامات","fa-users","#A855F7",["جمعية","جمعيه","جمعيات"]),
 def("fees","رسوم وعمولات","الالتزامات","fa-file-invoice-dollar","#64748B",["رسوم","عمولة","غرامة","مصاريف تحويل","رسوم بنكية"]),
 def("gold","ذهب وسبائك","الاستثمار والأصول","fa-coins","#D97706",["ذهب","دهب","سبيكة","سبايك","مصنعية","عيار"]),
 def("investment","استثمار وثاندر","الاستثمار والأصول","fa-chart-line","#0F766E",["ثاندر","اسهم","أسهم","صندوق استثمار","شهادات","اذون خزانة"]),
 def("other","مصروفات أخرى","أخرى","fa-wallet","#64748B",[])
 ];
 const income=[
 def("salary","مرتب وراتب","الدخل","fa-money-bill-wave","#059669",["مرتب","راتب","قبضت","salary","راتبي"]),
 def("freelance","عمل حر ومشاريع","الدخل","fa-briefcase","#0D9488",["فريلانس","freelance","عميل","مشروع","شغل إضافي"]),
 def("bonus","مكافآت وبدلات","الدخل","fa-award","#22C55E",["مكافأة","بدل","بونص","bonus","حافز"]),
 def("gift-income","هدية مالية","الدخل","fa-gift","#8B5CF6",["هدية فلوس","هدية نقدية","عيدية"]),
 def("investment-income","عوائد استثمار","الدخل","fa-chart-line","#16A34A",["توزيعات أرباح","فايدة شهادة","عوائد","أرباح استثمار"]),
 def("refund","استرداد ومردود","الدخل","fa-rotate-left","#0891B2",["استرداد","مرتجع","رجعولي","رد فلوس"]),
 def("other-income","دخل آخر","الدخل","fa-circle-plus","#0F766E",[])
 ];
 const cash="cash";const transfer=[def("transfer","تحويل بين حساباتي","التحويلات","fa-right-left","#6366F1",[])];
 expense.push(
 def("instapay-fees","رسوم إنستاباي والتحويلات","البيت والفواتير","fa-money-bill-transfer","#6366F1",["انستاباي","instapay","رسوم تحويل"]),
 def("insurance","تأمين طبي وسيارات","الصحة والتعليم","fa-shield-heart","#10B981",["تأمين","تامين","بوليصة"]),
 def("government","مصالح حكومية","الالتزامات","fa-building-columns","#475569",["مرور","تجديد رخصة","مصلحة حكومية","ضرايب","ضرائب"]),
 def("maintenance","صيانة وإصلاحات","البيت والفواتير","fa-screwdriver-wrench","#0891B2",["صيانة","سباك","كهربائي","اصلاحات"]),
 def("childcare","حضانة ومصاريف أطفال","السفر والعلاقات","fa-baby","#D946EF",["حضانة","حفاضات","بامبرز","أطفال"]),
 def("gaming","ألعاب وأجهزة","التسوق والرفاهية","fa-gamepad","#F97316",["بلايستيشن","ألعاب","جيمز"]),
 def("petcare","الحيوانات الأليفة","أخرى","fa-paw","#A16207",["قطط","كلاب","طعام حيوانات"])
 );
 income.push(
 def("side-business","مشروع جانبي","الدخل","fa-store","#0D9488",["بيزنس","مشروع جانبي","مبيعات"]),
 def("rent-income","دخل إيجار","الدخل","fa-house-circle-check","#16A34A",["إيجار داخل","دخل ايجار"]),
 def("commission-income","عمولات ومبيعات","الدخل","fa-percent","#059669",["عمولة شغل","كوميشن"]),
 def("pension-income","معاش وتقاعد","الدخل","fa-person-cane","#2563EB",["معاش","راتب تقاعدي"])
 );
 const obligation=[
 def("rent-fixed","إيجار ثابت","التزامات شهرية","fa-house","#8B5CF6",["إيجار"]),
 def("installment-car","قسط سيارة","أقساط","fa-car-side","#3B82F6",["عربية","قسط سيارة"]),
 def("installment-phone","قسط موبايل","أقساط","fa-mobile-screen","#0EA5E9",["قسط موبايل"]),
 def("bnpl","فاليو / تمارا / تقسيط","أقساط","fa-credit-card","#F43F5E",["فاليو","تمارا","تقسيط"]),
 def("association-fixed","جمعية شهرية","التزامات شهرية","fa-users","#A855F7",["جمعية"]),
 def("internet-fixed","إنترنت واشتراكات","التزامات شهرية","fa-wifi","#6366F1",["إنترنت"]),
 def("school-fixed","مصروفات مدرسة / حضانة","التزامات أسرية","fa-school","#D946EF",["مدرسة"]),
 def("medical-fixed","تأمين وعلاج دوري","التزامات أسرية","fa-heart-pulse","#059669",["علاج"]),
 def("loan-fixed","قرض بنكي","ديون","fa-building-columns","#EF4444",["قرض"]),
 def("friend-fixed","سداد دين للشلة","ديون","fa-people-group","#F97316",["دين"]),
 def("support-fixed","دعم الأسرة","التزامات أسرية","fa-people-roof","#14B8A6",["مصروف بيت"])
 ];
 const all=[...expense,...income,...transfer,...obligation];
 const groups=kind=>[...new Set(forType(kind).map(x=>x.group))];
 function normalize(s){return String(s||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[ًٌٍَُِّْ]/g,"").trim()}
 function forType(type){
  const base=type==="income"?income:type==="transfer"?transfer:type==="obligation"?obligation:expense;
  const state=(typeof window!=="undefined"?window:null)?.FLOSY_UNIFIED?.state?.();
  const custom=state?.settings?.customCategoriesV393;
  const records=Array.isArray(custom)?custom:[];
  return [...base,...records.filter(c=>c?.type===type&&typeof c.label==="string"&&
   typeof c.icon==="string"&&/^fa-[a-z-]+$/.test(c.icon)&&
   /^#[0-9a-fA-F]{6}$/.test(String(c.color)))];
 }
 function byLabel(value,type){
  const norm=normalize(value);
  if(!norm)return null;
  const candidates=type?forType(type):[...forType("expense"),...forType("income"),...forType("transfer"),...forType("obligation")];
  return candidates.find(c=>normalize(c.label)===norm||c.id===value)||
    candidates.find(c=>Array.isArray(c.keywords)&&c.keywords.some(k=>normalize(k)===norm))||null;
 }
 function classify(text,type="expense"){
  const value=normalize(text);
  if(!value)return type==="income"?income[income.length-1]:expense[expense.length-1];
  const candidates=forType(type);
  // Rank matches globally by specific phrase length, not declaration order.
  // "اشتريت أدوية" must pick pharmacy, not the generic "اشتريت" keyword.
  let best=null,score=-Infinity;
  for(const c of candidates){
   for(const key of c.keywords||[]){
    const token=normalize(key);if(!token||!value.includes(token))continue;
    const generic=["shopping","other","other-income"].includes(c.id);
    const valueScore=token.length-(generic?30:0);
    if(valueScore>score){best=c;score=valueScore}
   }
  }
  return best||byLabel(text,type)||candidates[candidates.length-1];
 }
 function resolve(value,description,type="expense",options={}){
  const explicit=byLabel(value,type);
  const inferred=classify(description,type);
  const meaningful=inferred&&!["other","other-income"].includes(inferred.id);
  // Model-generated categories are suggestions; the merchant/item noun wins.
  // A category deliberately tapped by the user remains authoritative.
  if(options.preferDescription===true&&meaningful)return inferred;
  return meaningful&&(explicit?.id==="shopping"||explicit?.id==="other"||!explicit)?
    inferred:explicit||inferred;
 }
 function verify(category,type){return Boolean(byLabel(category,type))}
 return Object.freeze({all,expense,income,transfer,obligation,groups,forType,byLabel,classify,resolve,verify,normalize});
});
