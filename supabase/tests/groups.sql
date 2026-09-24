\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',message;end if;end $$;
create function pg_temp.assert_denied(statement text) returns void language plpgsql as $$ begin begin execute statement;exception when others then return;end;raise exception 'FAIL: statement was allowed: %',statement;end $$;
create function pg_temp.issue(patch jsonb default '{}'::jsonb) returns void language sql as $$
 select public.learning_command('{"type":"assignGroup","id":"00000000-0000-4000-8000-000000000800","classId":"00000000-0000-4000-8000-000000000006","topicId":"equivalent","reason":"Изучить урок и пройти проверку","override":true}'::jsonb || patch)
$$;
insert into auth.users values ('00000000-0000-4000-8000-000000000810');
insert into public.profiles values ('00000000-0000-4000-8000-000000000810','Отключённый ученик','student',false);
insert into public.class_memberships values ('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000810');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_denied($q$select pg_temp.issue('{"reason":" "}')$q$);
select pg_temp.assert_denied($q$select pg_temp.issue('{"topicId":"missing"}')$q$);
select pg_temp.assert_denied($q$select pg_temp.issue('{"override":"yes"}')$q$);
select pg_temp.assert_denied($q$select pg_temp.issue('{"classId":"00000000-0000-4000-8000-000000000007"}')$q$);
select pg_temp.issue();
select pg_temp.assert_true((select count(*)=2 from public.assignments where payload->>'groupAssignmentId'='00000000-0000-4000-8000-000000000800'),'active group roster receives homework');
select pg_temp.issue();
select pg_temp.assert_true((select count(*)=2 from public.assignments where payload->>'groupAssignmentId'='00000000-0000-4000-8000-000000000800'),'retry is idempotent');
select pg_temp.assert_denied($q$select pg_temp.issue('{"reason":"Different payload"}')$q$);
select pg_temp.assert_denied($q$select public.learning_command_v4('{"type":"assign"}')$q$);
select pg_temp.assert_denied($q$select public.learning_command('{"type":"assign","assignment":{"classId":"00000000-0000-4000-8000-000000000007"}}')$q$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select count(*)=1 from public.assignments where payload->>'groupAssignmentId'='00000000-0000-4000-8000-000000000800'),'student sees only own copy');
select pg_temp.assert_true((public.load_learning_state()->'classes'->0->>'name') is not null,'student can read group name');
select pg_temp.assert_denied($q$select pg_temp.issue()$q$);
select public.learning_command(jsonb_build_object('type','submitAttempt','attempt',jsonb_build_object(
 'id','00000000-0000-4000-8000-000000000811','studentId','00000000-0000-4000-8000-000000000001','topicId','equivalent',
 'answers',(select jsonb_agg(jsonb_build_object('questionId',q->>'id','choice',q->'answer','assisted',false)) from public.topics t, jsonb_array_elements(t.content->'checks') with ordinality as x(q,n) where t.id='equivalent' and n<=3)
)));
select pg_temp.assert_true((select payload->>'completedAt' is not null from public.assignments where payload->>'groupAssignmentId'='00000000-0000-4000-8000-000000000800'),'own completion recorded');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select payload->>'completedAt' is null from public.assignments where payload->>'groupAssignmentId'='00000000-0000-4000-8000-000000000800'),'classmate completion remains separate');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
select pg_temp.assert_denied($q$select pg_temp.issue()$q$);
select pg_temp.assert_true((select count(*)=0 from public.assignments),'unassigned teacher cannot read');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
select pg_temp.assert_denied($q$select pg_temp.issue('{"id":"00000000-0000-4000-8000-000000000812","classId":"00000000-0000-4000-8000-000000000007"}')$q$);
reset role;
update public.profiles set active=true where id='00000000-0000-4000-8000-000000000810';
insert into public.class_memberships values ('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select pg_temp.issue();
select pg_temp.assert_true((select count(*)=2 from public.assignments where payload->>'groupAssignmentId'='00000000-0000-4000-8000-000000000800'),'retry does not assign newly activated member');
select pg_temp.assert_denied($q$select pg_temp.issue('{"id":"00000000-0000-4000-8000-000000000813","classId":"00000000-0000-4000-8000-000000000007"}')$q$);
rollback;
\echo 'PASS: group homework, roster snapshot, retries, individual completion, and group permissions'
