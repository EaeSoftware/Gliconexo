# Banco de dados — GlicoNexo

## Status

O projeto Supabase do GlicoNexo é o `nbgvlydunappunuxlbgq` (o mesmo de
`NEXT_PUBLIC_SUPABASE_URL` e do MCP em `.mcp.json`). Os projetos de outras
contas (`Life Book - APP`, `linkfit-dev`, `eae-os`) **não devem ser usados**.

As migrations em `supabase/migrations/` usam os mesmos números de versão
registrados no banco (`supabase_migrations.schema_migrations`):

| Versão | Migration |
|---|---|
| `20260828191358` | `helpers` (`set_updated_at`) |
| `20260828191606` | `profiles` + RLS |
| `20260828191623` | `user_preferences` + RLS |
| `20260828192734` | `glucose_measurements` + RLS e índices |
| `20260828192827` | `consent_records` + RLS |
| `20260828192841` | `handle_new_user` (cria perfil e preferências no cadastro) |
| `20261015021929` | `consent_records_upsert` (default em `accepted_at` e `unique (user_id, consent_type, document_version)`) |

Ao criar uma migration nova, aplicar no banco e manter o arquivo local com
a versão que o banco registrou. Seeds só com dados sintéticos e claramente
fictícios, nunca dados reais do TCC.

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
accepted_at timestamptz not null default now()
revoked_at timestamptz null
created_at timestamptz not null default now()
unique (user_id, consent_type, document_version)
```

A restrição única permite que `recordTermsConsent` faça um upsert
idempotente a cada login sem duplicar nem sobrescrever o aceite.

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

IndexedDB (via Dexie) no lugar do SQLite do TCC original, um banco por
usuário (`gliconexo-<userId>`, ver `src/lib/db/schema.ts`). Nunca usar
`localStorage` para medições — apenas para preferências não sensíveis
(hoje, apenas a preferência de tema em `THEME_STORAGE_KEY`).

Versões do schema Dexie (sempre aditivas):

| Versão | Tabelas | Observação |
| --- | --- | --- |
| 1 | `measurements` | `id, measuredAt, updatedAt, deletedAt, context, source` |
| 2 | `preferences` | registro único (`id = "local"`) com a faixa pessoal |
| 3 | `ocrImages` | chave `measurementId`; guarda `{ measurementId, blob, mimeType, createdAt }` |

`ocrImages` (08/10/2026) guarda o recorte do visor que o usuário
confirmou, **só se ele deixou a opção "Guardar foto do visor neste
aparelho" ligada**. Fica fora de `measurements` para não pesar a leitura
do histórico e para não entrar nos exports CSV/JSON. A linha é apagada
quando a medição é excluída ou quando o usuário remove a foto, e some com
o banco inteiro no logout concluído e na exclusão de conta. **Não é
sincronizada** e não tem equivalente no PostgreSQL.

Planejado para a Fase 4 (ainda não existe): stores `outbox`,
`sync_metadata`, `cached_profile`, `cached_preferences`.

Sobre `consent_records.revoked_at`: a coluna existe, mas desde 08/10/2026
a interface não oferece mais o botão de revogar (ver
`docs/privacy-and-security.md`).

## Nota sobre `U.C` e `U.D`

Os campos `U.C` e `U.D` citados na planilha de exemplo do TCC não têm
significado definido nos documentos-fonte. Eles **não fazem parte deste
modelo de dados** e não devem ser adicionados sem validação formal com o
responsável pelo produto e um profissional de saúde.
