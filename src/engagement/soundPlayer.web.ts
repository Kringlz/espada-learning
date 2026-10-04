import { Asset } from "expo-asset";
import { soundAssets, SoundName } from "./soundAssets";

export function createSoundPlayer() {
  const players = new Map<SoundName, HTMLAudioElement>();
  return {
    play(name: SoundName) {
      let audio = players.get(name);
      if (!audio) {
        audio = new Audio(Asset.fromModule(soundAssets[name]).uri);
        audio.volume = 0.45;
        audio.hidden = true;
        audio.setAttribute("aria-hidden", "true");
        audio.setAttribute("data-testid", `sound-${name}`);
        document.body.appendChild(audio);
        players.set(name, audio);
      }
      for (const player of players.values()) {
        player.pause();
        player.currentTime = 0;
      }
      void audio.play().catch(() => {});
    },
    stop() {
      for (const player of players.values()) {
        player.pause();
        player.currentTime = 0;
      }
    },
    dispose() {
      for (const player of players.values()) {
        player.pause();
        player.removeAttribute("src");
        player.load();
        player.remove();
      }
      players.clear();
    },
  };
}
