import type { TextRun } from "../course/content";

export type MathSegment = TextRun & { latex?: string; display?: boolean };
const supers = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣ";
const subs = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₙₐₑₕᵢⱼₖₗₘₒₚᵣₛₜᵤᵥₓ";
const ordinarySup = "0123456789+-=()nx";
const ordinarySub = "0123456789+-=()naehijklmoprstuvx";

/** Convert the textbook's unambiguous arithmetic notation to TeX without changing the source. */
export function toLatex(source: string): string {
  const normalized = source
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣ]+/g,
      (s) => `^{${[...s].map((c) => ordinarySup[supers.indexOf(c)]).join("")}}`,
    )
    .replace(
      /[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₙₐₑₕᵢⱼₖₗₘₒₚᵣₛₜᵤᵥₓ]+/g,
      (s) => `_{${[...s].map((c) => ordinarySub[subs.indexOf(c)]).join("")}}`,
    );
  let i = 0;
  const symbol: Record<string, string> = {
    π: "\\pi ",
    α: "\\alpha ",
    β: "\\beta ",
    γ: "\\gamma ",
    φ: "\\varphi ",
    θ: "\\theta ",
    Δ: "\\Delta ",
    δ: "\\delta ",
    λ: "\\lambda ",
    ω: "\\omega ",
    "−": "-",
    "·": "\\cdot ",
    "×": "\\times ",
    "÷": "\\div ",
    "≤": "\\le ",
    "≥": "\\ge ",
    "≠": "\\ne ",
    "≈": "\\approx ",
    "∞": "\\infty ",
    "±": "\\pm ",
    "∫": "\\int ",
    "∈": "\\in ",
    "∉": "\\notin ",
    "∪": "\\cup ",
    "°": "^{\\circ}",
    "%": "\\%",
    "′": "'",
  };
  const beginsAtom = () =>
    /[0-9a-zA-Zα-ωΔ√({]/.test(normalized[i] ?? "") && i < normalized.length;
  const atom = (): string => {
    if (i >= normalized.length) return "";
    let value = "";
    const c = normalized[i++];
    if (c === "(" || c === "{") {
      value = expression(c === "(" ? ")" : "}");
      value = c === "(" ? `(${value})` : `{${value}}`;
    } else if (c === "√") {
      while (normalized[i] === " ") i++;
      const inner = atom();
      value = `\\sqrt{${inner.startsWith("(") && inner.endsWith(")") ? inner.slice(1, -1) : inner}}`;
    } else {
      const rest = normalized.slice(i - 1);
      const fn =
        /^(arcsin|arccos|arctan|sin|cos|tan|cot|tg|ctg|ln|log|lg)(?![a-zA-Z])/.exec(
          rest,
        );
      const number = /^\d+(?:[.,]\d+)?/.exec(rest);
      if (fn) {
        i += fn[0].length - 1;
        value = `\\operatorname{${fn[0]}}`;
        // Keep log bases before their arguments.
        while (normalized[i] === "_" || normalized[i] === "^") {
          const script = normalized[i++];
          value += script + atom();
        }
        while (normalized[i] === " ") i++;
        if (beginsAtom()) value += ` ${atom()}`;
      } else if (number) {
        value = number[0].replace(",", "{,}");
        i += number[0].length - 1;
      } else value = symbol[c] ?? c;
    }
    while (normalized[i] === "^" || normalized[i] === "_") {
      const script = normalized[i++];
      value += script + atom();
    }
    return value;
  };
  const product = (): string => {
    let value = atom();
    // Adjacent factors form a single numerator: 3π/4, 2x/3, (2r)h/2.
    while (beginsAtom()) value += atom();
    return value;
  };
  const expression = (end = ""): string => {
    let out = "";
    while (i < normalized.length && normalized[i] !== end) {
      if (!beginsAtom()) {
        const c = normalized[i++];
        out += c === " " ? "\\, " : (symbol[c] ?? c);
        continue;
      }
      let value = product();
      const beforeSpace = i;
      while (normalized[i] === " ") i++;
      if (normalized[i] !== "/") i = beforeSpace;
      while (normalized[i] === "/") {
        i++;
        while (normalized[i] === " ") i++;
        if (!beginsAtom()) {
          value += "/";
          break;
        }
        const denominator = product();
        const strip = (s: string) => {
          if (!s.startsWith("(") || !s.endsWith(")")) return s;
          let depth = 0;
          for (let j = 0; j < s.length - 1; j++) {
            if (s[j] === "(") depth++;
            if (s[j] === ")" && --depth === 0) return s;
          }
          return s.slice(1, -1);
        };
        value = `\\frac{${strip(value)}}{${strip(denominator)}}`;
      }
      out += value;
    }
    if (end && normalized[i] === end) i++;
    return out;
  };
  return expression();
}

// Cyrillic prose and measurement units stay text. Explicit TeX uses standard delimiters.
const candidate =
  /[0-9A-Za-zα-ωΔ√∫(][0-9A-Za-zα-ωΔ√∫+−\-*=<>≤≥≠≈±·×÷/.,:;()%°′∞∈∉∪\[\]{}^_⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₙₐₑₕᵢⱼₖₗₘₒₚᵣₛₜᵤᵥₓ \t]*/g;
const signal = /[\/√^_⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣ₀₁₂₃₄₅₆₇₈₉]|[=<>≤≥≠≈]/;

function automatic(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(candidate)) {
    let value = match[0].replace(/[\s.,;:]+$/, "");
    // Leave unmatched closing punctuation with the surrounding sentence.
    while (
      value.endsWith(")") &&
      (value.match(/\)/g)?.length ?? 0) > (value.match(/\(/g)?.length ?? 0)
    )
      value = value.slice(0, -1);
    // A fragment can begin within an interval or a prose parenthesis.
    while (
      value.startsWith("(") &&
      (value.match(/\(/g)?.length ?? 0) > (value.match(/\)/g)?.length ?? 0)
    )
      value = value.slice(1);
    const start = match.index! + match[0].indexOf(value);
    const before = text.slice(Math.max(0, start - 12), start);
    if (
      !value ||
      !signal.test(value) ||
      /(?:https?:\/\/|www\.)/.test(before + value) ||
      /\d{1,4}\/\d{1,2}\/\d{2,4}/.test(value)
    )
      continue;
    // Avoid treating Latin prose/URLs as algebra. Named functions remain supported.
    if (/[A-Za-z]{4,}/.test(value.replace(/arcsin|arccos|arctan/g, "")))
      continue;
    out.push(
      { text: text.slice(last, start) },
      { text: value, latex: toLatex(value) },
    );
    last = start + value.length;
  }
  out.push({ text: text.slice(last) });
  return out.filter((s) => s.text.length);
}

export function mathSegments(text: string): MathSegment[] {
  const out: MathSegment[] = [];
  const explicit =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$([^$\n]+)\$/g;
  let last = 0;
  for (const m of text.matchAll(explicit)) {
    out.push(...automatic(text.slice(last, m.index)), {
      text: m[0],
      latex: m[1] ?? m[2] ?? m[3] ?? m[4],
      display: !!(m[1] ?? m[2]),
    });
    last = m.index! + m[0].length;
  }
  out.push(...automatic(text.slice(last)));
  return out;
}

export function mathRuns(runs: TextRun[]): MathSegment[] {
  // Join script runs to the base, including fractions split across source runs.
  const joined: TextRun[] = [];
  for (const r of runs) {
    const prev = joined.at(-1);
    if (r.script && prev && /[0-9a-zA-Zα-ω)]$/.test(prev.text)) {
      prev.text += `${r.script === "sup" ? "^" : "_"}{${r.text}}`;
    } else if (
      prev &&
      !r.script &&
      !prev.script &&
      r.bold === prev.bold &&
      r.italic === prev.italic
    ) {
      prev.text += r.text;
    } else joined.push({ ...r });
  }
  return joined.flatMap((r) =>
    r.script ? [r] : mathSegments(r.text).map((s) => ({ ...r, ...s })),
  );
}
