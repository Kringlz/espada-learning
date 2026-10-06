import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { soundAssets, musicAsset, SoundName } from "./soundAssets";
export function createSoundPlayer() {
  const players = new Map<SoundName, ReturnType<typeof createAudioPlayer>>();
  let music: ReturnType<typeof createAudioPlayer> | null = null;
  let volume = 0.3;
  let generation = 0;
  void setAudioModeAsync({
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    interruptionMode: "mixWithOthers",
  }).catch(() => {});
  return {
    play(name: SoundName) {
      const request = ++generation;
      let player = players.get(name);
      if (!player) {
        player = createAudioPlayer(soundAssets[name]);
        player.volume = volume;
        players.set(name, player);
      }
      for (const item of players.values()) item.pause();
      const target = player;
      void target
        .seekTo(0)
        .then(() => {
          if (generation === request) target.play();
        })
        .catch(() => {});
    },
    setVolume(value: number) {
      volume = value;
      for (const item of players.values()) item.volume = volume;
      if (music) music.volume = volume;
    },
    async startMusic() {
      music ??= createAudioPlayer(musicAsset);
      music.loop = true;
      music.volume = volume;
      music.play();
    },
    stopMusic() {
      music?.pause();
    },
    stop() {
      generation++;
      for (const item of players.values()) item.pause();
    },
    dispose() {
      generation++;
      for (const item of players.values()) item.remove();
      music?.remove();
      music = null;
      players.clear();
    },
  };
}
