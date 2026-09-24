let generator: () => string = () => globalThis.crypto.randomUUID();
/** Native entry point provides Expo's cryptographically secure implementation. */
export function configureIds(randomUUID: () => string) {
  generator = randomUUID;
}
export const uid = () => generator();
export const fixedId = (n: number) =>
  `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
