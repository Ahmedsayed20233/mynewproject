"""Re-train Flosy VoiceNLU on 14,800 synthetic Egyptian Arabic utterances.
No microphone recordings, personal names from the user's actual phone, bank
records or other sensitive data are accessed. Synthetic hold-out scores are
NOT an accuracy guarantee for real-world speech.
Usage: python3 tools/train_voice_intent_model.py
Requires: scikit-learn and numpy. Compare output against flosy-voice-nlu.js.
"""
import json,random,re
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
SEED=20261111
rng=random.Random(SEED)
REGEX=[
 r"دفعت|دفعنا|سددت|اديت|أديت|بعت|خصموا",
 r"اشتريت|اشتريتها|اشتري|جبت|شريت|كلفني",
 r"صرفت|صرفنا|مصروف|دفعة|فلوس خرجت|اتخصم",
 r"حولت|حوّلت|حوالة|تحويل|نقلت|نقلتهم",
 r"استلمت|وصلني|وصلتلي|جالي|جاتلي|دخللي",
 r"قبضت|مرتب|راتب|نزل|خدت|اتصرفلي",
 r"رجعلي|اتردلي|استرديت|ردوا|استرداد",
 r"لحسابي|حساباتي|من حسابي|بين حساب|لنفسي|محفظتي|من الفيزا للكاش|من البنك للكاش|للكاش|للبنك",
 r"من (?:الفيزا|البنك|الحساب|الكاش|المحفظة).{0,25}(?:للكاش|للبنك|للمحفظة|لحسابي|للفيزا)",
 r"لخالد|لمحمد|لأحمد|لاصاحبي|لصاحبي|لأخويا|لامي|لأمي|لبابا|لصاحب|للراجل|للمحل",
 r"هشتري|هدفع|هصرف|هحول|هنقل|هقبض|هستلم|هجيب|ناوي|مخطط|بكرة|بكره|المفروض|لو ",
 r"مدفعتش|ما دفعتش|ماحولتش|ما حولتش|مشتريتش|ما اشتريتش|متسجلش|ما تسجلش|ملغى|اتلغت",
 r"مش |لسه|يمكن|تقريبا|ممكن",
 r"كام|ازاي|ليه|امتى|ايه|إيه|هل |\?",
 r"سجل|ضيف|اكتب|احسب",
 r"مواصلات|اوبر|مطعم|اكل|قهوة|كافيه|صيدلية|فواتير|ايجار|دوا|بنزين|سوبرماركت|جزم|هدية",
 r"توفير|استثمار|محفظة|كاش|فيزا|بنك",
 r"جنيه|جم|EGP|جنيهات",
 r"\d",r"امبارح|اول امبارح|النهارده|اليوم",
 r"فشل|مرفوض|معلق|ملغي|اترفض|استرجع",
 r"رصيدي|ميزانيتي|الحسابات|مساعدة|نصيحة|شرح",
 r"من ",r"إلى |الى |لـ|لي |ل ",
 r"إيداع|ايداع|تحويل وارد",
 r"سحبت|سحب|دفع فلوس",
 r"مش مصروف|مجرد مثال|تجربة|تدريب|مش حقيقي",
 r"اتحول|اتنقل|حولتهم",
 r"استلفت|اقترضت|دين",
 r"دفعت|صرفت|اشتريت|قبضت|وصلني|استلمت|حولت|نقلت"
]
REGEX=[re.compile(x,re.I) for x in REGEX]
def norm(x):
 return re.sub(r"\s+"," ",re.sub(r"[\u064b-\u065f]","",x.lower().translate(
  str.maketrans("أإآىةؤئ","ااايهوء")).replace("ـ",""))).strip()
def featurize(x):
 return [int(bool(r.search(norm(x)))) for r in REGEX]
TEMPLATES={
 "expense":["دفعت {money} في {category}","اشتريت {category} ب {money}",
 "صرفت {money} على {category}","سددت {money} فاتورة {category}",
 "اتخصم من كارت البنك {money} {category}","كلفني {category} {money}",
 "اشتريت {category} النهارده بمبلغ {money}","حولت {money} لصاحبي",
 "بعت لخالد {money} جنيه","سحبت {money} من البنك",
 "سجل مصروف {money} {category}","جبت {category} ب {money}"],
 "income":["قبضت {money} من الشغل","نزل المرتب {money} جنيه",
 "وصلني {money} جنيه من محمد","جالي تحويل وارد {money}",
 "استلمت {money} النهارده","دخللي {money} في الحساب",
 "رجعلي من التاجر {money}","خدت {money} من العميل",
 "سجل دخل {money} جنيه","اتردلي {money} جنيه"],
 "transfer":["حولت {money} من البنك للكاش","حولت {money} من الفيزا للمحفظة",
 "نقلت {money} بين حساباتي","حولت {money} لنفسي",
 "حوّلت من حسابي البنك لحسابي الكاش {money}",
 "نقلت الفلوس من المحفظة للبنك {money}","حولت {money} لحسابي التاني",
 "نقلت {money} من الكاش للفيزا"],
 "none":["بكرة هشتري {category} ب {money}",
 "لو دفعت {money} على {category} هيفضل كام",
 "لسه مدفعتش {money}","ماحولتش {money} لخالد",
 "ما اشتريتش {category}","كام رصيدي بعد {money}",
 "عايز نصيحة أوفر {money}","ممكن أشتري {category} ب {money}؟",
 "فكرني أدفع {money} بكرة","كان المفروض أدفع {money} بس اتلغى",
 "سجلها تجربة {money}","مش حقيقي دفعت {money}",
 "فشل تحويل {money}","إزاي أسجل {money}"]
}
MONEY=["75 جنيه","120 جنيها","1000 جنيه","مية وخمسين جنيه","٢٥٠ جنيه",
       "45 جم","الف ومتين جنيه","30 جنيه","12.5 جنيه"]
CATEGORIES=["قهوة","مواصلات","أكل","بنزين","الإيجار","الإنترنت",
            "لبس","دواء","سوبرماركت","كتب"]
FILLER=["","امبارح","النهارده","من الكاش","من الفيزا","من البنك",
        "معلش","يعني","بسرعة",""]
texts=[];labels=[]
for label,templates in TEMPLATES.items():
 for _ in range(3700):
  phrase=rng.choice(templates).format(money=rng.choice(MONEY),category=rng.choice(CATEGORIES))
  if rng.random()<.5: phrase+=" "+rng.choice(FILLER)
  if rng.random()<.15: phrase=rng.choice(["بص","يا فلوسي","طيب"])+" "+phrase
  texts.append(phrase);labels.append(label)
matrix=np.array([featurize(x) for x in texts],dtype=np.float32)
train,test=train_test_split(np.arange(len(labels)),test_size=.2,
 stratify=labels,random_state=SEED)
clf=LogisticRegression(max_iter=1200,C=.8,random_state=SEED)
clf.fit(matrix[train],np.array(labels)[train])
print(classification_report(np.array(labels)[test],clf.predict(matrix[test]),digits=3))
print(json.dumps({"classes":clf.classes_.tolist(),"bias":[round(float(x),5) for x in clf.intercept_],
 "weights":[[round(float(x),5) for x in row] for row in clf.coef_],
 "trainingSamples":len(labels),"heldOutSynthetic":len(test)},ensure_ascii=False,indent=2))
