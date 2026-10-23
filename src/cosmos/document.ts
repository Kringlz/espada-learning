import { SpaceData } from "./model";
import { spaceRuntime } from "./runtime";
const arrow = (left = false) =>
  `<svg viewBox="0 0 64 24" aria-hidden="true" ${left ? 'style="transform:rotate(180deg)"' : ""}><path d="M2 12H60M50 2L60 12L50 22" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
export function spaceDocument(
  data: SpaceData,
  reduced: boolean,
  brandUri = "",
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
#more{justify-self:end;font-size:13px;padding:10px 0 10px 16px;color:#b5becb;position:relative}
#more.has-signals:after{content:'';position:absolute;right:-8px;top:10px;width:4px;height:4px;border-radius:50%;background:#c6dced}
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
dialog{background:#0c121ceF;color:#e4ebf3;border:1px solid #c0d5ee1c;border-radius:22px;padding:24px 30px;width:min(90vw,370px);max-height:85vh;box-shadow:0 24px 100px #0008}
dialog::backdrop{background:#02050b80;backdrop-filter:blur(14px)}
dialog h2{font-size:21px;font-weight:400;margin:4px 0 18px;letter-spacing:-.4px}
dialog button{display:block;width:100%;text-align:left;padding:14px 0;font-size:15px;line-height:1.4;border-bottom:1px solid #b5c7df12}
dialog button:hover{color:white}dialog .close{border:0;margin-top:14px;color:#8c9db4;font-size:13px}
dialog p{font-size:14px;line-height:1.7;color:#a4b3c7}dialog kbd{font:inherit;color:#e6edf5}
#signals-toggle{display:none}#error{position:absolute;left:24px;right:24px;top:90px;margin:auto;max-width:420px;color:#f5b9a3;background:#171017ed;border-radius:12px;padding:14px;font-size:13px;z-index:5;display:none}#error button{padding:5px 0;border-bottom:1px solid}
#sr-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
#transition{position:absolute;inset:0;background:#dbe9ff;pointer-events:none;opacity:0;transition:opacity .45s}body.jumping #transition{opacity:.45}
@media(max-width:700px){.top{inset:18px 16px auto;grid-template-columns:auto 1fr auto}.wordmark{font-size:20px;gap:6px}.brand-icon{width:26px;height:36px}.brand-icon img{left:-21px;top:-9px}#overview{justify-self:center}#overview{font-size:13px;padding:10px 12px}#more{font-size:12px}.step{width:62px;height:76px;padding:14px;top:42%}.step svg{width:34px}#prev{left:8px}#next{right:8px}.bottom{bottom:max(32px,env(safe-area-inset-bottom));width:calc(100% - 48px)}#lesson-title{font-size:24px;max-width:330px;margin-bottom:20px}#launch{font-size:14px}#grade-labels button{font-size:13px}#reset{top:68px}}
@media(max-height:540px){.top{top:10px}.bottom{bottom:16px}#lesson-title{font-size:20px;margin:7px auto 12px}#launch{padding:10px 22px}.step{top:40%}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body>
<canvas id="space" tabindex="0" aria-label="Карта уроков. Перетаскивай для поворота, используй колесо для приближения. Стрелки выбирают урок, Enter открывает его, R возвращает камеру."></canvas><div id="vignette"></div>
<div class="top"><button class="wordmark" id="profile" aria-label="Открыть профиль"><span class="brand-icon"><img src="${brandUri.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" alt=""></span><span>Espada</span></button><button id="overview" aria-label="Выбрать класс">5 класс</button><button id="more" aria-haspopup="dialog">Ещё</button></div>
<button id="reset">К уроку</button><div id="grade-labels"></div>
<button class="step" id="prev" aria-label="Предыдущий урок">${arrow(true)}<span></span></button><button class="step" id="next" aria-label="Следующий урок"><span></span>${arrow()}</button>
<div class="bottom"><div id="lesson-number"></div><h1 id="lesson-title"></h1><button id="launch">Начать урок ${arrow()}</button></div>
<dialog id="more-panel" aria-label="Дополнительные возможности"><button id="signals-toggle">Задания учителя</button><button data-navigate="Learn">Найти урок</button><button data-navigate="Arena">Арена</button><button data-navigate="Progress">Мой прогресс</button><button data-navigate="Calculator">Калькулятор и формулы</button><button data-navigate="Profile">Профиль</button><button class="close" data-close="more-panel">Закрыть</button></dialog>
<dialog id="signals" aria-labelledby="signals-title"><h2 id="signals-title">Задания учителя</h2><div id="signal-items"></div><button class="close" data-close="signals">Закрыть</button></dialog>

<div id="error" role="alert"></div><div id="sr-status" aria-live="polite"></div><div id="transition"></div>
<script>window.SPACE_INITIAL=${JSON.stringify({ data, reduced }).replace(/</g, "\\u003c")};${spaceRuntime}</script></body></html>`;
}
