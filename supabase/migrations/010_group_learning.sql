-- Additive group activity ledger. No existing progress, grades or policies are changed.
-- Answer keys are authored content, loaded by the accompanying generated seed.
create table public.study_topics (
 id text primary key, page_count integer not null check(page_count>0), question_count integer not null check(question_count>0)
);
create table public.study_questions (
 topic_id text references public.study_topics, question_no integer check(question_no>0), correct_choice integer not null check(correct_choice between 0 and 2), primary key(topic_id,question_no)
);
create table public.study_answer_requests (
 student_id uuid references public.profiles on delete cascade, request_id uuid, topic_id text not null, question_no integer not null, choice integer not null check(choice between 0 and 2), submitted_at timestamptz not null default now(),
 primary key(student_id,request_id), foreign key(topic_id,question_no) references public.study_questions
);
create table public.study_answers (
 student_id uuid references public.profiles on delete cascade, topic_id text, question_no integer, last_choice integer not null check(last_choice between 0 and 2), answered_at timestamptz not null default now(),
 primary key(student_id,topic_id,question_no), foreign key(topic_id,question_no) references public.study_questions
);
create table public.study_xp (
 student_id uuid references public.profiles on delete cascade, topic_id text, question_no integer, earned_at timestamptz not null default now(),
 primary key(student_id,topic_id,question_no), foreign key(topic_id,question_no) references public.study_questions
);
create table public.study_read_pages (
 student_id uuid references public.profiles on delete cascade, topic_id text references public.study_topics, page_no integer not null check(page_no>=0), read_at timestamptz not null default now(), primary key(student_id,topic_id,page_no)
);
alter table public.study_topics enable row level security;
alter table public.study_questions enable row level security;
alter table public.study_answer_requests enable row level security;
alter table public.study_answers enable row level security;
alter table public.study_xp enable row level security;
alter table public.study_read_pages enable row level security;
revoke all on public.study_topics,public.study_questions,public.study_answer_requests,public.study_answers,public.study_xp,public.study_read_pages from public,anon,authenticated;

create function public.record_course_answer(p_topic_id text,p_question_no integer,p_choice integer,p_request_id uuid,p_read_pages integer[] default '{}')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); answer integer; inserted integer; gained integer:=0; prior public.study_answer_requests; total bigint; pages integer;
begin
 if actor is null or public.current_role() is distinct from 'student' then raise exception 'Student access required.';end if;
 if p_request_id is null or p_choice is null or p_choice not between 0 and 2 then raise exception 'Invalid answer.';end if;
 select correct_choice into answer from public.study_questions where topic_id=p_topic_id and question_no=p_question_no;
 if answer is null then raise exception 'Unknown course question.';end if;
 select page_count into pages from public.study_topics where id=p_topic_id;
 if cardinality(p_read_pages)>pages or exists(select 1 from unnest(p_read_pages) n where n is null or n<0 or n>=pages) then raise exception 'Invalid course pages.';end if;
 -- Serialize writes for this learner; duplicate requests and distinct concurrent attempts are safe.
 perform pg_advisory_xact_lock(hashtextextended('study:'||actor::text,0));
 select * into prior from public.study_answer_requests where student_id=actor and request_id=p_request_id;
 if found then
  if prior.topic_id<>p_topic_id or prior.question_no<>p_question_no or prior.choice<>p_choice then raise exception 'Request id reused with different answer.';end if;
  select count(*)*20 into total from public.study_xp where student_id=actor;
  return jsonb_build_object('correct',p_choice=answer,'awardedXp',0,'totalXp',total,'replayed',true);
 end if;
 insert into public.study_read_pages(student_id,topic_id,page_no) select actor,p_topic_id,n from unnest(p_read_pages) n on conflict do nothing;
 insert into public.study_answer_requests(student_id,request_id,topic_id,question_no,choice) values(actor,p_request_id,p_topic_id,p_question_no,p_choice);
 insert into public.study_answers(student_id,topic_id,question_no,last_choice) values(actor,p_topic_id,p_question_no,p_choice)
 on conflict(student_id,topic_id,question_no) do update set last_choice=excluded.last_choice,answered_at=now();
 if p_choice=answer then
  insert into public.study_xp(student_id,topic_id,question_no) values(actor,p_topic_id,p_question_no) on conflict do nothing;
  get diagnostics inserted=row_count;gained:=inserted*20;
 end if;
 select count(*)*20 into total from public.study_xp where student_id=actor;
 return jsonb_build_object('correct',p_choice=answer,'awardedXp',gained,'totalXp',total,'replayed',false);
end $$;

create function public.record_course_read(p_topic_id text,p_page_no integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid();pages integer;
begin
 if actor is null or public.current_role() is distinct from 'student' then raise exception 'Student access required.';end if;
 select page_count into pages from public.study_topics where id=p_topic_id;
 if pages is null or p_page_no is null or p_page_no<0 or p_page_no>=pages then raise exception 'Invalid course page.';end if;
 insert into public.study_read_pages(student_id,topic_id,page_no) values(actor,p_topic_id,p_page_no) on conflict do nothing;
end $$;

-- Private helper: aggregates contain no emails, grades, notes or answer content.
create function public.study_totals(target uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
 'xp',(select count(*)*20 from public.study_xp where student_id=target),
 'completedLessons',(select count(*) from public.study_topics t where
    (select count(*) from public.study_answers a where a.student_id=target and a.topic_id=t.id)=t.question_count and
    (select count(*) from public.study_read_pages p where p.student_id=target and p.topic_id=t.id)=t.page_count),
 'lastActivity',(select max(answered_at) from public.study_answers where student_id=target))
$$;

create function public.group_learning_summary(p_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid();r text:=public.current_role();group_name text;rows jsonb;
begin
 if actor is null or r is null or r not in ('student','teacher','admin') then raise exception 'Group access denied.';end if;
 if r<>'admin' and not exists(select 1 from public.class_memberships where class_id=p_class_id and profile_id=actor) then raise exception 'Group access denied.';end if;
 select name into group_name from public.classes where id=p_class_id;
 if group_name is null then raise exception 'Group access denied.';end if;
 with members as (
  select p.id,p.name,public.study_totals(p.id) stats from public.profiles p join public.class_memberships m on m.profile_id=p.id
  where m.class_id=p_class_id and p.role='student' and p.active
 ), ranked as (
  select *,case when (stats->>'xp')::bigint=0 then 0 else rank() over(order by (stats->>'xp')::bigint desc) end place from members
 ) select coalesce(jsonb_agg(
  jsonb_build_object('name',name,'rank',place,'xp',(stats->>'xp')::bigint,'isCurrent',id=actor) ||
  case when r in ('teacher','admin') then jsonb_build_object('studentId',id,'completedLessons',stats->'completedLessons','lastActivity',stats->'lastActivity') else '{}'::jsonb end
  order by (stats->>'xp')::bigint desc,lower(name) collate "C",id
 ),'[]'::jsonb) into rows from ranked;
 return jsonb_build_object('groupId',p_class_id,'groupName',group_name,'rows',rows,'teacherView',r in ('teacher','admin'));
end $$;
revoke all on function public.record_course_answer(text,integer,integer,uuid,integer[]),public.record_course_read(text,integer),public.study_totals(uuid),public.group_learning_summary(uuid) from public,anon,authenticated;
grant execute on function public.record_course_answer(text,integer,integer,uuid,integer[]),public.record_course_read(text,integer),public.group_learning_summary(uuid) to authenticated;
notify pgrst,'reload schema';
