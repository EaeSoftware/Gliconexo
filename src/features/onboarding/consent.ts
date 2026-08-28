/**
 * Identificador do tipo de consentimento registrado ao final do onboarding
 * (CLAUDE.md, seção 10.3: "consentimento para tratamento de dados de saúde
 * deve ser destacado, específico e revogável").
 */
export const PRIVACY_CONSENT_TYPE = "privacy_and_health_data";

/**
 * Versão do texto de privacidade/termos exibido no onboarding.
 * Placeholder até revisão jurídica formal (CLAUDE.md, seção 7 e 24):
 * atualizar esta constante sempre que o conteúdo de `/privacidade` ou
 * `/termos` mudar de forma relevante.
 */
export const PRIVACY_CONSENT_VERSION = "2026-08-28";
