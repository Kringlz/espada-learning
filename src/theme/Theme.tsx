import React, { createContext, useContext, useEffect, useState } from "react";
import { StatusBar, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const lightColors = {
  ink: "#2B3D31",
  muted: "#6D7668",
  green: "#60783D",
  light: "#EBEFD9",
  paper: "#F6F4EA",
  white: "#FFFFFF",
  line: "#E5E7DB",
  gold: "#EBC777",
  orange: "#A7653D",
  red: "#A3413B",
  primary: "#60783D",
  onPrimary: "#FFFFFF",
  selected: "#DEE6C6",
  subtle: "#EDF0E2",
  warning: "#FBF1D9",
  error: "#FFF0EA",
};
export type Palette = typeof lightColors;
export const darkColors: Palette = {
  ink: "#ECEEE5",
  muted: "#ABB4A8",
  green: "#BBCF98",
  light: "#2B382A",
  paper: "#141B18",
  white: "#1E2822",
  line: "#354137",
  gold: "#EBC777",
  orange: "#E6AC7D",
  red: "#FFAF9C",
  primary: "#BBCF98",
  onPrimary: "#182317",
  selected: "#3C4C33",
  subtle: "#2A362D",
  warning: "#403721",
  error: "#422D29",
};
type Preference = "system" | "light" | "dark";
const Ctx = createContext({
  colors: lightColors,
  clarity: false,
  dark: false,
  preference: "system" as Preference,
  setPreference: (_: Preference) => {},
});
export const useTheme = () => useContext(Ctx);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setValue] = useState<Preference>("dark");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem("espada.theme")
      .then((value) => {
        if (
          live &&
          (value === "light" || value === "dark" || value === "system")
        )
          setValue(value);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const dark =
    preference === "system" ? system === "dark" : preference === "dark";
  const setPreference = (value: Preference) => {
    setValue(value);
    void AsyncStorage.setItem("espada.theme", value).catch(() => {});
  };
  if (!ready) return null;
  return (
    <Ctx.Provider
      value={{
        colors: dark ? darkColors : lightColors,
        clarity: false,
        dark,
        preference,
        setPreference,
      }}
    >
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      {children}
    </Ctx.Provider>
  );
}

// Shared observatory palette across learning, staff, family and authentication.
const clarityLight: Palette = {
  ...lightColors,
  paper: "#F1F3F8",
  white: "#FFFFFF",
  ink: "#1C2942",
  muted: "#65718A",
  green: "#455F9B",
  primary: "#36578F",
  onPrimary: "#FFFFFF",
  light: "#E6ECF8",
  subtle: "#EDF0F7",
  selected: "#DDE6F7",
  line: "#D9E0ED",
  gold: "#927035",
  warning: "#FAF1DF",
  error: "#FBECEE",
  red: "#AA384B",
};
const clarityDark: Palette = {
  ...darkColors,
  paper: "#080C15",
  white: "#101725",
  ink: "#EDF1FA",
  muted: "#98A6BF",
  green: "#B4C8F3",
  primary: "#D7E2FF",
  onPrimary: "#15233F",
  light: "#19243A",
  subtle: "#141E30",
  selected: "#23324D",
  line: "#263149",
  gold: "#D7BD8B",
  warning: "#302A20",
  error: "#35232E",
  red: "#F1A5B4",
};
export function ClarityThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Ctx.Provider
      value={{
        ...theme,
        clarity: true,
        colors: theme.dark ? clarityDark : clarityLight,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/** Espada green accents within the existing observatory design. */
export function VideoLessonTheme({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const colors = React.useMemo(
    () => ({
      ...theme.colors,
      green: theme.dark ? "#A7E0A5" : "#326340",
      primary: theme.dark ? "#A7E0A5" : "#326340",
      onPrimary: theme.dark ? "#102319" : "#FFFFFF",
      selected: theme.dark ? "#203E32" : "#DCEEDD",
      light: theme.dark ? "#172C26" : "#EAF3E7",
    }),
    [theme.colors, theme.dark],
  );
  return <Ctx.Provider value={{ ...theme, colors }}>{children}</Ctx.Provider>;
}
