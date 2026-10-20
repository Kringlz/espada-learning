import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import {
  useStoredCourseProgress,
  ProgressStorage,
} from "../src/course/useStoredCourseProgress";
import { course, emptyProgress, progressKey } from "../src/course/model";
import { resumeQuestionIndex } from "../src/course/resume";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const topic = course[0].id;
const saved = JSON.stringify({
  [topic]: { ...emptyProgress(), readPages: [0], notes: "Keep my notes" },
});
const mark = () => {};

async function mount(storage: ProgressStorage) {
  let current!: ReturnType<typeof useStoredCourseProgress>;
  function Harness() {
    current = useStoredCourseProgress("local-fixture", storage, mark);
    return null;
  }
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(React.createElement(Harness));
  });
  return {
    get current() {
      return current;
    },
    close: () => act(async () => root.unmount()),
  };
}

test("retry after a read failure reloads saved progress without overwriting it", async () => {
  let reads = 0;
  const writes: string[] = [];
  const h = await mount({
    getItem: async (key) => {
      assert.equal(key, progressKey("local-fixture"));
      if (++reads === 1) throw Error("temporary read failure");
      return saved;
    },
    setItem: async (_, value) => {
      writes.push(value);
    },
  });
  try {
    assert.equal(h.current.ready, false);
    assert.ok(h.current.error);
    await act(async () => {
      h.current.update(topic, { readPages: [] });
      h.current.retry();
    });
    assert.equal(reads, 2);
    assert.equal(h.current.ready, true);
    assert.equal(h.current.error, "");
    assert.deepEqual(h.current.progress[topic].readPages, [0]);
    assert.equal(h.current.progress[topic].notes, "Keep my notes");
    assert.deepEqual(writes, []);
  } finally {
    await h.close();
  }
});

test("repeated read failures cannot replace saved data with an empty progress object", async () => {
  const writes: string[] = [];
  const h = await mount({
    getItem: async () => {
      throw Error("unavailable");
    },
    setItem: async (_, value) => {
      writes.push(value);
    },
  });
  try {
    await act(async () => h.current.retry());
    await act(async () => h.current.retry());
    assert.equal(h.current.ready, false);
    assert.deepEqual(writes, []);
  } finally {
    await h.close();
  }
});

test("save retry persists the latest edits and rapid updates retain both changes", async () => {
  let fail = true;
  let stored = saved;
  const h = await mount({
    getItem: async () => stored,
    setItem: async (_, value) => {
      if (fail) throw Error("quota temporarily unavailable");
      stored = value;
    },
  });
  try {
    await act(async () => {
      h.current.update(topic, { notes: "Updated notes" });
      h.current.update(topic, (p) => ({ readPages: [...p.readPages, 1] }));
    });
    assert.ok(h.current.error);
    fail = false;
    await act(async () => h.current.retry());
    assert.equal(h.current.error, "");
    assert.equal(h.current.saving, false);
    const p = JSON.parse(stored)[topic];
    assert.equal(p.notes, "Updated notes");
    assert.deepEqual(p.readPages, [0, 1]);
  } finally {
    await h.close();
  }
});

test("quiz resume uses saved submissions, including non-contiguous authored numbering", () => {
  const questions = [{ number: "1" }, { number: "4" }, { number: "7" }];
  assert.equal(resumeQuestionIndex(questions, {}), 0);
  const checked = { selected: 0, hintsShown: 0, submitted: true };
  assert.equal(
    resumeQuestionIndex(questions, { "1": checked, "4": checked }),
    2,
  );
  assert.equal(
    resumeQuestionIndex(questions, {
      "1": checked,
      "4": { ...checked, submitted: false },
    }),
    1,
  );
  assert.equal(
    resumeQuestionIndex(questions, {
      "1": checked,
      "4": checked,
      "7": checked,
    }),
    0,
  );
});
