import { ru } from "./ru";
/** Russian-first interface. Source keys also cover persisted demo labels. */
export type Catalog = Record<string, string>;
let locale = "ru-RU";
let catalog: Catalog = ru;
export function configureLocale(
  nextLocale: string,
  translations: Catalog = {},
) {
  locale = nextLocale;
  catalog = translations;
}
export function translate(
  source: string,
  values: Record<string, string | number> = {},
) {
  const normalized = source.replace(/\s+/g, " ").trim();
  const found = catalog[source] ?? catalog[normalized];
  const translated =
    found === undefined
      ? source
      : `${source.match(/^\s*/)?.[0] ?? ""}${found}${source.match(/\s*$/)?.[0] ?? ""}`;
  return translated.replace(/\{(\w+)\}/g, (_match, key) =>
    String(values[key] ?? `{${key}}`),
  );
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value));
}
export function formatNumber(value: number) {
  return new Intl.NumberFormat(locale).format(value);
}
