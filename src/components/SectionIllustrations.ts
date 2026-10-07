import { ImageSourcePropType } from "react-native";
import { emblemSource } from "./SectionEmblems";

/** Recognizable mathematical objects from Game-icons.net, CC BY 3.0. */
const sectionArt = {
  numbers: {
    image: emblemSource("numbers"),
    color: "#EFEADE",
  },
  fractions: {
    image: emblemSource("fractions"),
    color: "#EFEADE",
  },
  geometry: {
    image: emblemSource("geometry"),
    color: "#EFEADE",
  },
  algebra: {
    image: emblemSource("algebra"),
    color: "#EFEADE",
  },
  graphs: {
    image: emblemSource("graphs"),
    color: "#EFEADE",
  },
  probability: {
    image: emblemSource("probability"),
    color: "#EFEADE",
  },
  ratio: {
    image: emblemSource("ratio"),
    color: "#EFEADE",
  },
  learning: {
    image: emblemSource("compass"),
    color: "#EFEADE",
  },
  practice: {
    image: emblemSource("geometry"),
    color: "#EFEADE",
  },
  league: {
    image: emblemSource("compass"),
    color: "#EFEADE",
  },
} satisfies Record<string, { image: ImageSourcePropType; color: string }>;

export const sectionIllustrations = {
  ...sectionArt,
  decimals: sectionArt.fractions,
  percent: sectionArt.ratio,
  motion: sectionArt.algebra,
  powers: sectionArt.algebra,
  sequences: sectionArt.algebra,
  trigonometry: sectionArt.algebra,
  calculus: sectionArt.graphs,
  stereometry: sectionArt.geometry,
  progress: sectionArt.probability,
};
