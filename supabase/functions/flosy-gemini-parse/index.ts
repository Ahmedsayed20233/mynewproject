/* Flosy Gemini PERSONAL FREE-TIER gateway.
 * No raw bank SMS, receipt photo, audio, question text, account numbers or amounts
 * accepted. It consumes only a closed set of locally extracted, non-identifying
 * finance signals / percentages. Calls Gemini only when explicitly enabled.
 * Requires a signed-in Supabase user and exact owner UID (no public access).
 */
import { withSupabase } from "npm:@supabase/server@1";

const ORIGIN = "https://ahmedsayed20233.github.io";
const MODEL = "gemini-2.5-flash-lite"; // Fixed Free-Tier model; no paid fallback.
const MAX_DAILY = 12; // Shares the existing per-user flosy_ai_usage quota table.
const INTENTS = ["budget", "spending", "saving", "emergency", "installments", "safe_to_spend", "general"];
const SOURCES = ["sms", "voice", "receipt"];
const SIGNALS = [
  "amount", "egp", "debit", "purchase", "paid", "withdrawal", "transfer_out",
  "instant_transfer", "deposit", "salary", "received", "transfer_in",
  "failed", "pending", "reversed", "balance_only",
  "coffee", "restaurant", "groceries", "transport", "electricity", "internet",
  "rent", "education", "health", "fuel", "shopping", "bills", "installment",
  "yesterday", "today", "date_present", "total", "subtotal", "vat",
  "merchant_present", "unrecognized"
];
const CATS = ["طعام ومشروبات","ترفيه","مواصلات","مشتريات","فواتير",
  "فاتورة الإنترنت","فاتورة الكهرباء","إيجار","صحة","تعليم",
  "مرتب","دخل آخر","معيشة أخرى","غير مصنف"];
const allowedKeys = (obj: Record<string,unknown>, keys: string[]) =>
  Object.keys(obj).every(k => keys.includes(k));
const error = (code:string,status:number) => Response.json({error:code},{status});
const isObj = (v:unknown):v is Record<string,unknown> =>
  typeof v==="object" && v!==null && !Array.isArray(v);
const uniqueSignals = (list:unknown):string[]|null => {
  if(!Array.isArray(list) || list.length>24) return null;
  const out = [...new Set(list)];
  if(out.some(s=>typeof s!=="string"||!SIGNALS.includes(s)))return null;
  return out as string[];
};
function validate(input: unknown){
  if(!isObj(input)||!allowedKeys(input,["task","intent","signals","source","expenseRatioBand","topCategory"]))return null;
  if(input.task==="coach"){
    if(typeof input.intent!=="string"||!INTENTS.includes(input.intent))return null;
    if(input.signals!==undefined||input.source!==undefined)return null;
    const ratio=input.expenseRatioBand;
    if(ratio!==undefined && (!Number.isInteger(ratio) || Number(ratio)<0 || Number(ratio)>100 || Number(ratio)%10!==0))
      return null;
    const cat=input.topCategory;
    if(cat!==undefined && (typeof cat!=="string" || !CATS.includes(cat)))return null;
    return {task:"coach" as const,intent:input.intent,
      expenseRatioBand:typeof ratio==="number"?ratio:null,
      topCategory:typeof cat==="string"?cat:null};
  }
  if(input.task==="classify"){
    if(typeof input.source!=="string"||!SOURCES.includes(input.source))return null;
    if(input.intent!==undefined||input.expenseRatioBand!==undefined||input.topCategory!==undefined)return null;
    const signals=uniqueSignals(input.signals);
    if(signals===null||signals.length===0)return null;
    return {task:"classify" as const,source:input.source,signals};
  }
  return null;
}
const schema = {
  type:"OBJECT",
  properties:{
    answer:{type:"STRING"},
    direction:{type:"STRING",enum:["expense","income","transfer","unknown"]},
    category:{type:"STRING",enum:CATS},
    confidence:{type:"STRING",enum:["high","low"]}
  },
  required:["answer","direction","category","confidence"]
};
export default {
  fetch:withSupabase({auth:"user"},async (req,ctx)=>{
    const origin=req.headers.get("origin");
    if(origin&&origin!==ORIGIN)return error("forbidden_origin",403);
    const owner=Deno.env.get("FLOSY_GEMINI_OWNER_UID")||"";
    if(!owner||ctx.userClaims?.id!==owner)return error("owner_only",403);
    if(req.method==="GET"){
      return Response.json({status:"ok",ready:Deno.env.get("GEMINI_ENABLED")==="true"&&
        !!Deno.env.get("GEMINI_API_KEY"),enabled:Deno.env.get("GEMINI_ENABLED")==="true",
        model:MODEL,dailyLimit:MAX_DAILY,freeTierOnly:true});
    }
    if(req.method!=="POST")return error("method_not_allowed",405);
    if(Deno.env.get("GEMINI_ENABLED")!=="true")return error("gemini_disabled",503);
    const apiKey=Deno.env.get("GEMINI_API_KEY")||"";
    if(!apiKey)return error("gemini_key_missing",503);
    const length=Number(req.headers.get("content-length")||0);
    if(!Number.isFinite(length)||length>3000)return error("body_too_large",413);
    let payload:unknown;
    try{
      const str=await req.text();
      if(str.length>3000)return error("body_too_large",413);
      payload=JSON.parse(str);
    }catch{return error("invalid_json",400)}
    const input=validate(payload);
    if(!input)return error("unsafe_or_invalid_payload",422);
    const {data:used,error:quotaErr}=await ctx.supabaseAdmin.rpc("flosy_ai_consume_quota",{
      p_user_id:ctx.userClaims.id,p_limit:MAX_DAILY
    });
    if(quotaErr||typeof used!=="number")return error("quota_unavailable",503);
    if(used===0)return error("daily_limit",429);
    const taskInstruction=input.task==="coach"?
      "You are Flosy, an Egyptian Arabic personal finance coach. Provide practical general advice based ONLY on the provided broad topic, 10% ratio band, and generic spending category. Never invent financial amounts, account data, balances, or bank access. Plain text answer, max 400 Arabic characters. direction=unknown, category=غير مصنف, confidence=low.":
      "You classify Egyptian finance language feature labels (NOT raw personal text). Return direction expense/income/transfer/unknown and best matching generic spending category. A transfer_out to another person is expense; transfers between user's own accounts may be transfer (unknown if self-ownership not clear). Failures, pending, balance_only are unknown. Never infer a specific amount or account. confidence=low if ambiguous. Short Egyptian Arabic explanation max 200 characters.";
    const safeInput = input.task==="coach"?
      {task:input.task,topic:input.intent,expense_ratio_rounded_to_10pct:input.expenseRatioBand,category:input.topCategory}:
      {task:input.task,source:input.source,labels:input.signals};
    let response:Response;
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),10000);
    try{
      response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+MODEL+":generateContent",{
        method:"POST",signal:ctrl.signal,
        headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
        body:JSON.stringify({
          systemInstruction:{parts:[{text:taskInstruction}]},
          contents:[{role:"user",parts:[{text:JSON.stringify(safeInput)}]}],
          generationConfig:{temperature:0.1,maxOutputTokens:320,responseMimeType:"application/json",responseSchema:schema}
        })
      });
    }catch{return error("gemini_network_error",503)}
    finally{clearTimeout(timeout)}
    if(response.status===429)return error("gemini_rate_limited",429);
    if(!response.ok)return error("gemini_unavailable",503);
    let modelOutput:unknown;
    try{
      const result=await response.json();
      const answerText=result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if(typeof answerText!=="string"||answerText.length>5000)throw Error("bad");
      modelOutput=JSON.parse(answerText);
    }catch{return error("gemini_invalid_result",502)}
    if(!isObj(modelOutput) || typeof modelOutput.answer!=="string" ||
      typeof modelOutput.direction!=="string"||!["expense","income","transfer","unknown"].includes(modelOutput.direction) ||
      typeof modelOutput.category!=="string"||!CATS.includes(modelOutput.category) ||
      !["high","low"].includes(modelOutput.confidence))return error("gemini_invalid_result",502);
    // Model output is only informational, never an authoritative ledger command.
    return Response.json({
      answer:modelOutput.answer.slice(0,700),
      direction:input.task==="coach"?"unknown":modelOutput.direction,
      category:input.task==="coach"?"غير مصنف":modelOutput.category,
      confidence:input.task==="coach"?"low":modelOutput.confidence,
      source:"gemini_free_tier",model:MODEL,usedToday:used,dailyLimit:MAX_DAILY
    });
  })
};
