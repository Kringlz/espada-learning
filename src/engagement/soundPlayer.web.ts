import { Asset } from "expo-asset";
import { soundAssets, musicAsset, SoundName } from "./soundAssets";
export function createSoundPlayer() {
  const players = new Map<SoundName, HTMLAudioElement>();
  let music: HTMLAudioElement | null = null;
  let volume = 0.3;
  const create = (asset: number, name: string) => {
    const audio = new Audio(Asset.fromModule(asset).uri);
    audio.volume = volume;
    audio.hidden = true;
    audio.setAttribute("aria-hidden", "true");
    audio.setAttribute("data-testid", `sound-${name}`);
    document.body.appendChild(audio);
    return audio;
  };
  return {
    play(name: SoundName) {
      let audio = players.get(name);
      if (!audio) {
        audio = create(soundAssets[name], name);
        players.set(name, audio);
      }
      for (const item of players.values()) {
        item.pause();
        item.currentTime = 0;
      }
      void audio.play().catch(() => {});
    },
    setVolume(value: number) {
      volume = value;
      for (const item of players.values()) item.volume = volume;
      if (music) music.volume = volume;
    },
    async startMusic() {
      music ??= create(musicAsset, "music");
      music.loop = true;
      await music.play();
    },
    stopMusic() {
      music?.pause();
    },
    stop() {
      for (const item of players.values()) {
        item.pause();
        item.currentTime = 0;
      }
    },
    dispose() {
      for (const item of [...players.values(), ...(music ? [music] : [])]) {
        item.pause();
        item.removeAttribute("src");
        item.load();
        item.remove();
      }
      music = null;
      players.clear();
    },
  };
}
