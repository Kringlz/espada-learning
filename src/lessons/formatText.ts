/** Small, lossless display format for authored lesson text. No HTML is executed. */
export type LessonTextBlock = {
  kind: "paragraph" | "heading" | "item";
  text: string;
  marker?: string;
};
export function formatLessonText(source: string): LessonTextBlock[] {
  const blocks: LessonTextBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const item = line.match(/^\s*(•|[-*]|\d+[.)])\s+(.+)$/);
    if (!line.trim()) flush();
    else if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1] });
    } else if (item) {
      flush();
      blocks.push({ kind: "item", marker: item[1], text: item[2] });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}
