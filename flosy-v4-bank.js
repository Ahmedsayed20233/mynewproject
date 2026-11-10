/* Flosy 4 CSV import wizard — supports configurable Egyptian bank statement columns.
   No raw file upload. User reviews all rows and confirms a single-account batch. */
(function(global){
"use strict";
const C=global.FLOSY_BRIDGE;if(!C)return;
const $=id=>document.getElementById(id),num=x=>Number(x)||0;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uuid=()=>crypto.randomUUID?crypto.randomUUID():"csv-"+Math.random().toString(36).slice(2);
let header=[],rows=[],prepared=[],message="",filename="",loaded=false,selectedAccount="";
let excluded=new Set(); // Selected rows only: human review before import.
const fhash=(s)=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16)};
function csvRecords(text){
 let content=String(text||"").replace(/^\uFEFF/,"");
 const first=content.split(/[\r\n]/)[0]||"";
 const delim=first.split(";").length>first.split(",").length?";":",";
 let out=[],r=[],field="",quoted=false;
 for(let i=0;i<content.length;i++){
  const c=content[i];
  if(c==='"'){
   if(quoted&&content[i+1]==='"'){field+='"';i++}else quoted=!quoted;
  }else if(c===delim&&!quoted){r.push(field);field=""}
  else if((c==='\r'||c==='\n')&&!quoted){
   if(c==='\r'&&content[i+1]==='\n')i++;
   r.push(field);if(r.some(x=>x.trim()))out.push(r);field="";r=[];
  }else field+=c;
 }
 r.push(field);if(r.some(x=>x.trim()))out.push(r);
 if(quoted)throw Error("ملف CSV يحتوي علامتي اقتباس غير متطابقتين");
 return out;
}
function normalizeMoney(x){
 let s=String(x||"").replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
 .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
 .replace(/\s/g,"").replace(/[^\d.,()\-]/g,"");
 if(!s)return 0;
 const neg=s.includes("(")||s.startsWith("-");
 s=s.replace(/[()\-]/g,"");
 const c=s.lastIndexOf(","),d=s.lastIndexOf(".");
 if(c>=0&&d>=0)s=c>d?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");
 else if(c>=0){const arr=s.split(",");s=arr.length===2&&arr[1].length!==3?arr.join("."):arr.join("")}
 else if(d>=0){const arr=s.split(".");if(arr.length===2&&arr[1].length===3)s=arr.join("")}
 const value=Number(s);
 if(!Number.isFinite(value))throw Error("رقم مالي غير مفهوم: "+String(x).slice(0,20));
 return neg?-value:value;
}
function normalizedDate(v){
 let str=String(v||"").trim();if(/^\d{4}-\d{2}-\d{2}/.test(str))return str.slice(0,10);
 let m=str.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/);
 if(m){let d=new Date(+m[3],+m[2]-1,+m[1]);if(d.getDate()===+m[1]&&d.getMonth()+1===+m[2])return [m[3],String(m[2]).padStart(2,"0"),String(m[1]).padStart(2,"0")].join("-")}
 throw Error("تنسيق التاريخ غير مدعوم: "+str);
}
const strip=s=>String(s||"").replace(/(?:\d[ -]?){12,19}/g,"[رقم حساب محجوب]").slice(0,140);
function matchedHeader(search){
 const terms=search==="date"?["date","posting date","transaction date","value date","التاريخ","تاريخ"]:
 search==="description"?["description","details","narrative","merchant","بيان","الوصف","تفاصيل","البيان"]:
 search==="debit"?["debit","withdrawal","money out","الخصم","مدين","سحب"]:
 search==="credit"?["credit","deposit","money in","الدائن","دائن","إيداع","ايداع"]:
 search==="direction"?["type","transaction type","نوع","حركة","direction"]:
 search==="reference"?["reference","transaction id","transaction no","transaction reference","ref no","trace","رقم العملية","رقم الحركة","المرجع","مرجع"]:
 ["amount","value","المبلغ","المبلغ بالجنيه"];
 return header.findIndex(h=>terms.some(k=>h.trim().toLowerCase().includes(k)));
}
function mappingSelect(name,title,choices){
 return '<label>'+title+'<select name="'+name+'" required>'+choices.map(({value,label})=>'<option value="'+esc(value)+'">'+esc(label)+'</option>').join("")+'</select></label>';
}
const fieldChoices=(none=false)=>[...(none?[{value:"",label:"بدون عمود"}]:[]),...header.map((h,i)=>({value:i,label:(i+1)+". "+h.slice(0,42)}))];
function uploadForm(){
 const accounts=(C.getState().accounts||[]).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+'</option>').join("");
 const cols=fieldChoices(),optional=fieldChoices(true);
 return '<div class="v4-hero"><div class="v4-eyebrow">BANKS · CSV WIZARD</div><h2>استيراد كشف حساب البنك</h2>'+
 '<p>الاستيراد قابل للتخصيص حسب ترتيب أعمدة البنك. CSV فقط، ولا يتم إرسال الملف إلى Supabase؛ تُحفظ المعاملات التي توافق عليها.</p></div>'+
 '<div class="v4-bento"><div class="v4-surface v4-half"><h3>1. اختر الملف والحساب</h3>'+
 '<label class="v4-fineprint">كشف الحساب CSV (حد أقصى 1 ميجابايت، 1,000 صف)<input type="file" id="v4-bankfile" accept=".csv,text/csv" style="display:block;width:100%;margin-top:8px"></label>'+
 '<div style="margin-top:12px"><label class="v4-fineprint">حساب استقبال المعاملات<select id="v4-importAccount" style="display:block;width:100%;padding:10px">'+accounts+'</select></label></div>'+
 '<p>لو كشف البنك بصيغة PDF، اطلب CSV من البنك. لا يُخزن ملف كشف الحساب نفسه.</p></div>'+
 '<div class="v4-surface v4-half"><h3>2. تعيين الأعمدة</h3>'+
 (loaded?'<form id="v4-mapcsv" class="v4-form">'+
 mappingSelect("date","التاريخ",cols)+
 mappingSelect("description","الوصف",optional)+
 mappingSelect("debit","عمود الخصم",optional)+
 mappingSelect("credit","عمود الإضافة",optional)+
 mappingSelect("amount","المبلغ الموحد (لو مفيش خصم/إضافة)",optional)+
 mappingSelect("direction","نوع المعاملة (اختياري)",optional)+
 mappingSelect("reference","رقم مرجعي من البنك (اختياري؛ لمنع التكرار)",optional)+
 '<label class="full">معنى المبلغ الموجب<select name="positiveMeans" required><option value="">حدد طريقة الإشارة حسب كشف البنك</option><option value="income">موجب = دخل / سالب = مصروف</option><option value="expense">موجب = مصروف / سالب = دخل</option><option value="explicit">عمود نوع مستقل يحدد الاتجاه</option></select></label>'+
 '<button class="v4-btn full">تحليل وعرض المعاملات</button></form>':'<div class="v4-empty">اختار ملفًا أولًا علشان تحدد الأعمدة الموجودة فيه.</div>')+
 '</div><div class="v4-surface v4-full"><h3>3. راجع واعتمد الدفعة</h3><div id="v4-bankpreview"></div></div></div>';
}
function render(){
 const root=$("v4-bank");if(!root)return;root.innerHTML=uploadForm();
 if(selectedAccount&&$("v4-importAccount"))$("v4-importAccount").value=selectedAccount;
 if(loaded){const frm=$("v4-mapcsv");for(const key of ["date","description","debit","credit","amount","direction","reference"]){
   const ix=matchedHeader(key);const item=frm.elements.namedItem(key);if(item)item.value=ix<0?"":String(ix);
  }}
 const target=$("v4-bankpreview");if(target){
 target.innerHTML=(message?'<div class="v4-note">'+esc(message)+'</div>':'')+
 (!prepared.length?'<div class="v4-empty">لا توجد معاملات للمراجعة.</div>':
 '<div class="v4-note">تم تحليل '+prepared.length+' معاملة. اختر ما تريد حفظه؛ المعاملات المتشابهة قد تكون عمليات حقيقية منفصلة.</div>'+
 '<div class="v4-table-wrap" style="max-height:390px;overflow:auto"><table class="v4-table"><thead><tr><th>حفظ؟</th><th>التاريخ</th><th>الوصف</th><th>القيمة</th><th>التصنيف</th></tr></thead><tbody>'+
 prepared.map((x,i)=>'<tr><td><input type="checkbox" aria-label="حفظ معاملة رقم '+(i+1)+'" data-bank-row="'+i+'" '+(excluded.has(i)?'':'checked')+'></td><td>'+esc(x.date)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.type==="expense"?"−":"+")+num(x.amount).toFixed(2)+'</td><td>'+esc(x.category)+'</td></tr>').join("")+
 '</tbody></table></div>'+
 '<p id="v4-bank-count" class="v4-fineprint">المحدد للحفظ: '+(prepared.length-excluded.size)+' من '+prepared.length+'. طابق الرصيد مع كشف البنك بعد الاستيراد.</p>'+
 '<div class="v4-chips" style="margin-top:14px"><button type="button" class="v4-btn" data-bank="commit">تأكيد حفظ الدفعة</button><button class="v4-btn secondary" type="button" data-bank="cancel">تجاهلها</button></div>');
 }}
async function loadCSV(file){
 if(!file||file.size>1048576||file.size===0||!(/\.csv$/i.test(file.name)||file.type==="text/csv"))throw Error("الملف لازم يكون CSV وأقل من 1MB");
 let data=csvRecords(await file.text());
 if(data.length<2||data.length>1001)throw Error("يلزم وجود عناوين أعمدة و1 إلى 1000 معاملة.");
 header=data.shift().map(x=>String(x).trim());rows=data;loaded=true;prepared=[];excluded.clear();filename=file.name;
 message="تم تحميل "+rows.length+" صف. راجع تعيين الأعمدة.";
 render();
}
function translate(rows,opts,accountId){
 if(!(C.getState().accounts||[]).some(a=>a.id===accountId))throw Error("اختر حسابًا صحيحًا");
 const find=key=>opts[key]===""?-1:Number(opts[key]);
 const d=find("date"),desc=find("description"),debit=find("debit"),credit=find("credit"),amount=find("amount"),direction=find("direction"),reference=find("reference");
 const positiveMeans=String(opts.positiveMeans||"");
 if(d<0||((debit<0||credit<0)&&amount<0))throw Error("حدد عمود التاريخ وعمود المبلغ أو الخصم والإضافة");
 if(!(debit>=0&&credit>=0)&&((direction<0&&!["income","expense"].includes(positiveMeans))||(direction>=0&&positiveMeans!=="explicit")))throw Error("حدد طريقة تفسير إشارة المبلغ أو اختر وجود عمود مستقل لنوع المعاملة.");
 const ids=new Set((C.getState().transactions||[]).map(x=>x.sourceHash).filter(Boolean));
 const duplicates=new Set(),occurrence=new Map(),out=[];
 for(const [i,r] of rows.entries()){
  if(r.every(x=>!String(x).trim()))continue;
  try{
    const date=normalizedDate(r[d]),description=strip(desc<0?"كشف بنك":r[desc]).trim()||"عملية كشف بنك";
    let directionStr=direction<0?"":String(r[direction]||"").toLowerCase();
    let type="expense",value=0;
    if(debit>=0&&credit>=0){
      const deb=Math.abs(normalizeMoney(r[debit])),cre=Math.abs(normalizeMoney(r[credit]));
      if(deb>0&&cre>0)throw Error("السطر يحتوي خصمًا وإضافة معًا");
      type=cre>0?"income":"expense";value=cre||deb;
    }else{
      const a=normalizeMoney(r[amount]);
      type=positiveMeans==="income"?(a>=0?"income":"expense"):(a>=0?"expense":"income");
      if(direction>=0){
        if(!/credit|deposit|income|دائن|ايداع|debit|withdraw|expense|مدين|خصم|سحب/.test(directionStr))
          throw Error("نوع المعاملة غير واضح في عمود الاتجاه");
        type=/credit|deposit|income|دائن|ايداع/.test(directionStr)?"income":"expense";
      }
      value=Math.abs(a);
    }
    if(!(value>0&&value<=1e8))throw Error("المبلغ غير صالح أو صفر");
    const basis=[accountId,date,type,value.toFixed(2),description.toLowerCase()].join("|");
    // Bank reference is preferred; a row occurrence index preserves real repeated
    // same-day purchases when the bank did not provide one.
    const bankRef=reference>=0?String(r[reference]||"").trim().toLowerCase():"";
    const seq=(occurrence.get(basis)||0)+1;occurrence.set(basis,seq);
    const stable=bankRef?"ref|"+accountId+"|"+bankRef:"position|"+basis+"|"+seq;
    const fp="bank4-"+fhash(stable)+"-"+fhash(stable.split("").reverse().join(""));
    if(ids.has(fp)||duplicates.has(fp))continue;duplicates.add(fp);
    out.push({id:crypto.randomUUID?crypto.randomUUID():"bank"+Date.now()+i,date,type,
      amount:value,description,accountId,sourceHash:fp,category:type==="income"?"دخل آخر":(global.FLOSY_CAPTURE?.cat(description)||"مشتريات"),
      source:"bank_csv_reviewed",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }catch(err){throw Error("خطأ بالسطر "+(i+2)+": "+err.message)}
 }
 return out;
}
document.addEventListener("change",async e=>{
 if(e.target.id==="v4-importAccount"){selectedAccount=e.target.value;return}
 if(e.target.id!=="v4-bankfile")return;try{await loadCSV(e.target.files[0])}catch(err){message=err.message;loaded=false;prepared=[];render()}
});
document.addEventListener("submit",e=>{
 if(e.target.id!=="v4-mapcsv")return;e.preventDefault();
 try{const f=new FormData(e.target),options=Object.fromEntries(f.entries());
 selectedAccount=$("v4-importAccount")?.value||"";
 prepared=translate(rows,options,selectedAccount);excluded.clear();
 message=prepared.length?"تمت المعاينة. افحص الصفوف والمبالغ قبل الضغط على حفظ.":"لم أجد معاملات جديدة أو جميع الصفوف مكررة.";
 render();
 }catch(err){message=err.message;prepared=[];render()}
});
document.addEventListener("change",e=>{
 const index=e.target?.dataset?.bankRow;
 if(index===undefined)return;
 const i=Number(index);if(!Number.isInteger(i)||i<0||i>=prepared.length)return;
 if(e.target.checked)excluded.delete(i);else excluded.add(i);
 const count=$("v4-bank-count");
 if(count)count.textContent="المحدد للحفظ: "+(prepared.length-excluded.size)+" من "+prepared.length+". طابق الرصيد مع كشف البنك بعد الاستيراد.";
});
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-bank]");if(!b)return;
 if(b.dataset.bank==="cancel"){prepared=[];message="تم الإلغاء ولم يُحفظ شيء.";render()}
 if(b.dataset.bank==="commit"){
  if(!prepared.length)return;
  if(!confirm("تأكيد إضافة "+prepared.length+" معاملة من كشف البنك؟ لن تُضاف أي معاملة بدون موافقتك."))return;
  const prior=new Set((C.getState().transactions||[]).map(x=>x.sourceHash).filter(Boolean));
  const save=prepared.filter((x,i)=>!excluded.has(i)&&!prior.has(x.sourceHash));
  if(!save.length){C.toast("لا توجد معاملات جديدة محددة للحفظ");return;}
  if(save.length)C.mutate(s=>s.transactions.push(...save));
  prepared=[];excluded.clear();message="تم تسجيل "+save.length+" معاملة بعد استبعاد غير المحدد والمكرر. طابق الرصيد مع كشف البنك.";
  render();C.toast("تم استيراد "+save.length+" معاملة");
 }
});
global.FLOSY_BANK_CSV={render,translate,csvRecords,normalizeMoney,normalizedDate};
render();
})(window);