/* Flosy Compact Egyptian Finance Intent NLU. Trained student of 60k synthetic corpus.
 * 48,000 train / 12,000 held-out template groups, six classes.
 * Not an acoustic speech-recognition model. No real-user accuracy claim.
 * Does not access data stores, network, microphone, or ledger. ALWAYS preview-only.
 */
(function(w){"use strict";
 const vocab=w.FLOSY_NLU_COMPACT_VOCAB,weights64=w.FLOSY_NLU_COMPACT_WEIGHTS64;
 if(typeof vocab!=="string"||typeof weights64!=="string")return;
 const names=vocab.split("|");
 const classes=["debt","expense","income","none","refund","transfer"];
 const bias=[-0.429091,1.305412,0.500809,0.497685,-0.382824,-1.491991];
 const scales=[0.06681177,0.048516289,0.060183571,0.061539654,0.100955374,0.062815376];
 const idfs64="uLi2wL65vru4vbu3uby9tru8v7q9ub25vba4vLu7urq3tbu9uba5t7i8t7u1u7q9ur24vLy5q726urm6vLq7vLe7t724uLu5vLy7urvMz5jPzGKyxoRjY9LTls5jsMiGlq3PrK6ip6mylZWvtquurs7PxJvCtrairqfGu8m508PQrLCuoKpe0szOpc/T0tGvuazOvbS0rKiobZKnqqmpxc+X0NDQrq5zl9LDu6G2ts6WmK7Py9HChpjT0rrS0rGx0LjAqrDPxJmswJSp0bu7urm5mrCxn6WwlMOWsLeWzYKysZ+olcaKrrGWuLjPz7G507qXm3zT0qZb0NS2ypiYlrmYmLy8uLu5wc/P0dFtubm7gdTTh66RzNBqtpiwurp1kpbVqrKHu5q00Lm6uLhyrtF+lpbMzqbS09GTqc/Q0bq61K6uoKrSz3TR0m3U1NXUlKawbJbV1c+urrzS0M+vpKTTY7LHhctjs8WGTbTGYoVjs8mE0ba20qaqcpaTpoeWyKWpo7u7z6eJpcOTr67Q0dHOyaenubm5qqqTiNSvp6qt042Rx7KyzqS6u9HN0au2ydCtsamssLDKrNDQqoC0z66z0sHPcK1upaiylqfRzdDQ0M7VjqTI0KbPu8PDv73RurrQvdPUdZvSv8p0utNxdbTS0NCmxMbTWNTH1MnSsbHCsbzT0pqms7Oqpqao09GgurKnp8/P1LrR0dK50La2l87O0M25uW3Rfc5uzc6YmF2QybmNvdOhynLI0dPVybrRoreRp8ts0bLSuM7OtrbSz9DS0ru70Mynq62WubaytracrLmEzqO5i7mx0NPB0Iqv0c66u7vSlsXT0ZnRtra7u7zR0tKWhtFisciE0cy5uXW2lLPQq3C1dDSztLaznraxrJuvtq+1trS3s5zPsIGVqLuxbba1p7LI0LrPsMOn0M+20Za10tLO04qpubnS0LjTubm5tra7u7m5uampuaGwsKGorsTPqKy7u5aWb2+jubG2trq6ycrJyMjIysvKzMnNy8nHyM/IzsjLx87HzMzIyszNy8zLyczKysvNyczNy8s=";
 function decode64(str){
  const alpha="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const output=[];let hold=0,bits=0;
  for(const ch of str){if(ch==="=")break;const k=alpha.indexOf(ch);if(k<0)continue;
   hold=(hold<<6)|k;bits+=6;if(bits>=8){bits-=8;output.push((hold>>bits)&255)}}
  return output;
 }
 const Q=decode64(weights64),IDF=decode64(idfs64),V=new Map(names.map((x,i)=>[x,i]));
 // A missing/corrupted model must NEVER silently change financial intent.
 if(names.length!==800||Q.length!==4800||IDF.length!==800){
  w.FLOSY_NLU_COMPACT_ERROR="invalid-trained-model-blob";return;
 }
 function classify(raw){
  const text=String(raw||"").slice(0,800).toLowerCase()
    .normalize("NFKD").replace(/\p{M}/gu,"");
  const tokens=text.match(/[\p{L}\p{N}_]{2,}/gu)||[];
  const seen=new Map();
  const bump=term=>{const j=V.get(term);if(j!==undefined)seen.set(j,(seen.get(j)||0)+1)};
  for(let i=0;i<tokens.length;i++){bump(tokens[i]);if(i+1<tokens.length)bump(tokens[i]+" "+tokens[i+1])}
  let normSq=0;const fv=[];
  for(const [j,count] of seen){const val=(1+Math.log(count))*(IDF[j]/32);normSq+=val*val;fv.push([j,val])}
  const score=bias.slice();if(normSq>0){const norm=Math.sqrt(normSq);
   for(const [j,val] of fv){const feature=val/norm;
    for(let k=0;k<6;k++){const q=Q[k*names.length+j];score[k]+=feature*(q>127?q-256:q)*scales[k]}}}
  let best=0;for(let k=1;k<6;k++)if(score[k]>score[best])best=k;
  const high=Math.max(...score),exp=score.map(x=>Math.exp(x-high)),sum=exp.reduce((x,y)=>x+y,0);
  return {intent:classes[best],confidence:Number((exp[best]/sum).toFixed(4)),
    uncalibrated:true,canAutoPost:false,modelVersion:"flosy-synthetic-word800-v1"};
 }
 w.FLOSY_EGYPTIAN_NLU_COMPACT={
  classify,modelInfo:{classes,samples:60000,trainRows:48000,testRows:12000,
   trainedOn:"synthetic Egyptian Arabic finance text, split by template group",
   features:800,method:"word TF-IDF (1-2 gram) + six-class logistic regression",
   studentOfFullModel:true,quantized:true,
   measuredRealAccuracy:false,autoPostEnabled:false}
 };
})(window);
