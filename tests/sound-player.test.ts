import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const flush = () => new Promise((resolve) => setImmediate(resolve));
function webPlayer() {
  let finish!: (buffer: object) => void;
  const decoded = new Promise<object>((resolve) => {
    finish = resolve;
  });
  const starts: object[] = [],
    gains: number[] = [];
  let stops = 0,
    closes = 0,
    rejectResume = false;
  const document = {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  };
  class Context {
    state = "running";
    destination = {};
    resume() {
      return rejectResume
        ? Promise.reject(Error("NotAllowedError"))
        : Promise.resolve();
    }
    decodeAudioData() {
      return decoded;
    }
    createGain() {
      const gain = { value: 0 };
      return {
        gain,
        connect() {
          gains.push(gain.value);
        },
        disconnect() {},
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        connect() {},
        disconnect() {},
        start() {
          starts.push({});
        },
        stop() {
          stops++;
        },
      };
    }
    close() {
      closes++;
      return Promise.resolve();
    }
  }
  const js = ts.transpileModule(
    readFileSync(
      new URL("../src/engagement/soundPlayer.web.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports: any = {};
  new Function("require", "exports", "AudioContext", "document", "fetch", js)(
    (name: string) =>
      name === "expo-asset"
        ? { Asset: { fromModule: () => ({ uri: "test.wav" }) } }
        : { soundAssets: { points: 1, radar: 2 } },
    exports,
    Context,
    document,
    async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
  );
  return {
    player: exports.createSoundPlayer(),
    starts,
    gains,
    finish,
    document,
    stops: () => stops,
    closes: () => closes,
    block: () => {
      rejectResume = true;
    },
  };
}
test("web audio uses selected volume, interrupts previous sound, releases context", async () => {
  const h = webPlayer();
  h.player.play("points", 0.2);
  h.finish({});
  await flush();
  assert.equal(h.starts.length, 1);
  assert.deepEqual(h.gains, [0.2]);
  h.player.play("radar", 0.45);
  await flush();
  assert.equal(h.starts.length, 2);
  assert.equal(h.stops(), 1);
  h.player.dispose();
  assert.equal(h.closes(), 1);
});
test("mute while decoding cancels delayed playback; a later deliberate action works", async () => {
  const h = webPlayer();
  h.player.play("points", 0.2);
  h.player.stop();
  h.finish({});
  await flush();
  assert.equal(h.starts.length, 0);
  h.player.play("points", 0.2);
  await flush();
  assert.equal(h.starts.length, 1);
});
test("hidden page, browser policy rejection and disposal never start queued sound", async () => {
  for (const scenario of ["hidden", "blocked", "disposed"]) {
    const h = webPlayer();
    if (scenario === "blocked") h.block();
    h.player.play("points", 0.45);
    if (scenario === "hidden") h.document.hidden = true;
    if (scenario === "disposed") h.player.dispose();
    h.finish({});
    await flush();
    assert.equal(h.starts.length, 0, scenario);
  }
});
