# Banco de dados — GlicoNexo

## Status

**Nenhuma migration foi criada ainda.** Este documento registra o modelo
de dados planejado (`CLAUDE.md`, seções 11 e 12) para orientar a Fase 2
(banco e autenticação), que ainda não foi executada nesta entrega.

Nenhum projeto Supabase real está conectado a este repositório.
**Decisão registrada em 2026-08-28:** o responsável pelo produto vai usar
uma conta Supabase e Vercel própria (ainda a ser criada/informada) — os
projetos Supabase já existentes na conta usada por este agente
(`Life Book - APP`, `eae-os`) **não devem ser usados** para o GlicoNexo.
A Fase 2 fica bloqueada até essa conta/projeto ser informado. Antes de
criar migrations, também é necessário confirmar que nenhum dado real
do TCC será usado como seed (apenas dados sintéticos e claramente
fictícios).

## Modelo de dados planejado

### `profiles`

```text
id uuid primary key references auth.users(id) on delete cascade
display_name text null
timezone text not null default 'America/Sao_Paulo'
onboarding_completed_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `user_preferences`

```text
user_id uuid primary key references auth.users(id) on delete cascade
glucose_unit text not null default 'mg/dL'
target_min_mg_dl smallint null
target_max_mg_dl smallint null
theme text not null default 'system'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Restrições: unidade do MVP deve ser `mg/dL`; quando as duas metas
existirem, `target_min_mg_dl < target_max_mg_dl`; valores entre 1 e 999;
tema em `light`, `dark` ou `system`.

### `glucose_measurements`

```text
id uuid primary key
user_id uuid not null references auth.users(id) on delete cascade
value_mg_dl smallint not null
measured_at timestamptz not null
timezone text not null
context text not null
meal_relation text not null default 'nao_informado'
source text not null
ocr_confidence real null
ocr_engine_version text null
notes text null
version integer not null default 1
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
deleted_at timestamptz null
```

Restrições: `value_mg_dl` entre 1 e 999 (já validado no cliente via
`src/features/measurements/schemas.ts`); `context` limitado à lista em
`src/features/measurements/constants.ts`; `meal_relation` em `antes`,
`depois`, `nao_informado`; `source` em `manual`, `ocr`; `ocr_confidence`
entre 0 e 1 quando presente; observação com limite de 1000 caracteres;
índice por `(user_id, measured_at desc)`; índice por `(user_id,
updated_at)` para sincronização; `updated_at` atualizado por trigger;
UUID gerado no cliente também aceito pelo banco.

### `consent_records`

```text
id uuid primary key
user_id uuid not null references auth.users(id) on delete cascade
consent_type text not null
document_version text not null
accepted_at timestamptz not null
revoked_at timestamptz null
created_at timestamptz not null default now()
```

Guardar somente informações necessárias para demonstrar o aceite. Nunca
registrar valor glicêmico em logs de consentimento.

### Eventos técnicos (opcional)

Se houver tabela de auditoria, registrar apenas eventos como login,
exportação, exclusão de conta e falha de sincronização — nunca valores
glicêmicos, observações ou conteúdo de relatório.

## Row Level Security (planejado)

RLS deve ser ativado em todas as tabelas de usuário, com políticas que
comparam sempre com `auth.uid()` (nunca confiar em `user_id` enviado pelo
cliente):

- `profiles`: `auth.uid() = id` para leitura e alteração.
- `user_preferences`: `auth.uid() = user_id`.
- `glucose_measurements`: `auth.uid() = user_id` para select, insert,
  update e delete, com `WITH CHECK` em insert/update.
- `consent_records`: `auth.uid() = user_id`.
- Negar tudo por padrão; nenhuma tabela sensível exposta ao papel
  anônimo; `service_role` apenas em função server-side auditada.

### Testes de RLS obrigatórios (a implementar na Fase 2)

1. Usuário A cria e lê a própria medição.
2. Usuário A não lê a medição do usuário B.
3. Usuário A não altera nem exclui a medição do usuário B.
4. Usuário A não consegue inserir registro com `user_id` de B.
5. Usuário anônimo não acessa medições.
6. Exclusão da conta remove os dados vinculados conforme a política.

## Banco local (IndexedDB)

Planejado para a Fase 3, substituindo o SQLite do TCC original por
IndexedDB (via Dexie), com stores `measurements`, `outbox`,
`sync_metadata`, `cached_profile`, `cached_preferences`. Nunca usar
`localStorage` para medições — apenas para preferências não sensíveis
(hoje, apenas a preferência de tema em `THEME_STORAGE_KEY`).

## Nota sobre `U.C` e `U.D`

Os campos `U.C` e `U.D` citados na planilha de exemplo do TCC não têm
significado definido nos documentos-fonte. Eles **não fazem parte deste
modelo de dados** e não devem ser adicionados sem validação formal com o
responsável pelo produto e um profissional de saúde.
