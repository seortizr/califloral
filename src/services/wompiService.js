const crypto = require("crypto");
const { getPaymentConfig } = require("./paymentConfigService");

function getWompiBaseUrl(environment) {
  return environment === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";
}

function getCheckoutBaseUrl(environment) {
  return environment === "production" ? "https://checkout.wompi.co" : "https://checkout.wompi.co";
}

async function wompiRequest(path, { method = "GET", body } = {}) {
  const config = await getPaymentConfig(true);
  const baseUrl = getWompiBaseUrl(config.wompiEnvironment);
  const privateKey = String(config.wompiPrivateKey || "").trim();

  if (!privateKey) {
    throw new Error("Wompi no tiene llave privada configurada.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${privateKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason =
      payload?.error?.reason ||
      payload?.error?.type ||
      payload?.message ||
      `HTTP ${response.status}`;
    throw new Error(`Wompi: ${reason}`);
  }

  return payload;
}

async function testWompiConnection() {
  const config = await getPaymentConfig(true);
  const publicKey = String(config.wompiPublicKey || "").trim();
  if (!publicKey) {
    throw new Error("Falta la llave publica de Wompi.");
  }

  const merchant = await wompiRequest(`/merchants/${publicKey}`);
  return {
    ok: true,
    merchantName: merchant?.data?.name || "Comercio Wompi",
    environment: config.wompiEnvironment,
  };
}

async function createWompiPaymentLink({ reference, amountInCents, customerEmail, redirectUrl, description }) {
  const payload = await wompiRequest("/payment_links", {
    method: "POST",
    body: {
      name: description || `Pedido ${reference}`,
      description: description || `Pago pedido ${reference}`,
      single_use: true,
      collect_shipping: false,
      currency: "COP",
      amount_in_cents: amountInCents,
      reference,
      redirect_url: redirectUrl,
      customer_email: customerEmail,
    },
  });

  const linkId = payload?.data?.id;
  const config = await getPaymentConfig(true);
  const checkoutUrl = linkId ? `${getCheckoutBaseUrl(config.wompiEnvironment)}/l/${linkId}` : payload?.data?.permalink;

  if (!checkoutUrl) {
    throw new Error("Wompi no devolvio enlace de pago.");
  }

  return {
    paymentLinkId: linkId,
    checkoutUrl,
    raw: payload?.data || {},
  };
}

function verifyWompiEventSignature(rawBody, signatureHeader, eventsSecret) {
  if (!eventsSecret || !signatureHeader) return false;

  const parts = String(signatureHeader)
    .split(",")
    .map((chunk) => chunk.trim().split("="))
    .reduce((acc, [key, value]) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {});

  const timestamp = parts.t || parts.timestamp;
  const signature = parts.v1 || parts.signature || parts.sig;
  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", eventsSecret).update(payload).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function mapWompiStatus(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") return "paid";
  if (normalized === "DECLINED" || normalized === "ERROR" || normalized === "VOIDED") return "failed";
  if (normalized === "PENDING") return "pending";
  return "pending";
}

function mapWompiStatusToNotification(wompiStatus) {
  const orderStatus = mapWompiStatus(wompiStatus);
  if (orderStatus === "paid") return "success";
  if (orderStatus === "failed") return "failed";
  return "pending";
}

async function getWompiTransaction(transactionId) {
  const id = String(transactionId || "").trim();
  if (!id) return null;
  const payload = await wompiRequest(`/transactions/${id}`);
  return payload?.data || null;
}

module.exports = {
  createWompiPaymentLink,
  testWompiConnection,
  verifyWompiEventSignature,
  mapWompiStatus,
  mapWompiStatusToNotification,
  getWompiTransaction,
};
