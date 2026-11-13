/* Flosy v2 — user-confirmed multi-transaction capture preview.
 * Never posts from an OCR/ASR/model callback. No raw audio, photo or transcript
 * is persisted by this module. All posted accounts are validated against owned IDs.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_CAPTURE_REVIEW_V2=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const labels={expense:"مصروف",income:"دخل",transfer:"تحويل بين حساباتي",
  refund:"استرداد يحتاج ربط",debt:"سلفة/دين",none:"غير مكتمل أو سؤال"};
 const errors={none:"السؤال أو النفي أو العملية الفاشلة لا يُغيّر الرصيد.",
  refund:"سجل الاسترداد بربط المصروف الأصلي؛ لا نحوله لدخل جديد.",
  debt:"القروض والسلف تحتاج سجل الذمم؛ لا نحسبها دخلاً أو مصروفاً استهلاكياً."};
 const escape=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let pending=null;
 const validDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split("-").map(Number),dt=new Date(y,m-1,d);
  return dt.getFullYear()===y&&dt.getMonth()+1===m&&dt.getDate()===d;
 };
 function sourceHash(p,amount,from,to,date){
  if(p.sourceHash)return String(p.sourceHash);
  const key=[p.text,p.intent,amount,from,to,date,Math.floor(Date.now()/300000)].join("|");
  let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);
  return "flosy-capture-v2-"+(h>>>0).toString(16);
 }
 function prepareRows(items,fields,owned){
  if(!Array.isArray(items)||!items.length)throw Error("لا توجد معاملات لمراجعتها");
  const ids=new Set((owned||[]).filter(a=>a?.id).map(a=>String(a.id)));
  return items.map((p,i)=>{
   if(!["expense","income","transfer"].includes(p.intent))
    throw Error("توجد حركة غير مكتملة أو دين/استرداد يحتاج مساراً خاصاً؛ لم يُحفظ شيء.");
   const amount=Number(fields["amount-"+i]),date=String(fields["date-"+i]||"");
   const accountId=String(fields["account-"+i]||""),targetAccountId=p.intent==="transfer"?
     String(fields["target-"+i]||""):"";
   const description=String(fields["description-"+i]||"").trim().slice(0,90).replace(/[<>]/g,"");
   if(!Number.isFinite(amount)||amount<=0||amount>=1e9||!validDate(date)||!ids.has(accountId)||!description)
    throw Error("راجع مبلغ وتاريخ وحساب ووصف الحركة رقم "+(i+1));
   if(p.intent==="transfer"&&(!ids.has(targetAccountId)||targetAccountId===accountId))
    throw Error("التحويل يحتاج حسابين مختلفين مملوكين لك.");
   const category=String(p.category||
    (p.intent==="income"?"دخل آخر":p.intent==="transfer"?"تحويل داخلي":"مشتريات"));
   return {type:p.intent,amount:Math.round(amount*100)/100,date,accountId,targetAccountId,
    description,category,sourceHash:sourceHash(p,amount,accountId,targetAccountId,date)};
  });
 }
 function close(){
  if(typeof document!=="undefined")document.getElementById("flosyReviewOverlayV2")?.remove();
  pending=null;
 }
 function open({items,kind="voice",accounts=[],save,onSaved}){
  if(typeof document==="undefined"||typeof save!=="function")throw Error("واجهة المراجعة غير متاحة");
  if(!Array.isArray(items)||!items.length)throw Error("لم أفهم أي عملية واضحة للمراجعة");
  close();pending={items,kind,accounts,save,onSaved};
  const node=document.createElement("div");node.id="flosyReviewOverlayV2";node.className="flosy-v2-overlay";
  const choices=(name,i,val="")=>'<select name="'+name+'-'+i+'" required>'+
   '<option value="">اختر حساباً من حساباتك</option>'+
   accounts.filter(a=>a?.id&&a?.name).map(a=>'<option value="'+escape(a.id)+'"'+(a.id===val?" selected":"")+'>'+escape(a.name)+'</option>').join("")+'</select>';
  const blocked=items.some(p=>!["income","expense","transfer"].includes(p.intent));
  node.innerHTML='<section class="flosy-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="flosyV2Title" dir="rtl">'+
   '<header><div><small>FLOSY • معاينة قبل الحفظ</small><h2 id="flosyV2Title">'+(kind==="receipt"?"مراجعة الفاتورة":"مراجعة الكلام المسموع")+'</h2>'+
   '<p>لسه ما اتحفظتش أي عملية. راجع الأرقام واختار الحساب بنفسك.</p></div>'+
   '<button type="button" data-v2-cancel aria-label="إغلاق">✕</button></header>'+
   '<form id="flosyV2Form">'+items.map((p,i)=>{
    const eligible=["income","expense","transfer"].includes(p.intent);
    return '<fieldset'+(eligible?"":' class="flosy-v2-blocked"')+'><legend>عملية '+(i+1)+' • '+escape(labels[p.intent]||"غير معروفة")+'</legend>'+
      '<p class="flosy-v2-transcript">'+escape(p.text||p.description||"فاتورة")+'</p>'+
      (!eligible?'<p class="flosy-v2-alert">'+escape(errors[p.intent]||"لا يمكن تسجيل هذه العملية.")+'</p>':"")+
      '<div class="flosy-v2-grid"><label>المبلغ بالجنيه<input type="number" min="0.01" max="999999999" step=".01" name="amount-'+i+'" value="'+escape(p.amount??"")+'"'+(eligible?" required":" disabled")+'></label>'+
      '<label>التاريخ<input type="date" name="date-'+i+'" value="'+escape(p.date||"")+'"'+(eligible?" required":" disabled")+'></label>'+
      '<label>الحساب المصدر'+choices("account",i,p.accountId)+'</label>'+
      (p.intent==="transfer"?'<label>الحساب المستلم'+choices("target",i,p.targetAccountId)+'</label>':"")+
      '<label class="flosy-v2-wide">الوصف<input type="text" name="description-'+i+'" maxlength="90" value="'+escape(p.description|| (kind==="receipt"?"فاتورة":labels[p.intent]||"عملية"))+'"'+(eligible?" required":" disabled")+'></label>'+
      '</div></fieldset>';
   }).join("")+
   '<p class="flosy-v2-note">تفسير اللهجة أو نتيجة OCR مش ضمان للدقة. لا نحتفظ هنا بالنص الخام أو صورة الإيصال. الحفظ بعد موافقتك فقط.</p>'+
   '<div id="flosyV2Error" role="alert"></div><footer><button type="button" data-v2-cancel>إلغاء بدون حفظ</button>'+
   '<button type="submit"'+(blocked?' disabled title="هناك عملية غير قابلة للحفظ"':'')+'>تأكيد وحفظ '+items.length+' عملية</button></footer></form></section>';
  document.body.appendChild(node);
  node.querySelectorAll("[data-v2-cancel]").forEach(b=>b.addEventListener("click",close));
  node.querySelector("#flosyV2Form").addEventListener("submit",e=>{
   e.preventDefault();if(!pending)return;
   const fields=Object.fromEntries(new FormData(e.currentTarget).entries());
   try{
    const rows=prepareRows(pending.items,fields,pending.accounts);
    const saved=pending.save(rows);
    const callback=pending.onSaved;
    close();if(typeof callback==="function")callback(saved);
   }catch(err){const el=node.querySelector("#flosyV2Error");el.textContent=String(err.message||"تعذر الحفظ");}
  });
  node.querySelector("h2")?.setAttribute("tabindex","-1");
  node.querySelector("h2")?.focus();
  return {pending:items.length,blocked};
 }
 return {open,close,prepareRows,validDate,autoPost:false,version:"2.0.0-preview"};
});
