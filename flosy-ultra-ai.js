/* Flosy AI - Egyptian Arabic, voice-first persona for the exact designer screen 8.
 * No invented training claims: the current response engine is deterministic ledger analytics.
 * Spoken responses use Android text-to-speech with ar-EG locale, or available browser TTS.
 * Continuous microphone loop is user opt-in and stoppable.
 */
(function(w,d){"use strict";
 const id=x=>d.getElementById(x),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let summary=null,C=null,core=null,started=false,voiceEnabled=false,loopEnabled=false,startedUtterance=false,listening=false;
 const D=()=>w.FLOSY_ULTRA_DATA;
 const chat=()=>id("aiChatContainer");
 function persona(){
  const f=d.querySelector('.phone-frame[data-screen="8"]');
  if(!f||f.querySelector("#flosyUltraPersona"))return;
  const sc=f.querySelector(".screen-scroll");
  const bar=d.createElement("div");bar.id="flosyUltraPersona";
  bar.className="ultra-ai-persona";
  bar.innerHTML='<img id="flosyUltraAvatar" class="flosy-ultra-avatar" src="flosy-ultra-avatar.svg" alt="شخصية فلوسي AI">'+
    '<div><strong>فلوسي AI · صاحبك المالي المصري</strong>'+
    '<span>بتكلم معاك بالمصري وبحلل بياناتك المسجّلة</span>'+
    '<div class="ultra-ai-voicebar">'+
     '<button type="button" id="flosyAiMic">🎤 اتكلم معايا</button>'+
     '<button type="button" id="flosyAiSpeak" aria-pressed="false">🔈 الرد بالصوت</button>'+
     '<button type="button" id="flosyAiLoop" aria-pressed="false">🔁 محادثة مستمرة</button>'+
     '<button type="button" id="flosyAiStop">⏹ إيقاف</button>'+
    '</div><span id="flosyAiVoiceStatus" class="ultra-ai-status" role="status"></span></div>';
  if(sc)sc.insertBefore(bar,sc.firstChild);
  id("flosyAiMic").addEventListener("click",()=>{
   if(!w.FLOSY_ULTRA?.startVoice)return setStatus("الصوت مش متاح في المتصفح ده");
   listening=true;setStatus("سامعك، اتكلم بالمصري...");
   w.FLOSY_ULTRA.startVoice(true);
  });
  id("flosyAiSpeak").addEventListener("click",()=>{
   voiceEnabled=!voiceEnabled;id("flosyAiSpeak").setAttribute("aria-pressed",String(voiceEnabled));
   id("flosyAiSpeak").classList.toggle("active",voiceEnabled);
   setStatus(voiceEnabled?"هرد عليك بصوت مصري لو الخدمة متاحة على موبايلك":"الرد الصوتي متوقف");
   if(!voiceEnabled)stopSpeech();
  });
  id("flosyAiLoop").addEventListener("click",()=>{
   loopEnabled=!loopEnabled;voiceEnabled=loopEnabled?true:voiceEnabled;
   id("flosyAiLoop").setAttribute("aria-pressed",String(loopEnabled));
   id("flosyAiLoop").classList.toggle("active",loopEnabled);
   id("flosyAiSpeak").setAttribute("aria-pressed",String(voiceEnabled));
   id("flosyAiSpeak").classList.toggle("active",voiceEnabled);
   if(loopEnabled){setStatus("المحادثة المستمرة مفعّلة باختيارك. اضغط الميكروفون للبدء.");}
   else setStatus("المحادثة المستمرة متوقفة");
  });
  id("flosyAiStop").addEventListener("click",stopAll);
 }
 function setStatus(s){const el=id("flosyAiVoiceStatus");if(el)el.textContent=String(s||"");}
 function append(role,text){
  const area=chat();if(!area)return;
  const wrapper=d.createElement("div");
  if(role==="user"){
   wrapper.className="flex justify-end";
   wrapper.innerHTML='<div class="ultra-ai-user">'+esc(text)+'</div>';
  }else{
   wrapper.className="ultra-ai-reply";
   wrapper.innerHTML='<img class="flosy-ultra-avatar" src="flosy-ultra-avatar.svg" alt="فلوسي AI">'+
     '<div class="ultra-ai-bubble">'+esc(text)+'</div>';
  }
  area.appendChild(wrapper);area.scrollTop=area.scrollHeight;
 }
 function speak(text){
  if(!voiceEnabled)return;
  const clean=String(text||"").slice(0,1350).replace(/[\u200e\u200f]/g,"");
  if(!clean)return;
  startedUtterance=true;id("flosyUltraAvatar")?.classList.add("ultra-ai-speaking");
  const action={action:"ultra-ai-speak",text:clean,locale:"ar-EG",rate:0.96};
  if(w.FLOSY_NATIVE_BRIDGE_AVAILABLE&&w.FlosyNative?.postMessage){
   try{w.FlosyNative.postMessage(JSON.stringify(action));setStatus("فلوسي بترد عليك بصوت...");return}catch{}
  }
  if("speechSynthesis" in w&&"SpeechSynthesisUtterance" in w){
   try{
    w.speechSynthesis.cancel();
    const t=new w.SpeechSynthesisUtterance(clean);
    t.lang="ar-EG";t.rate=0.96;t.pitch=1;
    const voices=w.speechSynthesis.getVoices();
    t.voice=voices.find(v=>v.lang.toLowerCase()==="ar-eg")||
      voices.find(v=>v.lang.toLowerCase().startsWith("ar"))||null;
    t.onend=done;t.onerror=()=>{setStatus("الصوت غير متاح، الرد مكتوب قدامك");done()};
    w.speechSynthesis.speak(t);return;
   }catch{}
  }
  setStatus("جهازك ما فيهوش صوت عربي متاح حاليًا؛ الرد موجود مكتوب.");done();
 }
 function done(){
  id("flosyUltraAvatar")?.classList.remove("ultra-ai-speaking");
  startedUtterance=false;
  if(loopEnabled&&!listening){
   setStatus("دورك تتكلم...");listening=true;
   w.FLOSY_ULTRA?.startVoice?.(true);
  }else setStatus("");
 }
 function stopSpeech(){
  startedUtterance=false;
  id("flosyUltraAvatar")?.classList.remove("ultra-ai-speaking");
  try{w.speechSynthesis?.cancel()}catch{}
  if(w.FLOSY_NATIVE_BRIDGE_AVAILABLE&&w.FlosyNative?.postMessage)
   try{w.FlosyNative.postMessage(JSON.stringify({action:"ultra-ai-stop"}))}catch{}
 }
 function stopAll(){
  loopEnabled=false;voiceEnabled=false;listening=false;
  id("flosyAiLoop")?.setAttribute("aria-pressed","false");
  id("flosyAiSpeak")?.setAttribute("aria-pressed","false");
  id("flosyAiLoop")?.classList.remove("active");
  id("flosyAiSpeak")?.classList.remove("active");
  stopSpeech();setStatus("تمام، وقفنا الاستماع والرد الصوتي.");
 }
 function respond(question){
  const s=summary;
  if(!s)return "أنا لسه بجهز بياناتك المالية، جرّب تاني بعد ثواني.";
  // Prefer existing Flosy local explainable engine when it has a grounded reply.
  try{
   const r=core?.FLOSY_LOCAL_ANALYTICS?.query?.(question,C?.getState?.(),new Date());
   if(r?.text&&typeof r.text==="string"){
    const short=String(r.text).slice(0,1200);
    if(!/(بالنسبة لأرقام|غير مسجل|تجربة فقط)/.test(short))return short;
   }
  }catch{}
  return D()?.answer(question,s)||"خليني أراجع حساباتك بالأرقام المسجلة.";
 }
 function ask(question){
  const q=String(question||"").trim().slice(0,500);if(!q)return;
  if(!started)activate();
  listening=false;
  append("user",q);
  setStatus("فلوسي بيحلل معاملاتك المسجلة...");
  let reply;
  try{reply=respond(q)}catch{reply="حصل خطأ في التحليل المحلي. جرب سؤال عن مصروفاتك أو حساباتك."}
  append("assistant",reply);setStatus("");
  speak(reply);
  return reply;
 }
 function activate(){
  persona();
  if(started)return;
  started=true;
  const area=chat();if(area)area.innerHTML="";
  append("assistant","يا أهلاً! أنا فلوسي AI. تقدر تسألني بالمصري عن مصروفاتك وميزانيتك وأهدافك. ولو تحب نتكلم صوت، اضغط «الرد بالصوت» وبعدها «اتكلم معايا».");
 }
 w.FLOSY_ULTRA_AI={
  activate,ask,setContext:(s,c,ctx)=>{summary=s;C=c;core=ctx;},
  nativeSpeechDone:done,stop:stopAll,
  voiceRecognized:spoken=>{listening=false;ask(spoken)},
  voiceError:message=>{listening=false;setStatus(message||"تعذر سماع الكلام")}
 };
})(window,document);
