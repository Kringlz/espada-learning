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
