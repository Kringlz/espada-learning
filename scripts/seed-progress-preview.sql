-- Test-only: use the disposable local database, never hosted production.
insert into auth.users values('00000000-0000-4000-8000-000000000450') on conflict do nothing;
insert into public.profiles(id,name,role,active) values('00000000-0000-4000-8000-000000000450','Елена Морозова','parent',true) on conflict do nothing;
insert into public.parent_links values('00000000-0000-4000-8000-000000000450','00000000-0000-4000-8000-000000000001',now()) on conflict do nothing;
