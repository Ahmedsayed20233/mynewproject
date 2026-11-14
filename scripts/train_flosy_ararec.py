#!/usr/bin/env python3
"""Flosy post-OCR total field classifier trained on real MIT AraReceipt annotations.
NO image recognition is trained; this only ranks already recognized numeric regions.
"""
import hashlib,json,math,random,re,unicodedata,urllib.request
from pathlib import Path
URL="https://huggingface.co/datasets/IslamMesabah/AraReceipt/resolve/main/metadata.jsonl"
FEAT=["bias","relative_y","relative_x","arabic","near_total_key","near_subtotal_key",
      "near_tax_key","near_product_price_key","near_quantity_key","near_date_key",
      "near_invoice_key","near_store_key","total_text","subtotal_text",
      "paid_text","currency","long_numeric","low_value","medium_value",
      "high_value","last_fifth"]
def norm(x):
 s=unicodedata.normalize("NFKC",str(x or ""))
 return s.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹","01234567890123456789"))
def number(t):
 s=norm(t).replace("٫",".").replace("٬",",").strip()
 if not re.fullmatch(r"[\d, ]+(?:\.\d{1,3})?",s):return None
 try:
  x=float(s.replace(",","").replace(" ",""))
  return x if 0<x<1e9 else None
 except ValueError:return None
def xy(a):
 b=a["box"];return sum(b[::2])/4,sum(b[1::2])/4
def features(a,doc):
 t=norm(a["text"]).lower();n=number(t);x,y=xy(a)
 h=max(1,doc["height"]);w=max(1,doc["width"])
 near=set()
 for b in doc["annotations"]:
  if b is a:continue
  bx,by=xy(b)
  if abs(y-by)<max(35,h*.023) and abs(x-bx)<w*.84:near.add(b["label"])
 f=[1,min(1,y/h),min(1,x/w),int(bool(re.search(r"[\u0621-\u064a]",t))),
    *[int(v in near) for v in [24,18,20,16,14,8,12,2]],
    int(bool(re.search(r"اجمالي|الاجمالي|المجموع|total|net|المطلوب",t))),
    int(bool(re.search(r"subtotal|قبل الضريبه|فرعي",t))),
    int(bool(re.search(r"paid|مدفوع",t))),
    int(bool(re.search(r"egp|جنيه|جم|le",t))),
    int(bool(re.search(r"\d{7,}",t))),
    int(n is not None and n<10),int(n is not None and 10<=n<10000),
    int(n is not None and n>=10000),int(y/h>.8)]
 assert len(f)==len(FEAT),(len(f),len(FEAT))
 return f
def sig(x):return 1/(1+math.exp(-max(-35,min(35,x))))
def score(w,x):return sig(sum(a*b for a,b in zip(w,x)))
def summarize(rows,w):
 tp=fp=fn=tn=0;bydoc={}
 for x,y,d in rows:
  pred=score(w,x)>=.5
  if y and pred:tp+=1
  elif y:fn+=1
  elif pred:fp+=1
  else:tn+=1
  bydoc.setdefault(d,[]).append((score(w,x),y))
 p=tp/max(1,tp+fp);r=tp/max(1,tp+fn);f=2*p*r/max(1e-10,p+r)
 valid=[v for v in bydoc.values() if any(y for _,y in v)]
 top=sum(max(v,key=lambda a:a[0])[1] for v in valid)/max(1,len(valid))
 return dict(count=len(rows),positives=tp+fn,precision=round(p,4),recall=round(r,4),
   f1=round(f,4),top1=round(top,4),receiptCount=len(valid),tp=tp,fp=fp,fn=fn,tn=tn)
def main():
 req=urllib.request.Request(URL,headers={"User-Agent":"FlosyReceiptsResearch/1.0"})
 with urllib.request.urlopen(req,timeout=60) as r:raw=r.read(1500000)
 docs=[json.loads(x) for x in raw.decode().splitlines() if x.strip()]
 if len(docs)!=100:raise RuntimeError("Expected AraReceipt 100 docs; got "+str(len(docs)))
 dataset_sha=hashlib.sha256(raw).hexdigest()
 rows=[]
 for doc in docs:
  for a in doc["annotations"]:
   if number(a["text"]) is None or a["label"]==0:continue
   rows.append((features(a,doc),int(a["label"]==23),doc["id"]))
 train=[x for x in rows if x[2]%5!=0];test=[x for x in rows if x[2]%5==0]
 if sum(y for _,y,_ in test)<8:raise RuntimeError("Insufficient held-out totals")
 rng=random.Random(398);seq=train[:];w=[0.]*len(FEAT)
 pos=sum(y for _,y,_ in train);pw=min(15,max(1,(len(train)-pos)/max(1,pos)))
 for epoch in range(90):
  rng.shuffle(seq);lr=.12/(1+epoch*.035)
  for x,y,_ in seq:
   g=(y-score(w,x))*(pw if y else 1)
   for k,v in enumerate(x):w[k]+=lr*(g*v-.0009*w[k])
 a=summarize(train,w);b=summarize(test,w)
 model=dict(version="3.9.8",kind="real-ararec-total-region-ranker",source=URL,
  license="MIT",datasetSha256=dataset_sha,receiptCount=100,
  trainReceiptCount=80,heldOutReceiptCount=20,features=FEAT,
  weights=[round(v,7) for v in w],train=a,heldOut=b,threshold=.5,
  scope="Post-OCR text region total ranking only, not photo OCR")
 Path("flosy-receipt-trained-v398.js").write_text(
  "(function(r){r.FLOSY_RECEIPT_TRAINED_V398="+json.dumps(model,ensure_ascii=False,separators=(",",":"))+
  ";})(typeof window==='undefined'?globalThis:window);\n",encoding="utf-8")
 Path("docs").mkdir(exist_ok=True)
 lines=["# Flosy AraReceipt training verification", "",
 "Real manually reviewed Arabic receipts: 100 images, 4,609 annotations, MIT.",
 "Task: OCR-text total-value region ranker; this is NOT an image-to-text OCR model.",
 "Receipt-level train/test split: 80/20, no receipt leaks across split.", "",
 "| Split | Regions | Positive | Precision | Recall | F1 | Top-1 receipt recall |",
 "|---|---:|---:|---:|---:|---:|---:|",
 *["| {} | {} | {} | {} | {} | {} | {} |".format(name,m["count"],m["positives"],
    m["precision"],m["recall"],m["f1"],m["top1"]) for name,m in [("Train",a),("Held out",b)]],
 "", "Source: "+URL, "Dataset SHA256: "+dataset_sha,"",
 "Do not extrapolate to images or all Egyptian receipts. Values are not calibrated confidence. Manual correction remains required."]
 Path("docs/FLOSY_ARARECEIPT_TRAINING_RESULTS.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
 print(json.dumps({"sourceDocs":len(docs),"training":a,"heldOut":b}))
if __name__=="__main__":main()
