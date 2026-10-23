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
  paper: "#F2F5F2",
  white: "#FFFFFF",
  ink: "#1E3029",
  muted: "#64766E",
  green: "#38684F",
  primary: "#38684F",
  onPrimary: "#FFFFFF",
  light: "#E8F0E9",
  subtle: "#ECF1ED",
  selected: "#DCEBDD",
  line: "#DDE6DF",
};
const clarityDark: Palette = {
  ...darkColors,
  paper: "#03060C",
  white: "#0B121A",
  ink: "#EDF0F5",
  muted: "#A1AFBD",
  green: "#B3D9BF",
  primary: "#B3D9BF",
  onPrimary: "#102319",
  light: "#14251F",
  subtle: "#101B22",
  selected: "#1C352B",
  line: "#1C2A31",
  gold: "#D7BD8B",
  warning: "#302A20",
  error: "#35232A",
  red: "#F1A5AD",
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
      green: theme.dark ? "#B3D9BF" : "#38684F",
      primary: theme.dark ? "#B3D9BF" : "#38684F",
      onPrimary: theme.dark ? "#102319" : "#FFFFFF",
      selected: theme.dark ? "#1C352B" : "#DCEBDD",
      light: theme.dark ? "#14251F" : "#E8F0E9",
    }),
    [theme.colors, theme.dark],
  );
  return <Ctx.Provider value={{ ...theme, colors }}>{children}</Ctx.Provider>;
}

/** Reading, practice and tools share the night sky; the header owns light mode. */
export function CosmicSurface({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Ctx.Provider value={{ ...theme, dark: true, colors: clarityDark }}>
      {children}
    </Ctx.Provider>
  );
}
