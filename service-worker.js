/* Flosy v4 offline application shell. NO database/API responses are cached. */
const VERSION="flosy-unified-v396-ai-action-hub-contrast-20261114";
const SHELL=[
 "./","./index.html","./manifest.webmanifest","./icon.svg",
 "./flosy.html","./flosy-voice-safety-v2.js?v=20261113", "./flosy-nlu-compact-vocab.js?v=20261114", "./flosy-nlu-compact-weights.js?v=20261114", "./flosy-egyptian-nlu-compact-v2.js?v=20261114", "./flosy-capture-review-v2.js?v=20261113", "./flosy-capture-review-v2.css?v=20261113","./flosy-report-pro.js?v=3920","./flosy-report-pro.css?v=3920","./flosy-screen-map-v395.js?v=3950","./flosy-services-v392.js?v=3950","./flosy-services-v392.css?v=3950","./flosy-copilot-v392.js?v=3920","./flosy-finance-engine-v393.js?v=3930","./flosy-finance-ui-v393.js?v=3950","./flosy-finance-ui-v393.css?v=3950","./flosy-unified.css?v=3901","./flosy-ux-v391.css?v=3910","./flosy-legacy-theme-v391.css?v=3910","./flosy-categories-v391.js?v=3910","./flosy-ux-v391.js?v=3910","./flosy-unified.js?v=3920","./flosy-unified-pages.js?v=3901","./flosy-unified-ai.js?v=3920", "./flosy-ai-experience-v396.js?v=3960", "./flosy-ai-experience-v396.css?v=3961",
 "./flosy-ultra.html","./flosy-ultra-live.css?v=3810","./flosy-ultra-more.css?v=3810","./flosy-ultra-data.js?v=3801","./flosy-ultra-ai.js?v=3801","./flosy-ultra-live.js?v=3810","./flosy-ultra-more.js?v=3810","./flosy-ultra-icon.svg","./flosy-ultra-avatar.svg","./flosy-ultra.webmanifest",
 "./finance-pro.js?v=1001","./finance-pro.css?v=130",
 "./flosy-next.css?v=202","./flosy-account-router.js?v=3602","./flosy-next.js?v=3102","./flosy-auto-import.js?v=2801","./flosy-automate-relay.js?v=3501","./flosy-automate-relay.css?v=2901","./flosy-auto-import.css?v=2801","./flosy-ai.css?v=210","./flosy-ai-analytics.js?v=1001","./flosy-report-kit.js?v=3601","./flosy-ai-local.js?v=3901",
 "./flosy-phase1.js?v=311","./flosy-sync-v3.js?v=302",
 "./flosy-v4-white.css?v=401","./flosy-v5-pearl.css?v=500","./flosy-elevate.css?v=801","./flosy-voice-nlu.js?v=3402","./flosy-receipt-ml.js?v=3401","./flosy-v4-capture.js?v=3402","./flosy-v4-bank.js?v=500",
 "./flosy-v4-wealth.js?v=400","./flosy-v4-family-privacy.js?v=1001","./flosy-v4-reminders.js?v=501","./flosy-v4-sw-register.js?v=401","./flosy-v5-command.js?v=1001","./flosy-v5-private-backup.js?v=500","./flosy-repair.js?v=3910","./flosy-assistant-bridge.js?v=602","./flosy-elevate.js?v=801","./flosy-studio.js?v=901","./flosy-capture-v10.css?v=3102","./flosy-studio.css?v=1001","./flosy-aurora.css?v=3700","./flosy-aurora.js?v=3701"
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
  const fallback=url.pathname.endsWith("/flosy.html")?"./flosy.html":url.pathname.endsWith("/flosy-ultra.html")?"./flosy-ultra.html":"./index.html";
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(fallback,copy)))}
   return response;
  }).catch(()=>caches.match(fallback).then(r=>r||new Response("لا يوجد اتصال ولم يتم تجهيز التطبيق للاستخدام دون إنترنت",{status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}}))));
  return;
 }
 if(/\.(js|css|svg|webmanifest)$/.test(url.pathname)){
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(request,copy)))}
   return response;
  })));
 }
});
