// Placeholder destinations — SetVision's real social/support URLs and Terms/Privacy pages
// don't exist yet. User-approved approach (client-portal Sprint 2): ship structurally correct
// links (real external URLs, new-tab, translated accessible names) with obviously-fake
// placeholder values, in one place to swap for the real ones later. Terms/Privacy stay "#"
// (no page exists to link to at all, unlike the social accounts which at least plausibly
// exist) rather than a fabricated external URL.
export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/setvision",
  whatsapp: "https://wa.me/213500000000",
  facebook: "https://facebook.com/setvision",
} as const;

export const LEGAL_LINKS = {
  terms: "#",
  privacy: "#",
} as const;
