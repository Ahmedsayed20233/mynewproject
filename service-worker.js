/* Flosy v4 offline application shell. NO database/API responses are cached. */
const VERSION="flosy-receipt-ml-v34-20261111";
const SHELL=[
 "./","./index.html","./manifest.webmanifest","./icon.svg",
 "./finance-pro.js?v=1001","./finance-pro.css?v=130",
 "./flosy-next.css?v=202","./flosy-next.js?v=3102","./flosy-auto-import.js?v=2801","./flosy-automate-relay.js?v=3102","./flosy-automate-relay.css?v=2901","./flosy-auto-import.css?v=2801","./flosy-ai.css?v=210","./flosy-ai.js?v=730",
 "./flosy-phase1.js?v=311","./flosy-sync-v3.js?v=302",
 "./flosy-v4-white.css?v=401","./flosy-v5-pearl.css?v=500","./flosy-elevate.css?v=801","./flosy-receipt-ml.js?v=3401","./flosy-v4-capture.js?v=3401","./flosy-v4-bank.js?v=500",
 "./flosy-v4-wealth.js?v=400","./flosy-v4-family-privacy.js?v=1001","./flosy-v4-reminders.js?v=501","./flosy-v4-sw-register.js?v=401","./flosy-v5-command.js?v=1001","./flosy-v5-private-backup.js?v=500","./flosy-repair.js?v=3401","./flosy-assistant-bridge.js?v=602","./flosy-elevate.js?v=801","./flosy-studio.js?v=901","./flosy-capture-v10.css?v=3102","./flosy-studio.css?v=1001"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(VERSION).then(async cache=>{
  try {
   // Never activate a partially cached shell: missing modules can break an offline launch.
   await cache.addAll(SHELL.map(url=>new Request(url,{cache:"reload"})));
   await self.skipWaiting();
  } catch(err) {
   await caches.delete(VERSION);
   throw err;
  }
 }));
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
