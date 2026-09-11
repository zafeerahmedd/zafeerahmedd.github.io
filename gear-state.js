/* Pure finite timeline: no modulo arithmetic and no wrapping to tooth one. */
(function(root){
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function at(progress,count=5){
    const p=clamp(progress,0,1),raw=p*count,index=Math.min(count-1,Math.floor(raw)),f=raw-index;
    if(index===count-1)return {position:index,index,open:1,progress:p,complete:p===1};
    if(f<.60)return {position:index,index,open:1,progress:p,complete:false};
    if(f<.73)return {position:index,index,open:1-ease((f-.60)/.13),progress:p,complete:false};
    if(f<.90){const position=index+ease((f-.73)/.17);return {position,index:Math.round(position),open:0,progress:p,complete:false};}
    return {position:index+1,index:index+1,open:ease((f-.90)/.10),progress:p,complete:false};
  }
  const api={at,clamp};root.GearSequence=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
