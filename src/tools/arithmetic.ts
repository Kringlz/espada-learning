/** Small arithmetic parser. No eval, dynamic code or access to globals. */
export function calculate(source: string, previous = 0): number {
  if (source.length > 240) throw Error("Выражение слишком длинное.");
  const input = source
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/−/g, "-")
    .replace(/\s/g, "");
  const tokens =
    input.match(
      /(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|sqrt|ans|π|[()+*/^%\-]/g,
    ) ?? [];
  if (!input || tokens.join("") !== input)
    throw Error("Проверь числа и знаки в выражении.");
  let index = 0;
  const checked = (value: number) => {
    if (!Number.isFinite(value))
      throw Error("Результат вне допустимого диапазона.");
    return value;
  };
  function expression(min = 0): number {
    let token = tokens[index++];
    let left: number;
    if (token === "+" || token === "-")
      left = (token === "-" ? -1 : 1) * expression(3);
    else if (token === "(" || token === "sqrt") {
      if (token === "sqrt" && tokens[index++] !== "(")
        throw Error("Используй sqrt(число).");
      left = expression();
      if (tokens[index++] !== ")") throw Error("Закрой скобку.");
      if (token === "sqrt") {
        if (left < 0)
          throw Error(
            "Корень из отрицательного числа здесь не поддерживается.",
          );
        left = Math.sqrt(left);
      }
    } else if (token === "π") left = Math.PI;
    else if (token === "ans") left = checked(previous);
    else if (token && /^(?:\d|\.)/.test(token)) left = checked(Number(token));
    else throw Error("Добавь число или скобку.");
    while (index < tokens.length) {
      const op = tokens[index];
      if (op === "%" && min <= 5) {
        index++;
        left /= 100;
        continue;
      }
      const power =
        op === "+" || op === "-"
          ? 1
          : op === "*" || op === "/"
            ? 2
            : op === "^"
              ? 4
              : 0;
      if (!power || power < min) break;
      index++;
      const right = expression(op === "^" ? power : power + 1);
      if (op === "/" && right === 0) throw Error("На ноль делить нельзя.");
      left = checked(
        op === "+"
          ? left + right
          : op === "-"
            ? left - right
            : op === "*"
              ? left * right
              : op === "/"
                ? left / right
                : left ** right,
      );
    }
    return checked(left);
  }
  const result = expression();
  if (index !== tokens.length) throw Error("Проверь скобки и знаки умножения.");
  return Object.is(result, -0) ? 0 : result;
}

export function formatNumber(value: number) {
  return Number(value.toPrecision(12)).toString().replace(".", ",");
}
