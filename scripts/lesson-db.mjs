// Local test tooling only. Never import this module into the app bundle.
import { spawn } from "node:child_process";
export const database = process.env.ESPADA_TEST_DATABASE_URL;
export function requireDisposableDatabase() {
  if (!database)
    throw Error("Set ESPADA_TEST_DATABASE_URL to a disposable local database.");
  const u = new URL(database);
  if (
    !["127.0.0.1", "localhost"].includes(u.hostname) ||
    !/^\/espada_lessons_[a-z0-9_]+$/.test(u.pathname)
  )
    throw Error("Only local databases named espada_lessons_* are allowed.");
}
export const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
export function sql(statement) {
  requireDisposableDatabase();
  return new Promise((resolve, reject) => {
    const p = spawn(
      process.env.PSQL_BIN || "psql",
      [database, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "",
      err = "";
    p.stdout.on("data", (x) => (out += x));
    p.stderr.on("data", (x) => (err += x));
    p.on("error", reject);
    p.on("close", (code) =>
      code ? reject(Error(err.trim())) : resolve(out.trim()),
    );
    p.stdin.end("set standard_conforming_strings=on;\n" + statement);
  });
}
export const actors = {
  student: "00000000-0000-4000-8000-000000000001",
  other: "00000000-0000-4000-8000-000000000002",
  teacher: "00000000-0000-4000-8000-000000000003",
  admin: "00000000-0000-4000-8000-000000000004",
};
const rpcArguments = {
  lesson_catalog: [],
  lesson_read: ["p_id"],
  lesson_admin_export: ["p_id"],
  lesson_import: ["p_package", "p_dry_run", "p_request_id"],
  lesson_attempt_read: ["p_id"],
  lesson_attempt_history: ["p_lesson_id"],
  lesson_start: ["p_lesson_id", "p_request_id"],
  lesson_save_answers: ["p_attempt_id", "p_answers", "p_revision"],
  lesson_submit: ["p_attempt_id", "p_revision"],
};
export async function rpc(actor, name, args = {}) {
  if (
    !Object.values(actors).includes(actor) ||
    !Object.hasOwn(rpcArguments, name)
  )
    throw Error("Unknown fixture or RPC.");
  if (Object.keys(args).some((k) => !rpcArguments[name].includes(k)))
    throw Error("Unknown argument.");
  const params = Object.entries(args)
    .map(
      ([k, v]) =>
        `${k} => ${v === null ? "null" : typeof v === "object" ? quote(JSON.stringify(v)) + "::jsonb" : typeof v === "boolean" ? String(v) : typeof v === "number" && Number.isInteger(v) ? String(v) : quote(v)}`,
    )
    .join(",");
  return JSON.parse(
    await sql(
      `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(actor)};select public.${name}(${params});commit;`,
    ),
  );
}
