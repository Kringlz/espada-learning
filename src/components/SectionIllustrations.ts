import { ImageSourcePropType } from "react-native";

/** Historical engravings from Bion / Stone (1758), restored by Nicholas Rougeux (CC0). */
const sectionArt = {
  numbers: {
    image: require("../../assets/illustrations/atlas/numbers.jpg"),
    color: "#EFEADE",
  },
  fractions: {
    image: require("../../assets/illustrations/atlas/fractions.jpg"),
    color: "#EFEADE",
  },
  geometry: {
    image: require("../../assets/illustrations/atlas/geometry.jpg"),
    color: "#EFEADE",
  },
  algebra: {
    image: require("../../assets/illustrations/atlas/algebra.jpg"),
    color: "#EFEADE",
  },
  graphs: {
    image: require("../../assets/illustrations/atlas/graphs.jpg"),
    color: "#EFEADE",
  },
  probability: {
    image: require("../../assets/illustrations/atlas/probability.jpg"),
    color: "#EFEADE",
  },
  ratio: {
    image: require("../../assets/illustrations/atlas/ratio.jpg"),
    color: "#EFEADE",
  },
  learning: {
    image: require("../../assets/illustrations/atlas/ratio.jpg"),
    color: "#EFEADE",
  },
  practice: {
    image: require("../../assets/illustrations/atlas/practice.jpg"),
    color: "#EFEADE",
  },
  league: {
    image: require("../../assets/illustrations/atlas/ratio.jpg"),
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
