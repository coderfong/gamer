// Single source of truth for public contact + identity. Import everywhere so we
// never drift back into two emails / two taglines again.

export const WHATSAPP_NUMBER = "6594799717";
export const CONTACT_EMAIL = "jonathan@gameablestudios.com";
export const CONTACT_PHONE = "+6594799717";
export const CONTACT_PHONE_DISPLAY = "+65 9479 9717";

// One identity everywhere (headers, footers, meta).
export const IDENTITY_LINE =
  "Gameable Studios — rewards programs and game campaigns for small businesses.";

// The positioning one-liner used in body copy.
export const POSITIONING_LINE =
  "Campaigns get customers in the door. The rewards program keeps them coming back.";

// Build a wa.me deep link with a pre-filled message.
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Default deep link used by primary CTAs across the marketing site.
export const WA_DEFAULT = waLink(
  "Hi Gameable, I'd like a rewards page for my business",
);
