/** Decorative cover selection shared with the standalone design lab. */
export function topicIllustration(title: string, subject = "") {
  const text = title.toLocaleLowerCase();
  if (
    /вероятност|статист|данны|средне|комбинатор|probab|data|average/.test(
      text,
    ) ||
    subject === "data"
  )
    return "probability";
  if (
    /стереометр|объ[её]м|куб|призм|пирамид|цилиндр|конус|сфер|шар|плоскостей/.test(
      text,
    )
  )
    return "stereometry";
  if (/производн|дифференц|интеграл|первообразн|предел|непрерывност/.test(text))
    return "calculus";
  if (/тригонометр|синус|косинус|тангенс|радиан/.test(text))
    return "trigonometry";
  if (/прогресси|последовательност/.test(text)) return "sequences";
  if (/десятич|decimal/.test(text)) return "decimals";
  if (/процент|смес|percent/.test(text)) return "percent";
  if (/отношен|пропорц|ratio/.test(text)) return "ratio";
  if (/скорост|расстояни|производительност|speed|distance/.test(text))
    return "motion";
  if (
    /координатная плоскость|координаты точек|функц|график|graph|function/.test(
      text,
    )
  )
    return "graphs";
  if (
    subject === "geometry" ||
    /геометр|угл|площад|периметр|треуголь|окружност|вектор|пифагор|четыр[её]хуголь|многоуголь|прямых|прямая|angle|perimeter/.test(
      text,
    )
  )
    return "geometry";
  if (/степен|степень|корн|корень|логарифм/.test(text)) return "powers";
  if (/дроб|fraction/.test(text) || subject === "fractions") return "fractions";
  if (
    /алгебр|уравнен|неравен|выражен|многочлен|одночлен|формул|переменн|equation|algebra/.test(
      text,
    )
  )
    return "algebra";
  return "numbers";
}
