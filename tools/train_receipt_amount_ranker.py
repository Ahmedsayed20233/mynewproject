"""Train the Flosy ReceiptML numeric-line candidate ranker on synthetic cases.
This is an offline helper, not a photo OCR model and not a universal receipt recognizer.
No user images, bank receipts, customer names or personal financial records are read.

Run: python3 tools/train_receipt_amount_ranker.py
Needs scikit-learn and prints JSON with the weights copied into flosy-receipt-ml.js.
"""
import json
import random
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score

FEATURES = ['net','total','paid','subtotal','tax_or_discount','change','qty','invoice',
            'unitprice','method','currency','late','separator','zero','item','multilabel','large_identifier']
CLASSES = ['net','total','paid','subtotal','tax_or_discount','change','qty','invoice',
           'unitprice','method','item']
rng = random.Random(20261111)
x_rows, y_rows = [], []
for _ in range(14000):
    kind = rng.choices(CLASSES, weights=[14,20,12,12,10,6,7,8,5,3,3])[0]
    row=[0.0]*len(FEATURES)
    def set_feature(name,probability=1):
        if rng.random()<probability: row[FEATURES.index(name)]=1.0
    if kind=='net':
        set_feature('net',.96);set_feature('total',.36)
    elif kind=='total':set_feature('total',.95)
    elif kind=='paid':set_feature('paid',.95);set_feature('method',.18)
    elif kind=='subtotal':set_feature('subtotal',.95);set_feature('total',.75)
    elif kind=='tax_or_discount':set_feature('tax_or_discount',.96)
    elif kind=='change':set_feature('change',.95);set_feature('paid',.05)
    elif kind=='qty':set_feature('qty',.96);set_feature('total',.2)
    elif kind=='invoice':set_feature('invoice',.96)
    elif kind=='unitprice':set_feature('unitprice',.97)
    elif kind=='method':set_feature('method',.9)
    elif kind=='item':set_feature('item',.85);set_feature('unitprice',.12)
    set_feature('currency',.45)
    set_feature('separator',.72)
    set_feature('zero',.2 if kind in ('tax_or_discount','change') else .02)
    set_feature('multilabel',.05)
    set_feature('large_identifier',.7 if kind=='invoice' else .01)
    row[FEATURES.index('late')] = (
        rng.betavariate(5,2) if kind in ('net','total','paid','change')
        else rng.betavariate(2,4))
    if rng.random()<.035:
        j=rng.randrange(11);row[j]=1-row[j]
    x_rows.append(row)
    y_rows.append(int(kind in ('net','total')))

train_x,test_x,train_y,test_y=train_test_split(
    x_rows,y_rows,random_state=441,stratify=y_rows,test_size=.20)
classifier=LogisticRegression(
    max_iter=1000,class_weight='balanced',C=1.1,random_state=2026)
classifier.fit(train_x,train_y)
proba=classifier.predict_proba(test_x)[:,1]
pred=(proba>=.5).astype(int)
print(json.dumps({
 'training_source':'synthetic_only',
 'features':FEATURES,
 'intercept':round(float(classifier.intercept_[0]),7),
 'weights':[round(float(w),7) for w in classifier.coef_[0]],
 'training_samples':14000,'held_out_synthetic_test':len(test_y),
 'synthetic_accuracy':round(accuracy_score(test_y,pred),4),
 'synthetic_precision':round(precision_score(test_y,pred),4),
 'synthetic_recall':round(recall_score(test_y,pred),4),
 'synthetic_roc_auc':round(roc_auc_score(test_y,proba),4)
},ensure_ascii=False,indent=2))
