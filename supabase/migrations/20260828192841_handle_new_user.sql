-- Cria perfil e preferências automaticamente quando um usuário se cadastra
-- (evita depender do cliente para inicializar essas linhas).
-- security definer + search_path fixo: mitiga search_path hijacking; a
-- função roda com o dono da tabela (bypassa RLS de propósito, só nesta
-- inicialização) e não é exposta a `anon`/`authenticated`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
