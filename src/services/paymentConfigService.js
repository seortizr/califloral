const { PaymentConfig } = require("../models");

const PROVIDERS = {
  manual: {
    key: "manual",
    label: "Pagos manuales",
    description: "Transferencia y contraentrega sin pasarela en linea.",
  },
  wompi: {
    key: "wompi",
    label: "Wompi",
    description: "Tarjeta, Nequi, PSE y Daviplata via Wompi Colombia.",
  },
  off: {
    key: "off",
    label: "Desactivado",
    description: "No permite finalizar compras en linea.",
  },
};

let cachedConfig = null;
let cacheTime = 0;
const CACHE_MS = 5000;

function maskSecret(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 8) return "********";
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

async function getPaymentConfig(force = false) {
  const now = Date.now();
  if (!force && cachedConfig && now - cacheTime < CACHE_MS) {
    return cachedConfig;
  }

  let config = await PaymentConfig.findOne({ order: [["id", "ASC"]] });
  if (!config) {
    config = await PaymentConfig.create({});
  }

  cachedConfig = config;
  cacheTime = now;
  return config;
}

function clearPaymentConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}

function normalizeProvider(value) {
  const key = String(value || "").trim().toLowerCase();
  return PROVIDERS[key] ? key : "manual";
}

function isWompiConfigured(config) {
  return Boolean(
    config &&
      String(config.wompiPublicKey || "").trim() &&
      String(config.wompiPrivateKey || "").trim()
  );
}

function isWompiActive(config) {
  return normalizeProvider(config.activeProvider) === "wompi" && isWompiConfigured(config);
}

function isManualActive(config) {
  return normalizeProvider(config.activeProvider) === "manual";
}

function isCheckoutEnabled(config) {
  return normalizeProvider(config.activeProvider) !== "off";
}

function buildAdminView(config) {
  const plain = config.get({ plain: true });
  plain.providerLabel = PROVIDERS[normalizeProvider(plain.activeProvider)].label;
  plain.wompiConfigured = isWompiConfigured(config);
  plain.wompiActive = isWompiActive(config);
  plain.manualActive = isManualActive(config);
  plain.wompiPrivateKeyMasked = maskSecret(plain.wompiPrivateKey);
  plain.wompiIntegritySecretMasked = maskSecret(plain.wompiIntegritySecret);
  plain.wompiEventsSecretMasked = maskSecret(plain.wompiEventsSecret);
  return plain;
}

async function savePaymentConfig(payload) {
  const config = await getPaymentConfig(true);
  const nextProvider = normalizeProvider(payload.activeProvider);

  config.activeProvider = nextProvider;
  config.manualTransferEnabled = payload.manualTransferEnabled === "on" || payload.manualTransferEnabled === true;
  config.manualCodEnabled = payload.manualCodEnabled === "on" || payload.manualCodEnabled === true;
  config.wompiEnvironment =
    String(payload.wompiEnvironment || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";

  const publicKey = String(payload.wompiPublicKey || "").trim();
  const privateKey = String(payload.wompiPrivateKey || "").trim();
  const integritySecret = String(payload.wompiIntegritySecret || "").trim();
  const eventsSecret = String(payload.wompiEventsSecret || "").trim();

  if (publicKey) config.wompiPublicKey = publicKey;
  if (privateKey) config.wompiPrivateKey = privateKey;
  if (integritySecret) config.wompiIntegritySecret = integritySecret;
  if (eventsSecret) config.wompiEventsSecret = eventsSecret;

  await config.save();
  clearPaymentConfigCache();
  return config;
}

async function disconnectProvider(providerKey) {
  const config = await getPaymentConfig(true);
  if (normalizeProvider(providerKey) === "wompi") {
    if (normalizeProvider(config.activeProvider) === "wompi") {
      config.activeProvider = "manual";
    }
  } else if (normalizeProvider(providerKey) === "manual") {
    if (normalizeProvider(config.activeProvider) === "manual") {
      config.activeProvider = "off";
    }
  }
  await config.save();
  clearPaymentConfigCache();
  return config;
}

module.exports = {
  PROVIDERS,
  getPaymentConfig,
  clearPaymentConfigCache,
  savePaymentConfig,
  disconnectProvider,
  buildAdminView,
  isWompiActive,
  isWompiConfigured,
  isManualActive,
  isCheckoutEnabled,
  normalizeProvider,
};
