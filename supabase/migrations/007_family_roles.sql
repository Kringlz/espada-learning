begin;
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('student','parent','teacher','admin'));
create table public.teacher_contacts (
 teacher_id uuid primary key references public.profiles on delete cascade,
 email text not null default '', phone text not null default '', hours text not null default '',
 check(length(email)<=160 and (email='' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 check(length(phone)<=40 and (phone='' or phone ~ '^[+0-9() .-]{3,40}$')),
 check(length(hours)<=200)
);
alter table public.teacher_contacts enable row level security;
create or replace function public.can_access_student(target uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(public.current_role()='admin' or (public.current_role()='student' and target=auth.uid()) or
 (public.current_role()='teacher' and exists(select 1 from public.class_memberships t join public.class_memberships s on t.class_id=s.class_id join public.profiles p on p.id=s.profile_id where t.profile_id=auth.uid() and s.profile_id=target and p.role='student')) or
 (public.current_role()='parent' and exists(select 1 from public.parent_links l join public.profiles p on p.id=l.student_id where l.parent_id=auth.uid() and l.student_id=target and l.verified_at is not null and p.role='student' and p.active)),false)
$$;
create function public.family_class_visible(target uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(public.current_role()='admin' or (public.current_role() in ('student','teacher') and exists(select 1 from public.class_memberships where class_id=target and profile_id=auth.uid())) or
 (public.current_role()='parent' and exists(select 1 from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=target and p.role='student' and public.can_access_student(p.id))),false)
$$;
create function public.family_profile_visible(target uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.current_role() is not null and (target=auth.uid() or public.current_role()='admin' or exists(select 1 from public.profiles p where p.id=target and (
 (p.role='student' and public.can_access_student(p.id)) or
 (p.role='teacher' and public.current_role() in ('parent','teacher') and exists(select 1 from public.class_memberships m where m.profile_id=p.id and public.family_class_visible(m.class_id))) or
 (p.role='parent' and public.current_role()='teacher' and exists(select 1 from public.parent_links l where l.parent_id=p.id and public.can_access_student(l.student_id))))))
$$;
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(public.family_profile_visible(id));
drop policy classes_read on public.classes;
create policy classes_read on public.classes for select to authenticated using(public.family_class_visible(id));
drop policy membership_read on public.class_memberships;
create policy membership_read on public.class_memberships for select to authenticated using(public.family_class_visible(class_id) and public.family_profile_visible(profile_id));
create policy parent_links_read on public.parent_links for select to authenticated using(public.current_role()='admin' or (public.current_role()='parent' and parent_id=auth.uid()) or (public.current_role()='teacher' and public.can_access_student(student_id)));
create policy teacher_contacts_read on public.teacher_contacts for select to authenticated using(public.family_profile_visible(teacher_id));
grant select on public.parent_links,public.teacher_contacts to authenticated;
revoke all on function public.family_class_visible(uuid),public.family_profile_visible(uuid) from public,anon;
grant execute on function public.family_class_visible(uuid),public.family_profile_visible(uuid) to authenticated;

alter function public.load_learning_state() rename to load_learning_state_v6;
revoke all on function public.load_learning_state_v6() from public,anon,authenticated;
create function public.load_learning_state() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; r text:=public.current_role();
begin
 if r is null then raise exception 'Session expired or account disabled.'; end if;
 result:=public.load_learning_state_v6();
 return result||jsonb_build_object(
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p where public.family_profile_visible(p.id)),'[]'::jsonb),
 'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,
 'teacherIds',coalesce((select jsonb_agg(p.id) from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=c.id and p.role='teacher'),'[]'::jsonb),
 'studentIds',coalesce((select jsonb_agg(p.id) from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=c.id and p.role='student' and (r in ('teacher','admin') or public.can_access_student(p.id))),'[]'::jsonb))) from public.classes c where public.family_class_visible(c.id)),'[]'::jsonb),
 'parentLinks',coalesce((select jsonb_agg(jsonb_build_object('parentId',parent_id,'studentId',student_id,'verifiedAt',verified_at)) from public.parent_links where verified_at is not null and (r='admin' or (r='parent' and parent_id=auth.uid()) or (r='teacher' and public.can_access_student(student_id)))),'[]'::jsonb),
 'teacherContacts',coalesce((select jsonb_agg(jsonb_build_object('teacherId',teacher_id,'email',email,'phone',phone,'hours',hours)) from public.teacher_contacts where public.family_profile_visible(teacher_id)),'[]'::jsonb),
 'assessments',coalesce((select jsonb_agg(payload) from public.assessments where public.can_access_student(student_id) and (r in ('teacher','admin') or status='published')),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(payload) from public.teacher_reports where public.can_access_student(student_id) and (r in ('teacher','admin') or status='published')),'[]'::jsonb)
 );
end $$;

alter function public.learning_command(jsonb) rename to learning_command_v6;
revoke all on function public.learning_command_v6(jsonb) from public,anon,authenticated;
create function public.learning_command(command jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r text:=public.current_role(); actor uuid:=auth.uid(); kind text:=command->>'type'; target uuid; group_id uuid; parent uuid; item jsonb; event_id uuid; stamp text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if r is null then raise exception 'Session expired or account disabled.'; end if;
 if r='parent' then raise exception 'Родителю доступен только просмотр.'; end if;
 perform pg_advisory_xact_lock(831072);
 if kind in ('enrollStudent','linkParent','saveTeacherContact') and r not in ('teacher','admin') then raise exception 'Staff access required.'; end if;
 if kind='enrollStudent' then
  group_id:=(command->>'classId')::uuid; target:=(command->>'studentId')::uuid;
  if not exists(select 1 from public.classes where id=group_id) or (r<>'admin' and not exists(select 1 from public.class_memberships where class_id=group_id and profile_id=actor)) then raise exception 'Нет доступа к этой группе.'; end if;
  if not exists(select 1 from public.profiles where id=target and role='student' and active) then raise exception 'Код ученика не найден.'; end if;
  insert into public.class_memberships values(group_id,target) on conflict do nothing;
  if found then
   event_id:=gen_random_uuid(); insert into public.audit_events values(event_id,actor,target,group_id::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',group_id,'action','student.enrolled','at',stamp,'before',null,'after',jsonb_build_object('studentId',target),'reason',''));
  end if;
 elsif kind='linkParent' then
  target:=(command->>'studentId')::uuid; parent:=(command->>'parentId')::uuid;
  if not public.can_access_student(target) or not exists(select 1 from public.profiles where id=target and role='student' and active) or not exists(select 1 from public.profiles where id=parent and role='parent' and active) then raise exception 'Проверьте коды аккаунтов и доступ к ученику.'; end if;
  if coalesce((command->>'remove')::boolean,false) then delete from public.parent_links where parent_id=parent and student_id=target;
  else insert into public.parent_links values(parent,target,clock_timestamp()) on conflict(parent_id,student_id) do update set verified_at=excluded.verified_at; end if;
  event_id:=gen_random_uuid(); insert into public.audit_events values(event_id,actor,target,target::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',target,'action',case when coalesce((command->>'remove')::boolean,false) then 'parent.unlinked' else 'parent.linked' end,'at',stamp,'before',null,'after',command-'type','reason',''));
 elsif kind='saveTeacherContact' then
  item:=command->'contact'; target:=(item->>'teacherId')::uuid;
  if (r<>'admin' and target is distinct from actor) or not exists(select 1 from public.profiles where id=target and role='teacher' and active) then raise exception 'Можно изменить только свои контакты.'; end if;
  insert into public.teacher_contacts values(target,item->>'email',item->>'phone',item->>'hours') on conflict(teacher_id) do update set email=excluded.email,phone=excluded.phone,hours=excluded.hours;
 else perform public.learning_command_v6(command);
 end if;
end $$;
revoke all on function public.load_learning_state(),public.learning_command(jsonb) from public,anon;
grant execute on function public.load_learning_state(),public.learning_command(jsonb) to authenticated;
commit;
