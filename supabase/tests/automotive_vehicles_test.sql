-- Automotive vehicle table and access controls. Run through scripts/test-db.sh.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create schema avt;
grant usage on schema avt to authenticated, service_role;
create function avt.check(ok boolean, message text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAIL: %', message; end if;
  raise notice 'ok - %', message;
end $$;
create function avt.expect_error(p_sql text, message text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    raise notice 'ok - % (%)', message, sqlerrm;
    return;
  end;
  raise exception 'FAIL expected rejection: %', message;
end $$;
create function avt.changed(p_sql text) returns bigint language plpgsql as $$
declare changed_rows bigint;
begin
  execute p_sql;
  get diagnostics changed_rows = row_count;
  return changed_rows;
end $$;
grant execute on all functions in schema avt to authenticated, service_role;

insert into auth.users (id, email, raw_user_meta_data) values
  ('f8900000-0000-0000-0000-000000000001', 'owner@autotest.example', '{}'),
  ('f8900000-0000-0000-0000-000000000002', 'office@autotest.example', '{}'),
  ('f8900000-0000-0000-0000-000000000003', 'mechanic@autotest.example', '{}'),
  ('f8900000-0000-0000-0000-000000000004', 'outsider@autotest.example', '{}');

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select public.create_company('Other Auto', 'general') as other_co \gset
insert into public.clients (company_id, display_name) values (:'other_co', 'Other Client') returning id as other_client \gset
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.create_company('Demo Garage', 'general') as my_co \gset
insert into public.memberships (company_id, user_id, role) values
 (:'my_co', 'f8900000-0000-0000-0000-000000000002', 'office'),
 (:'my_co', 'f8900000-0000-0000-0000-000000000003', 'field_crew');
insert into public.clients (company_id, display_name) values (:'my_co', 'Local Customer') returning id as my_client \gset
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.automotive_vehicles
(company_id, client_id, vin, year, make, model, odometer_value, odometer_recorded_at)
values
(:'my_co', :'my_client', '1HGCM82633A004352', 2003, 'Honda', 'Accord', 115000, now())
returning id as my_vehicle \gset
select avt.check((select count(*) from public.automotive_vehicles where company_id = :'my_co') = 1, 'owner adds a vehicle');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id, vin) values (%L,%L,%L)',
 :'my_co', :'my_client', 'INVALID'
), 'invalid VIN is rejected');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id, odometer_value) values (%L,%L,-5)',
 :'my_co', :'my_client'
), 'negative odometer is rejected');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id, odometer_value) values (%L,%L,50)',
 :'my_co', :'my_client'
), 'odometer requires recorded-at timestamp');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id) values (%L,%L)',
 :'my_co', :'other_client'
), 'composite foreign key rejects cross-company client');
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select avt.check((select count(*) from public.automotive_vehicles) = 1, 'office sees local vehicle');
select avt.check(avt.changed(format(
 'update public.automotive_vehicles set license_plate = %L where id = %L',
 'AUTO123', :'my_vehicle'
)) = 1, 'office edits vehicle');
select avt.check(avt.changed(format('delete from public.automotive_vehicles where id = %L', :'my_vehicle')) = 0,
  'office cannot hard-delete vehicle');
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select avt.check((select count(*) from public.automotive_vehicles) = 0, 'field crew cannot list customer vehicle profiles');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id, make) values (%L,%L,%L)',
 :'my_co', :'my_client', 'Ford'
), 'field crew cannot create vehicle');
select avt.check(avt.changed(format(
 'update public.automotive_vehicles set model=%L where id=%L',
 'Changed', :'my_vehicle'
)) = 0, 'field crew cannot update vehicle');
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select avt.check((select count(*) from public.automotive_vehicles) = 0, 'other company cannot list local vehicles');
select avt.check(avt.changed(format(
 'update public.automotive_vehicles set model=%L where id=%L',
 'Cross-tenant change', :'my_vehicle'
)) = 0, 'other company cannot edit local vehicle');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id, make) values (%L,%L,%L)',
 :'my_co', :'my_client', 'Unauthorized'
), 'other company cannot insert under local company');
commit;

-- A custom office role without Sales permission cannot access the vehicles, even if their
-- base member_role is office.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.company_roles (company_id, name, base_role, permissions)
values (:'my_co', 'Office without sales', 'office', '{}') returning id as no_sales \gset
update public.memberships set role_id = :'no_sales'
where company_id = :'my_co' and user_id = 'f8900000-0000-0000-0000-000000000002';
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select avt.check((select count(*) from public.automotive_vehicles) = 0, 'custom office role without Sales cannot read vehicles');
select avt.expect_error(format(
 'insert into public.automotive_vehicles (company_id, client_id, make) values (%L,%L,%L)',
 :'my_co', :'my_client', 'Denied'
), 'custom office role without Sales cannot add vehicles');
commit;

-- Deleting a customer who has a vehicle would destroy service linkage, so archive instead.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f8900000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select avt.expect_error(format('delete from public.clients where id=%L', :'my_client'),
  'linked customer cannot be deleted');
select avt.check(avt.changed(format(
 'update public.automotive_vehicles set archived_at=now() where id=%L', :'my_vehicle'
)) = 1, 'vehicle can be archived without deleting history');
commit;
