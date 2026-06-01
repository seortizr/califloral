const modal = document.querySelector("#product-modal");
const closeModalBtn = document.querySelector("#close-product-modal-btn");
const openButtons = document.querySelectorAll(".open-product-modal-btn");

const modalName = document.querySelector("#modal-product-name");
const modalDescription = document.querySelector("#modal-product-description");
const modalPrice = document.querySelector("#modal-product-price");
const modalEmoji = document.querySelector("#modal-product-emoji");
const modalImage = document.querySelector("#modal-product-image");
const modalProductId = document.querySelector("#modal-product-id");
const modalWhatsAppBtn = document.querySelector("#modal-wa-btn");
const productWhatsAppButtons = document.querySelectorAll(".product-wa-btn");

function formatImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (imageUrl.startsWith("/")) return `${window.location.origin}${imageUrl}`;
  return imageUrl;
}

function buildWhatsAppLink({ name, price, image }) {
  const imageUrl = formatImageUrl(image);
  const messageParts = [];
  if (imageUrl) messageParts.push(imageUrl);
  messageParts.push("Hola, quiero mas informacion de este ramo.");
  messageParts.push(`Producto: ${name || "Sin nombre"}`);
  messageParts.push(`Precio: $${price || "N/A"}`);
  const message = messageParts.join("\n");
  return `https://wa.me/573222530652?text=${encodeURIComponent(message)}`;
}

function applyWhatsAppLink(element, payload) {
  if (!element) return;
  element.href = buildWhatsAppLink(payload);
}

function openModalFromButton(button) {
  modalName.textContent = button.dataset.productName;
  modalDescription.textContent = button.dataset.productDescription;
  modalPrice.textContent = `$${button.dataset.productPrice}`;
  modalEmoji.textContent = button.dataset.productEmoji;
  const imageUrl = button.dataset.productImage;
  if (imageUrl) {
    modalImage.src = imageUrl;
    modalImage.alt = button.dataset.productName;
    modalImage.style.display = "block";
    modalEmoji.style.display = "none";
  } else {
    modalImage.src = "";
    modalImage.style.display = "none";
    modalEmoji.style.display = "grid";
  }
  modalProductId.value = button.dataset.productId;
  applyWhatsAppLink(modalWhatsAppBtn, {
    name: button.dataset.productName,
    price: Number(button.dataset.productPrice || 0).toLocaleString("es-CO"),
    image: imageUrl,
  });
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

for (const button of openButtons) {
  button.addEventListener("click", () => openModalFromButton(button));
}

for (const waButton of productWhatsAppButtons) {
  waButton.addEventListener("click", () => {
    applyWhatsAppLink(waButton, {
      name: waButton.dataset.productName,
      price: waButton.dataset.productPrice,
      image: waButton.dataset.productImage,
    });
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeModal);
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("open")) {
    closeModal();
  }
});
