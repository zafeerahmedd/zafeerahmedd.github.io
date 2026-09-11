/* Pure finite timeline: no modulo arithmetic and no wrapping to tooth one. */
(function(root){
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function at(progress,count=5){
    const p=clamp(progress,0,1),raw=p*count,index=Math.min(count-1,Math.floor(raw)),f=raw-index;
    if(index===count-1)return {position:index,index,open:1,progress:p,complete:p===1};
    /* Wider transition bands: the plate spends less of the segment sitting still
       and more of it actually moving, so the retract/turn/expand reads as motion
       rather than a jump. Dwell 0-46%, retract 46-64%, turn 64-86%, expand 86-100%. */
    if(f<.46)return {position:index,index,open:1,progress:p,complete:false};
    if(f<.64)return {position:index,index,open:1-ease((f-.46)/.18),progress:p,complete:false};
    if(f<.86){const position=index+ease((f-.64)/.22);return {position,index:Math.round(position),open:0,progress:p,complete:false};}
    return {position:index+1,index:index+1,open:ease((f-.86)/.14),progress:p,complete:false};
  }
  const api={at,clamp};root.GearSequence=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
