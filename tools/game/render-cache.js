/* Reuse rasterized geometry; no layout reads in the animation loop. */
(() => {
 'use strict';
 class Cache {
  constructor(canvas){this.canvas=canvas;this.layers=new Map();this.width=canvas.clientWidth;this.height=canvas.clientHeight;this.dirty=true;this.observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;this.width=r.width;this.height=r.height;this.dirty=true;});this.observer.observe(canvas);}
  layer(key,width,height,paint){if(this.layers.has(key))return this.layers.get(key);const surface=document.createElement('canvas');surface.width=Math.ceil(width);surface.height=Math.ceil(height);paint(surface.getContext('2d'));this.layers.set(key,surface);return surface;}
  size(){if(this.dirty){this.dirty=false;const dpr=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.dpr=dpr;}return {width:this.width,height:this.height};}
 }
 window.ArenaRenderCache=Cache;
})();
