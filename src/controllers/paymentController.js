const { Order } = require("../models");
const {
  mapWompiStatus,
  mapWompiStatusToNotification,
  verifyWompiEventSignature,
  getWompiTransaction,
} = require("../services/wompiService");
const { getPaymentConfig } = require("../services/paymentConfigService");
const {
  recordPaymentNotification,
  buildNotificationMessage,
  mapOrderStatusToNotificationStatus,
} = require("../services/paymentNotificationService");

function getAppBaseUrl(req) {
  if (process.env.APP_URL) {
    return String(process.env.APP_URL).replace(/\/$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}

async function applyOrderPaymentUpdate(order, { orderStatus, rawStatus, externalTransactionId, source }) {
  const previousStatus = order.status;

  if (externalTransactionId && !order.externalTransactionId) {
    order.externalTransactionId = externalTransactionId;
  }

  if (orderStatus) {
    order.status = orderStatus;
  }

  await order.save();

  const notificationStatus = mapOrderStatusToNotificationStatus(order.status);
  const shouldNotify = previousStatus !== order.status || source === "webhook";

  if (shouldNotify) {
    await recordPaymentNotification({
      order,
      status: notificationStatus,
      rawStatus: rawStatus || order.status,
      externalTransactionId: order.externalTransactionId,
      message: buildNotificationMessage(notificationStatus, order.paymentMethod, order.totalAmount),
    });
  }

  return order;
}

async function wompiReturn(req, res) {
  const orderId = Number(req.query.order || req.query.orderId || 0);
  const transactionId = String(req.query.id || req.query.transaction_id || "").trim();

  if (!orderId) {
    return res.redirect("/?error=pago_invalido");
  }

  const order = await Order.findByPk(orderId);
  if (!order || order.UserId !== req.session.userId) {
    return res.redirect("/?error=pedido_no_encontrado");
  }

  if (transactionId) {
    try {
      const transaction = await getWompiTransaction(transactionId);
      if (transaction) {
        await applyOrderPaymentUpdate(order, {
          orderStatus: mapWompiStatus(transaction.status),
          rawStatus: transaction.status,
          externalTransactionId: transaction.id,
          source: "return",
        });
      } else if (!order.externalTransactionId) {
        order.externalTransactionId = transactionId;
        await order.save();
      }
    } catch (error) {
      console.error("No se pudo consultar transaccion Wompi:", error.message);
      if (!order.externalTransactionId) {
        order.externalTransactionId = transactionId;
        await order.save();
      }
    }
  }

  const refreshed = await Order.findByPk(order.id);

  if (refreshed.status === "paid") {
    return res.redirect(
      `/?message=${encodeURIComponent(`Pago exitoso por $${Number(refreshed.totalAmount).toLocaleString("es-CO")}. Referencia: ${refreshed.paymentReference}`)}`
    );
  }

  if (refreshed.status === "failed") {
    return res.redirect(`/?error=${encodeURIComponent("El pago fue rechazado. Intenta de nuevo.")}`);
  }

  await recordPaymentNotification({
    order: refreshed,
    status: "pending",
    rawStatus: "PENDING",
    message: buildNotificationMessage("pending", refreshed.paymentMethod, refreshed.totalAmount),
  });

  return res.redirect(
    `/?message=${encodeURIComponent(`Pago en proceso. Referencia: ${refreshed.paymentReference}. Te avisaremos cuando se confirme.`)}`
  );
}

async function wompiWebhook(req, res) {
  try {
    const config = await getPaymentConfig(true);
    const eventsSecret = String(config.wompiEventsSecret || "").trim();
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const signatureHeader =
      req.headers["x-event-checksum"] ||
      req.headers["x-wompi-signature"] ||
      req.headers["x-signature"] ||
      "";

    if (eventsSecret && signatureHeader) {
      let valid = false;
      try {
        valid = verifyWompiEventSignature(rawBody, signatureHeader, eventsSecret);
      } catch {
        valid = false;
      }
      if (!valid) {
        return res.status(401).json({ ok: false, error: "Firma invalida" });
      }
    }

    const transaction = req.body?.data?.transaction || req.body?.data || {};
    const reference = String(transaction.reference || transaction.payment_link?.reference || "").trim();
    const transactionId = String(transaction.id || "").trim();
    const rawStatus = String(transaction.status || "").trim();

    if (!reference && !transactionId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    let order = await Order.findOne({
      where: transactionId
        ? { externalTransactionId: transactionId }
        : { paymentReference: reference },
    });

    if (!order && reference) {
      order = await Order.findOne({ where: { paymentReference: reference } });
    }

    if (!order) {
      return res.status(200).json({ ok: true, missingOrder: true });
    }

    await applyOrderPaymentUpdate(order, {
      orderStatus: mapWompiStatus(rawStatus),
      rawStatus,
      externalTransactionId: transactionId,
      source: "webhook",
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook Wompi:", error);
    return res.status(500).json({ ok: false });
  }
}

module.exports = {
  wompiReturn,
  wompiWebhook,
  getAppBaseUrl,
  applyOrderPaymentUpdate,
};
