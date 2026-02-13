document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("[data-games-grid]");
  const catalog = window.CHALLENGE_CATALOG || [];
  if (!grid || !catalog.length) return;
  const isRu = window.UII18N && window.UII18N.lang === "ru";

  for (const game of catalog) {
    const card = document.createElement("article");
    card.className = "game-item";

    const tag = document.createElement("p");
    tag.className = "game-tag";
    tag.textContent = isRu
      ? game.categoryRu || game.category || "Игра"
      : game.category || "Game";

    const title = document.createElement("h2");
    title.textContent = isRu ? game.nameRu || game.name : game.name;

    const desc = document.createElement("p");
    desc.textContent = isRu ? game.descriptionRu || game.description : game.description;

    const link = document.createElement("a");
    link.className = "btn";
    link.href = `/game/${game.id}`;
    link.textContent = isRu ? "Играть" : "Play";

    card.appendChild(tag);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(link);
    grid.appendChild(card);
  }
});
