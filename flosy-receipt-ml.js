/* Flosy ReceiptML v1 — offline bilingual OCR-text extraction.
 * A reproducible logistic-regression LINE RANKER was trained on 14,000
 * SYNTHETIC numeric-line examples. This is NOT a trained image OCR engine:
 * ML Kit and Tesseract perform the visual recognition. No original photos,
 * customer names, phone/account numbers or OCR text are persisted in ledger.
 * The model never performs ledger writes. All totals are independently checked.
 */
(function(w){
"use strict";
const MODEL={version:1,kind:"synthetic-receipt-line-logistic-regression",
 intercept:-4.311454,weights:[5.5842502,4.3305357,-5.5929153,-6.9118036,-3.5851199,-4.8185141,-4.8612696,-2.7076881,-3.257325,-2.7689073,-0.0192593,6.7808924,0.0080163,-0.430621,-2.7136434,0.2358376,-2.1043191],
 features:["net","total","paid","subtotal","tax_or_discount","change","qty","invoice","unitprice","method","currency","late","separator","zero","item","multilabel","large_identifier"]};
const toWestern=s=>String(s||"").normalize("NFKC")
 .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632))
 .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776))
 .replace(/[\u200c-\u200f\u202a-\u202e\u2066-\u2069\u064b-\u065f\u0640]/g,"")
 .replace(/[٬]/g,",").replace(/[٫]/g,".");
const trim=s=>toWestern(s).replace(/\s+/g," ").trim();
const net=/صافي|صافى|الصافي|النهائي|نهائي|المطلوب|المستحق(?!\s*للعميل)|grand\s*total|net\s*(?:amount|total)|final\s*total|total\s*due|amount\s*due|to\s*pay/i;
const total=/الاجمالي|الإجمالي|اجمالي|إجمالي|المجموع|\btotal\b|total\s*amount/i;
const paid=/المدفوع|لمدفوع|المفرع\s*من\s*العميل|مبلغ\s*الدفع|المقبوض|تم\s*الدفع|paid|received\s*from|tendered|payment\s*received/i;
const sub=/قبل\s*(?:الخصم|الضريب)|الإجمالي\s*قبل|الاجمالي\s*قبل|subtotal|sub\s*total|before\s*(?:discount|tax)|pre[- ]?tax/i;
const taxDisc=/خصم|الخصم|discount|ضريبة|الضريبة|vat|\btax\b|service\s*charge/i;
const change=/الباقي|الباقى|المتبقي|المتبقى|للعميل|remaining|change|balance\s*(?:due|returned)|refund/i;
const qty=/الكمية|الكميه|عدد\s*(?:الأصناف|الاصناف|القطع)|quantity|\bqty\b|\bpieces\b|item\s*count/i;
const invoice=/مسلسل\s*البيع|رقم\s*(?:الفاتورة|الفاتوره|الإيصال|الايصال|العملية)|\binvoice\b|receipt\s*(?:no|number|#)|serial\s*(?:no|number)|order\s*(?:no|id)|\bref(?:erence)?\b/i;
const unitprice=/سعر\s*(?:الوحدة|الوحده|القطعة|القطعه)|unit\s*price|price\s*each/i;
const method=/نقدي|نقدا|كاش|\bcash\b|فيزا|فيزه|\bvisa\b|بطاقة|\bcard\b|فوري|instapay|mastercard|مدى/i;
const currency=/EGP|جنيه|جنيهات|ج\.م|\bLE\b|\bج\s*م\b|\bجم\b|\$/i;
const itemWord=/كوتشي|كوئشي|كو.شي|حذاء|جزمة|ملابس|قميص|تيشيرت|بنطلون|جاكيت|بلوفر|shoe|sneaker|t-shirt|shirt|jeans|جهاز|منتج|\bitem\b|\bproduct\b/i;
const meta=/نسخة\s*العميل|اصل\s*فاتورة|إيصال\s*مبيعات|ايصال\s*مبيعات|مسلسل|الفاتورة|الرقم|تاريخ|طباعة|وقت|customer|\bdate\b|\btime\b|sales\s*receipt|best\s*wishes|thank\s*you|invoice|barcode|عدد\s*الأصناف|اجمالي\s*الكمية|إجمالي\s*الكمية/i;
const numberRx=/(^|[^\d\w])(\d{1,3}(?:[, ]\d{3})+(?:\.\d{1,2})?|\d{1,9}(?:\.\d{1,2})?)(?!\d)/g;
function numbers(s){
 const out=[];numberRx.lastIndex=0;let match;
 while((match=numberRx.exec(toWestern(s)))!==null){
   let raw=match[2].trim();
   if(/^\d{1,2}:\d{2}/.test(s.slice(match.index)))continue;
   let value=Number(raw.replace(/[, ]/g,""));
   if(Number.isFinite(value)&&value>=0&&value<1e9)out.push({amount:value,raw,pos:match.index+match[1].length});
   if(out.length>15)break;
 }
 return out;
}
function validDate(y,m,d){
 const date=new Date(Number(y),Number(m)-1,Number(d));
 return Number(y)>=2000&&Number(y)<=2100&&date.getFullYear()===+y&&date.getMonth()+1===+m&&date.getDate()===+d?
 [y,String(+m).padStart(2,"0"),String(+d).padStart(2,"0")].join("-"):null;
}
function extractDate(lines){
 for(const raw of lines){
  const s=toWestern(raw);let m=s.match(/\b(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})\b/);
  if(m){const result=validDate(m[1],m[2],m[3]);if(result)return result}
  m=s.match(/\b([0-3]?\d)[\/.\-]([01]?\d)[\/.\-](20\d{2})\b/);
  if(m){const result=validDate(m[3],m[2],m[1]);if(result)return result}
 }
 return null;
}
function lineFeatures(line,index,count,num){
 const text=trim(line);const n=Number(num?.amount||0);
 const b=[net,total,paid,sub,taxDisc,change,qty,invoice,unitprice,method,currency];
 const f=b.map(r=>r.test(text)?1:0);
 f.push(count>1?index/(count-1):0.5,/[:：]/.test(text)?1:0,n===0?1:0,
 itemWord.test(text)?1:0, (net.test(text)&&total.test(text))?1:0,
 (n>=1000000&&!currency.test(text))?1:0);
 return f;
}
const sigmoid=x=>1/(1+Math.exp(-Math.max(-50,Math.min(50,x))));
function candidateScore(line,index,count,num){
 const f=lineFeatures(line,index,count,num);
 let z=MODEL.intercept;for(let i=0;i<f.length;i++)z+=MODEL.weights[i]*f[i];
 return sigmoid(z);
}
function lineCandidates(lines){
 const candidates=[];
 for(let i=0;i<lines.length;i++){
  const text=trim(lines[i]);
  // Never derive a monetary amount from a timestamp/date or an invoice id.
  if(/\b20\d{2}[\/.\-]\d{1,2}[\/.\-]\d{1,2}\b/.test(text) &&
      !net.test(text)&&!total.test(text))continue;
  const nums=numbers(text);
  for(const n of nums){
   if(n.amount<=0||invoice.test(text)&&!net.test(text)&&!total.test(text)||qty.test(text)&&!net.test(text)||change.test(text)&&!net.test(text))continue;
   const probability=candidateScore(text,i,lines.length,n);
   const strong=net.test(text)&&!sub.test(text)&&!change.test(text);
   const explicit=(strong||total.test(text))&&!sub.test(text)&&!taxDisc.test(text)&&!qty.test(text)&&!invoice.test(text);
   candidates.push({value:n.amount,raw:n.raw,line:i,text,probability,strong,explicit,paid:paid.test(text),evidence:strong?"net_total":explicit?"labeled_total":paid.test(text)?"paid_amount":"unlabeled"});
  }
  // Handle totals printed on the NEXT line; never assume a neighboring date/invoice ID.
  if((net.test(text)||total.test(text)) && !sub.test(text)&&!qty.test(text)&&!taxDisc.test(text)&&!invoice.test(text)&&numbers(text).length===0 && i+1<lines.length){
   const next=trim(lines[i+1]);
   if(/^\s*(?:EGP|جنيه|جم)?\s*\d[\d ,.]{0,18}\s*(?:EGP|جنيه|جم)?\s*$/i.test(next)){
    const n=numbers(next)[0];if(n&&n.amount>0)
     candidates.push({value:n.amount,raw:n.raw,line:i,text:text+" "+next,probability:candidateScore(text+" "+next,i,lines.length,n),strong:net.test(text),explicit:true,paid:false,evidence:"split_total"});
   }
  }
 }
 return candidates;
}
function merchantName(lines){
 const early=lines.slice(0,Math.min(lines.length,14));
 const options=[];
 early.forEach((line,i)=>{
  const value=trim(line).replace(/[|_\[\]<>]/g,"").trim();
  if(value.length<2||value.length>80||meta.test(value)||net.test(value)||total.test(value)||invoice.test(value)||
      /(?:العميل|اسم|رقم\s*هاتف|phone|mobile|customer)/i.test(value)||
      /\d{4,}/.test(value)||!/[A-Za-z\u0621-\u064A]/u.test(value))return;
  let score=(i<9?3:0)+(i<=5?2:0);
  if(/^[A-Z][A-Z\s.&-]{2,25}$/.test(value))score+=9;
  if(/(?:متجر|سوبرماركت|صيدلية|ماركت|محل|market|shop|store|pharmacy)/i.test(value))score+=4;
  if(itemWord.test(value))score-=3;
  if(value.length>43)score-=4;
  options.push({value,score});
 });
 options.sort((a,b)=>b.score-a.score);
 return options[0]?.value?.slice(0,60)||null;
}
function labeledNumber(lines,rx,exclude){
 for(let i=lines.length-1;i>=0;i--){
  const line=trim(lines[i]);
  if(!rx.test(line)||(exclude&&exclude.test(line)))continue;
  const vals=numbers(line).filter(x=>x.amount<1e8);
  if(vals.length===1)return vals[0].amount;
  if(vals.length>1)return vals[vals.length-1].amount;
 }
 return null;
}
function findReceiptNo(lines){
 for(const line of lines){
  const text=trim(line);
  if(!invoice.test(text))continue;
  const match=text.match(/(?:مسلسل\s*البيع|رقم\s*(?:الفاتورة|الفاتوره|الايصال|الإيصال)|invoice\s*(?:number|no|#)?|receipt\s*(?:no|number|#)?|serial\s*(?:no|number))\s*[:#\- ]*([0-9A-Za-z-]{3,28})/i);
  if(match)return match[1];
  const nums=numbers(text);if(nums.length===1&&nums[0].raw.replace(/\D/g,"").length>=4)return nums[0].raw;
 }
 return null;
}
function extractItems(lines){
 const items=[],seen=new Set();
 const descriptions=/كوتشي|كوئشي|كو.شي|حذاء|جزمة|ملابس|قميص|تيشيرت|بنطلون|جاكيت|بلوفر|shoe|sneaker|shirt|jeans|\bitem\b|\bproduct\b/i;
 const header=/الصنف|الاصناف|الأصناف|المنتج|اسم\s*السلعة|الوصف|البيان|\bitems?\b|description|product\s*name/i;
 let inTable=false;
 for(const line of lines){
  let text=trim(line);
  if(header.test(text)&&(/سعر|الكمية|الكود|price|qty|code|description/i.test(text))&&
      numbers(text).length===0){inTable=true;continue}
  if(sub.test(text)||net.test(text)||total.test(text)||paid.test(text)||change.test(text)){
   // Item table ends before the invoice's totals section.
   if(!descriptions.test(text))inTable=false;
   if(!descriptions.test(text))continue;
  }
  if(meta.test(text)||invoice.test(text)||/العميل|customer|phone|mobile/i.test(text))continue;
  // Generic items from a clear table are supported, not just clothing keywords.
  // Outside tables require a recognizable item name plus a numeric value.
  if(!inTable&&!descriptions.test(text))continue;
  text=text.replace(/\b[A-Za-z][.,-]\d{1,6}\b/g," ").replace(/\s+/g," ").trim();
  const vals=numbers(text);if(vals.length===0)continue;
  let name=text.replace(/\d{1,3}(?:[, ]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g," ")
    .replace(/[|_:;\-]+/g," ").replace(/\s+/g," ").trim();
  if(/كوئشي|كو.شي/.test(name))name=name.replace(/كوئشي|كو.شي/g,"كوتشي");
  if(name.length<2||name.length>90||!/[A-Za-z\u0621-\u064A]/u.test(name))continue;
  // Determine unit price, quantity, line total by checking their arithmetic.
  // Do not treat SKU R.7 as a quantity or multiply line totals twice.
  const nums=vals.map(x=>x.amount).filter(x=>x>=0&&x<10000000);
  let qty=1,unitPrice=null,lineTotal=null;
  let found=false;
  for(let i=0;i<nums.length&&!found;i++){
   if(!Number.isInteger(nums[i])||nums[i]<1||nums[i]>100)continue;
   for(let j=0;j<nums.length&&!found;j++){
    if(i===j||nums[j]<=0)continue;
    for(let k=0;k<nums.length;k++){
     if(k===i||k===j)continue;
     if(Math.abs(nums[i]*nums[j]-nums[k])<=0.02){
      qty=nums[i];unitPrice=nums[j];lineTotal=nums[k];found=true;break;
     }
    }
   }
  }
  if(!found){
   const positive=nums.filter(x=>x>=.01);
   if(!positive.length)continue;
   unitPrice=positive[positive.length-1];lineTotal=unitPrice;
   if(positive.length>=2&&positive[0]>=1&&positive[0]<=100&&Number.isInteger(positive[0])&&positive[0]!==unitPrice){
    qty=positive[0];lineTotal=+(qty*unitPrice).toFixed(2);
   }
  }
  const key=name.toLowerCase()+"|"+String(unitPrice)+"|"+String(qty);
  if(seen.has(key))continue;
  seen.add(key);
  items.push({name:name.slice(0,80),quantity:qty,unitPrice,
    total:lineTotal===null?null:+lineTotal.toFixed(2)});
  if(items.length>=25)break;
 }
 return items;
}
function extract(text){
 const src=toWestern(String(text||"").slice(0,22000));
 const lines=src.split(/[\r\n]+/).map(trim).filter(x=>x.length>0).slice(0,250);
 const date=extractDate(lines);
 const merchant=merchantName(lines);
 const candidates=lineCandidates(lines);
 const preferred=candidates.filter(x=>x.explicit&&x.probability>=0.65).sort((a,b)=>
   (b.strong?1:0)-(a.strong?1:0)||b.probability-a.probability||b.line-a.line)[0];
 const paidValue=labeledNumber(lines,paid,change);
 const changeValue=labeledNumber(lines,change);
 const discount=labeledNumber(lines,/\bdiscount\b|(?:^|\s)الخصم\s*[:：]|^خصم\s*[:：]/i,sub);
 const tax=labeledNumber(lines,/\bVAT\b|\btax\b|\bضريبة\b|الضريبة/i);
 const subtotal=labeledNumber(lines,sub);
 // Paid amount is a lower-confidence FALLBACK if the OCR mangles the total label.
 const paidCandidate=candidates.filter(x=>x.paid&&!change.test(x.text)).sort((a,b)=>b.line-a.line)[0];
 const chosen=preferred||paidCandidate||null;
 if(!chosen||!(chosen.value>0&&chosen.value<1e9))throw Error("لم أجد إجماليًا أو مبلغًا مدفوعًا موثوقًا من الصورة");
 // Reconcile printed fields in integer piastres, independently of the ranker.
 // A missing adjustment is treated as zero only for this conservative veto:
 // tax-inclusive or incomplete OCR layouts can still be corrected in review.
 // Do not sum extracted items: the table may be cropped or only partly read.
 const cents=value=>Math.round(value*100);
 const validationIssues=[];
 if(subtotal!==null && Math.abs(cents(subtotal)+cents(tax??0)-
     cents(discount??0)-cents(chosen.value))>2)
   validationIssues.push("subtotal_mismatch");
 const hasZeroChange=(changeValue===0);
 let confidence=preferred?(preferred.strong?0.98:Math.max(0.82,Math.min(0.96,preferred.probability))):0.69;
 if(paidValue!==null&&Math.abs(paidValue-chosen.value)<=0.01)confidence=Math.min(0.99,confidence+0.03);
 if(!preferred&&hasZeroChange)confidence=0.74;
 if(validationIssues.length)confidence=Math.min(confidence,0.79);
 if(!date)confidence=Math.min(confidence,0.68);
 if(!merchant)confidence=Math.min(confidence,0.65);
 const timeLine=lines.find(l=>/\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:AM|PM|ص|م)?\b/i.test(l))||"";
 const time=timeLine.match(/\b((?:[01]?\d|2[0-3]):[0-5]\d\s*(?:AM|PM|ص|م)?)\b/i)?.[1]||null;
 const receiptNumber=findReceiptNo(lines);
 const paymentMethod=lines.some(l=>/نقدي|نقدا|\bcash\b/i.test(l))?"cash":
   lines.some(l=>/فيزا|\bcard\b|بطاقة|\bvisa\b/i.test(l))?"card":null;
 const items=extractItems(lines);
 return {amount:chosen.value,merchant,date,time,receiptNumber,paymentMethod,
   items,discount,tax,subtotal,paid:paidValue,change:changeValue,currency:"EGP",
   confidence:+confidence.toFixed(2),evidence:chosen.evidence,validationIssues,
   autoQuality:validationIssues.length===0&&!!preferred&&confidence>=0.86&&!!merchant&&!!date&&!!paymentMethod,
   modelVersion:MODEL.version,
   // No photos, customer name, phone or unredacted OCR transcript in finance record.
   description:[merchant||"إيصال",items[0]?.name].filter(Boolean).join(" — ").slice(0,95)};
}
w.FLOSY_RECEIPT_ML={extract,candidateScore,modelInfo:{kind:MODEL.kind,
 trainingSamples:14000,trainingSource:"synthetic only",version:MODEL.version}};
})(window);
