import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const scope = "https://example.test/espada-learning/";
function worker(offline = false) {
  const handlers: Record<string, (event: any) => void> = {};
  const calls: { request: unknown; options: unknown }[] = [];
  runInNewContext(readFileSync(new URL("../assets/pwa/service-worker.js", import.meta.url), "utf8"), {
    self: {
      registration: { scope },
      addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
    },
    Response,
    fetch: async (request: unknown, options: unknown) => {
      calls.push({ request, options });
      if (offline) throw new Error("Network unavailable");
      return new Response("latest published application");
    },
  });
  return {
    calls,
    fetch(request: object) {
      let response: Promise<Response> | undefined;
      handlers.fetch({ request, respondWith: (value: Promise<Response>) => { response = value; } });
      return response;
    },
  };
}

const navigation = { method: "GET", mode: "navigate", destination: "document", url: scope };

test("installed app revalidates navigation and leaves account requests, assets and other sites untouched", async () => {
  const w = worker();
  assert.equal(await (await w.fetch(navigation))?.text(), "latest published application");
  assert.equal(JSON.stringify(w.calls[0].options), JSON.stringify({ cache: "no-cache" }));
  for (const request of [
    { ...navigation, method: "POST" },
    { ...navigation, mode: "cors", destination: "", url: scope + "api/account" },
    { ...navigation, mode: "cors", destination: "script" },
    { ...navigation, destination: "iframe" },
    { ...navigation, url: "https://example.test/another-app/" },
    { ...navigation, url: "https://external.test/espada-learning/" },
  ]) assert.equal(w.fetch(request), undefined);
  assert.equal(w.calls.length, 1);
});

test("offline launch offers a retry without exposing URL parameters or pretending lessons are downloaded", async () => {
  const w = worker(true);
  const response = await w.fetch({ ...navigation, url: scope + "?code=private-value" });
  assert.ok(response);
  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const html = await response.text();
  assert.match(html, /Нет соединения/);
  assert.match(html, /Попробовать снова/);
  assert.match(html, /location.reload\(\)/);
  assert.doesNotMatch(html, /private-value/);
});
