"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const F=require("../flosy-finance-engine-v393.js"),K=require("../flosy-categories-v391.js");
const make=()=>({settings:{financeProfileV393:{monthlySalary:20000,recurringExtraIncome:2000,
 essentialVariableSpend:7000,minimumMonthlyBuffer:1000,emergencyCash:0,emergencyMonths:3,
 monthlyCommitments:[{id:"rent",name:"إيجار",amount:3000,kind:"rent-fixed"}]}},
 accounts:[{id:"cash",name:"الكاش",opening:5000}],assets:[],liabilities:[],transactions:[]});
test("one salary plus monthly commitments yields verified emergency-first guidance",()=>{
 const s=make(),p=F.profile(s),r=F.plan(s);
 assert.equal(p.predictableIncome,22000);assert.equal(p.livingCost,10000);
 assert.equal(r.monthlySurplus,11000);assert.equal(r.emergencyTarget,30000);
 assert.equal(r.suggestedEmergency,11000);assert.equal(r.suggestedInvestment,0);
 s.transactions.push({id:"a",type:"expense",amount:1000,date:"2026-11-13",accountId:"cash"});
 assert.equal(F.profile(s).margin,12000,"actual records not added again to scheduled expenses");
});
test("unknown salary and high interest debt prohibit automated investment amount",()=>{
 const s=make();s.settings.financeProfileV393.monthlySalary=0;
 assert.equal(F.plan(s).ready,false);
 s.settings.financeProfileV393.monthlySalary=20000;
 s.settings.financeProfileV393.emergencyCash=90000;
 s.settings.financeProfileV393.highInterestDebt=true;
 assert.equal(F.plan(s).suggestedInvestment,0);
});
test("liability monthly payment is included once when linked to a manual commitment",()=>{
 const s=make();s.liabilities=[{id:"loan",balance:10000,monthlyPayment:2000}];
 assert.equal(F.profile(s).fixedSum,5000);
 s.settings.financeProfileV393.monthlyCommitments.push({id:"m",liabilityId:"loan",amount:2000,kind:"debt"});
 assert.equal(F.profile(s).fixedSum,5000);
});
test("zakat requires entered 21K gold gram price, nisab and lunar-year confirmation",()=>{
 const s=make();assert.equal(F.zakat(s).estimatedZakat,0);
 s.settings.financeProfileV393.gold21GramPriceEgp=50;
 assert.equal(F.zakat(s).nisab,4250);
 assert.equal(F.zakat(s).estimatedZakat,0);
 s.settings.financeProfileV393.zakatHawlCompleted=true;
 assert.equal(F.zakat(s).estimatedZakat,125);
 s.settings.financeProfileV393.zakatDeductibleDebt=1000;
 assert.equal(F.zakat(s).estimatedZakat,0);
});
test("net worth and expense tagged to a family member use the same canonical ledger",()=>{
 const s=make();s.accounts.push({id:"bank",name:"بنك",opening:3000});
 s.transactions=[{id:"e",type:"expense",amount:100,date:"2026-11-13",accountId:"cash",familyMemberId:"child"},
 {id:"i",type:"income",amount:500,date:"2026-11-13",accountId:"bank"},
 {id:"t",type:"transfer",amount:200,date:"2026-11-13",accountId:"cash",targetAccountId:"bank"}];
 s.assets=[{id:"gold",name:"دهب",value:2000,zakatEligible:true}];
 s.liabilities=[{id:"loan",balance:900}];
 assert.equal(F.wealth(s).totalCash,8400);
 assert.equal(F.wealth(s).netWorth,9500);
 assert.equal(F.zakat(s).assets,2000);
});
test("insights flag duplicate recorded bills and include documented sources",()=>{
 const s=make();s.transactions=[
 {id:"1",type:"expense",amount:200,date:"2026-11-13",description:"وجبة",category:"مطعم"},
 {id:"2",type:"expense",amount:200,date:"2026-11-13",description:"وجبة",category:"مطعم"}];
 const z=F.insight(s,new Date(2026,10,13));
 assert.ok(z.duplicates.includes("وجبة"));
 assert.ok(F.refs.allocation.startsWith("https://www.investor.gov/"));
});
test("Egyptian custom category extension keeps obligation tags separate",()=>{
 assert.ok(K.forType("obligation").length>=11);
 assert.ok(K.forType("income").some(x=>x.label==="دخل إيجار"));
 assert.ok(K.forType("expense").some(x=>x.label==="رسوم إنستاباي والتحويلات"));
});

test("Thndr filled trades update cash once and add holdings once",()=>{
 const x=make();x.accounts.push({id:"thndr",name:"ثاندر",opening:1000});
 x.trades=[{id:"b",kind:"buy",asset:"ABC",qty:100,price:10,fee:5,date:"2026-11-01"},
  {id:"s",kind:"sell",asset:"ABC",qty:20,price:15,fee:2,date:"2026-11-12"}];
 x.prices={ABC:{value:16,updatedAt:"2026-11-12"}};
 const a=F.wealth(x);
 assert.equal(a.portfolioMarket,1280);
 assert.equal(a.holdings[0].qty,80);
 assert.equal(a.cash.find(z=>z.id==="thndr").value,293);
 assert.equal(a.totalCash,5293);
 assert.equal(a.netWorth,6573);
 // An imported opening balance in securities must not move current cash.
 x.trades.push({id:"op",kind:"opening",asset:"EFG",qty:3,price:20,date:"2026-11-12"});
 assert.equal(F.wealth(x).cash.find(z=>z.id==="thndr").value,293);
 assert.equal(F.wealth(x).netWorth,6633);
});
test("negative net worth remains signed and aliases keep canonical modules",()=>{
 const x=make();
 x.liabilities=[{id:"bigloan",name:"قرض",balance:25000}];
 assert.equal(F.wealth(x).netWorth,-20000);
 assert.match(F.money(F.wealth(x).netWorth),/20[٬,]?000/);
 const fs=require("node:fs");
 const ui=fs.readFileSync("flosy-finance-ui-v393.js","utf8");
 const shell=fs.readFileSync("flosy-unified.js","utf8");
 for(const token of ["portfolioMarket","x.holdings","data-flosy-feature=\"portfolio\"",
  "data-flosy-feature=\"v4-family\""])
  assert.ok(ui.includes(token),token);
 for(const code of ["wealth:3","smart:14","plan:17","goals:12"])
  assert.ok(shell.includes(code),code);
});
