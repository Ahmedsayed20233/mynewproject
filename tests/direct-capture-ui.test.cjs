"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

function setup(direct){
 const panel={innerHTML:""};
 const handlers={};
 const messages=[];
 const body={};
 const context={
   window:{FLOSY_BRIDGE:{goto(){}},FLOSY_NATIVE_RELAY_AVAILABLE:true,
     FLOSY_NATIVE_DIRECT_CAPTURE_AVAILABLE:direct,
     FlosyNative:{postMessage(s){messages.push(JSON.parse(s))}},
     FLOSY_CAPTURE:{autoEnabled:()=>false}},
   document:{getElementById:id=>id==="flosyAutomateRelayRoot"?panel:null,
     addEventListener:(name,fn)=>handlers[name]=fn,execCommand:()=>true,
     body:{appendChild(){}}},
   navigator:{clipboard:{writeText:async()=>{}}},
   console,Date,Number,String,Array,Set,Object
 };
 vm.createContext(context);
 vm.runInContext(fs.readFileSync("flosy-automate-relay.js","utf8"),context);
 return {panel,messages,bridge:context.window.FLOSY_AUTOMATE_RELAY,handlers};
}
test("Direct native capture UI shows owner consent controls, no Automate setup",()=>{
 const c=setup(true);
 c.bridge.nativeStatus({directAvailable:true,directEnabled:false,pending:0});
 assert.match(c.panel.innerHTML,/بدون Automate/);
 assert.match(c.panel.innerHTML,/data-f29="direct-setup"/);
 assert.doesNotMatch(c.panel.innerHTML,/ثبّت Automate مجانًا/);
 const btn={dataset:{f29:"direct-setup"}};
 c.handlers.click({target:{closest:()=>btn}});
 assert.equal(c.messages.at(-1).action,"direct-capture-settings");
});
test("Direct enabled state displays and pending requests use existing native bridge",()=>{
 const c=setup(true);
 c.bridge.nativeStatus({directAvailable:true,directEnabled:true,pending:2});
 assert.match(c.panel.innerHTML,/المصادر مفعّلة/);
 const btn={dataset:{f29:"pending"}};
 c.handlers.click({target:{closest:()=>btn}});
 assert.equal(c.messages.at(-1).action,"relay-pending");
});
test("Standard variant retains Automate fallback",()=>{
 const c=setup(false);
 c.bridge.nativeStatus({directAvailable:false,paired:false,pending:0});
 assert.match(c.panel.innerHTML,/اربط Automate/);
});
