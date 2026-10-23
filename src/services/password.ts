/** Passwords are opaque: never trim, normalize, log, or persist them. */
export function passwordError(password: string) {
  return password.length < 8 ? "Минимум 8 символов" : "";
}
export function repeatPasswordError(
  password: string,
  repeat: string,
  checked: boolean,
) {
  return checked && password !== repeat ? "Пароли не совпадают" : "";
}
