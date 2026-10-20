begin;
-- Answers and clocks stay on the server. Clients only receive a redacted snapshot.
create table public.arena_rooms (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes on delete cascade,
 host_id uuid not null references public.profiles on delete cascade,
 code text not null unique,
 topic text not null check(topic in ('arithmetic','percent','equations')),
 questions jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 starts_at timestamptz,
 cancelled boolean not null default false
);
create table public.arena_players (
 room_id uuid not null references public.arena_rooms on delete cascade,
 student_id uuid not null references public.profiles on delete cascade,
 primary key(room_id,student_id)
);
create table public.arena_answers (
 room_id uuid not null,
 student_id uuid not null,
 round integer not null check(round between 0 and 9),
 choice integer not null check(choice between 0 and 3),
 points integer not null check(points between 0 and 500),
 correct boolean not null,
 received_at timestamptz not null default clock_timestamp(),
 primary key(room_id,student_id,round),
 foreign key(room_id,student_id) references public.arena_players on delete cascade
);
create index arena_rooms_class on public.arena_rooms(class_id);
create index arena_answers_student on public.arena_answers(student_id);
alter table public.arena_rooms enable row level security;
alter table public.arena_players enable row level security;
alter table public.arena_answers enable row level security;
revoke all on public.arena_rooms,public.arena_players,public.arena_answers from public,anon,authenticated;

create function public.arena_member(p_class uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(public.current_role()='admin' or (public.current_role() in ('student','teacher') and exists(
 select 1 from public.class_memberships where class_id=p_class and profile_id=auth.uid())),false)
$$;

create function public.arena_snapshot(p_room uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.arena_rooms; stamp timestamptz:=clock_timestamp(); n integer; phase text; q jsonb; roster jsonb; mine jsonb;
begin
 select * into r from public.arena_rooms where id=p_room;
 if r.id is null or not public.arena_member(r.class_id) then raise exception 'Комната недоступна для вашего аккаунта.'; end if;
 if r.cancelled or (r.starts_at is null and stamp>r.created_at+interval '30 minutes') then phase:='closed';
 elsif r.starts_at is null then phase:='lobby';
 elsif stamp<r.starts_at then phase:='countdown';
 elsif stamp>=r.starts_at+interval '180 seconds' then phase:='finished';
 else
  n:=floor(extract(epoch from stamp-r.starts_at)/18)::integer;
  phase:=case when stamp<r.starts_at+make_interval(secs=>n*18+15) then 'question' else 'reveal' end;
  q:=r.questions->n;
  if phase='question' then q:=q-'answer'-'explanation'; end if;
 end if;
 -- During a question, don't disclose anybody's correctness through score changes.
 select coalesce(jsonb_agg(to_jsonb(rows) order by rows.points desc,rows.name,rows.id),'[]'::jsonb) into roster from (
  select p.id,p.name,coalesce(sum(a.points) filter(where phase='finished' or a.round<n or (phase='reveal' and a.round=n)),0)::integer points
  from public.arena_players ap join public.profiles p on p.id=ap.student_id
  left join public.arena_answers a on a.room_id=ap.room_id and a.student_id=ap.student_id
  where ap.room_id=r.id and p.active and exists(select 1 from public.class_memberships m where m.class_id=r.class_id and m.profile_id=p.id)
  group by p.id,p.name
 ) rows;
 select jsonb_build_object('choice',choice,'points',case when phase='reveal' then points else null end,'correct',case when phase='reveal' then correct else null end)
 into mine from public.arena_answers where room_id=r.id and student_id=auth.uid() and round=n;
 return jsonb_build_object('id',r.id,'code',r.code,'classId',r.class_id,'hostId',r.host_id,'topic',r.topic,
 'phase',phase,'serverNow',stamp,'startsAt',r.starts_at,'round',n,'question',q,'players',roster,'myAnswer',mine,
 'deadline',case when n is not null then r.starts_at+make_interval(secs=>n*18+15) else r.starts_at end,
 'nextAt',case when n is not null then r.starts_at+make_interval(secs=>(n+1)*18) else r.starts_at end,
 'review',case when phase='finished' then (select coalesce(jsonb_agg(jsonb_build_object('prompt',x->>'prompt','choices',x->'choices','answer',x->'answer','explanation',x->>'explanation','choice',a.choice,'points',coalesce(a.points,0)) order by ord),'[]'::jsonb)
 from jsonb_array_elements(r.questions) with ordinality qs(x,ord) left join public.arena_answers a on a.room_id=r.id and a.student_id=auth.uid() and a.round=ord-1) else null end);
end $$;

create function public.arena_create(p_class uuid,p_topic text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare room uuid; code_value text; qs jsonb:='[]'; a integer; b integer; result integer; correct_at integer; opts jsonb; prompt text; explanation text; i integer; j integer;
begin
 if not public.arena_member(p_class) then raise exception 'Нет доступа к группе.'; end if;
 if p_topic is null or p_topic not in ('arithmetic','percent','equations') then raise exception 'Выберите тему.'; end if;
 -- Serialize create/retry per host, so a lost acknowledgement cannot create duplicate rooms.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,10));
 select id into room from public.arena_rooms where host_id=auth.uid() and class_id=p_class and not cancelled
 and ((starts_at is null and created_at>clock_timestamp()-interval '30 minutes') or starts_at+interval '180 seconds'>clock_timestamp()) order by created_at desc limit 1;
 if room is not null then return public.arena_snapshot(room); end if;
 for i in 0..9 loop
  a:=2+floor(random()*18)::integer; b:=2+floor(random()*10)::integer;
  if p_topic='percent' then
   a:=a*20; b:=(1+floor(random()*9)::integer)*5; result:=a*b/100;
   prompt:=b||'% от '||a; explanation:=a||' × '||b||' ÷ 100 = '||result;
  elsif p_topic='equations' then
   result:=b; prompt:=a||'x + '||(i+3)||' = '||(a*b+i+3)||'. Найди x';
   explanation:='x = ('||(a*b+i+3)||' − '||(i+3)||') ÷ '||a||' = '||result;
  elsif i%4=0 then result:=a+b; prompt:=a||' + '||b; explanation:=prompt||' = '||result;
  elsif i%4=1 then result:=a*b; prompt:=a||' × '||b; explanation:=prompt||' = '||result;
  elsif i%4=2 then result:=a-b; prompt:=a||' − '||b; explanation:=prompt||' = '||result;
  else result:=a; prompt:=(a*b)||' ÷ '||b; explanation:=prompt||' = '||result;
  end if;
  correct_at:=floor(random()*4)::integer; opts:='[]';
  for j in 0..3 loop opts:=opts||jsonb_build_array((result+(j-correct_at)*(1+i%3))::text); end loop;
  qs:=qs||jsonb_build_array(jsonb_build_object('prompt',prompt,'choices',opts,'answer',correct_at,'explanation',explanation));
 end loop;
 loop
  code_value:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  begin
   insert into public.arena_rooms(class_id,host_id,code,topic,questions) values(p_class,auth.uid(),code_value,p_topic,qs) returning id into room;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 if public.current_role()='student' then insert into public.arena_players values(room,auth.uid()); end if;
 return public.arena_snapshot(room);
end $$;

create function public.arena_join(p_code text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.arena_rooms;
begin
 if public.current_role() is distinct from 'student' then raise exception 'В игре участвуют ученики.'; end if;
 select * into r from public.arena_rooms where code=upper(trim(p_code)) for update;
 if r.id is null or not public.arena_member(r.class_id) then raise exception 'Проверь код комнаты и свою группу.'; end if;
 if r.cancelled or (r.starts_at is null and clock_timestamp()>r.created_at+interval '30 minutes') then raise exception 'Комната закрыта. Создайте новую.'; end if;
 if exists(select 1 from public.arena_players where room_id=r.id and student_id=auth.uid()) then return public.arena_snapshot(r.id); end if;
 if r.starts_at is not null then raise exception 'Игра уже началась. Присоединяйся к следующей.'; end if;
 if (select count(*) from public.arena_players where room_id=r.id)>=40 then raise exception 'В комнате уже 40 участников.'; end if;
 insert into public.arena_players values(r.id,auth.uid());
 return public.arena_snapshot(r.id);
end $$;

create function public.arena_start(p_room uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.arena_rooms;
begin
 select * into r from public.arena_rooms where id=p_room for update;
 if r.id is null or r.host_id<>auth.uid() or not public.arena_member(r.class_id) then raise exception 'Начать игру может ведущий комнаты.'; end if;
 if r.starts_at is not null then return public.arena_snapshot(r.id); end if;
 if r.cancelled or clock_timestamp()>r.created_at+interval '30 minutes' then raise exception 'Комната закрыта.'; end if;
 if (select count(*) from public.arena_players ap join public.profiles p on p.id=ap.student_id and p.active join public.class_memberships m on m.profile_id=p.id and m.class_id=r.class_id where room_id=r.id)<2 then raise exception 'Нужны хотя бы два ученика.'; end if;
 update public.arena_rooms set starts_at=clock_timestamp()+interval '5 seconds' where id=r.id;
 return public.arena_snapshot(r.id);
end $$;

create function public.arena_answer(p_room uuid,p_round integer,p_choice integer) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.arena_rooms; stamp timestamptz; elapsed numeric; correct_value boolean; score integer;
begin
 select * into r from public.arena_rooms where id=p_room;
 if r.id is null or public.current_role() is distinct from 'student' or not public.arena_member(r.class_id) then raise exception 'Нет доступа к игре.'; end if;
 -- Per-participant lock; one student's slow request does not block the entire room.
 perform 1 from public.arena_players where room_id=r.id and student_id=auth.uid() for update;
 if not found then raise exception 'Сначала присоединись к комнате.'; end if;
 if exists(select 1 from public.arena_answers where room_id=r.id and student_id=auth.uid() and round=p_round) then return public.arena_snapshot(r.id); end if;
 stamp:=clock_timestamp();
 if r.cancelled or r.starts_at is null or p_round is null or p_round not between 0 and 9 or p_choice is null or p_choice not between 0 and 3 then raise exception 'Недопустимый ответ.'; end if;
 elapsed:=extract(epoch from stamp-(r.starts_at+make_interval(secs=>p_round*18)));
 if elapsed<0 or elapsed>=15 then raise exception 'Время этого вопроса истекло. Дождись следующего.'; end if;
 correct_value:=p_choice=(r.questions->p_round->>'answer')::integer;
 score:=case when correct_value then 100+floor(400*(1-elapsed/15))::integer else 0 end;
 insert into public.arena_answers values(r.id,auth.uid(),p_round,p_choice,score,correct_value,stamp);
 return public.arena_snapshot(r.id);
end $$;

create function public.arena_cancel(p_room uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.arena_rooms;
begin
 select * into r from public.arena_rooms where id=p_room for update;
 if r.id is null or r.host_id<>auth.uid() or not public.arena_member(r.class_id) then raise exception 'Нет доступа к комнате.'; end if;
 if r.starts_at is not null then raise exception 'Игра уже идёт и завершится автоматически.'; end if;
 update public.arena_rooms set cancelled=true where id=r.id;
 return public.arena_snapshot(r.id);
end $$;

create function public.arena_leaderboard(p_class uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.arena_member(p_class) then raise exception 'Рейтинг доступен только участникам группы и её преподавателям.'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(ranked) order by ranked.rank,ranked.name,ranked.id),'[]'::jsonb) from (
 select totals.*,rank() over(order by points desc)::integer rank from (
 select p.id,p.name,coalesce(sum(a.points),0)::integer points,count(distinct a.room_id)::integer games
 from public.class_memberships m join public.profiles p on p.id=m.profile_id and p.role='student' and p.active
 left join public.arena_answers a on a.student_id=p.id and exists(select 1 from public.arena_rooms r where r.id=a.room_id and r.class_id=p_class and not r.cancelled and r.starts_at+interval '180 seconds'<=clock_timestamp())
 where m.class_id=p_class group by p.id,p.name
 ) totals) ranked);
end $$;

revoke all on function public.arena_member(uuid),public.arena_snapshot(uuid),public.arena_create(uuid,text),public.arena_join(text),public.arena_start(uuid),public.arena_answer(uuid,integer,integer),public.arena_cancel(uuid),public.arena_leaderboard(uuid) from public,anon;
grant execute on function public.arena_snapshot(uuid),public.arena_create(uuid,text),public.arena_join(text),public.arena_start(uuid),public.arena_answer(uuid,integer,integer),public.arena_cancel(uuid),public.arena_leaderboard(uuid) to authenticated;
commit;
