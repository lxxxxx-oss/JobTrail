create table if not exists public.applications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  current_stage text not null,
  applied_at date,
  source text,
  location text,
  salary_range text,
  job_url text,
  priority text not null,
  next_action text,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.application_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id text not null references public.applications(id) on delete cascade,
  type text not null,
  from_stage text,
  to_stage text,
  content text,
  occurred_at timestamptz not null
);

create index if not exists applications_user_updated_idx
  on public.applications(user_id, updated_at desc);

create index if not exists application_events_user_occurred_idx
  on public.application_events(user_id, occurred_at desc);

create index if not exists application_events_application_idx
  on public.application_events(application_id);

alter table public.applications enable row level security;
alter table public.application_events enable row level security;

drop policy if exists "Users can read own applications" on public.applications;
create policy "Users can read own applications"
  on public.applications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own applications" on public.applications;
create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read own application events" on public.application_events;
create policy "Users can read own application events"
  on public.application_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own application events" on public.application_events;
create policy "Users can insert own application events"
  on public.application_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own application events" on public.application_events;
create policy "Users can update own application events"
  on public.application_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own application events" on public.application_events;
create policy "Users can delete own application events"
  on public.application_events for delete
  using (auth.uid() = user_id);
