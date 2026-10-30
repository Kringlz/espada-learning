export const classroomMarkup = `
<section id="classroom-screen" role="tabpanel" aria-labelledby="tab-classroom" aria-hidden="true" inert>
 <div class="progress-wrap">
 <header class="progress-heading"><h1>Класс</h1></header>
 <div id="classroom-group" class="topic-chips"></div>
 <div id="classroom-status" class="quiet-empty" role="status"></div>
 <div id="classroom-content">
  <section><div class="card-heading"><h2>Группа</h2></div><div id="classroom-roster"></div></section>
  <section><div class="card-heading"><h2>Расписание</h2><button id="classroom-refresh">Обновить</button></div><div id="classroom-schedule"></div></section>
  <section><div class="card-heading"><h2>Обсуждение</h2><button id="classroom-older">Ранее</button></div><div id="classroom-messages"></div>
   <form id="classroom-form"><label class="sr-only" for="classroom-message">Сообщение</label><textarea id="classroom-message" class="interest-search" rows="3" maxlength="2000" placeholder="Сообщение"></textarea><button id="classroom-send" class="topic-chip" type="button">Отправить</button></form>
  </section>
  <section><div class="card-heading"><h2>Лига недели</h2></div><div id="classroom-leaders"></div></section>
 </div>

 </div>
</section>`;
export const classroomStyles = `
#classroom-screen [hidden]{display:none!important}
#classroom-status:empty{display:none}
#classroom-screen{position:absolute;z-index:7;inset:80px 0 74px;overflow-y:auto;overscroll-behavior:contain;opacity:0;visibility:hidden;transform:translate3d(30px,0,0);transition:opacity .38s,transform .48s cubic-bezier(.22,1,.36,1),visibility .48s;scrollbar-width:thin;background:linear-gradient(90deg,#090c1860,transparent 30%,transparent 70%,#090c1860)}
body.classroom-view #classroom-screen{visibility:visible;opacity:1;transform:translate3d(0,0,0)}body.classroom-view #progress-screen{visibility:hidden;opacity:0;pointer-events:none}
body.classroom-view .switch-thumb{transform:translateX(200%)}
#classroom-content{display:grid;gap:48px}#classroom-content[hidden]{display:none}#classroom-roster{display:grid;gap:12px;font-size:14px;line-height:1.6;color:#b5c5d6}
.classroom-row{padding:16px 0;border-bottom:1px solid #e0e8ff1c;display:grid;gap:8px;font-size:14px;line-height:1.6;overflow-wrap:anywhere}.classroom-row p{margin:0;white-space:pre-wrap}.classroom-row small{color:#98a6bc;font-size:12px}.classroom-row a{color:#c3e3d1}.classroom-self{color:#c3e3d1}#classroom-group button[aria-pressed=true]{color:#f4f8fc;border-bottom-color:#c3e3d1}
#classroom-leaders .recent-row{grid-template-columns:minmax(0,1fr) auto;gap:24px}#classroom-leaders .recent-row>span:first-child{text-align:left}#classroom-leaders .recent-row>span:last-child{white-space:nowrap}
#classroom-form{display:grid;gap:8px;margin-top:20px}#classroom-form button{justify-self:end}#classroom-message{resize:vertical;min-height:80px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:800px){#classroom-screen{top:72px}#classroom-content{gap:38px}}@media(max-height:540px){#classroom-screen{top:56px;bottom:66px}}@media(prefers-reduced-motion:reduce){#classroom-screen{transition:none}}
`;
export const classroomRuntime = String.raw`
var classSent=0,classGroup='';
function classAction(id,value){send({type:'classroom',id:id,value:value})}
function classDate(at){return new Date(at).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZoneName:'short'})}
function renderClassroom(){
 var c=data.classroom;if(!c)return;
 var changed=classGroup!==c.selected;
 if(changed){classGroup=c.selected;classSent=c.sent;$('classroom-message').value='';}
 if(c.sent!==classSent){classSent=c.sent;$('classroom-message').value='';}
 var picker=$('classroom-group');picker.hidden=!c.groups.length;picker.replaceChildren();c.groups.forEach(function(g){var b=button(g.name,function(){classAction('select',g.id)},'topic-chip');b.setAttribute('aria-pressed',String(g.id===c.selected));picker.appendChild(b)});
 $('classroom-content').hidden=!c.selected;
 $('classroom-status').textContent=c.error||c.linkError||(c.loading&&!c.data?'Загрузка…':!c.selected?'Учебной группы пока нет.':'');
 var roster=$('classroom-roster'),schedule=$('classroom-schedule'),messages=$('classroom-messages'),leaders=$('classroom-leaders');
 roster.replaceChildren();schedule.replaceChildren();messages.replaceChildren();leaders.replaceChildren();
 if(c.data){
  var teachers=c.data.members.filter(function(m){return m.role==='teacher'||m.role==='admin'}),students=c.data.members.filter(function(m){return m.role==='student'});
  roster.appendChild(node('div','',teachers.length?'Преподаватель: '+teachers.map(function(m){return m.name}).join(', '):'Преподаватель не указан.'));
  roster.appendChild(node('div','',students.length?'Участники: '+students.map(function(m){return m.name}).join(', '):'Участников пока нет.'));
  if(c.schedule)schedule.appendChild(node('p','quiet-empty',c.schedule));
  var next=c.data.sessions.find(function(s){return !s.cancelled&&Date.parse(s.starts_at)>=Date.now()});
  if(next)roster.appendChild(node('div','', 'Ближайшее занятие: '+classDate(next.starts_at)+(next.topic?' · '+next.topic:'')));
  c.data.sessions.forEach(function(s){var row=node('article','classroom-row');row.appendChild(node('div','',classDate(s.starts_at)+(s.cancelled?' · Отменено':s.previous_starts_at?' · Перенесено':'')));if(s.previous_starts_at)row.appendChild(node('small','', 'Было: '+classDate(s.previous_starts_at)));if(s.topic)row.appendChild(node('p','',s.topic));if(s.location)row.appendChild(node('p','',s.location));if(s.meeting_url&&!s.cancelled){try{var url=new URL(s.meeting_url);if(url.protocol==='https:'){var link=node('a','','Онлайн-занятие ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.onclick=function(e){e.preventDefault();classAction('meeting',s.id)};row.appendChild(link)}}catch(e){}}schedule.appendChild(row)});
  if(!c.data.sessions.length)schedule.appendChild(node('p','quiet-empty','Ближайших занятий нет.'));
  c.data.messages.forEach(function(m){var row=node('article','classroom-row'+(m.author_id===c.actorId?' classroom-self':''));row.appendChild(node('small','',m.author_name+' · '+classDate(m.created_at)));row.appendChild(node('p','',m.body));messages.appendChild(row)});
  if(!c.data.messages.length)messages.appendChild(node('p','quiet-empty','Сообщений пока нет.'));
 }
 $('classroom-older').hidden=!c.hasOlder;$('classroom-older').disabled=c.loading;
 $('classroom-send').disabled=c.busy||!c.data;$('classroom-send').textContent=c.busy?'Отправляем…':'Отправить';
 if(c.boardError||c.boardLoading)leaders.appendChild(node('p','quiet-empty',c.boardError||'Загрузка…'));
 else if(!c.leaders.length)leaders.appendChild(node('p','quiet-empty','Результатов пока нет.'));
 else c.leaders.forEach(function(p){var row=node('div','recent-row'+(p.id===c.actorId?' classroom-self':''));row.appendChild(node('span','',p.rank+'. '+p.name+(p.id===c.actorId?' · ты':'')));row.appendChild(node('span','',p.points+' очк.'));leaders.appendChild(row)});

}
$('classroom-send').onclick=function(){var value=$('classroom-message').value.trim();if(value&&!$('classroom-send').disabled){$('classroom-send').disabled=true;classAction('send',value)}};
$('classroom-refresh').onclick=function(){classAction('refresh')};$('classroom-older').onclick=function(){classAction('older')};
`;
