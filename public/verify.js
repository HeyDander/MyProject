function setVerifyMessage(messageEl, text, isError) {
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.toggle("is-error", Boolean(isError));
  messageEl.classList.toggle("is-success", !isError && Boolean(text));
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-verify-form]");
  if (!form) return;

  const emailInput = form.querySelector("#email");
  const codeInput = form.querySelector("#code");
  const messageEl = form.querySelector("[data-message]");
  const resendBtn = form.querySelector("[data-resend]");

  const params = new URLSearchParams(window.location.search);
  const prefillEmail = params.get("email");
  if (prefillEmail) {
    emailInput.value = prefillEmail;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setVerifyMessage(messageEl, "", false);

    try {
      const result = await window.requestJson("/api/verify/confirm", {
        method: "POST",
        body: JSON.stringify({
          email: emailInput.value,
          code: codeInput.value,
        }),
      });
      setVerifyMessage(messageEl, "Email verified. Redirecting...", false);
      window.location.href = result.redirect || "/dashboard";
    } catch (error) {
      setVerifyMessage(messageEl, error.message, true);
    }
  });

  resendBtn.addEventListener("click", async () => {
    setVerifyMessage(messageEl, "", false);
    try {
      await window.requestJson("/api/verify/resend", {
        method: "POST",
        body: JSON.stringify({ email: emailInput.value }),
      });
      setVerifyMessage(messageEl, "Code sent. Check your email.", false);
    } catch (error) {
      setVerifyMessage(messageEl, error.message, true);
    }
  });
});
