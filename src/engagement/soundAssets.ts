export const soundAssets = {
  open: require("../../assets/sounds/clicks/open.wav"),
  select: require("../../assets/sounds/clicks/select.wav"),
  navigate: require("../../assets/sounds/clicks/navigate.wav"),
  expand: require("../../assets/sounds/clicks/expand.wav"),
  collapse: require("../../assets/sounds/clicks/collapse.wav"),
  copy: require("../../assets/sounds/clicks/copy.wav"),
  success: require("../../assets/sounds/clicks/success.wav"),
  successAlt: require("../../assets/sounds/clicks/successAlt.wav"),
  wrong: require("../../assets/sounds/clicks/wrong.wav"),
  level: require("../../assets/sounds/clicks/level.wav"),
};
export const musicAsset = require("../../assets/sounds/clarity/music.wav");
export type SoundName = keyof typeof soundAssets;
export const soundGain: Record<SoundName, number> = {
  open: 0.3,
  select: 0.32,
  navigate: 0.28,
  expand: 0.26,
  collapse: 0.24,
  copy: 0.42,
  success: 0.52,
  successAlt: 0.52,
  wrong: 0.32,
  level: 0.6,
};
