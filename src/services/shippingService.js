/**
 * Tarifas de envío por zona (Cali y alrededores). Ajusta montos aquí o luego en BD.
 * fulfillment: "delivery" | "pickup"
 */
const ZONES = {
  cali_centro: { label: "Cali — Centro y cercanías", amount: 4.99 },
  cali_sur: { label: "Cali — Sur", amount: 6.5 },
  cali_norte: { label: "Cali — Norte", amount: 6.5 },
  jamundi: { label: "Jamundí y alrededores", amount: 9.99 },
  otra: { label: "Otra zona (valor orientativo)", amount: 12 },
};

const DEFAULT_ZONE = "cali_centro";

function getShippingOptions() {
  return Object.entries(ZONES).map(([key, v]) => ({
    key,
    label: v.label,
    amount: v.amount,
  }));
}

function normalizeFulfillment(value) {
  return String(value || "").toLowerCase() === "pickup" ? "pickup" : "delivery";
}

function normalizeZone(zoneKey) {
  const k = String(zoneKey || "").toLowerCase();
  return ZONES[k] ? k : DEFAULT_ZONE;
}

function computeShippingAmount(fulfillment, zoneKey) {
  if (normalizeFulfillment(fulfillment) === "pickup") return 0;
  const z = ZONES[normalizeZone(zoneKey)];
  return z ? Number(z.amount) : Number(ZONES[DEFAULT_ZONE].amount);
}

function zoneLabel(zoneKey) {
  const z = ZONES[normalizeZone(zoneKey)];
  return z ? z.label : ZONES[DEFAULT_ZONE].label;
}

module.exports = {
  getShippingOptions,
  computeShippingAmount,
  normalizeFulfillment,
  normalizeZone,
  zoneLabel,
  DEFAULT_ZONE,
};
