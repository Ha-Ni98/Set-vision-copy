export enum CardStat {
  IN_SET = 'IN_SET',
  PRINTED = 'PRINTED',
  IN_LOT = 'IN_LOT',
  AT_DISTRIBUTOR = 'AT_DISTRIBUTOR',
  ACTIVATION_PROGRESS = 'ACTIVATION_PROGRESS',
  ACTIVATED = 'ACTIVATED',
  ACTIVATION_FAILED = 'ACTIVATION_FAILED',
}

export enum CardFlag {
  disabled = 'disabled',
  revoked = 'revoked',
}

// Why a specific selected card could not be put into a lot. Ordered most-likely-first; the
// service reports the FIRST reason that applies to a card, not all of them (set-8-plan §5.1).
export enum CardUnavailableReason {
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_IN_LOT = 'ALREADY_IN_LOT',
  NOT_PRINTED = 'NOT_PRINTED',
  WRONG_PLAN = 'WRONG_PLAN',
  DISABLED = 'DISABLED',
  REVOKED = 'REVOKED',
}
