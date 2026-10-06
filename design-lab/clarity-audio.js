// Original, quiet Web Audio sound design. No requests, autoplay, or voice synthesis.
const clarityAudio={effects:false,music:false,volume:.3,context:null,master:null,timer:null,nextBeat:0,beat:0,nodes:new Set(),error:''};
function clarityTone(frequency,when,length,gain=.15,type='sine'){
 const a=clarityAudio;if(!a.context||a.context.state!=='running')return;
 const oscillator=a.context.createOscillator(),envelope=a.context.createGain();
 oscillator.type=type;oscillator.frequency.value=frequency;
 envelope.gain.setValueAtTime(0,when);envelope.gain.linearRampToValueAtTime(gain,when+.025);envelope.gain.exponentialRampToValueAtTime(.0001,when+length);
 oscillator.connect(envelope);envelope.connect(a.master);a.nodes.add(oscillator);
 oscillator.onended=()=>{a.nodes.delete(oscillator);oscillator.disconnect();envelope.disconnect()};
 oscillator.start(when);oscillator.stop(when+length+.03);
}
async function clarityEnableAudio(){
 const a=clarityAudio;try{
  const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('unsupported');
  if(!a.context){a.context=new Context();a.master=a.context.createGain();a.master.gain.value=a.volume;a.master.connect(a.context.destination);a.context.addEventListener('statechange',clarityRefreshAudio)}
  await a.context.resume();if(a.context.state!=='running')throw new Error('suspended');a.error='';return true;
 }catch{a.error='Звук пока недоступен. Попробуй включить его ещё раз.';return false}
}
function clarityStopAudio(){const a=clarityAudio;clearInterval(a.timer);a.timer=null;a.nodes.forEach(n=>{try{n.stop()}catch{}});a.nodes.clear()}
function claritySyncAudio(){
 const a=clarityAudio,play=['i','j','l','m'].includes(variant)&&a.music&&!(['l','m'].includes(variant)&&screen==='lesson'&&referenceLessonMode==='video')&&!document.hidden&&a.context?.state==='running';
 if(!play){if(a.timer||!['i','j','l','m'].includes(variant)||document.hidden)clarityStopAudio();return}if(a.timer)return;
 a.nextBeat=a.context.currentTime+.12;a.beat=0;
 // A slow pentatonic kalimba phrase above soft sustained fifths, at 75 bpm.
 const melody=[523.25,0,659.25,587.33,0,440,0,392,440,0,587.33,659.25,0,523.25,0,0];
 const schedule=()=>{if(document.hidden||!['i','j','l','m'].includes(variant)||!a.music){clarityStopAudio();return}while(a.nextBeat<a.context.currentTime+.3){const i=a.beat%melody.length;if(melody[i])clarityTone(melody[i],a.nextBeat,1.6,.10);if(i%8===0){const root=i===0?130.81:110;clarityTone(root,a.nextBeat,5.8,.055);clarityTone(root*1.5,a.nextBeat,5.8,.03)}a.nextBeat+=.8;a.beat++}};
 schedule();a.timer=setInterval(schedule,180);
}
function clarityRefreshAudio(){
 const a=clarityAudio,root=document.querySelector('.i-audio');if(!root)return;
 root.dataset.audioState=a.context?.state||'off';
 root.querySelector('.i-audio-icon').innerHTML=clarityIcon(a.effects||a.music?'sound':'muted');
 root.querySelector('[data-action="clarity-effects"]').setAttribute('aria-pressed',String(a.effects));
 root.querySelector('[data-action="clarity-music"]').setAttribute('aria-pressed',String(a.music));
 const status=root.querySelector('#i-audio-status');
 status.textContent=a.error||(a.volume===0?'Громкость на нуле.':a.music&&a.context?.state==='running'?'Играет тихая музыка.':a.music?'Музыка на паузе.':a.effects?'Звуки нажатий включены.':'Сейчас всё тихо.');
}
async function clarityToggleAudio(key){const a=clarityAudio;if(!a[key]&&!await clarityEnableAudio()){clarityRefreshAudio();return}a[key]=!a[key];claritySyncAudio();if(key==='effects'&&a.effects)clarityTone(659.25,a.context.currentTime,.2,.16);clarityRefreshAudio()}
document.addEventListener('input',event=>{if(event.target.id!=='i-volume')return;const a=clarityAudio;a.volume=Number(event.target.value)/100;document.getElementById('i-volume-value').textContent=Math.round(a.volume*100)+'%';if(a.master)a.master.gain.setTargetAtTime(a.volume,a.context.currentTime,.04);clarityRefreshAudio()});
// Capture before a screen re-render so the click's selected answer is still available.
document.addEventListener('click',event=>{
 const a=clarityAudio;if(!['i','j','l','m'].includes(variant)||!a.effects||document.hidden)return;const b=event.target.closest('button, .i-contents a, .i-reveal summary');if(!b||b.disabled||b.dataset.action?.startsWith('clarity-music')||b.dataset.action?.startsWith('clarity-effects'))return;
 if(a.context?.state!=='running'){a.context?.resume().catch(()=>{});return}
 const now=a.context.currentTime;if(b.dataset.action==='check'&&choice!==null){if(choice===activeQuestion().correct){[523.25,659.25,783.99].forEach((f,i)=>clarityTone(f,now+i*.1,.45,.12))}else{clarityTone(392,now,.3,.1);clarityTone(349.23,now+.14,.4,.08)}}else clarityTone(587.33,now,.10,.09);
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clarityStopAudio();clarityAudio.context?.suspend().catch(()=>{})}else if(['i','j','l','m'].includes(variant)&&(clarityAudio.music||clarityAudio.effects)){clarityAudio.context?.resume().then(()=>{claritySyncAudio();clarityRefreshAudio()}).catch(()=>{})}});
window.addEventListener('pagehide',()=>{clarityStopAudio();clarityAudio.context?.suspend().catch(()=>{})});
