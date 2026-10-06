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
  const [preference, setValue] = useState<Preference>("system");
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

// All roles and authentication share the approved «Ясно» palette.
const clarityLight: Palette = {
  ...lightColors,
  paper: "#F7FAF3",
  white: "#FFFFFF",
  ink: "#203C30",
  muted: "#4B5D50",
  green: "#386747",
  primary: "#386747",
  onPrimary: "#FFFFFF",
  light: "#EAF0DC",
  subtle: "#F0F4E9",
  selected: "#DCE9D2",
  line: "#CFD9C9",
  warning: "#F5F0D1",
  error: "#F9ECE7",
  red: "#85372D",
};
const clarityDark: Palette = {
  ...darkColors,
  paper: "#121D18",
  white: "#1B2A22",
  ink: "#EEF4E8",
  muted: "#B9CBB9",
  green: "#A5CF89",
  primary: "#A5CF89",
  onPrimary: "#172B1C",
  light: "#263927",
  subtle: "#2A3C2D",
  selected: "#29412C",
  line: "#455E49",
  warning: "#3B3B25",
  error: "#482F27",
  red: "#FFC1A2",
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
