import { SpaceData } from "./model";
import { spaceRuntime } from "./runtime";
const arrow = (left = false) =>
  `<svg viewBox="0 0 64 24" aria-hidden="true" ${left ? 'style="transform:rotate(180deg)"' : ""}><path d="M2 12H60M50 2L60 12L50 22" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
export function spaceDocument(
  data: SpaceData,
  reduced: boolean,
  brandUri = "",
  dark = true,
) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Вселенная Espada</title><style>
*{box-sizing:border-box}
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#03060c;color:#edf0f5;font-family:Arial,Helvetica,sans-serif}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent;min-height:44px}
button:focus-visible,canvas:focus-visible{outline:2px solid #b8cfe9;outline-offset:5px}
button:disabled{opacity:.18;cursor:default}
canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;outline:none}
canvas.dragging{cursor:grabbing}
#vignette{position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,#03060c 2%,#03060cb0 20%,transparent 48%),radial-gradient(ellipse at center,transparent 35%,#03060c66)}
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
#lesson-title{font-size:clamp(22px,2.4vw,30px);font-weight:400;letter-spacing:-.65px;line-height:1.25;margin:14px auto 22px;max-width:430px;text-wrap:balance}
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
body.light{background:#f1f5f2;color:#20392e}body.light #vignette{background:linear-gradient(0deg,#f1f5f2 2%,#f1f5f2b0 20%,transparent 48%),radial-gradient(ellipse at center,transparent 35%,#f1f5f266)}
body.light .top{background:#f1f5f2ed;border:1px solid #d6e2da;border-radius:22px;padding:8px 14px}
body.light .brand-icon img{mix-blend-mode:multiply}body.light #overview,body.light .tools button,body.light .step,body.light #grade-labels button{color:#365845}
body.light .tools button:hover{background:#dce9e0;color:#20392e}body.light #lesson-number,body.light #reset{color:#526c5e}
body.light #launch{background:#365f49;color:#fff}body.light #launch:hover{background:#294b39}
body.light button:focus-visible,body.light canvas:focus-visible{outline-color:#365f49}
body.light #error{background:#fff0eb;color:#873c2b}
@media(max-width:400px){.wordmark>span:last-child{display:none}.top{column-gap:4px}body.light .top{padding:6px 8px}.tools button{width:44px}#overview{padding:10px 5px}}
</style></head><body class="${dark ? "dark" : "light"}">
<canvas id="space" tabindex="0" aria-label="Карта уроков. Перетаскивай для поворота, используй колесо для приближения. Стрелки выбирают урок, Enter открывает его, R возвращает камеру."></canvas><div id="vignette"></div>
<div class="top"><button class="wordmark" id="profile" aria-label="Открыть профиль"><span class="brand-icon"><img src="${brandUri.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" alt=""></span><span>Espada</span></button><button id="overview" aria-label="Выбрать класс">5 класс</button><nav class="tools" aria-label="Инструменты"><button id="theme-toggle" aria-label="${dark ? "Включить светлую тему" : "Включить тёмную тему"}" title="Сменить тему"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg></button><button data-navigate="Progress" aria-label="Мой прогресс" title="Мой прогресс"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 20V13M12 20V4M19 20V9"/></svg></button><button data-navigate="Calculator" aria-label="Калькулятор и формулы" title="Калькулятор и формулы"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h1M15 11h1M8 15h1M15 15h1M8 19h1M15 19h1"/></svg></button></nav></div>
<button id="reset">К уроку</button><div id="grade-labels"></div>
<button class="step" id="prev" aria-label="Предыдущий урок">${arrow(true)}<span></span></button><button class="step" id="next" aria-label="Следующий урок"><span></span>${arrow()}</button>
<div class="bottom"><div id="lesson-number"></div><h1 id="lesson-title"></h1><button id="launch">Начать урок ${arrow()}</button></div>
<div id="error" role="alert"></div><div id="sr-status" aria-live="polite"></div><div id="transition"></div>
<script>window.SPACE_INITIAL=${JSON.stringify({ data, reduced, dark, brandUri }).replace(/</g, "\\u003c")};${spaceRuntime}</script></body></html>`;
}
