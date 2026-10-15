-- Registros de consentimento (CLAUDE.md, seção 11.4).
-- Nunca deve conter valores glicêmicos, apenas metadados do aceite.

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  accepted_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index consent_records_user_id_idx
  on public.consent_records (user_id, created_at desc);

alter table public.consent_records enable row level security;

create policy "consent_records_select_own"
  on public.consent_records for select
  using (auth.uid() = user_id);

create policy "consent_records_insert_own"
  on public.consent_records for insert
  with check (auth.uid() = user_id);

create policy "consent_records_update_own"
  on public.consent_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
