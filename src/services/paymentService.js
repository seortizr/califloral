const crypto = require("crypto");
const { getPaymentConfig, isWompiConfigured } = require("./paymentConfigService");

const ONLINE_METHODS = new Set(["tarjeta", "nequi", "pse", "daviplata"]);
const MANUAL_METHODS = new Set(["transferencia", "contraentrega"]);

const PAYMENT_METHODS = {
  tarjeta: { label: "Tarjeta debito / credito", online: true },
  nequi: { label: "Nequi", online: true },
  pse: { label: "PSE", online: true },
  daviplata: { label: "Daviplata", online: true },
  transferencia: { label: "Transferencia bancaria", online: false },
  contraentrega: { label: "Contraentrega", online: false },
};

function isOnlinePaymentMethod(methodKey) {
  return ONLINE_METHODS.has(String(methodKey || "").toLowerCase());
}

function isManualPaymentMethod(methodKey) {
  return MANUAL_METHODS.has(String(methodKey || "").toLowerCase());
}

async function getPaymentOptions() {
  const config = await getPaymentConfig();
  const provider = String(config.activeProvider || "manual").toLowerCase();
  const options = [];

  if (provider === "off") {
    return options;
  }

  if (provider === "wompi" && isWompiConfigured(config)) {
    for (const key of ONLINE_METHODS) {
      options.push({ key, label: PAYMENT_METHODS[key].label, via: "wompi" });
    }
  }

  if (provider === "manual") {
    if (config.manualTransferEnabled) {
      options.push({ key: "transferencia", label: PAYMENT_METHODS.transferencia.label, via: "manual" });
    }
    if (config.manualCodEnabled) {
      options.push({ key: "contraentrega", label: PAYMENT_METHODS.contraentrega.label, via: "manual" });
    }
    for (const key of ONLINE_METHODS) {
      options.push({ key, label: PAYMENT_METHODS[key].label, via: "manual" });
    }
  }

  return options;
}

function normalizePaymentMethod(value) {
  const key = String(value || "").trim().toLowerCase();
  return PAYMENT_METHODS[key] ? key : "";
}

function paymentMethodLabel(methodKey) {
  const normalized = normalizePaymentMethod(methodKey);
  return normalized ? PAYMENT_METHODS[normalized].label : "Metodo desconocido";
}

function resolveOrderStatus(paymentMethod, provider) {
  if (provider === "wompi") return "pending";
  if (paymentMethod === "transferencia" || paymentMethod === "contraentrega") return "pending";
  return "paid";
}

module.exports = {
  getPaymentOptions,
  normalizePaymentMethod,
  paymentMethodLabel,
  isOnlinePaymentMethod,
  isManualPaymentMethod,
  resolveOrderStatus,
  PAYMENT_METHODS,
};
