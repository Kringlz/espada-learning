import { setStringAsync } from "expo-clipboard";

export async function copyText(text: string): Promise<void> {
  if (!(await setStringAsync(text))) throw new Error("Clipboard unavailable");
}
