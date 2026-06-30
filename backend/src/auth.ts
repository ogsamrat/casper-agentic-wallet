/** Constant-time-ish admin secret check for /admin/* routes. */
export function isAdmin(configuredSecret: string, headerValue: string | undefined): boolean {
  if (!configuredSecret || !headerValue) return false;
  if (configuredSecret.length !== headerValue.length) return false;
  let diff = 0;
  for (let i = 0; i < configuredSecret.length; i++) diff |= configuredSecret.charCodeAt(i) ^ headerValue.charCodeAt(i);
  return diff === 0;
}
