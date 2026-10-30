import { cpSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

for (const name of ["АРХИВ", "РЕСЕТЫ", "design-lab", "review", "tmp", ".git"]) {
  if (existsSync(resolve("dist", name))) throw new Error(`Refusing to publish historical/private directory: ${name}`);
}

const base = (process.env.GITHUB_PAGES_BASE_PATH ?? "").replace(/\/$/, "");
if (base && !/^\/(?:[A-Za-z0-9_-]+\/?)+$/.test(base))
  throw new Error("Invalid GitHub Pages base path.");
cpSync(new URL("../assets/pwa/", import.meta.url), resolve("dist"), { recursive: true });
let html = readFileSync("dist/index.html", "utf8");
if (!html.includes("</head>")) throw new Error("Exported HTML is missing its head.");
// Re-running preparation must not duplicate links or service worker registration.
html = html.replace(/\n?<!-- Espada installation -->[\s\S]*?<!-- End Espada installation -->\n?/g, "");
html = html.replace("</head>", `\n<!-- Espada installation -->
<link rel="manifest" href="${base}/manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="${base}/icons/icon-192.png">
<link rel="apple-touch-icon" href="${base}/icons/icon-192.png">
<meta name="theme-color" content="#326745">
<meta name="mobile-web-app-capable" content="yes">
<script defer src="${base}/register.js"></script>
<!-- End Espada installation -->
</head>`);
const assets = [...html.matchAll(/(?:src|href)="([^"?#]+)[^"]*"/g)]
  .map((match) => match[1])
  .filter((value) => value.startsWith("/"));
for (const asset of assets) {
  if (!asset.startsWith(`${base}/`))
    throw new Error(`Asset is outside the Pages path: ${asset}`);
  const file = resolve("dist", asset.slice(base.length + 1));
  if (!file.startsWith(resolve("dist") + "/") || !existsSync(file))
    throw new Error(`Missing exported asset: ${asset}`);
}
if (!assets.some((asset) => asset.endsWith(".js") && asset !== `${base}/register.js`))
  throw new Error("No exported application script found.");
const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
for (const icon of manifest.icons) {
  if (!existsSync(resolve("dist", icon.src))) throw new Error(`Missing app icon: ${icon.src}`);
}
writeFileSync("dist/index.html", html);
writeFileSync("dist/.nojekyll", "");
// The app currently uses in-memory navigation. Preserve entry loading if a URL path is shared.
writeFileSync("dist/404.html", html);
const commit = process.env.GITHUB_SHA ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error("Missing exact build commit.");
writeFileSync("dist/release.json", JSON.stringify({
  commit,
  branch: process.env.GITHUB_REF_NAME ?? execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
  builtAt: new Date().toISOString(),
}, null, 2) + "\n");
console.log(
  `Verified ${assets.length} root assets for ${base || "/"}; GitHub Pages files ready.`,
);
