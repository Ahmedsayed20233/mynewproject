"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8");
const begin=html.indexOf('id="mobileMorePanel"'),end=html.indexOf('<div class="more-sync">',begin);
if(begin<0||end<0)throw Error("Standalone mobile More menu not found");
const menu=html.slice(begin,end);
const ids=[...menu.matchAll(/data-go="([^"]+)"/g)].map(x=>x[1]);
test("old standalone More menu has 5 visible essential and 9 optional distinct routes",()=>{
 assert.equal(ids.length,14);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(ids.slice(0,5),["budget","wealth","ai","settings","recovery"]);
 assert.ok(menu.includes('id="mobileMoreExtra"'));
 assert.deepEqual(ids.slice(5),["goals","portfolio","plan","v4-capture","v4-bank",
  "v4-crisis","v4-family","v4-privacy","recurring"]);
});
test("old More removes duplicates, SMS import and unnecessary refresh controls",()=>{
 for(const x of ["reports","risk","phase1","v4-wealth","smart","import"])
  assert.ok(!ids.includes(x),"redundant/disabled More destination "+x);
 assert.doesNotMatch(menu,/moreRefresh|more-actions/);
 assert.doesNotMatch(html,/\$\('moreRefresh'\)\.onclick/);
 assert.ok(html.includes('id="moreSyncBtn"'),"sync remains available");
});
