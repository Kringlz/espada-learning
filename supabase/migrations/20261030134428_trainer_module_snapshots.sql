begin;
-- Module sessions can each have one pending retry. Counts remain device-reported,
-- separate from teacher marks; topic passing additionally requires full coverage.
create or replace function access_private.save_trainer_practice(p_device uuid,p_items jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); item jsonb; right_n integer; wrong_n integer; done_n integer; ended boolean; stamp timestamptz; module_n integer; covered_n integer; expected_n integer; expected jsonb:='{"A05-01":4,"A05-02":3,"A05-03":4,"A05-04":4,"G05-01":5,"G05-02":3,"A06-01":7,"A06-02":10,"A06-03":7,"A06-04":6,"A06-05":2,"A06-06":4,"G06-01":3,"A07-01":4,"A07-02":2,"A07-03":4,"A07-04":2,"A07-05":5,"A07-06":2,"A07-07":4,"A07-08":5,"G07-01":6,"G07-02":3,"A08-01":4,"A08-02":2,"A08-03":5,"A08-04":4,"A08-05":3,"G08-01":9,"G08-02":3,"G08-03":8,"A09-01":4,"A09-02":3,"A09-03":4,"A09-04":5,"A09-05":2,"A09-06":9,"G09-01":5,"G09-02":2,"A10-01":6,"A10-02":3,"A10-03":3,"A10-04":6,"A10-05":3,"A10-06":4,"A10-07":5,"G10-01":3,"G10-02":6,"A11-01":3,"A11-02":4,"A11-03":3,"A11-04":4,"A11-05":4,"G11-01":7,"G11-02":8}'::jsonb;
begin
 if actor is null or not exists(select 1 from public.profiles where id=actor and active and role='student') then raise exception 'Только ученик сохраняет свою практику.'; end if;
 if p_device is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>55 or octet_length(p_items::text)>30000 then raise exception 'Некорректная сводка практики.'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if not exists(select 1 from public.progress_banks where topic_id=item->>'topicId') then raise exception 'Неизвестная тема.'; end if;
  if jsonb_typeof(item->'correct') is distinct from 'number' or jsonb_typeof(item->'incorrect') is distinct from 'number' or jsonb_typeof(item->'completed') is distinct from 'number' or jsonb_typeof(item->'finished') is distinct from 'boolean' then raise exception 'Некорректные счётчики.'; end if;
  if (item->>'correct')::numeric<>trunc((item->>'correct')::numeric) or (item->>'incorrect')::numeric<>trunc((item->>'incorrect')::numeric) or (item->>'completed')::numeric<>trunc((item->>'completed')::numeric) then raise exception 'Счётчики должны быть целыми.'; end if;
  right_n:=(item->>'correct')::int;wrong_n:=(item->>'incorrect')::int;done_n:=(item->>'completed')::int;ended:=(item->>'finished')::boolean;stamp:=(item->>'updatedAt')::timestamptz;
  module_n:=1;covered_n:=1;
  if item ? 'moduleCount' then
   expected_n:=(expected->>(item->>'topicId'))::integer;
   if jsonb_typeof(item->'moduleCount') is distinct from 'number' or jsonb_typeof(item->'coveredModules') is distinct from 'number' then raise exception 'Некорректные модули.'; end if;
   if (item->>'moduleCount')::numeric is distinct from expected_n::numeric or (item->>'coveredModules')::numeric<>trunc((item->>'coveredModules')::numeric) then raise exception 'Некорректные модули.'; end if;
   module_n:=expected_n;covered_n:=(item->>'coveredModules')::integer;
   if covered_n not between 0 and module_n then raise exception 'Некорректный охват модулей.'; end if;
   ended:=ended and covered_n=module_n;
  end if;
  if stamp is null or stamp>now()+interval '5 minutes' or done_n not between greatest(0,right_n+wrong_n-module_n) and right_n+wrong_n then raise exception 'Некорректная сводка практики.'; end if;
  insert into public.trainer_practice(student_id,device_id,topic_id,correct,incorrect,completed,finished,passed,observed_at)
  values(actor,p_device,item->>'topicId',right_n,wrong_n,done_n,ended,ended and done_n>=15 and right_n::bigint*5>=(right_n::bigint+wrong_n)*4,stamp)
  on conflict(student_id,device_id,topic_id) do update set correct=excluded.correct,incorrect=excluded.incorrect,completed=excluded.completed,finished=excluded.finished,passed=public.trainer_practice.passed or excluded.passed,observed_at=excluded.observed_at,received_at=now()
  where excluded.observed_at>public.trainer_practice.observed_at;
 end loop;
end $$;
commit;
