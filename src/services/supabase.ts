import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Command, State } from "../core/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SessionPersistence, memorySessionStore } from "./sessionPersistence";
import { ChunkedPrivateStorage } from "./privateStorage";
const nativePrivateStorage = new ChunkedPrivateStorage({
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
});
export const secureStorage =
  Platform.OS === "web"
    ? {
        async getItem(key: string) {
          return typeof sessionStorage === "undefined"
            ? null
            : sessionStorage.getItem(key);
        },
        async setItem(key: string, value: string) {
          sessionStorage.setItem(key, value);
        },
        async removeItem(key: string) {
          sessionStorage.removeItem(key);
        },
      }
    : nativePrivateStorage;
export const mode =
  process.env.EXPO_PUBLIC_DATA_MODE === "supabase" ? "supabase" : "demo";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const project = url ? new URL(url).hostname.split(".")[0] : "unconfigured";
export const authStorage = new SessionPersistence({
  durable:
    Platform.OS === "web"
      ? {
          async getItem(key) {
            return typeof localStorage === "undefined"
              ? null
              : localStorage.getItem(key);
          },
          async setItem(key, value) {
            localStorage.setItem(key, value);
          },
          async removeItem(key) {
            localStorage.removeItem(key);
          },
        }
      : nativePrivateStorage,
  temporary: Platform.OS === "web" ? secureStorage : memorySessionStore(),
  preferences: AsyncStorage,
  preferenceKey: `espada.auth.remember.v1:${project}`,
  authKey: `sb-${project}-auth-token`,
  defaultRemember: Platform.OS !== "web",
});
export const getRememberMe = () => authStorage.remembers();
export const setRememberMe = (value: boolean) => authStorage.setRemember(value);
export const backend =
  mode === "supabase" && url && key
    ? createClient(url, key, {
        auth: {
          storage: authStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
        },
      })
    : null;
export async function remoteRead(): Promise<State> {
  if (!backend)
    throw Error(
      "Add your Supabase URL and public key to use connected accounts.",
    );
  const { data, error } = await backend.rpc("load_learning_state");
  if (error) throw Error(error.message);
  return data as State;
}
export async function remoteDispatch(cmd: Command): Promise<State> {
  if (!backend) throw Error("Backend not configured.");
  const { error } = await backend.rpc("learning_command", { command: cmd });
  if (error) throw Error(error.message);
  return remoteRead();
}
export async function remoteRegister(
  name: string,
  role: string,
  code?: string,
): Promise<void> {
  if (!backend) throw Error("Backend not configured.");
  const { error } = await backend.rpc("register_profile", {
    p_name: name,
    p_role: role,
    p_code: code ?? null,
  });
  if (error) throw Error(error.message);
}
