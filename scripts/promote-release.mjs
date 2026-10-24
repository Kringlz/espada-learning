import { execFileSync, spawnSync } from "node:child_process";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const sha = process.env.GITHUB_SHA;
if (process.env.GITHUB_REF !== "refs/heads/main" || !/^[a-f0-9]{40}$/.test(sha ?? "")) {
  throw new Error("Release promotion requires the exact main deployment commit.");
}
if (git("rev-parse", "HEAD") !== sha) throw new Error("Checkout does not match the deployed commit.");
const current = git("rev-parse", "refs/tags/release/current^{commit}");
const previous = git("rev-parse", "refs/tags/release/previous^{commit}");
// Immutable per-deployment marker; a rerun must not change its target.
const release = `release/build-${sha.slice(0, 12)}`;
const found = spawnSync("git", ["show-ref", "--verify", "--quiet", `refs/tags/${release}`]);
if (found.status === 0) {
  const existing = git("rev-parse", "--verify", `refs/tags/${release}^{commit}`);
  if (existing !== sha) throw new Error("Immutable release tag has a different target.");
} else if (found.status === 1) {
  git("tag", release, sha);
} else throw new Error("Cannot inspect release tag.");
if (current !== sha) {
  git("tag", "-f", "release/previous", current);
  git("tag", "-f", "release/current", sha);
}
// Both moving pointers change together. Leases prevent overwriting a concurrent promotion.
git(
  "push", "--atomic",
  `--force-with-lease=refs/tags/release/current:${current}`,
  `--force-with-lease=refs/tags/release/previous:${previous}`,
  "origin", "refs/tags/release/current", "refs/tags/release/previous", `refs/tags/${release}`,
);
console.log(`Successful release recorded: ${sha}; previous: ${current === sha ? previous : current}`);
