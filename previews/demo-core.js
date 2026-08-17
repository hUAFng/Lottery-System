/* ============================================================
   Demo 共享 Canvas 轮盘引擎
   - 扇区 + 真实奖品图片 + 径向文字 一起绘制在 canvas，整体旋转
   - 指针固定在顶部，spinTo 让目标扇区中心精确停在指针处
   - 奖品图片为内联 SVG data-URI（离线可用，无需外网）
   ============================================================ */
window.Demo = (function(){
'use strict';

/* ---------- 奖品 SVG 图片（data-URI，无版权依赖） ---------- */
var SVGs = {
  phone: '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 100 100">'+
    '<defs><linearGradient id="scr" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0" stop-color="#a5f3fc"/><stop offset="1" stop-color="#0284c7"/></linearGradient></defs>'+
    '<rect x="29" y="6" width="42" height="88" rx="11" fill="#111"/>'+
    '<rect x="33" y="11" width="34" height="74" rx="6" fill="url(#scr)"/>'+
    '<rect x="45" y="18" width="10" height="4" rx="2" fill="#0c4a6e"/>'+
    '<rect x="42" y="80" width="16" height="5" rx="2.5" fill="#333"/></svg>',

  coupon: function(amount, c1, c2){ return '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 100 100">'+
    '<rect x="8" y="10" width="84" height="80" rx="12" fill="#fffdf5" stroke="'+c1+'" stroke-width="3" stroke-dasharray="7 4"/>'+
    '<circle cx="8" cy="50" r="9" fill="'+c1+'"/><circle cx="92" cy="50" r="9" fill="'+c1+'"/>'+
    '<circle cx="8" cy="50" r="4" fill="#fffdf5"/><circle cx="92" cy="50" r="4" fill="#fffdf5"/>'+
    '<text x="50" y="36" font-size="15" font-weight="bold" fill="'+c1+'" text-anchor="middle" font-family="Arial,sans-serif">话费券</text>'+
    '<text x="50" y="74" font-size="27" font-weight="bold" fill="'+c2+'" text-anchor="middle" font-family="Arial,sans-serif">¥'+amount+'</text></svg>'; },

  thanks: '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 100 100">'+
    '<defs><radialGradient id="thx" cx="40%" cy="35%"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs>'+
    '<circle cx="50" cy="54" r="28" fill="url(#thx)"/>'+
    '<circle cx="41" cy="49" r="3.5" fill="#7c2d12"/><circle cx="59" cy="49" r="3.5" fill="#7c2d12"/>'+
    '<path d="M38 60 q12 12 24 0" stroke="#7c2d12" stroke-width="3.5" fill="none" stroke-linecap="round"/>'+
    '<text x="50" y="34" font-size="11" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial,sans-serif">感谢参与</text></svg>'
};
function dataUri(svg){ return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg); }

var IMAGES = {
  phone: dataUri(SVGs.phone),
  coupon5: dataUri(SVGs.coupon('5','#f97316','#ea580c')),
  coupon10: dataUri(SVGs.coupon('10','#10b981','#047857')),
  thanks: dataUri(SVGs.thanks)
};

/* ---------- 引擎 ---------- */
function loadImages(cb){
  var keys=Object.keys(IMAGES), left=keys.length, map={};
  keys.forEach(function(k){
    var im=new Image();
    im.onload=function(){ map[k]=im; if(--left===0) cb(map); };
    im.src=IMAGES[k];
  });
}

/* slots: [{name,img:'phone'|'coupon5'|'coupon10'|'thanks', c1,c2, edge}]
   idx 固定：0=手机, 3=5元券, 6=10元券, 其余=感谢参与 */
function build(canvasId, slots, opts){
  opts=opts||{};
  var canvas=document.getElementById(canvasId);
  var wrap=document.getElementById('wheel-wrap');
  var N=slots.length, SEG=360/N;
  var W=Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight));
  var dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr; canvas.height=W*dpr;
  canvas.style.width=W+'px'; canvas.style.height=W+'px';
  var ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  var C=W/2, R=W/2-2;
  var pointerDeg = -90;   // 指针在顶部 => canvas 角度 -90°
  var wheelRotation=0;

  loadImages(function(imgMap){
    function draw(){
      ctx.clearRect(0,0,W,W);
      var rot=wheelRotation*Math.PI/180, seg=2*Math.PI/N;
      for(var i=0;i<N;i++){
        var a0=rot+i*seg, a1=a0+seg, mid=a0+seg/2, s=slots[i];
        var g=ctx.createRadialGradient(C,C,R*0.22,C,C,R);
        g.addColorStop(0,s.c1); g.addColorStop(1,s.c2);
        ctx.beginPath(); ctx.moveTo(C,C); ctx.arc(C,C,R,a0,a1); ctx.closePath();
        ctx.fillStyle=g; ctx.fill();
        ctx.strokeStyle=s.edge||'rgba(255,255,255,.45)'; ctx.lineWidth=2.5; ctx.stroke();
        // 奖品图片（径向直立）
        var img=imgMap[s.img];
        if(img){
          ctx.save(); ctx.translate(C,C); ctx.rotate(mid-Math.PI/2); ctx.translate(R*0.50,0);
          var dw=Math.min(W*0.26, 56), dh=dw*img.height/img.width;
          ctx.drawImage(img,-dw/2,-dh/2,dw,dh); ctx.restore();
        }
        // 文字（径向）
        ctx.save(); ctx.translate(C,C); ctx.rotate(mid-Math.PI/2);
        ctx.textAlign='right'; ctx.textBaseline='middle';
        ctx.fillStyle=opts.textColor||'#fff';
        ctx.shadowColor='rgba(0,0,0,.4)'; ctx.shadowBlur=4;
        ctx.font='bold '+Math.max(14,R*0.075)+'px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(s.name, R*0.94, 0);
        ctx.restore();
      }
      // 中心圆
      ctx.beginPath(); ctx.arc(C,C,R*0.20,0,2*Math.PI);
      ctx.fillStyle=opts.centerColor||'#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(C,C,R*0.20,0,2*Math.PI);
      ctx.strokeStyle=opts.centerEdge||'rgba(0,0,0,.2)'; ctx.lineWidth=3; ctx.stroke();
      // 外圈
      ctx.beginPath(); ctx.arc(C,C,R,0,2*Math.PI);
      ctx.strokeStyle=opts.ringColor||'#fff'; ctx.lineWidth=5; ctx.stroke();
    }

    function spinTo(idx){
      var target=pointerDeg-(idx*SEG+SEG/2);   // 目标扇区中心对齐指针
      target=((target%360)+360)%360;
      var cur=((wheelRotation%360)+360)%360;
      var delta=(target-cur+360)%360;
      var total=wheelRotation+(5+Math.floor(Math.random()*4))*360+delta;
      wheelRotation=total;
      canvas.style.transition='transform 4.2s cubic-bezier(.12,.7,.08,1)';
      canvas.style.transform='rotate('+total+'deg)';
      setTimeout(function(){ if(opts.onResult) opts.onResult(idx); },4300);
    }

    canvas._spin=spinTo; canvas._idx=function(){ var cur=((wheelRotation%360)+360)%360; return Math.round((pointerDeg-cur)/SEG)%N; };
    draw();
    window.addEventListener('resize', function(){ /* 简单缩放保持可用 */ });
  });
  return {spin:function(i){ if(canvas._spin) canvas._spin(i); }};
}

return { build:build, IMG:IMAGES };
})();
