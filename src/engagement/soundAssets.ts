export const soundAssets = {
  open: require("../../assets/sounds/open.wav"),
  success: require("../../assets/sounds/success.wav"),
  level: require("../../assets/sounds/level.wav"),
};
export type SoundName = keyof typeof soundAssets;
