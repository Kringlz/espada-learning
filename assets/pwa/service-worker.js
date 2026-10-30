// Online application: never cache lessons, account responses or release bundles.
// Only top-level navigation gets a friendly fallback when the network is unavailable.
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    request.mode !== "navigate" ||
    request.destination !== "document" ||
    !request.url.startsWith(self.registration.scope)
  ) return;

  event.respondWith(
    fetch(request, { cache: "no-cache" }).catch(() => new Response(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#326745">
  <title>Espada — нет соединения</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f8f4; color: #20382a; font: 20px/1.5 system-ui, sans-serif; padding: 24px; }
    main { width: 100%; max-width: 560px; text-align: center; }
    h1 { font-size: clamp(28px, 5vw, 40px); line-height: 1.2; }
    p { color: #4a5c50; }
    button { min-height: 56px; padding: 14px 28px; border: 0; border-radius: 16px; background: #326745; color: white; font: 600 20px/1.4 system-ui, sans-serif; cursor: pointer; }
    button:focus-visible { outline: 3px solid #20382a; outline-offset: 5px; }
  </style>
</head>
<body>
  <main>
    <p>Espada</p>
    <h1>Нет соединения</h1>
    <p>Для открытия Espada нужен интернет. Проверьте подключение и попробуйте снова.</p>
    <button type="button" onclick="location.reload()">Попробовать снова</button>
  </main>
</body>
</html>`, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    })),
  );
});
