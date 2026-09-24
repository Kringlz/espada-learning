-- Espada is a single tutoring-organisation backend. Use a separate project per organisation.
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null check(length(trim(name))>0), role text not null check(role in ('student','teacher','admin')), active boolean not null default true);
create table public.classes (id uuid primary key, name text not null check(length(trim(name))>0));
create table public.class_memberships (class_id uuid references public.classes on delete cascade, profile_id uuid references public.profiles on delete cascade, primary key(class_id,profile_id));
create table public.parent_links (parent_id uuid references auth.users on delete cascade, student_id uuid references public.profiles on delete cascade, verified_at timestamptz, primary key(parent_id,student_id));
create table public.topics (id text primary key, content jsonb not null);
create table public.assessment_templates (id uuid primary key, content jsonb not null);
create table public.assessments (id uuid primary key, student_id uuid not null references public.profiles on delete cascade, template_id uuid not null references public.assessment_templates, status text not null check(status in ('draft','published')), revision integer not null default 0, payload jsonb not null);
create table public.attempts (id uuid primary key, student_id uuid not null references public.profiles on delete cascade, topic_id text not null references public.topics, payload jsonb not null);
create table public.activities (id uuid primary key, student_id uuid not null references public.profiles on delete cascade, topic_id text not null references public.topics, payload jsonb not null, unique(student_id,topic_id));
create table public.assignments (id uuid primary key, student_id uuid not null references public.profiles on delete cascade, topic_id text not null references public.topics, payload jsonb not null);
create table public.audit_events (id uuid primary key default gen_random_uuid(), actor_id uuid not null, student_id uuid references public.profiles on delete cascade, entity_id text not null, payload jsonb not null);
create table public.deletion_requests (id uuid primary key, student_id uuid not null unique references public.profiles on delete cascade, payload jsonb not null);
create index on public.assessments(student_id); create index on public.attempts(student_id); create index on public.assignments(student_id); create index on public.class_memberships(profile_id);
create function public.current_role() returns text language sql stable security definer set search_path=public,pg_temp as $$ select role from public.profiles where id=auth.uid() and active $$;
create function public.can_access_student(target uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(public.current_role()='admin' or (public.current_role()='student' and target=auth.uid()) or (public.current_role()='teacher' and exists(select 1 from public.class_memberships t join public.class_memberships s on t.class_id=s.class_id join public.profiles p on p.id=s.profile_id where t.profile_id=auth.uid() and s.profile_id=target and p.role='student')),false)
$$;
alter table public.profiles enable row level security; alter table public.classes enable row level security; alter table public.class_memberships enable row level security; alter table public.parent_links enable row level security; alter table public.topics enable row level security; alter table public.assessment_templates enable row level security; alter table public.assessments enable row level security; alter table public.attempts enable row level security; alter table public.activities enable row level security; alter table public.assignments enable row level security; alter table public.audit_events enable row level security; alter table public.deletion_requests enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (public.current_role() is not null and (id=auth.uid() or public.current_role()='admin' or (role='student' and public.can_access_student(id))));
create policy classes_read on public.classes for select to authenticated using (public.current_role()='admin' or exists(select 1 from public.class_memberships m where m.class_id=id and m.profile_id=auth.uid()));
-- Membership visibility is limited to one's own rows. load_learning_state returns full assigned class membership to staff.
create policy membership_read on public.class_memberships for select to authenticated using (public.current_role()='admin' or (public.current_role() is not null and profile_id=auth.uid()));
create policy topics_read on public.topics for select to authenticated using (public.current_role() is not null);
create policy templates_read on public.assessment_templates for select to authenticated using (public.current_role() is not null);
create policy assessments_read on public.assessments for select to authenticated using (public.can_access_student(student_id) and (status='published' or public.current_role() in ('teacher','admin')));
create policy attempts_read on public.attempts for select to authenticated using (public.can_access_student(student_id));
create policy activities_read on public.activities for select to authenticated using (public.can_access_student(student_id));
create policy assignments_read on public.assignments for select to authenticated using (public.can_access_student(student_id));
create policy audit_read on public.audit_events for select to authenticated using (public.current_role()='admin' or (public.current_role()='teacher' and public.can_access_student(student_id)));
create policy deletions_read on public.deletion_requests for select to authenticated using (public.current_role()='admin' or (public.current_role()='student' and student_id=auth.uid()));
-- Parent links intentionally have no policies: future verified linking requires a separate reviewed implementation.
create function public.load_learning_state() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare r text:=public.current_role(); result jsonb;
begin
 if r is null then raise exception 'Your session has expired or your account is disabled.'; end if;
 select jsonb_build_object('schemaVersion',1,
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p where p.id=auth.uid() or r='admin' or (p.role='student' and public.can_access_student(p.id))),'[]'::jsonb),
 'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'teacherIds',coalesce((select jsonb_agg(m.profile_id) from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=c.id and p.role='teacher'),'[]'::jsonb),'studentIds',case when r='student' then jsonb_build_array(auth.uid()) else coalesce((select jsonb_agg(m.profile_id) from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=c.id and p.role='student'),'[]'::jsonb) end)) from public.classes c where r='admin' or exists(select 1 from public.class_memberships m where m.class_id=c.id and m.profile_id=auth.uid())),'[]'::jsonb),
 'topics',coalesce((select jsonb_agg(content order by id) from public.topics),'[]'::jsonb),
 'templates',coalesce((select jsonb_agg(content) from public.assessment_templates),'[]'::jsonb),
 'assessments',coalesce((select jsonb_agg(payload) from public.assessments where public.can_access_student(student_id) and (r<>'student' or status='published')),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(payload) from public.attempts where public.can_access_student(student_id)),'[]'::jsonb),
 'activities',coalesce((select jsonb_agg(payload) from public.activities where public.can_access_student(student_id)),'[]'::jsonb),
 'assignments',coalesce((select jsonb_agg(payload) from public.assignments where public.can_access_student(student_id)),'[]'::jsonb),
 'audit',coalesce((select jsonb_agg(payload) from public.audit_events where r='admin' or (r='teacher' and public.can_access_student(student_id))),'[]'::jsonb),
 'deletionRequests',coalesce((select jsonb_agg(payload) from public.deletion_requests where r='admin' or student_id=auth.uid()),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.validate_marks(template jsonb, marks jsonb, publishing boolean) returns void language plpgsql set search_path=public,pg_temp as $$
declare q jsonb; m jsonb; n integer:=0;
begin
 if jsonb_typeof(marks) is distinct from 'array' or jsonb_array_length(marks)<>jsonb_array_length(template->'questions') or (select count(distinct x->>'questionId') from jsonb_array_elements(marks) x)<>jsonb_array_length(marks) then raise exception 'Record one marking status for every question.';end if;
 for q in select * from jsonb_array_elements(template->'questions') loop
 select x into m from jsonb_array_elements(marks) x where x->>'questionId'=q->>'id';
 if m is null or coalesce(m->>'status','') not in ('marked','unanswered','not_administered','unmarked') then raise exception 'Invalid marking status.';end if;
 if m->>'status'='marked' then
 if jsonb_typeof(m->'earned') is distinct from 'number' or (m->>'earned')::numeric<0 or (m->>'earned')::numeric>(q->>'max')::numeric then raise exception 'Mark outside the allowed range.';end if;n:=n+1;
 elsif m->>'status'='unanswered' then if (m->>'earned')::numeric is distinct from 0 then raise exception 'Unanswered must receive zero.';end if;n:=n+1;
 elsif m->'earned' is distinct from 'null'::jsonb then raise exception 'Unmarked and not administered must have null marks.';
 end if;
 if publishing and m->>'status'='unmarked' then raise exception 'Mark all administered questions before publication.';end if;
 end loop;
 if publishing and n=0 then raise exception 'At least one result is required.';end if;
end $$;
create function public.learning_command(command jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.current_role(); actor uuid:=auth.uid(); kind text:=command->>'type'; item jsonb; old jsonb; topic jsonb; template jsonb; q jsonb; answer jsonb; target uuid; entity uuid; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); event_id uuid; published boolean; newrev integer; member text;
begin
 if r is null then raise exception 'Session expired or account disabled.';end if;
 -- Serialize transactions for this small first-version organisation. Replace with row-level locks when scaling.
 perform pg_advisory_xact_lock(831072);
 if kind in ('saveAssessment','assign','saveTemplate','publishAssessment') and r not in ('teacher','admin') then raise exception 'Staff access required.';end if;
 if kind in ('saveTopic','saveClass','saveProfile','eraseStudent') and r<>'admin' then raise exception 'Administrator access required.';end if;
 if kind in ('submitAttempt','saveActivity','requestDeletion') and r<>'student' then raise exception 'Student access required.';end if;
 case kind
 when 'saveAssessment' then
 item:=command->'assessment';entity:=(item->>'id')::uuid;target:=(item->>'studentId')::uuid;
 if not public.can_access_student(target) or not exists(select 1 from public.profiles where id=target and role='student' and active) then raise exception 'Student access denied.';end if;
 select payload into old from public.assessments where id=entity;
 if old is not null and (old->>'status'='published' or old->>'studentId'<>item->>'studentId' or old->>'templateId'<>item->>'templateId') then raise exception 'Published records require an audited correction.';end if;
 select content into template from public.assessment_templates where id=(item->>'templateId')::uuid;if template is null then raise exception 'Unknown template.';end if;
 if (item->>'date') is null or (item->>'date')!~'^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date>current_date then raise exception 'Invalid assessment date.';end if;
 perform public.validate_marks(template,item->'marks',false);
 item:=item||jsonb_build_object('status','draft','revision',0,'authorId',actor,'updatedAt',stamp);
 insert into public.assessments values(entity,target,(item->>'templateId')::uuid,'draft',0,item) on conflict(id) do update set payload=excluded.payload;
 when 'publishAssessment' then
 entity:=(command->>'id')::uuid;select payload,student_id into old,target from public.assessments where id=entity;
 if old is null or not public.can_access_student(target) then raise exception 'Assessment access denied.';end if;
 if (command->>'expectedRevision')::integer is distinct from (old->>'revision')::integer then raise exception 'Record changed. Refresh before publishing.';end if;
 published:=old->>'status'='published';if published and length(trim(coalesce(command->>'reason','')))=0 then raise exception 'A correction reason is required.';end if;
 select content into template from public.assessment_templates where id=(old->>'templateId')::uuid;
 item:=old||jsonb_build_object('marks',coalesce(command->'marks',old->'marks'),'status','published','revision',(old->>'revision')::integer+1,'authorId',actor,'updatedAt',stamp,'correctionReason',coalesce(command->>'reason',''));
 perform public.validate_marks(template,item->'marks',true);
 update public.assessments set status='published',revision=(item->>'revision')::integer,payload=item where id=entity;
 event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,target,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action',case when published then 'assessment.corrected' else 'assessment.published' end,'at',stamp,'before',old,'after',item,'reason',coalesce(command->>'reason','')));
 when 'submitAttempt' then
 item:=command->'attempt';entity:=(item->>'id')::uuid;target:=(item->>'studentId')::uuid;if target is distinct from actor then raise exception 'Only your own attempts can be submitted.';end if;
 if exists(select 1 from public.attempts where id=entity and student_id=actor) then return;end if;
 if exists(select 1 from public.attempts where id=entity) then raise exception 'Attempt identifier is unavailable.';end if;
 select content into topic from public.topics where id=item->>'topicId';if topic is null then raise exception 'Topic not found.';end if;
 if jsonb_typeof(item->'answers') is distinct from 'array' or jsonb_array_length(item->'answers')<>3 or (select count(distinct a->>'questionId') from jsonb_array_elements(item->'answers') a)<>3 then raise exception 'Three different answers required.';end if;
 for answer in select * from jsonb_array_elements(item->'answers') loop
 select x into q from jsonb_array_elements(topic->'checks') x where x->>'id'=answer->>'questionId';
 if q is null or jsonb_typeof(answer->'choice') is distinct from 'number' or (answer->>'choice')::numeric<>trunc((answer->>'choice')::numeric) or (answer->>'choice')::int<0 or (answer->>'choice')::int>=jsonb_array_length(q->'choices') or answer->'assisted' is distinct from 'false'::jsonb then raise exception 'Invalid independent answer.';end if;
 end loop;
 item:=item||jsonb_build_object('at',stamp);insert into public.attempts values(entity,actor,item->>'topicId',item);
 update public.activities set payload=payload||jsonb_build_object('stage','complete','updatedAt',stamp) where student_id=actor and topic_id=item->>'topicId';
 update public.assignments set payload=payload||jsonb_build_object('completedAt',stamp) where student_id=actor and topic_id=item->>'topicId' and payload->>'completedAt' is null;
 when 'saveActivity' then
 item:=command->'activity';entity:=(item->>'id')::uuid;target:=(item->>'studentId')::uuid;
 if target is distinct from actor or exists(select 1 from public.activities where id=entity and student_id<>actor) then raise exception 'Only your own activity can be saved.';end if;
 if coalesce(item->>'stage','') not in ('lesson','practice','check','complete') or jsonb_typeof(item->'answers') is distinct from 'object' or jsonb_typeof(item->'questionIds') is distinct from 'array' or jsonb_typeof(item->'videoSeconds') is distinct from 'number' or (item->>'videoSeconds')::numeric<0 then raise exception 'Invalid activity.';end if;
 item:=item||jsonb_build_object('updatedAt',stamp);
 insert into public.activities values(entity,actor,item->>'topicId',item) on conflict(student_id,topic_id) do update set payload=excluded.payload,id=excluded.id;
 when 'assign' then
 item:=command->'assignment';entity:=(item->>'id')::uuid;target:=(item->>'studentId')::uuid;
 if not public.can_access_student(target) or not exists(select 1 from public.profiles where id=target and role='student' and active) or length(trim(coalesce(item->>'reason','')))=0 then raise exception 'Student access and assignment reason required.';end if;
 item:=(item-'completedAt')||jsonb_build_object('teacherId',actor,'at',stamp);
 insert into public.assignments values(entity,target,item->>'topicId',item);
 event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,target,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','topic.assigned','at',stamp,'before',null,'after',item,'reason',item->>'reason'));
 when 'saveTemplate' then
 item:=command->'template';entity:=(item->>'id')::uuid;
 if exists(select 1 from public.assessments where template_id=entity) then raise exception 'Template in use. Create a new version.';end if;
 if length(trim(coalesce(item->>'name','')))=0 or length(trim(coalesce(item->>'version','')))=0 or length(trim(coalesce(item->>'level','')))=0 or length(trim(coalesce(item->>'series','')))=0 or jsonb_typeof(item->'questions') is distinct from 'array' or jsonb_array_length(item->'questions')<1 then raise exception 'Template metadata and questions required.';end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(item->'questions') x)<>jsonb_array_length(item->'questions') then raise exception 'Unique question IDs required.';end if;
 for q in select * from jsonb_array_elements(item->'questions') loop
 if jsonb_typeof(q->'max') is distinct from 'number' or (q->>'max')::numeric<=0 or (q->>'max')::numeric>100 or not exists(select 1 from public.topics where id=q->>'topicId') or length(trim(coalesce(q->>'label','')))=0 then raise exception 'Invalid question mapping or maximum mark.';end if;
 end loop;
 insert into public.assessment_templates values(entity,item) on conflict(id) do update set content=excluded.content;
 when 'saveTopic' then
 item:=command->'topic';select content into old from public.topics where id=item->>'id';
 if old is null or jsonb_typeof(item->'checks') is distinct from 'array' or jsonb_array_length(item->'checks')<3 or jsonb_typeof(item->'practice') is distinct from 'object' or length(trim(coalesce(item->>'title','')))=0 or length(trim(coalesce(item->>'lesson','')))=0 or length(trim(coalesce(item->>'objective','')))=0 or length(trim(coalesce(item->>'example','')))=0 then raise exception 'Topic, objective, lesson and example required.';end if;
 if item->'prerequisites' is distinct from old->'prerequisites' or item->'area' is distinct from old->'area' then raise exception 'Curriculum graph changes require a reviewed migration.';end if;
 if exists(select 1 from public.attempts where topic_id=item->>'id') and old->'checks' is distinct from item->'checks' then raise exception 'Question bank has attempts and is immutable.';end if;
 for q in select * from jsonb_array_elements((item->'checks')||jsonb_build_array(item->'practice')) loop
 if length(trim(coalesce(q->>'prompt','')))=0 or jsonb_typeof(q->'choices') is distinct from 'array' or jsonb_array_length(q->'choices')<>4 or (select count(distinct trim(value)) from jsonb_array_elements_text(q->'choices'))<>4 or jsonb_typeof(q->'answer') is distinct from 'number' or (q->>'answer')::int<0 or (q->>'answer')::int>3 or length(trim(coalesce(q->>'explanation','')))=0 then raise exception 'Invalid learning question.';end if;
 end loop;
 update public.topics set content=item where id=item->>'id';event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,null,item->>'id',jsonb_build_object('id',event_id,'actorId',actor,'entityId',item->>'id','action','content.updated','at',stamp,'before',old,'after',item,'reason',''));
 when 'saveClass' then
 item:=command->'classroom';entity:=(item->>'id')::uuid;
 if length(trim(coalesce(item->>'name','')))=0 then raise exception 'Class name required.';end if;
 for member in select jsonb_array_elements_text(item->'teacherIds') loop if not exists(select 1 from public.profiles where id=member::uuid and role='teacher') then raise exception 'Invalid teacher.';end if;end loop;
 for member in select jsonb_array_elements_text(item->'studentIds') loop if not exists(select 1 from public.profiles where id=member::uuid and role='student') then raise exception 'Invalid student.';end if;end loop;
 insert into public.classes values(entity,item->>'name') on conflict(id) do update set name=excluded.name;
 delete from public.class_memberships where class_id=entity;
 insert into public.class_memberships select entity,x::uuid from jsonb_array_elements_text((item->'teacherIds')||(item->'studentIds')) x;
 when 'saveProfile' then
 item:=command->'profile';entity:=(item->>'id')::uuid;
 if entity=actor and (item->>'role'<>'admin' or item->'active' is distinct from 'true'::jsonb) then raise exception 'Cannot remove your own administrator access.';end if;
 if exists(select 1 from public.profiles where id=entity and role<>item->>'role') then raise exception 'Existing roles cannot be changed here.';end if;
 select to_jsonb(p) into old from public.profiles p where id=entity;
 insert into public.profiles values(entity,item->>'name',item->>'role',(item->>'active')::boolean) on conflict(id) do update set name=excluded.name,active=excluded.active;
 event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,null,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','account.updated','at',stamp,'before',old,'after',item,'reason',''));
 when 'requestDeletion' then
 entity:=(command->>'id')::uuid;insert into public.deletion_requests values(entity,actor,jsonb_build_object('id',entity,'studentId',actor,'at',stamp,'status','requested')) on conflict(student_id) do nothing;
 when 'eraseStudent' then
 target:=(command->>'studentId')::uuid;
 if not exists(select 1 from public.deletion_requests where student_id=target) then raise exception 'A deletion request is required.';end if;
 delete from public.audit_events where student_id=target or actor_id=target or payload::text like '%'||target::text||'%';
 delete from public.profiles where id=target and role='student';
 else raise exception 'Unknown command.';
 end case;
end $$;
-- No direct writes, even for app administrators. Every mutation goes through checked transactions.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.classes,public.class_memberships,public.topics,public.assessment_templates,public.assessments,public.attempts,public.activities,public.assignments,public.audit_events,public.deletion_requests to authenticated;
revoke all on function public.current_role(),public.can_access_student(uuid),public.load_learning_state(),public.validate_marks(jsonb,jsonb,boolean),public.learning_command(jsonb) from public,anon;
grant execute on function public.current_role(),public.can_access_student(uuid),public.load_learning_state(),public.learning_command(jsonb) to authenticated;
