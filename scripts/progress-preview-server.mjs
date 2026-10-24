// LOCAL ONLY: explicit fixture identities, real PostgreSQL RLS, no hosted authentication.
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { sql, quote, requireDisposableDatabase } from "./lesson-db.mjs";
requireDisposableDatabase();
if (!process.argv.includes("--local-preview"))
  throw Error("Explicit --local-preview required.");
const port = Number(process.env.ESPADA_PROGRESS_PORT || 55434),
  root = new URL("../АРХИВ/локальные-данные/progress-private-files/", import.meta.url);
await mkdir(root, { recursive: true });
const actors = [1, 2, 3, 4, 5, 450].map(
  (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
);
const run = (actor, s) =>
  sql(
    `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(actor)};${s};commit;`,
  );
const mime = (buffer) =>
  buffer.subarray(0, 5).toString() === "%PDF-"
    ? "application/pdf"
    : buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
        ? "image/jpeg"
        : null;
createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (
    req.headers.host !== `127.0.0.1:${port}` ||
    !origin ||
    !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)
  ) {
    res.writeHead(403).end();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Preview-Actor");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  try {
    const actor = req.headers["x-preview-actor"];
    if (!actors.includes(actor)) throw Error("Unknown test identity.");
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/rpc" && req.method === "POST") {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 300000) throw Error("Пакет слишком большой.");
      }
      const { name, args } = JSON.parse(body);
      let statement;
      if (
        name === "progress_read" &&
        Object.keys(args).join(",") === "p_student"
      )
        statement = `select public.progress_read(${quote(args.p_student)}::uuid)`;
      else if (
        name === "progress_command" &&
        Object.keys(args).join(",") === "p_command"
      )
        statement = `select public.progress_command(${quote(JSON.stringify(args.p_command))}::jsonb)`;
      else throw Error("Unknown RPC.");
      const data = JSON.parse(await run(actor, statement));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ data }));
    } else if (url.pathname === "/file") {
      const path = url.searchParams.get("path");
      if (!path || path.length > 400) throw Error("Invalid file path.");
      const disk = new URL(
        createHash("sha256").update(path).digest("hex"),
        root,
      );
      if (req.method === "POST") {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 10485760) throw Error("Файл больше 10 МБ.");
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks),
          type = mime(bytes);
        if (!type || type !== req.headers["content-type"])
          throw Error("Содержимое файла не соответствует JPG, PNG или PDF.");
        await run(
          actor,
          `insert into storage.objects(bucket_id,name,owner_id,metadata) values('student-works',${quote(path)},${quote(actor)},${quote(JSON.stringify({ mimetype: type, size }))}::jsonb)`,
        );
        await writeFile(disk, bytes, { flag: "wx" });
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ saved: true }));
      } else if (req.method === "GET") {
        const raw = await run(
          actor,
          `select metadata from storage.objects where bucket_id='student-works' and name=${quote(path)}`,
        );
        if (!raw) {
          res.writeHead(403).end();
          return;
        }
        const meta = JSON.parse(raw);
        res.setHeader("Content-Type", meta.mimetype);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(await readFile(disk));
      } else res.writeHead(405).end();
    } else res.writeHead(404).end();
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`LOCAL TEST FIXTURES ONLY: http://127.0.0.1:${port}`),
);
