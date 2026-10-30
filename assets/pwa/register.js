// Resolve against this script, including on the GitHub Pages 404 entry point.
(() => {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  const root = new URL("./", document.currentScript.src);
  const register = () => {
    navigator.serviceWorker.register(new URL("service-worker.js", root), {
      scope: root.pathname,
      updateViaCache: "none",
    }).catch((error) => {
      // Installation support must never prevent the learning app from opening.
      console.warn("Espada: registration for app installation failed.", error);
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
})();
