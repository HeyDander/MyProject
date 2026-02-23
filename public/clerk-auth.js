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
    root.innerHTML = "";
    if (reason) {
      console.warn("[clerk-auth] Clerk unavailable:", reason);
    }
    setMessage("Clerk auth is unavailable. Check CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.", true);
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

    throw lastError || new Error("Unable to load auth provider");
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
