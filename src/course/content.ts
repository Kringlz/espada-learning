import raw from "../../content/math-course/structured.json";
import { supplemental } from "./supplemental";
import rawCatalog from "../../content/math-course/catalog.json";
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
const original = raw as unknown as Record<string, TopicContent>;
export const courseContent: Record<string, TopicContent> = Object.fromEntries(
  rawCatalog.map((topic) => {
    const content = original[topic.id];
    const extra = supplemental[topic.id] ?? [];
    const numbered = (text: string, index: number): ContentBlock => ({
      kind: "paragraph",
      runs: [
        { text: `${topic.practice.count + index + 1}.`, bold: true },
        { text: ` ${text}` },
      ],
    });
    return [
      topic.id,
      {
        ...content,
        practice: {
          ...content.practice,
          questions: [
            ...content.practice.questions,
            ...extra.map((q, i) => numbered(q.question, i)),
          ],
          answers: [
            ...content.practice.answers,
            ...extra.map((q, i) => numbered(q.answer, i)),
          ],
        },
      },
    ];
  }),
);
