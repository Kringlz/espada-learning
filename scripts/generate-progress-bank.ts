import { writeFileSync } from "node:fs";
import { course as courseTopics } from "../src/course/model";
import {
  getLessonContent,
  getLessonMeta,
} from "../src/course/videoLesson/content";
const rows = courseTopics.flatMap((t) =>
  (t.id === "G08-02" ? [1, 2] : [getLessonMeta(t.id).version]).map(
    (version) => {
      const c = getLessonContent({ lessonId: t.id, contentVersion: version });
      const bank = { opening: c.opening, practice: c.practice, check: c.check };
      const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
      return `insert into public.progress_banks(topic_id,version,title,bank) values (${quote(t.id)},${version},${quote(getLessonMeta(t.id).title)},${quote(JSON.stringify(bank))}::jsonb) on conflict do nothing;`;
    },
  ),
);
writeFileSync(
  "supabase/progress-bank.sql",
  "-- Frozen lesson versions; append new versions, never replace published answers.\n" +
    rows.join("\n") +
    "\n",
);
