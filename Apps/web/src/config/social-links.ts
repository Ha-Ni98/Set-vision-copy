// Placeholder destinations — SetVision's real social/support URLs and Terms/Privacy pages
// don't exist yet. User-approved approach (client-portal Sprint 2): ship structurally correct
// links (real external URLs, new-tab, translated accessible names) with obviously-fake
// placeholder values, in one place to swap for the real ones later. Terms/Privacy stay "#"
// (no page exists to link to at all, unlike the social accounts which at least plausibly
// exist) rather than a fabricated external URL.

// The two support numbers, once — genuinely different lines (call vs. WhatsApp), confirmed.
// tel:/wa.me/display forms are DERIVED below; never write a second literal for either number
// (set-12-plan §4.2). Still placeholders (see the same header note above).
const CALL_E164 = "+213554813850";
const WHATSAPP_E164 = "+213556715428";

const toWaDigits = (e164: string) => e164.replace(/\D/g, ""); // wa.me wants bare digits, no '+'

export const SUPPORT_CONTACT = {
  /** Interpolated into banner copy as {phone}. National grouping, no '+' (RTL-safe digits). */
  callDisplay: "0554 81 38 50",
  callHref: `tel:${CALL_E164}`,
  /** Interpolated as {whatsappPhone} — a DIFFERENT number from callDisplay (confirmed). */
  whatsappDisplay: "0556 71 54 28",
  whatsappHref: `https://wa.me/${toWaDigits(WHATSAPP_E164)}`,
} as const;

export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/setvision.19",
  facebook: "https://facebook.com/profile.php?id=61550274938326",
  whatsapp: SUPPORT_CONTACT.whatsappHref, // header + footer now read the same source as the banner
  callcenter: SUPPORT_CONTACT.callHref,
} as const;

export const LEGAL_LINKS = {
  terms: "#",
  privacy: "#",
} as const;
