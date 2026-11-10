/* Flosy v3 sync: revision-checked, append-only snapshots, no blind overwrite. */
(function(global) {
"use strict";
const C=global.FLOSY_BRIDGE;
if(!C)return;
const PREFIX="flosy_v3_checkpoint_";
const OWNER_KEY="flosy_v3_last_account";
const UNSYNC_KEY="flosy_v3_pending";
const RECOVERY_KEY="flosy_v3_local_recovery";
const arrays=["transactions","accounts","trades","assets","liabilities"];
const nextArrays=["recurring","rules","savedViews"];
let busy=false, scheduled=null, dirty=false, generation=0, initialized=false;
let status="غير متصل", checkpoint=null;
const clone=x=>JSON.parse(JSON.stringify(x));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const currentUser=()=>C.getSession()?.user?.id||null;
const parse=s=>{try{return JSON.parse(s)}catch{return null}};
const all=x=>Array.isArray(x)?x:[];
const stamp=x=>String(x?.updatedAt||x?.createdAt||"");
const isObject=x=>x&&typeof x==="object"&&!Array.isArray(x);
function listMerge(server,local,kind,deletions){
 const m=new Map();
 for(const v of all(server))if(v&&v.id)m.set(String(v.id),clone(v));
 for(const v of all(local)){
  if(!v||!v.id)continue;
  const id=String(v.id),prev=m.get(id);
  if(!prev||stamp(v)>stamp(prev))m.set(id,clone(v));
  else if(stamp(v)===stamp(prev)&&equal(v,prev))m.set(id,clone(v));
 }
 return [...m.values()].filter(x=>!deletions.has(kind+"/"+x.id));
}
function combine(server,local,base=null){
 const r=isObject(server)?server:{},l=isObject(local)?local:{};
 const b=isObject(base)?base:{};
 const deletes=new Set([...all(r.deletedIds),...all(l.deletedIds)]);
 let conflicts=0;
 function scalar(remoteValue,localValue,baseValue){
  if(localValue===undefined)return cloneValue(remoteValue);
  if(remoteValue===undefined)return cloneValue(localValue);
  if(base===null)return cloneValue(remoteValue);
  const lc=!equal(localValue,baseValue),rc=!equal(remoteValue,baseValue);
  if(lc&&!rc)return cloneValue(localValue);
  if(lc&&rc&&!equal(localValue,remoteValue))conflicts++;
  return cloneValue(remoteValue);
 }
 function cloneValue(v){return v===undefined?undefined:clone(v)}
 const result={...clone(r)};
 for(const k of new Set([...Object.keys(r),...Object.keys(l)])){
  if(["deletedIds","next",...arrays].includes(k))continue;
  result[k]=scalar(r[k],l[k],b[k]);
 }
 result.deletedIds=[...deletes];
 for(const key of arrays)result[key]=listMerge(r[key],l[key],key,deletes);
 const rn=isObject(r.next)?r.next:{},ln=isObject(l.next)?l.next:{},bn=isObject(b.next)?b.next:{};
 result.next={...clone(rn)};
 for(const k of new Set([...Object.keys(rn),...Object.keys(ln)])){
  if(nextArrays.includes(k))continue;
  result.next[k]=scalar(rn[k],ln[k],bn[k]);
 }
 for(const k of nextArrays)result.next[k]=listMerge(rn[k],ln[k],k,deletes);
 // Phase 1 one-time commitments are ID-addressed and survive concurrent devices.
 const rp=isObject(r.phase1)?r.phase1:{},lp=isObject(l.phase1)?l.phase1:{},bp=isObject(b.phase1)?b.phase1:{};
 result.phase1={...clone(rp)};
 for(const k of new Set([...Object.keys(rp),...Object.keys(lp)])){
  if(k==="oneOff")continue;
  result.phase1[k]=scalar(rp[k],lp[k],bp[k]);
 }
 result.phase1.oneOff=listMerge(rp.oneOff,lp.oneOff,"oneOff",deletes);
 // Don't merge prices by replacing the entire object.
 result.prices={...r.prices};
 for(const [code,price] of Object.entries(l.prices||{})){
  const p=result.prices[code];
  if(!p||stamp(price)>stamp(p))result.prices[code]=clone(price);
 }
 return {data:result,conflicts};
}
function meaningful(x){
 return arrays.some(k=>all(x?.[k]).length&&(k!=="accounts"||all(x.accounts).some(a=>Number(a.opening||0)!==0||!["wallet","bank","emergency","reserve","thndr"].includes(a.id))))
 ||all(x?.next?.recurring).length>0||all(x?.phase1?.oneOff).length>0
 ||(x?.settings&&Object.keys(x.settings).some(k=>Number(x.settings[k])!==Number(({salary:17000,rent:2500,bills:500,living:6000,emergencyTarget:60000,investmentTarget:39000,reserveTarget:12000})[k])&&k in {salary:1,rent:1,bills:1,living:1,emergencyTarget:1,investmentTarget:1,reserveTarget:1}));
}
function localCopy(reason,payload){
 try{
  const prior=parse(localStorage.getItem(RECOVERY_KEY))||[];
  if(!Array.isArray(prior))return false;
  const snapshot={reason,createdAt:new Date().toISOString(),payload:clone(payload)};
  prior.unshift(snapshot);
  localStorage.setItem(RECOVERY_KEY,JSON.stringify(prior.slice(0,2)));
  return true;
 }catch{return false}
}
function ui(){
 const el=document.getElementById("flosyV3SyncStatus");if(!el)return;
 const ok=checkpoint&&status==="متزامن";
 el.innerHTML='<span class="f2-status '+(ok?"good":"")+'"><span class="dot"></span>'+
 String(status).replace(/[&<>]/g,"")+
 (checkpoint&&checkpoint.syncedAt?' · '+new Date(checkpoint.syncedAt).toLocaleString("ar-EG"):'')+
 '</span>';
}
function setStatus(s){status=s;ui()}
function fetchState(uid){
 return C.cloudApi("/rest/v1/flosy_state_v3?select=revision,payload,updated_at&user_id=eq."+encodeURIComponent(uid)+"&limit=1")
 .then(x=>Array.isArray(x)&&x[0]?x[0]:{revision:0,payload:null});
}
function commit(rev,payload){
 return C.cloudApi("/rest/v1/rpc/flosy_cas_save_v3",{
  method:"POST",body:JSON.stringify({p_expected_revision:rev,p_payload:payload})
 }).then(x=>Array.isArray(x)?x[0]:x);
}
function saveBase(uid,rev,data){
 const cp={revision:rev,payload:clone(data),syncedAt:new Date().toISOString()};
 localStorage.setItem(PREFIX+uid,JSON.stringify(cp));
 checkpoint=cp;
 localStorage.setItem(OWNER_KEY,uid);
 localStorage.removeItem(UNSYNC_KEY);
}
function acceptRemote(data){
 C.replaceState(data);
}
function onLocalChange(){
 generation++;
 dirty=true;
 try{localStorage.setItem(UNSYNC_KEY,"1")}catch{}
 setStatus("تغييرات لم تُزامن بعد");
 if(scheduled)clearTimeout(scheduled);
 scheduled=setTimeout(()=>{scheduled=null;sync()},1300);
}
function requestSync(){if(scheduled)clearTimeout(scheduled);scheduled=null;return sync()}
async function sync(){
 const uid=currentUser();
 if(!uid){setStatus("سجّل الدخول لتفعيل المزامنة");return false}
 if(busy){dirty=true;return false}
 busy=true;setStatus("جارٍ فحص النسخة السحابية");
 const started=generation;
 try{
  await C.ensureSession();
  const lastAccount=localStorage.getItem(OWNER_KEY);
  let local=clone(C.getState());
  checkpoint=parse(localStorage.getItem(PREFIX+uid));
  if(lastAccount&&lastAccount!==uid){
   if(meaningful(local)&&!localCopy("account_switch_"+lastAccount,local))throw Error("تعذر حفظ البيانات المحلية للحساب السابق؛ المزامنة أُوقفت");
   local={};dirty=false;
  }
  const newDevice=!checkpoint;
  let isDirty=dirty||localStorage.getItem(UNSYNC_KEY)==="1";
  let base=checkpoint?.payload||null;
  if(checkpoint&&!equal(local,base))isDirty=true;
  if(newDevice&&meaningful(local))isDirty=true;
  for(let attempt=0;attempt<4;attempt++){
   const remote=await fetchState(uid);
   let candidate;
   if(remote.revision===0){
     candidate=local;
   }else if(!isDirty||newDevice&&!meaningful(local)){
     candidate=remote.payload;
   }else{
     candidate=combine(remote.payload,local,base).data;
   }
   if(remote.revision>0&&equal(candidate,remote.payload)){
     if(!equal(C.getState(),candidate)){
       if(meaningful(C.getState())&&!localCopy("before_receive_cloud",C.getState()))throw Error("تعذر حفظ نسخة محلية قبل الاستبدال");
       if(generation===started)acceptRemote(candidate);
     }
     saveBase(uid,remote.revision,candidate);
     if(generation!==started){dirty=true;setStatus("تغييرات محلية جديدة تنتظر المزامنة")}
     else {dirty=false;setStatus("متزامن")}
     return true;
   }
   const result=await commit(remote.revision,candidate);
   if(result?.applied===true){
     saveBase(uid,Number(result.new_revision),candidate);
     if(generation===started){
       acceptRemote(candidate);dirty=false;setStatus("متزامن");
     }else{
       // The next sync will merge edits saved while the request was in flight.
       dirty=true;try{localStorage.setItem(UNSYNC_KEY,"1")}catch{}
       setStatus("تغييرات أحدث تنتظر المزامنة");
     }
     return true;
   }
   // Revision conflict: never overwrite; read, union and retry after server wins CAS.
   local=candidate;isDirty=true;
  }
  throw Error("حدث تعارض متكرر بين الأجهزة. لم نكتب فوق نسخة أخرى. حاول مرة أخرى");
 }catch(e){
  dirty=true;try{localStorage.setItem(UNSYNC_KEY,"1")}catch{}
  setStatus("غير متزامن: "+(e.message||"خطأ في الاتصال"));
  C.toast("فشلت المزامنة دون استبدال البيانات: "+(e.message||"خطأ"));
  return false;
 }finally{
  busy=false;
  if(dirty&&currentUser()&&generation!==started){
   if(scheduled)clearTimeout(scheduled);
   scheduled=setTimeout(()=>{scheduled=null;sync()},1400);
  }
 }
}
async function restorePayload(payload){
 if(!currentUser())throw Error("سجّل الدخول أولًا");
 if(!isObject(payload))throw Error("نسخة غير صالحة");
 if(busy)throw Error("هناك مزامنة قيد التنفيذ");
 const uid=currentUser();
 await C.ensureSession();
 const remote=await fetchState(uid);
 if(!localCopy("before_restore",C.getState()))throw Error("تعذر إنشاء نسخة محلية قبل الاسترجاع");
 const response=await commit(remote.revision,payload);
 if(!response?.applied)throw Error("تغيّر السجل السحابي أثناء الاسترجاع؛ أعد المحاولة");
 saveBase(uid,Number(response.new_revision),payload);
 acceptRemote(payload);dirty=false;setStatus("متزامن");
 return true;
}
function start(){
 ui();
 if(currentUser())sync();
 else setStatus("سجّل الدخول لتفعيل المزامنة");
 window.addEventListener("online",()=>{if(currentUser())requestSync()});
}
global.FLOSY_SYNC_V3={combine,meaningful,onLocalChange,requestSync,sync,restorePayload,start,getStatus:()=>({status,revision:checkpoint?.revision||0,dirty})};
start();
})(window);
