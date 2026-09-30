import raw from "../../content/math-course/structured.json";
export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  script?: "sup" | "sub";
};
export type TextBlock = {
  kind: "heading" | "subheading" | "label" | "paragraph" | "formula";
  runs: TextRun[];
};
export type EquationPart =
  | { kind: "text"; runs: TextRun[] }
  | { kind: "fraction"; numerator: TextRun[]; denominator: TextRun[] };
export type ContentBlock =
  | { kind: "calculation"; text: string }
  | { kind: "equation"; parts: EquationPart[] }
  | TextBlock
  | { kind: "callout" | "example"; blocks: ContentBlock[] }
  | { kind: "table"; rows: TextRun[][][] }
  | {
      kind: "figure";
      asset: string;
      width: number;
      height: number;
      alt: string;
    };
export type TopicContent = {
  pages: { title: string; blocks: ContentBlock[] }[];
  practice: {
    questions: ContentBlock[];
    hints: ContentBlock[];
    answers: ContentBlock[];
  };
};
export const courseContent = raw as unknown as Record<string, TopicContent>;
