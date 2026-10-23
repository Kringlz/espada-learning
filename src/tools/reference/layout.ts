/** Equivalent line breaks only. The source expressions and record IDs stay intact. */
const tex = String.raw;
const breaks: Record<string, string> = {
  [tex`AB=0\iff A=0\ \text{или}\ B=0`]: tex`\begin{gathered}AB=0\iff\\A=0\ \text{или}\ B=0\end{gathered}`,
  [tex`S=\sqrt{p(p-a)(p-b)(p-c)}`]: tex`\begin{gathered}S=\\\sqrt{p(p-a)(p-b)(p-c)}\end{gathered}`,
  [tex`V=\frac h3(S_1+S_2+\sqrt{S_1S_2})`]: tex`\begin{gathered}V=\\\frac h3(S_1+S_2+\sqrt{S_1S_2})\end{gathered}`,
  [tex`d=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}`]: tex`\begin{gathered}d=\\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}\end{gathered}`,
  [tex`\vec{AB}=(x_B-x_A,\ y_B-y_A)`]: tex`\begin{gathered}\vec{AB}=\\(x_B-x_A,\ y_B-y_A)\end{gathered}`,
  [tex`a^{f(x)}=a^{g(x)}\iff f(x)=g(x)`]: tex`\begin{gathered}a^{f(x)}=a^{g(x)}\iff\\f(x)=g(x)\end{gathered}`,
  [tex`f'(x)=\lim_{h\to0}\frac{f(x+h)-f(x)}h`]: tex`\begin{gathered}f'(x)=\\\lim_{h\to0}\frac{f(x+h)-f(x)}h\end{gathered}`,
  [tex`y=f(x_0)+f'(x_0)(x-x_0)`]: tex`\begin{gathered}y=\\f(x_0)+f'(x_0)(x-x_0)\end{gathered}`,
};
export function referenceMathLayout(latex: string) {
  // Tighten table column spacing, keeping glyphs at the same size.
  if (latex.startsWith(tex`\begin{array}{c|ccc}`))
    return latex.replace("{c|ccc}", tex`{c@{\;}|@{\;}c@{\;}c@{\;}c}`);
  return breaks[latex] ?? latex;
}
