-- Medições de glicemia (CLAUDE.md, seção 11.3).

create table public.glucose_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  value_mg_dl smallint not null
    check (value_mg_dl between 1 and 999),
  measured_at timestamptz not null,
  timezone text not null,
  context text not null
    check (context in (
      'jejum', 'cafe_da_manha', 'almoco', 'lanche_da_tarde', 'jantar',
      'antes_de_dormir', 'madrugada', 'atividade_fisica', 'outro'
    )),
  meal_relation text not null default 'nao_informado'
    check (meal_relation in ('antes', 'depois', 'nao_informado')),
  source text not null
    check (source in ('manual', 'ocr')),
  ocr_confidence real
    check (ocr_confidence is null or ocr_confidence between 0 and 1),
  ocr_engine_version text,
  notes text
    check (notes is null or char_length(notes) <= 1000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index glucose_measurements_user_measured_at_idx
  on public.glucose_measurements (user_id, measured_at desc);

create index glucose_measurements_user_updated_at_idx
  on public.glucose_measurements (user_id, updated_at);

create index glucose_measurements_active_idx
  on public.glucose_measurements (user_id, measured_at desc)
  where deleted_at is null;

alter table public.glucose_measurements enable row level security;

create policy "glucose_measurements_select_own"
  on public.glucose_measurements for select
  using (auth.uid() = user_id);

create policy "glucose_measurements_insert_own"
  on public.glucose_measurements for insert
  with check (auth.uid() = user_id);

create policy "glucose_measurements_update_own"
  on public.glucose_measurements for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "glucose_measurements_delete_own"
  on public.glucose_measurements for delete
  using (auth.uid() = user_id);

create trigger set_glucose_measurements_updated_at
  before update on public.glucose_measurements
  for each row execute procedure public.set_updated_at();
