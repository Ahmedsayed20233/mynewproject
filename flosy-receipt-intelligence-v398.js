/* Flosy Receipt Intelligence v3.9.8.
 * True-data ranker is supplemental; explicit amount labels and arithmetic win.
 * Wrapped around legacy parser: OCR visual recognition still Tesseract / Android.
 * Never claims all receipts supported; never saves ledger records automatically.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_RECEIPT_INTEL_V398=api;
})(typeof window!=="undefined"?window:null,function(root){"use strict";
 const trained=root?.FLOSY_RECEIPT_TRAINED_V398||null;
 const west=s=>String(s||"").normalize("NFKC")
  .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
  .replace(/[٫]/g,".").replace(/[٬]/g,",")
  .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\u064b-\u065f\u0640]/g,"");
 const squash=s=>west(s).replace(/\r/g,"\n").replace(/[ \t]+/g," ").trim();
 const money=s=>{
  const n=Number(west(s).replace(/[,\s]/g,""));
  return Number.isFinite(n)&&n>0&&n<1e9?n:null;
 };
 const labelRx=/اجمالي|الإجمالي|الاجمالي|صاف[ىي]|المطلوب|المستحق|المجموع|grand\s*total|total\s*(?:due|amount)?|net\s*total|amount\s*due|to\s*pay/i;
 const subRx=/subtotal|sub[\s-]*total|فرعي|قبل\s*الضريب|قبل\s*الخصم/i;
 const ignoreRx=/الضريب|خصم|discount|vat|tax|الباق[ىي]|change|الكمية|qty|رقم\s*(?:الطلب|الفاتورة|الهاتف)|invoice\s*(?:no|number)|receipt\s*(?:no|number)|order\s*(?:no|id)|mobile|phone|barcode|التاريخ|time/i;
 const moneyPattern=/(?:^|[^\d])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d{1,9}(?:\.\d{1,2})?)(?!\d)/g;
 function numericAmounts(line){
  const s=squash(line),out=[];let match;
  moneyPattern.lastIndex=0;
  while((match=moneyPattern.exec(s))!==null){
   const n=money(match[1]);if(n!==null)out.push(n);
   if(out.length>12)break;
  }
  return out;
 }
 function evidenceLines(text){
  const lines=squash(text).split(/\n/).map(s=>s.trim()).filter(Boolean).slice(0,250);
  const candidates=[];
  lines.forEach((text,i)=>{
   const clean=text.replace(/جنيه|ج\.م|EGP|\bLE\b/gi,"").trim();
   if(!labelRx.test(text)||ignoreRx.test(text)||subRx.test(text))return;
   let vals=numericAmounts(text);
   let source="labeled_total";
   if(!vals.length&&lines[i+1]&&/^(?:EGP|جنيه|ج.م)?\s*[\d,. ]{1,18}\s*(?:EGP|جنيه|جم)?$/i.test(lines[i+1])){
    vals=numericAmounts(lines[i+1]);source="split_labeled_total";
   }
   if(vals.length===1)candidates.push({amount:vals[0],source,line:i,text});
  });
  return {lines,candidates};
 }
 function featuresForLine(lines,index,value){
  const s=squash(lines[index]||""),prev=squash(lines[index-1]||"");
  const next=squash(lines[index+1]||"");
  const neighbor=[prev,s,next].join(" ");
  const f=[1,lines.length>1?index/(lines.length-1):.5,.5,
   +/[ء-ي]/.test(s),
   +labelRx.test(neighbor),+subRx.test(neighbor),
   +/ضريبة|vat|\btax\b/i.test(neighbor),
   +/سعر|price|قيمة/i.test(neighbor),
   +/كمية|quantity|\bqty\b/i.test(neighbor),
   +/تاريخ|date/i.test(neighbor),
   +/رقم الطلب|order\s*no|invoice\s*no/i.test(neighbor),
   +/المتجر|store\s*name/i.test(neighbor),
   +labelRx.test(s),+subRx.test(s),+/مدفوع|paid/i.test(s),
   +/EGP|جنيه|ج.م/i.test(s),
   +/\d{7,}/.test(s),
   +(value<10),+(value>=10&&value<10000),+(value>=10000),
   +(index/Math.max(1,lines.length-1)>.8)
  ];
  return f;
 }
 function trainedRank(lines,line,value){
  const w=trained?.weights;
  if(!Array.isArray(w)||w.length!==21)return null;
  const f=featuresForLine(lines,line,value);
  let z=0;for(let i=0;i<w.length;i++)z+=w[i]*f[i];
  return Math.round(10000/(1+Math.exp(-Math.max(-35,Math.min(35,z)))))/10000;
 }
 function rescueText(text){
  const {lines,candidates}=evidenceLines(text);
  if(!candidates.length)throw Error("مفيش إجمالي واضح في الوصل؛ جرّب صورة أوضح أو اكتب الإجمالي يدويًا");
  // Ambiguous explicitly labeled totals must never be resolved by guessing.
  const unique=[...new Set(candidates.map(x=>x.amount))];
  if(unique.length>1)throw Error("الإيصال فيه أكثر من إجمالي مختلف؛ صحح النص أو اختار الإجمالي الصحيح");
  const best=candidates[candidates.length-1],dateText=lines.join(" ");
  const d=dateText.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  const merchant=lines.find(x=>/[ء-يA-Za-z]{3,}/.test(x)&&!labelRx.test(x)&&!ignoreRx.test(x))||null;
  return {amount:best.amount,merchant,date:d?d[1]+"-"+d[2].padStart(2,"0")+"-"+d[3].padStart(2,"0"):null,
   items:[],itemsSum:null,arithmeticConsistent:false,arithmeticContradiction:false,
   currency:"EGP",receiptNumber:null,paymentMethod:null,tax:null,discount:null,subtotal:null,paid:null,change:null,
   confidence:.52,evidence:best.source,autoQuality:false,
   description:merchant?"إيصال — "+merchant:"إيصال يحتاج مراجعة",modelVersion:"3.9.8"};
 }
 function enrich(input,legacy){
  const src=squash(input).slice(0,22000),{lines,candidates}=evidenceLines(src);
  let result,reason="";
  try{result=legacy.extract(src);}
  catch(err){reason=String(err?.message||"");result=rescueText(src);}
  const distinct=[...new Set(candidates.map(c=>c.amount))];
  const conflict=distinct.length>1 ||
    (distinct.length===1&&result.amount!==distinct[0]&&Math.abs(result.amount-distinct[0])>.05);
  const indexed=lines.findIndex(x=>x.includes(String(result.amount))&&labelRx.test(x));
  const rank=trainedRank(lines,Math.max(0,indexed<0?lines.length-1:indexed),result.amount);
  const warnings=[];
  if(reason)warnings.push("محرك القراءة الرئيسي لم يفهم النص بشكل كامل؛ تمت استعادة إجمالي مُسمى للمراجعة");
  if(conflict)warnings.push("أرقام الإجمالي مختلفة: لا تحفظ قبل مراجعة الإجمالي الصحيح");
  if(result.arithmeticContradiction)warnings.push("مجموع الأصناف لا يطابق الإجمالي؛ راجع تفاصيل الأصناف");
  if(!result.date)warnings.push("تاريخ الإيصال مش واضح؛ راجع تاريخ العملية");
  if(!result.merchant)warnings.push("اسم المتجر مش واضح؛ صحح الوصف");
  if(!result.items?.length)warnings.push("الأصناف لم تُقرأ بثقة؛ ممكن تدخلها يدويًا");
  const needsReview=!!warnings.length||result.confidence<.86||!result.autoQuality;
  return {...result,confidence:Math.min(Number(result.confidence||0),conflict?.55:1),
   autoQuality:false,requiresOwnerReview:true,needsReview,extractionWarnings:warnings,
   learnedTotalRankScore:rank,learnedTotalRankKind:rank!==null?"real-ararec-ocr-text-ranker":null,
   totalAlternatives:distinct.slice(0,5),modelVersion:"3.9.8",
   evidence:result.evidence||"manual_recovery"};
 }
 function install(legacy){
  if(!legacy||typeof legacy.extract!=="function")return false;
  if(legacy.__flosyV398)return true;
  const original=legacy.extract.bind(legacy);
  legacy.extract=text=>enrich(text,{extract:original});
  legacy.__flosyV398=true;
  legacy.modelInfo={...legacy.modelInfo,
   realAnnotatedReceipts:trained?.receiptCount||0,
   realDataset:trained?.source||null,
   realHeldOut:trained?.heldOut||null,modelVersion:"3.9.8",
   scope:"Text recognition not retrained; ranking assists only"};
  return true;
 }
 if(root?.FLOSY_RECEIPT_ML)install(root.FLOSY_RECEIPT_ML);
 return {enrich,install,evidenceLines,trainedRank,numericAmounts,modelAvailable:!!trained,version:"3.9.8"};
});
