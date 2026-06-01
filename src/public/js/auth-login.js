(() => {
  const emailInput = document.querySelector("#login-email");
  const passwordInput = document.querySelector("#login-password");
  const toggleBtn = document.querySelector("#toggle-password-visibility");
  const rememberCheckbox = document.querySelector("#remember-user");

  if (!emailInput || !passwordInput || !toggleBtn || !rememberCheckbox) return;

  const STORAGE_KEY = "califloral:remembered-email";

  const savedEmail = localStorage.getItem(STORAGE_KEY);
  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberCheckbox.checked = true;
  }

  toggleBtn.addEventListener("click", () => {
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    toggleBtn.setAttribute("aria-pressed", String(show));
    toggleBtn.setAttribute("aria-label", show ? "Ocultar contrasena" : "Mostrar contrasena");
    toggleBtn.innerHTML = show
      ? '<i class="fa-regular fa-eye-slash"></i>'
      : '<i class="fa-regular fa-eye"></i>';
  });

  const form = emailInput.closest("form");
  if (!form) return;

  form.addEventListener("submit", () => {
    if (rememberCheckbox.checked) {
      localStorage.setItem(STORAGE_KEY, emailInput.value.trim());
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  });
})();
