export const soundAssets = {
  radar: require("../../assets/sounds/radar.wav"),
  points: require("../../assets/sounds/points.wav"),
  streak: require("../../assets/sounds/streak.wav"),
  open: require("../../assets/sounds/open.wav"),
  success: require("../../assets/sounds/success.wav"),
  level: require("../../assets/sounds/level.wav"),
};
export type SoundName = keyof typeof soundAssets;
