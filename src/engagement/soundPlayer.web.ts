import { Asset } from "expo-asset";
import { soundAssets, SoundName } from "./soundAssets";

/** Created only by interaction. Resume respects browser gesture policy; no replay queue. */
export function createSoundPlayer() {
  let context: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  let generation = 0;
  let disposed = false;
  const buffers = new Map<SoundName, Promise<AudioBuffer>>();
  const stop = () => {
    generation++;
    source?.stop();
    source = null;
  };
  const hide = () => {
    if (document.hidden) stop();
  };
  document.addEventListener("visibilitychange", hide);
  return {
    play(name: SoundName, volume: number) {
      if (disposed || document.hidden) return;
      stop();
      const ticket = generation;
      try {
        context ??= new AudioContext();
        const audio = context;
        const resumed = audio.resume();
        if (!buffers.has(name))
          buffers.set(
            name,
            fetch(Asset.fromModule(soundAssets[name]).uri)
              .then((response) => {
                if (!response.ok) throw Error("Sound unavailable");
                return response.arrayBuffer();
              })
              .then((bytes) => audio.decodeAudioData(bytes))
              .catch((error) => {
                buffers.delete(name);
                throw error;
              }),
          );
        void Promise.all([resumed, buffers.get(name)!])
          .then(([, buffer]) => {
            if (
              disposed ||
              ticket !== generation ||
              document.hidden ||
              audio.state !== "running"
            )
              return;
            const gain = audio.createGain();
            gain.gain.value = volume;
            gain.connect(audio.destination);
            const node = audio.createBufferSource();
            node.buffer = buffer;
            node.connect(gain);
            source = node;
            node.onended = () => {
              node.disconnect();
              gain.disconnect();
              if (source === node) source = null;
            };
            node.start();
          })
          .catch(() => {});
      } catch {
        /* Audio is optional when unavailable or blocked by browser policy. */
      }
    },
    stop,
    dispose() {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", hide);
      void context?.close().catch(() => {});
      buffers.clear();
    },
  };
}
