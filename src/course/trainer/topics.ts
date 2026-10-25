import { referenceItems } from "../../tools/reference/data";

type TopicCard = { references: string[]; hook: string; formula: string };
const entries: Record<string, [string, string, string]> = {
  "A05-01": [
    "remainder,order",
    "35 мячей, по 8 в коробке. Сколько нужно коробок?",
    "a=bq+r",
  ],
  "A05-02": [
    "order,distribute",
    "Что изменится, если переставить всего одну скобку?",
    "a(b+c)=ab+ac",
  ],
  "A05-03": [
    "speed,work",
    "Можно ли приехать раньше, не меняя расстояние?",
    "s=vt",
  ],
  "A05-04": [
    "absolute,signs",
    "Почему два разных числа бывают одинаково далеко от нуля?",
    "|{-a}|=|a|",
  ],
  "G05-01": [
    "angles,triangle-angles",
    "Что получится, если разделить прямой угол на две части?",
    "\\alpha+\\beta=180^\\circ",
  ],
  "G05-02": [
    "rectangle,box,units",
    "Чем измерить забор, пол и место в коробке?",
    "P=2(a+b)\\quad S=ab\\quad V=a^3",
  ],
  "A06-01": [
    "divisibility,prime,gcd-lcm",
    "Как разделить разные наборы конфет на одинаковые подарки?",
    "\\gcd(a,b)\\cdot\\operatorname{lcm}(a,b)=ab",
  ],
  "A06-02": [
    "fraction-property,fraction-add,fraction-multiply,fraction-divide",
    "Как понять, какой кусок пиццы больше, если куски разные?",
    "\\frac{a}{b}+\\frac{c}{b}=\\frac{a+c}{b}",
  ],
  "A06-03": [
    "decimal,rounding",
    "Может ли перенос запятой изменить ответ в сто раз?",
    "0{,}25=\\frac14",
  ],
  "A06-04": [
    "percent,percent-ratio,proportion",
    "Скидка 20% — сколько денег действительно останется?",
    "p\\%=\\frac{p}{100}",
  ],
  "A06-05": [
    "direct-inverse,proportion",
    "Вдвое больше работников — всегда ли вдвое меньше времени?",
    "y=kx\\qquad y=\\frac{k}{x}",
  ],
  "A06-06": [
    "percent-change,compound,proportion",
    "Две скидки по 10% — это скидка 20%?",
    "A_{new}=A(1-\\frac{p}{100})",
  ],
  "G06-01": [
    "midpoint,distance",
    "Как найти точку, зная только два числа?",
    "M(x;y)",
  ],
  "A07-01": [
    "distribute,like-terms",
    "Можно ли длинную запись заменить одной короткой?",
    "ax+bx=(a+b)x",
  ],
  "A07-02": [
    "power-product,power-factors",
    "Как умножить огромные степени без калькулятора?",
    "a^ma^n=a^{m+n}",
  ],
  "A07-03": [
    "like-terms,distribute,power-product",
    "Как перемножить выражения, в которых вместо чисел буквы?",
    "(a+b)c=ac+bc",
  ],
  "A07-04": [
    "distribute,difference-squares,zero-product",
    "Что общего у двух слагаемых и как это вынести за скобки?",
    "ab+ac=a(b+c)",
  ],
  "A07-05": [
    "square-sum,difference-squares,cubes",
    "Можно ли вычислить 99² за несколько секунд?",
    "(a+b)^2=a^2+2ab+b^2",
  ],
  "A07-06": [
    "linear-equation",
    "Как узнать спрятанное число по одному равенству?",
    "ax+b=0",
  ],
  "A07-07": [
    "linear-function",
    "Как стоимость поездки превращается в прямую на графике?",
    "y=kx+b",
  ],
  "A07-08": [
    "system",
    "Два неизвестных и два условия: достаточно ли этого?",
    "\\begin{cases}x+y=s\\\\x-y=d\\end{cases}",
  ],
  "G07-01": [
    "triangle-congruence,triangle-angles",
    "Как доказать, что два треугольника одинаковые, не накладывая их?",
    "\\alpha+\\beta+\\gamma=180^\\circ",
  ],
  "G07-02": [
    "parallel,angles",
    "Почему один угол позволяет узнать сразу семь других?",
    "\\alpha+\\beta=180^\\circ",
  ],
  "A08-01": [
    "cancel,fraction-property,fraction-divide",
    "Почему сокращение дроби иногда скрывает запрещённое число?",
    "\\frac{ab}{ac}=\\frac bc\\quad(a,c\\ne0)",
  ],
  "A08-02": [
    "power-zero,scientific",
    "Что означает минус в показателе степени?",
    "a^{-n}=\\frac{1}{a^n}",
  ],
  "A08-03": [
    "root-square,root-operations,number-sets",
    "Можно ли точно записать число, у которого нет последней цифры?",
    "\\sqrt{a^2}=|a|",
  ],
  "A08-04": [
    "quadratic,vieta",
    "Почему одно уравнение может прятать два ответа?",
    "D=b^2-4ac",
  ],
  "A08-05": [
    "inequality,intervals",
    "Когда умножение меняет направление знака неравенства?",
    "a<b\\Rightarrow -a>-b",
  ],
  "G08-01": [
    "parallelogram,rhombus,trapezoid,rectangle",
    "Как найти площадь фигуры, если она не прямоугольная?",
    "S=\\frac{a+b}{2}h",
  ],
  "G08-02": [
    "pythagoras,distance",
    "Насколько короче путь через двор по диагонали?",
    "a^2+b^2=c^2",
  ],
  "G08-03": [
    "vector-components,vector-operations,dot",
    "Можно ли сложить два направления движения?",
    "\\vec a\\cdot\\vec b=a_xb_x+a_yb_y",
  ],
  "A09-01": [
    "parabola,function-transform",
    "Почему брошенный мяч рисует дугу?",
    "y=ax^2+bx+c",
  ],
  "A09-02": [
    "intervals,quadratic-factor",
    "Где парабола окажется ниже горизонтальной оси?",
    "(x-a)(x-b)<0",
  ],
  "A09-03": [
    "quadratic,system,zero-product",
    "Как превратить уравнение четвёртой степени в знакомое квадратное?",
    "t=x^2",
  ],
  "A09-04": [
    "arithmetic,arithmetic-sum,geometric,geometric-sum",
    "Что растёт быстрее: прибавлять каждый день или удваивать?",
    "a_n=a_1+(n-1)d",
  ],
  "A09-05": [
    "root-degree,rational-power",
    "Как степень может оказаться дробью?",
    "a^{m/n}=\\sqrt[n]{a^m}",
  ],
  "A09-06": [
    "radians,trig-right,trig-basic,trig-values",
    "Как измерить высоту, не поднимаясь наверх?",
    "\\sin^2 x+\\cos^2 x=1",
  ],
  "G09-01": [
    "similarity,polygon,triangle-area",
    "Увеличим чертёж вдвое. Что станет с его площадью?",
    "\\frac{S_1}{S_2}=k^2",
  ],
  "G09-02": [
    "sine-theorem,cosine-theorem",
    "Как найти сторону треугольника без прямого угла?",
    "c^2=a^2+b^2-2ab\\cos\\gamma",
  ],
  "A10-01": [
    "domain,function-transform,even-odd",
    "Можно ли передвинуть весь график одним числом?",
    "y=f(x-h)+k",
  ],
  "A10-02": [
    "unit-circle,trig-reduction,even-odd",
    "Почему волна повторяет одну и ту же форму?",
    "\\sin(x+2\\pi)=\\sin x",
  ],
  "A10-03": [
    "trig-values,unit-circle",
    "Можно ли восстановить угол по его синусу?",
    "\\arcsin(\\sin x)=x\\quad |x|\\le\\frac\\pi2",
  ],
  "A10-04": [
    "sin-equation,cos-equation,tan-equation,trig-inequality",
    "Почему у тригонометрического уравнения бесконечно много корней?",
    "\\sin x=0\\Rightarrow x=\\pi n",
  ],
  "A10-05": [
    "limit",
    "Можно ли приблизиться к числу, так и не достигнув его?",
    "\\lim_{x\\to a}f(x)=L",
  ],
  "A10-06": [
    "derivative-power,derivative-rules,chain",
    "Как узнать скорость изменения в одно мгновение?",
    "(x^n)'=nx^{n-1}",
  ],
  "A10-07": [
    "extrema,tangent-equation",
    "Как найти самую высокую точку графика без рисунка?",
    "f'(x)=0",
  ],
  "G10-01": [
    "solid-lines",
    "Почему три ножки стула задают плоскость, а две — нет?",
    "A,B,C\\in\\alpha",
  ],
  "G10-02": [
    "solid-lines,dot",
    "Могут ли две прямые не пересекаться и не быть параллельными?",
    "a\\perp\\alpha",
  ],
  "A11-01": [
    "exponential,exp-equation",
    "Сколько шагов удвоения нужно, чтобы обогнать миллион?",
    "a^x=b",
  ],
  "A11-02": [
    "log-definition,log-rules,log-base",
    "Как узнать, в какую степень возвели число?",
    "\\log_a b=c\\iff a^c=b",
  ],
  "A11-03": [
    "log-equation,log-function",
    "Почему найденный корень логарифмического уравнения бывает лишним?",
    "\\log_a f(x)=b\\Rightarrow f(x)=a^b",
  ],
  "A11-04": [
    "antiderivative,integral-table",
    "Можно ли восстановить функцию по скорости её изменения?",
    "\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C",
  ],
  "A11-05": [
    "newton-leibniz,integral-area",
    "Как измерить площадь под кривой без клеточек?",
    "\\int_a^b f(x)\\,dx=F(b)-F(a)",
  ],
  "G11-01": [
    "prism,pyramid,cylinder,cone,sphere",
    "Какая фигура получится, если вращать прямоугольник?",
    "V_{cyl}=\\pi r^2h",
  ],
  "G11-02": [
    "box,prism,pyramid,cylinder,cone,sphere",
    "Почему конус вмещает втрое меньше цилиндра?",
    "V_{cone}=\\frac13\\pi r^2h",
  ],
};
export const trainerTopics: Record<string, TopicCard> = Object.fromEntries(
  Object.entries(entries).map(([id, [refs, hook, formula]]) => [
    id,
    { references: refs.split(","), hook, formula },
  ]),
);
export function topicReferences(id: string) {
  return trainerTopics[id].references.map((key) =>
    referenceItems.find((item) => item.id === key)!,
  );
}
