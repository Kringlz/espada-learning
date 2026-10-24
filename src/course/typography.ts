import { Platform } from "react-native";

// Book-like prose pairs with the bundled TeX glyphs, including Cyrillic text.
export const readingFont = Platform.select({
  web: 'Georgia, "Times New Roman", serif',
  ios: "Georgia",
  default: "serif",
});
