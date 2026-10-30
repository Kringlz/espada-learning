import { progressMarkup, progressStyles } from "./progressView";
import { SpaceData } from "./model";
import { spaceRuntime } from "./runtime";
const arrow = (left = false) =>
  `<svg viewBox="0 0 64 24" aria-hidden="true" ${left ? 'style="transform:rotate(180deg)"' : ""}><path d="M2 12H60M50 2L60 12L50 22" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
export function spaceDocument(
  data: SpaceData,
  reduced: boolean,
  brandUri = "",
  dark = true,
  soundEnabled = true,
) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Вселенная Espada</title><style>
*{box-sizing:border-box}
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#080613;color:#edf0f5;font-family:Arial,Helvetica,sans-serif}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent;min-height:44px}
button:focus-visible,canvas:focus-visible{outline:2px solid #b8cfe9;outline-offset:5px}
button:disabled{opacity:.18;cursor:default}
canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;outline:none}
canvas.dragging{cursor:grabbing}
#vignette{position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,#080613 2%,#080613b0 20%,transparent 48%),radial-gradient(ellipse at center,transparent 35%,#08061366)}
.top{position:absolute;inset:24px 36px auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;pointer-events:none}
.top>*{pointer-events:auto}
.wordmark{font-size:24px;letter-spacing:-.8px;justify-self:start;padding:0;display:flex;align-items:center;gap:9px}.brand-icon{width:30px;height:39px;overflow:hidden;position:relative;flex-shrink:0}.brand-icon img{position:absolute;width:68px;height:56px;max-width:none;left:-19px;top:-7px;mix-blend-mode:screen}
#overview{font-size:14px;color:#c5ceda;padding:10px 18px;display:flex;align-items:center;gap:10px}
#overview:after{content:'';width:6px;height:6px;border-right:1px solid;border-bottom:1px solid;transform:rotate(45deg);margin-top:-4px}
.tools{justify-self:end;display:flex;align-items:center;gap:8px}.tools button{display:flex;align-items:center;justify-content:center;width:44px;height:44px;padding:10px;color:#b5becb;border-radius:50%}.tools button:hover{color:#ccebd5;background:#b3d9bf0c}.tools svg{width:22px;height:22px}
#reset{position:absolute;left:50%;top:76px;transform:translateX(-50%);font-size:12px;color:#a9b7c8;display:none}
body.free #reset{display:block}
.step{position:absolute;top:43%;transform:translateY(-50%);width:94px;height:80px;padding:20px;color:#c9d3df;z-index:2;transition:color .2s,opacity .2s}
.step svg{width:54px;height:24px}.step span{display:none}.step.boundary{width:auto;min-width:104px;display:flex;align-items:center;gap:6px;padding:12px;font-size:13px;white-space:nowrap}.step.boundary span{display:inline}.step.boundary svg{width:24px}
.step:hover{color:white}
#prev{left:28px}#next{right:28px}
.bottom{position:absolute;bottom:max(38px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(460px,calc(100% - 48px));text-align:center;pointer-events:none}
#lesson-number{font-size:11px;letter-spacing:2px;color:#7f8b9d}
.lesson-complete #lesson-number{color:#75ffd4}.lesson-complete #launch{background:#123c32;color:#b0ffe7;box-shadow:0 0 28px #50ffcd20}.lesson-complete #launch:hover{background:#205647}
#lesson-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;font-size:clamp(22px,2.4vw,30px);font-weight:400;letter-spacing:-.65px;line-height:1.25;margin:14px auto 22px;max-width:430px;text-wrap:balance}
#launch{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:22px;min-width:182px;padding:14px 24px;border-radius:30px;background:#b3d9bf;color:#102319;font-size:14px;transition:background .2s,transform .2s}
#launch:hover{background:#ccebd5;transform:translateY(-2px)}#launch svg{width:28px;height:18px}
#grade-labels button{position:absolute;transform:translate(-50%,0);padding:12px 18px;white-space:nowrap;color:#c0cddd;font-size:14px}
#grade-labels button:hover{color:white}
body.overview .bottom,body.overview .step{visibility:hidden;pointer-events:none}
#error{position:absolute;left:24px;right:24px;top:90px;margin:auto;max-width:420px;color:#f5b9a3;background:#171017ed;border-radius:12px;padding:14px;font-size:13px;z-index:5;display:none}#error button{padding:5px 0;border-bottom:1px solid}
#sr-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
#transition{position:absolute;inset:0;background:#dbe9ff;pointer-events:none;opacity:0;transition:opacity .45s}body.jumping #transition{opacity:.45}
@media(max-width:700px){.top{inset:18px 16px auto;grid-template-columns:auto 1fr auto}.wordmark{font-size:20px;gap:6px}.brand-icon{width:26px;height:36px}.brand-icon img{left:-21px;top:-9px}#overview{justify-self:center}#overview{font-size:13px;padding:10px 8px;gap:8px}.tools{gap:0}.step{width:62px;height:76px;padding:14px;top:42%}.step svg{width:34px}#prev{left:8px}#next{right:8px}.bottom{bottom:max(32px,env(safe-area-inset-bottom));width:calc(100% - 48px)}#lesson-title{font-size:24px;max-width:330px;margin-bottom:20px}#launch{font-size:14px}#grade-labels button{font-size:13px}#reset{top:68px}}
@media(max-height:540px){.top{top:10px}.bottom{bottom:16px}#lesson-title{font-size:20px;margin:7px auto 12px}#launch{padding:10px 22px}.step{top:40%}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
body.light .top{background:#fffffff5;border-bottom:1px solid #e5e1ee;box-shadow:0 8px 40px #05020c20}
body.light .wordmark,body.light #overview,body.light .tools button{color:#334c40}
body.light .brand-icon img{mix-blend-mode:multiply}
body.light .tools button:hover{background:#eeebf5;color:#20392e}
body.light .top button:focus-visible{outline-color:#76539c}
.top{inset:0 0 auto;padding:18px 36px;min-height:80px;transition:background .3s}
@media(max-width:700px){.top{inset:0 0 auto;padding:12px 16px;min-height:72px}}
@media(max-width:400px){.wordmark>span:last-child{display:none}.top{column-gap:4px}.top{padding:10px 8px}.tools button{width:44px}#overview{padding:10px 5px}}

#space{transition:filter .4s}body.preview #space{filter:blur(5px)}#focus-star{pointer-events:none;cursor:default}
.search{position:absolute;z-index:8;top:94px;left:50%;transform:translateX(-50%);width:min(430px,calc(100% - 36px));color:#edf0f5}
.search-field{display:flex;align-items:center;gap:10px;border:1px solid #c5d3e62b;border-radius:18px;background:#151524e8;padding:0 14px;backdrop-filter:blur(20px)}
.search-field svg{width:18px;flex-shrink:0;color:#a5b4c8}.search input{color:inherit;background:none;border:0;outline:0;min-width:0;width:100%;height:48px;font:inherit;font-size:14px}.search input::placeholder{color:#a7a8ba}.search-field:focus-within{border-color:#b3d9bf}.search #clear-search{font-size:22px;width:34px;min-height:44px;color:#bec6d7}.search #clear-search[hidden]{display:none}
#search-results{margin:8px 0 0;padding:8px;max-height:min(380px,55vh);overflow:auto;background:#151524fa;border:1px solid #c5d3e62b;border-radius:18px;box-shadow:0 20px 60px #0006}
#search-results[hidden]{display:none}#search-results button{display:block;width:100%;text-align:left;padding:12px;border-radius:12px;line-height:1.4;font-size:14px}#search-results button:hover,#search-results button:focus-visible{background:#b3d9bf18}#search-results small{display:block;font-size:11px;color:#a9b5c9;margin-top:4px}#search-empty{padding:16px;font-size:14px;color:#b6bfd0}
#preview{position:absolute;inset:0;pointer-events:none;transform-origin:50% 50%;will-change:transform}
.preview-card{--reveal:0;--align:0px;--direction:1;opacity:var(--reveal);visibility:hidden;transform:translateY(var(--align)) translate3d(calc((1 - var(--reveal))*18px*var(--direction)),calc((1 - var(--reveal))*18px*var(--direction)),0) scale(calc(.84 + var(--reveal)*.16));transform-origin:100% 100%;will-change:transform,opacity;position:absolute;width:clamp(180px,24vw,280px);pointer-events:auto;background:linear-gradient(140deg,#242237e8,#10121ee8);border:1px solid #d2d4ef24;border-radius:22px;padding:clamp(14px,2vw,24px);box-shadow:0 18px 60px #0003;backdrop-filter:blur(24px);overflow:auto;scrollbar-width:thin;scrollbar-color:#b3d9bf44 transparent}
#preview-content{right:calc(50% + 80px);bottom:calc(50% + 28px);max-height:calc(50% - 170px)}
.preview-card ul{padding:0;margin:12px 0 0;list-style:none;display:grid;gap:7px}.preview-card li{font-size:clamp(12px,1.1vw,14px);line-height:1.45;color:#c3c5d5;padding-left:12px;position:relative}.preview-card li:before{content:'·';position:absolute;left:0;color:#b3d9bf}
#formula-image{width:100%;height:clamp(32px,5vh,56px);object-fit:contain;display:block}
#preview-title{--direction:-1;transform-origin:0 0;left:calc(50% + 80px);top:calc(50% + 28px);max-height:calc(50% - 190px);width:clamp(180px,22vw,260px);border-color:#a89bdc35}
#preview-hook{font-size:clamp(16px,1.65vw,22px);line-height:1.4;font-weight:400;letter-spacing:-.3px;margin:0}
body.free .bottom{opacity:.7}.top{z-index:9}.bottom{z-index:3}.step{z-index:4;top:50%}#reset{z-index:6;top:150px}
@media(max-width:700px){.search{top:80px}.search input{height:44px}.preview-card{width:calc(50% - 26px);padding:14px;border-radius:18px}#preview-content{right:calc(50% + 12px);bottom:calc(50% + 40px);max-height:calc(50% - 178px)}#preview-title{left:calc(50% + 12px);top:calc(50% + 40px);width:calc(50% - 26px);max-height:calc(50% - 188px)}#preview-hook{font-size:clamp(14px,4vw,18px)}.preview-card li{font-size:12px}.bottom{bottom:20px}#lesson-title{font-size:20px;margin:10px auto 14px;max-width:340px}#launch{padding:12px 22px}#reset{top:132px}}
@media(max-width:700px) and (max-height:660px){.preview-card{padding:11px;border-radius:16px}.preview-card li{font-size:11px;line-height:1.3}.preview-card ul{margin-top:8px;gap:5px}#formula-image{height:26px}#preview-hook{font-size:14px}#lesson-title{font-size:18px;margin:8px auto 10px}#preview-content{bottom:calc(50% + 28px);max-height:calc(50% - 162px)}#preview-title{max-height:calc(50% - 174px)}}
@media(max-height:540px){.top{padding:4px 16px;min-height:52px}.search{top:58px;width:min(320px,calc(100% - 36px))}.search input{height:38px}.preview-card{padding:12px;border-radius:17px}#preview-content,#preview-title{width:min(250px,calc(50% - 100px));top:50%;bottom:auto;--align:-50%;max-height:calc(100% - 220px)}#preview-content{right:calc(50% + 65px)}#preview-title{left:calc(50% + 65px)}#preview-hook{font-size:15px}#formula-image{height:30px}.preview-card li{font-size:11px}.preview-card ul{gap:5px;margin-top:8px}.bottom{bottom:12px;width:min(430px,calc(100% - 80px))}#lesson-title{font-size:17px;-webkit-line-clamp:1;margin:6px auto 8px}#launch{min-height:40px;padding:9px 20px}#lesson-number{font-size:9px}.step{width:48px;padding:10px}.step svg{width:28px}#prev{left:5px}#next{right:5px}#reset{top:98px}}

${progressStyles}
#preview-title{background:none;border:0;box-shadow:none;backdrop-filter:none;padding:0;overflow:visible;max-height:none;width:clamp(190px,25vw,340px)}
#preview-title #lesson-title{display:block;margin:0;max-width:none;font-size:clamp(20px,2.4vw,30px);line-height:1.25;font-weight:400;text-align:left;text-wrap:balance;overflow:visible}
#lesson-number{margin-bottom:12px}
@media(max-width:700px){#preview-title{left:calc(50% + 12px);top:calc(50% + 40px);width:calc(50% - 30px)}#preview-title #lesson-title{font-size:clamp(16px,4.4vw,23px);line-height:1.25}}
@media(max-width:700px) and (max-height:660px){#preview-title{top:calc(50% + 22px);left:calc(50% + 4px);width:calc(50% - 20px)}#preview-title #lesson-title{font-size:16px}#lesson-number{margin-bottom:8px}}
@media(max-height:540px){#preview-title{left:calc(50% + 65px);top:50%;width:calc(50% - 100px);max-height:none}#preview-title #lesson-title{font-size:17px;line-height:1.2}}
/* Keep controls comfortably inside the viewport while the sky stays edge-to-edge. */
:root{--side-space:clamp(24px,3vw,44px)}
.top{padding-left:max(var(--side-space),env(safe-area-inset-left));padding-right:max(var(--side-space),env(safe-area-inset-right))}
.search{width:min(430px,calc(100% - var(--side-space)*2))}
#preview-content{max-width:calc(50% - 80px - var(--side-space))}
#preview-title{max-width:calc(50% - 80px - var(--side-space))}
@media(max-width:700px){#prev{left:12px}#next{right:12px}#preview-content,#preview-title{max-width:calc(50% - 12px - var(--side-space))}}
@media(max-width:700px) and (max-height:660px){#preview-title{max-width:calc(50% - 4px - var(--side-space))}}
@media(max-height:540px){.search{width:min(320px,calc(100% - var(--side-space)*2))}#preview-content,#preview-title{max-width:calc(50% - 65px - var(--side-space))}}
</style></head><body class="${dark ? "dark" : "light"}">
<canvas id="space" tabindex="0" aria-label="Карта уроков. Перетаскивай для поворота, используй колесо для приближения. Стрелки выбирают урок, Enter открывает его, R возвращает камеру."></canvas><canvas id="focus-star" aria-hidden="true"></canvas><div id="vignette"></div>
<div class="top"><button class="wordmark" id="profile" aria-label="Открыть профиль"><span class="brand-icon"><img src="${brandUri.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" alt=""></span><span>Espada</span></button><button id="overview" aria-label="Выбрать класс">5 класс</button><nav class="tools" aria-label="Инструменты"><button id="theme-toggle" aria-label="${dark ? "Включить светлую тему" : "Включить тёмную тему"}" title="Сменить тему"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg></button><button id="sound-toggle" aria-label="Выключить звуки" title="Звуки" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4Z"/><path id="sound-waves" d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg></button><button data-navigate="Formulas" aria-label="Формулы и история" title="Формулы и история"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 4H6l7 8-7 8h12"/></svg></button></nav></div>
<div class="search" role="search" aria-label="Поиск уроков">
<div class="search-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="lesson-search" type="search" placeholder="Найти тему или формулу…" aria-label="Поиск уроков" aria-controls="search-results" aria-expanded="false" autocomplete="off"><button id="clear-search" aria-label="Очистить поиск" hidden>×</button></div><div id="search-results" hidden></div></div>
<div id="preview" aria-label="Превью темы"><section class="preview-card" id="preview-content" aria-label="Содержание темы"><img id="formula-image" alt="Основная формула темы"><ul id="preview-topics"></ul></section><section class="preview-card" id="preview-title"><h1 id="lesson-title"></h1></section></div>
<button id="reset">К уроку</button><div id="grade-labels"></div>
<button class="step" id="prev" aria-label="Предыдущий урок">${arrow(true)}<span></span></button><button class="step" id="next" aria-label="Следующий урок"><span></span>${arrow()}</button>
<div class="bottom"><div id="lesson-number"></div><button id="launch">Начать урок ${arrow()}</button></div>
${progressMarkup}
<div id="error" role="alert"></div><div id="sr-status" aria-live="polite"></div><div id="transition"></div>
<script>window.SPACE_INITIAL=${JSON.stringify({ data, reduced, dark, brandUri, soundEnabled }).replace(/</g, "\\u003c")};${spaceRuntime}</script></body></html>`;
}
