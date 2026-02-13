document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector("[data-leaderboard-table]");
  const summary = document.querySelector("[data-lb-summary]");
  if (!root || !summary) return;

  try {
    const data = await window.requestJson("/api/leaderboard", { method: "GET" });

    function rankBadge(rank) {
      if (rank === 1) {
        return '<span class="rank-badge rank-gold" title="1st place">🏆 #1</span>';
      }
      if (rank === 2) {
        return '<span class="rank-badge rank-silver" title="2nd place">🏆 #2</span>';
      }
      if (rank === 3) {
        return '<span class="rank-badge rank-bronze" title="3rd place">🏆 #3</span>';
      }
      return `#${rank}`;
    }

    const you = data.you || { rank: "-", points: 0, username: "You" };
    summary.innerHTML = [
      `<div class=\"lb-card\"><span>Your place</span><strong>${rankBadge(you.rank)}</strong></div>`,
      `<div class=\"lb-card\"><span>Your points</span><strong>${you.points}</strong></div>`,
      `<div class=\"lb-card\"><span>Player</span><strong>${you.username}</strong></div>`,
    ].join("");

    const top = Array.isArray(data.top) ? data.top : [];

    const table = document.createElement("table");
    table.className = "lb-table";

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Place</th><th>Player</th><th>Points</th></tr>";

    const tbody = document.createElement("tbody");
    top.forEach((player) => {
      const tr = document.createElement("tr");
      if (player.isYou) tr.classList.add("lb-you");
      tr.innerHTML = [
        `<td>${rankBadge(player.rank)}</td>`,
        `<td>${player.username}${player.isYou ? " (you)" : ""}</td>`,
        `<td>${player.points}</td>`,
      ].join("");
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    root.appendChild(table);
  } catch (_error) {
    summary.textContent = "Could not load leaderboard.";
  }
});
