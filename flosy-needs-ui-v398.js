/* Flosy v3.9.8 — necessity view, editable per transaction.
 * Binds to the canonical transaction ledger; never creates a shadow ledger.
 */
(function(w,d){"use strict";
 const P=w.FLOSY_UNIFIED_PAGES,old=P?.render,N=w.FLOSY_NEEDS_V398;
 if(!P||!N||typeof old!=="function")return;
 const U=()=>w.FLOSY_UNIFIED;
 const money=v=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(Number(v)||0)+" ج.م";
 const esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
 const labels={essential:"مهم / ضروري",flexible:"في المنتصف",optional:"غير مهم / اختياري"};
 const help={essential:"التزامات ومعيشة أساسية يصعب إيقافها",flexible:"مهم لكن يمكن تعديل توقيته أو قيمته",
  optional:"مصروفات يمكن الاستغناء عنها بدون التأثير على الضروريات"};
 function summaryMarkup(compact=false){
  const s=U()?.state()||{},v=N.summarize(s),rules=s.settings||{};
  const hasMoney=v.total>0;
  return '<section class="needs-v398-card" aria-label="أهمية المصروفات" data-needs-summary>'+
   '<div class="needs-v398-title"><div><small>FLOSY • أولوياتك المالية</small><h3>مصاريفك: المهم واللي في النص والاختياري</h3></div>'+
   '<span class="needs-v398-total">'+money(v.total)+'</span></div>'+
   '<p>ده اقتراح مبدئي قابل للتعديل، مش حكم على اختياراتك. التحويلات والدخل خارج التصنيف.</p>'+
   '<div class="needs-v398-grid">'+N.values.map(k=>{
    const fraction=v.total>0?Math.min(100,100*v.totals[k]/v.total):0;
    return '<div class="needs-v398-stat" data-needs-tier="'+k+'">'+
     '<span class="needs-v398-marker" data-tier="'+k+'"></span>'+
     '<strong>'+labels[k]+'</strong><b>'+money(v.totals[k])+'</b>'+
     '<div class="needs-v398-track"><i style="width:'+fraction.toFixed(1)+'%"></i></div>'+
     (!compact?'<small>'+help[k]+'</small>':'')+'</div>';
   }).join("")+'</div>'+
   (hasMoney?'<p>المصروفات الاختيارية تمثل '+v.optionalShare+'% من مصروفات الشهر. جرب تعديل العناصر اللي تقدر تقللها بدون المساس بالضروريات.</p>':
     '<p>لما تسجل مصروفات هتشوف توزيع أهميتها هنا.</p>')+
   (v.uncertain?'<p class="needs-v398-caution">'+v.uncertain+' عملية محتاجة تحديد أهميتها منك لزيادة دقة التقرير.</p>':"")+
   (!compact?'<div class="needs-v398-actions"><button type="button" data-flosy-screen="4">راجع كل معاملة وعدّل أهميتها</button></div>':"")+
   '</section>';
 }
 function updateRecords(frame){
  const list=frame.querySelector("#flosyLiveTransactionList");if(!list)return;
  const oldCard=frame.querySelector(".needs-v398-card");
  oldCard?.remove();
  list.insertAdjacentHTML("beforebegin",summaryMarkup());
  const state=U()?.state()||{},records=Array.isArray(state.transactions)?state.transactions:[];
  for(const card of list.querySelectorAll(".fx-transaction[data-transaction]")){
   const tx=records.find(t=>String(t.id)===card.dataset.transaction);
   card.querySelector(".needs-v398-line")?.remove();
   if(!tx||tx.type!=="expense")continue;
   const tier=N.suggest(tx,state.settings||{});
   const wrap=d.createElement("div");wrap.className="needs-v398-line";
   wrap.innerHTML='<span class="needs-v398-guess" title="'+esc(tier.reason)+'">'+
    (tier.source==="owner"?"✓ حددته بنفسك":"اقتراح تلقائي")+'</span>'+
    '<label>أهمية العملية <select data-necessity-id="'+esc(tx.id)+'" aria-label="تصنيف أهمية '+esc(tx.description||"مصروف")+'">'+
     N.values.map(x=>'<option value="'+x+'"'+(tier.tier===x?" selected":"")+'>'+labels[x]+'</option>').join("")+
     '</select></label>';
   card.appendChild(wrap);
  }
  list.addEventListener("change",e=>{
   const select=e.target.closest("[data-necessity-id]");if(!select)return;
   try{N.change(select.dataset.necessityId,select.value,cb=>U().core().FLOSY_BRIDGE.mutate(cb));
    U().notify("حفظت أهمية العملية. التقارير هتتحدث حسب اختيارك.");
    U().renderAll();
   }catch(err){U().notify(String(err?.message||"تعذر تعديل الأهمية"))}
  });
 }
 function updateHome(frame){
  const existing=frame.querySelector("#flosyNeedsHomeV398");existing?.remove();
  const holder=d.createElement("div");holder.id="flosyNeedsHomeV398";
  holder.innerHTML=summaryMarkup(true);
  const base=frame.querySelector(".hero-card");
  if(base)base.insertAdjacentElement("afterend",holder);
  else frame.prepend(holder);
 }
 function updateInsights(frame){
  const host=frame.querySelector("#faixInsights");if(!host)return;
  host.querySelector("[data-needs-summary]")?.remove();
  if(frame.querySelector('[data-ai-pane="insights"]:not([hidden])'))host.insertAdjacentHTML("beforeend",summaryMarkup());
 }
 P.render=function(id){
  old(id);
  const frame=d.querySelector('.phone-frame[data-screen="'+Number(id)+'"] .flosy-real');
  if(!frame)return;
  if(id===4)updateRecords(frame);
  if(id===2)updateHome(frame);
  if(id===8){
   frame.addEventListener("click",e=>{
    if(!e.target.closest('[data-ai-tab="insights"]'))return;
    // Original AI tab handler runs first on the nested AI component.
    updateInsights(frame);
   });
   updateInsights(frame);
  }
 };
 w.FLOSY_NEEDS_UI_V398={summaryMarkup,version:"3.9.8"};
})(window,document);
