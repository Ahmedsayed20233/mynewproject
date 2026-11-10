'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function clone(x){return JSON.parse(JSON.stringify(x))}
function bootPhase1(overrides={}){
 const state={settings:{salary:17000,rent:2500,bills:500,living:6000},accounts:[
   {id:'bank',name:'Bank'},{id:'wallet',name:'Wallet'},{id:'emergency',name:'Emergency'},
   {id:'thndr',name:'Thndr'},{id:'reserve',name:'Buffer'}],
  liabilities:[],transactions:[],next:{recurring:[]},
  phase1:{salaryDay:1,buffer:1000,includeSalaryForecast:true,oneOff:[],payments:[]},...overrides};
 const dom={},events={};
 const element=id=>dom[id]||(dom[id]={innerHTML:'',value:'',style:{},dataset:{},hidden:false});
 const window={FLOSY_BRIDGE:{getState:()=>state,persistInitial(){},mutate(fn){fn(state)},toast(){},getSession:()=>null},
  FLOSY_PRO:{rowsForAccounts:()=>({bank:state.testBank??20000,wallet:0,emergency:15000,thndr:10000,reserve:5000})}};
 const document={getElementById:element,addEventListener:(e,fn)=>events[e]=fn};
 const context={window,document,crypto:{randomUUID:()=>Math.random().toString(36)},confirm:()=>true,
    prompt:()=>null,FormData:class{},console,Date,Intl,Number,Math};
 vm.runInNewContext(fs.readFileSync('flosy-phase1.js','utf8'),context,{filename:'flosy-phase1.js'});
 return {api:window.FLOSY_PHASE1,state,dom,events};
}
const d=new Date('2026-11-10T00:00:00.000Z');
test('Safe to Spend excludes emergency/reserve/Thndr and reserves living + fixed + buffer',()=>{
 const m=bootPhase1(),v=m.api.calculate(d);
 assert.equal(v.freeCash,20000);assert.equal(v.safe,10000);assert.equal(v.fixedRemaining,3000);
 assert.equal(v.variableRemaining,6000);assert.equal(v.buffer,1000);assert.equal(v.cycle.days,21);
 assert.ok(m.dom.phase1Root.innerHTML.includes('إدارة الديون والأقساط'));
});
test('Scheduling a fixed bill does not double subtract it from fixed monthly reserve',()=>{
 const m=bootPhase1({next:{recurring:[{id:'internet',name:'Internet',category:'فاتورة الإنترنت',amount:500,day:14}]}});
 const v=m.api.calculate(d);assert.equal(v.obligations,500);assert.equal(v.fixedRemaining,2500);assert.equal(v.safe,10000);
});
test('Debt remaining principal caps installments during 90-day horizon',()=>{
 const m=bootPhase1({liabilities:[{id:'loan1',name:'Loan',balance:1500,installment:1000,dueDay:15}]});
 const o=m.api.occurrences(d,new Date('2027-02-01T00:00:00Z')).filter(x=>x.source==='debt');
 assert.equal(o.reduce((a,x)=>a+x.amount,0),1500);
 assert.ok(o.length===2);
});
test('Unpaid one-off is reserved even when past due; paid one-off is no longer reserved',()=>{
 const oneOff={id:'repair',name:'Repair',amount:3000,dueDate:'2026-10-03'};
 const m=bootPhase1({phase1:{salaryDay:1,buffer:1000,includeSalaryForecast:true,oneOff:[oneOff],payments:[]}});
 assert.equal(m.api.calculate(d).safe,7000);
 m.state.phase1.payments=[{id:'paid1',key:'oneoff/repair',status:'paid'}];
 assert.equal(m.api.calculate(d).safe,10000);
});
test('Already paid fixed expense is excluded from future reserves',()=>{
 const m=bootPhase1({testBank:17500,transactions:[{id:'rent',date:'2026-11-05',type:'expense',category:'إيجار',amount:2500,accountId:'bank'}]});
 const v=m.api.calculate(d);assert.equal(v.fixedRemaining,500);assert.equal(v.safe,10000);
});
test('Salary is explicitly a scenario and forecast has checkpoints through day 90',()=>{
 const m=bootPhase1(),v=m.api.forecast(d,90);
 assert.deepEqual(Array.from(v.results,x=>x.day),[0,7,14,30,60,90]);
 assert.ok(Number.isFinite(v.minValue));
 m.state.phase1.includeSalaryForecast=false;
 const noSalary=m.api.forecast(d,90);
 assert.ok(v.results.at(-1).value>noSalary.results.at(-1).value);
});
function bootSync(initialRemote,initialLocal,{previousUser=null}={}){
 const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const store=new Map(),pending=[],events={};
 const backend={revision:1,payload:clone(initialRemote),writes:0,rejections:0,offline:false};
 let state=clone(initialLocal),signed=false,toasts=[];
 if(previousUser)store.set('flosy_v3_last_account',previousUser);
 const window={addEventListener:(ev,fn)=>{events[ev]=fn}};
 const document={getElementById:()=>({innerHTML:''})};
 const C={
  getState:()=>state,getSession:()=>signed?{user:{id:userId},access_token:'test'}:null,
  ensureSession:async()=>true,replaceState:p=>{state=clone(p)},toast:t=>toasts.push(t),
  cloudApi:async(path,opts)=>{
   if(backend.offline)throw Error('offline');
   if(path.includes('/rest/v1/flosy_state_v3?'))return [{revision:backend.revision,payload:clone(backend.payload)}];
   if(path.includes('/rpc/flosy_cas_save_v3')){
    const data=JSON.parse(opts.body);
    if(data.p_expected_revision!==backend.revision){backend.rejections++;return [{applied:false,new_revision:backend.revision}]}
    backend.revision++;backend.payload=clone(data.p_payload);backend.writes++;
    return [{applied:true,new_revision:backend.revision}];
   }
   throw Error('Unsupported mocked route '+path);
  }
 };
 window.FLOSY_BRIDGE=C;
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const setTimeout=(fn)=>{pending.push(fn);return pending.length};
 const clearTimeout=()=>{};
 vm.runInNewContext(fs.readFileSync('flosy-sync-v3.js','utf8'),
 {window,document,localStorage,setTimeout,clearTimeout,console,Date,Intl,Math,JSON});
 return {api:window.FLOSY_SYNC_V3,backend,store,events,setSigned:v=>signed=v,getState:()=>state,
  edit:fn=>{fn(state);window.FLOSY_SYNC_V3.onLocalChange()},toasts};
}
test('First login does not replace cloud with fresh empty local app',async()=>{
 const remote={transactions:[{id:'cloud',amount:77}],settings:{salary:8000}},local={transactions:[],accounts:[],settings:{salary:17000}};
 const m=bootSync(remote,local);m.setSigned(true);
 assert.equal(await m.api.sync(),true);
 assert.equal(m.backend.writes,0);assert.equal(m.getState().transactions.length,1);
 assert.equal(m.getState().settings.salary,8000);
});
test('Unsynced local + cloud transactions are merged by ID without duplicate, and CAS persists',async()=>{
 const cloud={transactions:[{id:'cloud',amount:2}],settings:{salary:8000}};
 const local={transactions:[{id:'local',amount:3}],settings:{salary:17000}};
 const m=bootSync(cloud,local);m.setSigned(true);
 assert.equal(await m.api.sync(),true);
 assert.equal(m.backend.revision,2);
 assert.deepEqual(Array.from(m.backend.payload.transactions,x=>x.id).sort(),['cloud','local']);
});
test('Concurrent remote edits merge after local offline change',async()=>{
 const m=bootSync({transactions:[{id:'cloud'}],settings:{salary:8000}},{transactions:[]});
 m.setSigned(true);await m.api.sync();
 m.edit(s=>s.transactions.push({id:'local',amount:8}));
 m.backend.revision++;m.backend.payload.transactions.push({id:'fromOtherDevice',amount:9});
 await m.api.sync();
 assert.deepEqual(Array.from(m.backend.payload.transactions,x=>x.id).sort(),['cloud','fromOtherDevice','local']);
});
test('Network error never replaces unsynced local transaction',async()=>{
 const m=bootSync({transactions:[{id:'cloud'}]},{transactions:[{id:'local'}]});
 m.setSigned(true);m.backend.offline=true;
 assert.equal(await m.api.sync(),false);
 assert.deepEqual(Array.from(m.getState().transactions,x=>x.id),['local']);
 assert.equal(m.backend.writes,0);
});
test('Account switching cannot leak local transactions into a second user',async()=>{
 const m=bootSync({transactions:[{id:'ownerB'}]},{transactions:[{id:'ownerA'}]},{previousUser:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
 m.setSigned(true);await m.api.sync();
 assert.deepEqual(Array.from(m.backend.payload.transactions,x=>x.id),['ownerB']);
 assert.ok(m.store.has('flosy_v3_local_recovery'));
});
test('The site enables v3 sync and never calls legacy blind upsert',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/flosy-sync-v3\.js/);assert.match(html,/flosy-phase1\.js/);
 assert.doesNotMatch(html,/async function sync\(\)\s*\{/);
 assert.match(html,/id="phase1Root"/);
});
