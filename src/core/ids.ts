let generator: () => string = () => globalThis.crypto.randomUUID();
/** Native entry point provides Expo's cryptographically secure implementation. */
export function configureIds(randomUUID: () => string) {
  generator = randomUUID;
}
export const uid = () => generator();
export const fixedId = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
// Excludes 0/O/1/I so codes are easy to read aloud and copy by hand.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateCode(length = 7): string {
  let out = "";
  for (let i = 0; i < length; i++)
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}
export function generateUniqueCode(existing: string[], length = 7): string {
  let code = generateCode(length);
  for (let tries = 0; existing.includes(code) && tries < 50; tries++)
    code = generateCode(length);
  return code;
}
/** Deterministic demo/seed code so fixture data is stable across runs. */
export const fixedCode = (n: number) => {
  let x = n + 1009;
  let out = "";
  for (let i = 0; i < 7; i++) {
    out = CODE_ALPHABET[x % CODE_ALPHABET.length] + out;
    x = Math.floor(x / CODE_ALPHABET.length);
  }
  return out;
};
