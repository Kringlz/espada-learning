import test from "node:test";
import assert from "node:assert/strict";
import { course } from "../src/course/model";
import { courseContent, type ContentBlock } from "../src/course/content";
import { splitPractice } from "../src/course/practice";

function tokens(blocks: ContentBlock[]): string[] {
  return blocks.flatMap((b) =>
    "runs" in b ? b.runs.map((r) => JSON.stringify(r)) : [JSON.stringify(b)],
  );
}
test("all 458 exercises retain matching answers, every text run, formula and figure", () => {
  let count = 0;
  for (const topic of course) {
    for (const kind of ["questions", "answers"] as const) {
      const source = courseContent[topic.id].practice[kind];
      const split = splitPractice(source);
      assert.deepEqual(
        split.items.map((i) => i.number),
        Array.from({ length: topic.practice.count }, (_, i) => String(i + 1)),
        `${topic.id}: ${kind}`,
      );
      assert.deepEqual(
        tokens([...split.intro, ...split.items.flatMap((i) => i.blocks)]),
        tokens(source),
        `${topic.id}: lossless ${kind}`,
      );
    }
    count += topic.practice.count;
  }
  assert.equal(count, 458);
});
