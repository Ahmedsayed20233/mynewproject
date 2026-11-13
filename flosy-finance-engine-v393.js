/* Flosy v3.9.3 — one auditable personal-finance intelligence layer.
 * Reads the canonical Flosy state; never invents salary, market returns or liabilities.
 * Model references: CFPB emergency savings; FINRA 3–6 months; SEC time horizon /
 * diversification; Egyptian Dar al-Ifta 85g 21K & 2.5% after full lunar year.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.FLOSY_FINANCE_ENGINE=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const num=x=>Number.isFinite(+x)&&+x>=0&&+x<1e12?+x:0;
 const money=n=>new Intl.NumberFormat("ar-EG",{maximumFractionDigits:0}).format(num(n))+" ج.م";
 const settings=s=>s?.settings?.financeProfileV393||{};
 const rows=s=>(Array.isArray(s?.transactions)?s.transactions:[]).filter(x=>
  ["expense","income","transfer"].includes(x.type)&&x.date&&num(x.amount)>0&&
  !["draft","pending","failed","cancelled","reversed"].includes(String(x.status||"").toLowerCase())&&
  !x.deleted);
 const month=d=>new Date(d).getFullYear()+"-"+String(new Date(d).getMonth()+1).padStart(2,"0");
 const group=(arr,key)=>arr.reduce((o,x)=>{const k=key(x);o[k]=(o[k]||0)+num(x.amount);return o},{});
 function distinctCommitments(s){
  const cfg=settings(s),manual=Array.isArray(cfg.monthlyCommitments)?cfg.monthlyCommitments:[];
  const debt=Array.isArray(s?.liabilities)?s.liabilities:[];
  // If an obligation is explicitly linked, never add it twice.
  const linked=new Set(manual.map(x=>x.liabilityId).filter(Boolean));
  const normalized=manual.filter(x=>x&&!x.inactive&&num(x.amount)>0).map(x=>({
   id:String(x.id||""),name:String(x.name||"التزام").slice(0,90),
   amount:num(x.amount),kind:x.kind||"bill",source:"profile"}));
  for(const x of debt)if(x&&!x.settled&&!linked.has(x.id)&&num(x.monthlyPayment)>0)
   normalized.push({id:String(x.id||""),name:String(x.name||"قسط"),amount:num(x.monthlyPayment),
     kind:"debt",source:"liability"});
  return normalized;
 }
 function profile(s,date=new Date()){
  const cfg=settings(s),period=month(date),actual=rows(s).filter(x=>String(x.date).slice(0,7)===period);
  const income=actual.filter(x=>x.type==="income").reduce((v,x)=>v+num(x.amount),0);
  const expense=actual.filter(x=>x.type==="expense").reduce((v,x)=>v+num(x.amount),0);
  const manualSalary=num(cfg.monthlySalary),extras=num(cfg.recurringExtraIncome);
  const salaryConfigured=manualSalary>0;
  const fixed=distinctCommitments(s),fixedSum=fixed.reduce((v,x)=>v+x.amount,0);
  const essentials=num(cfg.essentialVariableSpend);
  // Fixed commitments are FORECAST; actual transaction totals are HISTORIC,
  // never summed with fixed commitments to calculate the same month's spending.
  const livingCost=fixedSum+essentials;
  const predictableIncome=manualSalary+extras;
  const free=salaryConfigured?Math.max(0,predictableIncome-livingCost):null;
  const margin=salaryConfigured?predictableIncome-livingCost:null;
  const cash=Array.isArray(s?.accounts)?s.accounts.reduce((v,x)=>v+num(x.opening),0):0;
  return {period,actualIncome:income,actualExpense:expense,manualSalary,extras,
    salaryConfigured,predictableIncome,essentials,commitments:fixed,fixedSum,livingCost,
    free,margin,monthlyDebtService:fixed.filter(x=>x.kind==="debt").reduce((v,x)=>v+x.amount,0),
    emergencyCash:num(cfg.emergencyCash),goalMonths:Math.min(12,Math.max(3,num(cfg.emergencyMonths)||3)),
    risk:["low","medium","high"].includes(cfg.riskTolerance)?cfg.riskTolerance:"unset",
    horizonMonths:num(cfg.investmentHorizonMonths),desiredReserve:num(cfg.minimumMonthlyBuffer)};
 }
 function plan(s,date=new Date()){
  const p=profile(s,date),cfg=settings(s);
  if(!p.salaryConfigured||p.livingCost<=0)return {
   ready:false,reason:!p.salaryConfigured?"salary-missing":"commitments-missing",profile:p,
   note:"أدخل مرتبك الشهري ومصاريف المعيشة الأساسية والالتزامات قبل اقتراح أي مبلغ استثمار."};
  const target=p.livingCost*p.goalMonths, gap=Math.max(0,target-p.emergencyCash);
  const surplus=Math.max(0,p.margin-p.desiredReserve);
  const debtCritical=Boolean(cfg.highInterestDebt);
  // Heuristic prioritization, not a guaranteed-return or one-size-fits-all percentage.
  const emergency=Math.min(surplus,gap);
  const investment=debtCritical||gap>0?0:surplus;
  const buffer=p.margin>0?Math.min(p.margin,p.desiredReserve):0;
  const debtPressure=p.predictableIncome>0?p.monthlyDebtService/p.predictableIncome:0;
  const investAfterDebt=debtPressure>.4?0:investment;
  const liquidity=gap>0?"المرحلة الحالية: صندوق الطوارئ أولًا":"يمكن تقييم خيارات الاستثمار بعد الالتزامات";
  const riskAndHorizon=(p.horizonMonths<12||p.risk==="low")?
    "سيولة أو أدوات منخفضة التذبذب قصيرة الأجل بعد فهم الرسوم والمخاطر":
    p.horizonMonths<60?"أدوات دخل ثابت/صناديق متنوعة حسب الأفق والسيولة":
    "تنويع تدريجي بين نقد وأدوات دخل ثابت وصناديق أسهم متنوعة وفق تحمل المخاطر";
  const refs=[
   {label:"CFPB — Emergency fund",url:"https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/"},
   {label:"FINRA — Financial hardship",url:"https://syndication.finra.org/content/how-prepare-and-survive-financial-hardship"},
   {label:"SEC — Asset allocation",url:"https://www.investor.gov/introduction-investing/getting-started/asset-allocation"},
   {label:"CBE — Treasury bills FAQs",url:"https://www.cbe.org.eg/ar/contact-us/website-faqs"}
  ];
  return {ready:true,profile:p,emergencyTarget:target,emergencyGap:gap,
   monthlySurplus:surplus,suggestedEmergency:emergency,
   suggestedInvestment:Math.max(0,investAfterDebt),
   shortfall:Math.max(0,-p.margin),debtCritical,debtPressure,
   liquidity,assetSuggestion:riskAndHorizon,buffer,refs,
   note:debtCritical?"سجّلت ديونًا مرتفعة التكلفة؛ المقترح إيقاف الاستثمار الجديد ومراجعة تكلفة الدين.":
    p.margin<=0?"الدخل لا يغطي الاحتياجات المخططة؛ لا تُقترح استثمارات جديدة.":null};
 }
 function zakat(s){
  const cfg=settings(s),price=num(cfg.gold21GramPriceEgp);
  // Egypt Dar al-Ifta: 85 grams of 21-karat gold, 2.5% if lunar year complete.
  // Market price must be entered and dated; never fabricate a live gold quote.
  const cash=(Array.isArray(s?.accounts)?s.accounts:[]).reduce((v,a)=>v+num(a.opening),0);
  const tx=rows(s);
  const balanceByAccount={};
  for(const t of tx){
   if(!balanceByAccount[t.accountId])balanceByAccount[t.accountId]=0;
   const amount=num(t.amount);
   if(t.type==="income")balanceByAccount[t.accountId]+=amount;
   if(t.type==="expense")balanceByAccount[t.accountId]-=amount;
   if(t.type==="transfer"){
    balanceByAccount[t.accountId]-=amount;
    balanceByAccount[t.targetAccountId]=(balanceByAccount[t.targetAccountId]||0)+amount;
   }
  }
  const liquid=(Array.isArray(s?.accounts)?s.accounts:[]).reduce((v,a)=>
   v+Math.max(0,num(a.opening)+(balanceByAccount[a.id]||0)),0);
  const assets=(Array.isArray(s?.assets)?s.assets:[])
    .filter(a=>a.zakatEligible===true).reduce((v,a)=>v+num(a.value||num(a.qty)*num(a.unitPriceEgp)),0);
  const deductible=num(cfg.zakatDeductibleDebt),base=Math.max(0,liquid+assets-deductible);
  const nisab=price>0?price*85:null;
  const hasHawl=cfg.zakatHawlCompleted===true;
  const eligible=nisab!==null&&base>=nisab&&hasHawl;
  const status=price<=0?"missing-gold-price":!hasHawl?"hawl-not-confirmed":
    base<nisab?"below-nisab":"estimate-due";
  return {base,liquid,assets,deductible,nisab,goldPrice:price,
   priceDate:String(cfg.goldPriceDate||""),hawlCompleted:hasHawl,
   eligible,estimatedZakat:eligible?Math.round(base*.025*100)/100:0,
   provisionalCalculation:Math.round(base*.025*100)/100,status,rate:0.025,
   reference:"https://www.dar-alifta.org/ar/Fatwa/Details/18349/"};
 }
 function wealth(s){
  const tx=rows(s),balances=new Map((s?.accounts||[]).map(a=>[a.id,num(a.opening)]));
  for(const t of tx){
   if(!balances.has(t.accountId))continue;
   const val=num(t.amount);
   if(t.type==="income")balances.set(t.accountId,balances.get(t.accountId)+val);
   if(t.type==="expense")balances.set(t.accountId,balances.get(t.accountId)-val);
   if(t.type==="transfer"){
    balances.set(t.accountId,balances.get(t.accountId)-val);
    if(balances.has(t.targetAccountId))balances.set(t.targetAccountId,balances.get(t.targetAccountId)+val);
   }
  }
  const cash=[...balances].map(([id,value])=>({id,
    name:s.accounts.find(a=>a.id===id)?.name||"حساب",value})),
    totalCash=cash.reduce((v,a)=>v+a.value,0);
  const assets=(s?.assets||[]).map(a=>({...a,currentValue:num(a.value||num(a.qty)*num(a.unitPriceEgp))}));
  const manual=assets.reduce((v,a)=>v+a.currentValue,0);
  const liabilities=(s?.liabilities||[]).map(x=>({...x,remaining:num(x.balance||x.amount)}));
  const debt=liabilities.reduce((v,a)=>v+a.remaining,0);
  return {cash,assets,liabilities,totalCash,manualAssets:manual,totalDebt:debt,
   netWorth:totalCash+manual-debt,warning:"لا تضف قيمة الأسهم أو الذهب إذا كانت مدرجة أصلًا داخل رصيد حساب آخر."};
 }
 function insight(s,date=new Date()){
  const p=profile(s,date),planInfo=plan(s,date),W=wealth(s);
  const current=rows(s).filter(t=>String(t.date).slice(0,7)===p.period);
  const past=(()=>{const d=new Date(date);d.setMonth(d.getMonth()-1);return month(d)})();
  const last=rows(s).filter(t=>String(t.date).slice(0,7)===past&&t.type==="expense")
    .reduce((v,t)=>v+num(t.amount),0);
  const expenses=current.filter(t=>t.type==="expense");
  const byCategory=group(expenses,t=>t.category||"أخرى");
  const categories=Object.entries(byCategory).map(([name,amount])=>({name,amount}))
    .sort((a,b)=>b.amount-a.amount);
  const recurringCandidates=expenses.reduce((v,x)=>{
   const key=String(x.description||x.category||"").trim().toLowerCase();
   if(key.length>=3){const entry=v.get(key)||[];entry.push(x);v.set(key,entry)}return v;
  },new Map());
  const duplicates=[...recurringCandidates].filter(([,a])=>a.length>1&&a.some((x,i)=>
   a.some((y,j)=>i!==j&&x.date===y.date&&num(x.amount)===num(y.amount)))).map(([name])=>name).slice(0,6);
  const warnings=[];
  if(p.salaryConfigured&&p.margin<0)warnings.push("التزاماتك ومعيشتك المخططة أكبر من الدخل المتكرر.");
  if(p.salaryConfigured&&p.predictableIncome>0&&p.monthlyDebtService/p.predictableIncome>.4)
   warnings.push("أقساط الديون أكبر من 40٪ من الدخل المتكرر — حد تنبيهي قابل للمراجعة، وليس حدًا قانونيًا.");
  if(duplicates.length)warnings.push("عمليات متطابقة تستحق المراجعة: "+duplicates.join("، "));
  if(last>0&&p.actualExpense>last*1.2)warnings.push("المصروفات زادت أكثر من 20٪ عن الشهر السابق؛ قارن الفئات قبل الاستنتاج.");
  return {profile:p,plan:planInfo,wealth:W,topCategories:categories,
   previousExpense:last,changePct:last?((p.actualExpense-last)/last*100):null,
   warnings,duplicates,hasData:current.length>0};
 }
 return {profile,plan,zakat,wealth,insight,distinctCommitments,money,
  refs:{emergency:"https://syndication.finra.org/content/how-prepare-and-survive-financial-hardship",
   saving:"https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/",
   allocation:"https://www.investor.gov/introduction-investing/getting-started/asset-allocation",
   zakat:"https://www.dar-alifta.org/ar/Fatwa/Details/18349/"},
  version:"3.9.3-audited-finance"};
});
