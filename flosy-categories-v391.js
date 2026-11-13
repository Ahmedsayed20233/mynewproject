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
 def("phone","موبايل ورصيد","البيت والفواتير","fa-mobile-screen-button","#0EA5E9",["شحن رصيد","فودافون","اتصالات","اورانج","وي","باقة مكالمات","شحن تلفون"]),
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
 const all=[...expense,...income,...transfer];
 const groups=kind=>[...new Set((kind==="income"?income:kind==="transfer"?transfer:expense).map(x=>x.group))];
 function normalize(s){return String(s||"").toLowerCase().replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[ًٌٍَُِّْ]/g,"").trim()}
 function forType(type){return type==="income"?income:type==="transfer"?transfer:expense}
 function byLabel(value,type){
  const norm=normalize(value);
  if(!norm)return null;
  return (type?forType(type):all).find(c=>normalize(c.label)===norm||c.id===value)||
    (type?forType(type):all).find(c=>c.keywords.some(k=>normalize(k)===norm))||null;
 }
 function classify(text,type="expense"){
  const value=normalize(text);
  if(!value)return type==="income"?income[income.length-1]:expense[expense.length-1];
  const candidates=forType(type);
  // Most specific noun phrase outranks generic words; "بنزين للعربية" is fuel not purchase.
  for(const c of candidates){
   const sorted=[...c.keywords].sort((a,b)=>normalize(b).length-normalize(a).length);
   if(sorted.some(k=>value.includes(normalize(k))))return c;
  }
  return byLabel(text,type)||candidates[candidates.length-1];
 }
 function resolve(value,description,type="expense"){
  const explicit=byLabel(value,type);
  const inferred=classify(description,type);
  return inferred.id!==(type==="income"?"other-income":"other")&&
    (explicit?.id==="shopping"||explicit?.id==="other"||!explicit)?inferred:explicit||inferred;
 }
 function verify(category,type){return Boolean(byLabel(category,type))}
 return Object.freeze({all,expense,income,transfer,groups,forType,byLabel,classify,resolve,verify,normalize});
});
