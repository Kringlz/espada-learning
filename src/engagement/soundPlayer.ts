import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { soundAssets, SoundName } from "./soundAssets";

export function createSoundPlayer() {
  const players = new Map<SoundName, ReturnType<typeof createAudioPlayer>>();
  void setAudioModeAsync({
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    interruptionMode: "mixWithOthers",
  }).catch(() => {});
  return {
    play(name: SoundName) {
      let player = players.get(name);
      if (!player) {
        player = createAudioPlayer(soundAssets[name]);
        player.volume = 0.45;
        players.set(name, player);
      }
      for (const item of players.values()) item.pause();
      void player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {});
    },
    stop() {
      for (const player of players.values()) player.pause();
    },
    dispose() {
      for (const player of players.values()) player.remove();
      players.clear();
    },
  };
}
