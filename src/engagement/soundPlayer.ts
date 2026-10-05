import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { soundAssets, SoundName } from "./soundAssets";

export function createSoundPlayer() {
  const players = new Map<SoundName, ReturnType<typeof createAudioPlayer>>();
  void setAudioModeAsync({
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    interruptionMode: "mixWithOthers",
  }).catch(() => {});
  let generation = 0;
  return {
    play(name: SoundName, volume: number) {
      const ticket = ++generation;
      let player = players.get(name);
      if (!player) {
        player = createAudioPlayer(soundAssets[name]);

        players.set(name, player);
      }
      player.volume = volume;
      for (const item of players.values()) item.pause();
      void player
        .seekTo(0)
        .then(() => {
          if (ticket === generation) player.play();
        })
        .catch(() => {});
    },
    stop() {
      generation++;
      for (const player of players.values()) player.pause();
    },
    dispose() {
      generation++;
      for (const player of players.values()) player.remove();
      players.clear();
    },
  };
}
