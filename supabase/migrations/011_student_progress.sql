begin;
-- Reuse the established profile, group membership and verified family-link authorization.
create table public.progress_banks(topic_id text, version integer, title text not null, bank jsonb not null, primary key(topic_id,version));
create table public.progress_observation(student_id uuid primary key references public.profiles on delete cascade, since timestamptz not null default now());
create table public.progress_runs(student_id uuid references public.profiles on delete cascade, id text, topic_id text not null, version integer not null, revision integer not null, run jsonb not null, correct integer, total integer not null, question_ids jsonb not null, archived boolean not null default false, primary key(student_id,id), foreign key(topic_id,version) references public.progress_banks);
create table public.progress_events(student_id uuid references public.profiles on delete cascade, id text, at timestamptz not null, topic_id text not null, kind text not null check(kind in ('video','practice','independent','initial','revisited')), seconds integer not null check(seconds between 0 and 60), completed integer not null default 0, correct integer not null default 0, primary key(student_id,id), check(correct between 0 and completed));
create index progress_events_period on public.progress_events(student_id,at);
create table public.progress_goals(student_id uuid primary key references public.profiles on delete cascade, payload jsonb not null);
create table public.school_works(id uuid primary key, student_id uuid not null references public.profiles on delete cascade, author_id uuid not null references public.profiles, payload jsonb not null, deleted boolean not null default false);
create index school_works_student on public.school_works(student_id);
create table public.progress_audit(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles on delete cascade,entity_id text not null,at timestamptz not null default now(),actor_id uuid not null references public.profiles,before_value jsonb,after_value jsonb);
create table public.progress_receipts(actor_id uuid references public.profiles on delete cascade,id text,payload jsonb not null,primary key(actor_id,id));
alter table public.progress_banks enable row level security;
alter table public.progress_observation enable row level security;
alter table public.progress_runs enable row level security;
alter table public.progress_events enable row level security;
alter table public.progress_goals enable row level security;
alter table public.school_works enable row level security;
alter table public.progress_audit enable row level security;
alter table public.progress_receipts enable row level security;
create policy progress_observation_read on public.progress_observation for select to authenticated using(public.can_access_student(student_id));
create policy progress_runs_read on public.progress_runs for select to authenticated using(public.can_access_student(student_id));
create policy progress_events_read on public.progress_events for select to authenticated using(public.can_access_student(student_id));
create policy progress_goals_read on public.progress_goals for select to authenticated using(public.can_access_student(student_id));
create policy school_works_read on public.school_works for select to authenticated using(public.can_access_student(student_id));
create policy progress_audit_read on public.progress_audit for select to authenticated using(public.can_access_student(student_id));
grant select on public.progress_observation,public.progress_runs,public.progress_events,public.progress_goals,public.school_works,public.progress_audit to authenticated;

create function public.progress_read(p_student uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.can_access_student(p_student) then raise exception 'Нет доступа к ученику.'; end if;
 return jsonb_build_object(
 'observedSince',(select since from progress_observation where student_id=p_student),
 'runs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'topicId',topic_id,'version',version,'revision',revision,'run',run,'correct',correct,'total',total,'questionIds',question_ids,'archived',archived)) from progress_runs where student_id=p_student),'[]'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',id,'at',at,'topicId',topic_id,'kind',kind,'seconds',seconds,'completed',completed,'correct',correct)) from progress_events where student_id=p_student),'[]'),
 'goal',(select payload from progress_goals where student_id=p_student),
 'works',coalesce((select jsonb_agg(payload order by payload->>'date' desc) from school_works where student_id=p_student and not deleted),'[]'),
 'legacy',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.lesson_snapshot->>'title','at',a.submitted_at,'correct',a.score,'total',10,'source','Серверный тест')) from lesson_attempts a where a.student_id=p_student and a.status='submitted'),'[]') ||
 coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',t.content->>'title','at',a.payload->>'at','correct',(select count(*) from jsonb_array_elements(a.payload->'answers') x join jsonb_array_elements(t.content->'checks') q on q->>'id'=x->>'questionId' where x->'choice'=q->'answer' and x->'assisted'='false'::jsonb),'total',jsonb_array_length(a.payload->'answers'),'source','Самостоятельная проверка')) from attempts a join topics t on t.id=a.topic_id where a.student_id=p_student),'[]'),
 'audit',coalesce((select jsonb_agg(jsonb_build_object('entityId',a.entity_id,'at',a.at,'actorName',p.name,'before',a.before_value,'after',a.after_value) order by a.at desc) from progress_audit a join profiles p on p.id=a.actor_id where a.student_id=p_student),'[]'));
end $$;

create function public.progress_command(p_command jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); role_name text:=public.current_role(); target uuid:=(p_command->>'studentId')::uuid;
 kind text:=p_command->>'type'; request_id text:=p_command->>'requestId'; item jsonb:=p_command->'item'; old jsonb; receipt jsonb;
 saved progress_runs; bank jsonb; q jsonb; answer jsonb; section text; n integer:=0; right_n integer:=0; total_n integer:=0; rev integer; at_time timestamptz; stamp text:=to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); event_kind text; entity text; done integer:=0; correct_n integer:=0; source_name text; attachment text;
begin
 if role_name is null or target is null or not public.can_access_student(target) or not exists(select 1 from profiles where id=target and role='student' and active) then raise exception 'Нет доступа к ученику.'; end if;
 if request_id is null or length(request_id) not between 1 and 200 or octet_length(p_command::text)>200000 then raise exception 'Некорректный пакет.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target::text,11));
 select payload into receipt from progress_receipts where actor_id=actor and id=request_id;
 if found then
  if receipt is distinct from p_command then raise exception 'Ключ запроса уже использован.'; end if;
  return jsonb_build_object('saved',true);
 end if;
 if kind='begin' then
  if role_name<>'student' or target<>actor then raise exception 'Только ученик начинает наблюдение.'; end if;
  if p_command->'item'->>'at' is null or (p_command->'item'->>'at')::timestamptz>now()+interval '5 minutes' then raise exception 'Проверьте часы устройства.'; end if;
  insert into progress_observation(student_id,since) values(actor,(p_command->'item'->>'at')::timestamptz) on conflict do nothing;
 elsif kind='run' then
  if role_name<>'student' or target<>actor then raise exception 'Только собственные ответы.'; end if;
  entity:=item->>'id'; rev:=(item->>'revision')::integer;
  if entity is null or length(entity) not between 1 and 160 or rev is null or rev<1 then raise exception 'Некорректная попытка.'; end if;
  select * into saved from progress_runs where student_id=actor and id=entity;
  if saved.id is not null and (saved.run->>'finishedAt' is not null or rev<>saved.revision+1) then raise exception 'Попытка уже завершена или изменена на другом устройстве. Обновите урок.'; end if;
  if saved.id is not null and (saved.topic_id is distinct from item->>'topicId' or saved.version is distinct from (item->>'version')::int or saved.run->>'startedAt' is distinct from item->'run'->>'startedAt') then raise exception 'Нельзя изменить тему, версию или начало попытки.'; end if;
  select b.bank into bank from progress_banks b where b.topic_id=item->>'topicId' and b.version=(item->>'version')::integer;
  if bank is null then raise exception 'Версия заданий не установлена на сервере.'; end if;
  if item->'run'->>'id' is distinct from entity or coalesce(item->'run'->>'lessonId','G08-02') is distinct from item->>'topicId' or coalesce((item->'run'->>'contentVersion')::int,1) is distinct from (item->>'version')::int then raise exception 'Неверная версия попытки.'; end if;
  if item->'run'->>'startedAt' is null or (item->'run'->>'startedAt')::timestamptz>now()+interval '5 minutes' then raise exception 'Проверьте часы устройства.'; end if;
  foreach section in array array['practice','check'] loop
   if jsonb_typeof(item->'run'->section) is distinct from 'object' then raise exception 'Некорректные ответы.'; end if;
   for q in select value from jsonb_array_elements(bank->section) loop
    answer:=item->'run'->section->(q->>'id');
    if answer is not null and (jsonb_typeof(answer->'choice') is distinct from 'number' or (answer->>'choice')::numeric<>trunc((answer->>'choice')::numeric) or (answer->>'choice')::int<0 or (answer->>'choice')::int>=jsonb_array_length(q->'choices')) then raise exception 'Некорректный ответ.'; end if;
    if section='check' then total_n:=total_n+1; if answer is not null then n:=n+1; end if; if answer->'choice'=q->'correct' then right_n:=right_n+1; end if; end if;
   end loop;
   if exists(select 1 from jsonb_object_keys(item->'run'->section) x where not exists(select 1 from jsonb_array_elements(bank->section) z where z->>'id'=x)) then raise exception 'Неизвестное задание.'; end if;
  end loop;
  foreach section in array array['initial','revisited'] loop
   answer:=item->'run'->section;
   if answer is not null and (jsonb_typeof(answer->'choice') is distinct from 'number' or (answer->>'choice')::numeric<>trunc((answer->>'choice')::numeric) or (answer->>'choice')::int<0 or (answer->>'choice')::int>=jsonb_array_length(bank->'opening'->'choices')) then raise exception 'Некорректный вступительный ответ.'; end if;
   if saved.run->section is not null and saved.run->section is distinct from answer then raise exception 'Ранее отправленный ответ нельзя изменить.'; end if;
  end loop;
  if jsonb_typeof(item->'run'->'hints') is distinct from 'object' then raise exception 'Некорректные подсказки.'; end if;
  for q in select value from jsonb_array_elements(bank->'practice') loop
   if saved.run->'practice'->(q->>'id') is not null and saved.run->'practice'->(q->>'id') is distinct from item->'run'->'practice'->(q->>'id') then raise exception 'Ответ тренировки уже сохранён.'; end if;
   if item->'run'->'hints'->(q->>'id') is not null and (jsonb_typeof(item->'run'->'hints'->(q->>'id'))<>'number' or (item->'run'->'hints'->>(q->>'id'))::numeric<>trunc((item->'run'->'hints'->>(q->>'id'))::numeric) or (item->'run'->'hints'->>(q->>'id'))::int not between 0 and jsonb_array_length(q->'hints')) then raise exception 'Некорректное число подсказок.'; end if;
   if coalesce((item->'run'->'hints'->>(q->>'id'))::int,0)<coalesce((saved.run->'hints'->>(q->>'id'))::int,0) then raise exception 'Использование подсказки нельзя отменить.'; end if;
  end loop;
  if exists(select 1 from jsonb_object_keys(item->'run'->'hints') x where not exists(select 1 from jsonb_array_elements(bank->'practice') z where z->>'id'=x)) then raise exception 'Неизвестная подсказка.'; end if;
  if item->'run'->>'finishedAt' is not null and ((item->'run'->>'finishedAt')::timestamptz<(item->'run'->>'startedAt')::timestamptz or (item->'run'->>'finishedAt')::timestamptz>now()+interval '5 minutes' or item->'run'->>'stage'<>'result') then raise exception 'Некорректная дата завершения.'; end if;
  insert into progress_runs values(actor,entity,item->>'topicId',(item->>'version')::integer,rev,item->'run',case when item->'run'->>'finishedAt' is not null then right_n end,total_n,(select jsonb_agg(z->>'id' order by z->>'id') from jsonb_array_elements(bank->'check') z),coalesce((item->>'archived')::boolean,false))
  on conflict(student_id,id) do update set revision=excluded.revision,run=excluded.run,correct=excluded.correct;
  if p_command->'event' is not null and p_command->'event'<>'null'::jsonb and not coalesce((item->>'archived')::boolean,false) then
   at_time:=(p_command->'event'->>'at')::timestamptz; event_kind:=p_command->'event'->>'kind';
   if at_time is null or at_time>now()+interval '5 minutes' or at_time<(select since from progress_observation where student_id=actor)-interval '1 minute' or not exists(select 1 from progress_observation where student_id=actor) then raise exception 'Период наблюдения не начат или часы устройства неверны.'; end if;
   if event_kind='independent' and item->'run'->>'finishedAt' is not null then done:=n; correct_n:=right_n;
   elsif event_kind='practice' then done:=(select count(*) from jsonb_object_keys(item->'run'->'practice') x where saved.run->'practice'->x is null);
   elsif event_kind='initial' and saved.run->'initial' is null and item->'run'->'initial' is not null then done:=1;
   elsif event_kind='revisited' and saved.run->'revisited' is null and item->'run'->'revisited' is not null then done:=1;
   end if;
   insert into progress_events values(actor,request_id,at_time,item->>'topicId',event_kind,(p_command->'event'->>'seconds')::integer,done,correct_n);
  end if;
 elsif kind in ('work','deleteWork','goal') then
  if role_name not in ('parent','teacher','admin') then raise exception 'Требуется доступ взрослого.'; end if;
  if kind='goal' then
   select payload into old from progress_goals where student_id=target;
   if coalesce((old->>'revision')::int,0) is distinct from (p_command->>'expectedRevision')::int then raise exception 'Цель уже изменена. Обновите экран.'; end if;
   if item->'days'<>'null'::jsonb and ((item->>'days')::numeric<>trunc((item->>'days')::numeric) or (item->>'days')::int not between 1 and 7) then raise exception 'Цель — от 1 до 7 дней.'; end if;
   item:=jsonb_build_object('days',item->'days','authorId',actor,'authorName',(select name from profiles where id=actor),'revision',coalesce((old->>'revision')::int,0)+1,'updatedAt',stamp);
   insert into progress_goals values(target,item) on conflict(student_id) do update set payload=excluded.payload;
   entity:='goal';
  else
   entity:=item->>'id'; select payload into old from school_works where id=entity::uuid;
   if old is not null and (old->>'studentId'<>target::text or (old->>'authorId'<>actor::text and role_name<>'admin')) then raise exception 'Исправлять может автор или администратор.'; end if;
   if coalesce((old->>'revision')::int,0) is distinct from (p_command->>'expectedRevision')::int then raise exception 'Работа уже изменена. Обновите экран.'; end if;
   if kind='deleteWork' then
    if old is null then raise exception 'Работа не найдена.'; end if;
    item:=old||jsonb_build_object('deleted',true,'revision',(old->>'revision')::int+1,'updatedAt',stamp);
    update school_works set deleted=true,payload=item where id=entity::uuid;
   else
    if coalesce(length(trim(item->>'title')),0) not between 1 and 160 or coalesce(length(trim(item->>'subject')),0) not between 1 and 100 or coalesce(length(trim(item->>'kind')),0) not between 1 and 100 or length(coalesce(item->>'note',''))>500 or jsonb_typeof(item->'topics') is distinct from 'array' or jsonb_array_length(item->'topics') not between 1 and 12 or exists(select 1 from jsonb_array_elements_text(item->'topics') t where length(trim(t)) not between 1 and 160) then raise exception 'Заполните название, предмет, тип и темы.'; end if;
    if item->>'date' is null or item->>'date' !~ '^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date>(now() at time zone 'Asia/Bishkek')::date then raise exception 'Проверьте дату.'; end if;
    if item->>'scale' is null or item->>'scale' not in ('points','grade') or jsonb_typeof(item->'score') is distinct from 'number' or jsonb_typeof(item->'maximum') is distinct from 'number' or jsonb_typeof(item->'minimum') is distinct from 'number' or (item->>'maximum')::numeric<=0 or (item->>'minimum')::numeric<0 or (item->>'minimum')::numeric>=(item->>'maximum')::numeric or (item->>'score')::numeric not between (item->>'minimum')::numeric and (item->>'maximum')::numeric or (item->>'scale'='points' and (item->>'minimum')::numeric<>0) then raise exception 'Некорректный результат или шкала.'; end if;
    attachment:=item->>'attachment';
    if attachment is not null and ((attachment is distinct from old->>'attachment' and attachment not like target::text||'/'||actor::text||'/'||entity||'/%') or not exists(select 1 from storage.objects where bucket_id='student-works' and name=attachment)) then raise exception 'Вложение ещё не загружено.'; end if;
    source_name:=coalesce(old->>'source',case role_name when 'parent' then 'Внесено родителем' when 'teacher' then 'Внесено учителем' else 'Внесено администратором' end);
    item:=(item - 'authorId' - 'authorName' - 'source' - 'revision' - 'updatedAt' - 'deleted')||jsonb_build_object('studentId',target,'authorId',coalesce(old->>'authorId',actor::text),'authorName',coalesce(old->>'authorName',(select name from profiles where id=actor)),'source',source_name,'revision',coalesce((old->>'revision')::int,0)+1,'updatedAt',stamp);
    insert into school_works values(entity::uuid,target,coalesce((old->>'authorId')::uuid,actor),item,false) on conflict(id) do update set payload=excluded.payload,deleted=false;
   end if;
  end if;
  insert into progress_audit(student_id,entity_id,actor_id,before_value,after_value) values(target,entity,actor,old,item);
 else raise exception 'Неизвестная операция.';
 end if;
 insert into progress_receipts values(actor,request_id,p_command);
 return jsonb_build_object('saved',true);
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('student-works','student-works',false,10485760,array['image/jpeg','image/png','application/pdf']);
create function public.can_upload_school_file(path text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 return public.current_role() in ('parent','teacher','admin') and split_part(path,'/',2)=auth.uid()::text and public.can_access_student(split_part(path,'/',1)::uuid) and length(split_part(path,'/',3))=36 and split_part(path,'/',4)<>'' and split_part(path,'/',5)='';
exception when invalid_text_representation then return false;
end $$;
create policy school_file_insert on storage.objects for insert to authenticated with check(bucket_id='student-works' and public.can_upload_school_file(name));
create policy school_file_read on storage.objects for select to authenticated using(bucket_id='student-works' and exists(select 1 from public.school_works w where not w.deleted and w.payload->>'attachment'=name and public.can_access_student(w.student_id)));
-- Files are immutable. Corrections upload a new path; old revisions retain their metadata.
revoke all on function public.progress_read(uuid),public.progress_command(jsonb),public.can_upload_school_file(text) from public,anon;
grant execute on function public.progress_read(uuid),public.progress_command(jsonb),public.can_upload_school_file(text) to authenticated;
-- Future completions in existing test modules also count. No historical backfill.
create function public.progress_existing_completion() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare stamp timestamptz:=clock_timestamp(); topic text; done integer; good integer; answer_bank jsonb;
begin
 if tg_table_name='attempts' then
  topic:=new.topic_id;
  select content into answer_bank from public.topics where id=topic;
  select count(*),count(*) filter(where x->'choice'=q->'answer') into done,good from jsonb_array_elements(new.payload->'answers') x join jsonb_array_elements(answer_bank->'checks') q on q->>'id'=x->>'questionId' where x->'assisted'='false'::jsonb;
 else
  if new.status<>'submitted' or old.status='submitted' then return new; end if;
  topic:=new.lesson_id;done:=10;good:=new.score;
 end if;
 insert into public.progress_observation(student_id,since) values(new.student_id,stamp) on conflict do nothing;
 insert into public.progress_events values(new.student_id,tg_table_name||':'||new.id::text,stamp,topic,'independent',0,done,good) on conflict do nothing;
 return new;
end $$;
revoke all on function public.progress_existing_completion() from public,anon,authenticated;
create trigger progress_legacy_attempt after insert on public.attempts for each row execute function public.progress_existing_completion();
create trigger progress_existing_lesson after update of status on public.lesson_attempts for each row execute function public.progress_existing_completion();
commit;
