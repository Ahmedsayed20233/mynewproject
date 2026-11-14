/* Flosy 3.9.2 — reliable native PDF/Excel from the canonical ledger.
   Financial report bytes stay on-device. No remote processing. */
(function(w,d){"use strict";
 const api=()=>w.FLOSY_UNIFIED,esc=x=>api()?.esc(x)||String(x??"");
 const money=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format((Number(n)||0)/100)+" ج.م";
 let transferring=false;
 function status(msg,error=false){
  const el=d.getElementById("flosyReportStatus");
  if(el){el.textContent=msg;el.dataset.error=error?"true":"false";}
  if(error)api()?.notify?.(msg);
 }
 function period(){
  return w.FLOSY_REPORT_PLUS_V311?.currentFilters?.()||(()=>{
   const from=d.getElementById("flosyReportFrom")?.value,to=d.getElementById("flosyReportTo")?.value;
   if(!from||!to||from>to)throw Error("اختار تاريخ بداية ونهاية صحيحين");
   return {start:from,end:to};
  })();
 }
 function build(filters){
  const kit=api()?.core()?.FLOSY_REPORT_KIT,plus=w.FLOSY_REPORT_PLUS_V311;
  if(!kit?.build)throw Error("محرك التقارير لسه بيتحمّل. افتح التقارير تاني.");
  return plus?.build?plus.build(api().state(),filters,kit):kit.build(api().state(),filters);
 }
 function transfer(kind,bytes,filename){
  if(transferring)throw Error("في ملف بيتجهز حاليًا؛ احفظه أولًا.");
  if(!w.FLOSY_NATIVE_ANDROID||!w.FLOSY_NATIVE_BRIDGE_AVAILABLE||!w.FlosyNative?.postMessage)return false;
  if(bytes.length<2||bytes.length>5*1024*1024)throw Error("الملف كبير جدًا، جرّب فترة أقصر.");
  transferring=true;
  try{
   const send=x=>w.FlosyNative.postMessage(JSON.stringify(x));
   send({action:kind+"-start",filename,size:bytes.length});
   for(let at=0;at<bytes.length;at+=6100){
    const slice=bytes.subarray(at,Math.min(at+6100,bytes.length));
    let binary="";for(const b of slice)binary+=String.fromCharCode(b);
    send({action:kind+"-chunk",data:btoa(binary)});
   }
   send({action:kind+"-finish"});
   status("📁 اختر مكان حفظ ملف "+kind.toUpperCase()+" من نافذة ملفات Android؛ لن يُحفظ قبل اختيار المكان.");
   return true;
  }finally{transferring=false}
 }
 function reportHtml(r){
  const summary=(title,cents,shade)=>'<div class="rp-stat"><small>'+esc(title)+'</small><b style="color:'+shade+'">'+
   esc(money(cents))+'</b></div>';
  const categories=r.categories.map(c=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(money(c.value))+'</td>'+
   '<td>'+(r.expense?Math.round(c.value/r.expense*100):0)+'%</td></tr>').join("");
  const detail=r.rows.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.description||"عملية")+
   '<small>'+esc(x.category)+'</small></td><td>'+esc(x.account)+'</td><td>'+esc(money(x.cents))+'</td></tr>').join("");
  return '<article class="flosy-report-pro" dir="rtl">'+
   '<header class="rp-cover"><span class="rp-logo">F</span><div><h1>فلوسي <em>FLOSY</em></h1>'+
   '<p>FINANCIAL INTELLIGENCE REPORT</p></div><span class="rp-private">تقرير مالي خاص</span></header>'+
   '<div class="rp-meta"><span>الفترة: '+esc(r.range.start)+' — '+esc(r.range.end)+'</span>'+
   '<span>تاريخ الإصدار: '+esc(new Date().toLocaleDateString("ar-EG"))+'</span></div>'+
   '<div class="rp-stats">'+summary("إجمالي الدخل",r.income,"#047857")+
    summary("إجمالي المصروفات",r.expense,"#B91C1C")+summary("صافي التدفق",r.net,"#334155")+'</div>'+
   '<p class="rp-note">التحويلات بين حساباتك '+esc(money(r.transfers))+
    ' لا تُحتسب مصروفًا. هذا التقرير يعرض بياناتك المسجلة فقط.</p>'+
   '<h2>01 / تحليل الفئات</h2><table class="rp-table"><thead><tr><th>الفئة</th><th>المبلغ</th><th>النسبة</th></tr></thead><tbody>'+
    (categories||'<tr><td colspan="3">لا توجد بيانات</td></tr>')+'</tbody></table>'+
   '<h2>02 / تدفق الحسابات</h2><table class="rp-table"><thead><tr><th>الحساب</th><th>دخل</th><th>مصروف</th></tr></thead><tbody>'+
    r.accounts.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(money(x.income))+
    '</td><td>'+esc(money(x.expense))+'</td></tr>').join("")+'</tbody></table>'+
   '<h2>03 / تفاصيل المعاملات ('+r.rows.length+')</h2><table class="rp-table"><thead><tr>'+
    '<th>التاريخ</th><th>المعاملة</th><th>الحساب</th><th>المبلغ</th></tr></thead><tbody>'+detail+'</tbody></table>'+
   (Array.isArray(r.timeline)&&r.timeline.length?
    '<h2>04 / اتجاهات التدفق النقدي الشهرية</h2><table class="rp-table"><thead><tr><th>الشهر</th><th>الدخل</th><th>المصروف</th><th>الصافي</th></tr></thead><tbody>'+
    r.timeline.slice(-24).map(t=>'<tr><td>'+esc(t.month)+'</td><td>'+esc(money(t.income))+
    '</td><td>'+esc(money(t.expense))+'</td><td>'+esc(money(t.net))+'</td></tr>').join("")+
    '</tbody></table>':"")+
   (r.comparison?'<h2>05 / مقارنة بالفترة السابقة</h2><p class="rp-note">الفترة المقابلة: '+
    esc(r.comparison.start)+' — '+esc(r.comparison.end)+'، مصروفاتها '+
    esc(money(r.comparison.expense))+'، والتغير '+esc(money(r.comparison.expenseChange))+
    (r.comparison.expenseChangePercent===null?"":" ("+esc(r.comparison.expenseChangePercent)+"%)")+'</p>':"")+
   (Array.isArray(r.budgets)&&r.budgets.length?
     '<h2>06 / الالتزام بالميزانيات</h2><table class="rp-table"><thead><tr><th>الفئة</th><th>الحد</th><th>المصروف</th><th>المتبقي</th></tr></thead><tbody>'+
     r.budgets.map(b=>'<tr><td>'+esc(b.name)+'</td><td>'+esc(money(b.limit))+
      '</td><td>'+esc(money(b.spent))+'</td><td>'+esc(money(b.remaining))+'</td></tr>').join("")+'</tbody></table>':"")+
   '<h2>07 / رؤى مالية</h2><ol class="rp-advice">'+(r.insights||r.advice).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>'+
   '<footer>FLOSY · PRIVATE FINANCIAL REPORT · ليس توصية استثمارية</footer></article>';
 }
 function preparePrint(r){
  let host=d.getElementById("flosyUnifiedPrint");
  if(!host){host=d.createElement("section");host.id="flosyUnifiedPrint";d.body.appendChild(host)}
  host.innerHTML=reportHtml(r);
 }
 function browserSave(bytes,filename,mime){
  const blob=new Blob([bytes],{type:mime}),url=URL.createObjectURL(blob);
  const a=d.createElement("a");a.href=url;a.download=filename;d.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 function download(kind){
  try{
   const filters=period(),r=build(filters);
   if(kind==="excel")kind="xlsx";
   if(!["xlsx","pdf","csv"].includes(kind))throw Error("امتداد ملف غير مدعوم");
   const filename="Flosy-"+filters.start+"-"+filters.end+"."+kind;
   if(kind==="csv"){
    const bytes=w.FLOSY_REPORT_PLUS_V311?.csvBytes?.(r);
    if(!bytes)throw Error("محرك CSV غير جاهز");
    if(!transfer("csv",bytes,filename)){
     browserSave(bytes,filename,"text/csv;charset=utf-8");
     status("✓ تم تنزيل CSV بتشفير UTF-8 مناسب للعربية.");
    }
    return;
   }
   if(kind==="xlsx"){
    const bytes=api()?.core()?.FLOSY_REPORT_KIT?.xlsxBytes(r);
    if(!bytes)throw Error("ملف Excel لم يجهز");
    if(!transfer("xlsx",bytes,filename)){
     browserSave(bytes,filename,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
     status("✓ تم تنزيل Excel الحقيقي بجداول قابلة للتحليل.");
    }
    return;
   }
   preparePrint(r);
   const payload={range:r.range,income:r.income,expense:r.expense,net:r.net,transfers:r.transfers,
    rows:r.rows,categories:r.categories,accounts:r.accounts,advice:r.insights||r.advice,
    timeline:(r.timeline||[]).slice(-24),comparison:r.comparison||null,budgets:r.budgets||[],
    savingsRatio:r.savingsRatioPrecise??null,dailyAverage:r.dailyAverage||0,filters:r.filters||{}};
   const bytes=new TextEncoder().encode(JSON.stringify(payload));
   if(bytes.length>3*1024*1024)throw Error("PDF كبير جدًا، اختار فترة أقصر أو نزّل Excel.");
   if(!transfer("pdf",bytes,filename)){
    status("اختر Save as PDF من شاشة الطباعة.");
    w.print();
   }
  }catch(err){status("تعذر التصدير: "+String(err.message||err),true)}
 }
 function nativeResult(kind,ok,message){status((ok?"✓ ":"⚠️ ")+String(message||kind||""),!ok);}
 w.FLOSY_REPORT_PRO={download,period,build,reportHtml,preparePrint,nativeResult,version:"3.11.0"};
})(window,document);
