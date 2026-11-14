/* Flosy v3.9.5 — auditable navigation consolidation inventory.
 * Eight main money workflows + Settings + Onboarding. Details remain reachable.
 * This module NEVER touches accounts, ledger records, backups or permissions.
 */
(function(root,factory){
 const model=factory();
 if(typeof module==="object"&&module.exports)module.exports=model;
 if(root)root.FLOSY_SCREEN_MAP_V395=model;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const primary=Object.freeze([
  ["2","الرئيسية","ملخص الأرصدة والصرف الآمن","fa-house","main"],
  ["3","أموالي وثروتي","الحسابات والأصول والاستثمارات والزكاة","fa-wallet","wealth"],
  ["4","حركاتي المالية","البحث والتعديل والتفاصيل","fa-right-left","main"],
  ["5","إضافة عملية","يدوي أو صوت مصري أو فاتورة","fa-circle-plus","capture"],
  ["8","مساعد فلوسي AI","اسأل وراجع قرار الشراء","fa-robot","ai"],
  ["9","التزاماتي وديوني","فواتير وأقساط وديون وتقويم استحقاق","fa-calendar-check","plan"],
  ["11","ميزانيتي وخطتي","الميزانية والأهداف والملف المالي والعيلة","fa-bullseye","plan"],
  ["15","تقاريري وتحليلاتي","PDF وExcel والرسوم والرؤى","fa-chart-pie","ai"]
 ]);
 // The following have UNIQUE sub-workflows, so hide from top-level navigation,
 // not from the product. Every existing deep link still works.
 const details=Object.freeze([
  ["6","تصوير وتحليل فاتورة","OCR والمراجعة قبل الحفظ","fa-camera","capture"],
  ["7","التسجيل بالصوت المصري","دخل أو مصروف أو تحويل بعد التأكيد","fa-microphone","capture"],
  ["20","تاريخ أسعار فواتيري","قارن أصناف الفواتير المسجلة","fa-tags","capture"],
  ["10","ديوني وديون الشلة","دفعات وقروض وتقسيم فواتير الأصدقاء","fa-handshake","plan"],
  ["18","تقويم السيولة","الاستحقاقات القادمة وتواريخها","fa-calendar-days","plan"],
  ["12","أهدافي وحصالتي","ادخار مرتبط بحساب حقيقي","fa-piggy-bank","plan"],
  ["17","ملفي المالي وخطة الطوارئ","المرتب والالتزامات والسيولة والاستثمار","fa-user-gear","plan"],
  ["19","ميزانية العيلة","أفراد الأسرة والمصروفات المشتركة","fa-people-roof","plan"],
  ["13","الزكاة التقديرية","النصاب والحول وقيمة الأصول","fa-coins","wealth"],
  ["14","تحليل الإنفاق والاتجاهات","تفاصيل الفئات والرسوم","fa-chart-line","ai"]
 ]);
 // Advanced tools are deep links, not duplicate first-class screens.
 const advanced=Object.freeze([
  ["portfolio","محفظة ثاندر","الأصول الاستثمارية المسجلة","fa-chart-line","wealth",true],
  ["v4-bank","استيراد كشف بنك CSV","إدخال بنك يراجعه صاحبه","fa-file-csv","capture",true],
  ["recurring","إدارة الفواتير المتكررة","تعريف استحقاقات متكررة","fa-calendar-repeat","plan",true],
  ["v4-crisis","محاكاة الأزمات","ماذا يحدث لو انقطع الدخل؟","fa-life-ring","plan",true],
  ["v4-family","المشاركة الأسرية المتقدمة","الأعضاء والصلاحيات والمشاركة","fa-users","plan",true],
  ["rules","قواعد الفئات","تحسين التصنيف والتخصيص","fa-layer-group","settings",true],
  ["recovery","النسخ الاحتياطية والاستعادة","حماية بيانات فلوسي","fa-cloud-arrow-up","settings",true],
  ["settings","إعدادات الحساب والمزامنة","إدارة تسجيل الدخول والسحابة","fa-gear","settings",true],
  ["v4-privacy","الخصوصية والأجهزة","جلسات وقفل وإعدادات الخصوصية","fa-user-shield","settings",true]
 ]);
 const canonical=Object.freeze({1:1,2:2,3:3,4:4,5:5,6:5,7:5,8:8,9:9,10:9,
  11:11,12:11,13:3,14:15,15:15,16:16,17:11,18:9,19:11,20:5});
 function audit(){
  const ids=[1,16,...primary.map(x=>Number(x[0])),...details.map(x=>Number(x[0]))];
  if(ids.length!==20||new Set(ids).size!==20||ids.some(x=>x<1||x>20)||
     Array.from({length:20},(_,i)=>i+1).some(n=>!ids.includes(n)))
   throw Error("Every one of the 20 real screens must have exactly one navigation placement");
  for(const [id,target]of Object.entries(canonical)){
   if(!ids.includes(+id)||![1,16,...primary.map(x=>Number(x[0]))].includes(target))
    throw Error("Invalid canonical screen mapping "+id);
  }
  if(new Set([...primary,...details,...advanced].map(x=>String(x[0]))).size!==
    primary.length+details.length+advanced.length)throw Error("Duplicate navigation target");
  return {screens:20,primary:primary.length,details:details.length,advanced:advanced.length};
 }
 audit();
 return {primary,details,advanced,canonical,canonicalFor:id=>canonical[Number(id)]||null,
  audit,version:"3.9.5"};
});
