async function requestJson(url, options) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {}),
    },
    credentials: "same-origin",
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const error = payload && payload.error ? payload.error : "Request failed.";
    throw new Error(error);
  }

  return payload;
}
window.requestJson = requestJson;

function setMessage(messageEl, text, isError) {
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.toggle("is-error", Boolean(isError));
  messageEl.classList.toggle("is-success", !isError && Boolean(text));
}

function initAuthForm() {
  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  const endpoint = form.getAttribute("data-endpoint");
  const messageEl = form.querySelector("[data-message]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(messageEl, "", false);

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.remember = formData.get("remember") === "on";

    try {
      const result = await requestJson(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(messageEl, "Success. Redirecting...", false);
      window.location.href = result.redirect || "/dashboard";
    } catch (error) {
      setMessage(messageEl, error.message, true);
    }
  });
}

async function initDashboard() {
  const root = document.querySelector("[data-dashboard]");
  if (!root) return;

  try {
    const me = await requestJson("/api/me", { method: "GET" });
    const emailEl = document.querySelector("[data-user-email]");
    const top3ListEl = document.querySelector("[data-top3-list]");
    let leaderboard = null;
    try {
      leaderboard = await requestJson("/api/leaderboard", { method: "GET" });
    } catch (_err) {
      leaderboard = null;
    }

    if (top3ListEl) {
      const rows = Array.isArray(leaderboard?.top) ? leaderboard.top.slice(0, 3) : [];
      if (!rows.length) {
        top3ListEl.innerHTML = '<p class="top3-empty">No players yet.</p>';
      } else {
        top3ListEl.innerHTML = rows
          .map((row) => {
            const rank = Number(row.rank || 0);
            const icon = rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#";
            return `<p class="top3-row"><span>${icon} ${row.username}</span><strong>${row.points}</strong></p>`;
          })
          .join("");
      }
    }

    if (emailEl) {
      let label = me.username;
      const rank = Number(leaderboard?.you?.rank || 0);
      if (rank === 1) label = `🏆 #1 ${me.username}`;
      if (rank === 2) label = `🏆 #2 ${me.username}`;
      if (rank === 3) label = `🏆 #3 ${me.username}`;
      emailEl.textContent = label;
    }
  } catch (_error) {
    window.location.href = "/login";
  }
}

function initLogout() {
  const logoutButtons = document.querySelectorAll("[data-logout]");
  if (!logoutButtons.length) return;

  for (const button of logoutButtons) {
    button.addEventListener("click", async () => {
      try {
        const result = await requestJson("/api/logout", { method: "POST" });
        window.location.href = result.redirect || "/login";
      } catch (_error) {
        window.location.href = "/login";
      }
    });
  }
}

function initDeleteAccount() {
  const deleteBtn = document.querySelector("[data-delete-account]");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", async () => {
    const password = window.prompt("Enter your password to delete account:");
    if (!password) return;

    const confirmDelete = window.confirm(
      "Delete account permanently? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const result = await requestJson("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      window.location.href = result.redirect || "/login";
    } catch (error) {
      window.alert(error.message || "Failed to delete account.");
    }
  });
}

function preventPageScrollKeys() {
  const blockedKeys = new Set([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  document.addEventListener(
    "keydown",
    (event) => {
      if (!blockedKeys.has(event.key)) return;

      const target = event.target;
      const isTypingField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (!isTypingField) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthForm();
  initDashboard();
  initLogout();
  initDeleteAccount();
  preventPageScrollKeys();
});
