/* Flosy v3.10 Egyptian receipt interpretation (post-OCR).
 * CORU IE real-data trained item suggestions + arithmetic-only row extraction.
 * Not visual OCR. Never calls a model provider or writes to the finance ledger.
 * This wraps (rather than replaces) the separately evaluated AraReceipt total ranker.
 */
(function(root,factory){"use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_RECEIPT_EGYPT_V310=api;
})(typeof window!=="undefined"?window:null,function(root){"use strict";
 const world=root||{};
 const model=world.FLOSY_CORU_IE_V310||null;
 const normalize=x=>String(x??"").normalize("NFKC").toLowerCase()
  .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
  .replace(/[إأآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه")
  .replace(/[\u064b-\u065f\u0640\u200c-\u200f\u202a-\u202e]/g,"")
  .replace(/[^a-z0-9ء-ي ]+/g," ").replace(/\s+/g," ").trim();
 const round=n=>Math.round((Number(n)||0)*100)/100;
 const arabic=/[ء-ي]/;
 const latin=/[a-z]/i;
 const badLine=/اجمالي|المجموع|subtotal|grand\s*total|total\s*(?:due|amount)?|صافي|المطلوب|مستحق|فرعي|خصم|discount|ضريب|tax|vat|مدفوع|paid|tendered|cash\s*received|الباقي|change|رقم\s*(?:الفاتور|الايصال|الهاتف|طلب)|invoice\s*(?:no|number|#)|phone|mobile|barcode|سجل\s*تجاري|tax\s*id|كاشير|cashier|qr\s*code/i;
 const dateRx=/(?:^|\s)(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})(?:\s|$)/;
 const amountRx=/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,8}(?:\.\d{1,2})?/g;
 const moneyToken=t=>{const n=Number(String(t??"").replace(/,/g,""));
  return Number.isFinite(n)&&n>=0&&n<=1e8?n:null;};
 const candidates=Array.isArray(model?.lexicon)?model.lexicon:[];
 let index=null;
 function grams(s){
  const p="_"+normalize(s).replace(/ /g,"_")+"_";
  const out=new Set();
  for(let i=0;i+3<=p.length;i++)out.add(p.slice(i,i+3));
  return out;
 }
 function initIndex(){
  if(index)return index;
  const inverted=new Map(),stored=[];
  candidates.slice(0,2600).forEach((entry,id)=>{
   const name=normalize(entry[0]),category=String(entry[1]||"");
   if(name.length<3||name.length>80)return;
   const tri=grams(name),object={name,category,n:Number(entry[2])||1,tri,id};
   stored.push(object);
   for(const gram of tri){
    if(!inverted.has(gram))inverted.set(gram,[]);
    inverted.get(gram).push(object);
   }
  });
  index={inverted,stored};return index;
 }
 function findItem(raw){
  const q=normalize(raw);
  if(!q||q.length<3||q.length>85||!model)return null;
  const gramsQ=grams(q),{inverted}=initIndex(),votes=new Map();
  for(const gram of gramsQ)for(const entry of inverted.get(gram)||[])
   votes.set(entry,(votes.get(entry)||0)+1);
  const rank=[...votes].sort((a,b)=>b[1]-a[1]).slice(0,35);
  let best=null;
  for(const [entry,inter] of rank){
   const similarity=2*inter/(gramsQ.size+entry.tri.size);
   const value={name:entry.name,coruCategory:entry.category,similarity:round(similarity),
    source:"CORU-IE train item-name lexicon",matchedExistingName:entry.name===q};
   if(!best||similarity>best.similarity)best=value;
  }
  if(!best)return null;
  // Preserve original text. For short names require exact match to avoid hazardous substitutions.
  const needed=q.length<6?.99:.82;
  return best.similarity>=needed?best:null;
 }
 function decimalText(raw){
  return String(raw??"").normalize("NFKC")
   .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
   .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
   .replace(/[٫]/g,".").replace(/[٬]/g,",")
   .replace(/\b(\d{1,3}(?:\.\d{3})+),(\d{2})\b/g,(_,group,fraction)=>
    group.replace(/\./g,"")+"."+fraction)
   .replace(/(\d+),(\d{2})(?=\s*(?:EGP|جنيه|جم|ج\.م)\b)/gi,"$1.$2");
 }
 function parseItemRows(raw,context={}){
  const text=decimalText(raw),lines=text.split(/[\r\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,250);
  const output=[],seen=new Set();
  for(let i=0;i<lines.length;i++){
   const line=lines[i];
   if(badLine.test(line)||dateRx.test(line)||/\b(?:20\d\d|19\d\d)\b[^\n]*\d{1,2}[:/.-]\d{1,2}/.test(line))continue;
   const normalized=line.replace(/(?:\s|^)(?:EGP|LE|جنيه|جنيهات|ج\.م|جم)\s*$/i,"").trim();
   if(!normalized||normalized.length>120)continue;
   if(!arabic.test(normalized)&&!latin.test(normalized))continue;
   let name="",q=1,u=null,t=null,arithmeticSource="";
   // name  2 x 35.00 = 70.00 / name 2 35.00 70.00
   let m=normalized.match(/^(.{3,85}?)\s+(\d{1,3}(?:\.\d{1,3})?)\s*(?:x|×|\*)\s*(\d{1,8}(?:\.\d{1,2})?)\s*(?:=)?\s*(\d{1,8}(?:\.\d{1,2})?)$/i);
   if(m){name=m[1];q=moneyToken(m[2]);u=moneyToken(m[3]);t=moneyToken(m[4]);arithmeticSource="explicit_qty_times_unit";}
   if(!m){
    m=normalized.match(/^(.{3,85}?)\s+(\d{1,3}(?:\.\d{1,3})?)\s+(\d{1,8}(?:\.\d{1,2})?)\s+(\d{1,8}(?:\.\d{1,2})?)$/i);
    if(m){name=m[1];q=moneyToken(m[2]);u=moneyToken(m[3]);t=moneyToken(m[4]);arithmeticSource="three_verified_numbers";}
   }
   if(!m){
    m=normalized.match(/^(.{3,85}?)\s+(\d{1,8}(?:\.\d{1,2})?)$/i);
    if(m){name=m[1];q=1;u=t=moneyToken(m[2]);arithmeticSource="single_line_price";}
   }
   if(!m||!(q>0&&q<=1000)||!(u>0&&u<=1e7)||!(t>0&&t<=1e7))continue;
   if(Math.abs(round(q*u)-round(t))>.05)continue;
   name=name.replace(/[\s.:;_\-]+$/,"").trim();
   if(name.length<3||/\d{7,}|@/.test(name))continue;
   if(context.merchant&&normalize(name)===normalize(context.merchant))continue;
   const matched=findItem(name);
   // A genuinely explicit item row can be kept even without a corpus match.
   // A weak name+amount guess outside the corpus is not accepted.
   if(arithmeticSource==="single_line_price"&&!matched)continue;
   const key=normalize(name)+"|"+q+"|"+u+"|"+t;
   if(seen.has(key))continue;
   seen.add(key);
   output.push({name:name.slice(0,80),quantity:q,unitPrice:u,total:round(t),
    ...(matched?{coruSuggestedName:matched.name,coruClass:matched.coruCategory,
     coruMatchSimilarity:matched.similarity}:{}),
    extractionRule:arithmeticSource});
   if(output.length>=45)break;
  }
  return output;
 }
 function suggestions(items){
  if(!Array.isArray(items))return [];
  return items.map(item=>{
   const matched=findItem(item?.name||"");
   if(!matched)return {...item};
   return {...item,coruSuggestedName:matched.name,coruClass:matched.coruCategory,
    coruMatchSimilarity:matched.similarity};
  });
 }
 function enrich(text,original){
  if(!original||typeof original.extract!=="function")throw Error("Receipt OCR-text engine unavailable");
  const prepared=decimalText(text);
  const result=original.extract(prepared);
  const warnings=Array.isArray(result.extractionWarnings)?result.extractionWarnings.slice():[];
  const rowCandidates=parseItemRows(prepared,{merchant:result.merchant});
  const previous=Array.isArray(result.items)?result.items:[];
  const oldSum=previous.length?round(previous.reduce((s,x)=>s+Number(x.total||0),0)):null;
  const candidateSum=rowCandidates.length?round(rowCandidates.reduce((s,x)=>s+Number(x.total||0),0)):null;
  const target=Number(result.subtotal)||Number(result.amount);
  const candidateValid=rowCandidates.length>0&&target>0&&Math.abs(candidateSum-target)<=.05;
  const originalValid=previous.length>0&&target>0&&Math.abs(oldSum-target)<=.05;
  let selected=suggestions(previous),selection="legacy_with_coru_name_suggestions";
  if(rowCandidates.length&&!originalValid&&(candidateValid||!previous.length)){
   selected=rowCandidates;selection="verified_coru_assisted_item_rows";
  }
  const itemsSum=selected.length?round(selected.reduce((s,x)=>s+Number(x.total||0),0)):null;
  const subtotal=Number(result.subtotal),tax=Number(result.tax)||0,discount=Number(result.discount)||0;
  const arithmeticBySubtotal=Number.isFinite(subtotal)&&subtotal>0&&
   Math.abs(round(subtotal+tax-discount)-Number(result.amount))<=.05;
  const arithmeticByItems=itemsSum!==null&&
   Math.abs(round(itemsSum+tax-discount)-Number(result.amount))<=.05;
  const arithmeticConsistent=Boolean(result.arithmeticConsistent)||arithmeticBySubtotal||arithmeticByItems;
  const inconsistent=result.arithmeticContradiction===true&&
   !arithmeticBySubtotal&&!arithmeticByItems;
  if(result.evidence&&/paid|tender/i.test(result.evidence))
   warnings.push("المبلغ قد يكون المدفوع للكاشير وليس الإجمالي النهائي؛ صحّحه قبل الحفظ");
  if(result.paid!==null&&result.change!==null&&Number.isFinite(+result.paid)&&Number.isFinite(+result.change)&&
   Math.abs(round(result.paid-result.change)-Number(result.amount))>.05)
   warnings.push("قيمة المدفوع ناقص الباقي لا تطابق الإجمالي؛ راجع المبلغ");
  if(itemsSum!==null&&!arithmeticByItems&&!(Number.isFinite(subtotal)&&Math.abs(itemsSum-subtotal)<=.05))
   warnings.push("الأصناف المستخرجة غير مكتملة أو مجموعها مختلف؛ راجعها أو احفظ الإجمالي فقط");
  if(!selected.length)warnings.push("لم يثبت فهم أصناف الفاتورة؛ يمكن إضافة الأصناف يدويًا");
  if(model?.test?.unseenName?.accuracy===null)warnings.push("لم تتوفر عينة اختبار لأسماء منتجات جديدة");
  return {...result,items:selected,itemsSum,
   arithmeticConsistent,arithmeticContradiction:inconsistent,
   extractionWarnings:[...new Set(warnings)].slice(0,9),
   itemExtractionMethod:selection,
   coruModel: model?{source:"CORU-IE train.csv",kind:model.kind,trainRecords:model.trainingRecords,
    testAccuracy:model.test?.unseenName?.accuracy??null,scope:"item text only"}:null,
   // Never infer that high product-name similarity proves a correct amount.
   autoQuality:false,requiresOwnerReview:true,needsReview:true,
   modelVersion:"3.10.0"};
 }
 function install(legacy){
  if(!legacy||typeof legacy.extract!=="function")return false;
  if(legacy.__flosyEgyptV310)return true;
  const original=legacy.extract.bind(legacy);
  legacy.extract=source=>enrich(source,{extract:original});
  legacy.__flosyEgyptV310=true;
  legacy.modelInfo={...legacy.modelInfo,coruIE:model?.kind||"not_loaded",
   coruTrainRecords:model?.trainingRecords||0,modelVersion:"3.10.0",
   visualOcrFineTuned:false,scope:"Post-OCR Egyptian item semantics + receipt arithmetic"};
  return true;
 }
 if(world.FLOSY_RECEIPT_ML)install(world.FLOSY_RECEIPT_ML);
 return {decimalText,normalize,findItem,parseItemRows,suggestions,enrich,install,
  trained:!!model,modelInfo:model?{source:model.source,version:model.version,
   heldOut:model.test,trainRecords:model.trainingRecords}:null,version:"3.10.0"};
});