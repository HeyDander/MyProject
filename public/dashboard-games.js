document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("[data-games-grid]");
  const catalog = window.CHALLENGE_CATALOG || [];
  if (!grid || !catalog.length) return;

  for (const game of catalog) {
    const card = document.createElement("article");
    card.className = "game-item";

    const title = document.createElement("h2");
    title.textContent = game.name;

    const desc = document.createElement("p");
    desc.textContent = game.description;

    const link = document.createElement("a");
    link.className = "btn";
    link.href = `/game/${game.id}`;
    link.textContent = "Play";

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(link);
    grid.appendChild(card);
  }
});
