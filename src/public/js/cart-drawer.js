(() => {
  const drawer = document.querySelector("#cart-panel");
  const overlay = document.querySelector("#cart-drawer-overlay");
  const openButtons = document.querySelectorAll(".js-cart-drawer-toggle");
  const closeButtons = document.querySelectorAll(".js-cart-drawer-close");

  if (!drawer || !overlay || !openButtons.length) return;

  const openDrawer = () => {
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    document.body.classList.add("drawer-open");
  };

  const closeDrawer = () => {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.hidden = true;
    document.body.classList.remove("drawer-open");
  };

  for (const button of openButtons) {
    button.addEventListener("click", openDrawer);
  }

  for (const btn of closeButtons) {
    btn.addEventListener("click", closeDrawer);
  }

  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
})();
