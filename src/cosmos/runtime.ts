/** Self-contained renderer shared by the browser frame and native WebView. No network or storage access. */
export const spaceRuntime = String.raw`
(function(){
'use strict';
var initial=window.SPACE_INITIAL, data=initial.data, reduced=initial.reduced, active=true;
var canvas=document.getElementById('space'), ctx=canvas.getContext('2d',{alpha:false});
var $=function(id){return document.getElementById(id)};
var selected=data.lessons.find(function(t){return t.id===data.initialId})||data.lessons[0];
var grade=selected.grade, overview=false, free=false, disposed=false, interacted=false;
if(!ctx){$('error').style.display='block';$('error').textContent='Не удалось открыть космическую сцену. ';var fallback=document.createElement('button');fallback.textContent='Открыть уроки';fallback.onclick=function(){send({type:'navigate',id:'Learn'})};$('error').appendChild(fallback);return}
var width=innerWidth,height=innerHeight,dpr=1, focal=700, mobile=false, lastTime=0, frame=0, ticks=0;
var focus={x:selected.x,y:selected.y,z:selected.z}, aim={x:focus.x,y:focus.y,z:focus.z};
var orbit={yaw:-.12,pitch:.08,distance:710}, destination={yaw:-.12,pitch:.08,distance:710};
var keys={}, pointers=new Map(), drag=null, pinch=null, selectedSize={}, visibleStars=[];
var seenGrades={}, jumpTimer=null, glowCache=new Map();
var colors=[[255,221,184],[192,219,255],[218,211,255],[247,210,193],[205,232,226]];
function send(action){var message={source:'espada-space',action:action};if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message));else parent.postMessage(message,'*');}
function tellReady(){var message={source:'espada-space',type:'ready'};if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message));else parent.postMessage(message,'*');}
function random(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var rng=random(81723);
var field=Array.from({length:650},function(_,i){return{x:(rng()-.5)*16000,y:(rng()-.5)*11000,z:(rng()-.5)*16000,r:rng(),phase:rng()*6.28,color:i%9===0?'#b8d9e8':i%13===0?'#efd1a7':'#d9e1eb'}});
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function lerp(a,b,t){return a+(b-a)*t}
function hash(x,y,z,seed){var n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^seed;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295}
function noise(x,y,z,seed){var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);return lerp(lerp(lerp(hash(ix,iy,iz,seed),hash(ix+1,iy,iz,seed),fx),lerp(hash(ix,iy+1,iz,seed),hash(ix+1,iy+1,iz,seed),fx),fy),lerp(lerp(hash(ix,iy,iz+1,seed),hash(ix+1,iy,iz+1,seed),fx),lerp(hash(ix,iy+1,iz+1,seed),hash(ix+1,iy+1,iz+1,seed),fx),fy),fz)}
function fbm(x,y,z,seed){return noise(x,y,z,seed)*.52+noise(x*2.1,y*2.1,z*2.1,seed)*.28+noise(x*4.5,y*4.5,z*4.5,seed)*.14+noise(x*11,y*11,z*11,seed)*.06}
function glow(color){var key=color.join(',');if(glowCache.has(key))return glowCache.get(key);var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d'),r=g.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,'rgba('+key+',.8)');r.addColorStop(.13,'rgba('+key+',.28)');r.addColorStop(.32,'rgba('+key+',.09)');r.addColorStop(.65,'rgba('+key+',.025)');r.addColorStop(1,'rgba('+key+',0)');g.fillStyle=r;g.fillRect(0,0,256,256);glowCache.set(key,c);return c}
var nebula=document.createElement('canvas');nebula.width=900;nebula.height=650;
(function(){var c=nebula.getContext('2d'),im=c.createImageData(900,650);for(var y=0;y<650;y++)for(var x=0;x<900;x++){
 var u=x/900,v=y/650,n=fbm(u*3.5,v*3.5,2,541),n2=fbm(u*8,v*8,4,241),lane=Math.exp(-Math.pow((v-(.2+u*.5+(n-.5)*.4))*4.5,2));
 var strength=Math.pow(Math.max(0,n*.75+n2*.25-.30),1.4)*lane,cut=Math.pow(n2,1.8),i=(y*900+x)*4;
 im.data[i]=(22+95*u)*strength;im.data[i+1]=(54+20*u)*strength;im.data[i+2]=(81-5*u)*strength;im.data[i+3]=255;
 }c.putImageData(im,0,0);})();
var camera={x:0,y:0,z:0},axes={};
function cameraAxes(){var sy=Math.sin(orbit.yaw),cy=Math.cos(orbit.yaw),sp=Math.sin(orbit.pitch),cp=Math.cos(orbit.pitch);camera={x:focus.x+sy*cp*orbit.distance,y:focus.y+sp*orbit.distance,z:focus.z+cy*cp*orbit.distance};axes={rx:cy,rz:-sy,ux:-sy*sp,uy:cp,uz:-cy*sp,fx:-sy*cp,fy:-sp,fz:-cy*cp};}
function project(p){var x=p.x-camera.x,y=p.y-camera.y,z=p.z-camera.z,depth=x*axes.fx+y*axes.fy+z*axes.fz;if(depth<35)return null;var scale=focal*(overview&&mobile?1.8:1)/depth;return{x:width*(mobile?.42:.5)+(x*axes.rx+z*axes.rz)*scale,y:height*.43-(x*axes.ux+y*axes.uy+z*axes.uz)*scale,scale:scale,depth:depth};}
function resize(){width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;mobile=width<700;dpr=Math.min(devicePixelRatio||1,mobile?1.5:1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);focal=mobile?width*.82:Math.min(width*1.65,height)*1.08;draw(0);}
function pointInScreen(p,margin){return p&&p.x>-margin&&p.x<width+margin&&p.y>-margin&&p.y<height+margin}
function showError(){var e=$('error');e.textContent='';if(data.error){e.style.display='block';var t=document.createElement('span');t.textContent=data.error+' ';e.appendChild(t);var b=document.createElement('button');b.textContent='Повторить';b.onclick=function(){send({type:'retry',id:''})};e.appendChild(b)}else e.style.display='none'}
function currentTopics(){return data.lessons.filter(function(t){return t.grade===grade})}
function updateUI(){
 var topics=currentTopics(),index=topics.findIndex(function(t){return t.id===selected.id});
 document.body.classList.toggle('overview',overview);document.body.classList.toggle('free',free);
 $('lesson-number').textContent=(index+1)+' / '+topics.length+(selected.complete?' · Пройден':'');
 $('lesson-title').textContent=selected.title;
 $('launch').firstChild.textContent=!data.ready?'Загрузка ':selected.complete?'Открыть урок ':selected.started?'Продолжить ':'Начать урок ';
 $('launch').disabled=!data.ready;
 $('prev').disabled=index<=0;$('next').disabled=index>=topics.length-1;
 $('overview').textContent=overview?'Выбери класс':grade+' класс';
 $('overview').setAttribute('aria-label',overview?'Вернуться к уроку':'Выбрать класс');
 $('sr-status').textContent=selected.title+'. '+grade+' класс. '+(index+1)+' из '+topics.length;
 $('signals-toggle').style.display=data.signals.length?'block':'none';$('signals-toggle').textContent='Задания учителя · '+data.signals.length;
 $('more').classList.toggle('has-signals',data.signals.length>0);
 $('more').setAttribute('aria-label',data.signals.length?'Ещё, есть задания учителя':'Ещё');
 $('signal-items').textContent='';data.signals.forEach(function(s){var b=document.createElement('button');b.textContent=s.title;b.onclick=function(){$('signals').close();send({type:'topic',id:s.id})};$('signal-items').appendChild(b)});
 showError();
}
function setFree(){interacted=true;if(!free){free=true;updateUI()}}
function selectStar(star){interacted=true;selected=star;grade=star.grade;seenGrades[grade]=star.id;overview=false;free=false;aim={x:star.x,y:star.y,z:star.z};destination={yaw:-.12,pitch:.08,distance:mobile?650:710};if(reduced){focus={...aim};orbit={...destination}}updateUI();wake();}
function move(direction){var list=currentTopics(),index=list.findIndex(function(t){return t.id===selected.id}),next=list[clamp(index+direction,0,list.length-1)];if(next.id!==selected.id)selectStar(next)}
function chooseGrade(g){var t=data.lessons.find(function(t){return t.id===seenGrades[g]})||data.lessons.find(function(t){return t.grade===g&&!t.complete})||data.lessons.find(function(t){return t.grade===g});selectStar(t)}
function toggleOverview(){interacted=true;if(overview){selectStar(selected);return}overview=true;free=false;aim={x:400,y:0,z:-2400};destination={yaw:0,pitch:.12,distance:mobile?12200:7800};if(reduced){focus={...aim};orbit={...destination}}updateUI();wake()}
function launch(){if(!data.ready||jumpTimer)return;if(reduced){send({type:'lesson',id:selected.id});return}var id=selected.id;aim={x:selected.x,y:selected.y,z:selected.z};destination.distance=100;document.body.classList.add('jumping');jumpTimer=setTimeout(function(){send({type:'lesson',id:id});document.body.classList.remove('jumping');jumpTimer=null;destination.distance=mobile?650:710;},420)}
data.grades.forEach(function(g){var label=document.createElement('button');label.dataset.grade=g.grade;label.textContent=g.grade+' класс';label.setAttribute('aria-label','Выбрать '+g.grade+' класс');label.onclick=function(){chooseGrade(g.grade)};$('grade-labels').appendChild(label)});
$('prev').onclick=function(){move(-1)};$('next').onclick=function(){move(1)};$('launch').onclick=launch;$('reset').onclick=function(){selectStar(selected)};$('overview').onclick=toggleOverview;$('profile').onclick=function(){send({type:'navigate',id:'Profile'})};
$('more').onclick=function(){$('more-panel').showModal()};
$('signals-toggle').onclick=function(){$('more-panel').close();$('signals').showModal()};
$('help').onclick=function(){$('more-panel').close();$('help-panel').showModal()};
document.querySelectorAll('[data-navigate]').forEach(function(b){b.onclick=function(){$('more-panel').close();send({type:'navigate',id:b.dataset.navigate})}});
document.querySelectorAll('[data-close]').forEach(function(b){b.onclick=function(){$(b.dataset.close).close()}});
// Photometric stars: a small white core, a smooth bloom and restrained diffraction.
// No planet-like rim or noisy surface; deterministic tint and size keep each star distinct.
function drawSun(star,p,time){
 var amount=selectedSize[star.id]||0,base=2.2+(star.seed%9)*.20;
 var r=clamp((base+amount*(mobile?10:7))*p.scale,.65,26),col=colors[star.color],rgb=col.join(',');
 var emphasis=overview||star.grade===grade?1:.14;
 var pulse=reduced?1:1+.025*Math.sin(time*.0009+star.seed%31);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=emphasis;
 var halo=r*(8+amount*7)*pulse;ctx.drawImage(glow(col),p.x-halo,p.y-halo,halo*2,halo*2);
 var bloom=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3.8);
 bloom.addColorStop(0,'rgba(255,255,255,1)');bloom.addColorStop(.13,'rgba(255,250,241,.97)');bloom.addColorStop(.3,'rgba('+rgb+',.53)');bloom.addColorStop(.62,'rgba('+rgb+',.10)');bloom.addColorStop(1,'rgba('+rgb+',0)');
 ctx.fillStyle=bloom;ctx.beginPath();ctx.arc(p.x,p.y,r*3.8,0,Math.PI*2);ctx.fill();
 if(amount>.05){
  ctx.translate(p.x,p.y);ctx.rotate(.12+(star.seed%7)*.04);ctx.globalAlpha=emphasis*amount*.32;
  for(var axis=0;axis<2;axis++){var length=r*(axis?4:6);var ray=ctx.createLinearGradient(-length,0,length,0);ray.addColorStop(0,'rgba('+rgb+',0)');ray.addColorStop(.5,'rgba(255,250,240,.8)');ray.addColorStop(1,'rgba('+rgb+',0)');ctx.fillStyle=ray;ctx.fillRect(-length,-.5,length*2,1);ctx.rotate(Math.PI/2)}
 }
 ctx.restore();p.r=Math.max(r*2.5,6);
}
function draw(time){
 if(!ctx||!selected)return;cameraAxes();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#03060c';ctx.fillRect(0,0,width,height);
 // A distant dust lane moves more slowly than foreground objects, revealing depth.
 var dustW=width*1.45,dustH=height*1.65;ctx.globalAlpha=.38;ctx.drawImage(nebula,-width*.2-orbit.yaw*width*.15-focus.x*.014,-height*.3+orbit.pitch*height*.15+focus.y*.014,dustW,dustH);ctx.globalAlpha=1;
 for(var i=0;i<field.length;i++){var s=field[i],p=project(s);if(!pointInScreen(p,5))continue;var r=clamp(s.r*p.scale*1.4,.3,1.8),twinkle=reduced?1:.78+.22*Math.sin(time*.0006+s.phase);ctx.globalAlpha=clamp(.10+s.r*.25,.08,.35)*twinkle;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill();if(s.r>.98&&r>.7){ctx.globalAlpha=.12;ctx.fillRect(p.x-4,p.y-.3,8,.6);ctx.fillRect(p.x-.3,p.y-4,.6,8)}}ctx.globalAlpha=1;
 visibleStars=[];var placedLabels=[];
 data.grades.forEach(function(g){var list=data.lessons.filter(function(t){return t.grade===g.grade});for(var i=1;i<list.length;i++){var a=project(list[i-1]),b=project(list[i]);if(!a||!b||(!pointInScreen(a,500)&&!pointInScreen(b,500)))continue;ctx.strokeStyle=g.grade===grade&&!overview?'rgba(170,193,207,.22)':overview?'rgba(150,175,196,.16)':'rgba(150,175,196,.025)';ctx.lineWidth=g.grade===grade?.65:.45;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.setLineDash([]);
 var gl=$('grade-labels').querySelector('[data-grade="'+g.grade+'"]'),gp=project({x:g.x+700,y:g.y-140,z:g.z-180});if(overview&&pointInScreen(gp,50)){var lx=clamp(gp.x,70,width-70),ly=gp.y+12;for(var offset of [0,55,-55,110,-110,165,-165]){var candidate=clamp(gp.y+12+offset,130,height-100);if(!placedLabels.some(function(q){return Math.abs(q.x-lx)<120&&Math.abs(q.y-candidate)<52})){ly=candidate;break}}placedLabels.push({x:lx,y:ly});ctx.strokeStyle='#8fa3ba35';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(gp.x,gp.y);ctx.lineTo(lx,ly+10);ctx.stroke();gl.style.display='block';gl.style.left=lx+'px';gl.style.top=ly+'px'}else gl.style.display='none';
 });
 var sorted=data.lessons.map(function(s){return{s:s,p:project(s)}}).filter(function(v){return pointInScreen(v.p,240)}).sort(function(a,b){return b.p.depth-a.p.depth});
 sorted.forEach(function(v){drawSun(v.s,v.p,time);visibleStars.push({star:v.s,p:v.p})});
}

function animation(time){frame=0;if(!active||document.hidden||disposed)return;var dt=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;var speed=keys.Shift?650:220,travel=dt*speed;
 if(Object.keys(keys).some(function(k){return keys[k]&&'wasdqezc'.includes(k)})){
  var dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.e?1:0)-(keys.q?1:0),dz=(keys.w?1:0)-(keys.s?1:0);
  aim.x+=(axes.rx*dx+axes.fx*dz)*travel;aim.y+=(dy+axes.fy*dz)*travel;aim.z+=(axes.rz*dx+axes.fz*dz)*travel;setFree();
 }
 var smooth=reduced?1:1-Math.exp(-dt*5.5);focus.x=lerp(focus.x,aim.x,smooth);focus.y=lerp(focus.y,aim.y,smooth);focus.z=lerp(focus.z,aim.z,smooth);orbit.yaw=lerp(orbit.yaw,destination.yaw,smooth);orbit.pitch=lerp(orbit.pitch,destination.pitch,smooth);orbit.distance=lerp(orbit.distance,destination.distance,smooth);
 data.lessons.forEach(function(s){selectedSize[s.id]=lerp(selectedSize[s.id]||0,s.id===selected.id&&!overview?1:0,reduced?1:smooth)});
 draw(reduced?0:time);ticks++;frame=requestAnimationFrame(animation);
}
function wake(){if(!frame&&active&&!document.hidden&&!disposed){lastTime=performance.now();frame=requestAnimationFrame(animation)}}
function pause(){if(frame)cancelAnimationFrame(frame);frame=0;keys={};pointers.clear();drag=null;pinch=null;canvas.classList.remove('dragging')}
canvas.addEventListener('pointerdown',function(e){canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:0};else if(pointers.size===2){var a=Array.from(pointers.values());pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom:destination.distance};if(drag)drag.moved=99}canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',function(e){if(!pointers.has(e.pointerId)){canvas.style.cursor=visibleStars.some(function(v){return Math.hypot(v.p.x-e.clientX,v.p.y-e.clientY)<Math.max(22,v.p.r+8)})?'pointer':'grab';return}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){var a=Array.from(pointers.values()),distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);destination.distance=clamp(pinch.zoom*pinch.distance/Math.max(10,distance),200,13000);setFree();return}if(!drag||pointers.size!==1)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY));destination.yaw-=dx*.004;destination.pitch=clamp(destination.pitch+dy*.003,-1.3,1.3);drag.x=e.clientX;drag.y=e.clientY;if(drag.moved>5)setFree();wake()});
canvas.addEventListener('pointerup',function(e){if(drag&&drag.moved<6&&pointers.size===1){var hit=visibleStars.filter(function(v){return Math.hypot(v.p.x-e.clientX,v.p.y-e.clientY)<Math.max(22,v.p.r+8)}).sort(function(a,b){return a.p.depth-b.p.depth})[0];if(hit){if(hit.star.id===selected.id&&!overview){launch()}else selectStar(hit.star)}}pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;if(!pointers.size){drag=null;canvas.classList.remove('dragging')}else if(drag){var p=Array.from(pointers.values())[0];drag.x=p.x;drag.y=p.y;drag.moved=99}});
canvas.addEventListener('pointercancel',function(){pointers.clear();drag=null;pinch=null;canvas.classList.remove('dragging')});
canvas.addEventListener('wheel',function(e){e.preventDefault();destination.distance=clamp(destination.distance*Math.exp(e.deltaY*.0012),200,13000);setFree();wake()},{passive:false});
window.addEventListener('keydown',function(e){if(document.querySelector('dialog[open]'))return;if(e.key==='Tab')return;var k=e.key.length===1?e.key.toLowerCase():e.key;
 if(['ArrowRight','ArrowLeft','Home','End','w','a','s','d','q','e','r','Shift'].includes(k))e.preventDefault();
 if(k==='ArrowRight')move(1);else if(k==='ArrowLeft')move(-1);else if(k==='Home')selectStar(currentTopics()[0]);else if(k==='End'){var t=currentTopics();selectStar(t[t.length-1])}else if(k==='r')selectStar(selected);else if(k==='Escape'&&overview)selectStar(selected);else if(k==='Enter'&&e.target===canvas)launch();
 keys[k]=true;wake();
});window.addEventListener('keyup',function(e){keys[e.key.length===1?e.key.toLowerCase():e.key]=false});window.addEventListener('blur',function(){keys={};pointers.clear();drag=null;pinch=null});
window.addEventListener('message',function(event){var m=event.data;if(!m||m.source!=='espada-host'||(event.source&&event.source!==parent&&event.source!==window))return;if(m.data){var resume=!data.ready&&m.data.ready&&!interacted;data=m.data;selected=data.lessons.find(function(t){return t.id===(resume?data.initialId:selected.id)})||data.lessons[0];if(resume)selectStar(selected);else updateUI()}if(typeof m.reduced==='boolean')reduced=m.reduced;if(typeof m.active==='boolean')active=m.active;if(active)wake();else pause()});
var sizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;if(sizeObserver)sizeObserver.observe(canvas);
document.addEventListener('visibilitychange',function(){if(document.hidden)pause();else wake()});window.addEventListener('resize',resize);window.addEventListener('pagehide',function(){disposed=true;pause();if(sizeObserver)sizeObserver.disconnect();if(jumpTimer)clearTimeout(jumpTimer)});
selectedSize[selected.id]=1;updateUI();resize();wake();tellReady();
})();
`;
