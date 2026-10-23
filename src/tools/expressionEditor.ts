import { toLatex } from "../math/notation";
export type Selection = { start: number; end: number };
export function editExpression(
  source: string,
  selection: Selection,
  key: string,
) {
  let start = Math.min(source.length, selection.start);
  let end = Math.min(source.length, selection.end);
  let insert = key;
  const selected = source.slice(start, end);
  if (key === "AC") return { text: "", selection: { start: 0, end: 0 } };
  if (key === "⇥") {
    let next = source.indexOf("□", end);
    if (next < 0) next = source.indexOf("□");
    return {
      text: source,
      selection:
        next < 0
          ? { start: source.length, end: source.length }
          : { start: next, end: next + 1 },
    };
  }
  if (key === "⌫") {
    if (start === end) start = Math.max(0, start - 1);
    insert = "";
  } else if (key === "a/b") {
    // A selection becomes the numerator; at the end use the current expression.
    if (!selected && start === source.length && source) start = 0;
    insert = `(${source.slice(start, end) || "□"})/(□)`;
  } else if (key === "√") insert = `√(${selected || "□"})`;
  else if (key === "^") insert = selected ? `(${selected})^(□)` : "^(□)";
  const text = source.slice(0, start) + insert + source.slice(end);
  if (text.length > 240) return { text: source, selection };
  const slot = insert.indexOf("□");
  const cursor = start + (slot < 0 ? insert.length : slot);
  return {
    text,
    selection: { start: cursor, end: cursor + (slot < 0 ? 0 : 1) },
  };
}
export function expressionLatex(source: string) {
  let text = source
    .replace(/(\d+(?:[.,]\d+)?)[eE]([+-]?\d+)/g, "($1×10^($2))")
    .replace(/sqrt/g, "√")
    .replace(/[÷:]/g, "/")
    .replace(/ans/g, "a_{prev}");
  // Display unfinished input with an empty slot; evaluation still requires complete input.
  if (/[+−\-×*/^/]$/.test(text)) text += "□";
  if (text.endsWith("(")) text += "□";
  const balance = [...text].reduce(
    (n, c) => n + (c === "(" ? 1 : c === ")" ? -1 : 0),
    0,
  );
  text += ")".repeat(Math.max(0, balance));
  return toLatex(text || "0");
}
