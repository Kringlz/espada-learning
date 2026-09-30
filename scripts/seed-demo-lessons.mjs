import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { rpc, actors } from "./lesson-db.mjs";
if (!process.argv.includes("--local-preview"))
  throw Error(
    "Explicit --local-preview required. Hosted seeding must use an authenticated administrator import.",
  );
const data = JSON.parse(
  await readFile(
    new URL("../content/demo-lessons.json", import.meta.url),
    "utf8",
  ),
);
for (const l of data.lessons) l.status = "published";
console.log(
  await rpc(actors.admin, "lesson_import", {
    p_package: data,
    p_dry_run: true,
  }),
);
console.log(
  await rpc(actors.admin, "lesson_import", {
    p_package: data,
    p_dry_run: false,
    p_request_id: randomUUID(),
  }),
);
