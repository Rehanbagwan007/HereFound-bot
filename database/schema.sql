-- Supabase PostgreSQL schema for HereFound

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists flagged_violations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  reel_url text not null,
  reporter_username text not null,
  status text not null default 'pending',
  violation_type text,
  it_act_section text,
  confidence int,
  cyber_police_draft text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security for strict tenant isolation
alter table flagged_violations enable row level security;

create policy "Organizations can access own violations" on flagged_violations
  for select using (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);

create policy "Organizations can insert own violations" on flagged_violations
  for insert with check (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);

create policy "Organizations can update own violations" on flagged_violations
  for update using (org_id = current_setting('request.jwt.claims.org_id', true)::uuid)
  with check (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);

create policy "Organizations can delete own violations" on flagged_violations
  for delete using (org_id = current_setting('request.jwt.claims.org_id', true)::uuid);
