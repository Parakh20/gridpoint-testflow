-- Demo request leads from the marketing site.
-- Anon can INSERT (public form). No SELECT for anon key (service role reads via platform admin).
create table if not exists public.demo_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  company     text not null,
  phone       text,
  message     text,
  source      text default 'marketing_site'
);

alter table public.demo_requests enable row level security;

create policy "anon_insert_demo_request"
  on public.demo_requests
  for insert to anon
  with check (true);

create index demo_requests_created_at_idx
  on public.demo_requests (created_at desc);
