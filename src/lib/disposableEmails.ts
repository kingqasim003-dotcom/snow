const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "mailinator.com",
  "mailinator.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "throwaway.email",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "getnada.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "mintemail.com",
  "mytemp.email",
  "emailondeck.com",
  "tempail.com",
  "tempr.email",
  "dropmail.me",
  "inboxkitten.com",
  "mailnesia.com",
  "mohmal.com",
  "getairmail.com",
  "mailcatch.com",
  "spamgourmet.com",
  "mailnull.com",
  "mailtemp.net",
  "tempinbox.com",
  "burnermail.io",
  "mailsac.com",
  "tmpmail.net",
  "tmpmail.org",
  "emailfake.com",
  "crazymailing.com",
  "mailforspam.com",
  "spambox.us",
  "mail-temp.com",
  "tempmailo.com",
  "fakemail.net",
  "mailpoof.com",
  "tmail.ws",
  "mail.tm",
  "minuteinbox.com",
  "anonymbox.com",
  "jetable.org",
  "mailhazard.com",
  "mailhazard.us",
  "mailhz.me",
  "mailscrap.com",
  "tempsky.com",
  "tempmailaddress.com",
  "emailtemporario.com.br",
  "tempmail.ninja",
  "disposablemail.com",
  "mail7.io",
  "mvrht.com",
  "nwldx.com",
  "spambox.xyz",
  "tempmailgen.com",
  "mailtemp.info",
  "fakemailgenerator.com",
  "emailtemporanea.net",
  "spamfree24.org",
  "spamfree24.de",
  "spamfree24.eu",
  "spamfree24.info",
  "spamfree24.com",
]);

const SUSPICIOUS_LOCAL_PARTS = /^(test|temp|fake|spam|trash|disposable|noreply|no-reply|mailinator)$/i;

export function isDisposableEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex < 1) return true;

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (!domain.includes(".") || domain.length < 4) return true;
  if (SUSPICIOUS_LOCAL_PARTS.test(local)) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;

  // Block common temp-mail subdomains and plus-alias tricks on disposable domains
  const baseDomain = domain.split(".").slice(-2).join(".");
  if (DISPOSABLE_DOMAINS.has(baseDomain)) return true;

  // Block domains that look like temp mail services
  if (
    domain.includes("tempmail") ||
    domain.includes("throwaway") ||
    domain.includes("disposable") ||
    domain.includes("fakeinbox") ||
    domain.includes("guerrilla")
  ) {
    return true;
  }

  return false;
}

export function validateRealEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  if (isDisposableEmail(trimmed)) {
    return "Temporary or disposable email addresses are not allowed. Please use a real email.";
  }
  return null;
}