-- Email ownership is verified by Auth. Invitations never grant group membership.
begin;
create schema if not exists access_private;
revoke all on schema access_private from public, anon, authenticated;
grant usage on schema access_private to authenticated;
create table access_private.teacher_invitations (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(trim(email))),
 name text not null check(length(trim(name)) between 1 and 80),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 revoked_at timestamptz,
 accepted_at timestamptz,
 accepted_by uuid references public.profiles(id) on delete set null
);
alter table access_private.teacher_invitations enable row level security;
revoke all on access_private.teacher_invitations from public,anon,authenticated;

create function access_private.teacher_invitation_manage(p_action text,p_email text default null,p_name text default null,p_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); invitation access_private.teacher_invitations; clean_email text:=lower(trim(coalesce(p_email,''))); clean_name text:=trim(coalesce(p_name,'')); event_id uuid; result jsonb;
begin
 -- Serialize with account/group commands, then check current access.
 perform pg_advisory_xact_lock(831072);
 if actor is null or not exists(select 1 from public.profiles where id=actor and role='admin' and active) then raise exception 'Действие доступно только администратору.'; end if;
 if p_action='grant' then
  if length(clean_email)>254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Проверьте адрес электронной почты.'; end if;
  if length(clean_name) not between 1 and 80 then raise exception 'Укажите имя — от 1 до 80 символов.'; end if;
  if exists(select 1 from auth.users u join public.profiles p on p.id=u.id where lower(u.email)=clean_email and (not p.active or p.role in ('admin','teacher'))) then raise exception 'У этого аккаунта уже есть доступ учителя либо аккаунт отключён.'; end if;
  insert into access_private.teacher_invitations(email,name,created_by) values(clean_email,clean_name,actor)
  on conflict(email) do update set name=excluded.name,created_by=actor,created_at=now(),expires_at=now()+interval '7 days',revoked_at=null,accepted_at=null,accepted_by=null
  returning * into invitation;
 elsif p_action='revoke' then
  update access_private.teacher_invitations set revoked_at=now() where id=p_id and accepted_at is null and revoked_at is null returning * into invitation;
  if invitation.id is null then raise exception 'Приглашение уже принято или отозвано. Обновите список.'; end if;
 elsif p_action<>'list' then raise exception 'Неизвестное действие.';
 end if;
 if p_action in ('grant','revoke') then
  event_id:=gen_random_uuid();
  insert into public.audit_events(id,actor_id,entity_id,payload) values(event_id,actor,invitation.id::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',invitation.id,'action','teacher.invitation.'||p_action,'at',now(),'after',jsonb_build_object('email',invitation.email),'before',null,'reason',''));
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'name',i.name,'expiresAt',i.expires_at,'status',case when i.accepted_at is not null then 'accepted' when i.revoked_at is not null then 'revoked' when i.expires_at<=now() then 'expired' else 'pending' end) order by i.created_at desc),'[]'::jsonb) into result from access_private.teacher_invitations i;
 return result;
end $$;

create function access_private.claim_teacher_invitation() returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); own_email text; invitation access_private.teacher_invitations; existing public.profiles; event_id uuid;
begin
 if actor is null then raise exception 'Сессия не найдена. Войдите снова.'; end if;
 perform pg_advisory_xact_lock(831072);
 select lower(trim(email)) into own_email from auth.users where id=actor and email_confirmed_at is not null for share;
 if own_email is null then return false; end if;
 select * into existing from public.profiles where id=actor for update;
 if existing.id is not null and (not existing.active or existing.role in ('teacher','admin')) then return false; end if;
 select * into invitation from access_private.teacher_invitations where email=own_email and revoked_at is null and accepted_at is null and expires_at>now() for update;
 if invitation.id is null then return false; end if;
 -- A former pupil's memberships must not turn into authority over classmates.
 delete from public.class_memberships where profile_id=actor;
 insert into public.profiles(id,name,role,active) values(actor,invitation.name,'teacher',true)
 on conflict(id) do update set role='teacher';
 update access_private.teacher_invitations set accepted_at=now(),accepted_by=actor where id=invitation.id;
 event_id:=gen_random_uuid();
 insert into public.audit_events(id,actor_id,entity_id,payload) values(event_id,actor,invitation.id::text,jsonb_build_object('id',event_id,'actorId',actor,'entityId',invitation.id,'action','teacher.invitation.accepted','at',now(),'before',jsonb_build_object('role',existing.role),'after',jsonb_build_object('role','teacher'),'reason',''));
 return true;
end $$;

create function public.manage_teacher_invitation(p_action text,p_email text default null,p_name text default null,p_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$ select access_private.teacher_invitation_manage(p_action,p_email,p_name,p_id) $$;
create function public.claim_teacher_invitation() returns boolean language sql security invoker set search_path='' as $$ select access_private.claim_teacher_invitation() $$;
revoke all on function access_private.teacher_invitation_manage(text,text,text,uuid),access_private.claim_teacher_invitation(),public.manage_teacher_invitation(text,text,text,uuid),public.claim_teacher_invitation() from public,anon,authenticated;
grant execute on function access_private.teacher_invitation_manage(text,text,text,uuid),access_private.claim_teacher_invitation(),public.manage_teacher_invitation(text,text,text,uuid),public.claim_teacher_invitation() to authenticated;
commit;
