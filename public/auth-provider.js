(function () {
  const root = document.getElementById("auth-root");
  if (!root) return;

  const mode = root.getAttribute("data-auth-mode") === "sign-up" ? "sign-up" : "sign-in";
  const messageEl = document.querySelector("[data-auth-message]");

  function setMessage(text, isError) {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.toggle("is-error", Boolean(isError));
    messageEl.classList.toggle("is-success", !isError && Boolean(text));
  }

  async function getProviders() {
    try {
      const response = await fetch("/api/auth/providers", { credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { auth0: false };
      return payload;
    } catch (_error) {
      return { auth0: false };
    }
  }

  async function mount() {
    root.innerHTML = "";
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      setMessage(authError, true);
    }
    const providers = await getProviders();
    if (!providers.auth0) {
      setMessage("Auth0 is not configured on server.", true);
      return;
    }

    const auth0Link = document.createElement("a");
    auth0Link.href = mode === "sign-up" ? "/auth/auth0/register" : "/auth/auth0/login";
    auth0Link.className = "btn";
    auth0Link.style.display = "inline-flex";
    auth0Link.style.justifyContent = "center";
    auth0Link.textContent = mode === "sign-up" ? "Create account with code (Auth0)" : "Sign in with code (Auth0)";
    root.appendChild(auth0Link);

    const switchWrap = document.createElement("div");
    switchWrap.style.marginTop = "10px";
    const switchLink = document.createElement("a");
    switchLink.href = mode === "sign-up" ? "/login" : "/register";
    switchLink.textContent = mode === "sign-up" ? "Already have an account? Login" : "Create account";
    switchLink.style.color = "#87d7a9";
    switchLink.style.fontWeight = "700";
    switchLink.style.textDecoration = "none";
    switchWrap.appendChild(switchLink);
    root.appendChild(switchWrap);
  }

  mount();
})();
