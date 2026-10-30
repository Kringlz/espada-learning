begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create function public.classroom_member(p_class uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(public.current_role() in ('student','teacher','admin') and exists
 (select 1 from public.class_memberships where class_id=p_class and profile_id=auth.uid()),false)
$$;
revoke all on function public.classroom_member(uuid) from public,anon;
grant execute on function public.classroom_member(uuid) to authenticated;

create table public.classroom_sessions (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.classes on delete cascade,
 starts_at timestamptz not null,
 previous_starts_at timestamptz,
 topic text not null default '' check(length(topic)<=200),
 location text not null default '' check(length(location)<=500),
 meeting_url text not null default '' check(meeting_url='' or (meeting_url ~ '^https://[^[:space:]]+$' and length(meeting_url)<=2000)),
 cancelled boolean not null default false,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
create index classroom_sessions_group_time on public.classroom_sessions(class_id,starts_at);
create table public.classroom_messages (
 id uuid primary key,
 class_id uuid not null references public.classes on delete cascade,
 author_id uuid not null default auth.uid() references public.profiles,
 body text not null check(length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default clock_timestamp()
);
create index classroom_messages_group_time on public.classroom_messages(class_id,created_at desc,id desc);
alter table public.classroom_sessions enable row level security;
alter table public.classroom_messages enable row level security;
revoke all on public.classroom_sessions,public.classroom_messages from public,anon,authenticated;
grant select,insert,update on public.classroom_sessions to authenticated;
-- The client cannot forge the sender or the timestamp, including via direct REST.
grant select on public.classroom_messages to authenticated;
grant insert(id,class_id,body) on public.classroom_messages to authenticated;
create policy classroom_sessions_read on public.classroom_sessions for select to authenticated using(public.classroom_member(class_id));
create policy classroom_sessions_insert on public.classroom_sessions for insert to authenticated with check(public.current_role() in ('teacher','admin') and public.classroom_member(class_id));
create policy classroom_sessions_update on public.classroom_sessions for update to authenticated using(public.current_role() in ('teacher','admin') and public.classroom_member(class_id)) with check(public.current_role() in ('teacher','admin') and public.classroom_member(class_id));
create policy classroom_messages_read on public.classroom_messages for select to authenticated using(public.classroom_member(class_id));
create policy classroom_messages_insert on public.classroom_messages for insert to authenticated with check(public.classroom_member(class_id) and author_id=auth.uid());

-- Only names and roles of the requested group are exposed. Existing profile
-- policies intentionally do not expose classmates' full profile records.
create function private.classroom_roster(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.classroom_member(p_class) then raise exception 'Нет доступа к группе.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'role',p.role) order by p.name,p.id)
 from public.class_memberships m join public.profiles p on p.id=m.profile_id where m.class_id=p_class and p.active),'[]'::jsonb);
end $$;
revoke all on function private.classroom_roster(uuid) from public,anon;
grant execute on function private.classroom_roster(uuid) to authenticated;
create function public.classroom_read(p_class uuid, p_before timestamptz default null, p_before_id uuid default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare roster jsonb; msgs jsonb;
begin
 if not public.classroom_member(p_class) then raise exception 'Нет доступа к группе.' using errcode='42501'; end if;
 roster:=private.classroom_roster(p_class);
 select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object('author_name',coalesce((select x->>'name' from jsonb_array_elements(roster) x where x->>'id'=m.author_id::text),'Участник')) order by m.created_at,m.id),'[]'::jsonb) into msgs
 from (select * from public.classroom_messages where class_id=p_class and
 (p_before is null or (created_at,id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))) order by created_at desc,id desc limit 50) m;
 return jsonb_build_object('classId',p_class,'members',roster,'messages',msgs,
 'sessions',coalesce((select jsonb_agg(to_jsonb(s) order by s.starts_at,s.id) from public.classroom_sessions s where class_id=p_class and starts_at>=now()-interval '1 day'),'[]'::jsonb));
end $$;
create function public.classroom_send(p_class uuid,p_id uuid,p_body text) returns void
language plpgsql volatile security invoker set search_path='' as $$
begin
 if not public.classroom_member(p_class) then raise exception 'Нет доступа к группе.' using errcode='42501'; end if;
 if exists(select 1 from public.classroom_messages where id=p_id and class_id=p_class and author_id=auth.uid() and body=trim(p_body)) then return; end if;
 insert into public.classroom_messages(id,class_id,body) values(p_id,p_class,trim(p_body)) on conflict(id) do nothing;
 if not exists(select 1 from public.classroom_messages where id=p_id and class_id=p_class and author_id=auth.uid() and body=trim(p_body)) then raise exception 'Сообщение не сохранено.'; end if;
end $$;
create function public.classroom_save_session(p_class uuid,p_item jsonb) returns void
language plpgsql volatile security invoker set search_path='' as $$
declare old public.classroom_sessions; entity uuid:=(p_item->>'id')::uuid; stamp timestamptz:=(p_item->>'starts_at')::timestamptz;
begin
 if public.current_role() not in ('teacher','admin') or not public.classroom_member(p_class) then raise exception 'Нет доступа к расписанию.' using errcode='42501'; end if;
 select * into old from public.classroom_sessions where id=entity and class_id=p_class for update;
 if old.id is null then
   if coalesce((p_item->>'revision')::int,0)<>0 then raise exception 'Занятие изменено. Обновите расписание.'; end if;
   insert into public.classroom_sessions(id,class_id,starts_at,topic,location,meeting_url,cancelled)
   values(entity,p_class,stamp,coalesce(p_item->>'topic',''),coalesce(p_item->>'location',''),coalesce(p_item->>'meeting_url',''),coalesce((p_item->>'cancelled')::boolean,false));
 else
   if old.revision<>(p_item->>'revision')::int or p_item->>'revision' is null then raise exception 'Занятие изменено. Обновите расписание.'; end if;
   update public.classroom_sessions set starts_at=stamp,
    previous_starts_at=case when starts_at<>stamp then starts_at else previous_starts_at end,
    topic=coalesce(p_item->>'topic',''),location=coalesce(p_item->>'location',''),meeting_url=coalesce(p_item->>'meeting_url',''),
    cancelled=coalesce((p_item->>'cancelled')::boolean,false),revision=revision+1,updated_at=clock_timestamp()
    where id=entity and class_id=p_class;
 end if;
end $$;
revoke all on function public.classroom_read(uuid,timestamptz,uuid), public.classroom_send(uuid,uuid,text),public.classroom_save_session(uuid,jsonb) from public,anon;
grant execute on function public.classroom_read(uuid,timestamptz,uuid), public.classroom_send(uuid,uuid,text),public.classroom_save_session(uuid,jsonb) to authenticated;
commit;
