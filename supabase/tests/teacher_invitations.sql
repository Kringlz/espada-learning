-- Run only against the disposable local DB and Auth shim.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000009001','admin@invites.test',now()),
 ('00000000-0000-4000-8000-000000009002','new@invites.test',now()),
 ('00000000-0000-4000-8000-000000009003','student@invites.test',now()),
 ('00000000-0000-4000-8000-000000009004','unconfirmed@invites.test',null),
 ('00000000-0000-4000-8000-000000009005','outsider@invites.test',now()),
 ('00000000-0000-4000-8000-000000009006','revoked@invites.test',now()),
 ('00000000-0000-4000-8000-000000009007','expired@invites.test',now()),
 ('00000000-0000-4000-8000-000000009008','disabled@invites.test',now());
insert into public.profiles(id,name,role,active) values
 ('00000000-0000-4000-8000-000000009001','Admin','admin',true),
 ('00000000-0000-4000-8000-000000009003','Existing pupil','student',true),
 ('00000000-0000-4000-8000-000000009005','Outsider','student',true),
 ('00000000-0000-4000-8000-000000009008','Disabled','student',true);
insert into public.classes(id,name) values('00000000-0000-4000-8000-000000009010','Previous class');
insert into public.class_memberships values('00000000-0000-4000-8000-000000009010','00000000-0000-4000-8000-000000009003');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009001',true);
select public.manage_teacher_invitation('grant',' NEW@Invites.Test ','New teacher');
select public.manage_teacher_invitation('grant','student@invites.test','Existing teacher');
select public.manage_teacher_invitation('grant','unconfirmed@invites.test','Not yet');
select public.manage_teacher_invitation('grant','revoked@invites.test','Revoked');
select public.manage_teacher_invitation('grant','expired@invites.test','Expired');
select public.manage_teacher_invitation('grant','disabled@invites.test','Disabled');
do $$ declare items jsonb; begin
 items:=public.manage_teacher_invitation('list'); assert jsonb_array_length(items)=6;
 perform public.manage_teacher_invitation('revoke',p_id:=(select (x->>'id')::uuid from jsonb_array_elements(items) x where x->>'email'='revoked@invites.test'));
 begin perform public.manage_teacher_invitation('grant','bad','Invalid'); raise exception 'invalid email accepted'; exception when raise_exception then if sqlerrm='invalid email accepted' then raise; end if; end;
end $$;
reset role;
update access_private.teacher_invitations set expires_at=now()-interval '1 second' where email='expired@invites.test';
update public.profiles set active=false where id='00000000-0000-4000-8000-000000009008';

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009005',true);
do $$ begin
 assert not public.claim_teacher_invitation(), 'No invitation must not create access';
 begin perform public.manage_teacher_invitation('grant','intruder@invites.test','Intruder'); raise exception 'unauthorized grant'; exception when raise_exception then assert sqlerrm='Действие доступно только администратору.'; end;
 begin perform public.manage_teacher_invitation('list'); raise exception 'unauthorized list'; exception when raise_exception then assert sqlerrm='Действие доступно только администратору.'; end;
 begin perform access_private.teacher_invitation_manage('list'); raise exception 'private helper bypass'; exception when raise_exception then assert sqlerrm='Действие доступно только администратору.'; end;
 begin perform * from access_private.teacher_invitations; raise exception 'direct table access'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009004',true);
do $$ begin assert not public.claim_teacher_invitation(), 'Unconfirmed email cannot claim'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009006',true);
do $$ begin assert not public.claim_teacher_invitation(), 'Revoked invitation cannot claim'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009007',true);
do $$ begin assert not public.claim_teacher_invitation(), 'Expired invitation cannot claim'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009008',true);
do $$ begin assert not public.claim_teacher_invitation(), 'Disabled account cannot be reactivated'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009002',true);
do $$ begin assert public.claim_teacher_invitation(), 'New confirmed user can claim'; assert not public.claim_teacher_invitation(), 'Invitation is single-use'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009003',true);
do $$ begin assert public.claim_teacher_invitation(), 'Existing student can claim'; assert public.current_role()='teacher'; assert not exists(select 1 from public.class_memberships where profile_id=auth.uid()), 'Former class membership must not become teacher access'; end $$;
reset role;
do $$ begin
 assert (select role='teacher' and name='New teacher' from public.profiles where id='00000000-0000-4000-8000-000000009002');
 assert (select role='teacher' and name='Existing pupil' from public.profiles where id='00000000-0000-4000-8000-000000009003'), 'Existing display name stays unchanged';
 assert not exists(select 1 from public.class_memberships where profile_id in ('00000000-0000-4000-8000-000000009002','00000000-0000-4000-8000-000000009003'));
 assert (select count(*)=2 from public.audit_events where actor_id in ('00000000-0000-4000-8000-000000009002','00000000-0000-4000-8000-000000009003') and payload->>'action'='teacher.invitation.accepted');
 assert not has_function_privilege('anon','public.claim_teacher_invitation()','execute');
 assert not has_function_privilege('anon','public.manage_teacher_invitation(text,text,text,uuid)','execute');
 assert not has_table_privilege('authenticated','access_private.teacher_invitations','select');
end $$;
update public.profiles set active=false where id='00000000-0000-4000-8000-000000009001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009001',true);
do $$ begin
 begin perform public.manage_teacher_invitation('list'); raise exception 'disabled admin'; exception when raise_exception then assert sqlerrm='Действие доступно только администратору.'; end;
end $$;
reset role;
rollback;
