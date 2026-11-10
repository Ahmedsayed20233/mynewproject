/* Flosy Pearl encrypted off-device backup.
   AES-256-GCM, PBKDF2-HMAC-SHA256, per-file random salt and nonce.
   All encryption/decryption happens inside the browser; no password upload. */
(function(w){
"use strict";
const C=w.FLOSY_BRIDGE;if(!C)return;
const E=id=>document.getElementById(id),enc=new TextEncoder(),dec=new TextDecoder();
const VERSION="flosy-aesgcm-v1",ITERATIONS=250000,AD=enc.encode("Flosy financial backup v1");
let busy=false;
function to64(bytes){
 let text="";for(let i=0;i<bytes.length;i+=8192)
  text+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(text);
}
function from64(str){
 if(typeof str!=="string"||str.length>16000000)throw Error("بيانات النسخة المشفرة غير صالحة");
 const s=atob(str);return Uint8Array.from(s,ch=>ch.charCodeAt(0));
}
function secure(){if(!crypto?.subtle||!crypto.getRandomValues)throw Error("التشفير يحتاج متصفحًا حديثًا واتصال HTTPS");}
async function derive(password,salt){
 const base=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},base,
  {name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
function validateLedger(d){
 if(!d||typeof d!=="object"||Array.isArray(d)||!Array.isArray(d.accounts)||
  !Array.isArray(d.transactions)||!d.settings||typeof d.settings!=="object")throw Error("ملف النسخة لا يحتوي على سجل فلوسي صالح");
 return d;
}
async function seal(data,password,ownerId=""){
 secure();
 if(typeof password!=="string"||password.length<10)throw Error("استخدم كلمة مرور من 10 أحرف على الأقل");
 const payload=validateLedger(data);
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(password,salt);
 const plaintext=enc.encode(JSON.stringify({exportedAt:new Date().toISOString(),ownerId,payload}));
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:AD},key,plaintext));
 return {format:VERSION,kdf:"PBKDF2-SHA256",iterations:ITERATIONS,cipher:"AES-256-GCM",
  salt:to64(salt),iv:to64(iv),payload:to64(cipher)};
}
async function unseal(envelope,password){
 secure();
 if(!envelope||envelope.format!==VERSION||envelope.cipher!=="AES-256-GCM"||
    envelope.iterations!==ITERATIONS)throw Error("تنسيق التشفير غير مدعوم أو غير آمن");
 if(typeof password!=="string"||!password)throw Error("اكتب كلمة المرور");
 const salt=from64(envelope.salt),iv=from64(envelope.iv),cipher=from64(envelope.payload);
 if(salt.length!==16||iv.length!==12||cipher.length<16)throw Error("ملف النسخة المشفرة غير مكتمل");
 const key=await derive(password,salt);
 let decoded;
 try{decoded=await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:AD},key,cipher)}
 catch{throw Error("كلمة المرور غير صحيحة أو الملف تغير؛ لم تُستبدل أي بيانات")}
 const obj=JSON.parse(dec.decode(decoded));
 validateLedger(obj?.payload);
 return obj;
}
function render(){
 const root=E("flosyV5SecureBackup");if(!root)return;
 root.innerHTML='<div class="v4-surface" style="margin-top:16px">'+
 '<div class="v4-eyebrow">PRIVATE BACKUP · AES-256-GCM</div><h3>نسخة احتياطية مشفرة — تحت سيطرتك</h3>'+
 '<p>صدّر سجل فلوسي إلى ملف مشفّر بكلمة مرور لا نعرفها ولا نحفظها. احتفظ بالملف خارج الهاتف. استرجاع البيانات يحتاج تسجيل دخولك وموافقتك.</p>'+
 '<div class="v4-bento"><div class="v4-half">'+
 '<form id="flosyV5Export" class="v4-form"><label class="full">كلمة مرور تشفير الملف (10 أحرف على الأقل)'+
 '<input type="password" name="password" minlength="10" autocomplete="new-password" required></label>'+
 '<button class="v4-btn full" type="submit" '+(busy?'disabled':'')+'>تنزيل نسخة مشفرة</button></form></div>'+
 '<div class="v4-half"><form id="flosyV5Import" class="v4-form">'+
 '<label class="full">ملف Flosy المشفر<input type="file" name="file" accept=".flosyenc,.json" required></label>'+
 '<label class="full">كلمة مرور النسخة<input type="password" name="password" required autocomplete="off"></label>'+
 '<label class="full">اكتب RESTORE لتأكيد الاستبدال بعد مراجعة النسخة<input name="confirmation" pattern="RESTORE" required autocomplete="off"></label>'+
 '<button class="v4-btn danger full" type="submit" '+(busy?'disabled':'')+'>فك التشفير والاسترجاع</button></form></div></div>'+
 '<p class="v4-fineprint">مهم: فقدان كلمة المرور يعني عدم إمكانية فتح النسخة. هذا التنزيل يتم من المتصفح؛ لو الـAPK لا يدعم التنزيل افتح Flosy في Chrome. تأكد من وجود ملف خارج الهاتف قبل حذف التطبيق.</p></div>';
}
async function download(json){
 const blob=new Blob([JSON.stringify(json)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="Flosy_Encrypted_"+new Date().toISOString().slice(0,10)+".flosyenc";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
document.addEventListener("submit",async e=>{
 if(!["flosyV5Export","flosyV5Import"].includes(e.target.id))return;
 e.preventDefault();if(busy)return;
 const form=e.target,fields=new FormData(form);busy=true;
 try{
  if(form.id==="flosyV5Export"){
   const envelope=await seal(C.getState(),String(fields.get("password")||""),C.getSession()?.user?.id||"");
   await download(envelope);
   C.toast("تم إعداد النسخة المشفرة. تأكد أن الملف محفوظ خارج الهاتف.");
  }else{
   if(String(fields.get("confirmation")||"")!=="RESTORE")throw Error("اكتب RESTORE حرفيًا");
   const f=fields.get("file");
   if(!f||!f.size||f.size>12*1024*1024)throw Error("اختر ملف نسخة مشفرة لا يتجاوز 12MB");
   const recovered=await unseal(JSON.parse(await f.text()),String(fields.get("password")||""));
   const current=C.getSession()?.user?.id;
   if(!current)throw Error("سجّل الدخول إلى حسابك في Flosy قبل الاسترجاع");
   if(recovered.ownerId&&recovered.ownerId!==current)throw Error("هذه النسخة تخص حسابًا آخر؛ لن ندمج بيانات الحسابين");
   if(!w.FLOSY_SYNC_V3?.restorePayload)throw Error("لا يمكن التحقق من أمان الاسترجاع السحابي");
   if(!confirm("ستستبدل كل بيانات Flosy المسجلة على هذا الحساب بالنسخة المشفرة بعد حفظ نقطة استرجاع. هل أنت متأكد؟"))return;
   await w.FLOSY_SYNC_V3.restorePayload(recovered.payload);
   C.toast("تم الاسترجاع باستخدام رقم إصدار سحابي جديد؛ راجع القيم والأرصدة");
  }
 }catch(err){C.toast("تعذر تنفيذ النسخ/الاسترجاع: "+(err?.message||"خطأ"))}
 finally{form.reset();busy=false;render()}
});
w.FLOSY_V5_BACKUP={seal,unseal,render};
render();
})(window);
