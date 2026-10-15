-- Ajusta consent_records para o aceite idempotente feito por
-- `recordTermsConsent` (src/lib/supabase/consent.ts): o upsert usa
-- `on conflict (user_id, consent_type, document_version)` e não envia
-- `accepted_at`. Sem a restrição única e o default, todo aceite falhava.

alter table public.consent_records
  alter column accepted_at set default now();

alter table public.consent_records
  add constraint consent_records_user_type_version_key
  unique (user_id, consent_type, document_version);
