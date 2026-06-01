(() => {
  const summary = document.querySelector("#cart-summary-live");
  const form = document.querySelector("#checkout-cart-form");
  if (!summary || !form) return;

  const subtotal = Number(summary.dataset.subtotal || "0");
  const zonesJson = document.querySelector("#shipping-options-json");
  let zones = [];
  try {
    zones = zonesJson ? JSON.parse(zonesJson.textContent || "[]") : [];
  } catch {
    zones = [];
  }

  const zoneMap = new Map(zones.map((z) => [z.key, Number(z.amount) || 0]));

  const elShipping = summary.querySelector("[data-line-shipping]");
  const elTotal = summary.querySelector("[data-line-total]");
  const zoneWrap = form.querySelector("#delivery-zone-wrap");
  const addressInput = form.querySelector("#shipping-address-input");
  const fulfillmentRadios = form.querySelectorAll('input[name="fulfillment"]');
  const zoneSelect = form.querySelector('select[name="deliveryZone"]');

  function currentFulfillment() {
    for (const r of fulfillmentRadios) {
      if (r.checked) return r.value;
    }
    return "delivery";
  }

  function currentZoneAmount() {
    const key = zoneSelect ? String(zoneSelect.value || "") : "";
    return zoneMap.get(key) ?? zoneMap.get("cali_centro") ?? 0;
  }

  function refresh() {
    const fulfillment = currentFulfillment();
    const shipping = fulfillment === "pickup" ? 0 : currentZoneAmount();
    const total = subtotal > 0 ? subtotal + shipping : 0;

    if (elShipping) {
      elShipping.textContent = shipping.toLocaleString("es-CO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (elTotal) {
      elTotal.textContent = total.toLocaleString("es-CO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    if (zoneWrap) {
      zoneWrap.hidden = fulfillment === "pickup";
    }
    if (zoneSelect) {
      if (fulfillment === "pickup") {
        zoneSelect.removeAttribute("required");
      } else {
        zoneSelect.setAttribute("required", "required");
      }
    }
    if (addressInput) {
      if (fulfillment === "pickup") {
        addressInput.removeAttribute("required");
        addressInput.placeholder = "Opcional: notas para tu pedido al recoger";
      } else {
        addressInput.setAttribute("required", "required");
        addressInput.placeholder = "Ej: Calle 5 # 10-20, barrio, referencias";
      }
    }
  }

  for (const r of fulfillmentRadios) {
    r.addEventListener("change", refresh);
  }
  if (zoneSelect) {
    zoneSelect.addEventListener("change", refresh);
  }

  refresh();
})();
