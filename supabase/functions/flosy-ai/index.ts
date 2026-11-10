// Flosy AI: OpenAI key stays in Supabase secrets. No raw SMS or sensitive financial text is sent.
const allowed="https://ahmedsayed20233.github.io";
function cors(){return {"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Content-Type":"application/json;charset=UTF-8","Vary":"Origin"}}
function json(o:unknown,status=200){return new Response(JSON.stringify(o),{status,headers:cors()})}
function env(k:string){return Deno.env.get(k)||""}
function keyMap(s:string){try{return JSON.parse(s)}catch{return{}}}
function n(v:unknown){let x=Number(v);return Number.isFinite(x)&&x>=0&&x<1e9?x:0}
async function call(url:string,key:string,token:string,method="GET",data?:unknown,prefer=""){
 let headers:Record<string,string>={apikey:key,Authorization:"Bearer "+token,"Content-Type":"application/json"};
 if(prefer)headers.Prefer=prefer;
 let res=await fetch(url,{method,headers,body:data===undefined?undefined:JSON.stringify(data)});
 if(!res.ok)throw Error("backend "+res.status);
 let txt=await res.text();return txt?JSON.parse(txt):null;
}
function totals(obj:any){
 let settings=obj?.settings||{},cats:Record<string,number>={},inc=0,spend=0,trans=0;
 let start=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
 for(let x of Array.isArray(obj?.transactions)?obj.transactions:[]){
  if(typeof x?.date!=="string"||x.date<start)continue;
  let value=n(x.amount);
  if(x.type==="income")inc+=value;
  if(x.type==="expense"){spend+=value;let k=String(x.category||"other").slice(0,35);cats[k]=(cats[k]||0)+value}
  if(x.type==="transfer")trans+=value;
 }
 let top=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([category,amount])=>({category,amount:Math.round(amount)}));
 return {period:"last 90 days, synced entries only",income:Math.round(inc),expense:Math.round(spend),
  transfers:Math.round(trans),top_categories:top,planned_salary:n(settings.salary),
  planned_expenses:n(settings.rent)+n(settings.bills)+n(settings.living),
  target_emergency:n(settings.emergencyTarget),
  warning:"Aggregates only. No SMS texts, transaction descriptions or account identifiers transmitted."};
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors()});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 let origin=req.headers.get("origin");if(origin&&origin!==allowed)return json({error:"forbidden_origin"},403);
 let openaiKey=env("OPENAI_API_KEY");
 if(!openaiKey)return json({error:"configuration_required",message:"Set OPENAI_API_KEY in Supabase Edge Function Secrets."},503);
 let token=(req.headers.get("authorization")||"").replace(/^Bearer /i,"");
 if(!token||token.length>6000)return json({error:"login_required"},401);
 let sb=env("SUPABASE_URL"),pub=keyMap(env("SUPABASE_PUBLISHABLE_KEYS")).default||env("SUPABASE_ANON_KEY"),
     secret=keyMap(env("SUPABASE_SECRET_KEYS")).default||env("SUPABASE_SERVICE_ROLE_KEY");
 if(!sb||!pub||!secret)return json({error:"server_configuration"},503);
 let user:any;
 try{user=await call(sb+"/auth/v1/user",pub,token)}catch{return json({error:"session_expired"},401)}
 let id=String(user?.id||"");
 if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:"login_required"},401);
 let data:any;
 try{let body=await req.text();if(body.length>6000)return json({error:"too_large"},413);data=JSON.parse(body)}
 catch{return json({error:"invalid_json"},400)}
 let question=String(data?.question||"").trim();
 if(question.length<2||question.length>1200)return json({error:"question_length"},400);
 let wants=data?.include_finances===true;
 let history=(Array.isArray(data?.history)?data.history:[]).slice(-6)
  .filter((m:any)=>["user","assistant"].includes(m?.role)&&typeof m.content==="string")
  .map((m:any)=>({role:m.role,content:m.content.slice(0,600)}));
 let day=new Date().toISOString().slice(0,10),used=0,url=sb+"/rest/v1/flosy_ai_usage";
 try{
   let rs=await call(url+"?select=request_count&user_id=eq."+id+"&usage_date=eq."+day,secret,secret);
   used=Number(rs?.[0]?.request_count)||0;
   if(used>=15)return json({error:"daily_limit",message:"15 questions per day limit reached."},429);
   await call(url+"?on_conflict=user_id,usage_date",secret,secret,"POST",
    [{user_id:id,usage_date:day,request_count:used+1,updated_at:new Date().toISOString()}],"resolution=merge-duplicates,return=minimal");
 }catch{return json({error:"rate_limit_unavailable"},503)}
 let summary=null;
 if(wants){
  try{let rows=await call(sb+"/rest/v1/flosy_state_v3?select=payload&user_id=eq."+id,pub,token);
    summary=totals(rows?.[0]?.payload||{})}
  catch{return json({error:"financial_summary_unavailable"},503)}
 }
 const instructions="You are Flosy AI, an Arabic-Egyptian personal finance coach. Be clear, grounded and practical. "+
 "Provide budgeting and financial education, not investment guarantees or specific buy/sell orders. "+
 "Use only the aggregate financial summary if provided; never invent account balances. "+
 "You cannot read banks, SMS, Thndr or other personal data directly. "+
 "If no summary is provided, be transparent that you have no current personal financial records. "+
 "Avoid requesting passwords, financial IDs, SMS codes, OTP, or card details. "+
 "Respond in Egyptian Arabic where appropriate. Keep responses under 400 words.";
 const messages=[...history,{role:"user",content:question+(summary?"\nUser-consented synced aggregate summary: "+JSON.stringify(summary):"")}];
 let result:Response;
 try{result=await fetch("https://api.openai.com/v1/responses",{method:"POST",
  headers:{Authorization:"Bearer "+openaiKey,"Content-Type":"application/json"},
  body:JSON.stringify({model:env("OPENAI_MODEL")||"gpt-6-luna",instructions,input:messages,max_output_tokens:650,store:false})})}
 catch{return json({error:"openai_network_error"},502)}
 if(!result.ok)return json({error:"openai_error",message:"OpenAI returned HTTP "+result.status},502);
 let output:any;
 try{output=await result.json()}catch{return json({error:"invalid_provider_response"},502)}
 const answer=(output.output||[]).flatMap((x:any)=>x.type==="message"?(x.content||[]):[])
 .filter((x:any)=>x.type==="output_text").map((x:any)=>x.text||"").join("\n").slice(0,6000);
 if(!answer)return json({error:"empty_answer"},502);
 return json({answer,used_finances:wants,remaining_today:14-used});
});
