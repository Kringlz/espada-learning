export type SoundPreferences = { enabled: boolean; volume: number };
export function parseSoundPreferences(
  raw: string | null,
  legacy: string | null,
): SoundPreferences {
  if (!raw) return { enabled: legacy !== "off", volume: 0.45 };
  const value = JSON.parse(raw);
  if (
    typeof value.enabled !== "boolean" ||
    typeof value.volume !== "number" ||
    !Number.isFinite(value.volume) ||
    value.volume < 0 ||
    value.volume > 1
  )
    throw Error("Invalid sound preferences");
  return { enabled: value.enabled, volume: value.volume };
}
