-- Automotive foundation: vehicles owned by the existing client directory.
-- Additive, no changes to properties, customers, jobs, estimates, payments or company settings.
-- A VIN identifies a vehicle; it is NOT a primary key and is not unique across ownership histories.

create table public.automotive_vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  client_id uuid not null,
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  year integer check (year is null or year between 1886 and 2200),
  make text check (make is null or length(btrim(make)) between 1 and 80),
  model text check (model is null or length(btrim(model)) between 1 and 80),
  trim text check (trim is null or length(btrim(trim)) between 1 and 80),
  engine text check (engine is null or length(btrim(engine)) between 1 and 120),
  license_plate text check (license_plate is null or length(btrim(license_plate)) between 1 and 32),
  plate_region text check (plate_region is null or length(btrim(plate_region)) between 1 and 40),
  odometer_value integer check (odometer_value is null or odometer_value >= 0),
  odometer_unit text not null default 'mi' check (odometer_unit in ('mi', 'km')),
  odometer_recorded_at timestamptz,
  notes text check (notes is null or length(notes) <= 4000),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  constraint automotive_vehicles_client_fkey
    foreign key (company_id, client_id) references public.clients (company_id, id)
    on delete restrict,
  constraint automotive_odometer_timestamp check (
    odometer_value is null or odometer_recorded_at is not null
  )
);

create index automotive_vehicles_client_idx
  on public.automotive_vehicles (company_id, client_id, archived_at, created_at desc);
create index automotive_vehicles_vin_idx on public.automotive_vehicles (company_id, vin)
  where vin is not null;
create index automotive_vehicles_plate_idx on public.automotive_vehicles (company_id, lower(license_plate))
  where license_plate is not null;

select private.add_touch_triggers(array['automotive_vehicles']);

-- No client-portal or public access. Owners, office, and sales estimators can maintain vehicle
-- records only while their active membership includes the Sales permission. This protects custom
-- roles that disable that area and prevents field/subcontractor access.
alter table public.automotive_vehicles enable row level security;

create policy automotive_vehicles_select on public.automotive_vehicles for select to authenticated
  using (
    private.has_role(company_id, '{owner,admin,office,estimator}')
    and private.has_perm(company_id, 'sales')
  );
create policy automotive_vehicles_insert on public.automotive_vehicles for insert to authenticated
  with check (
    private.has_role(company_id, '{owner,admin,office,estimator}')
    and private.has_perm(company_id, 'sales')
  );
create policy automotive_vehicles_update on public.automotive_vehicles for update to authenticated
  using (
    private.has_role(company_id, '{owner,admin,office,estimator}')
    and private.has_perm(company_id, 'sales')
  )
  with check (
    private.has_role(company_id, '{owner,admin,office,estimator}')
    and private.has_perm(company_id, 'sales')
  );
-- Vehicles with service histories should be archived, not hard-deleted. There is no user DELETE
-- policy. Only trusted administrative processes can purge them under a reviewed retention policy.

grant select, insert, update on public.automotive_vehicles to authenticated;
grant all on public.automotive_vehicles to service_role;
revoke all on public.automotive_vehicles from anon;

comment on table public.automotive_vehicles is
  'Automotive customer vehicles. No public/customer-portal access. Does not replace Crewtavo property assets.';
comment on column public.automotive_vehicles.vin is
  'Optional normalized 17-character VIN. Not used as the primary key and not guaranteed globally unique.';

notify pgrst, 'reload schema';
