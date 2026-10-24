export async function copyText(text: string): Promise<void> {
  // A rejected write must never become a successful confirmation.
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
  await navigator.clipboard.writeText(text);
}
