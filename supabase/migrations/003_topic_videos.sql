-- Private media for one tutoring organisation. Apply with the Supabase migration role.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('lesson-videos','lesson-videos',false,52428800,array['video/mp4'])
 on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['video/mp4'];
create policy lesson_videos_insert on storage.objects for insert to authenticated with check (
 bucket_id='lesson-videos' and public.current_role() in ('teacher','admin')
 and split_part(name,'/',1)=auth.uid()::text
 and name ~ '^[a-zA-Z0-9-]+/[a-zA-Z0-9-]+/[a-zA-Z0-9-]+\.mp4$'
 and exists(select 1 from public.topics where id=split_part(name,'/',2))
);
create policy lesson_videos_read on storage.objects for select to authenticated using (
 bucket_id='lesson-videos' and public.current_role() is not null
 and ((public.current_role() in ('teacher','admin') and owner_id=auth.uid()::text)
 or exists(select 1 from public.topics t,jsonb_array_elements(coalesce(t.content->'videos','[]'::jsonb)) v where v->>'storageKey'=name and v->>'storage'='supabase'))
);
-- Only failed, unattached uploads can be removed. Published videos cannot be replaced in place.
create policy lesson_videos_cleanup on storage.objects for delete to authenticated using (
 bucket_id='lesson-videos' and public.current_role() in ('teacher','admin') and owner_id=auth.uid()::text
 and not exists(select 1 from public.topics t,jsonb_array_elements(coalesce(t.content->'videos','[]'::jsonb)) v where v->>'storageKey'=name)
);
create or replace function public.learning_command(command jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.current_role(); actor uuid:=auth.uid(); kind text:=command->>'type'; item jsonb; old jsonb; topic jsonb; template jsonb; q jsonb; answer jsonb; target uuid; entity uuid; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); event_id uuid; published boolean; newrev integer; member text;
begin
 if r is null then raise exception 'Session expired or account disabled.';end if;
 -- Serialize transactions for this small first-version organisation. Replace with row-level locks when scaling.
 perform pg_advisory_xact_lock(831072);
 if kind in ('saveAssessment','assign','saveTemplate','publishAssessment') and r not in ('teacher','admin') then raise exception 'Staff access required.';end if;
 if kind in ('saveTopic','saveClass','saveProfile','eraseStudent') and r<>'admin' then raise exception 'Administrator access required.';end if;
 if kind in ('submitAttempt','saveActivity','requestDeletion') and r<>'student' then raise exception 'Student access required.';end if;
 case kind
 when 'attachVideo' then
 if r not in ('teacher','admin') then raise exception 'Загружать видео могут только преподаватели и администраторы.';end if;
 item:=command->'video';
 select content into topic from public.topics where id=command->>'topicId';
 if topic is null then raise exception 'Тема не найдена.';end if;
 if coalesce(item->>'storage','')<>'supabase' or coalesce(item->>'uploadedBy','')<>actor::text
 or coalesce(item->>'id','')!~'^[a-zA-Z0-9-]+$' or length(trim(coalesce(item->>'title','')))=0 or length(item->>'title')>160
 or coalesce(item->>'mimeType','')<>'video/mp4' or coalesce(item->>'fileName','')!~*'\.mp4$'
 or jsonb_typeof(item->'size') is distinct from 'number' or (item->>'size')::numeric<=0 or (item->>'size')::numeric>52428800
 or coalesce(item->>'storageKey','')<>actor::text||'/'||(command->>'topicId')||'/'||(item->>'id')||'.mp4'
 then raise exception 'Некорректные данные видеоурока.';end if;
 perform (item->>'uploadedAt')::timestamptz;
 if item->>'uploadedAt' is null then raise exception 'Укажите дату загрузки.';end if;
 select x into old from jsonb_array_elements(coalesce(topic->'videos','[]'::jsonb)) x where x->>'id'=item->>'id';
 if old is not null then
  if old<>item then raise exception 'Этот видеоурок уже существует.';end if;
  return;
 end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='lesson-videos' and o.name=item->>'storageKey' and o.owner_id=actor::text and o.metadata->>'mimetype'='video/mp4' and (o.metadata->>'size')::numeric=(item->>'size')::numeric)
 then raise exception 'Загруженный файл не найден или его данные не совпадают.';end if;
 update public.topics set content=jsonb_set(content,'{videos}',coalesce(content->'videos','[]'::jsonb)||jsonb_build_array(item)) where id=command->>'topicId';
 event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,null,command->>'topicId',jsonb_build_object('id',event_id,'actorId',actor,'entityId',command->>'topicId','action','video.added','at',stamp,'before',null,'after',item,'reason',''));
 when 'saveVideoPosition' then
 if r<>'student' or coalesce(command->>'studentId','')<>actor::text then raise exception 'Можно сохранять только свою позицию просмотра.';end if;
 if jsonb_typeof(command->'seconds') is distinct from 'number' or (command->>'seconds')::numeric<0 or (command->>'seconds')::numeric>86400 then raise exception 'Некорректная позиция видео.';end if;
 if not exists(select 1 from public.topics t, jsonb_array_elements(coalesce(t.content->'videos','[]'::jsonb)) v where t.id=command->>'topicId' and v->>'id'=command->>'videoId') then raise exception 'Видеоурок не найден.';end if;
 update public.activities set payload=payload||jsonb_build_object('videoPositions',coalesce(payload->'videoPositions','{}'::jsonb)||jsonb_build_object(command->>'videoId',command->'seconds'),'updatedAt',stamp) where student_id=actor and topic_id=command->>'topicId';
 if not found then raise exception 'Сначала откройте урок.';end if;
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
 select payload into old from public.activities where student_id=actor and topic_id=item->>'topicId';
 item:=(item-'videoPositions')||jsonb_build_object('updatedAt',stamp,'videoPositions',coalesce(old->'videoPositions','{}'::jsonb));
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
 if old is null or jsonb_typeof(item->'checks') is distinct from 'array' or (jsonb_array_length(item->'checks')>0 and jsonb_array_length(item->'checks')<3) or (item ? 'practice' and jsonb_typeof(item->'practice') is distinct from 'object') or length(trim(coalesce(item->>'title','')))=0 or length(trim(coalesce(item->>'lesson','')))=0 or length(trim(coalesce(item->>'objective','')))=0 or length(trim(coalesce(item->>'example','')))=0 then raise exception 'Topic, objective, lesson and example required.';end if;
 if item->'prerequisites' is distinct from old->'prerequisites' or item->'area' is distinct from old->'area' then raise exception 'Curriculum graph changes require a reviewed migration.';end if;
 if exists(select 1 from public.attempts where topic_id=item->>'id') and old->'checks' is distinct from item->'checks' then raise exception 'Question bank has attempts and is immutable.';end if;
 for q in select * from jsonb_array_elements((item->'checks')||case when item ? 'practice' then jsonb_build_array(item->'practice') else '[]'::jsonb end) loop
 if length(trim(coalesce(q->>'prompt','')))=0 or jsonb_typeof(q->'choices') is distinct from 'array' or jsonb_array_length(q->'choices')<>4 or (select count(distinct trim(value)) from jsonb_array_elements_text(q->'choices'))<>4 or jsonb_typeof(q->'answer') is distinct from 'number' or (q->>'answer')::int<0 or (q->>'answer')::int>3 or length(trim(coalesce(q->>'explanation','')))=0 then raise exception 'Invalid learning question.';end if;
 end loop;
 item:=(item-'videos'-'sectionId'-'order')||jsonb_strip_nulls(jsonb_build_object('videos',old->'videos','sectionId',old->'sectionId','order',old->'order'));
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
revoke all on function public.learning_command(jsonb) from public,anon;
grant execute on function public.learning_command(jsonb) to authenticated;
commit;
