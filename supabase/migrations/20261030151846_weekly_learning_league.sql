begin;
-- Dated learning awards. Old, undated device totals are deliberately not backfilled.
-- Amounts and receipt times are server-owned. An event can be earned only once.
create table private.learning_reward_events (
 student_id uuid not null references public.profiles on delete cascade,
 event_key text not null check(length(event_key) between 1 and 510),
 kind text not null check(kind in ('question','video')),
 received_at timestamptz not null default clock_timestamp(),
 primary key(student_id,event_key)
);
create index learning_reward_week on private.learning_reward_events(student_id,received_at) include(kind);
alter table private.learning_reward_events enable row level security;
revoke all on private.learning_reward_events from public,anon,authenticated;

create function private.record_learning_rewards(p_events jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare e jsonb; k text; item text;
begin
 if auth.uid() is null or public.current_role() is distinct from 'student' then raise exception 'Нет доступа.' using errcode='42501'; end if;
 if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 then raise exception 'Invalid rewards' using errcode='22023'; end if;
 for e in select value from jsonb_array_elements(p_events) loop
  k:=e->>'kind'; item:=e->>'id';
  if k is null or k not in ('question','video') or item is null or length(item) not between 1 and 500
    or (k='video' and item !~ '^youtube:[A-Za-z0-9_-]{11}$')
    or (k='question' and item !~ '^(trainer|course|topic):[^[:space:]]+$') then raise exception 'Invalid reward' using errcode='22023'; end if;
  insert into private.learning_reward_events(student_id,event_key,kind) values(auth.uid(),k||':'||item,k) on conflict do nothing;
 end loop;
end $$;
create function public.record_learning_rewards(p_events jsonb) returns void
language sql security invoker set search_path='' as $$ select private.record_learning_rewards(p_events) $$;

create function private.classroom_league(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare week_start timestamptz := date_trunc('week',now() at time zone 'Asia/Bishkek') at time zone 'Asia/Bishkek'; board jsonb;
begin
 if auth.uid() is null or not public.classroom_member(p_class) then raise exception 'Нет доступа к группе.' using errcode='42501'; end if;
 with totals as (
  select p.id,p.name,coalesce(sum(case when e.kind='question' then 20 when e.kind='video' then 10 else 0 end),0) as points
  from public.class_memberships m join public.profiles p on p.id=m.profile_id
  left join private.learning_reward_events e on e.student_id=p.id and e.received_at>=week_start and e.received_at<week_start+interval '7 days'
  where m.class_id=p_class and p.role='student' and p.active group by p.id,p.name
 ), ranked as (select *,dense_rank() over(order by points desc) as rank from totals)
 select coalesce(jsonb_agg(to_jsonb(r) order by r.points desc,r.name,r.id),'[]'::jsonb) into board from ranked r;
 return jsonb_build_object('startsAt',week_start,'endsAt',week_start+interval '7 days','leaders',board);
end $$;
create function public.classroom_league(p_class uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.classroom_league(p_class) $$;
revoke all on function private.record_learning_rewards(jsonb), public.record_learning_rewards(jsonb), private.classroom_league(uuid), public.classroom_league(uuid) from public,anon;
grant execute on function private.record_learning_rewards(jsonb), public.record_learning_rewards(jsonb), private.classroom_league(uuid), public.classroom_league(uuid) to authenticated;
commit;
