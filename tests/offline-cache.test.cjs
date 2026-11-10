"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

// Simulate the service worker's install event, without network or user data.
function installScenario(failPrecache){
 const source=fs.readFileSync("service-worker.js","utf8");
 const version=source.match(/const VERSION="([^"]+)"/)?.[1];
 assert.ok(version,"Expected named cache version");
 const handlers={},log={requested:[],deleted:[],skipped:0};
 const cache={addAll:async requests=>{
   log.requested=requests.map(r=>r.url);
   if(failPrecache)throw Error("Simulated asset fetch failure: 404");
 }};
 const caches={
   open:async()=>cache,
   delete:async name=>{log.deleted.push(name);return true},
   keys:async()=>[],
   match:async()=>null
 };
 const self={
   location:{origin:"https://example.test"},
   clients:{claim:async()=>{}},
   addEventListener:(name,handler)=>{handlers[name]=handler},
   skipWaiting:async()=>{log.skipped++}
 };
 class Request {constructor(url,options={}){this.url=url;this.options=options;this.method="GET"}}
 const scope={self,caches,Request,URL,Response,Promise,fetch:async()=>{throw Error("Unexpected fetch")}};
 vm.runInNewContext(source,scope,{filename:"service-worker.js",timeout:1000});
 let promise;
 handlers.install({waitUntil:p=>{promise=p}});
 assert.ok(promise,"Install handler must register waitUntil");
 return {promise,version,log,handlers};
}

test("offline update installs only after every cached asset succeeds",async()=>{
 const {promise,log,version}=installScenario(false);
 await promise;
 assert.equal(log.skipped,1,"New worker should activate after a complete shell");
 assert.deepEqual(log.deleted,[]);
 assert.ok(log.requested.length>=15,"Expected full app shell to be cached");
 assert.ok(log.requested.includes("./index.html"));
 assert.ok(log.requested.some(p=>p.startsWith("./flosy-v4-capture.js")));
});

test("failed offline precache aborts install and removes partial cache",async()=>{
 const {promise,log,version}=installScenario(true);
 await assert.rejects(promise,/Simulated asset fetch failure/);
 assert.equal(log.skipped,0,"Incomplete worker must never skip waiting");
 assert.deepEqual(log.deleted,[version],"Incomplete cache must be removed");
});

test("offline worker does not cache API responses or external origins",()=>{
 const source=fs.readFileSync("service-worker.js","utf8");
 assert.match(source,/url\.origin!==self\.location\.origin/);
 assert.match(source,/\/auth\/|\/rest\/|\/functions\//);
 assert.doesNotMatch(source,/Promise\.allSettled\(SHELL/);
});
