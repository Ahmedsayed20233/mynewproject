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
  const useSelection=fields["review-selection"]==="on";
  const chosen=items.map((p,i)=>({p,i})).filter(({i})=>!useSelection||fields["include-"+i]==="on");
  if(!chosen.length)throw Error("اختار عملية واحدة على الأقل قبل الحفظ");
  return chosen.map(({p,i})=>{
   if(!["expense","income","transfer"].includes(p.intent))
    throw Error("العمليات غير المكتملة والديون والاستردادات تحتاج مساراً خاصاً؛ لم يُحفظ شيء.");
   const amount=Number(fields["amount-"+i]),date=String(fields["date-"+i]||"");
   const accountId=String(fields["account-"+i]||""),targetAccountId=p.intent==="transfer"?String(fields["target-"+i]||""):"";
   const description=String(fields["description-"+i]||"").trim().slice(0,90).replace(/[<>]/g,"");
   if(!Number.isFinite(amount)||amount<=0||amount>=1e9||!validDate(date)||!ids.has(accountId)||!description)
    throw Error("راجع مبلغ وتاريخ وحساب ووصف الحركة رقم "+(i+1));
   if(p.intent==="transfer"&&(!ids.has(targetAccountId)||targetAccountId===accountId))
    throw Error("التحويل يحتاج حسابين مختلفين مملوكين لك.");
   const category=String(p.category|| (p.intent==="income"?"دخل آخر":p.intent==="transfer"?"تحويل داخلي":"مشتريات"));
   let receiptDetails=p.receiptDetails;
   if(p.intent==="expense"&&receiptDetails){
    const original=Array.isArray(receiptDetails.items)?receiptDetails.items:[];
    const itemIndices=Object.keys(fields||{}).filter(k=>k.startsWith("receipt-name-"+i+"-"))
     .map(k=>Number(k.slice(("receipt-name-"+i+"-").length)))
     .filter(j=>Number.isInteger(j)&&j>=0&&j<60).sort((a,b)=>a-b);
    const itemsEdited=itemIndices.map(j=>{
     const item=original[j]||{};
     const name=String(fields["receipt-name-"+i+"-"+j]??item.name??"").trim().slice(0,80);
     const qty=Number(fields["receipt-qty-"+i+"-"+j]??item.quantity);
     const price=Number(fields["receipt-price-"+i+"-"+j]??item.unitPrice);
     if(!name||!Number.isFinite(qty)||qty<=0||qty>100000||!Number.isFinite(price)||price<0||price>=1e9)
      throw Error("راجع اسم وكمية وسعر الصنف رقم "+(j+1));
     return {name,quantity:qty,unitPrice:price,total:Math.round(qty*price*100)/100};
    });
    const tax=Number(fields["receipt-tax-"+i]??receiptDetails.tax??0);
    const discount=Number(fields["receipt-discount-"+i]??receiptDetails.discount??0);
    if(!Number.isFinite(tax)||tax<0||!Number.isFinite(discount)||discount<0)
     throw Error("الضريبة والخصم لا يجوز أن يكونا سالبين");
    const itemsSum=Math.round(itemsEdited.reduce((v,x)=>v+x.total,0)*100)/100;
    const expected=Math.round((itemsSum+tax-discount)*100)/100;
    if(itemsEdited.length>0&&Math.abs(expected-amount)>.05)
     throw Error("مجموع الأصناف بعد الضريبة والخصم "+expected+" جنيه لا يساوي إجمالي الفاتورة "+amount+" جنيه");
    receiptDetails={...receiptDetails,items:itemsEdited,itemsSum,tax,discount,
     arithmeticConsistent:Math.abs(expected-amount)<=.05,arithmeticContradiction:Math.abs(expected-amount)>.05};
   }
   return {type:p.intent,amount:Math.round(amount*100)/100,date,accountId,targetAccountId,
    description,category,...(receiptDetails?{receiptDetails}:{}),sourceHash:sourceHash(p,amount,accountId,targetAccountId,date)};
  });
 }
 function close(){
  if(typeof document!=="undefined")document.getElementById("flosyReviewOverlayV2")?.remove();
  pending=null;
 }
 function receiptEditor(p,i){
  const details=p?.receiptDetails||null;
  if(!details)return "";
  const list=Array.isArray(details.items)?details.items:[];
  const warns=Array.isArray(details.extractionWarnings)?details.extractionWarnings:[];
  const rows=list.map((it,j)=>'<div class="flosy-v2-item-row">'+
   '<label>الصنف<input name="receipt-name-'+i+'-'+j+'" maxlength="80" required value="'+escape(it.name||"")+'"></label>'+
   '<label>الكمية<input type="number" min="0.001" step="0.001" required name="receipt-qty-'+i+'-'+j+'" value="'+escape(it.quantity??1)+'"></label>'+
   '<label>سعر الوحدة<input type="number" min="0" step="0.01" required name="receipt-price-'+i+'-'+j+'" value="'+escape(it.unitPrice??0)+'"></label></div>').join("");
  return '<details class="flosy-v2-items" open><summary>راجع الفاتورة والصنف والمبلغ ('+list.length+' صنف)</summary>'+
   (warns.length?'<div class="flosy-v398-warnings" role="status"><strong>محتاج مراجعتك:</strong>'+
    warns.map(x=>'<p>• '+escape(x)+'</p>').join("")+'</div>':'')+
   '<div class="flosy-v398-line-items">'+rows+'</div>'+
   (!list.length?'<p>OCR ما حددش الأصناف بدقة. ممكن تضيف أصناف يدويًا أو تحفظ إجمالي الفاتورة بعد التأكد منه.</p>':'')+
   '<button type="button" class="flosy-v398-add-item" data-add-receipt-item="'+i+'">+ إضافة صنف مفقود</button>'+
   '<div class="flosy-v2-item-row"><label>الضريبة<input type="number" min="0" step="0.01" name="receipt-tax-'+i+'" value="'+escape(details.tax??0)+'"></label>'+
   '<label>الخصم<input type="number" min="0" step="0.01" name="receipt-discount-'+i+'" value="'+escape(details.discount??0)+'"></label></div>'+
   '<p role="status" class="flosy-v2-item-sum" data-receipt-calc="'+i+'"></p>'+
   '<p class="flosy-v398-tips">اقرأ اسم المحل والإجمالي والتاريخ. لو الوصل باهت، صوره مستقيمًا بإضاءة ثابتة بدون انعكاس.</p>'+
   '</details>';
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
  const eligibleCount=items.filter(p=>["income","expense","transfer"].includes(p.intent)).length;
  node.innerHTML='<section class="flosy-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="flosyV2Title" dir="rtl">'+
   '<header><div><small>FLOSY • معاينة قبل الحفظ</small><h2 id="flosyV2Title">'+(kind==="receipt"?"مراجعة الفاتورة":"مراجعة الكلام المسموع")+'</h2>'+
   '<p>لسه ما اتحفظتش أي عملية. راجع الأرقام واختار الحساب بنفسك.</p></div>'+
   '<button type="button" data-v2-cancel aria-label="إغلاق">✕</button></header>'+
   '<form id="flosyV2Form"><input type="hidden" name="review-selection" value="on">'+items.map((p,i)=>{
    const eligible=["income","expense","transfer"].includes(p.intent);
    return '<fieldset'+(eligible?"":' class="flosy-v2-blocked" disabled')+'><legend>عملية '+(i+1)+' • '+escape(labels[p.intent]||"غير معروفة")+'</legend>'+
      (eligible?'<label class="flosy-v2-choose"><input type="checkbox" name="include-'+i+'" checked> حفظ هذه العملية بعد المراجعة</label>':
       '<p class="flosy-v2-alert">عملية غير مدعومة حاليًا؛ هسيبها منفصلة ومش هتعطل الباقي.</p>')+
      '<p class="flosy-v2-transcript">'+escape(p.text||p.description||"فاتورة")+'</p>'+
      (p.trainedPrediction?'<p class="flosy-v2-model" aria-label="توقع النموذج المدرب">'+
       'تصنيف النموذج المدرّب: '+escape(labels[p.trainedPrediction.intent]||"غير مكتمل")+
       (p.trainedPrediction.agreement?' • متوافق مع قواعد الأمان':' • يحتاج مراجعة أدق')+
       ' — الثقة غير معايرة على صوت حقيقي</p>':"")+
      (!eligible?'<p class="flosy-v2-alert">'+escape(errors[p.intent]||"لا يمكن تسجيل هذه العملية.")+'</p>':"")+
      '<div class="flosy-v2-grid"><label>المبلغ بالجنيه<input type="number" min="0.01" max="999999999" step=".01" name="amount-'+i+'" value="'+escape(p.amount??"")+'"'+(eligible?" required":" disabled")+'></label>'+
      '<label>التاريخ<input type="date" name="date-'+i+'" value="'+escape(p.date||"")+'"'+(eligible?" required":" disabled")+'></label>'+
      '<label>الحساب المصدر'+choices("account",i,p.accountId)+'</label>'+
      (p.intent==="transfer"?'<label>الحساب المستلم'+choices("target",i,p.targetAccountId)+'</label>':"")+
      '<label class="flosy-v2-wide">الوصف<input type="text" name="description-'+i+'" maxlength="90" value="'+escape(p.description|| (kind==="receipt"?"فاتورة":labels[p.intent]||"عملية"))+'"'+(eligible?" required":" disabled")+'></label>'+
      '</div>'+ (kind==="receipt"?receiptEditor(p,i):"")+'</fieldset>';
   }).join("")+
   '<p class="flosy-v2-note">تفسير اللهجة أو نتيجة OCR مش ضمان للدقة. لا نحتفظ هنا بالنص الخام أو صورة الإيصال. الحفظ بعد موافقتك فقط.</p>'+
   '<div id="flosyV2Error" role="alert"></div><footer><button type="button" data-v2-cancel>إلغاء بدون حفظ</button>'+
   '<button type="submit"'+(!eligibleCount?' disabled title="لا توجد عمليات صالحة"':'')+'>تأكيد وحفظ المحدد ('+eligibleCount+')</button></footer></form></section>';
  document.body.appendChild(node);
  node.querySelectorAll("[data-v2-cancel]").forEach(b=>b.addEventListener("click",close));
  const reconcile=()=>{
   node.querySelectorAll("[data-receipt-calc]").forEach(out=>{
    const i=out.dataset.receiptCalc,list=items[Number(i)]?.receiptDetails?.items||[];
    const rowCount=node.querySelectorAll('.flosy-v2-items [name^="receipt-name-'+i+'-"]').length;
    let sum=0,invalid=false;
    for(let j=0;j<rowCount;j++){
     const q=Number(node.querySelector('[name="receipt-qty-'+i+'-'+j+'"]')?.value);
     const price=Number(node.querySelector('[name="receipt-price-'+i+'-'+j+'"]')?.value);
     if(!(q>0)||price<0||!Number.isFinite(q)||!Number.isFinite(price))invalid=true;
     sum+=q*price;
    }
    const tax=Number(node.querySelector('[name="receipt-tax-'+i+'"]')?.value||0);
    const discount=Number(node.querySelector('[name="receipt-discount-'+i+'"]')?.value||0);
    const expected=Math.round((sum+tax-discount)*100)/100;
    const total=Number(node.querySelector('[name="amount-'+i+'"]')?.value||0);
    const ok=!invalid&&(rowCount===0||Math.abs(expected-total)<=0.05);
    out.textContent=rowCount===0?
     "لم تُستخرج أصناف؛ راجع إجمالي الفاتورة مباشرة قبل الحفظ.":
     "مجموع الأصناف: "+expected.toFixed(2)+" ج.م | الإجمالي: "+total.toFixed(2)+" ج.م "+(ok?"✓ متطابق":"— راجع الفرق");
    out.dataset.valid=ok?"true":"false";
   });
  };
  node.addEventListener("input",reconcile);reconcile();
  node.addEventListener("click",event=>{
   const button=event.target.closest("[data-add-receipt-item]");if(!button)return;
   const i=Number(button.dataset.addReceiptItem);
   const container=button.parentElement.querySelector(".flosy-v398-line-items");
   const count=container.querySelectorAll(".flosy-v2-item-row").length;
   if(count>=60)return;
   const doc=document.createElement("div");doc.className="flosy-v2-item-row";
   doc.innerHTML='<label>الصنف<input required maxlength="80" name="receipt-name-'+i+'-'+count+'" placeholder="اكتب اسم الصنف"></label>'+
    '<label>الكمية<input type="number" required min=".001" step=".001" name="receipt-qty-'+i+'-'+count+'" value="1"></label>'+
    '<label>سعر الوحدة<input type="number" required min="0" step=".01" name="receipt-price-'+i+'-'+count+'" placeholder="0"></label>';
   container.appendChild(doc);reconcile();doc.querySelector("input")?.focus();
  });

  node.querySelectorAll(".flosy-v2-choose input").forEach(check=>{
   check.addEventListener("change",()=>{
    check.closest("fieldset").querySelectorAll("input,select").forEach(field=>{
     if(field!==check)field.disabled=!check.checked;
    });
   });
  });
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
