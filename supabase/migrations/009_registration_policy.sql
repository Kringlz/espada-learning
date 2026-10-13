-- Public signup is limited to students and parents. Existing staff keep their accounts.
begin;
create or replace function public.register_profile(p_name text, p_role text, p_code text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); clean_name text:=trim(coalesce(p_name,'')); target_class uuid; target_student uuid; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); event_id uuid;
begin
 if actor is null then raise exception 'Сессия не найдена. Подтвердите почту и войдите снова.'; end if;
 perform pg_advisory_xact_lock(831072);
 if p_role is null or p_role not in ('student','parent') then raise exception 'Самостоятельная регистрация учителей пока закрыта.'; end if;
 if exists(select 1 from public.profiles where id=actor and role=p_role and active) then return; end if;
 if exists(select 1 from public.profiles where id=actor) then raise exception 'Профиль уже существует.'; end if;
 if length(clean_name)=0 or length(clean_name)>80 then raise exception 'Укажите имя.'; end if;
 if p_role='student' then
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

commit;
