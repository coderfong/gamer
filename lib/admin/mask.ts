// Contact masking for analytics tables. Brand owns the unmasked data (PDPA),
// but the at-a-glance table shows masked values to reduce shoulder-surfing.

export function maskEmail(email: string | null): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

export function maskPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\s+/g, "");
  const last4 = digits.slice(-4);
  return `${digits.slice(0, 3)} ****${last4}`;
}

export function maskContact(email: string | null, phone: string | null): string {
  if (email) return maskEmail(email);
  if (phone) return maskPhone(phone);
  return "—";
}
