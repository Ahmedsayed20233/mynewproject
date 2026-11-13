"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const staged=require("../flosy-import-staged.js");
test("financial message import remains disabled in this release",()=>{
 assert.equal(staged.enabled(),false);
 assert.equal(staged.policy.readsInbox,false);
 assert.equal(staged.policy.listensToNotifications,false);
 assert.equal(staged.policy.allowsAutoPost,false);
 assert.equal(staged.ingest().status,"disabled");
});
test("unknown or incomplete transaction stays in review",()=>{
 const answer=staged.previewSynthetic("رصيدك 3000 EGP",
  {source:"sms",accountId:"demo",date:"2026-11-13"});
 assert.equal(answer.status,"review");
});
