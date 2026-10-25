begin;
-- Device-reported practice, deliberately separate from teacher marks and graded checks.
create table public.trainer_practice (
 student_id uuid not null references public.profiles(id) on delete cascade,
 device_id uuid not null,
 topic_id text not null,
 correct integer not null check(correct between 0 and 1000000),
 incorrect integer not null check(incorrect between 0 and 1000000),
 completed integer not null check(completed>=0 and completed<=correct+incorrect),
 finished boolean not null,
 passed boolean not null default false,
 observed_at timestamptz not null,
 received_at timestamptz not null default now(),
 primary key(student_id,device_id,topic_id)
);
alter table public.trainer_practice enable row level security;
revoke all on public.trainer_practice from public,anon,authenticated;
grant select on public.trainer_practice to authenticated;
create policy trainer_practice_read on public.trainer_practice for select to authenticated
using(public.can_access_student(student_id));

create function access_private.save_trainer_practice(p_device uuid,p_items jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item jsonb; right_n integer; wrong_n integer; done_n integer; ended boolean; stamp timestamptz;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and active and role='student') then raise exception 'Только ученик сохраняет свою практику.'; end if;
 if p_device is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>55 or octet_length(p_items::text)>30000 then raise exception 'Некорректная сводка практики.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if not exists(select 1 from public.progress_banks where topic_id=item->>'topicId') then raise exception 'Неизвестная тема.'; end if;
  if jsonb_typeof(item->'correct') is distinct from 'number' or jsonb_typeof(item->'incorrect') is distinct from 'number' or jsonb_typeof(item->'completed') is distinct from 'number' or jsonb_typeof(item->'finished') is distinct from 'boolean' then raise exception 'Некорректные счётчики.'; end if;
  if (item->>'correct')::numeric<>trunc((item->>'correct')::numeric) or (item->>'incorrect')::numeric<>trunc((item->>'incorrect')::numeric) or (item->>'completed')::numeric<>trunc((item->>'completed')::numeric) then raise exception 'Счётчики должны быть целыми.'; end if;
  right_n:=(item->>'correct')::int;wrong_n:=(item->>'incorrect')::int;done_n:=(item->>'completed')::int;ended:=(item->>'finished')::boolean;stamp:=(item->>'updatedAt')::timestamptz;
  if stamp is null or stamp>now()+interval '5 minutes' or done_n not between greatest(0,right_n+wrong_n-1) and right_n+wrong_n then raise exception 'Некорректная сводка практики.'; end if;
  insert into public.trainer_practice(student_id,device_id,topic_id,correct,incorrect,completed,finished,passed,observed_at)
  values(actor,p_device,item->>'topicId',right_n,wrong_n,done_n,ended,ended and done_n>=15 and right_n::bigint*5>=(right_n::bigint+wrong_n)*4,stamp)
  on conflict(student_id,device_id,topic_id) do update set correct=excluded.correct,incorrect=excluded.incorrect,completed=excluded.completed,finished=excluded.finished,passed=public.trainer_practice.passed or excluded.passed,observed_at=excluded.observed_at,received_at=now()
  where excluded.observed_at>public.trainer_practice.observed_at;
 end loop;
end $$;
create function public.save_trainer_practice(p_device uuid,p_items jsonb) returns void
language sql security invoker set search_path='' as $$ select access_private.save_trainer_practice(p_device,p_items) $$;
revoke all on function access_private.save_trainer_practice(uuid,jsonb),public.save_trainer_practice(uuid,jsonb) from public,anon,authenticated;
grant execute on function access_private.save_trainer_practice(uuid,jsonb),public.save_trainer_practice(uuid,jsonb) to authenticated;
commit;
