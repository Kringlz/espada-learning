// Tests the published format in real Chromium. No test accounts needed.
// PLAYWRIGHT_PATH may point to a shared Playwright installation.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const output = new URL("../АРХИВ/проверки/android-installation/", import.meta.url);
await mkdir(output, { recursive: true });
const root = resolve("dist");
const prefix = "/espada-learning/";
const types = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript",
  ".png": "image/png", ".webmanifest": "application/manifest+json",
  ".json": "application/json", ".ttf": "font/ttf", ".jpg": "image/jpeg", ".wav": "audio/wav",
};
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (!path.startsWith(prefix)) { res.writeHead(404).end(); return; }
  const file = resolve(root, decodeURIComponent(path.slice(prefix.length)) || "index.html");
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html" }).end(await readFile(resolve(root, "404.html")));
  }
});
let context, profile;
try {
  let base = process.env.INSTALLATION_URL;
  if (!base) {
    await new Promise((done, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", done);
    });
    base = `http://127.0.0.1:${server.address().port}${prefix}`;
  }
  // Private browsing deliberately disables installation. Use a fresh, disposable
  // normal profile, never the user's Chrome profile.
  profile = await mkdtemp(fileURLToPath(new URL("chrome-profile-", output)));
  context = await chromium.launchPersistentContext(profile, {
    headless: true, channel: "chrome", viewport: { width: 1920, height: 1080 }, hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("button", { name: "Войти как гость", exact: true }).waitFor();
  // Fresh connected login screen: no actor or cabinet is impersonated.
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cdp = await context.newCDPSession(page);
  const manifestResult = await cdp.send("Page.getAppManifest");
  assert.deepEqual(manifestResult.errors, []);
  const manifest = JSON.parse(manifestResult.data);
  const manifestURL = manifestResult.url;
  for (const field of ["id", "start_url", "scope"]) assert.equal(new URL(manifest[field], manifestURL).href, base);
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const response = await context.request.get(new URL(icon.src, manifestURL).href);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /image\/png/);
  }
  const installability = await cdp.send("Page.getInstallabilityErrors");
  assert.deepEqual(installability.installabilityErrors, []);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope), base);
  await page.screenshot({ path: fileURLToPath(new URL("board-1920.png", output)) });
  await page.evaluate(() => localStorage.setItem("espada.installation-check", "preserved"));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "Нет соединения", exact: true }).waitFor();
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: fileURLToPath(new URL(`offline-${width}.png`, output)) });
  }
  await context.setOffline(false);
  await page.getByRole("button", { name: "Попробовать снова", exact: true }).click();
  await page.getByRole("button", { name: "Войти как гость", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("espada.installation-check")), "preserved");
  await page.evaluate(() => localStorage.removeItem("espada.installation-check"));
  assert.deepEqual(errors, []);
  const result = {
    url: base, browser: context.browser().version(), manifest: manifestURL,
    installabilityErrors: installability.installabilityErrors,
    display: manifest.display, viewports: [1920, 390],
    offlineRetry: "passed", localStoragePreserved: true, pageErrors: errors,
    limitation: "Physical Android board installation must be verified on that device.",
  };
  await writeFile(new URL("result.json", output), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (context) await context.close();
  if (profile) await rm(profile, { recursive: true, force: true });
  if (server.listening) await new Promise((done) => server.close(done));
}
