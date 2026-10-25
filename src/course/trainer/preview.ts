import { renderMath } from "../../math/render";
import { trainerTopics, topicReferences } from "./topics";
const cache = new Map<
  string,
  { hook: string; topics: string[]; formulaImage: string }
>();
export function trainerPreview(id: string) {
  if (cache.has(id)) return cache.get(id)!;
  const card = trainerTopics[id];
  const math = renderMath(card.formula);
  const svg = math?.svg.replace(/currentColor/g, "#c2e2d1");
  const result = {
    hook: card.hook,
    topics: topicReferences(id).map((r) => r.title),
    formulaImage: svg
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
      : "",
  };
  cache.set(id, result);
  return result;
}
