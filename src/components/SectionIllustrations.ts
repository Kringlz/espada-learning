import { ImageSourcePropType } from "react-native";

/** Streamline Ultimate Colors, CC BY 4.0. Sources and modifications live beside the assets. */
const sectionArt = {
  numbers: {
    image: require("../../assets/illustrations/streamline/numbers.png"),
    color: "#F7F4E9",
  },
  fractions: {
    image: require("../../assets/illustrations/streamline/fractions.png"),
    color: "#F7F4E9",
  },
  geometry: {
    image: require("../../assets/illustrations/streamline/geometry.png"),
    color: "#F7F4E9",
  },
  algebra: {
    image: require("../../assets/illustrations/streamline/algebra.png"),
    color: "#F7F4E9",
  },
  graphs: {
    image: require("../../assets/illustrations/streamline/graphs.png"),
    color: "#F7F4E9",
  },
  probability: {
    image: require("../../assets/illustrations/streamline/probability.png"),
    color: "#F7F4E9",
  },
  ratio: {
    image: require("../../assets/illustrations/streamline/ratio.png"),
    color: "#F7F4E9",
  },
  learning: {
    image: require("../../assets/illustrations/streamline/learning.png"),
    color: "#F7F4E9",
  },
  practice: {
    image: require("../../assets/illustrations/streamline/practice.png"),
    color: "#F7F4E9",
  },
  league: {
    image: require("../../assets/illustrations/streamline/league.png"),
    color: "#F7F4E9",
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
