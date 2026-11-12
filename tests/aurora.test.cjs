const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const index=fs.readFileSync("index.html","utf8"),css=fs.readFileSync("flosy-aurora.css","utf8"),
  js=fs.readFileSync("flosy-aurora.js","utf8"),sw=fs.readFileSync("service-worker.js","utf8");
test("Aurora loads after all legacy design systems and is precached",()=>{
  assert.match(index,/flosy-aurora.css\?v=3700/);
  assert.ok(index.indexOf("flosy-aurora.css")>index.indexOf("flosy-studio.css"));
  assert.ok(index.indexOf("flosy-aurora.js")>index.indexOf("flosy-studio.js"));
  assert.match(sw,/flosy-aurora.css\?v=3700/);
  assert.match(sw,/flosy-aurora.js\?v=3701/);
});
test("brand uses midnight, purple, cyan and coral (not Egyptian bank green-gold)",()=>{
  for(const color of ["#17132F","#6846F5","#32C5E4","#FF7588"])
   assert.ok(css.includes(color),color);
  assert.match(index,/Flosy Aurora/);
});
test("all major feature areas retain functional pages",()=>{
  for(const name of ["dashboard","transactions","budget","goals","wealth","recurring","reports","ai","v4-capture","settings"])
   assert.ok(index.includes('id="page-'+name+'"'),name);
});
test("Aurora notification module does not import SMS or banking notifications",()=>{
  assert.match(js,/FLOSY_MVP_NO_MESSAGE_IMPORT/);
  assert.match(js,/notifications-enable/);
  assert.match(js,/notifications-sync/);
  assert.match(js,/notifications-stop/);
  assert.match(js,/notifications-test/);
  assert.ok(!/READ_SMS|RECEIVE_SMS|SMS_RECEIVED/.test(js));
});
test("Aurora UI module safely loads without DOM or native Android",()=>{
  const handlers={};const doc={
    readyState:"loading",
    addEventListener:(event,callback)=>handlers[event]=callback,
    querySelector:()=>null,
    getElementById:()=>null
  };
  const win={FLOSY_MVP_NO_MESSAGE_IMPORT:false,
    setInterval:()=>{},setTimeout:()=>{}};
  vm.runInNewContext(js,{window:win,document:doc});
  assert.equal(typeof win.FLOSY_AURORA.boot,"function");
  assert.doesNotThrow(()=>win.FLOSY_AURORA.boot());
  assert.equal(typeof handlers.click,"function");
});

test("native due-date payload excludes stale overdue bills",()=>{
  assert.match(js,/x\.days>=0/);
  assert.match(js,/x\.days<=7/);
});
