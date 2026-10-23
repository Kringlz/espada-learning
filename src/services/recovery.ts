import { Linking, Platform } from "react-native";
import { backend, authStorage } from "./supabase";
import { authFailure, AuthFlowError } from "./authFlow";
import { passwordError } from "./password";
import { webAuthRedirect } from "./authRedirect";

const recoveryKey = `${authStorage.authKey}-recovery`;
// Subscribe at module load: the SDK can consume a callback before React mounts.
export const recovery = { userId: null as string | null };
backend?.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session) {
    recovery.userId = session.user.id;
    void authStorage.setItem(recoveryKey, session.user.id).catch(() => {});
  } else if (event === "SIGNED_OUT") {
    recovery.userId = null;
    // Supabase broadcasts sign-out, but does not erase another tab's sessionStorage.
    void authStorage.clear().catch(() => {});
  }
});
export async function isRecovering(userId: string) {
  return (
    recovery.userId === userId ||
    (await authStorage.getItem(recoveryKey)) === userId
  );
}
export async function clearRecovery() {
  recovery.userId = null;
  await authStorage.removeItem(recoveryKey);
}
export async function saveNewPassword(password: string) {
  if (!backend) throw Error("Backend is not configured.");
  if (passwordError(password))
    throw new AuthFlowError("Минимум 8 символов", "weak_password");
  const { data, error: sessionError } = await backend.auth.getSession();
  if (sessionError) throw authFailure(sessionError);
  if (!data.session || !(await isRecovering(data.session.user.id)))
    throw new AuthFlowError("Ссылка устарела. Запросите новую.", "otp_expired");
  const { error } = await backend.auth.updateUser({ password });
  if (error) throw authFailure(error);
}
export function recoveryRedirect() {
  if (Platform.OS !== "web") return "espada://auth/recovery";
  return webAuthRedirect(window.location);
}
/** The native app accepts only its recovery callback, never arbitrary links. */
export async function handleRecoveryLink(url: string) {
  if (!backend || !url.startsWith("espada://auth/recovery")) return;
  const parsed = new URL(url);
  if (parsed.hostname !== "auth" || parsed.pathname !== "/recovery") return;
  const params = new URLSearchParams(
    parsed.hash.slice(1) || parsed.search.slice(1),
  );
  if (params.has("error"))
    throw new AuthFlowError("Ссылка устарела. Запросите новую.", "otp_expired");
  if (params.get("type") !== "recovery") return;
  const access_token = params.get("access_token"),
    refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return;
  const { data, error } = await backend.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw authFailure(error);
  if (data.session) {
    recovery.userId = data.session.user.id;
    await authStorage.setItem(recoveryKey, data.session.user.id);
  }
}
export { Linking };
