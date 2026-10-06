/** Decorative cover selection shared with the standalone design lab. */
function topicIllustration(title, subject = "") {
  const text = title.toLocaleLowerCase();
  if (/вероятност|статист|данны|средне|комбинатор|probab|data|average/.test(text) || subject === "data") return "probability";
  if (/стереометр|объ[её]м|куб|призм|пирамид|цилиндр|конус|сфер|шар|плоскостей/.test(text)) return "stereometry";
  if (/производн|дифференц|интеграл|первообразн|предел|непрерывност/.test(text)) return "calculus";
  if (/тригонометр|синус|косинус|тангенс|радиан/.test(text)) return "trigonometry";
  if (/прогресси|последовательност/.test(text)) return "sequences";
  if (/десятич|decimal/.test(text)) return "decimals";
  if (/процент|смес|percent/.test(text)) return "percent";
  if (/отношен|пропорц|ratio/.test(text)) return "ratio";
  if (/скорост|расстояни|производительност|speed|distance/.test(text)) return "motion";
  if (/координатная плоскость|координаты точек|функц|график|graph|function/.test(text)) return "graphs";
  if (subject === "geometry" || /геометр|угл|площад|периметр|треуголь|окружност|вектор|пифагор|четыр[её]хуголь|многоуголь|прямых|прямая|angle|perimeter/.test(text)) return "geometry";
  if (/степен|степень|корн|корень|логарифм/.test(text)) return "powers";
  if (/дроб|fraction/.test(text) || subject === "fractions") return "fractions";
  if (/алгебр|уравнен|неравен|выражен|многочлен|одночлен|формул|переменн|equation|algebra/.test(text)) return "algebra";
  return "numbers";
}

const sectionArtKeys = {decimals:'fractions',percent:'ratio',motion:'algebra',powers:'algebra',sequences:'algebra',trigonometry:'algebra',calculus:'graphs',stereometry:'geometry',progress:'probability',graph:'graphs',equations:'algebra',decimal:'fractions'};
function sectionArtPath(kind) { return `assets/atlas/${["league","learning"].includes(kind) ? "ratio" : (sectionArtKeys[kind] || kind)}.jpg`; }
function flatArt(kind, className = 'm-flat-art') {
  return `<span class="${className} m-atlas-art atlas-${sectionArtKeys[kind] || kind}" aria-hidden="true"><img src="${sectionArtPath(kind)}" alt="" loading="lazy" decoding="async"></span>`;
}
function flatTopicRow(t, index) {
  const art = flatArt(topicIllustration(t.title), 'm-catalog-art');
  if (index !== undefined) return `<button class="m-illustrated-topic" data-topic="${index}">${art}<span><strong>${t.title}</strong><small>${t.grade} класс · Урок и 3 задания</small></span>${espadaIcon('arrow')}</button>`;
  return `<div class="m-illustrated-topic is-planned">${art}<span><strong>${t.title}</strong><small>${t.grade} класс · Раздел программы</small></span></div>`;
}
function flatCatalogueResults() {
  const q = referenceSearch.toLocaleLowerCase().trim();
  const matches = t => t.title.toLocaleLowerCase().includes(q);
  const demos = topics.map((t, i) => ({...t, i})).filter(matches);
  const curriculum = referenceCatalog.filter(matches);
  if (!demos.length && !curriculum.length) return '<div class="l-empty">Таких тем пока нет.</div>';
  if (referenceTab === 'topics') return `<div class="m-catalog-section-title">Можно пройти сейчас</div>${demos.map(t => flatTopicRow(t, t.i)).join('')}<div class="m-catalog-section-title">Все разделы курса · 5–11 классы</div>${curriculum.map(t => flatTopicRow(t)).join('')}`;
  return [5,6,7,8,9,10,11].map(g => {
    const available = demos.filter(t => t.grade === g), full = curriculum.filter(t => t.grade === g);
    if (!available.length && !full.length) return '';
    const open = referenceGrade === g || !!q;
    return `<section class="l-grade-card ${open?'is-open':''}"><button class="l-grade-head" data-l-grade="${g}" aria-expanded="${open}"><span class="l-category-icon">${g}</span><span><strong>${g} класс</strong><small>Разделов курса: ${full.length}</small></span></button>${open?`<div class="m-illustrated-lessons">${available.map(t=>flatTopicRow(t,t.i)).join('')}${full.map(t=>flatTopicRow(t)).join('')}</div>`:''}</section>`;
  }).join('');
}
