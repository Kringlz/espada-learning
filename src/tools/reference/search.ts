import { referenceItems, referenceTopics, ReferenceEntry } from "./data";

/** Small Russian search vocabulary, not a grade/curriculum classifier. */
export function normalizeSearch(text: string): string[] {
  return text
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/%/g, " процент ")
    .replace(/√/g, " корень ")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^кор(ень|ня|ни|ней|ню|нем)$/.test(word)) return "корен";
      if (/^степ(ень|ени|еней|енью)$/.test(word)) return "степен";
      if (/^площад/.test(word)) return "площад";
      return word.length > 4
        ? word.replace(
            /(иями|ами|ого|ему|ыми|ими|ая|ое|ые|ий|ый|ой|ов|ев|ей|ам|ям|ах|ях|ом|ем|ию|ия|ие|ую|юю|а|я|ы|и|у|ю|е)$/u,
            "",
          )
        : word;
    });
}
const stopWords = new Set(normalizeSearch("как найти формула для по от"));
const index = referenceItems.map((item) => ({
  item,
  title: normalizeSearch(item.title).join(" "),
  words: normalizeSearch(
    [
      item.title,
      item.keywords,
      item.rule,
      item.notation,
      referenceTopics.find((t) => t.id === item.topic)?.title,
    ].join(" "),
  ).join(" "),
}));
export function searchReference(
  query: string,
  topic?: string,
): ReferenceEntry[] {
  const allTokens = normalizeSearch(query);
  const meaningful = allTokens.filter((t) => !stopWords.has(t));
  const tokens = meaningful.length ? meaningful : allTokens;
  return index
    .filter(
      (row) =>
        (!topic || row.item.topic === topic) &&
        tokens.every((t) => row.words.includes(t)),
    )
    .map((row) => ({
      item: row.item,
      score: tokens.reduce(
        (sum, t) => sum + (row.title.includes(t) ? 2 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.item);
}
