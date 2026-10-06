export const soundAssets = {
  open: require("../../assets/sounds/clarity/open.wav"),
  success: require("../../assets/sounds/clarity/success.wav"),
  wrong: require("../../assets/sounds/clarity/wrong.wav"),
  level: require("../../assets/sounds/clarity/level.wav"),
};
export const musicAsset = require("../../assets/sounds/clarity/music.wav");
export type SoundName = keyof typeof soundAssets;
