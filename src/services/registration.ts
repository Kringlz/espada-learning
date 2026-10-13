import { normalizeEmail, validEmail, AuthFlowError } from "./authFlow";
export const registrationRoles = ["student", "parent"] as const;
export type RegistrationRole = (typeof registrationRoles)[number];
export function isRegistrationRole(role: unknown): role is RegistrationRole {
  return role === "student" || role === "parent";
}
export function validateRegistration(
  input: {
    name: string;
    role: string;
    code?: string;
    email?: string;
    password?: string;
  },
  needsCredentials = false,
) {
  if (!isRegistrationRole(input.role))
    throw new AuthFlowError(
      "Самостоятельная регистрация учителей пока закрыта.",
      "registration_role_closed",
    );
  const name = input.name.trim();
  if (!name || name.length > 80)
    throw new AuthFlowError(
      "Укажите имя — от 1 до 80 символов.",
      "invalid_name",
    );
  const code = (input.code ?? "").trim().toUpperCase();
  if (!/^[A-Z2-9]{7}$/.test(code))
    throw new AuthFlowError(
      input.role === "student"
        ? "Введите код группы из 7 символов. Его выдаёт учитель."
        : "Введите код ученика из 7 символов. Он находится в профиле ребёнка.",
      "invalid_join_code",
    );
  const email = normalizeEmail(input.email ?? "");
  if (needsCredentials) {
    if (!validEmail(email))
      throw new AuthFlowError(
        "Проверьте адрес электронной почты.",
        "email_address_invalid",
      );
    if (!input.password || input.password.length < 8)
      throw new AuthFlowError(
        "Пароль должен содержать минимум 8 символов.",
        "weak_password",
      );
  }
  return { ...input, name, code, email, role: input.role };
}
export function parsePendingRegistration(raw: string | null) {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    const value = p as Record<string, unknown>;
    if (
      !isRegistrationRole(value.role) ||
      typeof value.name !== "string" ||
      typeof value.email !== "string" ||
      typeof value.code !== "string"
    )
      return null;
    if (!validEmail(value.email)) return null;
    const { name, role, code, email } = validateRegistration({
      name: value.name,
      role: value.role,
      code: value.code,
      email: value.email,
    });
    return { name, role, code, email };
  } catch {
    return null;
  }
}
