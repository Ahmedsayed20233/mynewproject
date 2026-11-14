"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const map=require("../flosy-screen-map-v395.js");
test("all 20 legacy screens have a single visible navigation placement",()=>{
 const report=map.audit();
 assert.deepEqual(report,{screens:20,primary:8,details:10,advanced:9});
 const all=[1,16,...map.primary.map(x=>+x[0]),...map.details.map(x=>+x[0])].sort((a,b)=>a-b);
 assert.deepEqual(all,Array.from({length:20},(_,i)=>i+1));
 assert.equal(new Set(all).size,20);
});
test("consolidated navigation maps to valid primary workflows without losing deep routes",()=>{
 assert.equal(map.canonicalFor(6),5);
 assert.equal(map.canonicalFor(7),5);
 assert.equal(map.canonicalFor(20),5);
 assert.equal(map.canonicalFor(10),9);
 assert.equal(map.canonicalFor(18),9);
 assert.equal(map.canonicalFor(12),11);
 assert.equal(map.canonicalFor(17),11);
 assert.equal(map.canonicalFor(19),11);
 assert.equal(map.canonicalFor(13),3);
 assert.equal(map.canonicalFor(14),15);
 assert.equal(map.canonicalFor(1),1);
 assert.equal(map.canonicalFor(16),16);
 assert.equal(map.canonicalFor(99),null);
});
test("every detail stays a clickable screen, every advanced tool stays a feature",()=>{
 for(const item of map.details)assert.match(item[0],/^\d+$/);
 for(const item of map.advanced){
  assert.equal(item[5],true);
  assert.doesNotMatch(item[0],/^\d+$/);
 }
 assert.deepEqual(map.primary.map(x=>+x[0]),[2,3,4,5,8,9,11,15]);
});
