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
      if (!window.Clerk) {
        throw new Error("Clerk JS failed to load.");
      }

      const config = await getConfig();
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
      setMessage(error.message || "Clerk auth is unavailable.", true);
    }
  }

  mount();
})();
