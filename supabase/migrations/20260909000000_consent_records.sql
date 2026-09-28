-- consent_records: registro do aceite de termos/política de privacidade
-- (CLAUDE.md, seções 11.4 e 12). Guarda somente o necessário para provar
-- o aceite; nunca deve receber valor glicemico, observação ou conteúdo
-- de relatório.

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (user_id, consent_type, document_version)
);

create index if not exists consent_records_user_id_idx
  on public.consent_records (user_id);

alter table public.consent_records enable row level security;

-- Nega tudo por padrão (nenhuma policy = nenhum acesso); as policies
-- abaixo liberam apenas o dono do registro, nunca o papel anonimo.

create policy "consent_records_select_own"
  on public.consent_records
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "consent_records_insert_own"
  on public.consent_records
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "consent_records_update_own"
  on public.consent_records
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
