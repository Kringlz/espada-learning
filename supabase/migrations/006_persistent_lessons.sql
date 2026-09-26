begin;
-- Persistent course lessons. Answer keys are NEVER part of the general learning state.
create table public.lesson_courses(id text primary key, title text not null, position integer not null default 0);
create table public.lesson_sections(id text primary key, course_id text not null references public.lesson_courses, title text not null, position integer not null default 0);
create table public.course_lessons(id text primary key, section_id text not null references public.lesson_sections, topic_id text not null references public.topics, title text not null, position integer not null default 0, summary jsonb not null, video_url text, sources jsonb not null default '[]', demo boolean not null default false, status text not null check(status in ('draft','published')), revision integer not null default 1);
create table public.lesson_test_settings(lesson_id text primary key references public.course_lessons, pass_score integer not null default 7 check(pass_score between 1 and 10));
create table public.lesson_questions(id text primary key, lesson_id text not null references public.course_lessons, difficulty text not null check(difficulty in ('easy','medium','hard')), kind text not null check(kind in ('single','multiple')), prompt text not null, explanation text not null);
create table public.lesson_options(question_id text references public.lesson_questions, id text, body text not null, correct boolean not null, position integer not null, primary key(question_id,id));
create table public.lesson_attempts(id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles on delete cascade, lesson_id text not null references public.course_lessons, start_key uuid not null, status text not null default 'in_progress' check(status in ('in_progress','submitted')), revision integer not null default 0, pass_score integer not null, lesson_snapshot jsonb not null, started_at timestamptz not null default now(), submitted_at timestamptz, score integer check(score between 0 and 10), unique(student_id,start_key));
create unique index lesson_attempt_one_open on public.lesson_attempts(student_id,lesson_id) where status='in_progress';
create index lesson_attempt_history on public.lesson_attempts(student_id,lesson_id,started_at);
create table public.lesson_attempt_items(attempt_id uuid references public.lesson_attempts on delete cascade, ordinal integer check(ordinal between 1 and 10), question_id text not null, difficulty text not null, kind text not null, prompt text not null, options jsonb not null, correct_ids jsonb not null, explanation text not null, primary key(attempt_id,ordinal), unique(attempt_id,question_id));
create table public.lesson_attempt_answers(attempt_id uuid references public.lesson_attempts on delete cascade, ordinal integer not null, option_ids jsonb not null, primary key(attempt_id,ordinal), foreign key(attempt_id,ordinal) references public.lesson_attempt_items on delete cascade);
create index lesson_questions_pool on public.lesson_questions(lesson_id,difficulty,id);
create index lesson_items_exposure on public.lesson_attempt_items(question_id,attempt_id);
create table public.lesson_import_receipts(id uuid primary key, actor_id uuid not null, digest text not null, result jsonb not null);

alter table public.lesson_courses enable row level security;
alter table public.lesson_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.lesson_test_settings enable row level security;
alter table public.lesson_questions enable row level security;
alter table public.lesson_options enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.lesson_attempt_items enable row level security;
alter table public.lesson_attempt_answers enable row level security;
alter table public.lesson_import_receipts enable row level security;
create policy lessons_read on public.course_lessons for select to authenticated using (public.current_role()='admin' or (public.current_role() is not null and status='published'));
create policy lesson_sections_read on public.lesson_sections for select to authenticated using (public.current_role()='admin' or exists(select 1 from public.course_lessons l where l.section_id=lesson_sections.id and l.status='published'));
create policy lesson_courses_read on public.lesson_courses for select to authenticated using (public.current_role()='admin' or exists(select 1 from public.lesson_sections s join public.course_lessons l on l.section_id=s.id where s.course_id=lesson_courses.id and l.status='published'));
create policy lesson_settings_read on public.lesson_test_settings for select to authenticated using (exists(select 1 from public.course_lessons l where l.id=lesson_id));
create policy lesson_questions_admin on public.lesson_questions for select to authenticated using (public.current_role()='admin');
create policy lesson_options_admin on public.lesson_options for select to authenticated using (public.current_role()='admin');
create policy lesson_attempts_own on public.lesson_attempts for select to authenticated using (public.current_role()='admin' or (public.current_role()='student' and student_id=auth.uid()));
-- Even the student's own item rows contain answer keys: only the sanitized RPC may expose them.
create policy lesson_items_admin on public.lesson_attempt_items for select to authenticated using (public.current_role()='admin');
create policy lesson_answers_own on public.lesson_attempt_answers for select to authenticated using (exists(select 1 from public.lesson_attempts a where a.id=attempt_id));
create policy lesson_imports_admin on public.lesson_import_receipts for select to authenticated using (public.current_role()='admin');
grant select on public.lesson_courses,public.lesson_sections,public.course_lessons,public.lesson_test_settings,public.lesson_questions,public.lesson_options,public.lesson_attempts,public.lesson_attempt_items,public.lesson_attempt_answers,public.lesson_import_receipts to authenticated;

create function public.lesson_public_json(p_id text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',l.id,'sectionId',l.section_id,'topicId',l.topic_id,'title',l.title,'order',l.position,'summary',l.summary,'videoUrl',l.video_url,'sources',l.sources,'demo',l.demo,'status',l.status,'revision',l.revision,'test',jsonb_build_object('passScore',t.pass_score),'questionCounts',jsonb_build_object('easy',c.e,'medium',c.m,'hard',c.h),'testReady',c.e>=4 and c.m>=4 and c.h>=2)
 from public.course_lessons l join public.lesson_test_settings t on t.lesson_id=l.id cross join lateral (select count(*) filter(where difficulty='easy') e,count(*) filter(where difficulty='medium') m,count(*) filter(where difficulty='hard') h from public.lesson_questions where lesson_id=l.id) c where l.id=p_id
$$;
create function public.lesson_catalog() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare r text:=public.current_role();begin
 if r is null then raise exception 'Войдите в аккаунт.';end if;
 return jsonb_build_object(
 'courses',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'order',c.position) order by c.position,c.id) from public.lesson_courses c where r='admin' or exists(select 1 from public.lesson_sections s join public.course_lessons l on l.section_id=s.id where s.course_id=c.id and l.status='published')),'[]'),
 'sections',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'courseId',s.course_id,'title',s.title,'order',s.position) order by s.position,s.id) from public.lesson_sections s where r='admin' or exists(select 1 from public.course_lessons l where l.section_id=s.id and l.status='published')),'[]'),
 'lessons',coalesce((select jsonb_agg(public.lesson_public_json(l.id) order by l.position,l.id) from public.course_lessons l where r='admin' or l.status='published'),'[]'));
end $$;
create function public.lesson_read(p_id text) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
begin
 if public.current_role() is null or not exists(select 1 from public.course_lessons where id=p_id and (status='published' or public.current_role()='admin')) then raise exception 'Урок недоступен.';end if;
 return public.lesson_public_json(p_id);
end $$;
create function public.lesson_admin_export(p_id text default null) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare result jsonb;begin
 if public.current_role() is distinct from 'admin' then raise exception 'Только администратор может управлять уроками.';end if;
 result:=public.lesson_catalog();
 return jsonb_build_object('schemaVersion',1,'courses',result->'courses','sections',result->'sections','lessons',coalesce((select jsonb_agg((public.lesson_public_json(l.id)-'revision'-'questionCounts'-'testReady')||jsonb_build_object('questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'difficulty',q.difficulty,'type',q.kind,'prompt',q.prompt,'explanation',q.explanation,'options',(select jsonb_agg(jsonb_build_object('id',o.id,'text',o.body) order by o.position,o.id) from public.lesson_options o where o.question_id=q.id),'correctOptionIds',(select jsonb_agg(o.id order by o.id) from public.lesson_options o where o.question_id=q.id and o.correct)) order by q.id) from public.lesson_questions q where q.lesson_id=l.id),'[]'))) from public.course_lessons l where p_id is null or l.id=p_id),'[]'));
end $$;

create function public.lesson_import(p_package jsonb,p_dry_run boolean default true,p_request_id uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare c jsonb;s jsonb;l jsonb;q jsonb;o jsonb;b jsonb;old jsonb;result jsonb; existing_lesson text; created integer:=0;updated integer:=0;questions integer:=0; fingerprint text:=encode(sha256(convert_to(p_package::text,'UTF8')),'hex');
begin
 if public.current_role() is distinct from 'admin' then raise exception 'Только администратор может управлять уроками.';end if;
 if p_dry_run is null or (not p_dry_run and p_request_id is null) then raise exception 'Нужен идентификатор импорта.';end if;
 perform pg_advisory_xact_lock(831073);
 if not p_dry_run then
   select to_jsonb(r) into old from public.lesson_import_receipts r where id=p_request_id;
   if old is not null then
     if old->>'actor_id'<>auth.uid()::text or old->>'digest'<>fingerprint then raise exception 'Идентификатор импорта уже использован.';end if;
     return old->'result';
   end if;
 end if;
 if p_package->'schemaVersion' is distinct from '1'::jsonb or jsonb_typeof(p_package->'courses') is distinct from 'array' or jsonb_typeof(p_package->'sections') is distinct from 'array' or jsonb_typeof(p_package->'lessons') is distinct from 'array' then raise exception 'Нужен JSON-пакет версии 1: courses, sections, lessons.';end if;
 if jsonb_array_length(p_package->'lessons') not between 1 and 100 then raise exception 'В одном пакете должно быть от 1 до 100 уроков.';end if;
 foreach existing_lesson in array array['courses','sections','lessons'] loop
  if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(p_package->existing_lesson) x) then raise exception 'Повторные id: %.',existing_lesson;end if;
  for c in select * from jsonb_array_elements(p_package->existing_lesson) loop
   if jsonb_typeof(c->'id') is distinct from 'string' or jsonb_typeof(c->'title') is distinct from 'string' or coalesce(c->>'id','') !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$' or coalesce(trim(c->>'title'),'')='' or jsonb_typeof(c->'order') is distinct from 'number' or (c->>'order')::numeric<>trunc((c->>'order')::numeric) then raise exception 'Проверьте id, название и целый порядок: %.',c->>'id';end if;
  end loop;
 end loop;
 for l in select * from jsonb_array_elements(p_package->'lessons') loop
  if jsonb_typeof(l->'questions') is distinct from 'array' then raise exception 'Урок %: questions должен быть массивом.',l->>'id';end if;
 end loop;
 if (select count(*)<>count(distinct q->>'id') from jsonb_array_elements(p_package->'lessons') l cross join lateral jsonb_array_elements(l->'questions') q) then raise exception 'Идентификаторы вопросов должны быть уникальны во всём пакете.';end if;
 begin
  for c in select * from jsonb_array_elements(p_package->'courses') loop
   insert into public.lesson_courses values(c->>'id',trim(c->>'title'),(c->>'order')::integer) on conflict(id) do update set title=excluded.title,position=excluded.position;
  end loop;
  for s in select * from jsonb_array_elements(p_package->'sections') loop
   if not exists(select 1 from public.lesson_courses where id=s->>'courseId') then raise exception 'Раздел %: курс не найден.',s->>'id';end if;
   insert into public.lesson_sections values(s->>'id',s->>'courseId',trim(s->>'title'),(s->>'order')::integer) on conflict(id) do update set course_id=excluded.course_id,title=excluded.title,position=excluded.position;
  end loop;
  for l in select * from jsonb_array_elements(p_package->'lessons') loop
   if not exists(select 1 from public.lesson_sections where id=l->>'sectionId') or not exists(select 1 from public.topics where id=l->>'topicId') then raise exception 'Урок %: раздел или тема программы не найдены.',l->>'id';end if;
   if coalesce(l->>'status','draft') not in ('draft','published') or (l ? 'demo' and jsonb_typeof(l->'demo')<>'boolean') then raise exception 'Урок %: проверьте status и demo.',l->>'id';end if;
   if jsonb_typeof(l->'summary') is distinct from 'array' or jsonb_array_length(l->'summary')=0 or jsonb_typeof(l->'sources') is distinct from 'array' or jsonb_typeof(l->'questions') is distinct from 'array' then raise exception 'Урок %: нужны summary, sources, questions.',l->>'id';end if;
   for b in select * from jsonb_array_elements(l->'summary') loop
    if jsonb_typeof(b->'text') is distinct from 'string' or coalesce(b->>'kind','') not in ('heading','paragraph','example','list') or coalesce(trim(b->>'text'),'')='' then raise exception 'Урок %: неверный блок конспекта.',l->>'id';end if;
   end loop;
   if nullif(l->>'videoUrl','') is not null and (jsonb_typeof(l->'videoUrl')<>'string' or l->>'videoUrl' !~ '^https://[^[:space:]]+$') then raise exception 'Урок %: видео должно иметь HTTPS-адрес.',l->>'id';end if;
   for b in select * from jsonb_array_elements(l->'sources') loop
    if jsonb_typeof(b->'title') is distinct from 'string' or coalesce(trim(b->>'title'),'')='' or (nullif(b->>'url','') is not null and b->>'url' !~ '^https://[^[:space:]]+$') then raise exception 'Урок %: неверная ссылка на источник.',l->>'id';end if;
   end loop;
   if jsonb_typeof(l->'test'->'passScore') is distinct from 'number' or (l->'test'->>'passScore')::numeric<>trunc((l->'test'->>'passScore')::numeric) or (l->'test'->>'passScore')::integer not between 1 and 10 then raise exception 'Урок %: проходной балл должен быть целым от 1 до 10.',l->>'id';end if;
   if exists(select 1 from public.course_lessons where id=l->>'id') then updated:=updated+1;else created:=created+1;end if;
   insert into public.course_lessons values(l->>'id',l->>'sectionId',l->>'topicId',trim(l->>'title'),(l->>'order')::integer,l->'summary',nullif(l->>'videoUrl',''),l->'sources',coalesce((l->>'demo')::boolean,false),coalesce(l->>'status','draft'),1) on conflict(id) do update set section_id=excluded.section_id,topic_id=excluded.topic_id,title=excluded.title,position=excluded.position,summary=excluded.summary,video_url=excluded.video_url,sources=excluded.sources,demo=excluded.demo,status=excluded.status,revision=course_lessons.revision+1;
   insert into public.lesson_test_settings values(l->>'id',(l->'test'->>'passScore')::integer) on conflict(lesson_id) do update set pass_score=excluded.pass_score;
   for q in select * from jsonb_array_elements(l->'questions') loop
    if jsonb_typeof(q->'id') is distinct from 'string' or jsonb_typeof(q->'prompt') is distinct from 'string' or jsonb_typeof(q->'explanation') is distinct from 'string' or coalesce(q->>'id','') !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$' or coalesce(q->>'difficulty','') not in ('easy','medium','hard') or coalesce(q->>'type','') not in ('single','multiple') or coalesce(trim(q->>'prompt'),'')='' or coalesce(trim(q->>'explanation'),'')='' then raise exception 'Вопрос %: проверьте id, сложность, тип, текст и объяснение.',q->>'id';end if;
    if jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') not between 2 and 8 or jsonb_typeof(q->'correctOptionIds') is distinct from 'array' or jsonb_array_length(q->'correctOptionIds')<1 then raise exception 'Вопрос %: нужны 2–8 вариантов и правильные ответы.',q->>'id';end if;
    if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(q->'options') x) or (select count(*)<>count(distinct x) from jsonb_array_elements_text(q->'correctOptionIds') x) or (q->>'type'='single' and jsonb_array_length(q->'correctOptionIds')<>1) then raise exception 'Вопрос %: повторные варианты или неверное число правильных ответов.',q->>'id';end if;
    for o in select * from jsonb_array_elements(q->'options') loop
     if jsonb_typeof(o->'id') is distinct from 'string' or jsonb_typeof(o->'text') is distinct from 'string' or coalesce(o->>'id','') !~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$' or coalesce(trim(o->>'text'),'')='' then raise exception 'Вопрос %: неверный вариант ответа.',q->>'id';end if;
    end loop;
    if exists(select 1 from jsonb_array_elements_text(q->'correctOptionIds') x where not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'id'=x)) then raise exception 'Вопрос %: правильный ответ отсутствует среди вариантов.',q->>'id';end if;
    select lesson_id into existing_lesson from public.lesson_questions where id=q->>'id';
    if existing_lesson is not null and existing_lesson<>l->>'id' then raise exception 'Вопрос % уже принадлежит другому уроку.',q->>'id';end if;
    insert into public.lesson_questions values(q->>'id',l->>'id',q->>'difficulty',q->>'type',q->>'prompt',q->>'explanation') on conflict(id) do update set difficulty=excluded.difficulty,kind=excluded.kind,prompt=excluded.prompt,explanation=excluded.explanation;
    -- Omitted content stays present, including answer options. The explicit key set is replaced.
    update public.lesson_options set correct=(q->'correctOptionIds') ? id where question_id=q->>'id';
    insert into public.lesson_options select q->>'id',o->>'id',o->>'text',(q->'correctOptionIds') ? (o->>'id'),n::integer from jsonb_array_elements(q->'options') with ordinality as x(o,n)
      on conflict(question_id,id) do update set body=excluded.body,correct=excluded.correct,position=excluded.position;
    if (select count(*) from public.lesson_options where question_id=q->>'id')>8 then raise exception 'Вопрос %: после объединения больше 8 вариантов. Используйте существующие id.',q->>'id';end if;
    questions:=questions+1;
   end loop;
   if coalesce(l->>'status','draft')='published' and not (public.lesson_public_json(l->>'id')->>'testReady')::boolean then raise exception 'Урок %: для публикации теста нужно минимум 4 простых, 4 средних и 2 сложных вопроса.',l->>'id';end if;
  end loop;
  result:=jsonb_build_object('courses',jsonb_array_length(p_package->'courses'),'sections',jsonb_array_length(p_package->'sections'),'lessons',created+updated,'questions',questions,'createdLessons',created,'updatedLessons',updated,'dryRun',p_dry_run);
  if p_dry_run then raise sqlstate 'Z0001' using message='dry run rollback';end if;
 exception when sqlstate 'Z0001' then null;
 end;
 if not p_dry_run then insert into public.lesson_import_receipts values(p_request_id,auth.uid(),fingerprint,result);end if;
 return result;
end $$;

-- Private serializer: keys and explanations are released only after submission.
create function public.lesson_attempt_json(p_id uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'lessonId',a.lesson_id,'status',a.status,'revision',a.revision,'startedAt',a.started_at,'submittedAt',a.submitted_at,'score',a.score,'passScore',a.pass_score,'lesson',a.lesson_snapshot,
 'questions',(select jsonb_agg(jsonb_build_object('id',i.question_id,'ordinal',i.ordinal,'difficulty',i.difficulty,'type',i.kind,'prompt',i.prompt,'options',i.options) || case when a.status='submitted' then jsonb_build_object('correctOptionIds',i.correct_ids,'explanation',i.explanation) else '{}'::jsonb end order by i.ordinal) from public.lesson_attempt_items i where i.attempt_id=a.id),
 'answers',coalesce((select jsonb_agg(jsonb_build_object('ordinal',r.ordinal,'optionIds',r.option_ids) order by r.ordinal) from public.lesson_attempt_answers r where r.attempt_id=a.id),'[]')) from public.lesson_attempts a where a.id=p_id
$$;
create function public.lesson_attempt_read(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
begin
 if public.current_role() is distinct from 'student' or not exists(select 1 from public.lesson_attempts where id=p_id and student_id=auth.uid()) then raise exception 'Попытка недоступна.';end if;
 return public.lesson_attempt_json(p_id);
end $$;
create function public.lesson_attempt_history(p_lesson_id text) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
begin
 if public.current_role() is distinct from 'student' then raise exception 'Войдите как ученик.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'lessonId',a.lesson_id,'status',a.status,'startedAt',a.started_at,'submittedAt',a.submitted_at,'score',a.score,'passScore',a.pass_score,'lesson',a.lesson_snapshot) order by a.started_at desc,a.id) from public.lesson_attempts a where a.student_id=auth.uid() and (p_lesson_id is null or a.lesson_id=p_lesson_id)),'[]');
end $$;
create function public.lesson_start(p_lesson_id text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare a public.lesson_attempts; l jsonb; chosen text[]; previous text[]; replacement text; removed text; attempt_id uuid;
begin
 if public.current_role() is distinct from 'student' or p_request_id is null then raise exception 'Для начала теста войдите как ученик.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,17));
 select * into a from public.lesson_attempts where student_id=auth.uid() and start_key=p_request_id;
 if found then
  if a.lesson_id<>p_lesson_id then raise exception 'Этот запрос уже использован для другого урока.';end if;
  return public.lesson_attempt_json(a.id);
 end if;
 select * into a from public.lesson_attempts where student_id=auth.uid() and lesson_id=p_lesson_id and status='in_progress';
 if found then return public.lesson_attempt_json(a.id);end if;
 -- Imports and selection share a lock: a snapshot never mixes two content versions.
 perform pg_advisory_xact_lock(831073);
 l:=public.lesson_read(p_lesson_id);
 if not (l->>'testReady')::boolean then raise exception 'Банк вопросов пока не готов: нужны 4 простых, 4 средних и 2 сложных.';end if;
 with usage as (
  select q.id,q.difficulty,count(i.question_id) exposures,max(a.started_at) last_seen from public.lesson_questions q
  left join (public.lesson_attempt_items i join public.lesson_attempts a on a.id=i.attempt_id and a.student_id=auth.uid()) on i.question_id=q.id
  where q.lesson_id=p_lesson_id group by q.id,q.difficulty
 ), ranked as (select *,row_number() over(partition by difficulty order by exposures,last_seen nulls first,random()) n from usage)
 select array_agg(id order by id) into chosen from ranked where n<=case when difficulty='hard' then 2 else 4 end;
 select array_agg(i.question_id order by i.question_id) into previous from public.lesson_attempt_items i where i.attempt_id=(select id from public.lesson_attempts where student_id=auth.uid() and lesson_id=p_lesson_id order by started_at desc,id desc limit 1);
 if chosen=previous then
  select q.id into replacement from public.lesson_questions q left join (public.lesson_attempt_items i join public.lesson_attempts a on a.id=i.attempt_id and a.student_id=auth.uid()) on i.question_id=q.id where q.lesson_id=p_lesson_id and not(q.id=any(chosen)) group by q.id order by count(i.question_id),max(a.started_at) nulls first,random() limit 1;
  if replacement is not null then
   select id into removed from public.lesson_questions where id=any(chosen) and difficulty=(select difficulty from public.lesson_questions where id=replacement) order by random() limit 1;
   chosen:=array_append(array_remove(chosen,removed),replacement);
  end if;
 end if;
 insert into public.lesson_attempts(student_id,lesson_id,start_key,pass_score,lesson_snapshot) values(auth.uid(),p_lesson_id,p_request_id,(l->'test'->>'passScore')::integer,jsonb_build_object('title',l->>'title','revision',l->'revision','demo',l->'demo')) returning id into attempt_id;
 insert into public.lesson_attempt_items select attempt_id,row_number() over(order by random()),q.id,q.difficulty,q.kind,q.prompt,
 (select jsonb_agg(jsonb_build_object('id',o.id,'text',o.body) order by o.position,o.id) from public.lesson_options o where o.question_id=q.id),
 (select jsonb_agg(o.id order by o.id) from public.lesson_options o where o.question_id=q.id and o.correct),q.explanation from public.lesson_questions q where q.id=any(chosen);
 return public.lesson_attempt_json(attempt_id);
end $$;
create function public.lesson_save_answers(p_attempt_id uuid,p_answers jsonb,p_revision integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare a public.lesson_attempts; r jsonb; i public.lesson_attempt_items; normalized jsonb; stored jsonb;
begin
 select * into a from public.lesson_attempts where id=p_attempt_id and student_id=auth.uid() for update;
 if not found or public.current_role() is distinct from 'student' then raise exception 'Попытка недоступна.';end if;
 if a.status<>'in_progress' then raise exception 'Сданную попытку нельзя изменить.';end if;
 if jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)>10 then raise exception 'Неверный список ответов.';end if;
 if (select count(*)<>count(distinct x->>'ordinal') from jsonb_array_elements(p_answers) x) then raise exception 'Повторный номер вопроса.';end if;
 for r in select * from jsonb_array_elements(p_answers) loop
  if coalesce(r->>'ordinal','') !~ '^(10|[1-9])$' or jsonb_typeof(r->'optionIds') is distinct from 'array' then raise exception 'Неверный номер вопроса или варианты.';end if;
  select * into i from public.lesson_attempt_items where attempt_id=p_attempt_id and ordinal=(r->>'ordinal')::integer;
  if not found or (i.kind='single' and jsonb_array_length(r->'optionIds')>1) or (select count(*)<>count(distinct x) from jsonb_array_elements_text(r->'optionIds') x) or exists(select 1 from jsonb_array_elements(r->'optionIds') x where jsonb_typeof(x)<>'string') or exists(select 1 from jsonb_array_elements_text(r->'optionIds') x where not exists(select 1 from jsonb_array_elements(i.options) o where o->>'id'=x)) then raise exception 'Вопрос %: недопустимые варианты ответа.',r->>'ordinal';end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('ordinal',(r->>'ordinal')::integer,'optionIds',(select coalesce(jsonb_agg(x order by x),'[]') from jsonb_array_elements(r->'optionIds') x)) order by (r->>'ordinal')::integer),'[]') into normalized from jsonb_array_elements(p_answers) r where jsonb_array_length(r->'optionIds')>0;
 stored:=public.lesson_attempt_json(p_attempt_id)->'answers';
 if normalized=stored then return public.lesson_attempt_json(p_attempt_id);end if;
 if p_revision is distinct from a.revision then raise exception 'Ответы изменились в другой вкладке. Откройте попытку заново.';end if;
 delete from public.lesson_attempt_answers where attempt_id=p_attempt_id;
 insert into public.lesson_attempt_answers select p_attempt_id,(r->>'ordinal')::integer,r->'optionIds' from jsonb_array_elements(normalized) r;
 update public.lesson_attempts set revision=revision+1 where id=p_attempt_id;
 return public.lesson_attempt_json(p_attempt_id);
end $$;
create function public.lesson_submit(p_attempt_id uuid,p_revision integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare a public.lesson_attempts; total integer;
begin
 select * into a from public.lesson_attempts where id=p_attempt_id and student_id=auth.uid() for update;
 if not found or public.current_role() is distinct from 'student' then raise exception 'Попытка недоступна.';end if;
 if a.status='submitted' then return public.lesson_attempt_json(p_attempt_id);end if;
 if p_revision is distinct from a.revision then raise exception 'Ответы изменились. Откройте попытку заново.';end if;
 if (select count(*) from public.lesson_attempt_answers where attempt_id=p_attempt_id)<>10 then raise exception 'Ответьте на все 10 вопросов.';end if;
 select count(*) into total from public.lesson_attempt_items i join public.lesson_attempt_answers r using(attempt_id,ordinal) where i.attempt_id=p_attempt_id and i.correct_ids=r.option_ids;
 update public.lesson_attempts set status='submitted',score=total,submitted_at=now(),revision=revision+1 where id=p_attempt_id;
 return public.lesson_attempt_json(p_attempt_id);
end $$;

-- Explicit grants also protect against Supabase's permissive default privileges.
revoke all on public.lesson_courses,public.lesson_sections,public.course_lessons,public.lesson_test_settings,public.lesson_questions,public.lesson_options,public.lesson_attempts,public.lesson_attempt_items,public.lesson_attempt_answers,public.lesson_import_receipts from public,anon,authenticated;
grant select on public.lesson_courses,public.lesson_sections,public.course_lessons,public.lesson_test_settings,public.lesson_questions,public.lesson_options,public.lesson_attempts,public.lesson_attempt_items,public.lesson_attempt_answers,public.lesson_import_receipts to authenticated;
revoke all on function public.lesson_public_json(text),public.lesson_attempt_json(uuid),public.lesson_catalog(),public.lesson_read(text),public.lesson_admin_export(text),public.lesson_import(jsonb,boolean,uuid),public.lesson_attempt_read(uuid),public.lesson_attempt_history(text),public.lesson_start(text,uuid),public.lesson_save_answers(uuid,jsonb,integer),public.lesson_submit(uuid,integer) from public,anon,authenticated;
grant execute on function public.lesson_catalog(),public.lesson_read(text),public.lesson_admin_export(text),public.lesson_import(jsonb,boolean,uuid),public.lesson_attempt_read(uuid),public.lesson_attempt_history(text),public.lesson_start(text,uuid),public.lesson_save_answers(uuid,jsonb,integer),public.lesson_submit(uuid,integer) to authenticated;

commit;
