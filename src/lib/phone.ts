const MIN_NATIONAL_DIGITS = 6;

export type PersonPhones = {
  primaryPhoneNumber?: string | null;
  primaryPhoneCallingCode?: string | null;
};

export const digitsOf = (value: string | null | undefined): string =>
  (value ?? '').replace(/\D/g, '');

// Twenty stores the national part and the calling code separately, so an E.164 number is
// searched by every plausible national suffix and then confirmed with `phoneMatches`.
export const nationalCandidates = (e164: string): string[] => {
  const digits = digitsOf(e164);
  const candidates: string[] = [];

  for (let start = 1; digits.length - start >= MIN_NATIONAL_DIGITS && start <= 4; start++) {
    candidates.push(digits.slice(start));
  }

  return candidates;
};

export const phoneMatches = (e164: string, phones: PersonPhones | null | undefined): boolean => {
  const digits = digitsOf(e164);
  const national = digitsOf(phones?.primaryPhoneNumber);
  const calling = digitsOf(phones?.primaryPhoneCallingCode);

  if (!digits || !national) return false;

  return calling ? calling + national === digits : digits.endsWith(national);
};

// Country calling codes are prefix-free: 1 and 7 are one digit, the codes below are two digits, every other code has three.
const TWO_DIGIT_CODES = new Set(
  [20, 27, 30, 31, 32, 33, 34, 36, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58,
    60, 61, 62, 63, 64, 65, 66, 81, 82, 84, 86, 90, 91, 92, 93, 94, 95, 98].map(String),
);

// Twenty keeps the calling code and the national number apart, so a number Retell gives as E.164 is split.
export const splitE164 = (e164: string): { callingCode: string; national: string } | null => {
  const digits = digitsOf(e164);
  if (!e164.trim().startsWith('+') || digits.length < 8) return null;

  const length = digits[0] === '1' || digits[0] === '7' ? 1 : TWO_DIGIT_CODES.has(digits.slice(0, 2)) ? 2 : 3;
  const national = digits.slice(length);
  return national.length >= MIN_NATIONAL_DIGITS ? { callingCode: `+${digits.slice(0, length)}`, national } : null;
};
