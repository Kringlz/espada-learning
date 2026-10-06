\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAIL: %',message;end if;end $$;
create function pg_temp.assert_denied(statement text) returns void language plpgsql as $$ begin begin execute statement;exception when others then return;end;raise exception 'FAIL: statement was allowed: %',statement;end $$;
insert into auth.users values
 ('00000000-0000-4000-8000-000000000900'),
 ('00000000-0000-4000-8000-000000000901'),
 ('00000000-0000-4000-8000-000000000902'),
 ('00000000-0000-4000-8000-000000000903'),
 ('00000000-0000-4000-8000-000000000904'),
 ('00000000-0000-4000-8000-000000000905');
-- Codes are handed over in person; a new account cannot read them under RLS.
select set_config('test.group_code',(select join_code from public.classes where id='00000000-0000-4000-8000-000000000006'),true);
select set_config('test.student_code',(select code from public.profiles where id='00000000-0000-4000-8000-000000000001'),true);
set local role authenticated;

-- A session with no profile yet cannot read learning state.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000900',true);
select pg_temp.assert_denied($q$select public.load_learning_state()$q$);

-- Teacher self-registration needs no code.
select public.register_profile('Новый учитель','teacher',null);
select pg_temp.assert_true((select role='teacher' and active and code is not null from public.profiles where id='00000000-0000-4000-8000-000000000900'),'teacher self-registers');
select pg_temp.assert_denied($q$select public.register_profile('Опять','teacher',null)$q$);

-- Nobody can self-register as admin.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000903',true);
select pg_temp.assert_denied($q$select public.register_profile('Хочу быть админом','admin',null)$q$);
select pg_temp.assert_true((select count(*)=0 from public.profiles where id='00000000-0000-4000-8000-000000000903'),'rejected admin self-registration leaves no profile');

-- Student self-registration by a bad group code is rejected; a good one enrolls them.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000901',true);
select pg_temp.assert_denied($q$select public.register_profile('Новый ученик','student','ZZZZZZZ')$q$);
select public.register_profile('Новый ученик','student',current_setting('test.group_code'));
select pg_temp.assert_true((select count(*)=1 from public.class_memberships where class_id='00000000-0000-4000-8000-000000000006' and profile_id='00000000-0000-4000-8000-000000000901'),'student joins group by code');

-- Parent self-registration by a bad student code is rejected; a good one links them.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000902',true);
select pg_temp.assert_denied($q$select public.register_profile('Новый родитель','parent','ZZZZZZZ')$q$);
select public.register_profile('Новый родитель','parent',current_setting('test.student_code'));
select pg_temp.assert_true((select count(*)=1 from public.parent_links where parent_id='00000000-0000-4000-8000-000000000902' and student_id='00000000-0000-4000-8000-000000000001' and verified_at is not null),'parent links by student code');

-- A teacher creates their own group and receives a join code.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.learning_command(jsonb_build_object('type','createGroup','id','00000000-0000-4000-8000-000000000904','name','Вечерняя группа','schedule','Вт, Чт 19:00'));
select pg_temp.assert_true((select join_code is not null and schedule='Вт, Чт 19:00' from public.classes where id='00000000-0000-4000-8000-000000000904'),'group created with code and schedule');
select pg_temp.assert_true((select count(*)=1 from public.class_memberships where class_id='00000000-0000-4000-8000-000000000904' and profile_id='00000000-0000-4000-8000-000000000003'),'creating teacher is a member');

-- Only a member teacher (or admin) may edit that group's schedule or code.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
select pg_temp.assert_denied($q$select public.learning_command(jsonb_build_object('type','updateGroupSchedule','classId','00000000-0000-4000-8000-000000000904','schedule','Захват'))$q$);
select pg_temp.assert_denied($q$select public.learning_command(jsonb_build_object('type','regenerateGroupCode','classId','00000000-0000-4000-8000-000000000904'))$q$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
select public.learning_command(jsonb_build_object('type','updateGroupSchedule','classId','00000000-0000-4000-8000-000000000904','schedule','Ср 20:00'));
select pg_temp.assert_true((select schedule='Ср 20:00' from public.classes where id='00000000-0000-4000-8000-000000000904'),'owning teacher updates schedule');
select public.learning_command(jsonb_build_object('type','regenerateGroupCode','classId','00000000-0000-4000-8000-000000000904'));

-- A teacher can still manually add an already-registered student to their group by code.
select pg_temp.assert_denied($q$select public.learning_command(jsonb_build_object('type','enrollStudent','classId','00000000-0000-4000-8000-000000000904','studentCode','ZZZZZZZ'))$q$);
select public.learning_command(jsonb_build_object('type','enrollStudent','classId','00000000-0000-4000-8000-000000000904','studentCode',(select code from public.profiles where id='00000000-0000-4000-8000-000000000901')));
select pg_temp.assert_true((select count(*)=1 from public.class_memberships where class_id='00000000-0000-4000-8000-000000000904' and profile_id='00000000-0000-4000-8000-000000000901'),'teacher enrolls existing student by code');

-- The internal version this migration superseded is no longer directly callable.
select pg_temp.assert_denied($q$select public.learning_command_v7('{"type":"saveTeacherContact"}')$q$);
select pg_temp.assert_denied($q$select public.load_learning_state_v7()$q$);
rollback;
\echo 'PASS: self-service registration, join codes, and group ownership checks'
