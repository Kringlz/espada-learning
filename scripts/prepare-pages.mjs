import { readFileSync, writeFileSync, existsSync, cpSync } from "node:fs";
import { resolve } from "node:path";

const base = (process.env.GITHUB_PAGES_BASE_PATH ?? "").replace(/\/$/, "");
const html = readFileSync("dist/index.html", "utf8");
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
if (!assets.some((asset) => asset.endsWith(".js")))
  throw new Error("No exported application script found.");
writeFileSync("dist/.nojekyll", "");
// The app currently uses in-memory navigation. Preserve entry loading if a URL path is shared.
writeFileSync("dist/404.html", html);
// Publish the standalone design preview with the same locally bundled artwork.
cpSync("design-lab", "dist/design-lab", {
  recursive: true,
  filter: (source) =>
    !/\/(?:README\.md|section-illustrations-preview\.png|clarity-garden-prompt\.txt)$/.test(source),
});
console.log(
  `Verified ${assets.length} root assets for ${base || "/"}; GitHub Pages files ready.`,
);
