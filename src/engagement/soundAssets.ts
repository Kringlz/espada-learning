export const soundAssets = {
  open: require("../../assets/sounds/interface/open.wav"),
  select: require("../../assets/sounds/interface/select.wav"),
  navigate: require("../../assets/sounds/interface/navigate.wav"),
  expand: require("../../assets/sounds/interface/expand.wav"),
  collapse: require("../../assets/sounds/interface/collapse.wav"),
  copy: require("../../assets/sounds/interface/copy.wav"),
  success: require("../../assets/sounds/celebration/success.wav"),
  successAlt: require("../../assets/sounds/celebration/successAlt.wav"),
  wrong: require("../../assets/sounds/interface/wrong.wav"),
  level: require("../../assets/sounds/clarity/level.wav"),
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
