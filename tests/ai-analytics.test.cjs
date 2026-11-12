"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const now=new Date(2026,10,12);
const month=(n,d)=>new Date(2026,10+n,d).toISOString().slice(0,10);
const tx=[
 {id:"a",type:"expense",date:"2026-11-02",category:"مواصلات",amount:500},
 {id:"b",type:"expense",date:"2026-11-04",category:"طعام ومشروبات",amount:200},
 {id:"c",type:"income",date:"2026-11-01",amount:3000},
 {id:"d",type:"transfer",date:"2026-11-07",amount:5000},
 {id:"e",type:"expense",date:"2026-10-03",category:"مواصلات",amount:100},
 {id:"f",type:"expense",date:"2026-10-15",category:"طعام ومشروبات",amount:100},
 {id:"z",type:"expense",date:"2026-11-06",category:"مواصلات",amount:2000,status:"pending"}
];
const ctx={window:{},Date,Number,Math,Intl,Array,Object,String,Set};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("flosy-ai-analytics.js","utf8"),ctx);
const analytics=ctx.window.FLOSY_LOCAL_ANALYTICS;
test("current and previous months exclude internal transfers and pending events",()=>{
 const m=analytics.summarize({transactions:tx},"2026-11","2026-11-12");
 assert.equal(m.expense,70000);
 assert.equal(m.income,300000);
 assert.equal(m.categories["مواصلات"],50000);
});
test("month-to-month comparison has chart data grounded in ledger",()=>{
 const ans=analytics.query("This month vs last month",{transactions:tx},now);
 assert.equal(ans.intent,"compare");
 assert.equal(ans.chart.chart_type,"bar");
 assert.deepEqual(Array.from(ans.chart.data,x=>x.value_minor),[20000,70000]);
});
test("transport diagnosis and source scope",()=>{
 const ans=analytics.query("Why transportation is high?",{transactions:tx},now);
 assert.equal(ans.intent,"transport");
 assert.equal(ans.chart.data[0].value_minor,10000);
 assert.equal(ans.chart.data[1].value_minor,50000);
 assert.equal(ans.chart.data.length,2);
});
test("unrelated questions are declined",()=>{
 const ans=analytics.query("Who won the world cup?",{transactions:tx},now);
 assert.equal(ans.intent,"out-of-scope");
 assert.match(ans.text,/مساعد Flosy المالي فقط/);
 assert.equal(ans.chart,null);
});
test("charts are accessible and HTML injection is escaped",()=>{
 const svg=analytics.renderChart({chart_type:"donut",title:"spent",currency:"EGP",
 data:[{name:"<img src=x onerror=alert(1)>",value_minor:6000},{name:"Coffee",value_minor:4000}]});
 assert.match(svg,/role="img"/);
 assert.doesNotMatch(svg,/<img/);
 assert.match(svg,/&lt;img/);
});
test("questioned category without evidence is not fabricated",()=>{
 const ans=analytics.query("ليه المواصلات عالية؟",{transactions:[]},now);
 assert.match(ans.text,/مافيش معاملات/);
});
