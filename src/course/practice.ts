import type { ContentBlock } from "./content";

/** Authored bold number markers delimit exercises; formulas and all runs stay intact. */
export function splitPractice(blocks: ContentBlock[]) {
  const intro: ContentBlock[] = [];
  const items: { number: string; blocks: ContentBlock[] }[] = [];
  let current = intro;
  for (const block of blocks) {
    if (!("runs" in block)) {
      current.push(block);
      continue;
    }
    let from = 0;
    block.runs.forEach((run, index) => {
      if (!run.bold || !/^\d{1,2}\.$/.test(run.text.trim())) return;
      if (index > from)
        current.push({ ...block, runs: block.runs.slice(from, index) });
      const item = {
        number: String(parseInt(run.text, 10)),
        blocks: [] as ContentBlock[],
      };
      items.push(item);
      current = item.blocks;
      from = index;
    });
    if (from < block.runs.length)
      current.push({ ...block, runs: block.runs.slice(from) });
  }
  return { intro, items };
}
