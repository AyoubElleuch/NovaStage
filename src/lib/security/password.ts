import { randomInt } from "crypto";

const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // excludes easily confused O, I
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz"; // excludes easily confused l
const NUMBERS = "23456789"; // excludes 0, 1
const SPECIAL = "!@#$%^&*-_+=";
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

/**
 * Generates a cryptographically secure random temporary password that satisfies:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special symbol
 * - Default 16 characters length
 */
export function generateSecurePassword(length = 16): string {
  const targetLength = Math.max(12, length);

  // Guarantee at least one of each required category
  const passwordChars: string[] = [
    UPPERCASE[randomInt(UPPERCASE.length)],
    LOWERCASE[randomInt(LOWERCASE.length)],
    NUMBERS[randomInt(NUMBERS.length)],
    SPECIAL[randomInt(SPECIAL.length)],
  ];

  // Fill remainder with random characters from all sets
  for (let i = passwordChars.length; i < targetLength; i++) {
    passwordChars.push(ALL_CHARS[randomInt(ALL_CHARS.length)]);
  }

  // Cryptographically secure Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[j];
    passwordChars[j] = temp;
  }

  return passwordChars.join("");
}
