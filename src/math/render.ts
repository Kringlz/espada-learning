import type { LiteElement } from "mathjax-full/js/adaptors/lite/Element.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
// Fixed, bundled packages: no HTML, URL commands or dynamic extension loading.
const document = mathjax.document("", {
  InputJax: new TeX({
    packages: ["base", "ams"],
    maxBuffer: 6000,
    formatError: (_jax: unknown, error: Error) => {
      throw error;
    },
  }),
  OutputJax: new SVG({ fontCache: "none" }),
});
export type RenderedMath = {
  svg: string;
  width: number;
  height: number;
  depth: number;
};
const cache = new Map<string, RenderedMath | null>();

/** Sizes are em units. SVG paths include their fonts and work offline on all platforms. */
export function renderMath(latex: string): RenderedMath | null {
  if (cache.has(latex)) return cache.get(latex)!;
  let result: RenderedMath | null = null;
  try {
    if (latex.length > 4000) return null;
    const node = document.convert(`\\displaystyle ${latex}`, {
      display: false,
    });
    const svg = adaptor.firstChild(node) as LiteElement;
    const box = adaptor.getAttribute(svg, "viewBox").split(/\s+/).map(Number);
    if (box.length === 4 && box.every(Number.isFinite)) {
      result = {
        svg: adaptor.outerHTML(svg),
        width: box[2] / 1000,
        height: box[3] / 1000,
        depth: (box[1] + box[3]) / 1000,
      };
    }
  } catch {
    /* Keep malformed author content readable without crashing the lesson. */
  }
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(latex, result);
  return result;
}
