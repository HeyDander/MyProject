(function () {
  const titleEl = document.querySelector("[data-uploaded-title]");
  const metaEl = document.querySelector("[data-uploaded-meta]");
  const stage = document.querySelector("[data-uploaded-stage]");
  if (!stage) return;

  const slug = (window.location.pathname.split("/").pop() || "").trim();
  if (!slug) {
    stage.innerHTML = '<p class="hub-muted">Отсутствует id игры.</p>';
    return;
  }

  const renderError = (message) => {
    stage.innerHTML = `<p class="hub-muted">${message}</p>`;
  };

  window
    .requestJson(`/api/uploaded-games/${encodeURIComponent(slug)}`, { method: "GET" })
    .then((game) => {
      if (titleEl) titleEl.textContent = game.title || "Загруженная игра";
      if (metaEl) {
        const by = game.creator ? `by ${game.creator}` : "";
        metaEl.textContent = [by, game.description || ""].filter(Boolean).join(" | ");
      }

      const frame = document.createElement("iframe");
      frame.className = "ugc-frame";
      frame.sandbox = "allow-scripts allow-pointer-lock";
      frame.referrerPolicy = "no-referrer";
      frame.srcdoc = String(game.htmlContent || "");
      stage.replaceChildren(frame);
    })
    .catch((error) => {
      renderError(error.message || "Не удалось загрузить загруженную игру.");
    });
})();
