/* Flosy v4 offline application shell. NO database/API responses are cached. */
const VERSION="flosy-white-v4-20261110-3";
const SHELL=[
 "./","./index.html","./manifest.webmanifest","./icon.svg",
 "./finance-pro.js?v=131","./finance-pro.css?v=130",
 "./flosy-next.css?v=202","./flosy-next.js?v=202","./flosy-ai.css?v=210","./flosy-ai.js?v=210",
 "./flosy-phase1.js?v=311","./flosy-sync-v3.js?v=302",
 "./flosy-v4-white.css?v=401","./flosy-v4-capture.js?v=400","./flosy-v4-bank.js?v=400",
 "./flosy-v4-wealth.js?v=400","./flosy-v4-family-privacy.js?v=402","./flosy-v4-reminders.js?v=401","./flosy-v4-sw-register.js?v=401"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>Promise.allSettled(SHELL.map(url=>cache.add(new Request(url,{cache:"reload"}))))).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("flosy-")&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return; // never cache Supabase/OpenAI APIs or external speech/OCR services
 if(url.pathname.includes("/auth/")||url.pathname.includes("/rest/")||url.pathname.includes("/functions/"))return;
 if(request.mode==="navigate"){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put("./index.html",copy)))}
   return response;
  }).catch(()=>caches.match("./index.html").then(r=>r||new Response("لا يوجد اتصال ولم يتم تجهيز التطبيق للاستخدام دون إنترنت",{status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}}))));
  return;
 }
 if(/\.(js|css|svg|webmanifest)$/.test(url.pathname)){
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(request,copy)))}
   return response;
  })));
 }
});
