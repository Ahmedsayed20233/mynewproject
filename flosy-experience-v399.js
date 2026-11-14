/* Flosy Experience v3.9.9 — unified navigation, quick capture, owner voice option.
 * One visual system and one canonical transaction flow. Never creates a second ledger.
 */
(function(w,d){"use strict";
 const P=w.FLOSY_UNIFIED_PAGES;
 if(!P||typeof P.render!=="function")return;
 const old=P.render;
 const api=()=>w.FLOSY_UNIFIED;
 const routes=[
  {id:2,label:"الرئيسية",icon:"fa-house"},
  {id:4,label:"معاملاتي",icon:"fa-list-ul"},
  {id:5,label:"إضافة",icon:"fa-plus"},
  {id:8,label:"Flosy AI",icon:"fa-robot"},
  {id:16,label:"المزيد",icon:"fa-gear"}
 ];
 const group=id=>id===1?1:[5,6,7,20].includes(id)?5:
  [3,4,13].includes(id)?4:id===8?8:[9,10,11,12,14,15,16,17,18,19].includes(id)?16:2;
 const quick=()=>'<div class="flosy-v399-capture" aria-label="طرق إضافة عملية">'+
  '<button type="button" data-flosy-screen="5"><i class="fa-solid fa-keyboard"></i><b>يدوي</b><small>أضف في ثواني</small></button>'+
  '<button type="button" data-flosy-screen="7"><i class="fa-solid fa-microphone"></i><b>بالصوت</b><small>اتكلم بالمصري</small></button>'+
  '<button type="button" data-flosy-screen="6"><i class="fa-solid fa-camera"></i><b>بفاتورة</b><small>كاميرا أو معرض</small></button></div>';
 function dock(id){
  const frame=d.querySelector('.phone-frame[data-screen="'+Number(id)+'"]');if(!frame)return;
  const oldDock=frame.querySelector(".flosy-nav399");oldDock?.remove();
  if(Number(id)===1)return;
  const nav=d.createElement("nav");nav.className="flosy-nav399";nav.setAttribute("aria-label","القائمة الرئيسية");
  const selected=group(Number(id));
  nav.innerHTML=routes.map(x=>'<button type="button" data-flosy-screen="'+x.id+'"'+
    (x.id===selected?' aria-current="page"':'')+'>'+
    '<i class="fa-solid '+x.icon+'" aria-hidden="true"></i><span>'+x.label+'</span></button>').join("");
  frame.appendChild(nav);
 }
 function capture(id,box){
  if(!box||![2,5,8].includes(id))return;
  if(id===2){
   const marker=box.querySelector(".flosy-v399-home-capture");marker?.remove();
   const slot=d.createElement("section");slot.className="flosy-v399-home-capture";
   slot.innerHTML='<div class="flosy-v399-title"><strong>سجّل حركة جديدة</strong><small>كل الطرق تسجّل في معاملاتك نفسها</small></div>'+quick();
   const hero=box.querySelector(".hero-card");
   if(hero)hero.insertAdjacentElement("afterend",slot);else box.prepend(slot);
  }
  if(id===5){
   const before=box.querySelector(".fx-entry-form");
   if(before&&!box.querySelector(".flosy-v399-entry-switch")){
    const section=d.createElement("section");section.className="flosy-v399-entry-switch";
    section.innerHTML='<strong>اختار طريقة التسجيل</strong>'+quick();
    before.insertAdjacentElement("beforebegin",section);
   }
  }
  if(id===8){
   const pane=box.querySelector('[data-ai-pane="actions"]')||box.querySelector(".faix-host");
   if(pane&&!box.querySelector(".flosy-v399-ai-capture")){
    const section=d.createElement("section");section.className="flosy-v399-ai-capture";
    section.innerHTML='<strong>إضافة معاملة من Flosy AI</strong>'+quick();
    pane.appendChild(section);
   }
  }
 }
 function voice(box){
  const hero=box?.querySelector(".fx-voice-capture");if(!hero)return;
  hero.querySelector(".flosy-v399-voice-opt")?.remove();
  const section=d.createElement("label");section.className="flosy-v399-voice-opt";
  const current=api()?.voiceAutoEnabled?.()===true;
  section.innerHTML='<span><strong>حفظ الكلام الواضح مباشرة</strong><small>اختياري: مبلغ واحد واضح + نوع معروف + حساب قلت اسمه. أي شك يُفتح للتصحيح. الحد 5000 جنيه.</small></span>'+
   '<input type="checkbox" role="switch" aria-label="تفعيل حفظ الصوت الواضح مباشرة" '+(current?"checked":"")+'>';
  section.querySelector("input").addEventListener("change",e=>{
   try{api()?.setVoiceAutoEnabled?.(e.target.checked)}
   catch(err){api()?.notify?.(String(err.message||"تعذر تغيير الاختيار"))}
  });
  hero.appendChild(section);
  const headline=box.querySelector(".fx-page-head p");
  if(headline)headline.textContent=current?
   "العمليات الواضحة تتحفظ مباشرة، والغامضة تتفتح للتصحيح والمراجعة.":
   "سجل بالمصري، صحّح أي كلمة غلط؛ التسجيل المباشر يحتاج تفعيل اختيارك.";
  const status=box.querySelector("#flosyCaptureStatus");
  if(status)status.setAttribute("aria-live","polite");
 }
 function render(id){
  old(id);
  const box=d.querySelector('.phone-frame[data-screen="'+Number(id)+'"] .flosy-real');
  dock(id);capture(Number(id),box);
  if(Number(id)===7)voice(box);
  d.body.classList.add("flosy-experience-v399");
 }
 P.render=render;
 w.FLOSY_EXPERIENCE_V399={version:"3.9.9",routes,group,quick,render};
})(window,document);