import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  course,
  parseProgress,
  progressKey,
  searchCourse,
  subjectName,
} from "../src/course/model";
import sources from "../content/math-course/sources.json";

test("all 55 supplied topics and 317 content pages are reachable, with no missing assets", () => {
  assert.equal(course.length, 55);
  assert.equal(new Set(course.map((t) => t.id)).size, 55);
  assert.equal(course.filter((t) => t.subject === "algebra").length, 41);
  assert.equal(
    course.reduce((sum, t) => sum + t.practice.count, 0),
    458,
  );
  assert.equal(
    course.reduce((sum, t) => sum + t.pages.length + 1, 0),
    317,
  );
  assert.deepEqual(
    [5, 6, 7, 8, 9, 10, 11].map((grade) =>
      course
        .filter((t) => t.grade === grade)
        .reduce((sum, t) => sum + t.practice.count, 0),
    ),
    [54, 66, 80, 64, 66, 72, 56],
  );
  assert.equal(course.find((t) => t.id === "A05-01")!.practice.count, 9);
  for (const source of sources) {
    const topics = course.filter((t) => t.grade === source.grade);
    assert.equal(topics.length, source.topics);
    const pdf = readFileSync(
      `content/math-course/grade-${String(source.grade).padStart(2, "0")}.pdf`,
    );
    assert.equal(createHash("sha256").update(pdf).digest("hex"), source.sha256);
    let expected = 2;
    for (const t of topics) {
      assert.equal(t.startPage, expected);
      assert.equal(t.endPage, t.practice.page);
      assert.deepEqual(
        t.pages.map((p) => p.number),
        Array.from(
          { length: t.endPage - t.startPage },
          (_, i) => t.startPage + i,
        ),
      );
      assert.ok(t.title.length > 10);
      assert.ok(t.practice.count >= 8 && t.practice.count <= 12);
      expected = t.endPage + 1;
    }
    assert.equal(expected, source.pages + 1);
  }
});

test("class and subject filtering follows the supplied programme and search supports codes and ё", () => {
  assert.equal(searchCourse("", 5, "algebra").length, 4);
  assert.equal(searchCourse("", 6, "geometry").length, 1);
  assert.equal(searchCourse("", 11, "geometry").length, 2);
  assert.equal(
    searchCourse("G08-03", null, "all")[0].title,
    "Векторы на плоскости, координаты, скалярное произведение",
  );
  assert.ok(searchCourse("объем", null, "all").length >= 2);
  assert.equal(searchCourse("несуществующая тема", 5, "all").length, 0);
  assert.equal(subjectName(5, "algebra"), "Арифметика");
  assert.equal(subjectName(10, "geometry"), "Стереометрия");
});

test("saved progress is bounded to real pages and questions, isolated by profile", () => {
  const parsed = parseProgress(
    JSON.stringify({
      "A07-01": {
        page: 999,
        readPages: [0, 0, 1, -1, 999, "2"],
        notes: "Мой ход решения",
        reviewed: {
          "1": "understood",
          "2": "repeat",
          "3": "correct",
          "999": "understood",
        },
        updatedAt: "2026-10-01",
      },
      "missing-topic": {},
    }),
  );
  assert.equal(parsed["A07-01"].page, 3);
  assert.deepEqual(parsed["A07-01"].readPages, [0, 1]);
  assert.deepEqual(parsed["A07-01"].reviewed, {
    "1": "understood",
    "2": "repeat",
  });
  assert.equal(parsed["A07-01"].notes, "Мой ход решения");
  assert.equal(parsed["missing-topic"], undefined);
  assert.notEqual(progressKey("student-a"), progressKey("student-b"));
  assert.deepEqual(parseProgress(null), {});
  assert.throws(() => parseProgress("{broken"));
  assert.throws(() => parseProgress("[]"));
});
