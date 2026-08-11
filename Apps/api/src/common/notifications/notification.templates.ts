import { NotificationType, UserRole, AccountInformation } from '@my-app/contract';

// French, hard-coded, one file — see Set 6 plan §6.1. There is no i18n infrastructure on the
// backend, and Telegram's audience is homogeneous internal staff. Not translated via
// translations.json (that is web-only, front-end-rules §6.B) — this is backend copy.

const ROLE_LABEL_FR: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.ACTIVATOR]: 'Activateur',
  [UserRole.DISTRIBUTOR]: 'Distributeur',
};

// French field labels — separate from activation.mapper.ts's English, admin-facing
// FIELD_LABEL. Not importable from common/ anyway (modules/ is off-limits), and it serves a
// different audience. Both are Record<AccountInformation, string>, so a new enum value breaks
// both at compile time (Set 6 plan §6.2).
export const FIELD_LABEL_FR: Record<AccountInformation, string> = {
  [AccountInformation.USERNAME]: "Nom d'utilisateur",
  [AccountInformation.EMAIL]: 'E-mail',
  [AccountInformation.PHONE_NUMBER]: 'Téléphone',
  [AccountInformation.OTP]: 'Code OTP',
  [AccountInformation.BIRTHDAY]: 'Date de naissance',
  [AccountInformation.PASSWORD]: 'Mot de passe',
};

// fr-FR, no explicit fraction options — mirrors Apps/web/src/lib/utils.ts formatDZD's shape
// (Intl.NumberFormat(locale).format(amount) + " DZD"), just without the language parameter
// this backend has no use for (A1: French only).
export function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} DZD`;
}

export function formatDateFR(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

// ─── The interpolation ALLOWLIST (Set 6 plan §6.4) ─────────────────────────────────────────
// A template may read only the fields declared in its TemplateVars entry — tsc rejects
// anything else. User.password, RefreshToken.tokenHash, JWTs, telegramLinkToken and every
// infra secret are absent from every entry below, on purpose, permanently.

export type TemplateVars = {
  [NotificationType.TELEGRAM_LINKED]: { name: string; role: UserRole };

  [NotificationType.ACTIVATION_CREATED]: {
    cardKeyMasked: string;
    subscriptionLabel: string;
    requestedAt: string; // ISO — formatted at render time via formatDateFR
  };

  // PASSWORD included, in the clear — D3 / Set 6 scope note (§6.5). Deliberate, not a leak.
  [NotificationType.ACTIVATION_INFORMATION_UPDATED]: {
    cardKey: string;
    clientFullName: string;
    accountFields: Array<{ label: string; value: string }>;
  };

  // OTP included, in the clear — D3 / Set 6 scope note (§6.5).
  [NotificationType.ACTIVATION_OTP_RECEIVED]: {
    cardKey: string;
    clientFullName: string;
    otpValue: string;
  };

  [NotificationType.ACTIVATION_STATUS_CHANGED]: {
    cardKey: string;
    clientFullName: string;
    durationText: string;
    outcome: 'ACTIVATED' | 'ACTIVATED_BY_ADMIN' | 'CANCELLED_BY_ADMIN';
    // Only set for the two ACTIVATED variants — null for CANCELLED_BY_ADMIN (§5.4.2).
    commission: string | null;
  };

  [NotificationType.ACTIVATION_FROZEN]: {
    cardKey: string;
    clientFullName: string;
    activatorName: string;
    durationText: string;
    freezeReason: string;
  };

  [NotificationType.ORDER_REQUEST_CREATED]: {
    distributorName: string;
    subscriptionLabel: string;
    nbOfCards: number;
  };

  [NotificationType.REVOCATION_REQUEST_CREATED]: {
    distributorName: string;
    cardKey: string;
    subscriptionLabel: string;
    reason: string;
  };

  [NotificationType.ORDER_CREATED]: {
    orderNumber: string;
    nbOfCards: number;
  };

  [NotificationType.REVOCATION_APPROVED]: {
    cardKey: string;
    adminNote: string | null;
  };
};

const ACTIVATION_STATUS_CHANGED_HEADLINE: Record<TemplateVars[NotificationType.ACTIVATION_STATUS_CHANGED]['outcome'], string> = {
  // Their own action, but it's the receipt for money owed — worth having in writing (§5.4.2).
  ACTIVATED: '✅ Activation terminée',
  // An admin resolved their frozen activation in their favour — they cannot know otherwise.
  ACTIVATED_BY_ADMIN: '✅ Activation terminée par un administrateur',
  // An admin cancelled their frozen activation — they cannot know otherwise.
  CANCELLED_BY_ADMIN: '⛔ Activation annulée par un administrateur',
};

// Exhaustive by construction: Record<NotificationType, …> means adding an enum value fails
// tsc until its template exists. This is the "no magic strings" guarantee for notification
// copy (Set 6 plan §6.1).
export const TEMPLATES: { [K in NotificationType]: (vars: TemplateVars[K]) => string } = {
  [NotificationType.TELEGRAM_LINKED]: (vars) =>
    [
      '✅ Notifications activées',
      `Bonjour ${vars.name} (${ROLE_LABEL_FR[vars.role]}).`,
      'Vous recevrez désormais les notifications SetVision dans cette conversation.',
    ].join('\n'),

  [NotificationType.ACTIVATION_CREATED]: (vars) =>
    [
      '🆕 Nouvelle activation disponible',
      `Carte : ${vars.cardKeyMasked}`,
      `Abonnement : ${vars.subscriptionLabel}`,
      `Reçue à : ${formatDateFR(vars.requestedAt)}`,
    ].join('\n'),

  [NotificationType.ACTIVATION_INFORMATION_UPDATED]: (vars) =>
    [
      '✏️ Informations corrigées par le client',
      `Carte : ${vars.cardKey}`,
      `Client : ${vars.clientFullName}`,
      'Valeurs à jour :',
      ...vars.accountFields.map((f) => `• ${f.label} : ${f.value}`),
      'Ouvrez votre demande active pour continuer.',
    ].join('\n'),

  [NotificationType.ACTIVATION_OTP_RECEIVED]: (vars) =>
    [
      '🔐 Code OTP reçu',
      `Carte : ${vars.cardKey}`,
      `Client : ${vars.clientFullName}`,
      `Code OTP : ${vars.otpValue}`,
    ].join('\n'),

  [NotificationType.ACTIVATION_STATUS_CHANGED]: (vars) =>
    [
      ACTIVATION_STATUS_CHANGED_HEADLINE[vars.outcome],
      `Carte : ${vars.cardKey} · Client : ${vars.clientFullName}`,
      `Durée : ${vars.durationText}`,
      vars.commission
        ? `Commission : ${vars.commission}`
        : "Aucune commission n'a été créditée pour cette activation.",
    ].join('\n'),

  [NotificationType.ACTIVATION_FROZEN]: (vars) =>
    [
      '🧊 Activation gelée — intervention requise',
      `Carte : ${vars.cardKey} · Client : ${vars.clientFullName}`,
      `Activateur : ${vars.activatorName}`,
      `Temps écoulé : ${vars.durationText}`,
      `Motif : ${vars.freezeReason}`,
    ].join('\n'),

  [NotificationType.ORDER_REQUEST_CREATED]: (vars) =>
    [
      '📦 Nouvelle demande de commande',
      `Distributeur : ${vars.distributorName}`,
      `Abonnement : ${vars.subscriptionLabel}`,
      `Quantité : ${vars.nbOfCards} cartes`,
    ].join('\n'),

  [NotificationType.REVOCATION_REQUEST_CREATED]: (vars) =>
    [
      '♻️ Nouvelle demande de révocation',
      `Distributeur : ${vars.distributorName}`,
      `Carte : ${vars.cardKey} (${vars.subscriptionLabel})`,
      `Motif : ${vars.reason}`,
    ].join('\n'),

  [NotificationType.ORDER_CREATED]: (vars) =>
    [
      '🚚 Votre commande a été créée',
      `Commande : ${vars.orderNumber}`,
      `Cartes : ${vars.nbOfCards}`,
      'Vous serez notifié à chaque étape de la livraison.',
    ].join('\n'),

  [NotificationType.REVOCATION_APPROVED]: (vars) =>
    [
      '✅ Demande de révocation approuvée',
      `Carte : ${vars.cardKey}`,
      'La carte est de nouveau disponible dans votre stock.',
      ...(vars.adminNote ? [`Note de l'administrateur : ${vars.adminNote}`] : []),
    ].join('\n'),
};

export const render = <K extends NotificationType>(type: K, vars: TemplateVars[K]): string =>
  TEMPLATES[type](vars);
