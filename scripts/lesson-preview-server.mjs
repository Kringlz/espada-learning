// Explicit local-only fixture authentication. NOT a Supabase/Auth replacement.
import { createServer } from "node:http";
import { rpc, requireDisposableDatabase } from "./lesson-db.mjs";
requireDisposableDatabase();
if (!process.argv.includes("--local-preview"))
  throw Error("Use --local-preview to enable test fixture authentication.");
createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (
    !/^127\.0\.0\.1:55433$/.test(req.headers.host || "") ||
    !origin ||
    !/^http:\/\/(localhost|127\.0\.0\.1):[0-9]+$/.test(origin)
  ) {
    res.writeHead(403).end();
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Preview-Actor");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/rpc") {
    res.writeHead(404).end();
    return;
  }
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2000000) throw Error("Пакет слишком большой.");
    }
    const { name, args } = JSON.parse(body);
    const data = await rpc(req.headers["x-preview-actor"], name, args);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ data }));
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(55433, "127.0.0.1", () =>
  console.log(
    "Local PostgreSQL lesson preview: http://127.0.0.1:55433 (fixture identities; never deploy)",
  ),
);
