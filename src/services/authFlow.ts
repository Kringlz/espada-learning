import { errorMessage } from "../i18n/errors";
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}
export function pendingMatches(
  pending: { email?: string } | null,
  email?: string,
) {
  return (
    !!pending?.email &&
    !!email &&
    normalizeEmail(pending.email) === normalizeEmail(email)
  );
}
export class AuthFlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryAfter = 0,
  ) {
    super(message);
    this.name = "AuthFlowError";
  }
}
export function authFailure(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;
  const e = error as { code?: string; message?: string; status?: number };
  const message = e?.message ?? String(error);
  const code =
    e?.code ??
    (message === "Email not confirmed"
      ? "email_not_confirmed"
      : message === "User already registered"
        ? "user_already_exists"
        : /rate limit/i.test(message)
          ? "over_email_send_rate_limit"
          : "unknown");
  const delay = message.match(/after\s+(\d+)\s+seconds/i)?.[1];
  const throttled =
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    e?.status === 429;
  const retryAfter = throttled
    ? Math.max(60, Math.min(3600, Number(delay) || 60))
    : 0;
  const messages: Record<string, string> = {
    email_not_confirmed: "Подтвердите адрес электронной почты.",
    email_address_invalid: "Проверьте адрес электронной почты.",
    validation_failed: "Проверьте почту и пароль.",
    weak_password: "Придумайте более надёжный пароль — не короче 6 символов.",
    user_already_exists: "Этот email уже зарегистрирован. Войдите в аккаунт.",
    email_exists: "Этот email уже зарегистрирован. Войдите в аккаунт.",
    invalid_credentials: "Неверная почта или пароль.",
    email_address_not_authorized:
      "Сервис пока не может отправить письмо на этот адрес. Обратитесь к администратору Espada.",
    over_email_send_rate_limit:
      "Отправка писем временно ограничена. Подождите и попробуйте снова.",
    over_request_rate_limit:
      "Слишком много попыток. Подождите и попробуйте снова.",
    otp_expired: "Код неверный или устарел. Запросите новый.",
    email_provider_disabled: "Регистрация по почте временно недоступна.",
    signup_disabled: "Регистрация временно недоступна.",
  };
  const text =
    messages[code] ??
    (/sending.*email/i.test(message)
      ? "Почтовый сервис не смог отправить письмо. Попробуйте позже."
      : errorMessage(error));
  return new AuthFlowError(text, code, retryAfter);
}

export type PrivateStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
const MAIL_KEY = "espada.authEmailCooldown.v1";
/** Serialises signup/resend requests and preserves a short, per-email deadline across reloads. */
export function createConfirmationMailer(
  storage: PrivateStorage,
  now = Date.now,
) {
  let busy = false;
  let memory: Record<string, number> = {};
  const read = async () => {
    try {
      const parsed: unknown = JSON.parse(
        (await storage.getItem(MAIL_KEY)) ?? "{}",
      );
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        for (const [email, until] of Object.entries(parsed))
          if (
            typeof until === "number" &&
            Number.isFinite(until) &&
            until > now() &&
            until <= now() + 3600000
          )
            memory[email] = Math.max(memory[email] ?? 0, until);
    } catch {
      /* In-memory throttling still works when private storage is unavailable. */
    }
    memory = Object.fromEntries(
      Object.entries(memory).filter(([, until]) => until > now()),
    );
  };
  const remaining = async (email: string) => {
    await read();
    return Math.max(
      0,
      Math.ceil(((memory[normalizeEmail(email)] ?? 0) - now()) / 1000),
    );
  };
  const remember = async (email: string, seconds: number) => {
    memory[normalizeEmail(email)] = now() + seconds * 1000;
    try {
      await storage.setItem(MAIL_KEY, JSON.stringify(memory));
    } catch {
      /* A storage failure must not claim the accepted email request failed. */
    }
  };
  const send = async <T>(
    email: string,
    request: (email: string) => Promise<T>,
  ): Promise<T> => {
    const address = normalizeEmail(email);
    if (!validEmail(address))
      throw new AuthFlowError(
        "Проверьте адрес электронной почты.",
        "email_address_invalid",
      );
    if (busy)
      throw new AuthFlowError(
        "Запрос уже отправляется. Подождите.",
        "request_in_progress",
      );
    busy = true;
    try {
      const wait = await remaining(address);
      if (wait)
        throw new AuthFlowError(
          `Повторить отправку можно через ${wait} с.`,
          "local_email_cooldown",
          wait,
        );
      try {
        const result = await request(address);
        await remember(address, 60);
        return result;
      } catch (error) {
        const failure = authFailure(error);
        if (failure.retryAfter) await remember(address, failure.retryAfter);
        throw failure;
      }
    } finally {
      busy = false;
    }
  };
  return { remaining, send };
}
