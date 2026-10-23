import test from "node:test";
import assert from "node:assert/strict";
import { course } from "../src/course/model";
import { lessonFromHash } from "../src/course/navigation";

test("all current lessons remain directly addressable", () => {
  for (const topic of course) {
    assert.equal(lessonFromHash(`#/lesson/${topic.id}`), topic.id);
  }
});

test("retired atlas routes and unknown lessons resolve to the home map", () => {
  for (const hash of [
    "#/course",
    "#/",
    "",
    "#/lesson/A99-99",
    "#/lesson/G08-02/extra",
    "#/atlas",
  ]) {
    assert.equal(lessonFromHash(hash), null);
  }
});
