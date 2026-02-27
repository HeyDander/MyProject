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

  async function requestJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Request failed.");
    }
    return payload;
  }

  function createField(labelText, input) {
    const label = document.createElement("label");
    label.textContent = labelText;
    label.appendChild(input);
    return label;
  }

  async function mount() {
    root.innerHTML = "";
    setMessage("", false);

    const title = document.createElement("p");
    title.className = "card-subtitle";
    title.style.margin = "8px 0 12px";
    title.textContent = mode === "sign-up" ? "Create account using email code" : "Sign in using email code";
    root.appendChild(title);

    const form = document.createElement("form");
    form.className = "login-form";
    form.noValidate = true;

    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.name = "email";
    emailInput.placeholder = "name@example.com";
    emailInput.required = true;
    form.appendChild(createField("Email", emailInput));

    const sendCodeBtn = document.createElement("button");
    sendCodeBtn.type = "button";
    sendCodeBtn.textContent = "Send code";
    form.appendChild(sendCodeBtn);

    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.name = "code";
    codeInput.placeholder = "6-digit code";
    codeInput.inputMode = "numeric";
    codeInput.pattern = "[0-9]{4,8}";
    codeInput.maxLength = 8;
    codeInput.required = true;
    codeInput.style.display = "none";

    const codeLabel = createField("Code", codeInput);
    codeLabel.style.display = "none";
    form.appendChild(codeLabel);

    const verifyBtn = document.createElement("button");
    verifyBtn.type = "submit";
    verifyBtn.textContent = mode === "sign-up" ? "Create account" : "Sign in";
    verifyBtn.style.display = "none";
    form.appendChild(verifyBtn);

    sendCodeBtn.addEventListener("click", async () => {
      const email = String(emailInput.value || "").trim();
      if (!email) {
        setMessage("Enter your email first.", true);
        return;
      }
      try {
        setMessage("Sending code...", false);
        await requestJson("/api/auth0/passwordless/start", { email });
        codeLabel.style.display = "";
        codeInput.style.display = "";
        verifyBtn.style.display = "";
        setMessage("Code sent. Check your email.", false);
      } catch (error) {
        setMessage(error.message || "Failed to send code.", true);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setMessage("Verifying code...", false);
        const result = await requestJson("/api/auth0/passwordless/verify", {
          email: String(emailInput.value || "").trim(),
          code: String(codeInput.value || "").trim(),
        });
        window.location.href = result.redirect || "/dashboard";
      } catch (error) {
        setMessage(error.message || "Failed to verify code.", true);
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
  }

  mount();
})();
