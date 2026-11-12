/* Flosy Report Kit v3.6 — offline, deterministic, no remote calls.
 * Scope: user-recorded ledger data only. Never mutates transactions.
 * Real .xlsx generated in-browser (OpenXML ZIP/store), not a renamed CSV.
 */
(function(w){"use strict";
const INVALID=new Set(["failed","pending","draft","reversed","cancelled","canceled","void","deleted"]);
const icons=[[/قهو|coffee|cafe/i,"☕"],[/سيار|car/i,"🚗"],[/مواصل|نقل|تاكسي|اوبر|transport|fuel|بنزين/i,"🚕"],[/طعام|أكل|اكل|مطعم|food|grocery/i,"🍽️"],[/دواء|صحة|صيدل|medical|health/i,"💊"],[/بيت|إيجار|سكن|rent/i,"🏠"],[/تعليم|دراس|education/i,"📚"],[/فاتور|كهرب|مياه|غاز|انترنت|internet/i,"🧾"],[/لبس|ملابس|shopping/i,"🛍️"],[/ترفيه|entertain/i,"🎬"],[/سفر|travel/i,"✈️"]];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon=label=>icons.find(x=>x[0].test(String(label||"")))?.[1]||"💳";
const val=n=>typeof n==="number"?n:Number(n);
const cents=n=>Number.isFinite(val(n))&&val(n)>=0&&val(n)<1e10?Math.round(val(n)*100):null;
const money=c=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:2}).format(c/100)+" ج.م";
const SUM=rows=>rows.reduce((s,x)=>s+x.cents,0);
const MAX=10000;
function build(state,range){
 if(!range||!/^20\d\d-\d\d-\d\d$/.test(range.start)||!/^20\d\d-\d\d-\d\d$/.test(range.end)||range.start>range.end)throw Error("فترة التقرير غير صالحة");
 const all=Array.isArray(state?.transactions)?state.transactions:[];
 const accounts=Array.isArray(state?.accounts)?state.accounts:[];
 const names=new Map(accounts.map(a=>[String(a.id),String(a.name||a.bankName||"حساب بدون اسم")]));
 let rejected=0;
 const rows=[];
 for(const tx of all){
  if(!tx||typeof tx.date!=="string"||tx.date.slice(0,10)<range.start||tx.date.slice(0,10)>range.end)continue;
  if(INVALID.has(String(tx.status||"").toLowerCase())||tx.deleted===true||tx.isDeleted===true){rejected++;continue}
  if(!["expense","income","transfer"].includes(tx.type)){rejected++;continue}
  const c=cents(tx.amount);
  if(c===null){rejected++;continue}
  const key=String(tx.accountId??tx.fromAccountId??tx.sourceAccountId??"");
  rows.push({date:tx.date.slice(0,10),type:tx.type,cents:c,category:String(tx.category||"غير مصنف").slice(0,80),
   description:String(tx.description||"").slice(0,160),account:key?names.get(key)||"حساب "+key.slice(-4):"غير محدد",id:String(tx.id||"").slice(0,80)});
  if(rows.length>=MAX){rejected+=Math.max(0,all.length-rows.length);break}
 }
 rows.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const expense=SUM(rows.filter(x=>x.type==="expense")),income=SUM(rows.filter(x=>x.type==="income")),transfers=SUM(rows.filter(x=>x.type==="transfer"));
 const byCategory=new Map(),byAccount=new Map(),byDay=new Map();
 for(const x of rows){
  if(x.type==="expense"){byCategory.set(x.category,(byCategory.get(x.category)||0)+x.cents);byDay.set(x.date,(byDay.get(x.date)||0)+x.cents)}
  const row=byAccount.get(x.account)||{name:x.account,income:0,expense:0,transfer:0};
  row[x.type]+=x.cents;byAccount.set(x.account,row);
 }
 const categories=[...byCategory].sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value,icon:icon(name)}));
 const accountsRows=[...byAccount.values()].sort((a,b)=>a.name.localeCompare(b.name));
 const daily=[...byDay].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,value])=>({date,value}));
 const savings=income-expense,ratio=income>0?Math.round(savings/income*100):null;
 const advice=[];
 if(!rows.length)advice.push("لا توجد معاملات مكتملة مسجلة لهذه الفترة؛ لا يمكن تقديم توصيات دقيقة بعد.");
 else {
  if(income>0&&expense>income)advice.push("المصروفات المسجلة أعلى من الدخل المسجل. راجع الالتزامات أولًا ثم ضع حدًا أسبوعيًا للإنفاق الاختياري.");
  else if(income>0)advice.push("الفارق بين الدخل والمصروفات "+money(Math.max(0,savings))+". لا تفترض أنه رصيد متاح قبل مراجعة الالتزامات والحسابات.");
  else advice.push("لا يوجد دخل مسجل خلال الفترة؛ لا يمكن حساب معدل ادخار موثوق.");
  if(categories.length&&expense>0){
   const first=categories[0],share=Math.round(first.value/expense*100);
   advice.push("أكبر فئة هي "+first.name+" ("+share+"٪). تجربة تخفيضها 10٪ قد توفر نظريًا "+money(Math.round(first.value*.10))+" إذا كانت مصروفات قابلة للتخفيض.");
  }
  if(expense>0)advice.push("لصندوق طوارئ مبدئي، فكّر في تغطية 3–6 أشهر من مصروفاتك الأساسية بعد تحديدها؛ ليس من الدقيق اعتبار كل المصروفات أساسية.");
  advice.push("أي ادخار أو استثمار يجب أن يراعي السيولة والديون والمخاطر؛ الاقتراحات للتخطيط وليست توصيات شراء.");
 }
 if(rejected)advice.push("استُبعدت "+rejected+" معاملة غير مكتملة أو غير صالحة؛ راجع قائمة المعاملات عند الحاجة.");
 return {range:{start:range.start,end:range.end},rows,expense,income,transfers,net:savings,savingsRatio:ratio,categories,accounts:accountsRows,daily,advice,rejected};
}
function printAppendix(state,range){
 const r=build(state,range),top=r.categories.slice(0,6),max=top.length?top[0].value:1;
 let html='<section class="flosy-report-extra" style="break-inside:avoid;padding:12px;margin:14px 0;border:1px solid #d8e9e4;border-radius:12px;direction:rtl"><h2>8. تحليلات بصرية واقتراحات فلوسي</h2>';
 html+='<p>صافي التدفق المسجل (الدخل − المصروفات): <b>'+esc(money(r.net))+'</b>. التحويلات بين الحسابات ليست مصروفات.</p>';
 html+='<div role="img" aria-label="أكبر فئات الإنفاق في الفترة" style="display:grid;gap:8px">';
 for(const c of top){
  html+='<div style="display:grid;grid-template-columns: minmax(85px,1fr) 3fr auto;align-items:center;gap:8px;font-size:12px">'+
   '<span>'+esc(c.icon+" "+c.name)+'</span><span style="height:13px;background:#eff5f3;border-radius:9px;overflow:hidden"><i style="display:block;background:#177665;border-radius:9px;width:'+Math.min(100,100*c.value/max).toFixed(1)+'%;height:100%"></i></span><b>'+esc(money(c.value))+'</b></div>';
 }
 html+='</div><h3>فرص للتحسين (سيناريوهات توضيحية)</h3><ul>'+r.advice.map(a=>'<li>'+esc(a)+'</li>').join("")+'</ul></section>';
 return html;
}
const xml=s=>esc(s);
const utf8=s=>new TextEncoder().encode(s);
function xmlSheet(grid){
 let out='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetData>';
 for(let i=0;i<grid.length;i++){
  out+='<row r="'+(i+1)+'">';
  for(let j=0;j<grid[i].length;j++){
   let n=j+1,col="";while(n>0){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26)}
   const value=grid[i][j],ref=col+(i+1);
   if(typeof value==="number"&&Number.isFinite(value))out+='<c r="'+ref+'"><v>'+value+'</v></c>';
   else out+='<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value??"")+'</t></is></c>';
  }
  out+='</row>';
 }
 return out+'</sheetData></worksheet>';
}
function workbookFiles(r){
 const sheets=[
  ["الملخص",[["فلوسي — التقرير المالي"],["من",r.range.start],["إلى",r.range.end],["الدخل",r.income/100],["المصروفات",r.expense/100],["التحويلات",r.transfers/100],["الصافي (بدون التحويلات)",r.net/100],["العمليات المكتملة",r.rows.length],["المستبعدة",r.rejected]]],
  ["المعاملات",[["التاريخ","النوع","الفئة","الوصف","الحساب","المبلغ بالجنيه"],...r.rows.map(t=>[t.date,t.type,t.category,t.description,t.account,t.cents/100])]],
  ["الفئات",[["الأيقونة","الفئة","المبلغ بالجنيه"],...r.categories.map(t=>[t.icon,t.name,t.value/100])]],
  ["الحسابات",[["الحساب","دخل","مصروف","تحويل"],...r.accounts.map(t=>[t.name,t.income/100,t.expense/100,t.transfer/100])]],
  ["النصائح",[["اقتراحات توضيحية (ليست نصيحة استثمارية)"],...r.advice.map(t=>[t])]]
 ];
 const root='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const files=[
  ["[Content_Types].xml",root+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("")+'</Types>'],
  ["_rels/.rels",root+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ["xl/workbook.xml",root+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((x,i)=>'<sheet name="'+xml(x[0])+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join("")+'</sheets></workbook>'],
  ["xl/_rels/workbook.xml.rels",root+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join("")+'</Relationships>']
 ];
 sheets.forEach((x,i)=>files.push(["xl/worksheets/sheet"+(i+1)+".xml",xmlSheet(x[1])]));
 return files;
}
function crc(bytes){
 let c=-1;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xEDB88320:0)}
 return (c^(-1))>>>0;
}
const u16=(a,n)=>a.push(n&255,(n>>>8)&255);
const u32=(a,n)=>a.push(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255);
function xlsxBytes(report){
 const local=[],central=[];let offset=0;
 for(const [name,content] of workbookFiles(report)){
  const n=utf8(name),data=utf8(content),checksum=crc(data);
  const h=[];u32(h,0x04034b50);u16(h,20);u16(h,0x0800);u16(h,0);u16(h,0);u16(h,0);
  u32(h,checksum);u32(h,data.length);u32(h,data.length);u16(h,n.length);u16(h,0);
  local.push(Uint8Array.from(h),n,data);
  const c=[];u32(c,0x02014b50);u16(c,20);u16(c,20);u16(c,0x0800);u16(c,0);u16(c,0);u16(c,0);
  u32(c,checksum);u32(c,data.length);u32(c,data.length);u16(c,n.length);u16(c,0);u16(c,0);u16(c,0);u16(c,0);u32(c,0);u32(c,offset);
  central.push(Uint8Array.from(c),n);
  offset+=h.length+n.length+data.length;
 }
 const centralSize=central.reduce((s,b)=>s+b.length,0),end=[];u32(end,0x06054b50);u16(end,0);u16(end,0);
 const count=workbookFiles(report).length;u16(end,count);u16(end,count);u32(end,centralSize);u32(end,offset);u16(end,0);
 const parts=[...local,...central,Uint8Array.from(end)],size=parts.reduce((s,b)=>s+b.length,0),result=new Uint8Array(size);
 let at=0;for(const part of parts){result.set(part,at);at+=part.length}
 return result;
}
function download(state,range){
 const r=build(state,range),buffer=xlsxBytes(r),blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="Flosy-"+range.start+"-"+range.end+".xlsx";a.click();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
w.FLOSY_REPORT_KIT={build,printAppendix,xlsxBytes,download,version:"3.6.0"};
})(window);
