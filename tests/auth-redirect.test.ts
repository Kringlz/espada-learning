import test from "node:test";
import assert from "node:assert/strict";
import { webAuthRedirect } from "../src/services/authRedirect";

test("email callbacks keep the Pages subpath and exclude lesson routes and tokens", () => {
  const url = new URL(
    "https://kringlz.github.io/espada-learning/?code=private#/lesson/A06-05",
  );
  assert.equal(webAuthRedirect(url), "https://kringlz.github.io/espada-learning/");
  assert.equal(
    webAuthRedirect(new URL("http://127.0.0.1:8102/#/")),
    "http://127.0.0.1:8102/",
  );
});
