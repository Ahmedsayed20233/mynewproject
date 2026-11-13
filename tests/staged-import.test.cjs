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

test("only synthetic completed debits become review candidates; no raw text persisted",()=>{
 const opts={source:"sms",accountId:"synthetic-cash",date:"2026-11-13"};
 const result=staged.previewSynthetic("تم خصم مبلغ 640.50 EGP من بطاقتك والرصيد 19999 EGP",opts);
 assert.equal(result.status,"candidate");
 assert.equal(result.amount,640.5);
 assert.equal(result.type,"expense");
 assert.equal(result.source,"sms");
 assert.equal(Object.hasOwn(result,"text"),false);
 assert.equal(Object.hasOwn(result,"raw"),false);
});
test("OTP, declined messages and own-account transfers never become candidates",()=>{
 const opts={source:"notification",accountId:"a",date:"2026-11-13"};
 assert.equal(staged.previewSynthetic("OTP 123456؛ تم خصم 50 جنيه",opts).status,"blocked");
 assert.equal(staged.previewSynthetic("تم خصم 50 جنيه - failed",opts).status,"blocked");
 assert.equal(staged.previewSynthetic("تم تحويل 300 جنيه من حسابي الى حسابي",opts).reason,
  "transfer-needs-two-explicit-accounts");
 assert.equal(staged.previewSynthetic("تم خصم 50 جنيه",{...opts,accountId:""}).reason,"account-required");
});
test("source-neutral fingerprint can signal a potential duplicate only for review",()=>{
 const options={accountId:"a",date:"2026-11-13"};
 const one=staged.previewSynthetic("تم خصم 50 جنيه",{...options,source:"sms"});
 const two=staged.previewSynthetic("تم خصم 50 جنيه",{...options,source:"notification"});
 assert.equal(one.status,"candidate");
 assert.equal(one.fingerprint,two.fingerprint);
 assert.equal(staged.ingest("تم خصم 50 جنيه").status,"disabled");
});
