-- Aggregate teacher reports are separate from legacy per-question marks.
begin;
create table public.report_templates (
 id uuid primary key, family_id uuid not null, version integer not null check(version>0),
 content jsonb not null, unique(family_id,version)
);
create table public.teacher_reports (
 id uuid primary key, student_id uuid not null references public.profiles on delete cascade,
 template_id uuid not null references public.report_templates,
 status text not null check(status in ('draft','published')), revision integer not null check(revision>0), payload jsonb not null
);
create table public.report_reads (
 student_id uuid not null references public.profiles on delete cascade,
 report_id uuid not null references public.teacher_reports on delete cascade,
 revision integer not null, primary key(student_id,report_id)
);
alter table public.report_templates enable row level security;
alter table public.teacher_reports enable row level security;
alter table public.report_reads enable row level security;
create policy report_templates_read on public.report_templates for select to authenticated using(public.current_role() is not null);
create policy teacher_reports_read on public.teacher_reports for select to authenticated using(public.can_access_student(student_id) and (status='published' or public.current_role() in ('teacher','admin')));
create policy report_reads_read on public.report_reads for select to authenticated using(public.can_access_student(student_id));
grant select on public.report_templates,public.teacher_reports,public.report_reads to authenticated;

alter function public.load_learning_state() rename to load_learning_state_v3;
revoke all on function public.load_learning_state_v3() from public,anon,authenticated;
create function public.load_learning_state() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 result:=public.load_learning_state_v3();
 return result||jsonb_build_object(
  'reportTemplates',coalesce((select jsonb_agg(content order by family_id,version) from public.report_templates),'[]'::jsonb),
  'reports',coalesce((select jsonb_agg(payload) from public.teacher_reports where public.can_access_student(student_id) and (public.current_role()<>'student' or status='published')),'[]'::jsonb),
  'reportReads',coalesce((select jsonb_agg(jsonb_build_object('studentId',student_id,'reportId',report_id,'revision',revision)) from public.report_reads where public.can_access_student(student_id)),'[]'::jsonb)
 );
end $$;

alter function public.learning_command(jsonb) rename to learning_command_v3;
revoke all on function public.learning_command_v3(jsonb) from public,anon,authenticated;
create function public.learning_command(command jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
 r text:=public.current_role(); actor uuid:=auth.uid(); kind text:=command->>'type';
 item jsonb; old jsonb; template jsonb; area jsonb; row_result jsonb; scale jsonb;
 entity uuid; target uuid; family uuid; version_num integer; next_version integer;
 grade numeric; minimum numeric; maximum numeric; step_value numeric;
 c numeric; total numeric; rev integer; event_id uuid;
 stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if r is null then raise exception 'Session expired or account disabled.';end if;
 perform pg_advisory_xact_lock(831072);
 if kind='saveReportTemplate' then
  if r not in ('teacher','admin') then raise exception 'Staff access required.';end if;
  item:=command->'template';entity:=(item->>'id')::uuid;family:=(item->>'familyId')::uuid;
  if entity is null or family is null or coalesce(trim(item->>'name'),'')='' or jsonb_typeof(item->'version') is distinct from 'number' or (item->>'version')::numeric<>trunc((item->>'version')::numeric) or (item->>'version')::numeric<1 then raise exception 'Укажите название и версию шаблона.';end if;
  version_num:=(item->>'version')::int;
  if exists(select 1 from public.report_templates where id=entity) then raise exception 'Сохранённый шаблон неизменяем. Создайте новую версию.';end if;
  select coalesce(max(version),0)+1 into next_version from public.report_templates where family_id=family;
  if version_num<>next_version then raise exception 'Версия шаблона изменилась. Обновите страницу.';end if;
  scale:=item->'scale';
  if jsonb_typeof(scale->'min') is distinct from 'number' or jsonb_typeof(scale->'max') is distinct from 'number' or jsonb_typeof(scale->'step') is distinct from 'number' then raise exception 'Проверьте шкалу оценки.';end if;
  minimum:=(scale->>'min')::numeric;maximum:=(scale->>'max')::numeric;step_value:=(scale->>'step')::numeric;
  if minimum>=maximum or step_value<=0 or step_value>maximum-minimum then raise exception 'Проверьте шкалу оценки.';end if;
  if jsonb_typeof(item->'areas') is distinct from 'array' or jsonb_array_length(item->'areas')<1 or jsonb_array_length(item->'areas')>20 then raise exception 'Добавьте от 1 до 20 разделов.';end if;
  if (select count(distinct a->>'id') from jsonb_array_elements(item->'areas') a)<>jsonb_array_length(item->'areas') then raise exception 'Разделы должны иметь разные коды.';end if;
  for area in select * from jsonb_array_elements(item->'areas') loop
   if coalesce(trim(area->>'id'),'')='' or coalesce(trim(area->>'label'),'')='' or coalesce(trim(area->>'definition'),'')='' or coalesce(area->>'scope','') not in ('area','topic') or jsonb_typeof(area->'coverageConfirmed') is distinct from 'boolean' then raise exception 'Укажите название и содержание проверки раздела.';end if;
   if jsonb_typeof(area->'topicIds') is distinct from 'array' or jsonb_array_length(area->'topicIds')<1 then raise exception 'Свяжите раздел с темами программы.';end if;
   if (select count(distinct value) from jsonb_array_elements_text(area->'topicIds'))<>jsonb_array_length(area->'topicIds') or exists(select 1 from jsonb_array_elements_text(area->'topicIds') x where not exists(select 1 from public.topics where id=x)) then raise exception 'Выберите существующие темы без повторов.';end if;
   if area->>'scope'='topic' and (jsonb_array_length(area->'topicIds')<>1 or area->'coverageConfirmed' is distinct from 'true'::jsonb) then raise exception 'Подтвердите полный охват одной темы.';end if;
  end loop;
  insert into public.report_templates values(entity,family,version_num,item);
  event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,null,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','reportTemplate.created','at',stamp,'before',null,'after',item,'reason',''));
 elsif kind='saveReport' then
  if r not in ('teacher','admin') then raise exception 'Staff access required.';end if;
  item:=command->'report';entity:=(item->>'id')::uuid;target:=(item->>'studentId')::uuid;
  if not public.can_access_student(target) or not exists(select 1 from public.profiles where id=target and role='student' and active) then raise exception 'Student access denied.';end if;
  select payload into old from public.teacher_reports where id=entity;
  if jsonb_typeof(command->'expectedRevision') is distinct from 'number' or (command->>'expectedRevision')::numeric is distinct from coalesce((old->>'revision')::numeric,0) then raise exception 'Record changed. Refresh before publishing.';end if;
  if old is not null and (old->>'studentId' is distinct from item->>'studentId' or old->>'templateId' is distinct from item->>'templateId') then raise exception 'Ученик и шаблон сохранённой работы не меняются.';end if;
  if old->>'status'='published' and (coalesce(trim(command->>'reason'),'')='' or item->>'status' is distinct from 'published') then raise exception 'Для исправления опубликованного результата укажите причину.';end if;
  select content into template from public.report_templates where id=(item->>'templateId')::uuid;
  if template is null then raise exception 'Unknown template.';end if;
  if coalesce(item->>'date','')!~'^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date>current_date then raise exception 'Invalid assessment date.';end if;
  if jsonb_typeof(item->'grade') is distinct from 'number' then raise exception 'Укажите оценку учителя.';end if;
  grade:=(item->>'grade')::numeric;minimum:=(template->'scale'->>'min')::numeric;maximum:=(template->'scale'->>'max')::numeric;step_value:=(template->'scale'->>'step')::numeric;
  if grade<minimum or grade>maximum or abs((grade-minimum)/step_value-round((grade-minimum)/step_value))>0.00000001 then raise exception 'Оценка должна соответствовать шкале шаблона.';end if;
  if coalesce(item->>'status','') not in ('draft','published') or jsonb_typeof(item->'results') is distinct from 'array' or jsonb_array_length(item->'results')<>jsonb_array_length(template->'areas') then raise exception 'Заполните строку для каждого раздела.';end if;
  if (select count(distinct x->>'areaId') from jsonb_array_elements(item->'results') x)<>jsonb_array_length(template->'areas') then raise exception 'Разделы результата не должны повторяться.';end if;
  for area in select * from jsonb_array_elements(template->'areas') loop
   select x into row_result from jsonb_array_elements(item->'results') x where x->>'areaId'=area->>'id';
   if row_result is null then raise exception 'Не найден раздел работы.';end if;
   if row_result->'correct'='null'::jsonb and row_result->'total'='null'::jsonb then continue;end if;
   if jsonb_typeof(row_result->'correct') is distinct from 'number' or jsonb_typeof(row_result->'total') is distinct from 'number' then raise exception 'Заполните оба счётчика или оставьте оба пустыми.';end if;
   c:=(row_result->>'correct')::numeric;total:=(row_result->>'total')::numeric;
   if c<>trunc(c) or total<>trunc(total) or c<0 or total<1 or total>10000 or c>total then raise exception 'Проверьте количество правильных ответов и вопросов.';end if;
  end loop;
  rev:=coalesce((old->>'revision')::int,0)+1;
  item:=(item-'demo')||jsonb_build_object('revision',rev,'authorId',actor,'updatedAt',stamp,'createdAt',coalesce(old->>'createdAt',old->>'updatedAt',stamp));
  insert into public.teacher_reports values(entity,target,(item->>'templateId')::uuid,item->>'status',rev,item) on conflict(id) do update set status=excluded.status,revision=excluded.revision,payload=excluded.payload;
  event_id:=gen_random_uuid();insert into public.audit_events values(event_id,actor,target,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','report.saved','at',stamp,'before',old,'after',item,'reason',coalesce(command->>'reason','')));
 elsif kind='readReport' then
  if r<>'student' then raise exception 'Student access required.';end if;
  select payload into item from public.teacher_reports where id=(command->>'reportId')::uuid and student_id=actor and status='published';
  if item is null or jsonb_typeof(command->'revision') is distinct from 'number' or (item->>'revision')::numeric is distinct from (command->>'revision')::numeric then raise exception 'Результат изменился или недоступен. Обновите страницу.';end if;
  insert into public.report_reads values(actor,(item->>'id')::uuid,(item->>'revision')::int) on conflict(student_id,report_id) do update set revision=excluded.revision;
 else
  perform public.learning_command_v3(command);
 end if;
end $$;
revoke all on function public.load_learning_state(),public.learning_command(jsonb) from public,anon;
grant execute on function public.load_learning_state(),public.learning_command(jsonb) to authenticated;
commit;
