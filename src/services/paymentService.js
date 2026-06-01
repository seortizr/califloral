const PAYMENT_METHODS = {
  tarjeta: { label: "Tarjeta debito / credito" },
  nequi: { label: "Nequi" },
  pse: { label: "PSE" },
  daviplata: { label: "Daviplata" },
  transferencia: { label: "Transferencia bancaria" },
  contraentrega: { label: "Contraentrega" },
};

function getPaymentOptions() {
  return Object.entries(PAYMENT_METHODS).map(([key, value]) => ({
    key,
    label: value.label,
  }));
}

function normalizePaymentMethod(value) {
  const key = String(value || "").trim().toLowerCase();
  return PAYMENT_METHODS[key] ? key : "";
}

function paymentMethodLabel(methodKey) {
  const normalized = normalizePaymentMethod(methodKey);
  return normalized ? PAYMENT_METHODS[normalized].label : "Metodo desconocido";
}

module.exports = {
  getPaymentOptions,
  normalizePaymentMethod,
  paymentMethodLabel,
};
