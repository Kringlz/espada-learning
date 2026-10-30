import { progressRuntime } from "./progressView";
/** Self-contained renderer shared by the browser frame and native WebView. No network or storage access. */
export const spaceRuntime = String.raw`
(function(){
'use strict';
var initial=window.SPACE_INITIAL, data=initial.data, reduced=initial.reduced, active=true, dark=initial.dark!==false;
var canvas=document.getElementById('space'), ctx=canvas.getContext('2d',{alpha:false});
var focusCanvas=document.getElementById('focus-star'), focusCtx=focusCanvas.getContext('2d');
var $=function(id){return document.getElementById(id)};
var selected=data.lessons.find(function(t){return t.id===data.initialId})||data.lessons[0];
var grade=selected.grade, overview=false, free=false, disposed=false, interacted=false;
var preview=$('preview'), previewLesson=selected, previewReveal=0, previewDistance=710, restoreAfterOrbit=false, orbitIdle=0;
var previewCards=[$('preview-content'),$('preview-title')];
if(!ctx){$('error').style.display='block';$('error').textContent='Не удалось открыть космическую сцену. ';var fallback=document.createElement('button');fallback.textContent='Повторить';fallback.onclick=function(){location.reload()};$('error').appendChild(fallback);return}
var width=innerWidth,height=innerHeight,dpr=1, focal=700, mobile=false, lastTime=0, frame=0, ticks=0;
var focus={x:selected.x,y:selected.y,z:selected.z}, aim={x:focus.x,y:focus.y,z:focus.z};
var orbit={yaw:-.12,pitch:.08,distance:710}, destination={yaw:-.12,pitch:.08,distance:710};
var keys={}, pointers=new Map(), drag=null, pinch=null, selectedSize={}, visibleStars=[];
var seenGrades={}, jumpTimer=null, glowCache=new Map();
var colors=[[255,221,184],[192,219,255],[218,211,255],[247,210,193],[205,232,226]];
function send(action){var message={source:'espada-space',action:action};if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(message));else parent.postMessage(message,'*');}
function applyTheme(value,uri){dark=value;document.body.classList.toggle('light',!dark);document.body.classList.toggle('dark',dark);var button=$('theme-toggle');button.setAttribute('aria-label',dark?'Включить светлую тему':'Включить тёмную тему');button.title=button.getAttribute('aria-label');button.querySelector('svg').innerHTML=dark?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>':'<path d="M20.5 14a8.5 8.5 0 0 1-10.5-10.5A8.5 8.5 0 1 0 20.5 14Z"/>';if(typeof uri==='string')document.querySelector('.brand-icon img').src=uri;wake()}
function applySound(enabled){var b=$('sound-toggle');b.setAttribute('aria-pressed',String(enabled));b.setAttribute('aria-label',enabled?'Выключить звуки':'Включить звуки');b.title=b.getAttribute('aria-label');$('sound-waves').setAttribute('d',enabled?'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14':'M16 9l6 6M22 9l-6 6')}
$('sound-toggle').onclick=function(){send({type:'feedback',id:'toggle'})};
function feedback(name){send({type:'feedback',id:name})}
$('theme-toggle').onclick=function(){feedback('select');send({type:'theme',id:dark?'light':'dark'})};
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
 var u=x/900,v=y/650,n=fbm(u*3.5,v*3.5,2,541),n2=fbm(u*8,v*8,4,241),lane=Math.exp(-Math.pow((v-(.2+u*.5+(n-.5)*.4))*3.8,2));
 var strength=Math.pow(Math.max(0,n*.75+n2*.25-.30),1.2)*lane,cut=Math.pow(n2,1.8),i=(y*900+x)*4;
 im.data[i]=(120+80*u)*strength;im.data[i+1]=(55+22*u)*strength;im.data[i+2]=(190+50*u)*strength;im.data[i+3]=255;
 }c.putImageData(im,0,0);var soft=document.createElement('canvas');soft.width=900;soft.height=650;var sc=soft.getContext('2d');sc.filter='blur(28px)';sc.drawImage(nebula,0,0);c.clearRect(0,0,900,650);c.drawImage(soft,0,0);})();
var camera={x:0,y:0,z:0},axes={};
function cameraAxes(){var sy=Math.sin(orbit.yaw),cy=Math.cos(orbit.yaw),sp=Math.sin(orbit.pitch),cp=Math.cos(orbit.pitch);camera={x:focus.x+sy*cp*orbit.distance,y:focus.y+sp*orbit.distance,z:focus.z+cy*cp*orbit.distance};axes={rx:cy,rz:-sy,ux:-sy*sp,uy:cp,uz:-cy*sp,fx:-sy*cp,fy:-sp,fz:-cy*cp};}
function project(p){var x=p.x-camera.x,y=p.y-camera.y,z=p.z-camera.z,depth=x*axes.fx+y*axes.fy+z*axes.fz;if(depth<35)return null;var scale=focal*(overview&&mobile?1.8:1)/depth;return{x:width*.5+(x*axes.rx+z*axes.rz)*scale,y:height*(overview?.43:.5)-(x*axes.ux+y*axes.uy+z*axes.uz)*scale,scale:scale,depth:depth};}
function resize(){width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;mobile=width<700;dpr=Math.min(devicePixelRatio||1,mobile?1.5:1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);focusCanvas.width=canvas.width;focusCanvas.height=canvas.height;ctx.setTransform(dpr,0,0,dpr,0,0);focal=mobile?width*.82:Math.min(width*1.65,height)*1.08;draw(0);}
function pointInScreen(p,margin){return p&&p.x>-margin&&p.x<width+margin&&p.y>-margin&&p.y<height+margin}
function showError(){var e=$('error');e.textContent='';if(data.error){e.style.display='block';var t=document.createElement('span');t.textContent=data.error+' ';e.appendChild(t);var b=document.createElement('button');b.textContent='Повторить';b.onclick=function(){feedback('tap');send({type:'retry',id:''})};e.appendChild(b)}else e.style.display='none'}
function currentTopics(){return data.lessons.filter(function(t){return t.grade===grade})}
function updateUI(){
 var topics=currentTopics(),index=topics.findIndex(function(t){return t.id===selected.id});
 document.body.classList.toggle('preview',!overview&&!free);
 document.body.classList.toggle('overview',overview);document.body.classList.toggle('free',free);
 $('lesson-number').textContent=(index+1)+' / '+topics.length+(selected.complete?' · Пройден':selected.practicing?' · Практика продолжается':'');
 if(previewLesson.id===selected.id)paintPreview(selected);
 document.body.classList.toggle('lesson-complete',selected.complete);
 $('launch').firstChild.textContent=!data.ready?'Загрузка ':selected.complete?'Тренироваться ещё ':selected.started?'Продолжить ':'Открыть тему ';
 $('launch').disabled=!data.ready;
 var previous=adjacent(-1), next=adjacent(1);
 $('prev').disabled=!previous;$('next').disabled=!next;
 [-1,1].forEach(function(direction){var target=direction<0?previous:next,button=$(direction<0?'prev':'next'),boundary=target&&target.grade!==grade;
 button.classList.toggle('boundary',!!boundary);button.querySelector('span').textContent=boundary?target.grade+' класс':'';
 button.setAttribute('aria-label',boundary?(direction<0?'Предыдущий класс: ':'Следующий класс: ')+target.grade:(direction<0?'Предыдущая тема':'Следующая тема'));
 });
 $('overview').textContent=overview?'Классы':grade+' класс';
 $('overview').setAttribute('aria-label',overview?'Вернуться к уроку':'Выбрать класс');
 $('sr-status').textContent=selected.title+'. '+grade+' класс. '+(index+1)+' из '+topics.length+(selected.complete?'. Урок пройден.':'');
 showError();
 if(progressMode)renderProgress();
}
function paintPreview(star){
 previewLesson=star;
 $('lesson-title').textContent=star.title;
 $('formula-image').src=star.formulaImage;
 $('formula-image').alt='Основная формула: '+star.title;
 $('preview-topics').replaceChildren();star.topics.forEach(function(title){var li=document.createElement('li');li.textContent=title;$('preview-topics').appendChild(li)});
}
// Use the camera's actual depth: wheel/pinch and their easing stay in sync with the star.
// Cards remain mounted while leaving, and their content changes only after they fade out.
function animatePreview(dt){
 var point=project(previewLesson), changed=previewLesson.id!==selected.id;
 var depth=point?point.depth:13000, distance=depth/previewDistance;
 var target=progressMode||overview||free||jumpTimer||changed||!point?0:clamp((4-distance)/1.5,0,1);
 previewReveal=lerp(previewReveal,target,reduced?1:1-Math.exp(-dt*9));
 if(Math.abs(previewReveal-target)<.002)previewReveal=target;
 if(changed&&previewReveal<.015){paintPreview(selected);point=project(selected);depth=point?point.depth:13000;distance=depth/previewDistance;}
 var scale=clamp(Math.pow(1/Math.max(.1,distance),.75),.25,mobile||height<540?1.04:1.12);
 var x=point?clamp(point.x-width*.5,-width,width):0,y=point?clamp(point.y-height*.5,-height,height):0;
 preview.style.transform='translate3d('+x.toFixed(2)+'px,'+y.toFixed(2)+'px,0) scale('+scale.toFixed(4)+')';
 previewCards.forEach(function(card,index){
  var amount=index?previewReveal*previewReveal:previewReveal,hidden=amount<.002;
  card.style.setProperty('--reveal',amount.toFixed(4));
  card.style.visibility=hidden?'hidden':'visible';
  card.style.pointerEvents=target>.5&&amount>.9?'auto':'none';
 });
 preview.setAttribute('aria-hidden',String(target===0));
 preview.inert=target===0;
 document.body.classList.toggle('preview',!overview&&!free&&previewReveal>.02);
}
${progressRuntime}
function setFree(restorePreview){
 // Only an orbit around the selected star returns automatically; free flight stays free.
 restoreAfterOrbit=!!restorePreview&&!overview&&(!free||restoreAfterOrbit);
 orbitIdle=0;interacted=true;if(!free){free=true;updateUI()}
}
function selectStar(star,silent){if(!silent)feedback('select');restoreAfterOrbit=false;interacted=true;selected=star;grade=star.grade;seenGrades[grade]=star.id;overview=false;free=false;aim={x:star.x,y:star.y,z:star.z};destination={yaw:-.12,pitch:.08,distance:mobile?650:710};previewDistance=destination.distance;if(reduced){focus={...aim};orbit={...destination}}updateUI();wake();}
function adjacent(direction){var list=currentTopics(),index=list.findIndex(function(t){return t.id===selected.id});if(list[index+direction])return list[index+direction];var targetGrade=grade+direction;if(targetGrade<5||targetGrade>11)return null;var target=data.lessons.filter(function(t){return t.grade===targetGrade});return (direction>0?target[0]:target[target.length-1])||null}
function move(direction){var next=adjacent(direction);if(next)selectStar(next)}
function chooseGrade(g){var t=data.lessons.find(function(t){return t.id===seenGrades[g]})||data.lessons.find(function(t){return t.grade===g&&!t.complete})||data.lessons.find(function(t){return t.grade===g});selectStar(t)}
function toggleOverview(){restoreAfterOrbit=false;interacted=true;feedback(overview?'collapse':'expand');if(overview){selectStar(selected,true);return}overview=true;free=false;aim={x:400,y:0,z:-2400};destination={yaw:0,pitch:.12,distance:mobile?12200:7800};if(reduced){focus={...aim};orbit={...destination}}updateUI();wake()}
function launch(){if(!data.ready||jumpTimer)return;feedback('navigate');if(reduced){send({type:'lesson',id:selected.id});return}var id=selected.id;aim={x:selected.x,y:selected.y,z:selected.z};destination.distance=100;document.body.classList.add('jumping');jumpTimer=setTimeout(function(){send({type:'lesson',id:id});document.body.classList.remove('jumping');jumpTimer=null;destination.distance=mobile?650:710;},420)}
data.grades.forEach(function(g){var label=document.createElement('button');label.dataset.grade=g.grade;label.textContent=g.grade+' класс';label.setAttribute('aria-label','Выбрать '+g.grade+' класс');label.onclick=function(){chooseGrade(g.grade)};$('grade-labels').appendChild(label)});
$('prev').onclick=function(){move(-1)};$('next').onclick=function(){move(1)};$('launch').onclick=launch;$('reset').onclick=function(){selectStar(selected)};$('overview').onclick=toggleOverview;$('profile').onclick=function(){send({type:'navigate',id:'Profile'})};
document.querySelectorAll('[data-navigate]').forEach(function(b){b.onclick=function(){send({type:'navigate',id:b.dataset.navigate})}});
function normalizeSearch(s){return s.toLocaleLowerCase('ru').replace(/ё/g,'е').trim()}
function closeSearch(){ $('search-results').hidden=true;$('lesson-search').setAttribute('aria-expanded','false'); }
function searchLessons(){var query=normalizeSearch($('lesson-search').value);$('clear-search').hidden=!query;var box=$('search-results');box.replaceChildren();if(!query){closeSearch();return}var words=query.split(/\s+/),matches=data.lessons.filter(function(t){var text=normalizeSearch(t.searchText+' '+t.title+' '+t.id);return words.every(function(w){return text.includes(w)})});box.hidden=false;$('lesson-search').setAttribute('aria-expanded','true');if(!matches.length){var empty=document.createElement('div');empty.id='search-empty';empty.textContent='Ничего не найдено. Попробуй другое слово или номер класса.';box.appendChild(empty)}matches.forEach(function(t){var b=document.createElement('button');b.textContent=t.title;var meta=document.createElement('small');meta.textContent=t.grade+' класс · '+t.exercises+' заданий';b.appendChild(meta);b.onclick=function(){selectStar(t);closeSearch();$('lesson-search').blur();$('launch').focus()};box.appendChild(b)})}
$('lesson-search').addEventListener('input',searchLessons);$('lesson-search').addEventListener('focus',searchLessons);
$('clear-search').onclick=function(){feedback('collapse');$('lesson-search').value='';searchLessons();$('lesson-search').focus()};
$('lesson-search').addEventListener('keydown',function(e){if(e.key==='Escape'){closeSearch();$('lesson-search').blur();canvas.focus()}else if(e.key==='ArrowDown'){e.preventDefault();var first=$('search-results').querySelector('button');if(first)first.focus()}else if(e.key==='Enter'){var first=$('search-results').querySelector('button');if(first){e.preventDefault();first.click()}}});
$('search-results').addEventListener('keydown',function(e){var buttons=Array.from(this.querySelectorAll('button')),i=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();var next=buttons[i+(e.key==='ArrowDown'?1:-1)];if(next)next.focus();else if(e.key==='ArrowUp')$('lesson-search').focus()}if(e.key==='Escape'){$('lesson-search').focus();closeSearch()}});
document.addEventListener('pointerdown',function(e){if(!e.target.closest('.search'))closeSearch()});
// Photometric stars: a small white core, a smooth bloom and restrained diffraction.
// No planet-like rim or noisy surface; deterministic tint and size keep each star distinct.
function drawSun(star,p,time){
 var amount=selectedSize[star.id]||0,base=2.2+(star.seed%9)*.20;
 var r=clamp((base+amount*(mobile?10:7))*p.scale,.65,26),col=star.complete?[80,255,205]:colors[star.color],rgb=col.join(',');
 var emphasis=overview||star.grade===grade?1:star.complete?.5:.14;
 var pulse=reduced?1:1+.025*Math.sin(time*.0009+star.seed%31);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=emphasis;
 var halo=r*(star.complete?14+amount*6:8+amount*7)*pulse;ctx.drawImage(glow(col),p.x-halo,p.y-halo,halo*2,halo*2);
 var bloom=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3.8);
 bloom.addColorStop(0,'rgba(255,255,255,1)');bloom.addColorStop(.13,'rgba(255,250,241,.97)');bloom.addColorStop(.3,'rgba('+rgb+',.53)');bloom.addColorStop(.62,'rgba('+rgb+',.10)');bloom.addColorStop(1,'rgba('+rgb+',0)');
 ctx.fillStyle=bloom;ctx.beginPath();ctx.arc(p.x,p.y,r*3.8,0,Math.PI*2);ctx.fill();
 if(star.complete){ctx.strokeStyle='rgba(99,255,207,.65)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(8,r*2.8),0,Math.PI*2);ctx.stroke();}
 if(amount>.05){
  ctx.translate(p.x,p.y);ctx.rotate(.12+(star.seed%7)*.04);ctx.globalAlpha=emphasis*amount*.32;
  for(var axis=0;axis<2;axis++){var length=r*(axis?4:6);var ray=ctx.createLinearGradient(-length,0,length,0);ray.addColorStop(0,'rgba('+rgb+',0)');ray.addColorStop(.5,'rgba(255,250,240,.8)');ray.addColorStop(1,'rgba('+rgb+',0)');ctx.fillStyle=ray;ctx.fillRect(-length,-.5,length*2,1);ctx.rotate(Math.PI/2)}
 }
 ctx.restore();p.r=Math.max(r*2.5,6);
}
function draw(time){
 if(!ctx||!selected)return;cameraAxes();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#080613';ctx.fillRect(0,0,width,height);
 // A distant dust lane moves more slowly than foreground objects, revealing depth.
 var haze=ctx.createRadialGradient(width*.64,height*.35,0,width*.64,height*.35,width*.8);haze.addColorStop(0,'rgba(116,59,181,.24)');haze.addColorStop(1,'rgba(20,10,40,0)');ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);
 var dustW=width*1.45,dustH=height*1.65;ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.72;ctx.drawImage(nebula,-width*.2-orbit.yaw*width*.15-focus.x*.014,-height*.3+orbit.pitch*height*.15+focus.y*.014,dustW,dustH);ctx.restore();
 for(var i=0;i<field.length;i++){var s=field[i],p=project(s);if(!pointInScreen(p,5))continue;var r=clamp(s.r*p.scale*1.4,.3,1.8),twinkle=reduced?1:.78+.22*Math.sin(time*.0006+s.phase);ctx.globalAlpha=clamp(.10+s.r*.25,.08,.35)*twinkle;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,7);ctx.fill();if(s.r>.98&&r>.7){ctx.globalAlpha=.12;ctx.fillRect(p.x-4,p.y-.3,8,.6);ctx.fillRect(p.x-.3,p.y-4,.6,8)}}ctx.globalAlpha=1;
 visibleStars=[];var placedLabels=[];
 data.grades.forEach(function(g){var list=data.lessons.filter(function(t){return t.grade===g.grade});for(var i=1;i<list.length;i++){var a=project(list[i-1]),b=project(list[i]);if(!a||!b||(!pointInScreen(a,500)&&!pointInScreen(b,500)))continue;ctx.strokeStyle=g.grade===grade&&!overview?'rgba(170,193,207,.22)':overview?'rgba(150,175,196,.16)':'rgba(150,175,196,.025)';ctx.lineWidth=g.grade===grade?.65:.45;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.setLineDash([]);
 var gl=$('grade-labels').querySelector('[data-grade="'+g.grade+'"]'),gp=project({x:g.x+700,y:g.y-140,z:g.z-180});if(overview&&pointInScreen(gp,50)){var lx=clamp(gp.x,70,width-70),ly=gp.y+12;for(var offset of [0,55,-55,110,-110,165,-165]){var candidate=clamp(gp.y+12+offset,130,height-100);if(!placedLabels.some(function(q){return Math.abs(q.x-lx)<120&&Math.abs(q.y-candidate)<52})){ly=candidate;break}}placedLabels.push({x:lx,y:ly});ctx.strokeStyle='#8fa3ba35';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(gp.x,gp.y);ctx.lineTo(lx,ly+10);ctx.stroke();gl.style.display='block';gl.style.left=lx+'px';gl.style.top=ly+'px'}else gl.style.display='none';
 });
 var sorted=data.lessons.map(function(s){return{s:s,p:project(s)}}).filter(function(v){return pointInScreen(v.p,240)}).sort(function(a,b){return b.p.depth-a.p.depth});
 sorted.forEach(function(v){if(overview||free||v.s.id!==selected.id)drawSun(v.s,v.p,time);visibleStars.push({star:v.s,p:v.p})});
 if(focusCtx){focusCtx.setTransform(dpr,0,0,dpr,0,0);focusCtx.clearRect(0,0,width,height);if(!overview&&!free){var focused=sorted.find(function(v){return v.s.id===selected.id}),point=focused&&focused.p;if(point){var background=ctx;ctx=focusCtx;drawSun(selected,point,time);ctx=background;}}}
}

function animation(time){frame=0;if(!active||document.hidden||disposed)return;var dt=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;var speed=keys.Shift?650:220,travel=dt*speed;
 if(Object.keys(keys).some(function(k){return keys[k]&&'wasdqezc'.includes(k)})){
  var dx=(keys.d?1:0)-(keys.a?1:0),dy=(keys.e?1:0)-(keys.q?1:0),dz=(keys.w?1:0)-(keys.s?1:0);
  aim.x+=(axes.rx*dx+axes.fx*dz)*travel;aim.y+=(dy+axes.fy*dz)*travel;aim.z+=(axes.rz*dx+axes.fz*dz)*travel;setFree();
 }
 var smooth=reduced?1:1-Math.exp(-dt*5.5);focus.x=lerp(focus.x,aim.x,smooth);focus.y=lerp(focus.y,aim.y,smooth);focus.z=lerp(focus.z,aim.z,smooth);orbit.yaw=lerp(orbit.yaw,destination.yaw,smooth);orbit.pitch=lerp(orbit.pitch,destination.pitch,smooth);orbit.distance=lerp(orbit.distance,destination.distance,smooth);
 // Wait for the released gesture and camera easing, then reveal at the current angle/zoom.
 if(restoreAfterOrbit&&!pointers.size&&!overview){
  orbitIdle+=dt;
  if(orbitIdle>.25&&Math.abs(orbit.yaw-destination.yaw)+Math.abs(orbit.pitch-destination.pitch)<.015){restoreAfterOrbit=false;free=false;updateUI();}
 }
 data.lessons.forEach(function(s){selectedSize[s.id]=lerp(selectedSize[s.id]||0,s.id===selected.id&&!overview?1:0,reduced?1:smooth)});
 draw(reduced?0:time);animatePreview(dt);ticks++;frame=requestAnimationFrame(animation);
}
function wake(){if(!frame&&active&&!document.hidden&&!disposed){lastTime=performance.now();frame=requestAnimationFrame(animation)}}
function pause(){stopProgressMotion();if(frame)cancelAnimationFrame(frame);frame=0;keys={};pointers.clear();drag=null;pinch=null;canvas.classList.remove('dragging')}
canvas.addEventListener('pointerdown',function(e){orbitIdle=0;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:0};else if(pointers.size===2){var a=Array.from(pointers.values());pinch={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom:destination.distance};if(drag)drag.moved=99}canvas.classList.add('dragging')});
canvas.addEventListener('pointermove',function(e){if(!pointers.has(e.pointerId)){canvas.style.cursor=visibleStars.some(function(v){return Math.hypot(v.p.x-e.clientX,v.p.y-e.clientY)<Math.max(22,v.p.r+8)})?'pointer':'grab';return}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){var a=Array.from(pointers.values()),distance=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);destination.distance=clamp(pinch.zoom*pinch.distance/Math.max(10,distance),200,13000);interacted=true;wake();return}if(!drag||pointers.size!==1)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY));destination.yaw-=dx*.004;destination.pitch=clamp(destination.pitch+dy*.003,-1.3,1.3);drag.x=e.clientX;drag.y=e.clientY;if(drag.moved>5)setFree(true);wake()});
canvas.addEventListener('pointerup',function(e){if(drag&&drag.moved<6&&pointers.size===1){var hit=visibleStars.filter(function(v){return Math.hypot(v.p.x-e.clientX,v.p.y-e.clientY)<Math.max(22,v.p.r+8)}).sort(function(a,b){return a.p.depth-b.p.depth})[0];if(hit){if(hit.star.id===selected.id&&!overview){launch()}else selectStar(hit.star)}}pointers.delete(e.pointerId);if(pointers.size<2)pinch=null;if(!pointers.size){drag=null;canvas.classList.remove('dragging')}else if(drag){var p=Array.from(pointers.values())[0];drag.x=p.x;drag.y=p.y;drag.moved=99}});
canvas.addEventListener('pointercancel',function(){pointers.clear();drag=null;pinch=null;canvas.classList.remove('dragging')});
canvas.addEventListener('wheel',function(e){e.preventDefault();destination.distance=clamp(destination.distance*Math.exp(e.deltaY*.0012),200,13000);interacted=true;wake()},{passive:false});
window.addEventListener('keydown',function(e){if(e.key==='Tab'||progressMode||$('space-sheet').open||e.target.closest('.search, #space-switch'))return;var k=e.key.length===1?e.key.toLowerCase():e.key;
 if(['ArrowRight','ArrowLeft','Home','End','w','a','s','d','q','e','r','Shift'].includes(k))e.preventDefault();
 if(k==='ArrowRight')move(1);else if(k==='ArrowLeft')move(-1);else if(k==='Home')selectStar(currentTopics()[0]);else if(k==='End'){var t=currentTopics();selectStar(t[t.length-1])}else if(k==='r')selectStar(selected);else if(k==='Escape'&&overview)selectStar(selected);else if(k==='Enter'&&e.target===canvas)launch();
 keys[k]=true;wake();
});window.addEventListener('keyup',function(e){keys[e.key.length===1?e.key.toLowerCase():e.key]=false});window.addEventListener('blur',function(){keys={};pointers.clear();drag=null;pinch=null});
window.addEventListener('message',function(event){var m=event.data;if(!m||m.source!=='espada-host'||(event.source&&event.source!==parent&&event.source!==window))return;if(m.data){var resume=!data.ready&&m.data.ready&&!interacted;data=m.data;selected=data.lessons.find(function(t){return t.id===(resume?data.initialId:selected.id)})||data.lessons[0];grade=selected.grade;if(resume)selectStar(selected,true);else updateUI()}if(typeof m.soundEnabled==='boolean')applySound(m.soundEnabled);if(typeof m.dark==='boolean')applyTheme(m.dark,m.brandUri);if(typeof m.reduced==='boolean'){reduced=m.reduced;if(reduced)stopProgressMotion()}if(typeof m.active==='boolean')active=m.active;if(active)wake();else pause()});
var sizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;if(sizeObserver)sizeObserver.observe(canvas);
document.addEventListener('visibilitychange',function(){if(document.hidden)pause();else wake()});window.addEventListener('resize',resize);window.addEventListener('pagehide',function(){disposed=true;pause();if(sizeObserver)sizeObserver.disconnect();if(jumpTimer)clearTimeout(jumpTimer)});
applySound(initial.soundEnabled!==false);applyTheme(dark,initial.brandUri);selectedSize[selected.id]=1;updateUI();resize();wake();tellReady();
})();
`;
