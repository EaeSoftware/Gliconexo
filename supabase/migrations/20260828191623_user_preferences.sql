-- Preferências do usuário (CLAUDE.md, seção 11.2).

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  glucose_unit text not null default 'mg/dL',
  target_min_mg_dl smallint,
  target_max_mg_dl smallint,
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_glucose_unit_check
    check (glucose_unit = 'mg/dL'),
  constraint user_preferences_theme_check
    check (theme in ('light', 'dark', 'system')),
  constraint user_preferences_target_min_range
    check (target_min_mg_dl is null or target_min_mg_dl between 1 and 999),
  constraint user_preferences_target_max_range
    check (target_max_mg_dl is null or target_max_mg_dl between 1 and 999),
  constraint user_preferences_target_order
    check (
      target_min_mg_dl is null
      or target_max_mg_dl is null
      or target_min_mg_dl < target_max_mg_dl
    )
);

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.set_updated_at();
