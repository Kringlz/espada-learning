import { writeFileSync } from "node:fs";
import { createSeed } from "../src/data/seed";
const s = createSeed();
const str = (x: unknown) =>
  "'" + JSON.stringify(x).replaceAll("'", "''") + "'::jsonb";
writeFileSync(
  "supabase/seed.sql",
  `-- Original curriculum only. No auth identities or real student records.\n` +
    s.topics
      .map(
        (t) =>
          `insert into public.topics values ('${t.id}',${str(t)}) on conflict(id) do nothing;`,
      )
      .join("\n") +
    "\n" +
    s.templates
      .map(
        (t) =>
          `insert into public.assessment_templates values ('${t.id}',${str(t)}) on conflict(id) do nothing;`,
      )
      .join("\n"),
);
writeFileSync(
  "supabase/tests/demo-fixtures.sql",
  s.profiles
    .map(
      (p) =>
        `insert into auth.users(id) values ('${p.id}');\ninsert into public.profiles (id,name,role,active,code) values ('${p.id}','${p.name}','${p.role}',true,'${p.code}');`,
    )
    .join("\n") +
    "\n" +
    s.classes
      .map(
        (c) =>
          `insert into public.classes (id,name,join_code,schedule) values ('${c.id}','${c.name}','${c.joinCode}','${c.schedule}');\n` +
          [...c.teacherIds, ...c.studentIds]
            .map(
              (p) =>
                `insert into public.class_memberships values ('${c.id}','${p}');`,
            )
            .join("\n"),
      )
      .join("\n") +
    "\n" +
    s.assessments
      .map(
        (a) =>
          `insert into public.assessments values('${a.id}','${a.studentId}','${a.templateId}','${a.status}',${a.revision},${str(a)});`,
      )
      .join("\n"),
);
