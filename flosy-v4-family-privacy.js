/* Flosy 4 — RLS-protected shared family budgets & explicit privacy controls. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id),S=()=>C.getState(),n=x=>Number(x)||0;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=x=>new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(n(x))+" ج.م";
const user=()=>C.getSession()?.user?.id||"";
const localDeviceKey="flosy_v4_device_id";
const uuid=()=>crypto.randomUUID?crypto.randomUUID():"device-"+Math.random().toString(36).slice(2);
let families=[],selected="",expenses=[],role="",inviteCode="",busy=false,notice="",devices=[];
function status(msg){notice=msg;renderFamily();renderPrivacy();if(msg)C.toast(msg)}
async function api(path,opts){
 if(!user())throw Error("سجل الدخول إلى Flosy أولًا");
 if(!await C.ensureSession())throw Error("جلسة تسجيل الدخول انتهت");
 return C.cloudApi(path,opts||{});
}
async function fetchFamilies(){
 if(!user())return status("سجل الدخول لعرض الميزانية المشتركة");
 busy=true;renderFamily();
 try{
  const [groups,members]=await Promise.all([
   api("/rest/v1/flosy_households?select=id,name,monthly_limit,owner_user_id&order=created_at.desc"),
   api("/rest/v1/flosy_household_members?select=household_id,user_id,role&user_id=eq."+encodeURIComponent(user()))
  ]);
  families=Array.isArray(groups)?groups:[];
  for(const x of families)x.currentRole=(Array.isArray(members)?members:[]).find(m=>m.household_id===x.id)?.role||"viewer";
  if(!families.some(x=>x.id===selected))selected=families[0]?.id||"";
  await fetchExpenses();
 }catch(err){notice="تعذر تحميل الميزانية العائلية: "+err.message}
 finally{busy=false;renderFamily()}
}
async function fetchExpenses(){
 if(!selected){expenses=[];return}
 const data=await api("/rest/v1/flosy_household_expenses?select=id,household_id,entered_by,category,description,amount,expense_date&household_id=eq."+encodeURIComponent(selected)+"&order=expense_date.desc&limit=500");
 expenses=Array.isArray(data)?data:[];
}
const current=()=>families.find(x=>x.id===selected)||null;
function card(title,content,cls="v4-half"){return '<div class="v4-surface '+cls+'"><h3>'+title+'</h3>'+content+'</div>'}
function renderFamily(){
 const root=E("v4-family");if(!root)return;
 const g=current(),month=new Date().toISOString().slice(0,7),used=expenses.filter(x=>x.expense_date?.startsWith(month)).reduce((s,x)=>s+n(x.amount),0);
 role=g?.currentRole||"";
 root.innerHTML='<div class="v4-hero"><div class="v4-eyebrow">FLOSY FAMILY · SHARED BY CONSENT</div><h2>ميزانية البيت — من غير خلط الحسابات</h2><p>شارك ميزانية منفصلة مع أهل بيتك. صلاحيات مالك وعضو ومشاهد، ودعوات لمرة واحدة تنتهي بعد 48 ساعة.</p></div>'+
 (notice?'<div class="v4-note">'+esc(notice)+'</div>':'')+
 '<div class="v4-bento">'+
 card("إنشاء ميزانية عائلية جديدة",'<form class="v4-form" id="v4-family-create"><label class="full">اسم المجموعة<input name="name" maxlength="70" placeholder="بيت العيلة" required></label><button class="v4-btn full" type="submit">إنشاء المجموعة</button></form>')+
 card("الانضمام برمز دعوة",'<form class="v4-form" id="v4-family-join"><label class="full">كود الدعوة من المالك<input name="token" maxlength="64" minlength="64" placeholder="64 خانة" required></label><button class="v4-btn secondary full" type="submit">انضم للمجموعة</button></form>')+
 '<div class="v4-surface v4-full"><div class="v4-head"><h3>المجموعات المسجل فيها</h3><button type="button" class="v4-btn secondary" data-v4-family="refresh" '+(busy?"disabled":"")+'>تحديث</button></div>'+
 (families.length?'<div class="v4-chips">'+families.map(x=>'<button class="v4-btn '+(x.id===selected?"":"secondary")+'" type="button" data-v4-family="select" data-id="'+esc(x.id)+'">'+esc(x.name)+' · '+(x.currentRole==="owner"?"مالك":x.currentRole==="member"?"عضو":"مشاهد")+'</button>').join("")+'</div>':
 '<div class="v4-empty">'+(user()?"لا توجد مجموعات حتى الآن. أنشئ أول مجموعة أو أدخل رمز الدعوة.":"سجل الدخول من الإعدادات حتى تعمل الميزانيات العائلية.")+'</div>')+'</div>'+
 (g?card("ميزانية المجموعة",'<div class="v4-kpis" style="grid-template-columns:repeat(2,1fr)">'+
 '<div class="v4-kpi"><small>السقف الشهري</small><strong>'+money(g.monthly_limit)+'</strong></div>'+
 '<div class="v4-kpi"><small>الإنفاق المشترك هذا الشهر</small><strong>'+money(used)+'</strong></div></div>'+
 '<div class="v4-bar"><i style="width:'+Math.min(100,g.monthly_limit?used/g.monthly_limit*100:0)+'%"></i></div>'+
 (role==="owner"?'<form id="v4-family-limit" class="v4-form" style="margin-top:12px"><label class="full">تعديل حد الإنفاق الشهري بالجنيه<input name="limit" type="number" min="0" step="any" value="'+n(g.monthly_limit)+'" required></label><button class="v4-btn secondary full">تحديث الحد</button></form>':'<p>تغيير الحد متاح لمالك المجموعة فقط.</p>')+
 (role==="owner"?'<form id="v4-family-invite" class="v4-form" style="margin-top:16px"><label class="full">صلاحية الشخص الجديد<select name="role"><option value="member">عضو — إضافة مصروف</option><option value="viewer">مشاهد — عرض فقط</option></select></label><button class="v4-btn full">إنشاء دعوة مؤقتة</button></form>':'')+
 (inviteCode?'<div class="v4-note"><strong>رمز الدعوة — يُعرض مرة واحدة</strong><div style="word-break:break-all;direction:ltr">'+esc(inviteCode)+'</div><button class="v4-btn secondary" type="button" data-v4-family="copyinvite">نسخ الكود</button></div>':'')+
 '<p class="v4-fineprint">مصروفات المجموعة لا تخصم تلقائيًا من حسابات الأعضاء الشخصية؛ لتجنب الاحتساب المزدوج.</p>',"v4-half"):"")+
 (g?card("إضافة مصروف عائلي",role==="viewer"?'<div class="v4-empty">صلاحيتك عرض فقط؛ اطلب من المالك ترقية الدور.</div>':
 '<form id="v4-family-expense" class="v4-form">'+
 '<label>القيمة بالجنيه<input name="amount" type="number" min=".01" step="any" required></label>'+
 '<label>التاريخ<input name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></label>'+
 '<label>الفئة<select name="category"><option>طعام ومشروبات</option><option>فواتير</option><option>إيجار</option><option>مواصلات</option><option>الهدايا</option><option>تعليم</option><option>أخرى</option></select></label>'+
 '<label>وصف مختصر<input name="description" maxlength="180" placeholder="مشتريات البيت"></label>'+
 '<button class="v4-btn full" type="submit">حفظ مصروف المجموعة</button></form>','v4-half'):"")+
 (g?card("سجل المصروفات المشتركة",expenses.length?
 '<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>التاريخ</th><th>الفئة</th><th>الوصف</th><th>القيمة</th></tr></thead><tbody>'+
 expenses.map(x=>'<tr><td>'+esc(x.expense_date)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.description)+'</td><td>'+money(x.amount)+'</td></tr>').join("")+'</tbody></table></div>':
 '<div class="v4-empty">مفيش مصروفات عائلية بعد.</div>','v4-full'):"")+
 '</div>';
}
function privateVisibility(enabled){
 localStorage.setItem("flosy_v4_hide_balances",enabled?"1":"0");
 document.body.classList.toggle("v4-private",enabled);
}
function renderPrivacy(){
 const root=E("v4-privacy");if(!root)return;
 const hid=localStorage.getItem("flosy_v4_hide_balances")==="1";
 root.innerHTML='<div class="v4-hero"><div class="v4-eyebrow">FLOSY · PRIVACY CONTROL</div><h2>خصوصيتك ونسخك أمانة</h2><p>إخفاء المبالغ، نسخ خارجية، تتبع الأجهزة التي سجلتها، والتحكم بجلسات تسجيل الدخول.</p></div>'+
 '<div class="v4-bento">'+
 card("إخفاء الأرقام الحساسة",'<div class="v4-note">يمكنك إخفاء المبالغ من الواجهة على الجهاز الحالي. الإخفاء البصري لا يشفّر البيانات المحلية.</div>'+
 '<button type="button" class="v4-btn" data-v4-private="toggle">'+(hid?"إظهار الأرصدة":"إخفاء الأرصدة")+'</button>'+
 '<p>يفعّل Flosy الإخفاء تلقائيًا عند إبعاد التطبيق إلى الخلفية، ويظل مخفيًا حتى تسمح بإظهاره.</p>')+
 card("النسخ والاسترجاع",'<div class="v4-chips">'+
 '<button class="v4-btn" data-v4-private="export" type="button">تصدير JSON</button>'+
 '<button class="v4-btn secondary" data-v4-private="recovery" type="button">سجل النسخ السحابية</button></div>'+
 '<p>نسخة JSON التي تنزّلها غير مشفرة — احفظها في مكان آمن. افتح صفحة الاسترجاع للتحقق من أحدث نسخة في Supabase.</p>')+
 card("الأجهزة وجلسات الدخول",'<div class="v4-chips">'+
 '<button class="v4-btn" type="button" data-v4-private="register">تسجيل هذا الجهاز</button>'+
 '<button class="v4-btn secondary" type="button" data-v4-private="devices">عرض الأجهزة المسجلة</button>'+
 '<button class="v4-btn danger" type="button" data-v4-private="logoutothers">تسجيل خروج باقي الأجهزة</button></div>'+
 (devices.length?'<div class="v4-table-wrap"><table class="v4-table"><thead><tr><th>اسم الجهاز</th><th>آخر نشاط</th><th></th></tr></thead><tbody>'+
 devices.map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+new Date(x.last_seen_at).toLocaleDateString("ar-EG")+'</td><td><button type="button" class="v4-btn secondary" data-v4-private="forget" data-id="'+esc(x.device_id)+'">حذف من القائمة</button></td></tr>').join("")+'</tbody></table></div>':'')+
 '<p>حذف جهاز من القائمة ليس إلغاءً لرمز تسجيل الدخول. زر «تسجيل خروج باقي الأجهزة» يلغي رموز تحديث الجلسات الأخرى عبر Supabase، وقد تستمر رموز الوصول حتى انتهاء صلاحيتها.</p>','v4-half')+
 card("حذف البيانات نهائيًا",'<div class="v4-note v4-warning">تحذير: حذف بياناتك الشخصية من Supabase يتضمن المعاملات والنسخ الاحتياطية القديمة. لا يمكن استرجاعها. لا يحذف حساب تسجيل الدخول ولا بيانات المجموعات المشتركة تلقائيًا.</div>'+
 '<form id="v4-deleteForm" class="v4-form"><label class="full">اكتب النص التالي حرفيًا: <code>DELETE FLOSY DATA</code><input type="text" name="confirmation" autocomplete="off" required placeholder="DELETE FLOSY DATA"></label>'+
 '<button class="v4-btn danger full" type="submit">حذف بيانات Flosy الشخصية نهائيًا</button></form>','v4-half')+'</div>';
}
async function registerDevice(){
 if(!user())throw Error("سجّل الدخول أولًا");
 let id=localStorage.getItem(localDeviceKey);
 if(!id){id=uuid();localStorage.setItem(localDeviceKey,id)}
 const label=(navigator.userAgent.includes("Android")?"Android":"متصفح")+" — "+new Date().toLocaleDateString("ar-EG");
 await api("/rest/v1/flosy_known_devices?on_conflict=user_id,device_id",{
 method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},
 body:JSON.stringify([{user_id:user(),device_id:id,label,enabled:true,last_seen_at:new Date().toISOString()}])});
 await loadDevices();status("تم تسجيل الجهاز ضمن أجهزتك المعروفة");
}
async function loadDevices(){
 const data=await api("/rest/v1/flosy_known_devices?select=device_id,label,last_seen_at,enabled&user_id=eq."+encodeURIComponent(user())+"&order=last_seen_at.desc");
 devices=Array.isArray(data)?data:[];renderPrivacy();
}
document.addEventListener("submit",async e=>{
 if(!["v4-family-create","v4-family-join","v4-family-invite","v4-family-limit","v4-family-expense","v4-deleteForm"].includes(e.target.id))return;
 e.preventDefault();const f=new FormData(e.target);
 try{
  if(e.target.id==="v4-family-create"){
   const name=String(f.get("name")||"").trim();
   const r=await api("/rest/v1/rpc/flosy_family_create",{method:"POST",body:JSON.stringify({p_name:name})});
   selected=String(r);inviteCode="";await fetchFamilies();return status("تم إنشاء الميزانية المشتركة");
  }
  if(e.target.id==="v4-family-join"){
   const r=await api("/rest/v1/rpc/flosy_family_join",{method:"POST",body:JSON.stringify({p_token:String(f.get("token")||"").trim()})});
   selected=String(r);inviteCode="";await fetchFamilies();return status("تم الانضمام لمجموعة العيلة");
  }
  if(e.target.id==="v4-family-invite"){
   const r=await api("/rest/v1/rpc/flosy_family_invite",{method:"POST",
     body:JSON.stringify({p_household_id:selected,p_role:String(f.get("role")||"member")})});
   inviteCode=String(r);return renderFamily();
  }
  if(e.target.id==="v4-family-limit"){
   const limit=Number(f.get("limit"));if(!Number.isFinite(limit)||limit<0||limit>1e10)throw Error("الحد المالي غير صالح");
   await api("/rest/v1/flosy_households?id=eq."+encodeURIComponent(selected),{
    method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({monthly_limit:limit})});
   await fetchFamilies();return status("تم تحديث الميزانية");
  }
  if(e.target.id==="v4-family-expense"){
   const amt=Number(f.get("amount")),desc=String(f.get("description")||"").trim();
   if(!Number.isFinite(amt)||amt<=0||amt>1e8)throw Error("مبلغ غير صالح");
   await api("/rest/v1/flosy_household_expenses",{method:"POST",
    headers:{"Prefer":"return=minimal"},
    body:JSON.stringify([{household_id:selected,entered_by:user(),category:String(f.get("category")),
     description:desc.slice(0,180),amount:amt,expense_date:String(f.get("date"))}])});
   await fetchExpenses();renderFamily();return C.toast("تم حفظ مصروف العيلة فقط، لم يُخصم من حسابك الشخصي");
  }
  if(e.target.id==="v4-deleteForm"){
   const confirmation=String(f.get("confirmation")||"");
   if(confirmation!=="DELETE FLOSY DATA")throw Error("نص التأكيد غير مطابق");
   if(!confirm("هذه الخطوة ستحذف معاملاتك وحساباتك ونسخك الاحتياطية من Flosy. هل أنت متأكد نهائيًا؟"))return;
   if(!confirm("الفرصة الأخيرة: سيتم حذف سجلاتك الشخصية نهائيًا. هل تنفذ الآن؟"))return;
   if(w.FLOSY_SYNC_V3?.getStatus?.().dirty)throw Error("عندك تغييرات محلية لم تتزامن. احفظ نسخة JSON أولًا");
   const id=user();
   await api("/rest/v1/rpc/flosy_delete_my_finances",{method:"POST",
      body:JSON.stringify({p_confirmation:confirmation})});
   // Clear all local snapshots so a stale cache cannot silently recreate deleted finance data.
   ["flosy_data_v1","flosy_v3_checkpoint_"+id,"flosy_v3_last_account","flosy_v3_pending",
    "flosy_v3_local_recovery","flosy_last_sync_"+id].forEach(k=>localStorage.removeItem(k));
   await C.cloudApi("/auth/v1/logout?scope=global",{method:"POST"}).catch(()=>{});
   sessionStorage.removeItem("flosy_session");
   alert("تم حذف بياناتك الشخصية من قاعدة Flosy. أعد فتح التطبيق؛ سيبدأ بحساب فارغ.");
   w.location.reload();return;
  }
 }catch(err){C.toast("تعذر التنفيذ: "+err.message)}
});
document.addEventListener("click",async e=>{
 const f=e.target.closest("[data-v4-family]"),p=e.target.closest("[data-v4-private]");
 if(f){
  const act=f.dataset.v4Family;
  try{
   if(act==="refresh")return fetchFamilies();
   if(act==="select"){selected=f.dataset.id;inviteCode="";await fetchExpenses();renderFamily();return}
   if(act==="copyinvite")return navigator.clipboard.writeText(inviteCode).then(()=>C.toast("تم نسخ الدعوة"));
  }catch(err){C.toast(err.message)}
 }
 if(!p)return;
 const act=p.dataset.v4Private;
 try{
  if(act==="toggle"){const x=localStorage.getItem("flosy_v4_hide_balances")==="1";privateVisibility(!x);renderPrivacy();return}
  if(act==="export"){const b=E("exportJSON");if(b)b.click();return}
  if(act==="recovery")return C.goto("recovery");
  if(act==="register")return registerDevice();
  if(act==="devices")return loadDevices();
  if(act==="forget"){
   if(!confirm("حذف الجهاز من قائمة التعريفات؟ لا يُلغى تسجيل الدخول على الجهاز الآخر."))return;
   await api("/rest/v1/flosy_known_devices?user_id=eq."+encodeURIComponent(user())+"&device_id=eq."+encodeURIComponent(p.dataset.id),{method:"DELETE"});
   return loadDevices();
  }
  if(act==="logoutothers"){
   if(!confirm("تسجيل خروج كل الأجهزة الأخرى؟ قد تظل رموز الوصول الحالية صالحة حتى انتهاء عمرها."))return;
   await api("/auth/v1/logout?scope=others",{method:"POST"});
   C.toast("تم طلب إنهاء الجلسات الأخرى من Supabase");return;
  }
 }catch(err){C.toast("تعذر تنفيذ الأمر: "+err.message)}
});
function privateVisibility(hidden){
 document.body.classList.toggle("v4-private",hidden);
 localStorage.setItem("flosy_v4_hide_balances",hidden?"1":"0");
}
document.addEventListener("visibilitychange",()=>{
 if(document.hidden)privateVisibility(true);
});
function render(){renderFamily();renderPrivacy()}
privateVisibility(localStorage.getItem("flosy_v4_hide_balances")==="1");
w.FLOSY_V4_FAMILY={render,fetchFamilies,renderPrivacy};
render();
})(window);