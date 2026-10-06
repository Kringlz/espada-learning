-- Self-service sign-up: teachers register directly, students join by group code,
-- parents link by student code. Administrator accounts remain non-self-serve.
begin;
alter table public.classes add column join_code text;
alter table public.classes add column schedule text not null default '';
alter table public.profiles add column code text;

create function public.generate_code() returns text language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare chars text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; result text:=''; i int;
begin
 for i in 1..7 loop result:=result||substr(chars,1+floor(random()*length(chars))::int,1); end loop;
 return result;
end $$;
create function public.generate_class_code() returns text language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare candidate text;
begin
 loop candidate:=public.generate_code(); exit when not exists(select 1 from public.classes where join_code=candidate); end loop;
 return candidate;
end $$;
create function public.generate_profile_code() returns text language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare candidate text;
begin
 loop candidate:=public.generate_code(); exit when not exists(select 1 from public.profiles where code=candidate); end loop;
 return candidate;
end $$;
revoke all on function public.generate_code(),public.generate_class_code(),public.generate_profile_code() from public,anon,authenticated;

update public.classes set join_code=public.generate_class_code() where join_code is null;
update public.profiles set code=public.generate_profile_code() where code is null;
alter table public.classes alter column join_code set not null;
alter table public.classes add constraint classes_join_code_unique unique(join_code);
alter table public.classes alter column join_code set default public.generate_class_code();
alter table public.profiles alter column code set not null;
alter table public.profiles add constraint profiles_code_unique unique(code);
alter table public.profiles alter column code set default public.generate_profile_code();

-- Called once, right after auth.signUp, before any profile exists for auth.uid().
create function public.register_profile(p_name text, p_role text, p_code text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); clean_name text:=trim(coalesce(p_name,'')); target_class uuid; target_student uuid; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); event_id uuid;
begin
 if actor is null then raise exception 'Сессия не найдена. Подтвердите почту и войдите снова.'; end if;
 perform pg_advisory_xact_lock(831072);
 if exists(select 1 from public.profiles where id=actor) then raise exception 'Профиль уже существует.'; end if;
 if length(clean_name)=0 then raise exception 'Укажите имя.'; end if;
 if p_role not in ('teacher','student','parent') then raise exception 'Недопустимая роль.'; end if;
 if p_role='teacher' then
  insert into public.profiles (id,name,role,active) values (actor,clean_name,'teacher',true);
 elsif p_role='student' then
  select id into target_class from public.classes where join_code=upper(trim(coalesce(p_code,'')));
  if target_class is null then raise exception 'Код группы не найден.'; end if;
  insert into public.profiles (id,name,role,active) values (actor,clean_name,'student',true);
  insert into public.class_memberships values (target_class,actor);
 else
  select id into target_student from public.profiles where code=upper(trim(coalesce(p_code,''))) and role='student' and active;
  if target_student is null then raise exception 'Код ученика не найден.'; end if;
  insert into public.profiles (id,name,role,active) values (actor,clean_name,'parent',true);
  insert into public.parent_links values (actor,target_student,clock_timestamp());
 end if;
 event_id:=gen_random_uuid();
 insert into public.audit_events values (event_id,actor,case when p_role='student' then actor else null end,actor::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',actor,'action','account.registered','at',stamp,'before',null,'after',jsonb_build_object('name',clean_name,'role',p_role),'reason',''));
end $$;
revoke all on function public.register_profile(text,text,text) from public,anon;
grant execute on function public.register_profile(text,text,text) to authenticated;

alter function public.learning_command(jsonb) rename to learning_command_v7;
revoke all on function public.learning_command_v7(jsonb) from public,anon,authenticated;
create function public.learning_command(command jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.current_role(); actor uuid:=auth.uid(); kind text:=command->>'type'; item jsonb; old jsonb; target uuid; entity uuid; parent uuid; member text; event_id uuid; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if r is null then raise exception 'Session expired or account disabled.'; end if;
 if r='parent' then raise exception 'Родителю доступен только просмотр.'; end if;
 perform pg_advisory_xact_lock(831072);
 if kind in ('enrollStudent','linkParent','createGroup','updateGroupSchedule','regenerateGroupCode') and r not in ('teacher','admin') then raise exception 'Staff access required.'; end if;
 if kind='enrollStudent' then
  entity:=(command->>'classId')::uuid;
  select id into target from public.profiles where code=upper(trim(coalesce(command->>'studentCode',''))) and role='student' and active;
  if not exists(select 1 from public.classes where id=entity) or (r<>'admin' and not exists(select 1 from public.class_memberships where class_id=entity and profile_id=actor)) then raise exception 'Нет доступа к этой группе.'; end if;
  if target is null then raise exception 'Код ученика не найден. Проверьте его в профиле ученика.'; end if;
  insert into public.class_memberships values(entity,target) on conflict do nothing;
  if found then
   event_id:=gen_random_uuid(); insert into public.audit_events values(event_id,actor,target,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','student.enrolled','at',stamp,'before',null,'after',jsonb_build_object('studentId',target),'reason',''));
  end if;
 elsif kind='linkParent' then
  target:=(command->>'studentId')::uuid;
  select id into parent from public.profiles where code=upper(trim(coalesce(command->>'parentCode',''))) and role='parent' and active;
  if not public.can_access_student(target) or not exists(select 1 from public.profiles where id=target and role='student' and active) or parent is null then raise exception 'Проверьте коды действующих аккаунтов ученика и родителя.'; end if;
  if coalesce((command->>'remove')::boolean,false) then delete from public.parent_links where parent_id=parent and student_id=target;
  else insert into public.parent_links values(parent,target,clock_timestamp()) on conflict(parent_id,student_id) do update set verified_at=excluded.verified_at; end if;
  event_id:=gen_random_uuid(); insert into public.audit_events values(event_id,actor,target,target::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',target,'action',case when coalesce((command->>'remove')::boolean,false) then 'parent.unlinked' else 'parent.linked' end,'at',stamp,'before',null,'after',command-'type','reason',''));
 elsif kind='createGroup' then
  entity:=(command->>'id')::uuid;
  if length(trim(coalesce(command->>'name','')))=0 then raise exception 'Укажите название группы.'; end if;
  insert into public.classes (id,name,schedule) values (entity,trim(command->>'name'),coalesce(command->>'schedule',''));
  if r='teacher' then insert into public.class_memberships values(entity,actor); end if;
  event_id:=gen_random_uuid(); insert into public.audit_events values(event_id,actor,null,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','group.created','at',stamp,'before',null,'after',jsonb_build_object('name',trim(command->>'name')),'reason',''));
 elsif kind='updateGroupSchedule' then
  entity:=(command->>'classId')::uuid;
  if not exists(select 1 from public.classes where id=entity) or (r<>'admin' and not exists(select 1 from public.class_memberships where class_id=entity and profile_id=actor)) then raise exception 'Нет доступа к этой группе.'; end if;
  if length(coalesce(command->>'schedule',''))>200 then raise exception 'Слишком длинное расписание.'; end if;
  update public.classes set schedule=coalesce(command->>'schedule','') where id=entity;
 elsif kind='regenerateGroupCode' then
  entity:=(command->>'classId')::uuid;
  if not exists(select 1 from public.classes where id=entity) or (r<>'admin' and not exists(select 1 from public.class_memberships where class_id=entity and profile_id=actor)) then raise exception 'Нет доступа к этой группе.'; end if;
  update public.classes set join_code=public.generate_class_code() where id=entity;
 elsif kind='saveClass' then
  if r<>'admin' then raise exception 'Administrator access required.'; end if;
  item:=command->'classroom'; entity:=(item->>'id')::uuid;
  if length(trim(coalesce(item->>'name','')))=0 then raise exception 'Class name required.'; end if;
  for member in select jsonb_array_elements_text(item->'teacherIds') loop if not exists(select 1 from public.profiles where id=member::uuid and role='teacher') then raise exception 'Invalid teacher.'; end if; end loop;
  for member in select jsonb_array_elements_text(item->'studentIds') loop if not exists(select 1 from public.profiles where id=member::uuid and role='student') then raise exception 'Invalid student.'; end if; end loop;
  insert into public.classes (id,name,schedule) values (entity,item->>'name',coalesce(item->>'schedule','')) on conflict(id) do update set name=excluded.name,schedule=excluded.schedule;
  delete from public.class_memberships where class_id=entity;
  insert into public.class_memberships select entity,x::uuid from jsonb_array_elements_text((item->'teacherIds')||(item->'studentIds')) x;
 elsif kind='saveProfile' then
  if r<>'admin' then raise exception 'Administrator access required.'; end if;
  item:=command->'profile'; entity:=(item->>'id')::uuid;
  if entity=actor and (item->>'role'<>'admin' or item->'active' is distinct from 'true'::jsonb) then raise exception 'Cannot remove your own administrator access.'; end if;
  if exists(select 1 from public.profiles where id=entity and role<>item->>'role') then raise exception 'Existing roles cannot be changed here.'; end if;
  select to_jsonb(p) into old from public.profiles p where id=entity;
  insert into public.profiles (id,name,role,active) values (entity,item->>'name',item->>'role',(item->>'active')::boolean) on conflict(id) do update set name=excluded.name,active=excluded.active;
  event_id:=gen_random_uuid(); insert into public.audit_events values(event_id,actor,null,entity::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',entity,'action','account.updated','at',stamp,'before',old,'after',item,'reason',''));
 else perform public.learning_command_v7(command);
 end if;
end $$;
revoke all on function public.learning_command(jsonb) from public,anon;
grant execute on function public.learning_command(jsonb) to authenticated;

alter function public.load_learning_state() rename to load_learning_state_v7;
revoke all on function public.load_learning_state_v7() from public,anon,authenticated;
create function public.load_learning_state() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; r text:=public.current_role();
begin
 if r is null then raise exception 'Session expired or account disabled.'; end if;
 result:=public.load_learning_state_v7();
 return result||jsonb_build_object(
 'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'joinCode',c.join_code,'schedule',c.schedule,
 'teacherIds',coalesce((select jsonb_agg(p.id) from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=c.id and p.role='teacher'),'[]'::jsonb),
 'studentIds',coalesce((select jsonb_agg(p.id) from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=c.id and p.role='student' and (r in ('teacher','admin') or public.can_access_student(p.id))),'[]'::jsonb))) from public.classes c where public.family_class_visible(c.id)),'[]'::jsonb)
 );
end $$;
revoke all on function public.load_learning_state() from public,anon;
grant execute on function public.load_learning_state() to authenticated;
commit;
