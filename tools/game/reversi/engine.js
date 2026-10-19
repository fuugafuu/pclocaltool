(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReversiEngine=api;})(typeof self!=='undefined'?self:globalThis,function(){
 'use strict';
 const DIRS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
 const inside=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
 function initial(){const b=Array(64).fill(0);b[27]=b[36]=-1;b[28]=b[35]=1;return b;}
 function flips(board,index,color){if(board[index]||index<0||index>=64)return [];const x=index%8,y=Math.floor(index/8),result=[];for(const [dx,dy] of DIRS){let nx=x+dx,ny=y+dy,line=[];while(inside(nx,ny)&&board[ny*8+nx]===-color){line.push(ny*8+nx);nx+=dx;ny+=dy;}if(line.length&&inside(nx,ny)&&board[ny*8+nx]===color)result.push(...line);}return result;}
 function moves(board,color){const out=[];for(let i=0;i<64;i++)if(!board[i]&&flips(board,i,color).length)out.push(i);return out;}
 function play(board,index,color){const captured=flips(board,index,color);if(!captured.length)return null;const b=board.slice();b[index]=color;for(const i of captured)b[i]=color;return {board:b,flips:captured,index,color};}
 function count(board){const black=board.filter(v=>v===1).length,white=board.filter(v=>v===-1).length;return {black,white,empty:64-black-white};}
 function outcome(board){const over=!moves(board,1).length&&!moves(board,-1).length,c=count(board);return {over,winner:c.black===c.white?0:c.black>c.white?1:-1,...c};}
 function features(board,color){const c=count(board),material=(c.black-c.white)*color/64,mob=(moves(board,color).length-moves(board,-color).length)/32;let corners=0,frontier=0,edge=0;for(let i=0;i<64;i++){if(!board[i])continue;const x=i%8,y=Math.floor(i/8),sign=board[i]*color;if((x===0||x===7)&&(y===0||y===7))corners+=sign;if(DIRS.some(([dx,dy])=>inside(x+dx,y+dy)&&!board[(y+dy)*8+x+dx]))frontier-=sign;if(x===0||x===7||y===0||y===7)edge+=sign;}return [material,mob,corners/4,frontier/64,edge/28,(c.empty%2?1:-1)*color];}
 return {DIRS,inside,initial,flips,moves,play,count,outcome,features};
});
