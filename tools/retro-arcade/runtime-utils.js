(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RetroRuntime=api;})(globalThis,function(){
 'use strict';
 function reflected(value,min,max){const span=max-min;if(!(span>0))return min;const period=span*2,t=((value-min)%period+period)%period;return min+(t<=span?t:period-t);}
 function predictBounce(position,velocity,seconds,min,max){return reflected(position+velocity*Math.max(0,seconds),min,max);}
 return {reflected,predictBounce};
});
