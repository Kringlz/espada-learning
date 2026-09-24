import { writeFileSync } from "node:fs";
import { curriculum, originalCurriculum } from "../src/data/curriculum";
import { englishCurriculum } from "../src/data/legacyEnglish";
const j = (x: unknown) =>
  "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
const sql = [
  "-- PDF curriculum. Stable IDs and answer indices retain historical evidence.\nbegin;",
];
for (const t of curriculum) {
  const en = englishCurriculum.find((x) => x.id === t.id);
  const ru = originalCurriculum.find((x) => x.id === t.id);
  if (en && ru) {
    const fields = ["title", "objective", "lesson", "example"] as const;
    const patch = fields
      .map(
        (k) =>
          `'${k}',case when content->'${k}'=${j(en[k])} then ${j(t[k])} else content->'${k}' end`,
      )
      .join(",");
    sql.push(
      `update public.topics set content=content||jsonb_build_object(${patch})||${j(t.sectionId ? { sectionId: t.sectionId, order: t.order } : {})} where id='${t.id}';`,
    );
    // Only wholly unchanged seeded questions are translated. Authored question content is retained.
    for (const [index, q] of en.checks.entries())
      sql.push(
        `update public.topics set content=jsonb_set(content,'{checks,${index}}',${j(ru.checks[index])}) where id='${t.id}' and content#>'{checks,${index}}'=${j(q)};`,
      );
    sql.push(
      `update public.topics set content=jsonb_set(content,'{practice}',${j(ru.practice)}) where id='${t.id}' and content->'practice'=${j(en.practice)};`,
    );
  }
  sql.push(
    `insert into public.topics(id,content) values('${t.id}',${j(t)}) on conflict(id) do nothing;`,
  );
}
sql.push("commit;");
writeFileSync("supabase/migrations/002_russian_curriculum.sql", sql.join("\n"));
