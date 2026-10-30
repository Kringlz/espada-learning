import raw from "../../content/math-course/structured.json";
import lessonReviews from "../../content/math-course/lesson-review.json";
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
type LessonReview = {
  title: string;
  prompt: string;
  hint: string;
  steps: string[];
  misconception: string;
  answer: string;
};
const reviews: Record<string, LessonReview> = lessonReviews;
const paragraph = (text: string): ContentBlock => ({
  kind: "paragraph",
  runs: [{ text }],
});
// Topic IDs, theory-page indices and practice numbering remain unchanged.
// The new worked checks belong to theory; no saved trainer sequence is rebuilt.
function reviewPage(page: TopicContent["pages"][number], review: LessonReview) {
  return {
    ...page,
    title: review.title,
    blocks: [
      { kind: "heading", runs: [{ text: review.title }] },
      paragraph(review.prompt),
      { kind: "callout", blocks: [paragraph(review.hint)] },
      { kind: "example", blocks: review.steps.map(paragraph) },
      { kind: "callout", blocks: [paragraph(review.misconception)] },
      { kind: "subheading", runs: [{ text: "Что ещё проверить" }] },
      ...page.blocks.slice(1),
    ] as ContentBlock[],
  };
}
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
        pages: content.pages.map((page, index) =>
          index === content.pages.length - 1
            ? reviewPage(page, reviews[topic.id])
            : page,
        ),
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
