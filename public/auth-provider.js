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
    const response = await fetch("/api/auth/providers", { credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { auth0: false };
    return payload;
  }

  function renderLocalForm() {
    const endpoint = mode === "sign-up" ? "/api/register" : "/api/login";
    const form = document.createElement("form");
    form.className = "login-form";
    form.noValidate = true;

    if (mode === "sign-up") {
      form.innerHTML = `
        <label>Username<input name="username" type="text" minlength="3" required placeholder="username" /></label>
        <label>Email<input name="email" type="email" required placeholder="name@example.com" /></label>
        <label>Password<input name="password" type="password" minlength="8" required placeholder="Create password" /></label>
        <button type="submit">Create account</button>
      `;
    } else {
      form.innerHTML = `
        <label>Email or Username<input name="email" type="text" required placeholder="name@example.com" /></label>
        <label>Password<input name="password" type="password" required placeholder="Enter password" /></label>
        <label style="display:flex; gap:8px; align-items:center; font-size:14px;">
          <input name="remember" type="checkbox" /> Remember me
        </label>
        <button type="submit">Sign in</button>
      `;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage("Please wait...", false);
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      if (!("remember" in payload)) payload.remember = false;
      else payload.remember = true;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (data.redirect) {
            window.location.href = data.redirect;
            return;
          }
          throw new Error(data.error || "Request failed");
        }
        window.location.href = data.redirect || "/dashboard";
      } catch (error) {
        setMessage(error.message || "Failed to submit form.", true);
      }
    });

    return form;
  }

  async function mount() {
    root.innerHTML = "";
    const providers = await getProviders();

    if (providers.auth0) {
      const auth0Link = document.createElement("a");
      auth0Link.href = mode === "sign-up" ? "/auth/auth0/register" : "/auth/auth0/login";
      auth0Link.className = "btn";
      auth0Link.style.display = "inline-flex";
      auth0Link.style.justifyContent = "center";
      auth0Link.style.marginBottom = "12px";
      auth0Link.textContent = mode === "sign-up" ? "Continue with Auth0 (Sign up)" : "Continue with Auth0";
      root.appendChild(auth0Link);
    }

    const divider = document.createElement("p");
    divider.className = "card-subtitle";
    divider.textContent = providers.auth0 ? "or use local account" : "local account";
    divider.style.margin = "8px 0 12px";
    root.appendChild(divider);

    root.appendChild(renderLocalForm());

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
