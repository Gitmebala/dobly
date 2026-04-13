export function isAdminEmail(email?: string | null) {
  if (!email) return false;

  const raw = [process.env.ADMIN_EMAILS, process.env.ADMIN_EMAIL]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (raw.length === 0) return false;
  return raw.includes(email.trim().toLowerCase());
}
