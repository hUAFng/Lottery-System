/* ============================================================
   幸运大转盘 · 正式版（Canvas 轮盘版）
   ------------------------------------------------------------
   - 登录/会话、抽奖判定、Canvas 轮盘、转发、个人中心、收货地址
   - 轮盘用单 Canvas 一体绘制（扇区+真实奖品图片+文字），整体旋转
   - 数据存 localStorage，按手机号区分
   ============================================================ */
(function(){
'use strict';

/* ---------- 配置（发布时改 CONFIG.IS_DEV 为 false） ---------- */
var CONFIG = {
  IS_DEV: false,                              // 正式版请改为 false（隐藏退出登录）
  SPECIAL: ['13925599313', '19868735951'],   // 仅这两个号码可中手机
  TEST:   '19868735951',                     // 测试号：中手机后不封抽
  PHONE_DRAW_START: 5,                       // 第5次起手机才进奖池
  INIT_TIMES: 3,                             // 初始抽奖次数
  FORWARD_WAIT: 10,                          // 转发等待秒数
  STORE: { users:'ll_users', session:'ll_session', pending:'ll_pending_fwd' }
};

/* ---------- 奖品 SVG 真实图片（data-URI，离线可用） ---------- */
function svgPhone(){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 100 100">'+
    '<defs>'+
    '<linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2f36"/><stop offset="0.5" stop-color="#111318"/><stop offset="1" stop-color="#0a0c10"/></linearGradient>'+
    '<linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1320"/><stop offset="1" stop-color="#1b2735"/></linearGradient>'+
    '<radialGradient id="lens" cx="50%" cy="50%"><stop offset="0" stop-color="#4c5b73"/><stop offset="0.7" stop-color="#0a1020"/><stop offset="1" stop-color="#000"/></radialGradient>'+
    '</defs>'+
    '<!-- 机身（全面屏） -->'+
    '<rect x="21" y="3" width="58" height="94" rx="15" fill="url(#body)" stroke="#000" stroke-width="1"/>'+
    '<rect x="24" y="6" width="52" height="88" rx="11" fill="url(#scr)"/>'+
    '<!-- 屏内护眼圆角屏光 -->'+
    '<rect x="24" y="6" width="52" height="88" rx="11" fill="none" stroke="rgba(120,190,255,.25)" stroke-width="1.5"/>'+
    '<!-- 顶部居中挖孔摄像头 -->'+
    '<circle cx="50" cy="15" r="4" fill="#000"/><circle cx="50" cy="15" r="2.2" fill="#2a3c55"/>'+
    '<!-- 屏幕内容模拟 -->'+
    '<rect x="30" y="28" width="40" height="6" rx="3" fill="rgba(120,190,255,.22)"/>'+
    '<rect x="30" y="40" width="28" height="6" rx="3" fill="rgba(255,180,90,.22)"/>'+
    '<rect x="30" y="52" width="34" height="6" rx="3" fill="rgba(120,255,180,.20)"/>'+
    '<rect x="30" y="64" width="24" height="6" rx="3" fill="rgba(200,160,255,.22)"/>'+
    '<!-- 品牌 vivo -->'+
    '<text x="50" y="84" font-size="9" font-weight="bold" fill="#8f9db3" text-anchor="middle" font-family="Arial,sans-serif">vivo</text>'+
    '</svg>';
}
function svgCoupon(amount,c1,c2){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 100 100">'+
    '<rect x="8" y="10" width="84" height="80" rx="12" fill="#fffdf5" stroke="'+c1+'" stroke-width="3" stroke-dasharray="7 4"/>'+
    '<circle cx="8" cy="50" r="9" fill="'+c1+'"/><circle cx="92" cy="50" r="9" fill="'+c1+'"/>'+
    '<circle cx="8" cy="50" r="4" fill="#fffdf5"/><circle cx="92" cy="50" r="4" fill="#fffdf5"/>'+
    '<text x="50" y="36" font-size="15" font-weight="bold" fill="'+c1+'" text-anchor="middle" font-family="Arial,sans-serif">话费券</text>'+
    '<text x="50" y="74" font-size="27" font-weight="bold" fill="'+c2+'" text-anchor="middle" font-family="Arial,sans-serif">¥'+amount+'</text></svg>';
}
function svgThanks(){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 100 100">'+
    '<defs><radialGradient id="thx" cx="40%" cy="35%"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs>'+
    '<circle cx="50" cy="54" r="28" fill="url(#thx)"/>'+
    '<circle cx="41" cy="49" r="3.5" fill="#7c2d12"/><circle cx="59" cy="49" r="3.5" fill="#7c2d12"/>'+
    '<path d="M38 60 q12 12 24 0" stroke="#7c2d12" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>';
}
function dataUri(svg){ return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg); }
var IMG = {
  phone: dataUri(svgPhone()),
  coupon5: dataUri(svgCoupon('5','#f97316','#ea580c')),
  coupon10: dataUri(svgCoupon('10','#10b981','#047857')),
  thanks: dataUri(svgThanks())
};

/* ---------- 轮盘：8 槽位（手机×1 + 话费券×2 + 感谢参与×5，错开） ---------- */
var SLOTS = [
  {n:'vivo X200s', img:'phone',   c1:'#fde047', c2:'#b45309'},
  {n:'感谢参与',   img:'thanks',  c1:'#ff6b6b', c2:'#dc2626'},
  {n:'感谢参与',   img:'thanks',  c1:'#a78bfa', c2:'#7c3aed'},
  {n:'5元话费券',  img:'coupon5', c1:'#38bdf8', c2:'#0284c7'},
  {n:'感谢参与',   img:'thanks',  c1:'#f472b6', c2:'#db2777'},
  {n:'感谢参与',   img:'thanks',  c1:'#34d399', c2:'#059669'},
  {n:'10元话费券', img:'coupon10',c1:'#a5b4fc', c2:'#4f46e5'},
  {n:'感谢参与',   img:'thanks',  c1:'#fbbf24', c2:'#d97706'}
];
var PHONE_IDX=0, C5_IDX=3, C10_IDX=6, THANKS_IDX=[1,2,4,5,7];
var N=SLOTS.length, SEG=360/N;

/* ---------- 状态 ---------- */
var users={}, cur=null, spinning=false, fwdTimer=null, bannerTimer=null;
var WHEEL_ROT=0;   // 轮盘累计旋转角（度）

/* ---------- Canvas 轮盘引擎 ---------- */
var wheelEngine=null, imgMap={}, _wheelBuilt=false;
function buildWheel(){
  if(_wheelBuilt) return;
  _wheelBuilt=true;
  var canvas=$('wheel'), wrap=$('wheel-wrap');
  var measured=Math.min(wrap.clientWidth, wrap.clientHeight);
  // 兜底：隐藏屏幕时 clientWidth 可能为 0，避免负半径报错
  var fallback=Math.min(window.innerWidth-40, 400);
  var W=Math.floor(measured>0 ? measured : (fallback>0?fallback:360));
  var dpr=window.devicePixelRatio||1;
  canvas.width=W*dpr; canvas.height=W*dpr;
  canvas.style.width=W+'px'; canvas.style.height=W+'px';
  var ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  var C=W/2, R=W/2-2;
  var pointerDeg=-90;

  // 轮盘累计旋转角（模块级 shared，供命中扇区反推）
  WHEEL_ROT=0;

  function draw(){
    ctx.clearRect(0,0,W,W);
    var seg=2*Math.PI/N;
    // 先把色块画完
    for(var i=0;i<N;i++){
      var a0=i*seg, a1=a0+seg, s=SLOTS[i];
      var g=ctx.createRadialGradient(C,C,R*0.22,C,C,R);
      g.addColorStop(0,s.c1); g.addColorStop(1,s.c2);
      ctx.beginPath(); ctx.moveTo(C,C); ctx.arc(C,C,R,a0,a1); ctx.closePath();
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.45)'; ctx.lineWidth=2.5; ctx.stroke();
    }
    // 再画 奖品图（径向直立居中）与 文字（沿半径方向放射书写的转盘式标签）
    for(var k=0;k<N;k++){
      var mid=k*seg+seg/2, s2=SLOTS[k];
      var img=imgMap[s2.img];
      // 奖品图：放在半径约 0.50R 处，限制尺寸防相邻扇区越界
      if(img){
        var dw=Math.min(W*0.16,46), dh=dw*img.height/img.width;
        ctx.save();
        ctx.translate(C,C); ctx.rotate(mid); ctx.translate(R*0.50,0); ctx.rotate(-mid);
        ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
        ctx.restore();
      }
      // 文字：沿半径方向放射书写（像表盘刻度/经典转盘），首端靠近圆心
      ctx.save();
      ctx.translate(C,C);
      ctx.rotate(mid);
      // 沿半径方向横排书写：局部 x 轴指向圆盘外缘，文字放射展开
      ctx.translate(R*0.60,0);
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='bold '+Math.max(12,R*0.07)+'px "PingFang SC","Microsoft YaHei",sans-serif';
      var tw=ctx.measureText(s2.n).width;
      // 底色圆角条
      ctx.fillStyle='rgba(0,0,0,.34)';
      ctx.shadowColor='transparent';
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(-tw/2-3, -6, tw+6, 12, 5);
      else ctx.rect(-tw/2-3, -6, tw+6, 12);
      ctx.fill();
      // 文字
      ctx.fillStyle='#fff'; ctx.shadowColor='rgba(0,0,0,.6)'; ctx.shadowBlur=4;
      ctx.fillText(s2.n, 0, 0);
      ctx.restore();
    }
    // 中心圆（供 HTML 中心按钮覆盖）
    ctx.beginPath(); ctx.arc(C,C,R*0.20,0,2*Math.PI); ctx.fillStyle='#fff6d8'; ctx.fill();
    ctx.beginPath(); ctx.arc(C,C,R*0.20,0,2*Math.PI); ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.lineWidth=3; ctx.stroke();
    // 外圈
    ctx.beginPath(); ctx.arc(C,C,R,0,2*Math.PI); ctx.strokeStyle='#ffd700'; ctx.lineWidth=5; ctx.stroke();
  }

  function spinTo(idx){
    var target=pointerDeg-(idx*SEG+SEG/2);
    target=((target%360)+360)%360;
    var curRot=((WHEEL_ROT%360)+360)%360;
    var delta=(target-curRot+360)%360;
    var total=WHEEL_ROT+(5+Math.floor(Math.random()*4))*360+delta;
    WHEEL_ROT=total;
    canvas.style.transition='transform 4.2s cubic-bezier(.12,.7,.08,1)';
    canvas.style.transform='rotate('+total+'deg)';
  }

  // 反推指针当前指向的扇区（0..N），保证弹窗与指针一致
  function hitSector(){
    var cur=((WHEEL_ROT%360)+360)%360;
    // 扇区i中心位于 i*SEG+SEG/2；旋转 cur 后要到指针 -90
    // => i = (pointerDeg - cur - SEG/2)/SEG，取最近整数
    var i=Math.round(((pointerDeg - cur - SEG/2)/SEG));
    i=((i%N)+N)%N;
    return i;
  }

  draw();
  // 加载真实图片后重绘
  var keys=Object.keys(IMG), left=keys.length;
  keys.forEach(function(k){
    var im=new Image();
    im.onload=function(){ imgMap[k]=im; if(--left===0) draw(); };
    im.src=IMG[k];
  });

  wheelEngine={ spin:spinTo, redraw:draw, hitSector:hitSector };
  window.addEventListener('resize', function(){ /* 保持初始尺寸，简单处理 */ });
}

/* ---------- 存储工具 ---------- */
function today(){ var d=new Date(),m=d.getMonth()+1,dd=d.getDate(); return d.getFullYear()+'-'+(m<10?'0'+m:m)+'-'+(dd<10?'0'+dd:dd); }
function save(){ try{ localStorage.setItem(CONFIG.STORE.users, JSON.stringify(users)); }catch(e){} }
function loadUsers(){ try{ users=JSON.parse(localStorage.getItem(CONFIG.STORE.users))||{}; }catch(e){ users={}; } }
function getSession(){ return localStorage.getItem(CONFIG.STORE.session); }
function setSession(p){ localStorage.setItem(CONFIG.STORE.session,p); }
function clearSession(){ localStorage.removeItem(CONFIG.STORE.session); }
function getPending(){ try{ return JSON.parse(localStorage.getItem(CONFIG.STORE.pending)); }catch(e){ return null; } }
function savePending(phone,startAt){ try{ localStorage.setItem(CONFIG.STORE.pending,JSON.stringify({phone:phone,startAt:startAt})); }catch(e){} }
function clearPending(){ localStorage.removeItem(CONFIG.STORE.pending); }

/* ---------- DOM 快捷 ---------- */
function $(id){ return document.getElementById(id); }
function showScreen(id){ document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); }); $(id).classList.add('active'); }
function showOverlay(id){ $(id).classList.add('show'); }
function hideOverlay(id){ $(id).classList.remove('show'); }
function toast(msg){ var t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._tm); t._tm=setTimeout(function(){ t.classList.remove('show'); },2200); }

/* ---------- 判定中奖（返回轮盘槽位下标） ---------- */
function isSpecial(p){ return CONFIG.SPECIAL.indexOf(p)>=0; }
function isTest(p){ return p===CONFIG.TEST; }
function rollIndex(user, drawNo){
  var wPhone=0, w5=1, w10=1, wThanks=5;
  var eligible = isSpecial(user.phone) && drawNo>=CONFIG.PHONE_DRAW_START && !user.wonPhone;
  if(eligible) wPhone=1;
  var total=wPhone+w5+w10+wThanks, r=Math.random()*total;
  if(r<wPhone) return PHONE_IDX;
  if(r<wPhone+w5) return C5_IDX;
  if(r<wPhone+w5+w10) return C10_IDX;
  return THANKS_IDX[Math.floor(Math.random()*THANKS_IDX.length)];
}

/* ---------- 抽奖 ---------- */
function updateMainUI(){
  if(!cur) return;
  var u=cur;
  if(u.fwdDate!==today()){ u.fwdToday=0; u.fwdDate=today(); save(); }
  $('userSub').textContent='Hi，'+u.name;
  $('remain').textContent=u.times;
  $('cardTimes').textContent=u.times;
  $('cardFwd').textContent=u.fwdToday;
  var locked = u.wonPhone && !isTest(u.phone);
  var label=$('centerBtn').querySelector('.tap-label');
  if(locked){ label.textContent='已中手机'; $('centerBtn').style.opacity=.6; }
  else{ label.textContent='立即抽奖'; $('centerBtn').style.opacity=1; }
}
function doDraw(){
  if(!cur) return;
  if(spinning) return;
  if(cur.wonPhone && !isTest(cur.phone)){ toast('您已抽中手机，抽奖已结束'); return; }
  if(cur.times<=0){ showBanner('次数用完啦，分享给好友再获次数！'); return; }
  spinning=true;
  cur.times--; cur.totalDraws++;
  var drawNo=cur.totalDraws, idx=rollIndex(cur, drawNo);
  save();
  updateMainUI();
  wheelEngine.spin(idx);
  setTimeout(function(){ resolveDraw(idx); spinning=false; }, 4300);
}
function resolveDraw(idx){
  if(!cur) return;
  // 直接使用抽奖判定确定的槽位，保证弹窗与轮盘、加权结果严格一致（不再反推）
  if(idx===PHONE_IDX){ cur.wonPhone=true; save(); showPhoneWin(); }
  else if(idx===C5_IDX){ cur.c5++; save(); showCoupon('5元话费券'); }
  else if(idx===C10_IDX){ cur.c10++; save(); showCoupon('10元话费券'); }
  else { cur.thanks++; save(); showLose(); }
}
function showLose(){ showOverlay('loseOverlay'); }
function showCoupon(name){ $('couponSub').textContent='获得 '+name; showOverlay('couponOverlay'); }
function showPhoneWin(){ showOverlay('phoneOverlay'); burstFx($('phoneModal')); }

/* ---------- 转发 ---------- */
function startForward(){
  if(!cur) return;
  showOverlay('forwardOverlay');
  setCount(CONFIG.FORWARD_WAIT);
  $('fwdStatus').textContent='链接已复制，请前往分享…';
  savePending(cur.phone, Date.now());
  startCountdown();
}
function setCount(n){ $('fwdCount').textContent=Math.max(0,n); }
function startCountdown(){
  clearInterval(fwdTimer);
  fwdTimer=setInterval(function(){
    var p=getPending(); if(!p){ clearInterval(fwdTimer); return; }
    var left=Math.max(0, Math.ceil(CONFIG.FORWARD_WAIT-(Date.now()-p.startAt)/1000));
    setCount(left);
    if(left<=0){ clearInterval(fwdTimer); grantForward(); }
  },200);
}
function grantForward(){
  var p=getPending(); if(!p) return;
  var u=users[p.phone];
  if(!u){ clearPending(); hideOverlay('forwardOverlay'); return; }
  u.times++; u.forwardsTotal++; u.fwdToday++; u.fwdDate=today();
  save(); clearPending(); hideOverlay('forwardOverlay');
  if(cur && cur.phone===u.phone){ updateMainUI(); }
  toast('转发成功，获得 1 次抽奖机会');
}
function resumeForward(){
  var p=getPending(); if(!p) return;
  var u=users[p.phone]; if(!u){ clearPending(); return; }
  if(Date.now()-p.startAt >= CONFIG.FORWARD_WAIT*1000){ grantForward(); }
  else if(cur && cur.phone===p.phone){ showOverlay('forwardOverlay'); startCountdown(); }
}

/* ---------- 转发提醒条 ---------- */
function showBanner(msg){
  if($('fwd-banner')) $('fwd-banner').remove();
  var b=document.createElement('div'); b.id='fwd-banner'; b.className='fwd-banner';
  b.innerHTML='<i class="fa-solid fa-share-nodes"></i>'+msg;
  b.addEventListener('click',function(){ startForward(); hideBanner(); });
  document.body.appendChild(b);
  clearTimeout(bannerTimer);
  bannerTimer=setTimeout(hideBanner,6000);
}
function hideBanner(){ var b=$('fwd-banner'); if(b) b.remove(); }

/* ---------- 个人中心 ---------- */
function renderProfile(){
  if(!cur) return;
  $('pName').textContent=cur.name;
  $('pPhone').textContent=cur.phone;
  $('pTotalDraws').textContent=cur.totalDraws;
  $('pForwards').textContent=cur.forwardsTotal;
  $('pTimes').textContent=cur.times;
  var c=$('prizeContent'); c.innerHTML='';
  if(cur.wonPhone){
    var item=document.createElement('div'); item.className='prize-item';
    item.innerHTML='<div class="pi-img"><img src="'+IMG.phone+'"></div>'+
      '<div><div class="pt">vivo X200s 黑（12G+256G）</div>'+
      '<div class="ps">'+ (cur.address ? '收货信息已提交' : '待补充收货信息') +'</div></div>'+
      '<span class="tag wait">待收取</span>';
    c.appendChild(item);
  }
  if(cur.c5>0){
    var c5=document.createElement('div'); c5.className='prize-item';
    c5.innerHTML='<div class="pi-img"><img src="'+IMG.coupon5+'"></div><div><div class="pt">5元话费券</div></div><span class="tag">已中 ×'+cur.c5+'</span>';
    c.appendChild(c5);
  }
  if(cur.c10>0){
    var c10=document.createElement('div'); c10.className='prize-item';
    c10.innerHTML='<div class="pi-img"><img src="'+IMG.coupon10+'"></div><div><div class="pt">10元话费券</div></div><span class="tag">已中 ×'+cur.c10+'</span>';
    c.appendChild(c10);
  }
  if(!cur.wonPhone && cur.c5===0 && cur.c10===0){
    var np=document.createElement('div'); np.className='no-prize'; np.textContent='暂无奖品，快去抽奖吧～'; c.appendChild(np);
  }
}

/* ---------- 登录 ---------- */
function doLogin(){
  var name=$('loginName').value.trim(), phone=$('loginPhone').value.trim();
  if(!name){ toast('请输入姓名'); return; }
  if(phone.length!==11){ toast('手机号需为 11 位'); return; }
  var u=users[phone];
  if(!u){
    u={phone:phone,name:name,times:CONFIG.INIT_TIMES,totalDraws:0,wonPhone:false,address:null,
       forwardsTotal:0,fwdToday:0,fwdDate:today(),c5:0,c10:0,thanks:0};
    users[phone]=u;
  } else { u.name=name; }
  save(); setSession(phone); cur=u;
  enterMain();
  resumeForward();
}
function enterMain(){ showScreen('screen-main'); buildWheel(); updateMainUI(); renderProfile(); }
function goProfile(){ showScreen('screen-profile'); renderProfile(); }
function doLogout(){ clearSession(); cur=null; $('loginName').value=''; $('loginPhone').value=''; showScreen('screen-login'); }

/* ---------- 收货地址 ---------- */
function submitAddress(){
  var n=$('addrName').value.trim(), p=$('addrPhone').value.trim(), d=$('addrDetail').value.trim();
  if(!n || !p || !d){ toast('请填写完整收货信息'); return; }
  cur.address={name:n,phone:p,detail:d};
  save(); hideOverlay('addressOverlay'); toast('收货信息已保存');
  renderProfile();
}

/* ---------- 中手机特效 ---------- */
function burstFx(el){
  var colors=['#ffd700','#ffaa00','#fff3b0','#ff6b6b','#38bdf8','#34d399','#f472b6'];
  for(var i=0;i<36;i++){
    var b=document.createElement('div'); b.className='burst';
    b.style.background=colors[i%colors.length];
    b.style.left=(50+Math.random()*40-20)+'%'; b.style.top=(50+Math.random()*40-20)+'%';
    b.style.setProperty('--dx',(Math.random()*240-120)+'px'); b.style.setProperty('--dy',(Math.random()*240-120)+'px');
    el.appendChild(b);
    (function(x){ requestAnimationFrame(function(){ x.classList.add('go'); }); })(b);
    setTimeout(function(){ b.remove(); },1000);
  }
  for(var j=0;j<14;j++){
    var c=document.createElement('div'); c.className='confetti';
    c.style.background=colors[j%colors.length];
    c.style.setProperty('--fx',(Math.random()*280-140)+'px'); c.style.setProperty('--fy',(240+Math.random()*180)+'px');
    el.appendChild(c);
    (function(x){ requestAnimationFrame(function(){ x.classList.add('go'); }); })(c);
    setTimeout(function(){ c.remove(); },1100);
  }
}

/* ---------- 事件绑定 ---------- */
function bind(){
  $('loginBtn').addEventListener('click',doLogin);
  $('loginPhone').addEventListener('input',function(){ this.value=this.value.replace(/\D/g,''); });
  $('toProfile').addEventListener('click',goProfile);
  $('backMain').addEventListener('click',function(){ showScreen('screen-main'); });
  $('fwdBtn').addEventListener('click',startForward);
  $('centerBtn').addEventListener('click',doDraw);
  $('toAddressBtn').addEventListener('click',function(){ hideOverlay('phoneOverlay'); showOverlay('addressOverlay'); });
  $('addrSubmit').addEventListener('click',submitAddress);
  $('logoutBtn').addEventListener('click',doLogout);
  if(CONFIG.IS_DEV){ $('logoutBtn').style.display=''; }
  document.querySelectorAll('[data-close]').forEach(function(b){
    b.addEventListener('click',function(){ hideOverlay(b.getAttribute('data-close')); });
  });
  document.querySelector('#loseOverlay').querySelector('.ok').addEventListener('click',function(){
    if(Math.random()<0.45) setTimeout(function(){ showBanner('分享给好友，再获抽奖次数！'); },400);
  });
  var cb=$('centerBtn');
  cb.addEventListener('pointerdown',function(){ cb.classList.add('pressed'); });
  cb.addEventListener('pointerup',function(){ cb.classList.remove('pressed'); });
  cb.addEventListener('pointerleave',function(){ cb.classList.remove('pressed'); });
}

/* ---------- 启动 ---------- */
function init(){
  loadUsers(); bind();
  var phone=getSession();
  if(phone && users[phone]){ cur=users[phone]; enterMain(); }
  else{ showScreen('screen-login'); }
  resumeForward();
}
init();

})();
