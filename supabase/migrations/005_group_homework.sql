-- Group homework is issued atomically to the active roster at publication time.
-- Individual rows retain independent completion, while a shared ID identifies the group task.
create index assignments_group_task on public.assignments ((payload->>'groupAssignmentId'));

alter function public.learning_command(jsonb) rename to learning_command_v4;
revoke all on function public.learning_command_v4(jsonb) from public,anon,authenticated;
create function public.learning_command(command jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  actor uuid:=auth.uid(); r text:=public.current_role();
  group_id uuid; task_id uuid; group_name text; member uuid; row_id uuid;
  event_id uuid; previous jsonb; canonical jsonb; item jsonb; recipients uuid[];
  stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if r is null then raise exception 'Session expired or account disabled.'; end if;
  perform pg_advisory_xact_lock(831072);
  if command->>'type' = 'assignGroup' then
    if r not in ('teacher','admin') then raise exception 'Staff access required.'; end if;
    group_id := (command->>'classId')::uuid;
    task_id := (command->>'id')::uuid;
    select name into group_name from public.classes where id=group_id;
    if group_name is null or (r<>'admin' and not exists(
      select 1 from public.class_memberships where class_id=group_id and profile_id=actor
    )) then raise exception 'Эта группа недоступна. Выберите свою группу.'; end if;
    if task_id is null or coalesce(trim(command->>'reason'),'')='' or
       jsonb_typeof(command->'override') is distinct from 'boolean' or
       not exists(select 1 from public.topics where id=command->>'topicId') then
      raise exception 'Выберите тему и напишите задание для группы.';
    end if;
    canonical:=jsonb_build_object('type','assignGroup','id',task_id,'classId',group_id,
      'topicId',command->>'topicId','reason',trim(command->>'reason'),'override',command->'override');
    select payload into previous from public.audit_events where entity_id=task_id::text and payload->>'action'='group.assigned';
    if previous is not null then
      if previous->>'actorId' is distinct from actor::text or previous->'after' is distinct from canonical then
        raise exception 'Это задание уже отправлено с другими данными.';
      end if;
      return;
    end if;
    select array_agg(p.id) into recipients from public.class_memberships m join public.profiles p on p.id=m.profile_id
      where m.class_id=group_id and p.role='student' and p.active;
    if coalesce(cardinality(recipients),0)=0 then raise exception 'В группе нет активных учеников.'; end if;
    foreach member in array recipients loop
      row_id:=gen_random_uuid();
      item:=jsonb_build_object('id',row_id,'studentId',member,'classId',group_id,'className',group_name,
        'groupAssignmentId',task_id,'topicId',command->>'topicId','teacherId',actor,
        'reason',trim(command->>'reason'),'override',command->'override','at',stamp);
      insert into public.assignments values(row_id,member,command->>'topicId',item);
    end loop;
    -- The receipt contains no roster. It also prevents retries from assigning newly joined pupils.
    event_id:=gen_random_uuid();
    insert into public.audit_events values(event_id,actor,null,task_id::text,
      jsonb_build_object('id',event_id,'actorId',actor,'entityId',task_id,'action','group.assigned',
      'at',stamp,'before',null,'after',canonical,'reason',trim(command->>'reason')));
  else
    if command->>'type'='assign' and ((command->'assignment') ?| array['classId','className','groupAssignmentId']) then
      raise exception 'Используйте выдачу задания группе.';
    end if;
    perform public.learning_command_v4(command);
  end if;
end $$;
revoke all on function public.learning_command(jsonb) from public,anon;
grant execute on function public.learning_command(jsonb) to authenticated;
