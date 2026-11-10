/* Flosy 4: Egyptian manually-valued assets and transparent crisis simulator. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=x=>document.getElementById(x),S=()=>C.getState(),N=x=>Number.isFinite(+x)?+x:0;
const Q=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const M=x=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(N(x))+" ج.م";
const K=[["gold","ذهب"],["usd","دولار"],["certificate","شهادة بنكية"],["gam3eya","جمعية"],["property","عقار"],["other","أصل آخر"]];
const uid=()=>crypto.randomUUID?crypto.randomUUID():"wealth-"+Math.random().toString(36).slice(2);
function init(){
 const s=S();s.v4=s.v4||{};s.v4.crisis=s.v4.crisis||{incomeLostMonths:3,inflationPct:15,medicalCost:0,extraRent:0};
 C.persistInitial();
}
function wealthSummary(){
 const a=S().assets||[],m=w.FLOSY_PRO?.metrics?.()||{},manual=a.reduce((sum,x)=>sum+N(x.value),0);
 const cash=N(m.cash),invest=N(m.portfolio?.market),debt=(S().liabilities||[]).reduce((sum,x)=>sum+N(x.balance),0);
 return {cash,invest,manual,debt,net:cash+invest+manual-debt,assets:a};
}
function simulate(p=S().v4.crisis){
 const s=S().settings||{},expense=N(s.rent)+N(s.bills)+N(s.living),sal=N(s.salary),
 months=Math.max(1,Math.min(36,Math.round(N(p.incomeLostMonths))));
 const inflation=Math.max(0,Math.min(500,N(p.inflationPct)))/100;
 const newExpense=expense+inflation*(expense-N(s.rent))+N(p.extraRent);
 const emergency=N(w.FLOSY_PRO?.rowsForAccounts?.()?.emergency);
 const need=months*newExpense+N(p.medicalCost),remain=emergency-need;
 const savings=Math.max(0,sal-expense),target=Math.max(emergency,N(s.emergencyTarget));
 return {expense,newExpense,months,emergency,need,remain,shortfall:Math.max(0,-remain),savings,
  runway:newExpense?emergency/newExpense:0,rebuildMonths:savings?Math.ceil(Math.max(0,target-Math.max(0,remain))/savings):null};
}
const stat=(label,value,note)=>'<div class="v4-kpi"><small>'+Q(label)+'</small><strong class="v4-sensitive">'+M(value)+'</strong><span>'+Q(note)+'</span></div>';
function renderWealth(){
 const root=E("v4-wealth");if(!root)return;const x=wealthSummary();
 root.innerHTML='<div class="v4-hero"><div class="v4-eyebrow">FLOSY · EGYPTIAN WEALTH</div><h2>ثروتك كلها في مكان واحد</h2><p>الذهب والدولار والشهادات والجمعية إلى جانب ثاندر وحساباتك؛ الأسعار تُدخل يدويًا ولا توجد أسعار حية موصولة.</p></div>'+
 '<div class="v4-kpis">'+stat("النقد المسجل",x.cash,"يشمل حسابات الطوارئ")+
 stat("ثاندر",x.invest,"حسب أسعارك اليدوية")+stat("أصول أخرى",x.manual,"ذهب ودولار وشهادات")+
 stat("صافي الثروة",x.net,"بعد خصم الديون")+'</div>'+
 '<div class="v4-bento"><div class="v4-surface v4-half"><h3>تسجيل أصل جديد</h3><form id="v4-wealth-form" class="v4-form">'+
 '<label>نوع الأصل<select name="kind">'+K.map(a=>'<option value="'+a[0]+'">'+a[1]+'</option>').join("")+'</select></label>'+
 '<label>الاسم<input name="name" maxlength="80" required placeholder="ذهب عيار 21 / شهادة بنك"></label>'+
 '<label>الكمية (جرام / دولار / وحدة)<input type="number" name="qty" min=".0001" step="any" value="1" required></label>'+
 '<label>سعر الوحدة بالجنيه المصري<input type="number" name="price" min="0" step="any" required></label>'+
 '<label>عائد سنوي للشهادة % (اختياري)<input type="number" name="rate" min="0" max="100" value="0" step="any"></label>'+
 '<label>تاريخ الاستحقاق (اختياري)<input type="date" name="maturity"></label>'+
 '<button class="v4-btn full" type="submit">إضافة الأصل</button></form>'+
 '<p>مثال الذهب: الكمية جرام، والسعر سعر نفس العيار بالجنيه. مثال الدولار: الكمية دولار وسعر الوحدة سعر الصرف بالجنيه.</p></div>'+
 '<div class="v4-surface v4-half"><h3>توزيع الثروة المحلية</h3>'+
 K.map(([kind,label])=>'<div class="v4-statline"><span>'+label+'</span><b>'+M(x.assets.filter(a=>a.assetKind===kind).reduce((v,a)=>v+N(a.value),0))+'</b></div>').join("")+
 '<div class="v4-note">الجمعية قد تكون مبلغًا مستحقًا وغير مضمون التحصيل. لا تُدخلها كأصل إذا كانت محسوبة بالفعل داخل رصيد حساب آخر.</div></div>'+
 '<div class="v4-surface v4-full"><h3>الأصول المسجلة</h3>'+
 (x.assets.length?'<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>الأصل</th><th>النوع</th><th>الكمية</th><th>سعر الوحدة</th><th>القيمة</th><th></th></tr></thead><tbody>'+
 x.assets.map(a=>'<tr><td>'+Q(a.name)+'</td><td>'+Q(K.find(k=>k[0]===a.assetKind)?.[1]||"أخرى")+'</td><td>'+N(a.qty||1)+'</td><td>'+M(a.unitPriceEgp||a.value)+'</td><td>'+M(a.value)+'</td><td><button type="button" class="v4-btn secondary" data-v4-asset-delete="'+Q(a.id)+'">حذف</button></td></tr>').join("")+'</tbody></table></div>':'<div class="v4-empty">مافيش أصول مسجلة</div>')+
 '</div></div>';
}
function renderCrisis(){
 const root=E("v4-crisis");if(!root)return;const p=S().v4.crisis,a=simulate();
 root.innerHTML='<div class="v4-hero"><div class="v4-eyebrow">FLOSY · CRISIS LAB</div><h2>إيه اللي يحصل لو مرتبك وقف؟</h2><p>محاكاة فقدان الدخل والتضخم والطوارئ الطبية وإعادة بناء صندوق الطوارئ.</p></div>'+
 '<div class="v4-kpis">'+stat("مصروف شهري بعد التضخم",a.newExpense,"سيناريو افتراضي")+
 stat("تكلفة الأزمة",a.need,"انقطاع دخل وطوارئ")+
 stat("رصيد الطوارئ بعد الأزمة",a.remain,"قد يكون سالبًا")+
 stat("عجز مالي محتمل",a.shortfall,"يلزم خفض المصروفات")+'</div>'+
 '<div class="v4-bento"><div class="v4-surface v4-half"><h3>غيّر السيناريو</h3>'+
 '<form id="v4-crisis-form" class="v4-form">'+
 '<label>شهور توقف الراتب<input type="number" name="months" min="1" max="36" value="'+N(p.incomeLostMonths)+'" required></label>'+
 '<label>تضخم المعيشة %<input type="number" name="inflation" min="0" max="500" step="any" value="'+N(p.inflationPct)+'" required></label>'+
 '<label>فاتورة طبية مفاجئة<input type="number" name="medical" min="0" step="any" value="'+N(p.medicalCost)+'" required></label>'+
 '<label>زيادة الإيجار شهريًا<input type="number" name="rent" min="0" step="any" value="'+N(p.extraRent)+'" required></label>'+
 '<button class="v4-btn full">تحديث المحاكاة</button></form></div>'+
 '<div class="v4-surface v4-half"><h3>خطة التعامل مع الصدمة</h3>'+
 '<div class="v4-statline"><span>رصيد الطوارئ</span><b>'+M(a.emergency)+'</b></div>'+
 '<div class="v4-statline"><span>تغطية الرصيد في الوضع الجديد</span><b>'+a.runway.toFixed(1)+' شهر</b></div>'+
 '<div class="v4-statline"><span>الفائض المخطط بعد عودة الراتب</span><b>'+M(a.savings)+'</b></div>'+
 '<div class="v4-statline"><span>مدة إعادة بناء الطوارئ</span><b>'+(a.rebuildMonths===null?"لا يوجد فائض":a.rebuildMonths+" شهر")+'</b></div>'+
 '<div class="v4-note '+(a.shortfall?"v4-warning":"")+'">الأولوية: الإيجار والأكل والدواء والفواتير، ثم استقرار الدخل وتجديد صندوق الطوارئ، وبعدها العودة للاستثمار.</div></div></div>';
}
function render(){renderWealth();renderCrisis()}
document.addEventListener("submit",e=>{
 if(!["v4-wealth-form","v4-crisis-form"].includes(e.target.id))return;e.preventDefault();
 const f=new FormData(e.target);
 if(e.target.id==="v4-wealth-form"){
  const kind=String(f.get("kind")),name=String(f.get("name")||"").trim(),qty=+f.get("qty"),price=+f.get("price");
  if(!K.some(x=>x[0]===kind)||!name||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0||qty*price>1e12)return C.toast("راجع القيم");
  C.mutate(st=>st.assets.push({id:uid(),name:name.slice(0,80),assetKind:kind,qty,unitPriceEgp:price,
   value:Math.round(qty*price*100)/100,yieldPct:N(f.get("rate")),maturityDate:String(f.get("maturity")||""),
   createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
 }
 if(e.target.id==="v4-crisis-form"){
  const months=+f.get("months"),inflation=+f.get("inflation"),medical=+f.get("medical"),rent=+f.get("rent");
  if(!Number.isInteger(months)||months<1||months>36||[inflation,medical,rent].some(x=>!Number.isFinite(x)||x<0)||inflation>500)return C.toast("قيم غير صحيحة");
  C.mutate(st=>{st.v4.crisis={incomeLostMonths:months,inflationPct:inflation,medicalCost:medical,extraRent:rent}});
 }
});
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-v4-asset-delete]");if(!b)return;
 const id=b.dataset.v4AssetDelete;if(!confirm("تأكيد حذف هذا الأصل؟"))return;
 C.mutate(st=>{st.assets=st.assets.filter(a=>a.id!==id);st.deletedIds=st.deletedIds||[];st.deletedIds.push("assets/"+id)});
});
init();w.FLOSY_V4_WEALTH={wealthSummary,simulate,render};render();
})(window);