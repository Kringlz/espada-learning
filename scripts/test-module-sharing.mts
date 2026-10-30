import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, quote } from "./lesson-db.mjs";
import { emptyProgress } from "../src/course/model";
import { trainerModules } from "../src/course/trainer/modules";
import {
  newTrainer,
  reduceTrainer,
  sessionQuestion,
  TrainerState,
} from "../src/course/trainer/model";
import { practiceSnapshots } from "../src/course/trainer/sharing";
const student = "00000000-0000-4000-8000-000000000001",
  device = randomUUID(),
  topic = "G08-02",
  modules = trainerModules(topic);
const as = (statement: string) =>
  sql(
    `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(student)};${statement};commit;`,
  );
const p = {
  ...emptyProgress(),
  updatedAt: new Date().toISOString(),
  modulePractice: {} as Record<string, TrainerState>,
};
const send = (items = practiceSnapshots({ [topic]: p })) =>
  as(
    `select public.save_trainer_practice(${quote(device)},${quote(JSON.stringify(items))}::jsonb)`,
  );
const saved = () =>
  as(
    `select to_jsonb(t) from public.trainer_practice t where student_id=${quote(student)} and device_id=${quote(device)}`,
  ).then(JSON.parse);
function answers(id: string, count: number) {
  let s = newTrainer(37, undefined, id);
  for (let i = 0; i < count; i++) {
    s = reduceTrainer(s, topic, {
      type: "select",
      choice: sessionQuestion(topic, s).correct,
    });
    s = reduceTrainer(s, topic, { type: "submit" });
    s = reduceTrainer(s, topic, { type: "next" });
  }
  return reduceTrainer(s, topic, { type: "finish" });
}
try {
  p.modulePractice[modules[0].id] = answers(modules[0].id, 20);
  await send();
  assert.equal((await saved()).passed, false);
  console.log(
    "✓ 20 correct in one narrow module does not pass the topic on server",
  );
  for (const m of modules.slice(0, 2)) {
    let s = newTrainer(91, undefined, m.id);
    s = reduceTrainer(s, topic, {
      type: "select",
      choice: (sessionQuestion(topic, s).correct + 1) % 4,
    });
    p.modulePractice[m.id] = reduceTrainer(s, topic, { type: "submit" });
  }
  p.updatedAt = new Date().toISOString();
  await send();
  assert.equal((await saved()).completed, 0);
  assert.equal((await saved()).incorrect, 2);
  console.log(
    "✓ two pending retries in distinct modules sync without fake completions",
  );
  for (const m of modules) p.modulePractice[m.id] = answers(m.id, 5);
  p.updatedAt = new Date().toISOString();
  await send();
  assert.equal((await saved()).passed, true);
  console.log(
    "✓ full module coverage and 15 completed answers retain the topic criterion",
  );
  await assert.rejects(
    send(
      practiceSnapshots({ [topic]: p }).map((s) => ({
        ...s,
        moduleCount: 1,
        coveredModules: 1,
      })),
    ),
  );
  console.log("✓ server rejects a fabricated module count");
} finally {
  await sql(
    `delete from public.trainer_practice where device_id=${quote(device)}`,
  );
}
