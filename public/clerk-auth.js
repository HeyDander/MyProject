(function () {
  const root = document.getElementById("clerk-auth-root");
  if (!root) return;

  const messageEl = document.querySelector("[data-clerk-message]");
  const mode = root.getAttribute("data-clerk-mode") === "sign-up" ? "sign-up" : "sign-in";

  function setMessage(text, isError) {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.toggle("is-error", Boolean(isError));
    messageEl.classList.toggle("is-success", !isError && Boolean(text));
  }

  function renderFallbackAuth(reason) {
    const title = mode === "sign-up" ? "Create account (fallback)" : "Sign in (fallback)";
    const endpoint = mode === "sign-up" ? "/api/register" : "/api/login";
    root.innerHTML = "";

    const form = document.createElement("form");
    form.className = "login-form";
    form.noValidate = true;

    if (mode === "sign-up") {
      form.innerHTML = `
        <label>
          Username
          <input name="username" type="text" minlength="3" required placeholder="username" />
        </label>
        <label>
          Email
          <input name="email" type="email" required placeholder="name@example.com" />
        </label>
        <label>
          Password
          <input name="password" type="password" minlength="6" required placeholder="Create password" />
        </label>
        <button type="submit">${title}</button>
      `;
    } else {
      form.innerHTML = `
        <label>
          Email
          <input name="email" type="email" required placeholder="name@example.com" />
        </label>
        <label>
          Password
          <input name="password" type="password" required placeholder="Enter password" />
        </label>
        <label style="display:flex; gap:8px; align-items:center; font-size:14px;">
          <input name="remember" type="checkbox" />
          Remember me
        </label>
        <button type="submit">${title}</button>
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
          throw new Error(data.error || "Request failed");
        }
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        window.location.href = "/dashboard";
      } catch (error) {
        setMessage(error.message || "Failed to submit form.", true);
      }
    });

    root.appendChild(form);

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

    setMessage(reason || "Clerk is unavailable, fallback form is enabled.", true);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function decodePublishableHost(publishableKey) {
    const parts = String(publishableKey || "").split("_");
    if (parts.length < 3) return "";
    try {
      const decoded = atob(parts.slice(2).join("_"));
      return decoded.replace(/\$$/, "").trim();
    } catch (_error) {
      return "";
    }
  }

  async function ensureClerkLoaded(publishableKey) {
    if (window.Clerk) return;
    const instanceHost = decodePublishableHost(publishableKey);
    const sources = [
      "/vendor/clerk/clerk.browser.js",
      instanceHost
        ? `https://${instanceHost}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`
        : "",
      "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5.124.0/dist/clerk.browser.js",
      "https://unpkg.com/@clerk/clerk-js@5.124.0/dist/clerk.browser.js",
      "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@4.73.14/dist/clerk.browser.js",
      "https://unpkg.com/@clerk/clerk-js@4.73.14/dist/clerk.browser.js",
    ].filter(Boolean);

    let lastError = null;
    for (const src of sources) {
      try {
        await loadScript(src);
        for (let i = 0; i < 10; i += 1) {
          if (window.Clerk) return;
          // Let script settle in case of delayed assignment.
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Clerk JS failed to load.");
  }

  async function getConfig() {
    const response = await fetch("/api/auth/clerk/config", { credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Clerk config request failed.");
    }
    return payload;
  }

  async function exchangeSession() {
    if (!window.Clerk || !window.Clerk.session) return false;
    const token = await window.Clerk.session.getToken();
    if (!token) return false;

    const response = await fetch("/api/auth/clerk/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
      body: "{}",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Failed to create local session.");
    }

    window.location.href = payload.redirect || "/dashboard";
    return true;
  }

  async function mount() {
    try {
      const config = await getConfig();
      await ensureClerkLoaded(config.publishableKey);
      await window.Clerk.load({ publishableKey: config.publishableKey });

      const params = new URLSearchParams(window.location.search);
      if (params.get("logout") === "1" && window.Clerk.user) {
        await window.Clerk.signOut();
      }

      if (window.Clerk.user && window.Clerk.session) {
        setMessage("Signing you in...", false);
        await exchangeSession();
        return;
      }

      const baseOptions = {
        appearance: {
          variables: {
            colorPrimary: "#4a9966",
            colorBackground: "#07120d",
            colorText: "#d9efe1",
            colorInputBackground: "#0d2218",
            colorInputText: "#d9efe1",
            borderRadius: "14px",
          },
        },
      };

      if (mode === "sign-up") {
        window.Clerk.mountSignUp(root, {
          ...baseOptions,
          signInUrl: "/login",
          forceRedirectUrl: "/register",
        });
      } else {
        window.Clerk.mountSignIn(root, {
          ...baseOptions,
          signUpUrl: "/register",
          forceRedirectUrl: "/login",
        });
      }
    } catch (error) {
      renderFallbackAuth(error.message || "Clerk auth is unavailable.");
    }
  }

  mount();
})();
