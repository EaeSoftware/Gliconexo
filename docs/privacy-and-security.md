# Privacidade e segurança — GlicoNexo

Este documento resume as decisões de privacidade e segurança já aplicadas
e as que ainda estão pendentes. **Nada aqui declara conformidade legal
completa** — os textos de política de privacidade e termos de uso
(`src/app/(public)/privacidade`, `src/app/(public)/termos`) são rascunhos
explicitamente marcados como pendentes de revisão jurídica.

## Natureza dos dados

Medições de glicemia e demais dados de saúde são tratados como **dados
pessoais sensíveis**, nos termos da LGPD. O produto não realiza
diagnóstico, não prescreve tratamento, não calcula dose de insulina e não
substitui avaliação profissional — essa mensagem aparece na página
inicial, no onboarding e nas telas do app.

## Implementado nesta entrega

- Formulários usam validação Zod tanto no cliente quanto como contrato de
  tipos compartilhado (a validação equivalente no servidor/banco será
  adicionada junto das migrations, na Fase 2).
- `SUPABASE_SERVICE_ROLE_KEY` não é referenciada em nenhum código do
  cliente — apenas o padrão está documentado em `.env.example`.
- Nenhuma variável sensível usa o prefixo `NEXT_PUBLIC_*` além da URL e
  da chave anônima do Supabase (que são públicas por design).
- `prefers-reduced-motion` é respeitado globalmente (`globals.css`).
- Formulário de recuperação de senha sempre mostra uma mensagem genérica,
  para não confirmar se um e-mail existe na base.
- Nenhuma foto é capturada ou enviada nesta entrega (a funcionalidade de
  câmera ainda não existe).

## Pendente (fases seguintes)

- HTTPS em produção, cabeçalhos de segurança (`X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) e Content Security Policy
  compatível com câmera, worker de OCR e Supabase.
- Row Level Security e políticas descritas em `docs/database.md`.
- Rate limiting em rotas server-side sensíveis.
- Sanitização de observações antes de renderizar/exportar (relevante a
  partir da Fase 3, quando notas passam a ser persistidas e exibidas).
- Função server-side/Edge Function de exclusão de conta, validando o JWT
  e nunca confiando em `user_id` vindo do cliente.
- Garantia de que nenhuma medição apareça em analytics, logs, breadcrumbs
  de erro ou URLs (a ser verificado quando a telemetria for introduzida).
- Estratégia de cache do service worker: `cache-first` para ícones/fontes
  locais, `stale-while-revalidate` para recursos públicos,
  `network-only`/`no-store` para autenticação e operações sensíveis, sem
  cache de HTML autenticado com dados privados (Fase 8).
- Não armazenar a foto do glicosímetro por padrão; qualquer persistência
  futura de imagem exigirá consentimento específico e decisão explícita
  de produto.
- Limpeza dos dados locais (IndexedDB) por `user_id`, após logout
  concluído, quando a Fase 3 introduzir a persistência local.

## Retenção e exclusão

A política de retenção final ainda não foi definida — deve ser
documentada aqui antes da Fase 7 (relatórios e privacidade), junto da
implementação da exportação completa de dados e da exclusão de conta.

## Checklist de segurança para revisão contínua

Ver `CLAUDE.md`, seção 19 ("Segurança"), para a lista completa de testes
de segurança obrigatórios (isolamento entre usuários, acesso anônimo,
exposição de `service_role`, XSS via observações, vazamento de dados em
URLs/logs, cache indevido pelo service worker).
