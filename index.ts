import { registerRootComponent } from "expo";
import App from "./App";
import { randomUUID } from "expo-crypto";
import { configureIds } from "./src/core/ids";
configureIds(randomUUID);
if (typeof document !== "undefined") document.documentElement.lang = "ru";
registerRootComponent(App);
